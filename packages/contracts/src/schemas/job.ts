import { z } from 'zod';
import type { CaptionOutput } from './transcript.js';

export const JobStatusSchema = z.enum([
  'queued',
  'processing',
  'completed',
  'failed',
  'cancelled',
]);

export const JobTypeSchema = z.enum([
  'transcribe',
  'render',
  'generate_social_captions',
  'extract_audio',
  'validate_media',
]);

export const ProcessingJobSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  jobType: JobTypeSchema,
  status: JobStatusSchema,
  stage: z.string().nullable(),
  progress: z.number().int().min(0).max(100),
  attempts: z.number().int().nonnegative(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});

export const JobStageSchema = z.enum([
  'queued',
  'uploaded',
  'extracting_audio',
  'transcribing',
  'ready',
  'rendering',
  'done',
  'failed',
]);

export const JobErrorCodeSchema = z.enum([
  'RATE_LIMITED',
  'AUDIO_TOO_LONG',
  'INVALID_AUDIO_FORMAT',
  'PROVIDER_UNAVAILABLE',
  'FFMPEG_ERROR',
  'MODEL_ERROR',
  'JOB_TIMEOUT',
  'INTERNAL_ERROR',
]);

export type JobStatus = z.infer<typeof JobStatusSchema>;
export type JobType = z.infer<typeof JobTypeSchema>;
export type JobStage = z.infer<typeof JobStageSchema>;
export type JobErrorCode = z.infer<typeof JobErrorCodeSchema>;
export type ProcessingJob = z.infer<typeof ProcessingJobSchema>;

export interface TranscriptionProviderInput {
  filePath: string;
  language?: string;
  model?: string;
  task?: 'transcribe' | 'translate';
  captionOutput?: CaptionOutput;
}
