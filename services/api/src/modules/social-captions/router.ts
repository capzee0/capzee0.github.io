import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getProject, getTranscript } from '../../db/local-store.js';
import { createError } from '../../middleware/error.js';
import { SocialPlatformSchema, SocialToneSchema, SocialLanguageSchema } from '@capzee/contracts';
import { generateSocialCaptions } from '../../providers/social-captions/index.js';

export const socialCaptionsRouter = Router({ mergeParams: true });

const socialCaptionRequestBody = z.object({
  platform: SocialPlatformSchema,
  language: SocialLanguageSchema.default('en'),
  tone: SocialToneSchema.default('conversational'),
  variants: z.number().int().min(1).max(3).default(1),
  includeHashtags: z.boolean().default(true),
  includeCallToAction: z.boolean().default(true),
  userContext: z.string().max(1000).optional(),
});

// POST /projects/:projectId/social-captions
socialCaptionsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const project = getProject(projectId);
    if (!project) return next(createError('Project not found', 404, 'PROJECT_NOT_FOUND'));

    const transcript = getTranscript(projectId);
    if (!transcript) return next(createError('No transcript available. Run transcription first.', 422, 'NO_TRANSCRIPT'));

    const body = socialCaptionRequestBody.parse(req.body);

    const transcriptText = extractTranscriptText(transcript as { segments?: { text: string }[] });

    const results = await generateSocialCaptions({
      transcriptText,
      platform: body.platform,
      language: body.language,
      tone: body.tone,
      variants: body.variants,
      includeHashtags: body.includeHashtags,
      includeCallToAction: body.includeCallToAction,
      userContext: body.userContext,
    });

    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
});

function extractTranscriptText(transcript: { segments?: { text: string }[] }): string {
  if (!transcript || !Array.isArray(transcript.segments)) return '';
  return transcript.segments.map((s) => s.text).join(' ').trim();
}
