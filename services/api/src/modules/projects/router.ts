import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import {
  handleCreateProject,
  handleListProjects,
  handleGetProject,
  handleUpdateProject,
  handleDeleteProject,
} from './controllers/project.controller.js';
import {
  handleUploadMedia,
  handleUploadIntent,
  handleServeMedia,
} from './controllers/media.controller.js';
import { handleRenderProject } from './controllers/render.controller.js';
import { handleExportProject } from './controllers/export.controller.js';
import { handleTrimSilence } from './controllers/silence.controller.js';

export const projectsRouter = Router();

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
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

// ─── Project CRUD ────────────────────────────────────────────────────────────
projectsRouter.post('/', handleCreateProject);
projectsRouter.get('/', handleListProjects);
projectsRouter.get('/:projectId', handleGetProject);
projectsRouter.patch('/:projectId', handleUpdateProject);
projectsRouter.delete('/:projectId', handleDeleteProject);

// ─── Media Management ────────────────────────────────────────────────────────
projectsRouter.post('/:projectId/media', upload.single('file'), handleUploadMedia);
projectsRouter.post('/:projectId/upload-intent', handleUploadIntent);
projectsRouter.get('/:projectId/media', handleServeMedia);

// ─── Video Rendering & Processing ────────────────────────────────────────────
projectsRouter.post('/:projectId/render', handleRenderProject);

// ─── Multi-Format Subtitle & Video Export ────────────────────────────────────
projectsRouter.get('/:projectId/export', handleExportProject);

// ─── AI Silence Removal ──────────────────────────────────────────────────────
projectsRouter.post('/:projectId/trim-silence', handleTrimSilence);
