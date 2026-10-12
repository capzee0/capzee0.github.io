import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { Transcript } from '@capzee/contracts';
import { TranscriptionProvider, TranscriptionRequest, TranscriptionError } from './types.js';
import { config } from '../../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class LocalFasterWhisperProvider implements TranscriptionProvider {
  public readonly name = 'local_faster_whisper';

  isAvailable(): boolean {
    const workerScript = path.resolve(
      __dirname,
      '../../../../ai-worker/capzee_worker/scripts/transcribe_cli.py'
    );
    return fs.existsSync(workerScript);
  }

  async transcribe(request: TranscriptionRequest): Promise<Transcript> {
    const workerScript = path.resolve(
      __dirname,
      '../../../../ai-worker/capzee_worker/scripts/transcribe_cli.py'
    );

    if (!fs.existsSync(workerScript)) {
      throw new TranscriptionError(
        'Python worker script transcribe_cli.py not found',
        'PROVIDER_UNAVAILABLE',
        this.name,
        false
      );
    }

    if (!fs.existsSync(request.filePath)) {
      throw new TranscriptionError(
        `Media file not found: ${request.filePath}`,
        'INVALID_AUDIO_FORMAT',
        this.name,
        false
      );
    }

    const pythonBin = process.env.PYTHON_PATH ?? 'python';
    const model = request.model ?? config.CAPZEE_WHISPER_MODEL;
    const device = request.device ?? config.CAPZEE_WHISPER_DEVICE;
    const task = request.task ?? (request.captionOutput === 'translate' ? 'translate' : 'transcribe');
    const language = request.language ?? 'auto';

    const args: string[] = [
      workerScript,
      '--video', request.filePath,
      '--language', language,
      '--task', task,
      '--model', model,
      '--device', device,
    ];

    if (request.jobId) {
      args.push('--job-id', request.jobId);
    }

    request.onProgress?.('starting', 5);

    return new Promise<Transcript>((resolve, reject) => {
      const child = spawn(pythonBin, args);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        try {
          const lines = text.split('\n').filter(Boolean);
          for (const line of lines) {
            if (line.startsWith('{') && line.endsWith('}')) {
              const msg = JSON.parse(line);
              if (msg.progress !== undefined) {
                request.onProgress?.(msg.stage ?? 'processing', msg.progress);
              }
            }
          }
        } catch {
          // Non-JSON stderr logging is standard for Whisper output
        }
      });

      child.on('close', (code: number | null) => {
        if (code !== 0) {
          const isFfmpegError = stderr.includes('ffmpeg') || stderr.includes('FFMPEG');
          const errCode = isFfmpegError ? 'INVALID_AUDIO_FORMAT' : 'INTERNAL_ERROR';
          return reject(
            new TranscriptionError(
              `Python faster-whisper worker exited with code ${code}: ${stderr.slice(-300)}`,
              errCode,
              this.name,
              false
            )
          );
        }

        try {
          const parsed = JSON.parse(stdout.trim()) as Transcript;
          request.onProgress?.('done', 100);
          resolve(parsed);
        } catch (parseErr) {
          reject(
            new TranscriptionError(
              `Failed to parse transcript output from Python worker: ${(parseErr as Error).message}`,
              'INTERNAL_ERROR',
              this.name,
              false
            )
          );
        }
      });

      child.on('error', (spawnErr) => {
        reject(
          new TranscriptionError(
            `Failed to spawn Python process (${pythonBin}): ${spawnErr.message}`,
            'PROVIDER_UNAVAILABLE',
            this.name,
            false
          )
        );
      });
    });
  }
}
