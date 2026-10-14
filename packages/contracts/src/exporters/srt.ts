import type { Transcript, Segment, Word } from '../schemas/transcript.js';

export function formatSRTTime(seconds: number): string {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function parseSRTTime(timeStr: string): number {
  const parts = timeStr.trim().split(':');
  if (parts.length < 3) return 0;
  const hours = parseFloat(parts[0]);
  const minutes = parseFloat(parts[1]);
  const secParts = parts[2].split(/[,.]/);
  const secs = parseFloat(secParts[0]);
  const ms = secParts[1] ? parseFloat(secParts[1].padEnd(3, '0').slice(0, 3)) : 0;
  return hours * 3600 + minutes * 60 + secs + ms / 1000;
}

export function generateSRT(transcript: Transcript): string {
  const lines: string[] = [];
  let index = 1;
  for (const seg of transcript.segments) {
    const text = seg.text.trim();
    if (!text) continue;
    lines.push(String(index));
    lines.push(`${formatSRTTime(seg.start)} --> ${formatSRTTime(seg.end)}`);
    lines.push(text);
    lines.push('');
    index++;
  }
  return lines.join('\n');
}

export function parseSRT(srtContent: string): Transcript {
  const blocks = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split(/\n\s*\n/);
  const segments: Segment[] = [];
  let segIdx = 1;

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    let timeLine = lines[0];
    let textLines = lines.slice(1);
    if (!timeLine.includes('-->') && lines.length >= 3) {
      timeLine = lines[1];
      textLines = lines.slice(2);
    }
    if (!timeLine.includes('-->')) continue;

    const [startStr, endStr] = timeLine.split('-->');
    const start = parseSRTTime(startStr);
    const end = Math.max(start + 0.1, parseSRTTime(endStr));
    const text = textLines.join(' ');
    if (!text) continue;

    const rawWords = text.split(/\s+/).filter(Boolean);
    const wordDuration = (end - start) / Math.max(1, rawWords.length);
    const words: Word[] = rawWords.map((w, wIdx) => ({
      id: `w-${segIdx}-${wIdx + 1}`,
      text: w,
      start: Number((start + wIdx * wordDuration).toFixed(3)),
      end: Number((start + (wIdx + 1) * wordDuration).toFixed(3)),
      confidence: 1.0,
    }));

    segments.push({
      id: `seg-${segIdx}`,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      text,
      words,
    });
    segIdx++;
  }

  return {
    schemaVersion: 1,
    language: 'en',
    segments,
  };
}
