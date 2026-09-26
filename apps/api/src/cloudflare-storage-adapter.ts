import { createUnconfiguredBlobStore } from "./unconfigured-blob-store";
import type {
  BlobStoreAdapter,
  DatabaseAdapter,
  StorageAdapter,
} from "./storage-contract";

/** Native Worker bindings are mentioned only at this platform boundary. */
export type CloudflareStorageBindings = {
  DB: DatabaseAdapter;
  RESOURCES: BlobStoreAdapter;
  EDGE_EVER_OBJECT_STORAGE_OPTIONAL?: string;
};

/**
 * Adapts native Cloudflare bindings to the storage surface consumed by the
 * application. No route or service should construct this shape directly.
 */
export const createCloudflareStorageAdapter = (
  bindings: CloudflareStorageBindings,
): StorageAdapter => {
  const boundResources = bindings.RESOURCES as BlobStoreAdapter | undefined;
  const externalStorageOnly = bindings.EDGE_EVER_OBJECT_STORAGE_OPTIONAL === "true";

  return {
    db: bindings.DB,
    resources: boundResources
      ?? (externalStorageOnly
        ? createUnconfiguredBlobStore()
        : (undefined as unknown as BlobStoreAdapter)),
    diagnostics: {
      database: "d1",
      resources: boundResources ? "r2" : "unconfigured",
      migrationTable: "d1_migrations",
    },
  };
};
