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
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      const allowed = [
        config.WEB_URL,
        'https://capzee0.github.io',
        'http://localhost:5173',
        'http://localhost:5174',
      ].filter(Boolean);
      if (allowed.includes(origin) || origin.endsWith('.github.io')) {
        return callback(null, true);
      }
      return callback(null, true); // Allow all during development/production transition
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'apikey'],
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
  apiRouter.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      mode: config.CAPZEE_PROCESSING_MODE,
    });
  });
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
