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
import fs from 'fs';
import path from 'path';
import { config } from '../../config/index.js';

export const transcriptsRouter = Router({ mergeParams: true });

async function transcribeWithGroq(filePath: string, apiKey: string, language?: string) {
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1) || 'mp4';
  const blob = new Blob([fileBuffer], { type: `video/${ext}` });
  const formData = new FormData();
  formData.append('file', blob, path.basename(filePath));
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');
  formData.append('timestamp_granularities[]', 'segment');
  if (language && language !== 'auto') {
    formData.append('language', language);
  }

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errorText}`);
  }

  const data = await res.json() as {
    language?: string;
    text: string;
    segments?: Array<{ id: number; start: number; end: number; text: string; words?: Array<{ word: string; start: number; end: number }> }>;
    words?: Array<{ word: string; start: number; end: number }>;
  };

  let segIdx = 1;
  const segments = (data.segments || []).map((seg) => {
    const rawWords = (seg.words || []).map((w, wIdx) => ({
      id: `w-${segIdx}-${wIdx + 1}`,
      text: w.word.trim(),
      start: Number(w.start.toFixed(3)),
      end: Number(Math.max(w.start + 0.05, w.end).toFixed(3)),
      confidence: 1.0,
    }));

    const resultSeg = {
      id: `seg-${segIdx}`,
      start: Number(seg.start.toFixed(3)),
      end: Number(Math.max(seg.start + 0.1, seg.end).toFixed(3)),
      text: seg.text.trim(),
      words: rawWords.length > 0 ? rawWords : undefined,
    };
    segIdx++;
    return resultSeg;
  });

  return {
    schemaVersion: 1 as const,
    language: data.language || language || 'en',
    segments,
  };
}

async function transcribeWithOpenAI(filePath: string, apiKey: string, language?: string) {
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1) || 'mp4';
  const blob = new Blob([fileBuffer], { type: `video/${ext}` });
  const formData = new FormData();
  formData.append('file', blob, path.basename(filePath));
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');
  formData.append('timestamp_granularities[]', 'segment');
  if (language && language !== 'auto') {
    formData.append('language', language);
  }

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${errorText}`);
  }

  const data = await res.json() as {
    language?: string;
    text: string;
    segments?: Array<{ id: number; start: number; end: number; text: string; words?: Array<{ word: string; start: number; end: number }> }>;
    words?: Array<{ word: string; start: number; end: number }>;
  };

  let segIdx = 1;
  const segments = (data.segments || []).map((seg) => {
    const rawWords = (seg.words || []).map((w, wIdx) => ({
      id: `w-${segIdx}-${wIdx + 1}`,
      text: w.word.trim(),
      start: Number(w.start.toFixed(3)),
      end: Number(Math.max(w.start + 0.05, w.end).toFixed(3)),
      confidence: 1.0,
    }));

    const resultSeg = {
      id: `seg-${segIdx}`,
      start: Number(seg.start.toFixed(3)),
      end: Number(Math.max(seg.start + 0.1, seg.end).toFixed(3)),
      text: seg.text.trim(),
      words: rawWords.length > 0 ? rawWords : undefined,
    };
    segIdx++;
    return resultSeg;
  });

  return {
    schemaVersion: 1 as const,
    language: data.language || language || 'en',
    segments,
  };
}

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

    const currentProjectId = project.id;
    const currentAssetPath = project.originalAssetPath;

    // Check Cloud STT: 1) Groq (Instant 1-2s), 2) OpenAI Whisper, 3) Local Worker
    const groqKey = process.env.GROQ_API_KEY || (config as { GROQ_API_KEY?: string }).GROQ_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    if ((groqKey || openAiKey) && fs.existsSync(currentAssetPath)) {
      updateJob(job.id, { status: 'processing', stage: 'cloud_transcription', progress: 30 });

      const runner = groqKey
        ? transcribeWithGroq(currentAssetPath, groqKey, body.language)
        : transcribeWithOpenAI(currentAssetPath, openAiKey!, body.language);

      runner
        .then((transcript) => {
          setTranscript(currentProjectId, transcript);
          updateJob(job.id, {
            status: 'completed',
            progress: 100,
            stage: 'done',
            completedAt: new Date().toISOString(),
          });
          updateProject(currentProjectId, { status: 'transcribed' });
        })
        .catch(async (err) => {
          console.warn('[transcribe] Primary cloud STT failed:', err.message);
          if (groqKey && openAiKey) {
            try {
              console.info('[transcribe] Retrying with OpenAI Whisper...');
              const transcript = await transcribeWithOpenAI(currentAssetPath, openAiKey, body.language);
              setTranscript(currentProjectId, transcript);
              updateJob(job.id, {
                status: 'completed',
                progress: 100,
                stage: 'done',
                completedAt: new Date().toISOString(),
              });
              updateProject(currentProjectId, { status: 'transcribed' });
              return;
            } catch (openAiErr) {
              console.warn('[transcribe] OpenAI Whisper also failed:', openAiErr);
            }
          }
          startLocalWorker();
        });

      return res.status(202).json({ success: true, data: { jobId: job.id } });
    }

    startLocalWorker();
    return res.status(202).json({ success: true, data: { jobId: job.id } });

    function startLocalWorker() {
      // Start the Python worker asynchronously
      const workerScript = path.resolve(
        __dirname,
        '../../../../ai-worker/capzee_worker/scripts/transcribe_cli.py'
      );

      const pythonBin = process.env.PYTHON_PATH ?? 'python';
      const model = body.model ?? config.CAPZEE_WHISPER_MODEL;
      const device = body.device ?? config.CAPZEE_WHISPER_DEVICE;

      const args: string[] = [
        workerScript,
        '--video', currentAssetPath,
        '--language', body.language,
        '--model', model,
        '--device', device,
        '--job-id', job.id,
      ];

      updateJob(job.id, { status: 'processing', stage: 'starting', progress: 5 });

      const child = spawn(pythonBin, args);

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
                setTranscript(currentProjectId, parsed.data);
                updateJob(job.id, { status: 'completed', progress: 100, stage: 'done', completedAt: new Date().toISOString() });
                updateProject(currentProjectId, { status: 'transcribed' });
              } else {
                updateJob(job.id, { status: 'failed', errorCode: 'INVALID_TRANSCRIPT', errorMessage: 'Worker returned invalid transcript schema' });
                updateProject(currentProjectId, { status: 'error' });
              }
            }
          } catch {
            updateJob(job.id, { status: 'failed', errorCode: 'PARSE_ERROR', errorMessage: 'Failed to parse worker output' });
            updateProject(currentProjectId, { status: 'error' });
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
          updateProject(currentProjectId, { status: 'error' });
        }
      });
    }
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
