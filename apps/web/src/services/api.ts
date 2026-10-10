/**
 * API client for the Capzee backend.
 * Uses the VITE_API_BASE_URL environment variable.
 */

const BASE_URL = ((import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL) ?? '/api/v1';

class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const json = await res.json().catch(() => ({ success: false, error: { code: 'PARSE_ERROR', message: 'Invalid server response' } }));

  if (!res.ok || json.success === false) {
    const err = json.error ?? { code: 'UNKNOWN_ERROR', message: 'Request failed' };
    throw new ApiError(err.code ?? 'UNKNOWN_ERROR', err.message ?? 'Request failed', res.status);
  }

  return json.data as T;
}

// ─── Health ───────────────────────────────────────────────────────────────────
export async function getHealth() {
  return request<{ status: string; version: string; mode: string }>('/health'.replace('/api/v1', ''));
}

// ─── Projects ────────────────────────────────────────────────────────────────
export async function createProject(data: { title: string; localVideoPath?: string }) {
  return request<{ id: string; title: string; status: string; createdAt: string; updatedAt: string }>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listProjects() {
  return request<Array<{ id: string; title: string; status: string; durationSeconds: number | null; createdAt: string; updatedAt: string }>>('/projects');
}

export async function getProject(id: string) {
  return request<{ id: string; title: string; status: string; durationSeconds: number | null; originalAssetPath: string | null; createdAt: string; updatedAt: string }>(`/projects/${id}`);
}

export async function updateProject(id: string, data: { title?: string }) {
  return request<{ id: string; title: string }>(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: string) {
  return request<{ deleted: boolean }>(`/projects/${id}`, { method: 'DELETE' });
}

export async function uploadMedia(projectId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const url = `${BASE_URL}/projects/${projectId}/media`;
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  const json = await res.json().catch(() => ({ success: false, error: { code: 'PARSE_ERROR', message: 'Invalid server response' } }));
  if (!res.ok || json.success === false) {
    const err = json.error ?? { code: 'UNKNOWN_ERROR', message: 'Upload failed' };
    throw new ApiError(err.code ?? 'UNKNOWN_ERROR', err.message ?? 'Upload failed', res.status);
  }
  return json.data;
}

export function getExportUrl(projectId: string, format: 'mp4' | 'srt' | 'vtt' | 'txt' | 'json') {
  return `${BASE_URL}/projects/${projectId}/export?format=${format}`;
}

// ─── Transcription ────────────────────────────────────────────────────────────
export async function startTranscription(
  projectId: string,
  opts: { language?: string; model?: string; device?: string } = {},
) {
  return request<{ jobId: string }>(`/projects/${projectId}/transcribe`, {
    method: 'POST',
    body: JSON.stringify(opts),
  });
}

export async function getTranscript(projectId: string) {
  return request<import('@capzee/contracts').Transcript>(`/projects/${projectId}/transcript`);
}

export async function saveTranscript(projectId: string, transcript: import('@capzee/contracts').Transcript) {
  return request<import('@capzee/contracts').Transcript>(`/projects/${projectId}/transcript`, {
    method: 'PATCH',
    body: JSON.stringify({ transcript }),
  });
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────
export async function getJob(jobId: string) {
  return request<{ id: string; status: string; progress: number; stage: string | null; errorCode: string | null; errorMessage: string | null }>(`/jobs/${jobId}`);
}

export async function cancelJob(jobId: string) {
  return request<{ status: string }>(`/jobs/${jobId}/cancel`, { method: 'POST' });
}

// ─── Social Captions ─────────────────────────────────────────────────────────
export async function generateSocialCaptions(
  projectId: string,
  params: {
    platform: string;
    language?: string;
    tone?: string;
    variants?: number;
    includeHashtags?: boolean;
    includeCallToAction?: boolean;
    userContext?: string;
  },
) {
  return request<import('@capzee/contracts').SocialCaptionOutput[]>(`/projects/${projectId}/social-captions`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ─── Rendering ───────────────────────────────────────────────────────────────
export async function renderVideo(
  projectId: string,
  opts: { resolution?: string; style?: import('@capzee/contracts').CaptionStyle } = {},
) {
  return request<{ job: { id: string; status: string; progress: number } }>(`/projects/${projectId}/render`, {
    method: 'POST',
    body: JSON.stringify(opts),
  });
}

export async function pollJob(
  jobId: string,
  onProgress?: (job: { id: string; status: string; progress: number; stage: string | null; errorCode: string | null; errorMessage: string | null }) => void,
  intervalMs = 2000,
  maxAttempts = 60,
) {
  let attempts = 0;
  while (attempts < maxAttempts) {
    const job = await getJob(jobId);
    if (onProgress) onProgress(job);
    if (job.status === 'completed') return job;
    if (job.status === 'failed') throw new Error(job.errorMessage || 'Job failed');
    if (job.status === 'cancelled') throw new Error('Job was cancelled');
    await new Promise((r) => setTimeout(r, intervalMs));
    attempts++;
  }
  throw new Error('Job timed out');
}

export { ApiError };
