import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  getProject,
  getTranscript,
  setTranscript,
  createJob,
  updateJob,
  updateProject,
} from '../../db/local-store.js';
import { createError } from '../../middleware/error.js';
import { ValidatedTranscriptSchema, transliterateTranscript } from '@capzee/contracts';
import { transcribeWithFallbackChain, TranscriptionError } from '../../providers/transcription/index.js';

export const transcribeBody = z.object({
  language: z.string().default('auto'),
  model: z.enum(['tiny', 'base', 'small', 'medium', 'large-v2', 'large-v3']).optional(),
  device: z.enum(['cpu', 'cuda', 'auto']).optional(),
  captionOutput: z.enum(['native', 'roman', 'translate']).default('native'),
});

export const patchTranscriptBody = z.object({
  transcript: ValidatedTranscriptSchema,
});

export async function handleTranscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.projectId as string;
    const project = getProject(projectId);
    if (!project) return next(createError('Project not found', 404, 'PROJECT_NOT_FOUND'));
    if (!project.originalAssetPath) {
      return next(createError('No media file associated with this project', 422, 'NO_MEDIA'));
    }

    const body = transcribeBody.parse(req.body);
    const job = createJob({ projectId: project.id, jobType: 'transcribe' });

    // Update project status to processing
    updateProject(project.id, { status: 'processing' });
    updateJob(job.id, { status: 'processing', stage: 'starting', progress: 5 });

    const currentProjectId = project.id;
    const currentAssetPath = project.originalAssetPath;
    const task = body.captionOutput === 'translate' ? 'translate' : 'transcribe';

    // Execute via Provider Fallback Chain (Groq ─> OpenAI ─> Local Faster-Whisper ─> Mock)
    transcribeWithFallbackChain({
      filePath: currentAssetPath,
      language: body.language,
      model: body.model,
      device: body.device,
      task,
      captionOutput: body.captionOutput,
      jobId: job.id,
      onProgress: (stage, progress) => {
        updateJob(job.id, {
          status: 'processing',
          stage,
          progress,
        });
      },
    })
      .then(({ transcript: rawTranscript, providerUsed }) => {
        const finalTranscript =
          body.captionOutput === 'roman'
            ? transliterateTranscript(rawTranscript, body.language)
            : rawTranscript;

        setTranscript(currentProjectId, finalTranscript);
        updateJob(job.id, {
          status: 'completed',
          stage: 'done',
          progress: 100,
          completedAt: new Date().toISOString(),
        });
        updateProject(currentProjectId, { status: 'transcribed' });
        console.info(
          `[transcribe] Transcription succeeded for project ${currentProjectId} using provider: ${providerUsed}`
        );
      })
      .catch((err) => {
        console.error(`[transcribe] Transcription job failed for project ${currentProjectId}:`, err);
        const errorCode =
          err instanceof TranscriptionError ? err.code : 'INTERNAL_ERROR';
        updateJob(job.id, {
          status: 'failed',
          stage: 'failed',
          errorCode,
          errorMessage: (err as Error).message,
          completedAt: new Date().toISOString(),
        });
        updateProject(currentProjectId, { status: 'error' });
      });

    res.status(202).json({ success: true, data: { jobId: job.id } });
  } catch (err) {
    next(err);
  }
}

export function handleGetTranscript(req: Request, res: Response, next: NextFunction): void {
  const projectId = req.params.projectId as string;
  const project = getProject(projectId);
  if (!project) return next(createError('Project not found', 404, 'PROJECT_NOT_FOUND'));

  const transcript = getTranscript(projectId);
  if (!transcript) return next(createError('Transcript not found', 404, 'TRANSCRIPT_NOT_FOUND'));

  res.json({ success: true, data: transcript });
}

export function handleUpdateTranscript(req: Request, res: Response, next: NextFunction): void {
  try {
    const projectId = req.params.projectId as string;
    const project = getProject(projectId);
    if (!project) return next(createError('Project not found', 404, 'PROJECT_NOT_FOUND'));

    const body = patchTranscriptBody.parse(req.body);
    setTranscript(projectId, body.transcript);

    res.json({ success: true, data: body.transcript });
  } catch (err) {
    next(err);
  }
}
