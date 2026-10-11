import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import {
  createProject,
  getProject,
  listProjects,
  updateProject,
  deleteProject,
  getTranscript,
  createJob,
  updateJob,
} from '../../db/local-store.js';
import { createError } from '../../middleware/error.js';
import {
  generateSRT,
  generateVTT,
  generatePlainText,
  Transcript,
} from '@capzee/contracts';

export const projectsRouter = Router();

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const EXPORT_DIR = path.resolve(process.cwd(), 'exports');
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

const createProjectBody = z.object({
  title: z.string().min(1).max(255),
  localVideoPath: z.string().optional(),
});

const patchProjectBody = z.object({
  title: z.string().min(1).max(255).optional(),
  status: z.enum(['created', 'uploading', 'processing', 'transcribed', 'ready', 'error']).optional(),
});

// POST /projects
projectsRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createProjectBody.parse(req.body);
    const project = createProject({ title: body.title, localVideoPath: body.localVideoPath });
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
});

// GET /projects
projectsRouter.get('/', (_req: Request, res: Response) => {
  const projects = listProjects();
  res.json({ success: true, data: projects });
});

// GET /projects/:projectId
projectsRouter.get('/:projectId', (req: Request, res: Response, next: NextFunction) => {
  const projectId = req.params.projectId as string;
  const project = getProject(projectId);
  if (!project) return next(createError('Project not found', 404, 'PROJECT_NOT_FOUND'));
  res.json({ success: true, data: project });
});

// PATCH /projects/:projectId
projectsRouter.patch('/:projectId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const body = patchProjectBody.parse(req.body);
    const project = updateProject(projectId, body);
    if (!project) return next(createError('Project not found', 404, 'PROJECT_NOT_FOUND'));
    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
});

// DELETE /projects/:projectId
projectsRouter.delete('/:projectId', (req: Request, res: Response, next: NextFunction) => {
  const projectId = req.params.projectId as string;
  const deleted = deleteProject(projectId);
  if (!deleted) return next(createError('Project not found', 404, 'PROJECT_NOT_FOUND'));
  res.json({ success: true, data: { deleted: true } });
});

// POST /projects/:projectId/media
projectsRouter.post(
  '/:projectId/media',
  upload.single('file'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const project = getProject(projectId);
      if (!project) return next(createError('Project not found', 404, 'PROJECT_NOT_FOUND'));

      if (!req.file) {
        return next(createError('No file provided in form-data "file" field', 400, 'NO_FILE_PROVIDED'));
      }

      const filePath = path.resolve(req.file.path);
      const updated = updateProject(projectId, {
        originalAssetPath: filePath,
        status: 'ready',
      });

      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// GET /projects/:projectId/media
projectsRouter.get('/:projectId/media', (req: Request, res: Response, next: NextFunction) => {
  const projectId = req.params.projectId as string;
  const project = getProject(projectId);
  if (!project) return next(createError('Project not found', 404, 'PROJECT_NOT_FOUND'));

  const videoPath = project.originalAssetPath;
  if (!videoPath || !fs.existsSync(videoPath)) {
    return next(createError('Media file not found', 404, 'MEDIA_NOT_FOUND'));
  }

  res.sendFile(path.resolve(videoPath));
});

// POST /projects/:projectId/render
projectsRouter.post('/:projectId/render', async (req: Request, res: Response, next: NextFunction) => {
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

    // Write transcript to a temporary json file for the python worker
    const tmpTranscriptPath = path.join(EXPORT_DIR, `transcript-${job.id}.json`);
    fs.writeFileSync(tmpTranscriptPath, JSON.stringify(transcript), 'utf-8');

    const outputFileName = `${project.id}-rendered-${Date.now()}.mp4`;
    const outputPath = path.join(EXPORT_DIR, outputFileName);

    const workerScript = path.resolve(
      __dirname,
      '../../../../ai-worker/capzee_worker/scripts/render_cli.py'
    );
    const pythonBin = process.env.PYTHON_PATH ?? 'python';

    const args = [
      workerScript,
      '--video', project.originalAssetPath,
      '--transcript', tmpTranscriptPath,
      '--style', JSON.stringify(req.body.style ?? {}),
      '--output', outputPath,
      '--resolution', req.body.resolution ?? 'original',
      '--job-id', job.id,
    ];

    const child = spawn(pythonBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
      // Try parsing progress event
      try {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const l of lines) {
          const evt = JSON.parse(l);
          if (evt.type === 'progress') {
            updateJob(job.id, { progress: evt.progress, stage: evt.stage });
          }
        }
      } catch {
        // Not JSON progress event, ignore
      }
    });

    child.on('close', (code: number | null) => {
      // Clean up tmp transcript
      try {
        if (fs.existsSync(tmpTranscriptPath)) fs.unlinkSync(tmpTranscriptPath);
      } catch {
        // ignore
      }

      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          if (result.success && fs.existsSync(outputPath)) {
            updateProject(project.id, {
              status: 'ready',
              renderedAssetPath: outputPath,
            });
            updateJob(job.id, {
              status: 'completed',
              progress: 100,
              stage: 'completed',
              completedAt: new Date().toISOString(),
            });
            return;
          }
        } catch {
          // fall through
        }
      }

      // Handle failure
      let errorCode = 'RENDER_FAILED';
      let errorMessage = stderr.slice(-400) || 'Rendering failed';
      try {
        const parsedOut = JSON.parse(stdout);
        if (parsedOut.error) {
          errorCode = parsedOut.error.code || errorCode;
          errorMessage = parsedOut.error.message || errorMessage;
        }
      } catch {
        // use fallback
      }

      updateJob(job.id, {
        status: 'failed',
        errorCode,
        errorMessage,
      });
      updateProject(project.id, { status: 'error' });
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
});

// GET /projects/:projectId/export?format=mp4|srt|vtt|txt|json
projectsRouter.get('/:projectId/export', (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const project = getProject(projectId);
    if (!project) return next(createError('Project not found', 404, 'PROJECT_NOT_FOUND'));

    const format = String(req.query.format || 'srt').toLowerCase();
    const rawTranscript = getTranscript(projectId);

    if (format === 'mp4') {
      if (!project.renderedAssetPath || !fs.existsSync(project.renderedAssetPath)) {
        return next(createError('Rendered video not found. Please render the video first.', 404, 'RENDER_NOT_FOUND'));
      }
      return res.download(project.renderedAssetPath, `${project.title || 'captioned-video'}.mp4`);
    }

    if (!rawTranscript) {
      return next(createError('No transcript available for export', 404, 'TRANSCRIPT_NOT_FOUND'));
    }

    const transcript = rawTranscript as Transcript;

    if (format === 'srt') {
      const srt = generateSRT(transcript);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${project.title || 'captions'}.srt"`);
      return res.send(srt);
    }

    if (format === 'vtt') {
      const vtt = generateVTT(transcript);
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${project.title || 'captions'}.vtt"`);
      return res.send(vtt);
    }

    if (format === 'txt') {
      const txt = generatePlainText(transcript);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${project.title || 'transcript'}.txt"`);
      return res.send(txt);
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${project.title || 'transcript'}.json"`);
      return res.json(transcript);
    }

    return next(createError(`Unsupported export format: ${format}`, 400, 'INVALID_FORMAT'));
  } catch (err) {
    next(err);
  }
});

// POST /projects/:projectId/trim-silence
projectsRouter.post('/:projectId/trim-silence', (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const project = getProject(projectId);
    if (!project) return next(createError('Project not found', 404, 'PROJECT_NOT_FOUND'));

    const rawTranscript = getTranscript(projectId);
    if (!rawTranscript) {
      return next(createError('No transcript found. Transcribe first to detect pauses.', 422, 'NO_TRANSCRIPT'));
    }

    const { sensitivity = 'balanced' } = req.body as { sensitivity?: 'gentle' | 'balanced' | 'tight' };
    const minPauseSec = sensitivity === 'gentle' ? 0.9 : sensitivity === 'tight' ? 0.4 : 0.6;

    const transcript = rawTranscript as Transcript;
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

    const removedClips: Array<{ id: string; start: number; end: number; duration: number; reason: string }> = [];

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

    res.json({
      success: true,
      data: {
        sensitivity,
        minPauseSec,
        removedClips,
        totalRemovedSeconds: Number(totalRemoved.toFixed(2)),
        count: removedClips.length,
      },
    });
  } catch (err) {
    next(err);
  }
});
