import { SocialPlatform, SocialTone, SocialLanguage, SocialCaptionOutput } from '@capzee/contracts';
import { config } from '../../config/index.js';

export interface SocialCaptionRequest {
  transcriptText: string;
  platform: SocialPlatform;
  language: SocialLanguage;
  tone: SocialTone;
  variants: number;
  includeHashtags: boolean;
  includeCallToAction: boolean;
  userContext?: string;
}

export interface SocialCaptionProvider {
  generate(request: SocialCaptionRequest): Promise<SocialCaptionOutput[]>;
  name: string;
}

// ─── Mock Provider (deterministic, no API key needed) ────────────────────────

const MOCK_HASHTAGS: Record<SocialPlatform, string[]> = {
  instagram_reels: ['#Reels', '#ContentCreator', '#Viral', '#Trending', '#InstaReels'],
  youtube_shorts: ['#Shorts', '#YouTubeShorts', '#Subscribe', '#Viral', '#Creator'],
  generic: ['#Video', '#Content', '#Creator', '#Social'],
};

const TONE_PREFIXES: Record<SocialTone, string> = {
  professional: 'In this video, we explore',
  educational: 'Learn how to',
  funny: 'You won\'t believe this —',
  conversational: 'Hey! Today we\'re talking about',
  cinematic: 'A story unfolds:',
  inspirational: 'This will change how you see',
  promotional: 'Discover why everyone is talking about',
};

function mockGenerate(request: SocialCaptionRequest): SocialCaptionOutput[] {
  const preview = request.transcriptText.slice(0, 80).replace(/\s+/g, ' ').trim();
  const prefix = TONE_PREFIXES[request.tone];
  const hashtags = request.includeHashtags ? MOCK_HASHTAGS[request.platform] : [];
  const cta = request.includeCallToAction ? 'Follow for more!' : '';

  return Array.from({ length: request.variants }, (_, i) => ({
    hook: `${prefix} ${preview}${i > 0 ? ` (variant ${i + 1})` : ''}...`,
    mainCaption: `${preview}\n\n${request.userContext ?? ''}`.trim(),
    hashtags,
    callToAction: cta,
    shortTitle: preview.slice(0, 30),
    platform: request.platform,
    language: request.language,
    tone: request.tone,
  }));
}

class MockProvider implements SocialCaptionProvider {
  name = 'mock';
  async generate(request: SocialCaptionRequest): Promise<SocialCaptionOutput[]> {
    return mockGenerate(request);
  }
}

// ─── Ollama Provider (local LLM, free) ───────────────────────────────────────

class OllamaProvider implements SocialCaptionProvider {
  name = 'ollama';

  async generate(request: SocialCaptionRequest): Promise<SocialCaptionOutput[]> {
    const prompt = this.buildPrompt(request);
    const response = await fetch(`${config.CAPZEE_OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.CAPZEE_OLLAMA_MODEL,
        prompt,
        stream: false,
        format: 'json',
      }),
    });

    if (!response.ok) {
      throw Object.assign(new Error(`Ollama returned ${response.status}`), {
        statusCode: 502,
        code: 'OLLAMA_ERROR',
      });
    }

    const data = await response.json() as { response?: string };
    try {
      const parsed = JSON.parse(data.response ?? '{}') as { captions?: unknown[] };
      if (Array.isArray(parsed.captions)) {
        return parsed.captions as SocialCaptionOutput[];
      }
    } catch {
      // Fall through to mock fallback
    }
    console.warn('[social-captions] Ollama response not parseable, using mock fallback');
    return mockGenerate(request);
  }

  private buildPrompt(req: SocialCaptionRequest): string {
    return `You are a social media content writer. Generate ${req.variants} social media caption(s) in ${req.language} for a ${req.platform.replace('_', ' ')} video.

Transcript: "${req.transcriptText.slice(0, 400)}"
${req.userContext ? `Context: ${req.userContext}` : ''}
Tone: ${req.tone}
Include hashtags: ${req.includeHashtags}
Include CTA: ${req.includeCallToAction}

Return ONLY a valid JSON object with this structure:
{
  "captions": [
    {
      "hook": "attention-grabbing first line",
      "mainCaption": "main body of the caption",
      "hashtags": ["#tag1", "#tag2"],
      "callToAction": "follow or subscribe message",
      "shortTitle": "short title under 30 chars"
    }
  ]
}`;
  }
}

// ─── Provider Factory ─────────────────────────────────────────────────────────

function getProvider(): SocialCaptionProvider {
  switch (config.CAPZEE_LLM_PROVIDER) {
    case 'ollama':
      return new OllamaProvider();
    case 'mock':
    default:
      return new MockProvider();
  }
}

export async function generateSocialCaptions(
  request: SocialCaptionRequest
): Promise<SocialCaptionOutput[]> {
  const provider = getProvider();
  console.info(`[social-captions] Using provider: ${provider.name}`);
  return provider.generate(request);
}
