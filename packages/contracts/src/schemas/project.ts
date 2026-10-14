import { z } from 'zod';

export const ProjectStatusSchema = z.enum([
  'created',
  'uploading',
  'processing',
  'transcribed',
  'ready',
  'error',
]);

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  status: ProjectStatusSchema,
  durationSeconds: z.number().nonnegative().nullable(),
  originalAssetPath: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
export type Project = z.infer<typeof ProjectSchema>;
