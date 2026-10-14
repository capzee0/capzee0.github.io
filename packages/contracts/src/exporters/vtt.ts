import type { Transcript } from '../schemas/transcript.js';
import { parseSRT } from './srt.js';

export function formatVTTTime(seconds: number): string {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export function generateVTT(transcript: Transcript): string {
  const lines: string[] = ['WEBVTT', ''];
  let index = 1;
  for (const seg of transcript.segments) {
    const text = seg.text.trim();
    if (!text) continue;
    lines.push(`cue-${index}`);
    lines.push(`${formatVTTTime(seg.start)} --> ${formatVTTTime(seg.end)}`);
    lines.push(text);
    lines.push('');
    index++;
  }
  return lines.join('\n');
}

export function parseVTT(vttContent: string): Transcript {
  const clean = vttContent.replace(/^WEBVTT[^\n]*\n+/i, '');
  return parseSRT(clean);
}
