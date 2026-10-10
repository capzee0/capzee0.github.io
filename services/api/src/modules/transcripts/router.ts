import { Router, Request, Response, NextFunction } from 'express';
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
import { ValidatedTranscriptSchema } from '@capzee/contracts';
import { spawn } from 'child_process';
import path from 'path';
import { config } from '../../config/index.js';

export const transcriptsRouter = Router({ mergeParams: true });

const transcribeBody = z.object({
  language: z.string().default('auto'),
  model: z.enum(['tiny', 'base', 'small', 'medium', 'large-v2', 'large-v3']).optional(),
  device: z.enum(['cpu', 'cuda', 'auto']).optional(),
});

const patchTranscriptBody = z.object({
  transcript: ValidatedTranscriptSchema,
});

// POST /projects/:projectId/transcribe
transcriptsRouter.post('/transcribe', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const project = getProject(projectId);
    if (!project) return next(createError('Project not found', 404, 'PROJECT_NOT_FOUND'));
    if (!project.originalAssetPath) {
      return next(createError('No media file associated with this project', 422, 'NO_MEDIA'));
    }

    const body = transcribeBody.parse(req.body);
    const job = createJob({ projectId: project.id, jobType: 'transcribe' });

    // Update project status
    updateProject(project.id, { status: 'processing' });

    // Start the Python worker asynchronously
    const workerScript = path.resolve(
      __dirname,
      '../../../../ai-worker/capzee_worker/scripts/transcribe_cli.py'
    );

    const pythonBin = process.env.PYTHON_PATH ?? 'python';
    const model = body.model ?? config.CAPZEE_WHISPER_MODEL;
    const device = body.device ?? config.CAPZEE_WHISPER_DEVICE;

    const args = [
      workerScript,
      '--video', project.originalAssetPath,
      '--language', body.language,
      '--model', model,
      '--device', device,
      '--job-id', job.id,
    ];

    updateJob(job.id, { status: 'processing', stage: 'starting', progress: 5 });

    const child = spawn(pythonBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      try {
        const lines = text.split('\n').filter(Boolean);
        for (const line of lines) {
          const evt = JSON.parse(line);
          if (evt.type === 'progress') {
            updateJob(job.id, { progress: evt.progress, stage: evt.stage });
          }
        }
      } catch {
        // Not a JSON progress line
      }
    });

    child.on('close', (code: number | null) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          if (result.transcript) {
            const parsed = ValidatedTranscriptSchema.safeParse(result.transcript);
            if (parsed.success) {
              setTranscript(project.id, parsed.data);
              updateJob(job.id, { status: 'completed', progress: 100, stage: 'done', completedAt: new Date().toISOString() });
              updateProject(project.id, { status: 'transcribed' });
            } else {
              updateJob(job.id, { status: 'failed', errorCode: 'INVALID_TRANSCRIPT', errorMessage: 'Worker returned invalid transcript schema' });
              updateProject(project.id, { status: 'error' });
            }
          }
        } catch {
          updateJob(job.id, { status: 'failed', errorCode: 'PARSE_ERROR', errorMessage: 'Failed to parse worker output' });
          updateProject(project.id, { status: 'error' });
        }
      } else {
        let errorCode = 'WORKER_EXIT';
        let errorMessage = stderr.slice(-500) || 'Transcription worker failed';
        try {
          const parsed = JSON.parse(stdout);
          if (parsed.error) {
            errorCode = parsed.error.code || errorCode;
            errorMessage = parsed.error.message || errorMessage;
          }
        } catch {
          // ignore
        }
        updateJob(job.id, { status: 'failed', errorCode, errorMessage });
        updateProject(project.id, { status: 'error' });
      }
    });

    res.status(202).json({ success: true, data: { jobId: job.id } });
  } catch (err) {
    next(err);
  }
});

// GET /projects/:projectId/transcript
transcriptsRouter.get('/transcript', (req: Request, res: Response, next: NextFunction) => {
  const projectId = req.params.projectId as string;
  const project = getProject(projectId);
  if (!project) return next(createError('Project not found', 404, 'PROJECT_NOT_FOUND'));

  const transcript = getTranscript(projectId);
  if (!transcript) return next(createError('Transcript not found', 404, 'TRANSCRIPT_NOT_FOUND'));

  res.json({ success: true, data: transcript });
});

// PATCH /projects/:projectId/transcript
transcriptsRouter.patch('/transcript', (req: Request, res: Response, next: NextFunction) => {
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
});
