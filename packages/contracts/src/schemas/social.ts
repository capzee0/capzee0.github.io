import { z } from 'zod';

export const SocialPlatformSchema = z.enum([
  'instagram_reels',
  'youtube_shorts',
  'generic',
]);

export const SocialToneSchema = z.enum([
  'professional',
  'educational',
  'funny',
  'conversational',
  'cinematic',
  'inspirational',
  'promotional',
]);

export const SocialLanguageSchema = z.enum([
  'en',
  'ta',
  'tanglish',
  'hi',
]);

export const SocialCaptionOutputSchema = z.object({
  hook: z.string(),
  mainCaption: z.string(),
  hashtags: z.array(z.string()),
  callToAction: z.string(),
  shortTitle: z.string().optional(),
  platform: SocialPlatformSchema,
  language: SocialLanguageSchema,
  tone: SocialToneSchema,
});

export type SocialPlatform = z.infer<typeof SocialPlatformSchema>;
export type SocialTone = z.infer<typeof SocialToneSchema>;
export type SocialLanguage = z.infer<typeof SocialLanguageSchema>;
export type SocialCaptionOutput = z.infer<typeof SocialCaptionOutputSchema>;
