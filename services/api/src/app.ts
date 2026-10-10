import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { errorMiddleware, notFoundMiddleware, requestIdMiddleware } from './middleware/error.js';
import { projectsRouter } from './modules/projects/router.js';
import { transcriptsRouter } from './modules/transcripts/router.js';
import { jobsRouter } from './modules/jobs/router.js';
import { socialCaptionsRouter } from './modules/social-captions/router.js';

export function createApp() {
  const app = express();

  // ─── Security ──────────────────────────────────────────────────────────────
  app.use(helmet());
  app.use(cors({
    origin: config.WEB_URL,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));

  // ─── Rate limiting ─────────────────────────────────────────────────────────
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests, please try again later.' } },
  }));

  // ─── Logging & parsing ─────────────────────────────────────────────────────
  if (config.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(requestIdMiddleware);

  // ─── Health ────────────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      mode: config.CAPZEE_PROCESSING_MODE,
    });
  });

  app.get('/health/ready', (_req, res) => {
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  });

  // ─── API Routes ────────────────────────────────────────────────────────────
  const apiRouter = express.Router();
  apiRouter.use('/projects', projectsRouter);
  apiRouter.use('/projects/:projectId', transcriptsRouter);
  apiRouter.use('/projects/:projectId/social-captions', socialCaptionsRouter);
  apiRouter.use('/jobs', jobsRouter);

  app.use('/api/v1', apiRouter);

  // ─── Fallback ──────────────────────────────────────────────────────────────
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
