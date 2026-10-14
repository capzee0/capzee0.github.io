import { describe, it, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('Health endpoints', () => {
  it('GET /health returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.ok(res.body.version);
    assert.ok(res.body.mode);
  });

  it('GET /health/ready returns 200', async () => {
    const res = await request(app).get('/health/ready');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ready');
  });
});

describe('Projects API', () => {
  let projectId: string;

  it('POST /api/v1/projects creates a project', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .send({ title: 'Test Project' });
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.title, 'Test Project');
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.status, 'created');
    projectId = res.body.data.id;
  });

  it('POST /api/v1/projects rejects empty title', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .send({ title: '' });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('GET /api/v1/projects returns list', async () => {
    const res = await request(app).get('/api/v1/projects');
    assert.equal(res.status, 200);
    assert.equal(Array.isArray(res.body.data), true);
  });

  it('GET /api/v1/projects/:id returns project', async () => {
    const res = await request(app).get(`/api/v1/projects/${projectId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, projectId);
  });

  it('GET /api/v1/projects/:id returns 404 for unknown', async () => {
    const res = await request(app).get('/api/v1/projects/00000000-0000-0000-0000-000000000000');
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'PROJECT_NOT_FOUND');
  });

  it('PATCH /api/v1/projects/:id updates title', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${projectId}`)
      .send({ title: 'Updated Title' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.title, 'Updated Title');
  });

  it('DELETE /api/v1/projects/:id deletes project', async () => {
    const res = await request(app).delete(`/api/v1/projects/${projectId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.deleted, true);
  });

  it('GET deleted project returns 404', async () => {
    const res = await request(app).get(`/api/v1/projects/${projectId}`);
    assert.equal(res.status, 404);
  });
});

describe('Transcript API', () => {
  let projectId: string;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .send({ title: 'Transcript Test Project' });
    projectId = res.body.data.id;
  });

  it('GET transcript returns 404 when none exists', async () => {
    const res = await request(app).get(`/api/v1/projects/${projectId}/transcript`);
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'TRANSCRIPT_NOT_FOUND');
  });

  it('PATCH transcript saves and returns it', async () => {
    const transcript = {
      schemaVersion: 1,
      language: 'en',
      segments: [
        {
          id: 'seg-1',
          start: 0.5,
          end: 2.0,
          text: 'Hello world',
          words: [
            { id: 'w-1', text: 'Hello', start: 0.5, end: 1.0, confidence: null },
            { id: 'w-2', text: 'world', start: 1.1, end: 2.0, confidence: null },
          ],
        },
      ],
    };

    const res = await request(app)
      .patch(`/api/v1/projects/${projectId}/transcript`)
      .send({ transcript });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.segments.length, 1);
    assert.equal(res.body.data.segments[0].text, 'Hello world');
  });

  it('PATCH transcript rejects invalid timestamps', async () => {
    const transcript = {
      schemaVersion: 1,
      language: 'en',
      segments: [
        {
          id: 'seg-1',
          start: 5.0,
          end: 2.0, // end < start — invalid
          text: 'Bad timing',
        },
      ],
    };

    const res = await request(app)
      .patch(`/api/v1/projects/${projectId}/transcript`)
      .send({ transcript });

    assert.equal(res.status, 400);
  });
});

describe('Export and Render Endpoints', () => {
  let projectId: string;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .send({ title: 'Export Test Video' });
    projectId = res.body.data.id;

    const transcript = {
      schemaVersion: 1,
      language: 'en',
      segments: [
        {
          id: 'seg-1',
          start: 0.0,
          end: 2.5,
          text: 'Welcome to Capzee testing',
          words: [
            { id: 'w-1', text: 'Welcome', start: 0.0, end: 0.8, confidence: 0.95 },
            { id: 'w-2', text: 'to', start: 0.8, end: 1.0, confidence: 0.95 },
            { id: 'w-3', text: 'Capzee', start: 1.0, end: 1.8, confidence: 0.95 },
            { id: 'w-4', text: 'testing', start: 1.8, end: 2.5, confidence: 0.95 },
          ],
        },
      ],
    };

    await request(app)
      .patch(`/api/v1/projects/${projectId}/transcript`)
      .send({ transcript });
  });

  it('GET /api/v1/projects/:id/export?format=srt returns valid SRT attachment', async () => {
    const res = await request(app).get(`/api/v1/projects/${projectId}/export?format=srt`);
    assert.equal(res.status, 200);
    assert.ok(res.text.includes('00:00:00,000 --> 00:00:02,500'));
    assert.ok(res.text.includes('Welcome to Capzee testing'));
  });

  it('GET /api/v1/projects/:id/export?format=vtt returns valid WebVTT', async () => {
    const res = await request(app).get(`/api/v1/projects/${projectId}/export?format=vtt`);
    assert.equal(res.status, 200);
    assert.ok(res.text.includes('WEBVTT'));
    assert.ok(res.text.includes('00:00:00.000 --> 00:00:02.500'));
  });

  it('GET /api/v1/projects/:id/export?format=txt returns plain text', async () => {
    const res = await request(app).get(`/api/v1/projects/${projectId}/export?format=txt`);
    assert.equal(res.status, 200);
    assert.equal(res.text.trim(), 'Welcome to Capzee testing');
  });

  it('GET /api/v1/projects/:id/export?format=json returns transcript JSON', async () => {
    const res = await request(app).get(`/api/v1/projects/${projectId}/export?format=json`);
    assert.equal(res.status, 200);
    assert.equal(res.body.language, 'en');
    assert.equal(res.body.segments.length, 1);
  });

  it('GET /api/v1/projects/:id/export?format=ass returns styled ASS subtitle file', async () => {
    const res = await request(app).get(`/api/v1/projects/${projectId}/export?format=ass`);
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type']?.includes('text/x-ssa'));
    assert.ok(res.text.includes('[Script Info]'));
    assert.ok(res.text.includes('[V4+ Styles]'));
    assert.ok(res.text.includes('Welcome to Capzee testing'));
  });

  it('POST /api/v1/projects/:id/render returns 422 NO_MEDIA when no file uploaded', async () => {
    const res = await request(app).post(`/api/v1/projects/${projectId}/render`).send({});
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'NO_MEDIA');
  });

  it('POST /api/v1/projects/:id/media rejects invalid/fake file with INVALID_MEDIA_TYPE', async () => {
    const plainTextFile = Buffer.from('this is plain text not a valid video or audio format');
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/media`)
      .attach('file', plainTextFile, 'malicious.mp4');
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INVALID_MEDIA_TYPE');
  });

  it('POST /api/v1/projects/:id/media accepts valid MP4 container with magic bytes', async () => {
    // Construct valid ISO BMFF MP4 header: 4-byte box size + 'ftyp' + 'isom' brand
    const validMp4 = Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x20]),
      Buffer.from('ftypisom', 'ascii'),
      Buffer.from([0x00, 0x00, 0x02, 0x00]),
      Buffer.from('isommp41', 'ascii'),
      Buffer.alloc(64, 0),
    ]);
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/media`)
      .attach('file', validMp4, 'test-sample.mp4');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.originalAssetPath);
  });

  it('POST /api/v1/projects/:id/upload-intent returns signed upload metadata', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/upload-intent`)
      .send({ filename: 'reel.mp4', mimeType: 'video/mp4' });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.uploadUrl);
    assert.ok(res.body.data.fileKey);
  });
});

describe('Jobs and SSE Progress Pipeline', () => {
  it('GET /api/v1/jobs/:id/events streams initial SSE snapshot and closes on completed state', async () => {
    const { createJob, updateJob } = await import('../src/db/local-store.js');
    const job = createJob({ projectId: '00000000-0000-0000-0000-000000000001', jobType: 'transcribe' });

    // Mark job completed after a brief delay so SSE sends both snapshot & completion
    setTimeout(() => {
      updateJob(job.id, { status: 'completed', stage: 'done', progress: 100 });
    }, 100);

    const sseRes = await request(app)
      .get(`/api/v1/jobs/${job.id}/events`)
      .buffer(true);

    assert.equal(sseRes.status, 200);
    assert.ok(sseRes.headers['content-type']?.includes('text/event-stream'));
    assert.ok(sseRes.text.includes('data: {'));
    assert.ok(sseRes.text.includes(job.id));
    assert.ok(sseRes.text.includes('"status":"completed"'));
  });

  it('GET /api/v1/jobs/:id/events returns 404 for unknown job ID', async () => {
    const res = await request(app).get('/api/v1/jobs/00000000-0000-0000-0000-000000000000/events');
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'JOB_NOT_FOUND');
  });

  it('TranscriptionProvider fallback chain executes mock provider cleanly', async () => {
    const { MockWhisperProvider } = await import('../src/providers/transcription/mock.js');
    const provider = new MockWhisperProvider();
    assert.equal(provider.name, 'mock');
    assert.equal(provider.isAvailable(), true);

    const result = await provider.transcribe({
      filePath: 'dummy.mp4',
      language: 'en',
    });
    assert.ok(result.segments.length > 0);
    assert.equal(result.schemaVersion, 1);
  });
});


describe('404 handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });
});

describe('Silence detection service & endpoint', () => {
  let projectId: string;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .send({ title: 'Silence Project' });
    projectId = res.body.data.id;

    const transcript = {
      schemaVersion: 1,
      language: 'en',
      segments: [
        {
          id: 'seg-1',
          start: 1.5, // 1.5s initial pause
          end: 3.0,
          text: 'Hello world',
          words: [
            { id: 'w-1', text: 'Hello', start: 1.5, end: 2.0 },
            { id: 'w-2', text: 'world', start: 3.5, end: 4.0 }, // 1.5s gap
          ],
        },
      ],
    };

    await request(app)
      .patch(`/api/v1/projects/${projectId}/transcript`)
      .send({ transcript });
  });

  it('POST /api/v1/projects/:id/trim-silence detects initial dead air and gaps between words', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/trim-silence`)
      .send({ sensitivity: 'balanced' });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.removedClips.length >= 2);
    assert.ok(res.body.data.totalRemovedSeconds > 0);
  });
});

