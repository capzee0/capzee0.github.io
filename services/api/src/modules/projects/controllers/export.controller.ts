import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { getProject, getTranscript } from '../../../db/local-store.js';
import { createError } from '../../../middleware/error.js';
import {
  generateSRT,
  generateVTT,
  generatePlainText,
  generateASS,
  Transcript,
} from '@capzee/contracts';

export function handleExportProject(req: Request, res: Response, next: NextFunction): void {
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
      res.download(project.renderedAssetPath, `${project.title || 'captioned-video'}.mp4`);
      return;
    }

    if (!rawTranscript) {
      return next(createError('No transcript available for export', 404, 'TRANSCRIPT_NOT_FOUND'));
    }

    const transcript = rawTranscript as Transcript;

    if (format === 'srt') {
      const srt = generateSRT(transcript);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${project.title || 'captions'}.srt"`);
      res.send(srt);
      return;
    }

    if (format === 'vtt') {
      const vtt = generateVTT(transcript);
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${project.title || 'captions'}.vtt"`);
      res.send(vtt);
      return;
    }

    if (format === 'txt') {
      const txt = generatePlainText(transcript);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${project.title || 'transcript'}.txt"`);
      res.send(txt);
      return;
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${project.title || 'transcript'}.json"`);
      res.json(transcript);
      return;
    }

    if (format === 'ass') {
      let style = {};
      if (req.query.style) {
        try {
          style = JSON.parse(String(req.query.style));
        } catch {
          // ignore invalid style query parameter
        }
      }
      const ass = generateASS(transcript, style);
      res.setHeader('Content-Type', 'text/x-ssa; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${project.title || 'captions'}.ass"`);
      res.send(ass);
      return;
    }

    return next(createError(`Unsupported export format: ${format}`, 400, 'INVALID_FORMAT'));
  } catch (err) {
    next(err);
  }
}
