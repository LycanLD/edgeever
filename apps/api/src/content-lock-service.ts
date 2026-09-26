import type { DatabaseAdapter } from "./storage-contract";
import { verifyPassword, hashPassword } from "./auth-crypto";
import { AppError } from "./app-error";
import { nextShareUnlockFailure, isShareUnlockBlocked } from "./share-access";
import type { MemoDetail, MemoSummary } from "@edgeever/shared";

export type ContentLockTargetType = "memo" | "notebook";

/** How long an unlocked target stays readable before it locks itself again. */
export const CONTENT_LOCK_GRANT_MINUTES = 30;
/** Guard rail so an obvious PIN cannot be brute-forced through the API. */
export const CONTENT_LOCK_MIN_PIN_LENGTH = 4;

type LockRow = {
  pin_hash: string;
  unlock_failed_count: number;
  unlock_window_started_at: string | null;
  unlock_blocked_until: string | null;
};

export type ContentLockStatus = {
  isLocked: boolean;
  isUnlocked: boolean;
  blockedUntil: string | null;
  unlockExpiresAt: string | null;
};

const lockKey = (targetType: ContentLockTargetType, targetId: string) => `${targetType}:${targetId}`;

const readLockRow = async (db: DatabaseAdapter, workspaceId: string, targetType: ContentLockTargetType, targetId: string) => {
  const row = await db
    .prepare(
      `SELECT pin_hash, unlock_failed_count, unlock_window_started_at, unlock_blocked_until
         FROM content_locks
        WHERE workspace_id = ?1 AND target_type = ?2 AND target_id = ?3`,
    )
    .bind(workspaceId, targetType, targetId)
    .first<LockRow>();
  return row ?? null;
};

/**
 * Refresh the reader's grant while they are actively reading, so the idle
 * window is measured from the last real interaction rather than the first unlock.
 */
const touchGrant = async (db: DatabaseAdapter, workspaceId: string, userId: string, targetType: ContentLockTargetType, targetId: string, nowMs: number) => {
  const expiresAt = new Date(nowMs + CONTENT_LOCK_GRANT_MINUTES * 60 * 1000).toISOString();
  await db
    .prepare(
      `INSERT INTO content_lock_grants (workspace_id, user_id, target_type, target_id, granted_at, expires_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT (workspace_id, user_id, target_type, target_id)
       DO UPDATE SET granted_at = ?5, expires_at = ?6`,
    )
    .bind(workspaceId, userId, targetType, targetId, new Date(nowMs).toISOString(), expiresAt)
    .run();
  return expiresAt;
};

export const getContentLockStatus = async (
  db: DatabaseAdapter,
  workspaceId: string,
  userId: string | null,
  targetType: ContentLockTargetType,
  targetId: string,
  nowMs = Date.now(),
): Promise<ContentLockStatus> => {
  const row = await readLockRow(db, workspaceId, targetType, targetId);
  if (!row) {
    return { isLocked: false, isUnlocked: true, blockedUntil: null, unlockExpiresAt: null };
  }

  const blockedUntil = isShareUnlockBlocked(row.unlock_blocked_until, nowMs) ? row.unlock_blocked_until : null;
  if (!userId || blockedUntil) {
    return { isLocked: true, isUnlocked: false, blockedUntil, unlockExpiresAt: null };
  }

  const grant = await db
    .prepare(
      `SELECT expires_at FROM content_lock_grants
        WHERE workspace_id = ?1 AND user_id = ?2 AND target_type = ?3 AND target_id = ?4`,
    )
    .bind(workspaceId, userId, targetType, targetId)
    .first<{ expires_at: string }>();

  if (grant && Date.parse(grant.expires_at) > nowMs) {
    return { isLocked: true, isUnlocked: true, blockedUntil: null, unlockExpiresAt: grant.expires_at };
  }

  return { isLocked: true, isUnlocked: false, blockedUntil: null, unlockExpiresAt: null };
};

/**
 * Resolve the lock state of a page of memos in two queries.
 *
 * A memo is gated by its own lock and by the locks of any ancestor notebook, so
 * unlocking a notebook reveals everything inside it while a memo-level lock
 * still applies. The memo is readable only when every gate on it is granted.
 */
export const resolveMemoLockStates = async (
  db: DatabaseAdapter,
  workspaceId: string,
  userId: string | null,
  memoIds: string[],
  nowMs = Date.now(),
): Promise<Map<string, { isLocked: boolean; isUnlocked: boolean }>> => {
  const states = new Map<string, { isLocked: boolean; isUnlocked: boolean }>();
  if (memoIds.length === 0) return states;

  const idList = memoIds.map((_, index) => `?${index + 2}`).join(", ");
  const gateRows = await db
    .prepare(
      `WITH RECURSIVE ancestors(memo_id, notebook_id) AS (
         SELECT m.id, m.notebook_id
           FROM memos m
          WHERE m.workspace_id = ?1 AND m.id IN (${idList})
         UNION ALL
         SELECT a.memo_id, p.id
           FROM ancestors a
           INNER JOIN notebooks p ON p.id = a.notebook_id AND p.workspace_id = ?1
      )
      SELECT memo_id, lock_key FROM (
        SELECT m.id AS memo_id, 'memo:' || m.id AS lock_key
          FROM memos m
          INNER JOIN content_locks l
            ON l.workspace_id = m.workspace_id AND l.target_type = 'memo' AND l.target_id = m.id
         WHERE m.workspace_id = ?1 AND m.id IN (${idList})
        UNION
        SELECT a.memo_id AS memo_id, 'notebook:' || a.notebook_id AS lock_key
          FROM ancestors a
          INNER JOIN content_locks l
            ON l.workspace_id = ?1 AND l.target_type = 'notebook' AND l.target_id = a.notebook_id
      )`,
    )
    .bind(workspaceId, ...memoIds)
    .all<{ memo_id: string; lock_key: string }>();

  const gatesByMemo = new Map<string, string[]>();
  for (const row of gateRows.results ?? []) {
    const keys = gatesByMemo.get(row.memo_id);
    if (keys) keys.push(row.lock_key);
    else gatesByMemo.set(row.memo_id, [row.lock_key]);
  }
  if (gatesByMemo.size === 0) return states;

  for (const memoId of gatesByMemo.keys()) {
    states.set(memoId, { isLocked: true, isUnlocked: false });
  }
  if (!userId) return states;

  const lockKeys = [...new Set([...gatesByMemo.values()].flat())];
  const keyList = lockKeys.map((_, index) => `?${index + 3}`).join(", ");
  const grantRows = await db
    .prepare(
      `SELECT target_type, target_id FROM content_lock_grants
        WHERE workspace_id = ?1 AND user_id = ?2
          AND expires_at > ?${lockKeys.length + 3} AND (
            (target_type = 'memo' AND target_id IN (${keyList}))
            OR (target_type = 'notebook' AND target_id IN (${keyList}))
          )`,
    )
    .bind(workspaceId, userId, new Date(nowMs).toISOString(), ...lockKeys)
    .all<{ target_type: string; target_id: string }>();
  const granted = new Set((grantRows.results ?? []).map((row) => lockKey(row.target_type as ContentLockTargetType, row.target_id)));

  for (const [memoId, keys] of gatesByMemo) {
    states.set(memoId, { isLocked: true, isUnlocked: keys.every((key) => granted.has(key)) });
  }
  return states;
};

/** Ids of memos that are locked for this reader and must not reach search results. */
export const filterLockedMemoIds = async (
  db: DatabaseAdapter,
  workspaceId: string,
  userId: string | null,
  memoIds: string[],
  nowMs = Date.now(),
) => {
  const states = await resolveMemoLockStates(db, workspaceId, userId, memoIds, nowMs);
  return [...states.entries()].filter(([, state]) => !state.isUnlocked).map(([memoId]) => memoId);
};

export const setContentLock = async (
  db: DatabaseAdapter,
  workspaceId: string,
  targetType: ContentLockTargetType,
  targetId: string,
  pin: string,
) => {
  const normalizedPin = pin.trim();
  if (normalizedPin.length < CONTENT_LOCK_MIN_PIN_LENGTH) {
    throw new AppError("invalid_pin", `PIN must be at least ${CONTENT_LOCK_MIN_PIN_LENGTH} characters`, 400);
  }

  const pinHash = await hashPassword(normalizedPin);
  await db
    .prepare(
      `INSERT INTO content_locks (workspace_id, target_type, target_id, pin_hash, updated_at)
            VALUES (?1, ?2, ?3, ?4, datetime('now'))
       ON CONFLICT (workspace_id, target_type, target_id)
       DO UPDATE SET pin_hash = ?4, unlock_failed_count = 0, unlock_window_started_at = NULL,
                     unlock_blocked_until = NULL, updated_at = datetime('now')`,
    )
    .bind(workspaceId, targetType, targetId, pinHash)
    .run();
  return { isLocked: true };
};

export const clearContentLock = async (
  db: DatabaseAdapter,
  workspaceId: string,
  targetType: ContentLockTargetType,
  targetId: string,
) => {
  await db
    .prepare("DELETE FROM content_locks WHERE workspace_id = ?1 AND target_type = ?2 AND target_id = ?3")
    .bind(workspaceId, targetType, targetId)
    .run();
  await db
    .prepare("DELETE FROM content_lock_grants WHERE workspace_id = ?1 AND target_type = ?2 AND target_id = ?3")
    .bind(workspaceId, targetType, targetId)
    .run();
  return { isLocked: false };
};

/**
 * Verify a PIN and grant access. Brute-force throttling reuses the share
 * unlock counters so both password gates behave identically.
 */
export const unlockContentLock = async (
  db: DatabaseAdapter,
  workspaceId: string,
  userId: string,
  targetType: ContentLockTargetType,
  targetId: string,
  pin: string,
  nowMs = Date.now(),
) => {
  const row = await readLockRow(db, workspaceId, targetType, targetId);
  if (!row) {
    throw new AppError("lock_not_found", "This item is not locked", 404);
  }
  if (isShareUnlockBlocked(row.unlock_blocked_until, nowMs)) {
    throw new AppError("unlock_blocked", "Too many attempts, try again later", 429);
  }

  if (!(await verifyPassword(pin.trim(), row.pin_hash))) {
    const next = nextShareUnlockFailure(row, nowMs);
    await db
      .prepare(
        `UPDATE content_locks
            SET unlock_failed_count = ?4, unlock_window_started_at = ?5, unlock_blocked_until = ?6,
                updated_at = datetime('now')
          WHERE workspace_id = ?1 AND target_type = ?2 AND target_id = ?3`,
      )
      .bind(
        workspaceId,
        targetType,
        targetId,
        next.failureCount,
        next.windowStartedAt,
        next.blockedUntil,
      )
      .run();
    throw new AppError("invalid_pin", "Incorrect PIN", 401);
  }

  await db
    .prepare(
      `UPDATE content_locks
          SET unlock_failed_count = 0, unlock_window_started_at = NULL, unlock_blocked_until = NULL,
              updated_at = datetime('now')
        WHERE workspace_id = ?1 AND target_type = ?2 AND target_id = ?3`,
    )
    .bind(workspaceId, targetType, targetId)
    .run();
  const unlockExpiresAt = await touchGrant(db, workspaceId, userId, targetType, targetId, nowMs);
  return { isLocked: true, isUnlocked: true, unlockExpiresAt };
};

/** Re-lock on demand, e.g. from the "lock now" action or an idle timer. */
export const revokeContentLockGrant = async (
  db: DatabaseAdapter,
  workspaceId: string,
  userId: string,
  targetType: ContentLockTargetType,
  targetId: string,
) => {
  await db
    .prepare(
      "DELETE FROM content_lock_grants WHERE workspace_id = ?1 AND user_id = ?2 AND target_type = ?3 AND target_id = ?4",
    )
    .bind(workspaceId, userId, targetType, targetId)
    .run();
  return { isLocked: true, isUnlocked: false };
};

const EMPTY_DOC = { type: "doc", content: [] } as unknown as MemoDetail["contentJson"];

/**
 * Replace every content-bearing field so a locked row still renders as a list
 * entry with a padlock, but never leaks title, excerpt, body or attachments.
 */
export const redactLockedSummary = (summary: MemoSummary): MemoSummary => ({
  ...summary,
  title: null,
  excerpt: "",
  tags: [],
  diagramKind: null,
  diagramPreview: undefined,
  structuredTable: undefined,
  tablePreview: undefined,
  infographic: false,
});

export const redactLockedDetail = (detail: MemoDetail): MemoDetail => ({
  ...redactLockedSummary(detail),
  contentJson: EMPTY_DOC,
  contentMarkdown: "",
  contentText: "",
  contentHash: "",
  sourceMemoIds: [],
  mergeSourceCount: 0,
  mergedIntoMemoId: null,
});

export type { LockRow };
export { lockKey };
