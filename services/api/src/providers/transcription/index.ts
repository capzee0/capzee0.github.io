import type { Transcript } from '@capzee/contracts';
import {
  TranscriptionProvider,
  TranscriptionRequest,
  TranscriptionError,
} from './types.js';
import { GroqWhisperProvider } from './groq.js';
import { OpenAIWhisperProvider } from './openai.js';
import { LocalFasterWhisperProvider } from './local.js';
import { MockWhisperProvider } from './mock.js';
import { config } from '../../config/index.js';

export * from './types.js';
export { GroqWhisperProvider } from './groq.js';
export { OpenAIWhisperProvider } from './openai.js';
export { LocalFasterWhisperProvider } from './local.js';
export { MockWhisperProvider } from './mock.js';

export function getTranscriptionProvider(name?: string): TranscriptionProvider {
  switch (name?.toLowerCase()) {
    case 'groq':
      return new GroqWhisperProvider();
    case 'openai':
      return new OpenAIWhisperProvider();
    case 'local':
    case 'local_faster_whisper':
      return new LocalFasterWhisperProvider();
    case 'mock':
      return new MockWhisperProvider();
    default: {
      const groq = new GroqWhisperProvider();
      if (groq.isAvailable()) return groq;

      const openAi = new OpenAIWhisperProvider();
      if (openAi.isAvailable()) return openAi;

      const local = new LocalFasterWhisperProvider();
      if (local.isAvailable()) return local;

      return new MockWhisperProvider();
    }
  }
}

/**
 * Executes speech-to-text with automatic fallback chain:
 * Groq Whisper (1-2s Cloud) ─> OpenAI Whisper ─> Local Faster-Whisper (Python) ─> Error/Mock
 */
export async function transcribeWithFallbackChain(
  request: TranscriptionRequest
): Promise<{ transcript: Transcript; providerUsed: string }> {
  const chain: TranscriptionProvider[] = [];

  const groq = new GroqWhisperProvider();
  if (groq.isAvailable()) chain.push(groq);

  const openAi = new OpenAIWhisperProvider();
  if (openAi.isAvailable()) chain.push(openAi);

  const local = new LocalFasterWhisperProvider();
  if (local.isAvailable()) chain.push(local);

  if (chain.length === 0 || config.NODE_ENV === 'test') {
    chain.push(new MockWhisperProvider());
  }

  const errors: { provider: string; error: string }[] = [];

  for (const provider of chain) {
    try {
      request.onProgress?.(`transcribing_${provider.name}`, 15);
      const transcript = await provider.transcribe(request);
      return { transcript, providerUsed: provider.name };
    } catch (err) {
      const errMsg = (err as Error).message;
      console.warn(`[Transcription Fallback Chain] Provider "${provider.name}" failed:`, errMsg);
      errors.push({ provider: provider.name, error: errMsg });
    }
  }

  throw new TranscriptionError(
    `All transcription providers in fallback chain failed: ${errors
      .map((e) => `[${e.provider}: ${e.error}]`)
      .join(' | ')}`,
    'PROVIDER_UNAVAILABLE',
    'fallback_chain',
    false
  );
}
