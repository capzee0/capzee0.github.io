import type { Transcript } from '@capzee/contracts';

export interface SilenceClip {
  id: string;
  start: number;
  end: number;
  duration: number;
  reason: string;
}

export interface SilenceDetectionResult {
  sensitivity: 'gentle' | 'balanced' | 'tight';
  minPauseSec: number;
  removedClips: SilenceClip[];
  totalRemovedSeconds: number;
  count: number;
}

export function detectSilenceGaps(
  transcript: Transcript,
  sensitivity: 'gentle' | 'balanced' | 'tight' = 'balanced'
): SilenceDetectionResult {
  const minPauseSec = sensitivity === 'gentle' ? 0.9 : sensitivity === 'tight' ? 0.4 : 0.6;
  const segments = transcript.segments || [];

  const allWords: Array<{ text: string; start: number; end: number }> = [];
  for (const seg of segments) {
    if (seg.words && seg.words.length > 0) {
      for (const w of seg.words) {
        allWords.push({ text: w.text, start: w.start, end: w.end });
      }
    } else {
      allWords.push({ text: seg.text, start: seg.start, end: seg.end });
    }
  }

  allWords.sort((a, b) => a.start - b.start);

  const removedClips: SilenceClip[] = [];

  // Leading pause before first word
  if (allWords.length > 0 && allWords[0].start > minPauseSec) {
    const dur = Number(allWords[0].start.toFixed(2));
    removedClips.push({
      id: 'silence-0',
      start: 0,
      end: allWords[0].start,
      duration: dur,
      reason: `Initial dead air (${dur}s pause)`,
    });
  }

  // Gaps between words
  for (let i = 0; i < allWords.length - 1; i++) {
    const currentEnd = allWords[i].end;
    const nextStart = allWords[i + 1].start;
    const gap = nextStart - currentEnd;
    if (gap >= minPauseSec) {
      const dur = Number(gap.toFixed(2));
      removedClips.push({
        id: `silence-${i + 1}`,
        start: Number(currentEnd.toFixed(2)),
        end: Number(nextStart.toFixed(2)),
        duration: dur,
        reason: `Dead air between "${allWords[i].text}" and "${allWords[i + 1].text}" (${dur}s)`,
      });
    }
  }

  const totalRemoved = removedClips.reduce((acc, c) => acc + c.duration, 0);

  return {
    sensitivity,
    minPauseSec,
    removedClips,
    totalRemovedSeconds: Number(totalRemoved.toFixed(2)),
    count: removedClips.length,
  };
}
