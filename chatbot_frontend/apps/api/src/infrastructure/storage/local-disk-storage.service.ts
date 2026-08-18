import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import { env } from "../../env.js";
import type { StorageService, StoredFile } from "./storage.service.js";

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

// Server-generated only — never derived from client input, so storedName can never
// escape its organization directory (path traversal safety).
function generateStoredName(mimeType: string): string {
  const extension = EXTENSION_BY_MIME_TYPE[mimeType] ?? "";
  return `${crypto.randomUUID()}${extension}`;
}

export class LocalDiskStorageService implements StorageService {
  private readonly rootDir = resolve(env.UPLOAD_DIR);

  async save(organizationId: string, mimeType: string, data: ArrayBuffer): Promise<StoredFile> {
    const storedName = generateStoredName(mimeType);
    const orgDir = join(this.rootDir, organizationId);

    await mkdir(orgDir, { recursive: true });
    await Bun.write(join(orgDir, storedName), data);

    return { storedName, sizeBytes: data.byteLength };
  }

  resolvePath(organizationId: string, storedName: string): string {
    return join(this.rootDir, organizationId, storedName);
  }
}

export const storageService: StorageService = new LocalDiskStorageService();
