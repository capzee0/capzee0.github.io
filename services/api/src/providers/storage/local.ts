import fs from 'fs';
import path from 'path';
import { StorageProvider, StoredFileResult } from './types.js';

export class LocalStorageProvider implements StorageProvider {
  public readonly name = 'local';
  private uploadDir: string;

  constructor(uploadDir?: string) {
    this.uploadDir = uploadDir || path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(options: {
    sourcePath: string;
    originalName: string;
    mimeType?: string;
    destinationSubdir?: string;
  }): Promise<StoredFileResult> {
    const targetDir = options.destinationSubdir
      ? path.join(this.uploadDir, options.destinationSubdir)
      : this.uploadDir;

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const ext = path.extname(options.originalName) || '.mp4';
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const destinationPath = path.join(targetDir, filename);

    // If source file is already at destinationPath, nothing to copy
    if (path.resolve(options.sourcePath) !== path.resolve(destinationPath)) {
      await fs.promises.copyFile(options.sourcePath, destinationPath);
    }

    const stat = await fs.promises.stat(destinationPath);
    const publicUrl = `/uploads/${path.relative(this.uploadDir, destinationPath).replace(/\\/g, '/')}`;

    return {
      storedPath: destinationPath,
      publicUrl,
      sizeBytes: stat.size,
      mimeType: options.mimeType,
    };
  }

  async deleteFile(storedPath: string): Promise<boolean> {
    try {
      if (fs.existsSync(storedPath)) {
        await fs.promises.unlink(storedPath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  getPublicUrl(storedPath: string): string {
    const relative = path.relative(this.uploadDir, storedPath).replace(/\\/g, '/');
    return `/uploads/${relative}`;
  }
}
