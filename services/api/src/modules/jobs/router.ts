import { Router, Request, Response, NextFunction } from 'express';
import { getJob, updateJob } from '../../db/local-store.js';
import { createError } from '../../middleware/error.js';

export const jobsRouter = Router();

// GET /jobs/:jobId
jobsRouter.get('/:jobId', (req: Request, res: Response, next: NextFunction) => {
  const jobId = req.params.jobId as string;
  const job = getJob(jobId);
  if (!job) return next(createError('Job not found', 404, 'JOB_NOT_FOUND'));
  res.json({ success: true, data: job });
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
