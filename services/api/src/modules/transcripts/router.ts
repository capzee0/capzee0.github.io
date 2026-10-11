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
import { ValidatedTranscriptSchema, transliterateTranscript } from '@capzee/contracts';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const transcriptsRouter = Router({ mergeParams: true });

async function transcribeWithGroq(
  filePath: string,
  apiKey: string,
  language?: string,
  task: 'transcribe' | 'translate' = 'transcribe'
) {
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1) || 'mp4';
  const blob = new Blob([fileBuffer], { type: `video/${ext}` });
  const formData = new FormData();
  formData.append('file', blob, path.basename(filePath));
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');
  formData.append('timestamp_granularities[]', 'segment');
  if (task === 'transcribe' && language && language !== 'auto') {
    formData.append('language', language);
  }

  const endpoint = task === 'translate'
    ? 'https://api.groq.com/openai/v1/audio/translations'
    : 'https://api.groq.com/openai/v1/audio/transcriptions';

  const res = await fetch(endpoint, {
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

  const allWords = data.words || [];
  let wordCursor = 0;
  const rawSegments = data.segments || [];

  const segments = rawSegments.map((seg, sIdx) => {
    const segIdx = sIdx + 1;
    let segWords: Array<{ id: string; text: string; start: number; end: number; confidence: number | null }> = [];

    if (seg.words && seg.words.length > 0) {
      segWords = seg.words.map((w, wIdx) => ({
        id: `w-${segIdx}-${wIdx + 1}`,
        text: w.word.trim(),
        start: Number(w.start.toFixed(3)),
        end: Number(Math.max(w.start + 0.05, w.end).toFixed(3)),
        confidence: 1.0,
      }));
    } else if (allWords.length > 0) {
      while (wordCursor < allWords.length) {
        const w = allWords[wordCursor];
        if (sIdx < rawSegments.length - 1 && w.start >= seg.end) {
          break;
        }
        segWords.push({
          id: `w-${segIdx}-${segWords.length + 1}`,
          text: w.word.trim(),
          start: Number(w.start.toFixed(3)),
          end: Number(Math.max(w.start + 0.05, w.end).toFixed(3)),
          confidence: 1.0,
        });
        wordCursor++;
      }
    }

    return {
      id: `seg-${segIdx}`,
      start: Number(seg.start.toFixed(3)),
      end: Number(Math.max(seg.start + 0.1, seg.end).toFixed(3)),
      text: seg.text.trim(),
      words: segWords.length > 0 ? segWords : undefined,
    };
  });

  return {
    schemaVersion: 1 as const,
    language: data.language || language || 'en',
    segments,
  };
}

async function transcribeWithOpenAI(
  filePath: string,
  apiKey: string,
  language?: string,
  task: 'transcribe' | 'translate' = 'transcribe'
) {
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1) || 'mp4';
  const blob = new Blob([fileBuffer], { type: `video/${ext}` });
  const formData = new FormData();
  formData.append('file', blob, path.basename(filePath));
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');
  formData.append('timestamp_granularities[]', 'segment');
  if (task === 'transcribe' && language && language !== 'auto') {
    formData.append('language', language);
  }

  const endpoint = task === 'translate'
    ? 'https://api.openai.com/v1/audio/translations'
    : 'https://api.openai.com/v1/audio/transcriptions';

  const res = await fetch(endpoint, {
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

  const allWords = data.words || [];
  let wordCursor = 0;
  const rawSegments = data.segments || [];

  const segments = rawSegments.map((seg, sIdx) => {
    const segIdx = sIdx + 1;
    let segWords: Array<{ id: string; text: string; start: number; end: number; confidence: number | null }> = [];

    if (seg.words && seg.words.length > 0) {
      segWords = seg.words.map((w, wIdx) => ({
        id: `w-${segIdx}-${wIdx + 1}`,
        text: w.word.trim(),
        start: Number(w.start.toFixed(3)),
        end: Number(Math.max(w.start + 0.05, w.end).toFixed(3)),
        confidence: 1.0,
      }));
    } else if (allWords.length > 0) {
      while (wordCursor < allWords.length) {
        const w = allWords[wordCursor];
        if (sIdx < rawSegments.length - 1 && w.start >= seg.end) {
          break;
        }
        segWords.push({
          id: `w-${segIdx}-${segWords.length + 1}`,
          text: w.word.trim(),
          start: Number(w.start.toFixed(3)),
          end: Number(Math.max(w.start + 0.05, w.end).toFixed(3)),
          confidence: 1.0,
        });
        wordCursor++;
      }
    }

    return {
      id: `seg-${segIdx}`,
      start: Number(seg.start.toFixed(3)),
      end: Number(Math.max(seg.start + 0.1, seg.end).toFixed(3)),
      text: seg.text.trim(),
      words: segWords.length > 0 ? segWords : undefined,
    };
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
  captionOutput: z.enum(['native', 'roman', 'translate']).default('native'),
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
    const task = body.captionOutput === 'translate' ? 'translate' : 'transcribe';

    // Check Cloud STT: 1) Groq (Instant 1-2s), 2) OpenAI Whisper, 3) Local Worker
    const groqKey = process.env.GROQ_API_KEY || (config as { GROQ_API_KEY?: string }).GROQ_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY || (config as { OPENAI_API_KEY?: string }).OPENAI_API_KEY;

    if ((groqKey || openAiKey) && fs.existsSync(currentAssetPath)) {
      updateJob(job.id, { status: 'processing', stage: 'cloud_transcription', progress: 30 });

      const runner = groqKey
        ? transcribeWithGroq(currentAssetPath, groqKey, body.language, task)
        : transcribeWithOpenAI(currentAssetPath, openAiKey!, body.language, task);

      runner
        .then((rawTranscript) => {
          const finalTranscript = body.captionOutput === 'roman'
            ? transliterateTranscript(rawTranscript, body.language)
            : rawTranscript;

          setTranscript(currentProjectId, finalTranscript);
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
              const rawTranscript = await transcribeWithOpenAI(currentAssetPath, openAiKey, body.language, task);
              const finalTranscript = body.captionOutput === 'roman'
                ? transliterateTranscript(rawTranscript, body.language)
                : rawTranscript;

              setTranscript(currentProjectId, finalTranscript);
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
        '--task', task,
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
                const finalTranscript = body.captionOutput === 'roman'
                  ? transliterateTranscript(parsed.data, body.language)
                  : parsed.data;

                setTranscript(currentProjectId, finalTranscript);
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
