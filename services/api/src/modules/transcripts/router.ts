import { Router } from 'express';
import {
  handleTranscribe,
  handleGetTranscript,
  handleUpdateTranscript,
} from './transcript.controller.js';

export const transcriptsRouter = Router({ mergeParams: true });

transcriptsRouter.post('/transcribe', handleTranscribe);
transcriptsRouter.get('/transcript', handleGetTranscript);
transcriptsRouter.patch('/transcript', handleUpdateTranscript);
