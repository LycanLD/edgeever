import { AppError } from "./app-error";
import type { BlobStoreAdapter } from "./storage-contract";

const unavailable = (operation: string) =>
  new AppError(
    "object_storage_unavailable",
    `Object storage is not available on this instance (${operation}). Configure external object storage in instance settings or bind RESOURCES.`,
    503,
  );

export const createUnconfiguredBlobStore = (): BlobStoreAdapter => ({
  get: async () => {
    throw unavailable("get");
  },
  put: async () => {
    throw unavailable("put");
  },
  createMultipartUpload: async () => {
    throw unavailable("createMultipartUpload");
  },
  resumeMultipartUpload: () => {
    throw unavailable("resumeMultipartUpload");
  },
  delete: async () => {
    throw unavailable("delete");
  },
});
