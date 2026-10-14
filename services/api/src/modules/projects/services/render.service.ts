import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import type { Transcript, Project, ProcessingJob } from '@capzee/contracts';
import { updateJob, updateProject } from '../../../db/local-store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import type { StoredJob } from '../../../db/local-store.js';

export interface RenderProjectOptions {
  project: Project;
  job: StoredJob | ProcessingJob;
  transcript: Transcript;
  style?: Record<string, unknown>;
  resolution?: string;
  exportDir: string;
}

export function spawnRenderJob(options: RenderProjectOptions): void {
  const { project, job, transcript, style = {}, resolution = 'original', exportDir } = options;

  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  // Write transcript to a temporary json file for the python worker
  const tmpTranscriptPath = path.join(exportDir, `transcript-${job.id}.json`);
  fs.writeFileSync(tmpTranscriptPath, JSON.stringify(transcript), 'utf-8');

  const outputFileName = `${project.id}-rendered-${Date.now()}.mp4`;
  const outputPath = path.join(exportDir, outputFileName);

  const possibleWorkerPaths = [
    path.resolve(__dirname, '../../../../../../services/ai-worker/capzee_worker/scripts/render_cli.py'),
    path.resolve(process.cwd(), 'services/ai-worker/capzee_worker/scripts/render_cli.py'),
    path.resolve(process.cwd(), '../ai-worker/capzee_worker/scripts/render_cli.py'),
    path.resolve(__dirname, '../../../../ai-worker/capzee_worker/scripts/render_cli.py'),
  ];
  const workerScript = possibleWorkerPaths.find((p) => fs.existsSync(p)) || possibleWorkerPaths[0];
  const pythonBin = process.env.PYTHON_PATH ?? 'python';

  const args = [
    workerScript,
    '--video', project.originalAssetPath || '',
    '--transcript', tmpTranscriptPath,
    '--style', JSON.stringify(style),
    '--output', outputPath,
    '--resolution', resolution,
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
    try {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const l of lines) {
        const evt = JSON.parse(l);
        if (evt.type === 'progress') {
          updateJob(job.id, { progress: evt.progress, stage: evt.stage });
        }
      }
    } catch {
      // Non-JSON stderr, ignored
    }
  });

  child.on('close', (code: number | null) => {
    try {
      if (fs.existsSync(tmpTranscriptPath)) fs.unlinkSync(tmpTranscriptPath);
    } catch {
      // ignore tmp cleanup error
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
        // Fall through to error
      }
    }

    let errorCode = 'RENDER_FAILED';
    let errorMessage = stderr.slice(-400) || 'Rendering failed';
    try {
      const parsedOut = JSON.parse(stdout);
      if (parsedOut.error) {
        errorCode = parsedOut.error.code || errorCode;
        errorMessage = parsedOut.error.message || errorMessage;
      }
    } catch {
      // Fallback
    }

    updateJob(job.id, {
      status: 'failed',
      errorCode,
      errorMessage,
    });
    updateProject(project.id, { status: 'error' });
  });
}
