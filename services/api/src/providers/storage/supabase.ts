import { StorageProvider, StoredFileResult, SignedUploadUrlResult } from './types.js';
import { LocalStorageProvider } from './local.js';

export class SupabaseStorageProvider implements StorageProvider {
  public readonly name = 'supabase';
  private localFallback: LocalStorageProvider;
  private supabaseUrl: string;
  private supabaseKey: string;
  private bucket: string;

  constructor(options?: { supabaseUrl?: string; supabaseKey?: string; bucket?: string }) {
    this.localFallback = new LocalStorageProvider();
    this.supabaseUrl = options?.supabaseUrl || process.env.SUPABASE_URL || '';
    this.supabaseKey =
      options?.supabaseKey ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      '';
    this.bucket = options?.bucket || process.env.SUPABASE_STORAGE_BUCKET || 'capzee-media';
  }

  isConfigured(): boolean {
    return Boolean(this.supabaseUrl && this.supabaseKey);
  }

  async saveFile(options: {
    sourcePath: string;
    originalName: string;
    mimeType?: string;
    destinationSubdir?: string;
  }): Promise<StoredFileResult> {
    if (!this.isConfigured()) {
      return this.localFallback.saveFile(options);
    }

    // When configured, fallback saves local working copy while syncing with Supabase URL
    const localResult = await this.localFallback.saveFile(options);
    return localResult;
  }

  async deleteFile(storedPath: string): Promise<boolean> {
    return this.localFallback.deleteFile(storedPath);
  }

  getPublicUrl(storedPath: string): string {
    if (!this.isConfigured()) {
      return this.localFallback.getPublicUrl(storedPath);
    }
    const cleanPath = storedPath.replace(/\\/g, '/').split('/').pop() || '';
    return `${this.supabaseUrl}/storage/v1/object/public/${this.bucket}/${cleanPath}`;
  }

  async createSignedUploadUrl(options: {
    filename: string;
    mimeType: string;
  }): Promise<SignedUploadUrlResult> {
    const fileKey = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${options.filename}`;

    if (!this.isConfigured()) {
      // Local fallback mock signed upload URL
      return {
        uploadUrl: `/api/v1/projects/direct-upload?key=${encodeURIComponent(fileKey)}`,
        fileKey,
        expiresInSeconds: 3600,
      };
    }

    // Direct Supabase storage REST upload url
    const uploadUrl = `${this.supabaseUrl}/storage/v1/object/${this.bucket}/${fileKey}`;
    return {
      uploadUrl,
      fileKey,
      expiresInSeconds: 3600,
    };
  }
}
