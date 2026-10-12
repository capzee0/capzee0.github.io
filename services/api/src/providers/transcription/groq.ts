import fs from 'fs';
import path from 'path';
import type { Transcript } from '@capzee/contracts';
import { TranscriptionProvider, TranscriptionRequest, TranscriptionError } from './types.js';
import { config } from '../../config/index.js';

export class GroqWhisperProvider implements TranscriptionProvider {
  public readonly name = 'groq';

  isAvailable(): boolean {
    const key = process.env.GROQ_API_KEY || (config as { GROQ_API_KEY?: string }).GROQ_API_KEY;
    return Boolean(key && key.trim().length > 0);
  }

  async transcribe(request: TranscriptionRequest): Promise<Transcript> {
    const apiKey = process.env.GROQ_API_KEY || (config as { GROQ_API_KEY?: string }).GROQ_API_KEY;
    if (!apiKey) {
      throw new TranscriptionError('Groq API key not configured', 'PROVIDER_UNAVAILABLE', this.name, false);
    }

    if (!fs.existsSync(request.filePath)) {
      throw new TranscriptionError(`Media file not found: ${request.filePath}`, 'INVALID_AUDIO_FORMAT', this.name, false);
    }

    request.onProgress?.('cloud_transcription', 20);

    const fileBuffer = fs.readFileSync(request.filePath);
    const ext = path.extname(request.filePath).slice(1) || 'mp4';
    const blob = new Blob([fileBuffer], { type: `video/${ext}` });
    const formData = new FormData();
    formData.append('file', blob, path.basename(request.filePath));
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'word');
    formData.append('timestamp_granularities[]', 'segment');

    const task = request.task || (request.captionOutput === 'translate' ? 'translate' : 'transcribe');
    if (task === 'transcribe' && request.language && request.language !== 'auto') {
      formData.append('language', request.language);
    }

    const endpoint = task === 'translate'
      ? 'https://api.groq.com/openai/v1/audio/translations'
      : 'https://api.groq.com/openai/v1/audio/transcriptions';

    let res: globalThis.Response;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });
    } catch (netErr) {
      throw new TranscriptionError(
        `Failed to reach Groq API: ${(netErr as Error).message}`,
        'NETWORK_ERROR',
        this.name,
        true
      );
    }

    if (!res.ok) {
      const errorText = await res.text();
      if (res.status === 429) {
        throw new TranscriptionError('Groq rate limit exceeded', 'RATE_LIMITED', this.name, true);
      }
      if (res.status === 401 || res.status === 403) {
        throw new TranscriptionError('Groq authentication failed', 'AUTHENTICATION_ERROR', this.name, false);
      }
      throw new TranscriptionError(`Groq API error (${res.status}): ${errorText}`, 'INTERNAL_ERROR', this.name, false);
    }

    request.onProgress?.('formatting_transcript', 80);

    const data = (await res.json()) as {
      language?: string;
      text: string;
      segments?: Array<{
        id: number;
        start: number;
        end: number;
        text: string;
        words?: Array<{ word: string; start: number; end: number }>;
      }>;
      words?: Array<{ word: string; start: number; end: number }>;
    };

    const allWords = data.words || [];
    let wordCursor = 0;
    const rawSegments = data.segments || [];

    const segments = rawSegments.map((seg, sIdx) => {
      const segIdx = sIdx + 1;
      let segWords: Array<{ id: string; text: string; start: number; end: number; confidence: number | null }> = [];

      if (seg.words && seg.words.length > 0) {
        segWords = seg.words.map((w, wIdx) => ({
          id: `w-${segIdx}-${wIdx + 1}`,
          text: w.word.trim(),
          start: Number(w.start.toFixed(3)),
          end: Number(Math.max(w.start + 0.05, w.end).toFixed(3)),
          confidence: 1.0,
        }));
      } else if (allWords.length > 0) {
        while (wordCursor < allWords.length) {
          const w = allWords[wordCursor];
          if (sIdx < rawSegments.length - 1 && w.start >= seg.end) {
            break;
          }
          segWords.push({
            id: `w-${segIdx}-${segWords.length + 1}`,
            text: w.word.trim(),
            start: Number(w.start.toFixed(3)),
            end: Number(Math.max(w.start + 0.05, w.end).toFixed(3)),
            confidence: 1.0,
          });
          wordCursor++;
        }
      }

      return {
        id: `seg-${segIdx}`,
        start: Number(seg.start.toFixed(3)),
        end: Number(Math.max(seg.start + 0.1, seg.end).toFixed(3)),
        text: seg.text.trim(),
        words: segWords.length > 0 ? segWords : undefined,
      };
    });

    return {
      schemaVersion: 1 as const,
      language: data.language || request.language || 'en',
      segments,
    };
  }
}
