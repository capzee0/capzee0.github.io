import { z } from 'zod';

export const AnimationModeSchema = z.enum([
  'none',
  'word-by-word',
  'phrase',
  'karaoke',
]);
export type AnimationMode = z.infer<typeof AnimationModeSchema>;

export const AspectRatioSchema = z.enum(['9:16', '16:9', '1:1']);
export type AspectRatio = z.infer<typeof AspectRatioSchema>;

export const BackgroundStyleSchema = z.enum([
  'none',
  'pill',
  'box',
  'line',
  'blur',
]);
export type BackgroundStyle = z.infer<typeof BackgroundStyleSchema>;

export const TextAlignSchema = z.enum(['left', 'center', 'right']);
export type TextAlign = z.infer<typeof TextAlignSchema>;

export const PositionSchema = z.object({
  vertical: z.enum(['top', 'center', 'bottom']),
  horizontal: z.enum(['left', 'center', 'right']),
  offsetY: z.number().min(-100).max(100).default(0),
  offsetX: z.number().min(-100).max(100).default(0),
});
export type Position = z.infer<typeof PositionSchema>;

export const ShadowSettingsSchema = z.object({
  enabled: z.boolean(),
  color: z.string(),
  blur: z.number().min(0).max(50),
  offsetX: z.number().min(-20).max(20),
  offsetY: z.number().min(-20).max(20),
});
export type ShadowSettings = z.infer<typeof ShadowSettingsSchema>;

export const CaptionCategorySchema = z.enum([
  'all',
  'social',
  'karaoke',
  'editorial',
  'minimal',
]);
export type CaptionCategory = z.infer<typeof CaptionCategorySchema>;

export const CaptionAnimationEffectSchema = z.enum([
  // Social
  'karaoke-highlight',
  'karaoke-fill',
  'kinetic-pop',
  'kinetic-slam',
  'word-bounce',
  'bold-outline',
  'pill-karaoke',
  'neon-glow',
  'gradient-highlight',
  'typewriter-reveal',
  'glitch-caption',
  'shake-caption',
  'zoom-caption',
  'fade-in',
  'slide-up',
  'word-reveal',
  // Editorial
  'whisper-fade',
  'rise-and-settle',
  'letter-cascade',
  'blur-in',
  'mask-wipe',
  'split-line',
  'underline-sweep',
  'editorial-emphasis',
  'lower-third',
  'zoom-statistic',
  // Creators & Flagship
  'script-lessons',
  'center-script',
  'lyrical-pop',
  'clean-white',
  'none',
]);
export type CaptionAnimationEffect = z.infer<typeof CaptionAnimationEffectSchema>;

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
  scriptAccent: z.boolean().optional(),
  scriptFont: z.string().optional(),
  uppercase: z.boolean().optional(),
  animationEffect: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  sampleText: z.string().optional(),
  tags: z.array(z.string()).optional(),
  animationIntensity: z.number().min(0.2).max(3.0).default(1.0).optional(),
});
export type CaptionStyle = z.infer<typeof CaptionStyleSchema>;

export interface CaptionPresetMetadata {
  id: string;
  name: string;
  category: CaptionCategory;
  description: string;
  animationEffect: CaptionAnimationEffect;
  sampleText: string;
  tags: string[];
  animationIntensity?: number; // 0.5 to 2.0 multiplier
}

export type CaptionPreset = Omit<CaptionStyle, 'aspectRatio'> & CaptionPresetMetadata;
