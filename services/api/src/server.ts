import { createApp } from './app.js';
import { config } from './config/index.js';

const app = createApp();

const server = app.listen(config.API_PORT, config.API_HOST, () => {
  console.info(`[server] Capzee API running at http://${config.API_HOST}:${config.API_PORT}`);
  console.info(`[server] Mode: ${config.CAPZEE_PROCESSING_MODE}`);
  console.info(`[server] Health: http://${config.API_HOST}:${config.API_PORT}/health`);
});

process.on('SIGTERM', () => {
  console.info('[server] SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.info('[server] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.info('[server] SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.info('[server] Server closed');
    process.exit(0);
  });
});

export { app };
