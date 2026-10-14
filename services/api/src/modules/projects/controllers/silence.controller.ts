import type { Request, Response, NextFunction } from 'express';
import { getProject, getTranscript } from '../../../db/local-store.js';
import { createError } from '../../../middleware/error.js';
import type { Transcript } from '@capzee/contracts';
import { detectSilenceGaps } from '../services/silence.service.js';

export function handleTrimSilence(req: Request, res: Response, next: NextFunction): void {
  try {
    const projectId = req.params.projectId as string;
    const project = getProject(projectId);
    if (!project) return next(createError('Project not found', 404, 'PROJECT_NOT_FOUND'));

    const rawTranscript = getTranscript(projectId);
    if (!rawTranscript) {
      return next(createError('No transcript found. Transcribe first to detect pauses.', 422, 'NO_TRANSCRIPT'));
    }

    const { sensitivity = 'balanced' } = req.body as { sensitivity?: 'gentle' | 'balanced' | 'tight' };
    const result = detectSilenceGaps(rawTranscript as Transcript, sensitivity);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
