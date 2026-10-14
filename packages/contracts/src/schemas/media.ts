import { z } from 'zod';

export const MediaAssetTypeSchema = z.enum([
  'source_video',
  'extracted_audio',
  'rendered_video',
  'thumbnail',
]);

export const MediaInfoSchema = z.object({
  durationSeconds: z.number().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  frameRate: z.number().positive(),
  videoCodec: z.string(),
  audioCodec: z.string().nullable(),
  hasAudio: z.boolean(),
  sizeBytes: z.number().nonnegative(),
  format: z.string(),
});

export type MediaAssetType = z.infer<typeof MediaAssetTypeSchema>;
export type MediaInfo = z.infer<typeof MediaInfoSchema>;
