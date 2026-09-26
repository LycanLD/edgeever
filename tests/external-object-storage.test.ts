import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createCloudflareStorageAdapter } from "../apps/api/src/cloudflare-storage-adapter";

const repositoryRoot = resolve(import.meta.dir, "..");
const readRepositoryFile = (path: string) => readFileSync(resolve(repositoryRoot, path), "utf8");

describe("external object storage without a binding-compatible bucket", () => {
  test("the deploy entrypoint pins the R2-free Wrangler configuration", () => {
    const packageJson = JSON.parse(readRepositoryFile("package.json")) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts["deploy:worker"]).toContain(
      "WRANGLER_CONFIG=wrangler.no-r2.toml",
    );

    const config = readRepositoryFile("wrangler.no-r2.toml");
    expect(config).not.toContain("[[r2_buckets]]");
    expect(config).not.toMatch(/^\[vars\]/m);
    expect(config).toContain('main = ".wrangler/edgeever-worker/index.js"');
    expect(config).toContain('database_name = "edgeever"');
    expect(config).toContain('database_id = "00000000-0000-0000-0000-000000000000"');
    expect(config).toContain("workers_dev = true");
  });

  test("keeps the fail-closed store when the instance does not opt in", () => {
    const db = { prepare: () => undefined, batch: () => undefined };
    const adapter = createCloudflareStorageAdapter({ DB: db } as never);

    expect(adapter.resources).toBeUndefined();
    expect(adapter.diagnostics).toEqual({
      database: "d1",
      resources: "unconfigured",
      migrationTable: "d1_migrations",
    });
  });

  test("substitutes a diagnosable store after the explicit opt-in", async () => {
    const db = { prepare: () => undefined, batch: () => undefined };
    const adapter = createCloudflareStorageAdapter({
      DB: db,
      EDGE_EVER_OBJECT_STORAGE_OPTIONAL: "true",
    } as never);

    expect(adapter.diagnostics).toEqual({
      database: "d1",
      resources: "unconfigured",
      migrationTable: "d1_migrations",
    });
    await expect(adapter.resources.get("workspace/memo/image.png")).rejects.toMatchObject({
      code: "object_storage_unavailable",
      status: 503,
    });
    await expect(
      adapter.resources.put("workspace/memo/image.png", new Uint8Array([1])),
    ).rejects.toMatchObject({
      code: "object_storage_unavailable",
      status: 503,
    });
  });

  test("keeps the bound R2 store diagnostics unchanged", () => {
    const db = { prepare: () => undefined, batch: () => undefined };
    const resources = { get: async () => null, put: async () => undefined, delete: async () => undefined };
    const adapter = createCloudflareStorageAdapter({ DB: db, RESOURCES: resources } as never);

    expect(adapter.resources).toBe(resources);
    expect(adapter.diagnostics).toEqual({
      database: "d1",
      resources: "r2",
      migrationTable: "d1_migrations",
    });
  });
});
