import { z } from 'zod';

export const WordSchema = z.object({
  id: z.string(),
  text: z.string(),
  start: z.number().finite().nonnegative(),
  end: z.number().finite().nonnegative(),
  confidence: z.number().min(0).max(1).nullable().optional(),
});

export const SegmentSchema = z.object({
  id: z.string(),
  start: z.number().finite().nonnegative(),
  end: z.number().finite().nonnegative(),
  text: z.string(),
  words: z.array(WordSchema).optional(),
});

export const TranscriptSchema = z.object({
  schemaVersion: z.literal(1),
  language: z.string().min(2).max(10),
  segments: z.array(SegmentSchema),
});

export const ValidatedTranscriptSchema = TranscriptSchema.refine(
  (t) => t.segments.every((seg) => seg.end > seg.start),
  { message: 'All segment end times must be greater than start times' }
).refine(
  (t) =>
    t.segments.every((seg) =>
      (seg.words ?? []).every((w) => w.end > w.start)
    ),
  { message: 'All word end times must be greater than start times' }
);

export type Word = z.infer<typeof WordSchema>;
export type Segment = z.infer<typeof SegmentSchema>;
export type Transcript = z.infer<typeof TranscriptSchema>;

export const CaptionOutputSchema = z.enum(['native', 'roman', 'translate']);
export type CaptionOutput = z.infer<typeof CaptionOutputSchema>;

export const TranscribeOptionsSchema = z.object({
  language: z.string().default('auto'),
  model: z.enum(['tiny', 'base', 'small', 'medium', 'large-v2', 'large-v3']).optional(),
  device: z.enum(['cpu', 'cuda', 'auto']).optional(),
  captionOutput: CaptionOutputSchema.default('native'),
});
export type TranscribeOptions = z.infer<typeof TranscribeOptionsSchema>;
