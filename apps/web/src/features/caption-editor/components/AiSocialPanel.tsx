import { useState, useMemo } from 'react';
import {
  Sparkles, Copy, Check, Hash, MessageSquareText,
  Lightbulb, RefreshCw, BookmarkCheck, ArrowRight
} from 'lucide-react';
import type { Transcript } from '@capzee/contracts';
import { cn } from '@/lib/utils';

interface AiSocialPanelProps {
  transcript: Transcript | null;
  videoTitle?: string;
  onUpdateTitle?: (newTitle: string) => void;
}

type ToneType = 'viral' | 'educational' | 'story' | 'bold';
type PlatformType = 'reels' | 'shorts' | 'linkedin';

export function AiSocialPanel({
  transcript,
  videoTitle,
  onUpdateTitle,
}: AiSocialPanelProps) {
  const [tone, setTone] = useState<ToneType>('viral');
  const [platform, setPlatform] = useState<PlatformType>('reels');
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [appliedHook, setAppliedHook] = useState<string | null>(null);
  const [seed, setSeed] = useState(0);

  // Extract core theme and text from transcript
  const fullText = useMemo(() => {
    if (!transcript || transcript.segments.length === 0) return '';
    return transcript.segments.map((s) => s.text).join(' ').trim();
  }, [transcript]);

  // Derive meaningful keywords and subject matter from speech
  const insights = useMemo(() => {
    if (!fullText) {
      return {
        topic: videoTitle || 'your video',
        keywords: ['creator', 'viral', 'tips', 'tutorial', 'shorts'],
        sentences: [],
      };
    }

    const words = fullText
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !['this', 'that', 'with', 'from', 'have', 'what', 'your', 'about', 'just', 'more', 'some', 'like', 'when', 'there'].includes(w));

    // Word frequencies
    const freq: Record<string, number> = {};
    words.forEach((w) => { freq[w] = (freq[w] || 0) + 1; });
    const topKeywords = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k]) => k);

    const primaryTopic = topKeywords[0]
      ? topKeywords[0].charAt(0).toUpperCase() + topKeywords[0].slice(1)
      : (videoTitle || 'Content Strategy');

    const cleanSentences = fullText
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15);

    return {
      topic: primaryTopic,
      keywords: topKeywords.length > 0 ? topKeywords : ['creator', 'video', 'tips', 'growth', 'trending'],
      sentences: cleanSentences.slice(0, 4),
    };
  }, [fullText, videoTitle]);

  // Generate 3 High-CTR Viral Opening Hooks
  const viralHooks = useMemo(() => {
    const alternateTopic =
      seed > 0 ? insights.keywords[(seed - 1) % insights.keywords.length] : null;
    const t = alternateTopic
      ? alternateTopic.charAt(0).toUpperCase() + alternateTopic.slice(1)
      : insights.topic;
    const kw = insights.keywords[1] || 'results';

    if (tone === 'viral') {
      return [
        {
          id: 'hook-1',
          type: 'Curiosity Gap',
          text: `The biggest mistake people make with ${t} in 2026...`,
          desc: 'Triggers instant retention in the first 2 seconds.',
        },
        {
          id: 'hook-2',
          type: 'Pattern Interrupt',
          text: `Stop scrolling if you want to master ${t} without the stress.`,
          desc: 'Direct callout commanding immediate viewer focus.',
        },
        {
          id: 'hook-3',
          type: 'Insiders Secret',
          text: `Nobody is talking about this ${t} secret, but here is how it works:`,
          desc: 'High viral potential on TikTok and Instagram Reels.',
        },
      ];
    }

    if (tone === 'educational') {
      return [
        {
          id: 'hook-1',
          type: 'Step-by-Step Guide',
          text: `How to actually optimize ${t} in under 60 seconds:`,
          desc: 'Positions your content as high-value actionable advice.',
        },
        {
          id: 'hook-2',
          type: 'Before vs After',
          text: `3 key rules to understand ${t} before you start:`,
          desc: 'Encourages viewers to save the video for reference.',
        },
        {
          id: 'hook-3',
          type: 'Pro Tip Breakdown',
          text: `The exact breakdown behind high-impact ${t} and ${kw}.`,
          desc: 'Authority-building hook for educational creators.',
        },
      ];
    }

    if (tone === 'bold') {
      return [
        {
          id: 'hook-1',
          type: 'Contrarian Take',
          text: `Why 99% of people get ${t} completely wrong:`,
          desc: 'Debunks common myths, driving passionate debate in comments.',
        },
        {
          id: 'hook-2',
          type: 'Hard Truth',
          text: `I wish someone told me this about ${t} before I started.`,
          desc: 'Creates emotional resonance and relatability.',
        },
        {
          id: 'hook-3',
          type: 'Direct Challenge',
          text: `You only need this ONE insight to transform your ${t}.`,
          desc: 'High click-through-rate hook for short-form video.',
        },
      ];
    }

    // Storytelling
    return [
      {
        id: 'hook-1',
        type: 'Story Hook',
        text: `Here is the crazy story of how ${t} changed everything...`,
        desc: 'Engages viewers through curiosity and narrative arc.',
      },
      {
        id: 'hook-2',
        type: 'Journey Hook',
        text: `What happened when we tried to rethink ${t} from scratch:`,
        desc: 'Builds anticipation for the resolution at the end of the clip.',
      },
      {
        id: 'hook-3',
        type: 'Personal Confession',
        text: `Here is what nobody tells you about dealing with ${t}:`,
        desc: 'Vulnerable and engaging style popular on social media.',
      },
    ];
  }, [insights, seed, tone]);

  // Generate platform-optimized descriptions
  const platformContent = useMemo(() => {
    const t = insights.topic;
    const bullets = insights.sentences.slice(0, 3).map((s) => `• ${s}`).join('\n') || `• Master the essentials of ${t}\n• Apply actionable creator tips\n• Save time with smart workflow`;

    if (platform === 'reels') {
      return `✨ Everything you need to know about ${t} in under a minute!

${bullets}

👇 Drop a comment below if you want part 2!
Save this post so you don't lose it later 📌`;
    }

    if (platform === 'shorts') {
      return `Master ${t} fast! Here's the complete breakdown and key takeaways you need to know today.

Key Highlights:
${bullets}

Subscribe for more short-form editing and creator tips! 🚀`;
    }

    // LinkedIn
    return `💡 Key Takeaways on ${t}:

Effective communication requires clarity, precision, and authentic delivery.

${bullets}

What has been your experience with ${t}? Let's discuss in the comments below.`;
  }, [insights, platform]);

  // Generate hashtag pack
  const hashtags = useMemo(() => {
    const base = ['#shorts', '#reels', '#contentcreator', '#viral', '#videoediting'];
    const custom = insights.keywords.map((k) => `#${k}`);
    const unique = Array.from(new Set([...custom, ...base]));
    return unique.slice(0, 10);
  }, [insights]);

  function copyToClipboard(text: string, identifier: string) {
    navigator.clipboard.writeText(text);
    setCopiedItem(identifier);
    setTimeout(() => setCopiedItem(null), 2000);
  }

  function handleApplyHook(hookText: string) {
    if (onUpdateTitle) {
      onUpdateTitle(hookText);
      setAppliedHook(hookText);
      setTimeout(() => setAppliedHook(null), 2500);
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#FAF7F5] rounded-xl overflow-hidden border border-[#2F3020]/15 text-[#2F3020] text-xs">
      {/* ── Top Header: Title & Tone Selector ── */}
      <div className="p-3 border-b border-[#2F3020]/15 bg-[#FAF7F5] flex-shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-[#2F3020]">
            <Sparkles className="w-4 h-4 text-[#16A34A]" />
            <span>AI Viral Hooks & Social</span>
          </div>

          <button
            type="button"
            onClick={() => setSeed((s) => s + 1)}
            className="flex items-center gap-1 text-[10px] font-bold text-[#2F3020]/70 hover:text-[#16A34A] px-2 py-1 rounded-md hover:bg-black/5 transition-colors cursor-pointer"
            title="Regenerate hooks with fresh angle"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Regenerate</span>
          </button>
        </div>

        {/* Tone Selector Pill */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#2F3020]/15 shadow-2xs">
          {(['viral', 'educational', 'bold', 'story'] as ToneType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              className={cn(
                "flex-1 py-1 px-1.5 rounded-lg text-[10px] font-bold capitalize transition-all cursor-pointer text-center truncate",
                tone === t
                  ? "bg-[#16A34A] text-white shadow-2xs"
                  : "text-[#2F3020]/70 hover:text-[#2F3020] hover:bg-black/5"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Section 1: Viral Opening Hooks */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[11px] text-[#2F3020] flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-[#D96846]" />
              <span>3 High-CTR Opening Hooks</span>
            </span>
            <span className="text-[10px] text-[#2F3020]/60 font-medium">First 2 Seconds</span>
          </div>

          <div className="space-y-2">
            {viralHooks.map((h, i) => (
              <div
                key={h.id}
                className="bg-white border border-[#2F3020]/15 rounded-xl p-2.5 shadow-2xs hover:border-[#16A34A] transition-all space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-mono font-bold text-[#16A34A] bg-[#16A34A]/10 px-1.5 py-0.5 rounded">
                    #{i + 1} {h.type}
                  </span>
                  <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {onUpdateTitle && (
                      <button
                        type="button"
                        onClick={() => handleApplyHook(h.text)}
                        className="flex items-center gap-1 px-1.5 py-0.5 text-[9.5px] font-bold text-[#2F3020]/75 hover:text-[#16A34A] hover:bg-black/5 rounded cursor-pointer"
                        title="Set this hook as project title"
                      >
                        {appliedHook === h.text ? <BookmarkCheck className="w-3 h-3 text-[#16A34A]" /> : <ArrowRight className="w-3 h-3" />}
                        <span>{appliedHook === h.text ? 'Applied!' : 'Use Title'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => copyToClipboard(h.text, h.id)}
                      className="p-1 rounded text-[#2F3020]/70 hover:text-[#16A34A] hover:bg-black/5 cursor-pointer"
                      title="Copy hook to clipboard"
                    >
                      {copiedItem === h.id ? <Check className="w-3 h-3 text-[#16A34A]" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <p className="text-xs font-bold text-[#2F3020] leading-snug">
                  "{h.text}"
                </p>
                <p className="text-[10px] text-[#2F3020]/60">
                  {h.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Platform Caption & Description */}
        <div className="space-y-2 pt-2 border-t border-[#2F3020]/15">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[11px] text-[#2F3020] flex items-center gap-1.5">
              <MessageSquareText className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>Platform Caption & Summary</span>
            </span>

            {/* Platform tab selector */}
            <div className="flex items-center gap-1 text-[10px] font-bold">
              {(['reels', 'shorts', 'linkedin'] as PlatformType[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={cn(
                    "px-2 py-0.5 rounded cursor-pointer transition-colors",
                    platform === p
                      ? "bg-[#16A34A] text-white"
                      : "text-[#2F3020]/70 hover:text-[#2F3020]"
                  )}
                >
                  {p === 'reels' ? 'Reels' : p === 'shorts' ? 'Shorts' : 'LinkedIn'}
                </button>
              ))}
            </div>
          </div>

          <div className="relative bg-white border border-[#2F3020]/15 rounded-xl p-2.5 shadow-2xs space-y-2">
            <pre className="text-[11px] font-sans text-[#2F3020] whitespace-pre-wrap leading-relaxed select-text">
              {platformContent}
            </pre>

            <div className="flex justify-end pt-1.5 border-t border-[#2F3020]/10">
              <button
                type="button"
                onClick={() => copyToClipboard(platformContent, 'platform-caption')}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-[#16A34A] hover:bg-[#15803D] text-white text-[10px] font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
              >
                {copiedItem === 'platform-caption' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedItem === 'platform-caption' ? 'Copied Caption!' : 'Copy Caption'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Viral Hashtags Pack */}
        <div className="space-y-2 pt-2 border-t border-[#2F3020]/15">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[11px] text-[#2F3020] flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-[#D96846]" />
              <span>Trending Hashtag Pack</span>
            </span>

            <button
              type="button"
              onClick={() => copyToClipboard(hashtags.join(' '), 'hashtags')}
              className="flex items-center gap-1 text-[10px] font-bold text-[#16A34A] hover:underline cursor-pointer"
            >
              {copiedItem === 'hashtags' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copiedItem === 'hashtags' ? 'Copied Tags!' : 'Copy All'}</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 bg-white border border-[#2F3020]/15 rounded-xl p-2.5 shadow-2xs">
            {hashtags.map((tag) => (
              <span
                key={tag}
                onClick={() => copyToClipboard(tag, tag)}
                className="text-[10px] font-mono font-bold bg-[#FAF7F5] border border-[#2F3020]/15 hover:border-[#16A34A] hover:text-[#16A34A] text-[#2F3020] px-2 py-0.5 rounded-lg cursor-pointer transition-colors shadow-2xs"
                title="Click to copy hashtag"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
