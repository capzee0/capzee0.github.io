// ─── Capzee Universal Contracts ──────────────────────────────────────────────
// Pure ESM, strongly typed Zod schemas, exporters, and domain constants.

// Schemas & Types
export * from './schemas/transcript.js';
export * from './schemas/project.js';
export * from './schemas/job.js';
export * from './schemas/media.js';
export * from './schemas/social.js';
export * from './schemas/export.js';
export * from './schemas/api.js';

// Domain Constants
export * from './constants/languages.js';
export * from './constants/models.js';

// Exporters & Parsers (SRT, VTT, ASS, PlainText)
export * from './exporters/srt.js';
export * from './exporters/vtt.js';
export * from './exporters/ass.js';
export * from './exporters/txt.js';

// Presets & Styles
export * from './presets/captionPresetTypes.js';
export * from './presets/captionPresets.js';
import { CAPCUT_CAPTION_PRESETS } from './presets/captionPresets.js';
export const CAPTION_PRESETS = CAPCUT_CAPTION_PRESETS;
export const LEGACY_PRESETS = CAPCUT_CAPTION_PRESETS;

// Transliteration & Demo Helpers
export * from './transliteration.js';
