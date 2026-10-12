import type { Transcript } from '@capzee/contracts';
import { getDemoTranscript } from '@capzee/contracts';
import { TranscriptionProvider, TranscriptionRequest } from './types.js';

export class MockWhisperProvider implements TranscriptionProvider {
  public readonly name = 'mock';

  isAvailable(): boolean {
    return true;
  }

  async transcribe(request: TranscriptionRequest): Promise<Transcript> {
    request.onProgress?.('processing', 30);
    await new Promise((resolve) => setTimeout(resolve, 50));
    request.onProgress?.('formatting_transcript', 80);
    await new Promise((resolve) => setTimeout(resolve, 50));
    request.onProgress?.('done', 100);

    const base = getDemoTranscript();
    return {
      ...base,
      language: request.language && request.language !== 'auto' ? request.language : base.language,
    };
  }
}
