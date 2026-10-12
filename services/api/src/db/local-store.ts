/**
 * Local file-backed store for projects in local processing mode.
 * In cloud mode, this would be replaced by Supabase PostgreSQL.
 */
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Project } from '@capzee/contracts';
import { jobBus } from '../events/job-bus.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface StoredProject extends Project {
  _localVideoPath?: string;
  renderedAssetPath?: string | null;
}

const projectStore = new Map<string, StoredProject>();
const transcriptStore = new Map<string, unknown>();
const jobStore = new Map<string, unknown>();

const STORE_DIR = path.resolve(__dirname, '../../uploads');
const STORE_FILE = path.join(STORE_DIR, 'local-store.json');

function saveToDisk() {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    const data = {
      projects: Array.from(projectStore.entries()),
      transcripts: Array.from(transcriptStore.entries()),
      jobs: Array.from(jobStore.entries()),
    };
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[store] Failed to persist store to disk:', err);
  }
}

function loadFromDisk() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.projects)) {
        for (const [k, v] of data.projects) projectStore.set(k, v);
      }
      if (Array.isArray(data.transcripts)) {
        for (const [k, v] of data.transcripts) transcriptStore.set(k, v);
      }
      if (Array.isArray(data.jobs)) {
        for (const [k, v] of data.jobs) jobStore.set(k, v);
      }
    }
  } catch (err) {
    console.warn('[store] Failed to load store from disk:', err);
  }
}

loadFromDisk();

// ─── Projects ─────────────────────────────────────────────────────────────────

export function createProject(data: {
  title: string;
  userId?: string;
  localVideoPath?: string;
}): StoredProject {
  const now = new Date().toISOString();
  const project: StoredProject = {
    id: randomUUID(),
    userId: data.userId,
    title: data.title,
    status: 'created',
    durationSeconds: null,
    originalAssetPath: data.localVideoPath ?? null,
    renderedAssetPath: null,
    createdAt: now,
    updatedAt: now,
    _localVideoPath: data.localVideoPath,
  };
  projectStore.set(project.id, project);
  saveToDisk();
  return project;
}

export function getProject(id: string): StoredProject | undefined {
  return projectStore.get(id);
}

export function listProjects(userId?: string): StoredProject[] {
  const projects = Array.from(projectStore.values());
  if (userId) {
    return projects.filter((p) => p.userId === userId);
  }
  return projects;
}

export function updateProject(
  id: string,
  updates: Partial<Omit<StoredProject, 'id' | 'createdAt'>>
): StoredProject | null {
  const existing = projectStore.get(id);
  if (!existing) return null;
  const updated: StoredProject = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  projectStore.set(id, updated);
  saveToDisk();
  return updated;
}

export function deleteProject(id: string): boolean {
  const result = projectStore.delete(id);
  if (result) saveToDisk();
  return result;
}

// ─── Transcripts ──────────────────────────────────────────────────────────────

export function setTranscript(projectId: string, transcript: unknown): void {
  transcriptStore.set(projectId, transcript);
  saveToDisk();
}

export function getTranscript(projectId: string): unknown | undefined {
  return transcriptStore.get(projectId);
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export interface StoredJob {
  id: string;
  projectId: string;
  userId?: string;
  jobType: string;
  status: string;
  stage: string | null;
  progress: number;
  attempts: number;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export function createJob(data: {
  projectId: string;
  jobType: string;
  userId?: string;
}): StoredJob {
  const job: StoredJob = {
    id: randomUUID(),
    projectId: data.projectId,
    userId: data.userId,
    jobType: data.jobType,
    status: 'queued',
    stage: null,
    progress: 0,
    attempts: 0,
    errorCode: null,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  jobStore.set(job.id, job);
  saveToDisk();
  jobBus.notifyJobUpdate(job);
  return job;
}

export function getJob(id: string): StoredJob | undefined {
  return jobStore.get(id) as StoredJob | undefined;
}

export function updateJob(
  id: string,
  updates: Partial<StoredJob>
): StoredJob | null {
  const existing = jobStore.get(id) as StoredJob | undefined;
  if (!existing) return null;
  const updated: StoredJob = { ...existing, ...updates, id: existing.id };
  jobStore.set(id, updated);
  saveToDisk();
  jobBus.notifyJobUpdate(updated);
  return updated;
}
