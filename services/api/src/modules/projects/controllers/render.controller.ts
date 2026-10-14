import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { getProject, getTranscript, createJob, updateJob, updateProject } from '../../../db/local-store.js';
import { createError } from '../../../middleware/error.js';
import type { Transcript } from '@capzee/contracts';
import { spawnRenderJob } from '../services/render.service.js';

const EXPORT_DIR = path.resolve(process.cwd(), 'exports');

export function handleRenderProject(req: Request, res: Response, next: NextFunction): void {
  try {
    const projectId = req.params.projectId as string;
    const project = getProject(projectId);
    if (!project) return next(createError('Project not found', 404, 'PROJECT_NOT_FOUND'));

    if (!project.originalAssetPath || !fs.existsSync(project.originalAssetPath)) {
      return next(createError('No media file exists for this project', 422, 'NO_MEDIA'));
    }

    const rawTranscript = getTranscript(projectId);
    if (!rawTranscript) {
      return next(createError('No transcript found for this project. Transcribe first.', 422, 'NO_TRANSCRIPT'));
    }

    const transcript = rawTranscript as Transcript;
    const job = createJob({ projectId: project.id, jobType: 'render' });
    updateJob(job.id, { status: 'processing', stage: 'initializing', progress: 5 });
    updateProject(project.id, { status: 'processing' });

    // Asynchronously spawn render pipeline
    spawnRenderJob({
      project,
      job,
      transcript,
      style: req.body.style ?? {},
      resolution: req.body.resolution ?? 'original',
      exportDir: EXPORT_DIR,
    });

    res.status(202).json({
      success: true,
      data: {
        job: {
          id: job.id,
          status: 'processing',
          progress: 5,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
