import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { getProject, updateProject } from '../../../db/local-store.js';
import { createError } from '../../../middleware/error.js';
import { validateMediaFile, probeMediaMetadata } from '../media-validator.js';
import { getStorageProvider } from '../../../providers/storage/index.js';

export async function handleUploadMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.projectId as string;
    const project = getProject(projectId);
    if (!project) return next(createError('Project not found', 404, 'PROJECT_NOT_FOUND'));

    if (!req.file) {
      return next(createError('No file provided in form-data "file" field', 400, 'NO_FILE_PROVIDED'));
    }

    const tempPath = path.resolve(req.file.path);

    // Validate media file container and magic bytes
    const validation = await validateMediaFile(tempPath);
    if (!validation.valid) {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {
        // ignore cleanup error
      }
      return next(createError(validation.error || 'Invalid media file format', 400, 'INVALID_MEDIA_TYPE'));
    }

    // Probe duration and dimensions if available
    const metadata = await probeMediaMetadata(tempPath);

    // Save via storage provider
    const storage = getStorageProvider();
    const stored = await storage.saveFile({
      sourcePath: tempPath,
      originalName: req.file.originalname,
      mimeType: validation.mimeType,
      destinationSubdir: projectId,
    });

    const updated = updateProject(projectId, {
      originalAssetPath: stored.storedPath,
      status: 'ready',
      ...(metadata.duration ? { duration: metadata.duration } : {}),
    });

    res.status(200).json({
      success: true,
      data: {
        ...updated,
        mediaMetadata: metadata,
        publicUrl: stored.publicUrl,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleUploadIntent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.projectId as string;
    const project = getProject(projectId);
    if (!project) return next(createError('Project not found', 404, 'PROJECT_NOT_FOUND'));

    const { filename = 'video.mp4', mimeType = 'video/mp4' } = req.body;
    const storage = getStorageProvider();

    if (storage.createSignedUploadUrl) {
      const signed = await storage.createSignedUploadUrl({ filename, mimeType });
      res.json({ success: true, data: signed });
      return;
    }

    res.json({
      success: true,
      data: {
        uploadUrl: `/api/v1/projects/${projectId}/media`,
        fileKey: `${projectId}-${filename}`,
        expiresInSeconds: 3600,
      },
    });
  } catch (err) {
    next(err);
  }
}

export function handleServeMedia(req: Request, res: Response, next: NextFunction): void {
  const projectId = req.params.projectId as string;
  const project = getProject(projectId);
  if (!project) return next(createError('Project not found', 404, 'PROJECT_NOT_FOUND'));

  const videoPath = project.originalAssetPath;
  if (!videoPath || !fs.existsSync(videoPath)) {
    return next(createError('Media file not found', 404, 'MEDIA_NOT_FOUND'));
  }

  res.sendFile(path.resolve(videoPath));
}
