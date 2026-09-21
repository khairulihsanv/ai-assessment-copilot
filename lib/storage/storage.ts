import { writeFile, mkdir, unlink, readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// ─── Storage Interface ─── //
export interface StorageProvider {
  save(fileName: string, buffer: Buffer): Promise<string>;
  get(filePath: string): Promise<Buffer>;
  delete(filePath: string): Promise<void>;
}

// ─── Local Storage (Development) ─── //
class LocalStorage implements StorageProvider {
  private uploadDir: string;

  constructor() {
    this.uploadDir = join(process.cwd(), "uploads");
  }

  async save(fileName: string, buffer: Buffer): Promise<string> {
    if (!existsSync(this.uploadDir)) {
      await mkdir(this.uploadDir, { recursive: true });
    }

    // Add timestamp to prevent collisions
    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storedName = `${timestamp}_${safeName}`;
    const filePath = join(this.uploadDir, storedName);

    await writeFile(filePath, buffer);
    return storedName;
  }

  async get(filePath: string): Promise<Buffer> {
    const absolutePath = join(this.uploadDir, filePath);
    return readFile(absolutePath);
  }

  async delete(filePath: string): Promise<void> {
    const absolutePath = join(this.uploadDir, filePath);
    try {
      await unlink(absolutePath);
    } catch {
      // File may already be deleted
    }
  }
}

// ─── Factory ─── //
let storageInstance: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!storageInstance) {
    // In the future, check env for S3 config and return S3Storage
    storageInstance = new LocalStorage();
  }
  return storageInstance;
}
