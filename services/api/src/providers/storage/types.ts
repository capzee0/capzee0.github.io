export interface StoredFileResult {
  storedPath: string;
  publicUrl: string;
  sizeBytes: number;
  mimeType?: string;
}

export interface SignedUploadUrlResult {
  uploadUrl: string;
  fileKey: string;
  expiresInSeconds: number;
}

export interface StorageProvider {
  name: string;
  saveFile(options: {
    sourcePath: string;
    originalName: string;
    mimeType?: string;
    destinationSubdir?: string;
  }): Promise<StoredFileResult>;
  deleteFile(storedPath: string): Promise<boolean>;
  getPublicUrl(storedPath: string): string;
  createSignedUploadUrl?(options: {
    filename: string;
    mimeType: string;
  }): Promise<SignedUploadUrlResult>;
}
