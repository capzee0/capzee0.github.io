import { Router, Request, Response, NextFunction } from 'express';
import { getJob, updateJob } from '../../db/local-store.js';
import { createError } from '../../middleware/error.js';
import { jobBus } from '../../events/job-bus.js';

export const jobsRouter = Router();

jobsRouter.get('/:jobId', (req: Request, res: Response, next: NextFunction) => {
  const jobId = req.params.jobId as string;
  const job = getJob(jobId);
  if (!job) return next(createError('Job not found', 404, 'JOB_NOT_FOUND'));
  res.json({ success: true, data: job });
});

// GET /jobs/:jobId/events (Server-Sent Events for real-time progress)
jobsRouter.get('/:jobId/events', (req: Request, res: Response, next: NextFunction) => {
  const jobId = req.params.jobId as string;
  const initialJob = getJob(jobId);
  if (!initialJob) return next(createError('Job not found', 404, 'JOB_NOT_FOUND'));

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Send current state immediately
  res.write(`data: ${JSON.stringify(initialJob)}\n\n`);

  if (['completed', 'failed', 'cancelled'].includes(initialJob.status)) {
    res.end();
    return;
  }

  const unsubscribe = jobBus.subscribeToJob(jobId, (updatedJob) => {
    res.write(`data: ${JSON.stringify(updatedJob)}\n\n`);
    if (['completed', 'failed', 'cancelled'].includes(updatedJob.status)) {
      cleanup();
      res.end();
    }
  });

  const heartbeat = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15000);

  const cleanup = () => {
    clearInterval(heartbeat);
    unsubscribe();
  };

  req.on('close', cleanup);
});

// POST /jobs/:jobId/cancel
jobsRouter.post('/:jobId/cancel', (req: Request, res: Response, next: NextFunction) => {
  const jobId = req.params.jobId as string;
  const job = getJob(jobId);
  if (!job) return next(createError('Job not found', 404, 'JOB_NOT_FOUND'));
  if (job.status === 'completed' || job.status === 'failed') {
    return next(createError('Job cannot be cancelled in its current state', 409, 'JOB_CANNOT_CANCEL'));
  }
  const updated = updateJob(jobId, { status: 'cancelled', completedAt: new Date().toISOString() });
  res.json({ success: true, data: updated });
});
