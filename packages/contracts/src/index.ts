import { z } from 'zod';

// ─── Transcript Schemas ───────────────────────────────────────────────────────

export const WordSchema = z.object({
  id: z.string(),
  text: z.string(),
  start: z.number().finite().nonnegative(),
  end: z.number().finite().nonnegative(),
  confidence: z.number().min(0).max(1).nullable().optional(),
});

export const SegmentSchema = z.object({
  id: z.string(),
  start: z.number().finite().nonnegative(),
  end: z.number().finite().nonnegative(),
  text: z.string(),
  words: z.array(WordSchema).optional(),
});

export const TranscriptSchema = z.object({
  schemaVersion: z.literal(1),
  language: z.string().min(2).max(10),
  segments: z.array(SegmentSchema),
});

// Validated refinements
export const ValidatedTranscriptSchema = TranscriptSchema.refine(
  (t) =>
    t.segments.every((seg) => seg.end > seg.start),
  { message: 'All segment end times must be greater than start times' }
).refine(
  (t) =>
    t.segments.every((seg) =>
      (seg.words ?? []).every((w) => w.end > w.start)
    ),
  { message: 'All word end times must be greater than start times' }
);

export type Word = z.infer<typeof WordSchema>;
export type Segment = z.infer<typeof SegmentSchema>;
export type Transcript = z.infer<typeof TranscriptSchema>;

// ─── Caption Style Schemas ────────────────────────────────────────────────────

export const AnimationModeSchema = z.enum([
  'none',
  'word-by-word',
  'phrase',
  'karaoke',
]);

export const AspectRatioSchema = z.enum(['9:16', '16:9', '1:1']);

export const BackgroundStyleSchema = z.enum([
  'none',
  'pill',
  'box',
  'line',
  'blur',
]);

export const TextAlignSchema = z.enum(['left', 'center', 'right']);

export const PositionSchema = z.object({
  vertical: z.enum(['top', 'center', 'bottom']),
  horizontal: z.enum(['left', 'center', 'right']),
  offsetY: z.number().min(-100).max(100).default(0),
  offsetX: z.number().min(-100).max(100).default(0),
});

export const ShadowSettingsSchema = z.object({
  enabled: z.boolean(),
  color: z.string(),
  blur: z.number().min(0).max(50),
  offsetX: z.number().min(-20).max(20),
  offsetY: z.number().min(-20).max(20),
});

export const CaptionStyleSchema = z.object({
  id: z.string(),
  name: z.string(),
  fontFamily: z.string(),
  fontSize: z.number().min(8).max(120),
  fontWeight: z.enum(['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900']),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/),
  activeWordColor: z.string().regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/),
  outlineColor: z.string().regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/),
  outlineWidth: z.number().min(0).max(20),
  shadow: ShadowSettingsSchema,
  backgroundStyle: BackgroundStyleSchema,
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/).optional(),
  backgroundOpacity: z.number().min(0).max(1).default(0.7),
  textAlign: TextAlignSchema,
  position: PositionSchema,
  maxLineLength: z.number().min(10).max(200).default(40),
  maxLines: z.number().min(1).max(5).default(2),
  animationMode: AnimationModeSchema,
  aspectRatio: AspectRatioSchema,
  safeAreaMarginPercent: z.number().min(0).max(20).default(5),
  lineHeightMultiplier: z.number().min(0.8).max(3.0).default(1.3),
});

export type AnimationMode = z.infer<typeof AnimationModeSchema>;
export type AspectRatio = z.infer<typeof AspectRatioSchema>;
export type BackgroundStyle = z.infer<typeof BackgroundStyleSchema>;
export type Position = z.infer<typeof PositionSchema>;
export type ShadowSettings = z.infer<typeof ShadowSettingsSchema>;
export type CaptionStyle = z.infer<typeof CaptionStyleSchema>;

// ─── Project Schemas ─────────────────────────────────────────────────────────

export const ProjectStatusSchema = z.enum([
  'created',
  'uploading',
  'processing',
  'transcribed',
  'ready',
  'error',
]);

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  status: ProjectStatusSchema,
  durationSeconds: z.number().nonnegative().nullable(),
  originalAssetPath: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
export type Project = z.infer<typeof ProjectSchema>;

// ─── Media Asset Schemas ──────────────────────────────────────────────────────

export const MediaAssetTypeSchema = z.enum([
  'source_video',
  'extracted_audio',
  'rendered_video',
  'thumbnail',
]);

export const MediaInfoSchema = z.object({
  durationSeconds: z.number().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  frameRate: z.number().positive(),
  videoCodec: z.string(),
  audioCodec: z.string().nullable(),
  hasAudio: z.boolean(),
  sizeBytes: z.number().nonnegative(),
  format: z.string(),
});

export type MediaAssetType = z.infer<typeof MediaAssetTypeSchema>;
export type MediaInfo = z.infer<typeof MediaInfoSchema>;

// ─── Job Schemas ──────────────────────────────────────────────────────────────

export const JobStatusSchema = z.enum([
  'queued',
  'processing',
  'completed',
  'failed',
  'cancelled',
]);

export const JobTypeSchema = z.enum([
  'transcribe',
  'render',
  'generate_social_captions',
  'extract_audio',
  'validate_media',
]);

export const ProcessingJobSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  jobType: JobTypeSchema,
  status: JobStatusSchema,
  stage: z.string().nullable(),
  progress: z.number().int().min(0).max(100),
  attempts: z.number().int().nonnegative(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});

export type JobStatus = z.infer<typeof JobStatusSchema>;
export type JobType = z.infer<typeof JobTypeSchema>;
export type ProcessingJob = z.infer<typeof ProcessingJobSchema>;

// ─── Social Caption Schemas ───────────────────────────────────────────────────

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

// ─── Export Schemas ───────────────────────────────────────────────────────────

export const ExportFormatSchema = z.enum(['mp4', 'srt', 'vtt']);
export const ExportResolutionSchema = z.enum(['original', '720p', '1080p']);

export const ExportSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  jobId: z.string().uuid().nullable(),
  storagePath: z.string().nullable(),
  format: ExportFormatSchema,
  resolution: ExportResolutionSchema,
  fileSizeBytes: z.number().nonnegative().nullable(),
  createdAt: z.string().datetime(),
});

export type ExportFormat = z.infer<typeof ExportFormatSchema>;
export type ExportResolution = z.infer<typeof ExportResolutionSchema>;
export type Export = z.infer<typeof ExportSchema>;

// ─── API Response Schemas ─────────────────────────────────────────────────────

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
  details: z.unknown().optional(),
});

export function createApiSuccessResponse<T>(data: T) {
  return { success: true as const, data };
}

export function createApiErrorResponse(code: string, message: string, requestId?: string) {
  return { success: false as const, error: { code, message, requestId } };
}

export type ApiError = z.infer<typeof ApiErrorSchema>;

// ─── Caption Presets ──────────────────────────────────────────────────────────

export const CAPTION_PRESETS: Omit<CaptionStyle, 'aspectRatio'>[] = [
  {
    id: 'clean-white',
    name: 'Clean White',
    fontFamily: 'Inter',
    fontSize: 32,
    fontWeight: '700',
    textColor: '#FFFFFF',
    activeWordColor: '#FFFFFF',
    outlineColor: '#000000',
    outlineWidth: 2,
    shadow: { enabled: true, color: '#000000', blur: 4, offsetX: 1, offsetY: 1 },
    backgroundStyle: 'none',
    backgroundColor: undefined,
    backgroundOpacity: 0,
    textAlign: 'center',
    position: { vertical: 'bottom', horizontal: 'center', offsetY: -5, offsetX: 0 },
    maxLineLength: 40,
    maxLines: 2,
    animationMode: 'phrase',
    safeAreaMarginPercent: 5,
    lineHeightMultiplier: 1.3,
  },
  {
    id: 'bold-creator',
    name: 'Bold Creator',
    fontFamily: 'Montserrat',
    fontSize: 40,
    fontWeight: '900',
    textColor: '#FFFFFF',
    activeWordColor: '#FFD700',
    outlineColor: '#000000',
    outlineWidth: 4,
    shadow: { enabled: true, color: '#000000', blur: 8, offsetX: 2, offsetY: 2 },
    backgroundStyle: 'none',
    backgroundColor: undefined,
    backgroundOpacity: 0,
    textAlign: 'center',
    position: { vertical: 'bottom', horizontal: 'center', offsetY: -8, offsetX: 0 },
    maxLineLength: 35,
    maxLines: 2,
    animationMode: 'word-by-word',
    safeAreaMarginPercent: 5,
    lineHeightMultiplier: 1.4,
  },
  {
    id: 'yellow-highlight',
    name: 'Yellow Highlight',
    fontFamily: 'Inter',
    fontSize: 34,
    fontWeight: '700',
    textColor: '#FFFFFF',
    activeWordColor: '#000000',
    outlineColor: '#000000',
    outlineWidth: 0,
    shadow: { enabled: false, color: '#000000', blur: 0, offsetX: 0, offsetY: 0 },
    backgroundStyle: 'pill',
    backgroundColor: '#FFD700',
    backgroundOpacity: 0.95,
    textAlign: 'center',
    position: { vertical: 'bottom', horizontal: 'center', offsetY: -8, offsetX: 0 },
    maxLineLength: 38,
    maxLines: 2,
    animationMode: 'word-by-word',
    safeAreaMarginPercent: 5,
    lineHeightMultiplier: 1.3,
  },
  {
    id: 'karaoke-active-word',
    name: 'Karaoke Active Word',
    fontFamily: 'Inter',
    fontSize: 36,
    fontWeight: '800',
    textColor: '#CCCCCC',
    activeWordColor: '#FF6B35',
    outlineColor: '#000000',
    outlineWidth: 3,
    shadow: { enabled: true, color: '#000000', blur: 6, offsetX: 1, offsetY: 1 },
    backgroundStyle: 'none',
    backgroundColor: undefined,
    backgroundOpacity: 0,
    textAlign: 'center',
    position: { vertical: 'bottom', horizontal: 'center', offsetY: -8, offsetX: 0 },
    maxLineLength: 40,
    maxLines: 2,
    animationMode: 'karaoke',
    safeAreaMarginPercent: 5,
    lineHeightMultiplier: 1.4,
  },
  {
    id: 'minimal-subtitle',
    name: 'Minimal Subtitle',
    fontFamily: 'Inter',
    fontSize: 28,
    fontWeight: '400',
    textColor: '#FFFFFF',
    activeWordColor: '#FFFFFF',
    outlineColor: '#000000',
    outlineWidth: 1,
    shadow: { enabled: true, color: '#000000', blur: 3, offsetX: 0, offsetY: 1 },
    backgroundStyle: 'none',
    backgroundColor: undefined,
    backgroundOpacity: 0,
    textAlign: 'center',
    position: { vertical: 'bottom', horizontal: 'center', offsetY: -4, offsetX: 0 },
    maxLineLength: 50,
    maxLines: 2,
    animationMode: 'phrase',
    safeAreaMarginPercent: 5,
    lineHeightMultiplier: 1.2,
  },
  {
    id: 'podcast-style',
    name: 'Podcast Style',
    fontFamily: 'Georgia',
    fontSize: 30,
    fontWeight: '400',
    textColor: '#F0F0F0',
    activeWordColor: '#00BFFF',
    outlineColor: '#1A1A1A',
    outlineWidth: 2,
    shadow: { enabled: true, color: '#000000', blur: 5, offsetX: 1, offsetY: 1 },
    backgroundStyle: 'box',
    backgroundColor: '#1A1A1A',
    backgroundOpacity: 0.8,
    textAlign: 'left',
    position: { vertical: 'bottom', horizontal: 'center', offsetY: -6, offsetX: 0 },
    maxLineLength: 45,
    maxLines: 3,
    animationMode: 'phrase',
    safeAreaMarginPercent: 5,
    lineHeightMultiplier: 1.5,
  },
  {
    id: 'neon-accent',
    name: 'Neon Accent',
    fontFamily: 'Montserrat',
    fontSize: 36,
    fontWeight: '700',
    textColor: '#FFFFFF',
    activeWordColor: '#00FF88',
    outlineColor: '#00FF88',
    outlineWidth: 2,
    shadow: { enabled: true, color: '#00FF88', blur: 12, offsetX: 0, offsetY: 0 },
    backgroundStyle: 'none',
    backgroundColor: undefined,
    backgroundOpacity: 0,
    textAlign: 'center',
    position: { vertical: 'bottom', horizontal: 'center', offsetY: -8, offsetX: 0 },
    maxLineLength: 38,
    maxLines: 2,
    animationMode: 'word-by-word',
    safeAreaMarginPercent: 5,
    lineHeightMultiplier: 1.4,
  },
  {
    id: 'classic-cinema',
    name: 'Classic Cinema',
    fontFamily: 'Georgia',
    fontSize: 28,
    fontWeight: '400',
    textColor: '#FFFAE0',
    activeWordColor: '#FFFAE0',
    outlineColor: '#000000',
    outlineWidth: 2,
    shadow: { enabled: true, color: '#000000', blur: 4, offsetX: 1, offsetY: 1 },
    backgroundStyle: 'none',
    backgroundColor: undefined,
    backgroundOpacity: 0,
    textAlign: 'center',
    position: { vertical: 'bottom', horizontal: 'center', offsetY: -6, offsetX: 0 },
    maxLineLength: 48,
    maxLines: 2,
    animationMode: 'phrase',
    safeAreaMarginPercent: 8,
    lineHeightMultiplier: 1.3,
  },
  {
    id: 'educational',
    name: 'Educational',
    fontFamily: 'Inter',
    fontSize: 30,
    fontWeight: '600',
    textColor: '#1A1A1A',
    activeWordColor: '#005A9E',
    outlineColor: '#FFFFFF',
    outlineWidth: 0,
    shadow: { enabled: false, color: '#000000', blur: 0, offsetX: 0, offsetY: 0 },
    backgroundStyle: 'box',
    backgroundColor: '#FFFFFF',
    backgroundOpacity: 0.9,
    textAlign: 'center',
    position: { vertical: 'bottom', horizontal: 'center', offsetY: -6, offsetX: 0 },
    maxLineLength: 45,
    maxLines: 2,
    animationMode: 'word-by-word',
    safeAreaMarginPercent: 5,
    lineHeightMultiplier: 1.4,
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    fontFamily: 'Inter',
    fontSize: 34,
    fontWeight: '900',
    textColor: '#FFFF00',
    activeWordColor: '#FFFF00',
    outlineColor: '#000000',
    outlineWidth: 5,
    shadow: { enabled: true, color: '#000000', blur: 6, offsetX: 2, offsetY: 2 },
    backgroundStyle: 'none',
    backgroundColor: undefined,
    backgroundOpacity: 0,
    textAlign: 'center',
    position: { vertical: 'bottom', horizontal: 'center', offsetY: -6, offsetX: 0 },
    maxLineLength: 40,
    maxLines: 2,
    animationMode: 'phrase',
    safeAreaMarginPercent: 5,
    lineHeightMultiplier: 1.3,
  },
];

// ─── Supported Languages ──────────────────────────────────────────────────────

export const SUPPORTED_TRANSCRIPTION_LANGUAGES = [
  { code: 'auto', label: 'Auto-detect' },
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'Tamil' },
  { code: 'hi', label: 'Hindi' },
  { code: 'te', label: 'Telugu' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'mr', label: 'Marathi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'es', label: 'Spanish' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' },
];

// ─── Whisper Model Info ───────────────────────────────────────────────────────

export const WHISPER_MODELS = [
  { id: 'tiny', label: 'Tiny (39 MB)', diskMb: 75, ramMb: 250, quality: 'Basic', speed: 'Fastest' },
  { id: 'base', label: 'Base (74 MB)', diskMb: 145, ramMb: 500, quality: 'Good', speed: 'Fast' },
  { id: 'small', label: 'Small (244 MB)', diskMb: 480, ramMb: 1000, quality: 'Better', speed: 'Moderate' },
  { id: 'medium', label: 'Medium (769 MB)', diskMb: 1500, ramMb: 3000, quality: 'Great', speed: 'Slow' },
  { id: 'large-v2', label: 'Large v2 (1.5 GB)', diskMb: 3000, ramMb: 6000, quality: 'Best', speed: 'Slowest' },
  { id: 'large-v3', label: 'Large v3 (1.5 GB)', diskMb: 3000, ramMb: 6000, quality: 'Best', speed: 'Slowest' },
] as const;

// ─── Subtitle & Text Generators ───────────────────────────────────────────────

export function formatSRTTime(seconds: number): string {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function formatVTTTime(seconds: number): string {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export function generateSRT(transcript: Transcript): string {
  const lines: string[] = [];
  let index = 1;
  for (const seg of transcript.segments) {
    const text = seg.text.trim();
    if (!text) continue;
    lines.push(String(index));
    lines.push(`${formatSRTTime(seg.start)} --> ${formatSRTTime(seg.end)}`);
    lines.push(text);
    lines.push('');
    index++;
  }
  return lines.join('\n');
}

export function generateVTT(transcript: Transcript): string {
  const lines: string[] = ['WEBVTT', ''];
  let index = 1;
  for (const seg of transcript.segments) {
    const text = seg.text.trim();
    if (!text) continue;
    lines.push(`cue-${index}`);
    lines.push(`${formatVTTTime(seg.start)} --> ${formatVTTTime(seg.end)}`);
    lines.push(text);
    lines.push('');
    index++;
  }
  return lines.join('\n');
}

export function generatePlainText(transcript: Transcript): string {
  return transcript.segments.map((s) => s.text.trim()).filter(Boolean).join('\n');
}

