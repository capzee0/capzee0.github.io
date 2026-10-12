import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Instagram, Youtube, Globe, Loader2, AlertCircle, Copy,
  Check, RefreshCw, ChevronLeft
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { generateSocialCaptions, getTranscript } from '@/services/api';
import type { SocialCaptionOutput } from '@capzee/contracts';
import { cn } from '@/lib/utils';

const PLATFORMS = [
  { id: 'instagram_reels', label: 'Instagram Reels', icon: Instagram, color: 'from-pink-500 to-orange-500' },
  { id: 'youtube_shorts', label: 'YouTube Shorts', icon: Youtube, color: 'from-red-500 to-red-700' },
  { id: 'generic', label: 'Generic Post', icon: Globe, color: 'from-forest to-olive' },
] as const;

const TONES = [
  'conversational', 'professional', 'educational', 'funny',
  'cinematic', 'inspirational', 'promotional',
] as const;

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'Tamil' },
  { code: 'tanglish', label: 'Tanglish' },
  { code: 'hi', label: 'Hindi' },
] as const;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded hover:bg-[#CDCBD6] text-[#2F3020]/70 hover:text-[#2F3020] transition-colors"
      aria-label="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export function SocialCaptionsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentTranscript, setCurrentTranscript } = useProjectStore();

  const [platform, setPlatform] = useState<typeof PLATFORMS[number]['id']>('instagram_reels');
  const [tone, setTone] = useState<typeof TONES[number]>('conversational');
  const [language, setLanguage] = useState<typeof LANGUAGES[number]['code']>('en');
  const [variants, setVariants] = useState(2);
  const [userContext, setUserContext] = useState('');
  const [captions, setCaptions] = useState<SocialCaptionOutput[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || currentTranscript) return;
    getTranscript(projectId)
      .then((t) => {
        if (t) setCurrentTranscript(t);
      })
      .catch(() => {
        // ignore if not ready
      });
  }, [projectId, currentTranscript, setCurrentTranscript]);

  async function generate() {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateSocialCaptions(projectId, {
        platform,
        tone,
        language,
        variants,
        includeHashtags: true,
        includeCallToAction: true,
        userContext: userContext.trim() || undefined,
      });
      setCaptions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate captions.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#D96846] text-[#2F3020]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3.5 sm:py-5 border-b border-[#2F3020]/15 bg-[#D96846]">
        <button onClick={() => navigate(-1)} className="p-1.5 sm:p-2 rounded hover:bg-[#2F3020]/10 text-[#2F3020] cursor-pointer">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#2F3020] tracking-tight">Social Captions</h1>
          <p className="text-[11px] sm:text-xs text-[#2F3020]/80 mt-0.5 font-medium">Generate viral hooks and hashtags · Capzee Studio</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Settings sidebar in Lavender */}
        <div className="w-full md:w-[280px] lg:w-[320px] flex-shrink-0 border-b md:border-b-0 md:border-r border-[#2F3020]/15 bg-[#CDCBD6] overflow-y-auto p-3.5 sm:p-4 space-y-4 sm:space-y-5 text-[#2F3020] max-h-[42vh] md:max-h-none">
          {/* No transcript warning */}
          {!currentTranscript && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[#FAF7F5] border border-amber-600/30 text-amber-800 text-xs font-semibold shadow-sm">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>No transcript available. Transcribe your video first.</span>
            </div>
          )}

          {/* Platform */}
          <section>
            <p className="label text-[#2F3020] font-bold mb-2">Platform</p>
            <div className="space-y-1.5">
              {PLATFORMS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setPlatform(id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-semibold transition-all',
                    platform === id
                      ? 'bg-[#16A34A] text-white shadow-sm'
                      : 'bg-[#FAF7F5] border border-[#2F3020]/15 text-[#2F3020] hover:bg-[#FAF7F5]/80'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Tone */}
          <section>
            <label className="label" htmlFor="tone-select">Tone</label>
            <select
              id="tone-select"
              className="input text-sm"
              value={tone}
              onChange={(e) => setTone(e.target.value as typeof TONES[number])}
            >
              {TONES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </section>

          {/* Language */}
          <section>
            <label className="label" htmlFor="lang-select">Output Language</label>
            <select
              id="lang-select"
              className="input text-sm"
              value={language}
              onChange={(e) => setLanguage(e.target.value as typeof LANGUAGES[number]['code'])}
            >
              {LANGUAGES.map(({ code, label }) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </section>

          {/* Variants */}
          <section>
            <div className="flex justify-between items-center mb-1">
              <label className="label" htmlFor="variants-range">Variants</label>
              <span className="text-xs text-text-muted">{variants}</span>
            </div>
            <input
              id="variants-range"
              type="range"
              min={1}
              max={3}
              value={variants}
              onChange={(e) => setVariants(parseInt(e.target.value))}
              className="w-full accent-[#16A34A]"
            />
          </section>

          {/* Context */}
          <section>
            <label className="label" htmlFor="user-context">Context / Description (optional)</label>
            <textarea
              id="user-context"
              className="input text-sm resize-none"
              rows={3}
              placeholder="Add context about the video content..."
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              maxLength={1000}
            />
          </section>

          {/* Generate button */}
          <button
            onClick={generate}
            disabled={loading || !currentTranscript}
            className="btn-primary w-full text-sm"
            id="generate-captions-btn"
          >
            {loading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
            ) : captions.length > 0 ? (
              <><RefreshCw className="w-3.5 h-3.5" /> Regenerate</>
            ) : (
              'Generate Captions'
            )}
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2 p-4 rounded-lg bg-status-error/10 border border-status-error/30 text-status-error text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {captions.length === 0 && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-14 h-14 rounded-2xl bg-surface-DEFAULT flex items-center justify-center mb-4">
                <Globe className="w-7 h-7 text-text-muted" />
              </div>
              <p className="text-text-secondary">Configure settings and click Generate</p>
              <p className="text-xs text-text-muted mt-1">
                Uses the mock provider by default (no API key needed).
              </p>
            </div>
          )}

          {captions.map((caption, i) => (
            <div key={i} className="panel p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-text-primary">
                  Variant {i + 1}
                  {caption.shortTitle && (
                    <span className="text-text-muted font-normal ml-2">· {caption.shortTitle}</span>
                  )}
                </h3>
                <span className="badge badge-neutral capitalize">{caption.tone}</span>
              </div>

              {/* Hook */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-[#16A34A] uppercase tracking-wide">Hook</p>
                  <CopyButton text={caption.hook} />
                </div>
                <p className="text-sm text-text-primary leading-relaxed bg-surface-DEFAULT p-3 rounded-md">
                  {caption.hook}
                </p>
              </div>

              {/* Caption */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-[#2F3020] uppercase tracking-wide">Caption</p>
                  <CopyButton text={caption.mainCaption} />
                </div>
                <p className="text-sm text-text-primary leading-relaxed bg-surface-DEFAULT p-3 rounded-md whitespace-pre-line">
                  {caption.mainCaption}
                </p>
              </div>

              {/* Hashtags */}
              {caption.hashtags.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-status-info uppercase tracking-wide">Hashtags</p>
                    <CopyButton text={caption.hashtags.join(' ')} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {caption.hashtags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-status-info/10 text-status-info text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              {caption.callToAction && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-status-success uppercase tracking-wide">Call to Action</p>
                    <CopyButton text={caption.callToAction} />
                  </div>
                  <p className="text-sm text-text-secondary italic bg-surface-DEFAULT p-3 rounded-md">
                    {caption.callToAction}
                  </p>
                </div>
              )}

              {/* Copy all */}
              <CopyButton
                text={[caption.hook, '', caption.mainCaption, '', caption.hashtags.join(' '), '', caption.callToAction].join('\n')}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
