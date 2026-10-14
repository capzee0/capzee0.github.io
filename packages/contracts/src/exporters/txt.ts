import type { Transcript } from '../schemas/transcript.js';

export function generatePlainText(transcript: Transcript): string {
  return transcript.segments.map((s) => s.text.trim()).filter(Boolean).join('\n');
}
