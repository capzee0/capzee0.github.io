import { describe, it } from 'vitest';
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
  parseSRT,
  parseVTT,
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

  it('parses raw SRT content back into validated Transcript', () => {
    const rawSrt = `1
00:00:01,000 --> 00:00:03,500
Capzee Studio is awesome

2
00:00:04,000 --> 00:00:06,000
Viral captions rendered fast`;
    const parsed = parseSRT(rawSrt);
    assert.equal(parsed.segments.length, 2);
    assert.equal(parsed.segments[0].start, 1.0);
    assert.equal(parsed.segments[0].end, 3.5);
    assert.equal(parsed.segments[0].text, 'Capzee Studio is awesome');
    assert.ok(parsed.segments[0].words && parsed.segments[0].words.length > 0);
  });

  it('parses raw WebVTT content back into validated Transcript', () => {
    const rawVtt = `WEBVTT

cue-1
00:00:00.500 --> 00:00:02.000
No AI model needed

cue-2
00:00:02.500 --> 00:00:05.000
Pure local rendering`;
    const parsed = parseVTT(rawVtt);
    assert.equal(parsed.segments.length, 2);
    assert.equal(parsed.segments[0].text, 'No AI model needed');
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

describe('Contracts — CapCut-Style Caption Preset Catalogue', () => {
  it('contains at least 20 distinct usable presets', () => {
    assert.ok(CAPTION_PRESETS.length >= 20, `Expected at least 20 presets, found ${CAPTION_PRESETS.length}`);
  });

  it('ensures each preset has distinct visual effects and passes schema validation', () => {
    const ids = new Set<string>();
    for (const preset of CAPTION_PRESETS) {
      assert.ok(preset.id, 'Preset must have an id');
      assert.ok(!ids.has(preset.id), `Duplicate preset id found: ${preset.id}`);
      ids.add(preset.id);

      assert.ok(preset.name, `Preset ${preset.id} must have a name`);
      assert.ok(preset.category, `Preset ${preset.id} must have a category`);
      assert.ok(preset.animationEffect, `Preset ${preset.id} must have an animationEffect`);
      assert.ok(preset.fontFamily, `Preset ${preset.id} must specify fontFamily`);
      assert.ok(preset.fontSize > 0, `Preset ${preset.id} must have positive fontSize`);

      const parsed = CaptionStyleSchema.safeParse({
        ...preset,
        aspectRatio: '9:16',
      });
      assert.ok(parsed.success, `Preset ${preset.id} failed CaptionStyleSchema validation: ${JSON.stringify(parsed)}`);
    }
  });

  it('covers all major categories: social, karaoke, editorial, minimal', () => {
    const categories = new Set(CAPTION_PRESETS.map((p) => p.category));
    assert.ok(categories.has('social'), 'Should have social presets');
    assert.ok(categories.has('karaoke'), 'Should have karaoke presets');
    assert.ok(categories.has('editorial'), 'Should have editorial presets');
    assert.ok(categories.has('minimal'), 'Should have minimal presets');
  });
});

