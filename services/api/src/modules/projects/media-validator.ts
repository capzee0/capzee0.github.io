import fs from 'fs';
import { spawn } from 'child_process';

export interface MediaValidationResult {
  valid: boolean;
  format?: 'mp4' | 'webm' | 'mov' | 'mkv' | 'wav' | 'mp3' | 'ogg' | 'flac' | 'm4a';
  mimeType?: string;
  error?: string;
}

export interface MediaProbeMetadata {
  duration?: number;
  width?: number;
  height?: number;
}

/**
 * Validates file buffer against known audio and video magic bytes.
 */
export function validateMediaBuffer(buffer: Buffer): MediaValidationResult {
  if (!buffer || buffer.length < 8) {
    return { valid: false, error: 'File is too small to be a valid audio or video container' };
  }

  // 1. WebM / Matroska (EBML: 1A 45 DF A3)
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    // Check if webm or mkv
    const headerStr = buffer.toString('utf-8', 0, Math.min(buffer.length, 64));
    if (headerStr.includes('webm')) {
      return { valid: true, format: 'webm', mimeType: 'video/webm' };
    }
    return { valid: true, format: 'mkv', mimeType: 'video/x-matroska' };
  }

  // 2. MP4 / MOV / M4A (ftyp box at offset 4 or moov/mdat atom)
  if (buffer.length >= 12) {
    const boxType = buffer.toString('ascii', 4, 8);
    if (boxType === 'ftyp') {
      const majorBrand = buffer.toString('ascii', 8, 12).toLowerCase();
      if (majorBrand.startsWith('m4a')) {
        return { valid: true, format: 'm4a', mimeType: 'audio/mp4' };
      }
      if (majorBrand.startsWith('qt')) {
        return { valid: true, format: 'mov', mimeType: 'video/quicktime' };
      }
      return { valid: true, format: 'mp4', mimeType: 'video/mp4' };
    }

    if (boxType === 'moov' || boxType === 'mdat' || boxType === 'wide') {
      return { valid: true, format: 'mov', mimeType: 'video/quicktime' };
    }
  }

  // 3. RIFF containers (WAV: RIFF....WAVE)
  if (
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46    // F
  ) {
    if (buffer.length >= 12) {
      const format = buffer.toString('ascii', 8, 12);
      if (format === 'WAVE') {
        return { valid: true, format: 'wav', mimeType: 'audio/wav' };
      }
    }
    return { valid: true, format: 'wav', mimeType: 'audio/wav' };
  }

  // 4. MP3 (ID3v2 header: ID3 or MPEG sync 0xFF 0xEx)
  if (
    buffer[0] === 0x49 && // I
    buffer[1] === 0x44 && // D
    buffer[2] === 0x33    // 3
  ) {
    return { valid: true, format: 'mp3', mimeType: 'audio/mpeg' };
  }

  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    return { valid: true, format: 'mp3', mimeType: 'audio/mpeg' };
  }

  // 5. OGG (OggS)
  if (
    buffer[0] === 0x4f &&
    buffer[1] === 0x67 &&
    buffer[2] === 0x67 &&
    buffer[3] === 0x53
  ) {
    return { valid: true, format: 'ogg', mimeType: 'audio/ogg' };
  }

  // 6. FLAC (fLaC)
  if (
    buffer[0] === 0x66 &&
    buffer[1] === 0x4c &&
    buffer[2] === 0x61 &&
    buffer[3] === 0x43
  ) {
    return { valid: true, format: 'flac', mimeType: 'audio/flac' };
  }

  return {
    valid: false,
    error: 'Unrecognized file container. Supported formats are MP4, WebM, MOV, MKV, WAV, MP3, M4A, OGG, and FLAC.',
  };
}

/**
 * Validates a media file on disk using magic bytes inspection.
 */
export async function validateMediaFile(filePath: string): Promise<MediaValidationResult> {
  if (!fs.existsSync(filePath)) {
    return { valid: false, error: 'File does not exist' };
  }

  const stat = await fs.promises.stat(filePath);
  if (stat.size === 0) {
    return { valid: false, error: 'Uploaded file is empty (0 bytes)' };
  }

  const fd = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(Math.min(stat.size, 128));
    await fd.read(buffer, 0, buffer.length, 0);
    return validateMediaBuffer(buffer);
  } finally {
    await fd.close();
  }
}

/**
 * Probes duration and dimensions using ffprobe if installed, with safe graceful fallback.
 */
export async function probeMediaMetadata(filePath: string): Promise<MediaProbeMetadata> {
  if (process.env.NODE_ENV === 'test') {
    return {};
  }

  return new Promise((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      try {
        child?.kill();
      } catch {
        // ignore
      }
      safeResolve({});
    }, 1500);

    const safeResolve = (data: MediaProbeMetadata) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(data);
      }
    };

    let child: ReturnType<typeof spawn> | null = null;
    try {
      const ffprobeBin = process.env.FFPROBE_PATH || 'ffprobe';
      const args = [
        '-v', 'error',
        '-show_entries', 'format=duration:stream=width,height',
        '-of', 'json',
        filePath,
      ];

      child = spawn(ffprobeBin, args, { stdio: ['ignore', 'pipe', 'ignore'] });
      let output = '';

      child.stdout?.on('data', (d: Buffer) => {
        output += d.toString();
      });

      child.on('close', (code: number | null) => {
        if (code === 0 && output) {
          try {
            const parsed = JSON.parse(output);
            const durStr = parsed.format?.duration;
            const duration = durStr ? parseFloat(durStr) : undefined;
            const stream = parsed.streams?.find((s: { width?: number; height?: number }) => s.width && s.height);
            safeResolve({
              duration: duration && !isNaN(duration) ? duration : undefined,
              width: stream?.width,
              height: stream?.height,
            });
            return;
          } catch {
            // ignore parsing error
          }
        }
        safeResolve({});
      });

      child.on('error', () => {
        safeResolve({});
      });
    } catch {
      safeResolve({});
    }
  });
}
