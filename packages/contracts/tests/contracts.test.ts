import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  WordSchema,
  SegmentSchema,
  TranscriptSchema,
  ValidatedTranscriptSchema,
  CaptionStyleSchema,
  CAPTION_PRESETS,
  SocialCaptionOutputSchema,
  SocialPlatformSchema,
  SocialToneSchema,
  generateSRT,
  generateVTT,
  generatePlainText,
} from '../dist/index.js';

describe('Contracts — Transcript Schemas', () => {
  it('validates a correct word', () => {
    const word = {
      id: 'w-1',
      text: 'Hello',
      start: 0.1,
      end: 0.5,
      confidence: 0.95,
    };
    const parsed = WordSchema.safeParse(word);
    assert.equal(parsed.success, true);
  });

  it('rejects negative start time', () => {
    const word = {
      id: 'w-1',
      text: 'Hello',
      start: -1.0,
      end: 0.5,
    };
    const parsed = WordSchema.safeParse(word);
    assert.equal(parsed.success, false);
  });

  it('validates a complete transcript', () => {
    const transcript = {
      schemaVersion: 1,
      language: 'en',
      segments: [
        {
          id: 'seg-1',
          start: 0.0,
          end: 2.5,
          text: 'Welcome to Capzee!',
          words: [
            { id: 'w-1', text: 'Welcome', start: 0.0, end: 0.8 },
            { id: 'w-2', text: 'to', start: 0.9, end: 1.2 },
            { id: 'w-3', text: 'Capzee!', start: 1.3, end: 2.5 },
          ],
        },
      ],
    };
    const parsed = ValidatedTranscriptSchema.safeParse(transcript);
    assert.equal(parsed.success, true);
  });

  it('rejects transcript where segment end <= start', () => {
    const transcript = {
      schemaVersion: 1,
      language: 'en',
      segments: [
        {
          id: 'seg-1',
          start: 3.0,
          end: 2.0,
          text: 'Invalid timing',
        },
      ],
    };
    const parsed = ValidatedTranscriptSchema.safeParse(transcript);
    assert.equal(parsed.success, false);
  });
});

describe('Contracts — Caption Styles & Presets', () => {
  it('provides default viral presets array', () => {
    assert.ok(Array.isArray(CAPTION_PRESETS));
    assert.ok(CAPTION_PRESETS.length > 0);
    const cleanWhite = CAPTION_PRESETS.find((p) => p.id === 'clean-white');
    assert.ok(cleanWhite);
    assert.equal(cleanWhite.fontFamily, 'Inter');
  });

  it('validates caption style schema with aspect ratio', () => {
    const style = {
      ...CAPTION_PRESETS[0],
      aspectRatio: '9:16' as const,
    };
    const parsed = CaptionStyleSchema.safeParse(style);
    assert.equal(parsed.success, true);
  });
});

describe('Contracts — Subtitle Generation', () => {
  const sampleTranscript = {
    schemaVersion: 1 as const,
    language: 'en',
    segments: [
      {
        id: 'seg-1',
        start: 0.5,
        end: 2.0,
        text: 'Hello world',
      },
      {
        id: 'seg-2',
        start: 2.5,
        end: 4.0,
        text: 'Welcome to Capzee',
      },
    ],
  };

  it('generates valid SRT format', () => {
    const srt = generateSRT(sampleTranscript);
    assert.ok(srt.includes('1\n'));
    assert.ok(srt.includes('00:00:00,500 --> 00:00:02,000'));
    assert.ok(srt.includes('Hello world'));
    assert.ok(srt.includes('2\n'));
    assert.ok(srt.includes('Welcome to Capzee'));
  });

  it('generates valid WebVTT format', () => {
    const vtt = generateVTT(sampleTranscript);
    assert.ok(vtt.startsWith('WEBVTT'));
    assert.ok(vtt.includes('00:00:00.500 --> 00:00:02.000'));
    assert.ok(vtt.includes('Hello world'));
  });

  it('generates clean plain text', () => {
    const txt = generatePlainText(sampleTranscript);
    assert.equal(txt, 'Hello world\nWelcome to Capzee');
  });
});

describe('Contracts — Social Captions Schema', () => {
  it('validates social caption output schema', () => {
    const sampleOutput = {
      hook: 'Watch this before editing your next video!',
      mainCaption: 'Capzee generates word-level animated subtitles in seconds.',
      hashtags: ['#ai', '#videoediting', '#contentcreator'],
      callToAction: 'Try Capzee today!',
      shortTitle: 'AI Video Captioning',
      platform: 'instagram_reels',
      language: 'en',
      tone: 'conversational',
    };
    const parsed = SocialCaptionOutputSchema.safeParse(sampleOutput);
    assert.equal(parsed.success, true);
  });

  it('validates social platforms and tones', () => {
    assert.equal(SocialPlatformSchema.safeParse('instagram_reels').success, true);
    assert.equal(SocialPlatformSchema.safeParse('youtube_shorts').success, true);
    assert.equal(SocialPlatformSchema.safeParse('invalid_platform').success, false);

    assert.equal(SocialToneSchema.safeParse('conversational').success, true);
    assert.equal(SocialToneSchema.safeParse('cinematic').success, true);
    assert.equal(SocialToneSchema.safeParse('unknown_tone').success, false);
  });
});
