import type { Transcript, CaptionOutput } from '@capzee/contracts';

export type TranscriptionErrorCode =
  | 'RATE_LIMITED'
  | 'AUDIO_TOO_LONG'
  | 'INVALID_AUDIO_FORMAT'
  | 'PROVIDER_UNAVAILABLE'
  | 'AUTHENTICATION_ERROR'
  | 'NETWORK_ERROR'
  | 'INTERNAL_ERROR';

export class TranscriptionError extends Error {
  public readonly code: TranscriptionErrorCode;
  public readonly provider: string;
  public readonly retryable: boolean;

  constructor(message: string, code: TranscriptionErrorCode, provider: string, retryable = false) {
    super(message);
    this.name = 'TranscriptionError';
    this.code = code;
    this.provider = provider;
    this.retryable = retryable;
  }
}

export interface TranscriptionRequest {
  filePath: string;
  language?: string;
  model?: string;
  device?: 'cpu' | 'cuda' | 'auto';
  task?: 'transcribe' | 'translate';
  captionOutput?: CaptionOutput;
  jobId?: string;
  onProgress?: (stage: string, progress: number) => void;
}

export interface TranscriptionProvider {
  readonly name: string;
  isAvailable(): boolean;
  transcribe(request: TranscriptionRequest): Promise<Transcript>;
}
