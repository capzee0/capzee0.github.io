import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  createProject,
  getProject,
  listProjects,
  updateProject,
  deleteProject,
} from '../../../db/local-store.js';
import { createError } from '../../../middleware/error.js';

export const createProjectBody = z.object({
  title: z.string().min(1).max(255),
  localVideoPath: z.string().optional(),
});

export const patchProjectBody = z.object({
  title: z.string().min(1).max(255).optional(),
  status: z.enum(['created', 'uploading', 'processing', 'transcribed', 'ready', 'error']).optional(),
});

export function handleCreateProject(req: Request, res: Response, next: NextFunction): void {
  try {
    const body = createProjectBody.parse(req.body);
    const project = createProject({ title: body.title, localVideoPath: body.localVideoPath });
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
}

export function handleListProjects(_req: Request, res: Response): void {
  const projects = listProjects();
  res.json({ success: true, data: projects });
}

export function handleGetProject(req: Request, res: Response, next: NextFunction): void {
  const projectId = req.params.projectId as string;
  const project = getProject(projectId);
  if (!project) return next(createError('Project not found', 404, 'PROJECT_NOT_FOUND'));
  res.json({ success: true, data: project });
}

export function handleUpdateProject(req: Request, res: Response, next: NextFunction): void {
  try {
    const projectId = req.params.projectId as string;
    const body = patchProjectBody.parse(req.body);
    const project = updateProject(projectId, body);
    if (!project) return next(createError('Project not found', 404, 'PROJECT_NOT_FOUND'));
    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
}

export function handleDeleteProject(req: Request, res: Response, next: NextFunction): void {
  const projectId = req.params.projectId as string;
  const deleted = deleteProject(projectId);
  if (!deleted) return next(createError('Project not found', 404, 'PROJECT_NOT_FOUND'));
  res.json({ success: true, data: { deleted: true } });
}
