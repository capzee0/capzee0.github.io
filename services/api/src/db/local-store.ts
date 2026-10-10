/**
 * Local in-memory store for projects in local processing mode.
 * In cloud mode, this would be replaced by Supabase PostgreSQL.
 */
import { randomUUID } from 'crypto';
import { Project } from '@capzee/contracts';

interface StoredProject extends Project {
  _localVideoPath?: string;
  renderedAssetPath?: string | null;
}

const projectStore = new Map<string, StoredProject>();
const transcriptStore = new Map<string, unknown>();
const jobStore = new Map<string, unknown>();

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
  return updated;
}

export function deleteProject(id: string): boolean {
  return projectStore.delete(id);
}

// ─── Transcripts ──────────────────────────────────────────────────────────────

export function setTranscript(projectId: string, transcript: unknown): void {
  transcriptStore.set(projectId, transcript);
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
  return updated;
}
