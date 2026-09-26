import type { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { AppEnv, AppContext } from "./api-context";
import { apiError, notFound } from "./http-errors";
import { getGrantUserId, getWorkspaceId, requireScopes, requireUser } from "./request-auth";
import { ZodError, z } from "zod";
import { AppError } from "./app-error";
import {
  clearContentLock,
  CONTENT_LOCK_MIN_PIN_LENGTH,
  getContentLockStatus,
  revokeContentLockGrant,
  setContentLock,
  unlockContentLock,
  type ContentLockTargetType,
} from "./content-lock-service";
import { getMemoDetail } from "./memo-service";
import { getNotebook } from "./notebook-service";

const PinSchema = z.object({
  pin: z.string().min(CONTENT_LOCK_MIN_PIN_LENGTH, `PIN must be at least ${CONTENT_LOCK_MIN_PIN_LENGTH} characters`),
});

const handleLockError = (context: AppContext, error: unknown) => {
  if (error instanceof AppError) {
    return apiError(context, error.code, error.message, error.status);
  }
  if (error instanceof ZodError) {
    return apiError(context, "invalid_request", error.issues[0]?.message ?? "Invalid request", 400);
  }
  throw error;
};

type LockTarget = { type: ContentLockTargetType; id: string };

const resolveTarget = async (
  context: AppContext,
  targetType: ContentLockTargetType,
  id: string,
): Promise<{ target: LockTarget } | { response: Response }> => {
  const workspaceId = getWorkspaceId(context);
  if (targetType === "memo") {
    const memo = await getMemoDetail(context.env.storage.db, workspaceId, id, true);
    if (!memo) return { response: notFound(context, "Note not found") };
  } else {
    const notebook = await getNotebook(context.env.storage.db, workspaceId, id);
    if (!notebook) return { response: notFound(context, "Notebook not found") };
  }
  return { target: { type: targetType, id } };
};

/**
 * PIN gates for notes and notebooks.
 *
 * Locking is deliberately owner-scoped: only an interactive user session can set,
 * change or clear a PIN, so a leaked API token cannot remove the gate. Readers
 * (including API tokens) still receive redacted content until they unlock.
 */
export const registerContentLockRoutes = (app: Hono<AppEnv>) => {
  app.get("/api/v1/:targetType(memo|notebook)/:id/lock", async (context) => {
    const denied = requireScopes(context, "read:memos");
    if (denied) return denied;

    const resolved = await resolveTarget(context, context.req.param("targetType") as ContentLockTargetType, context.req.param("id"));
    if ("response" in resolved) return resolved.response;

    return context.json(
      await getContentLockStatus(
        context.env.storage.db,
        getWorkspaceId(context),
        getGrantUserId(context),
        resolved.target.type,
        resolved.target.id,
      ),
    );
  });

  app.put("/api/v1/:targetType(memo|notebook)/:id/lock", zValidator("json", PinSchema), async (context) => {
    const denied = requireUser(context);
    if (denied) return denied;

    try {
      const resolved = await resolveTarget(context, context.req.param("targetType") as ContentLockTargetType, context.req.param("id"));
      if ("response" in resolved) return resolved.response;

      const status = await setContentLock(
        context.env.storage.db,
        getWorkspaceId(context),
        resolved.target.type,
        resolved.target.id,
        context.req.valid("json").pin,
      );
      return context.json(status);
    } catch (error) {
      return handleLockError(context, error);
    }
  });

  app.delete("/api/v1/:targetType(memo|notebook)/:id/lock", async (context) => {
    const denied = requireUser(context);
    if (denied) return denied;

    try {
      const resolved = await resolveTarget(context, context.req.param("targetType") as ContentLockTargetType, context.req.param("id"));
      if ("response" in resolved) return resolved.response;

      return context.json(
        await clearContentLock(context.env.storage.db, getWorkspaceId(context), resolved.target.type, resolved.target.id),
      );
    } catch (error) {
      return handleLockError(context, error);
    }
  });

  app.post("/api/v1/:targetType(memo|notebook)/:id/lock/unlock", zValidator("json", PinSchema), async (context) => {
    const denied = requireUser(context);
    if (denied) return denied;

    try {
      const resolved = await resolveTarget(context, context.req.param("targetType") as ContentLockTargetType, context.req.param("id"));
      if ("response" in resolved) return resolved.response;

      return context.json(
        await unlockContentLock(
          context.env.storage.db,
          getWorkspaceId(context),
          getGrantUserId(context) ?? "",
          resolved.target.type,
          resolved.target.id,
          context.req.valid("json").pin,
        ),
      );
    } catch (error) {
      return handleLockError(context, error);
    }
  });

  app.post("/api/v1/:targetType(memo|notebook)/:id/lock/relock", async (context) => {
    const denied = requireUser(context);
    if (denied) return denied;

    try {
      const resolved = await resolveTarget(context, context.req.param("targetType") as ContentLockTargetType, context.req.param("id"));
      if ("response" in resolved) return resolved.response;

      return context.json(
        await revokeContentLockGrant(
          context.env.storage.db,
          getWorkspaceId(context),
          getGrantUserId(context) ?? "",
          resolved.target.type,
          resolved.target.id,
        ),
      );
    } catch (error) {
      return handleLockError(context, error);
    }
  });
};
