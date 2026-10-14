import { z } from 'zod';

export const ExportFormatSchema = z.enum(['mp4', 'srt', 'vtt']);
export const ExportResolutionSchema = z.enum(['original', '720p', '1080p']);

export const ExportSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  jobId: z.string().uuid().nullable(),
  storagePath: z.string().nullable(),
  format: ExportFormatSchema,
  resolution: ExportResolutionSchema,
  fileSizeBytes: z.number().nonnegative().nullable(),
  createdAt: z.string().datetime(),
});

export type ExportFormat = z.infer<typeof ExportFormatSchema>;
export type ExportResolution = z.infer<typeof ExportResolutionSchema>;
export type Export = z.infer<typeof ExportSchema>;
