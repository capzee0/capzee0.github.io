import { useNavigate } from 'react-router-dom';
import {
  Video, Zap, Mic, Palette, Download, Share2,
  ArrowRight, Sparkles
} from 'lucide-react';

const features = [
  {
    icon: Mic,
    title: 'AI Transcription',
    desc: 'Powered by Whisper — fast, accurate speech-to-text with word-level timestamps.',
    color: 'from-blue-500 to-blue-700',
  },
  {
    icon: Palette,
    title: 'Caption Editor',
    desc: 'Design animated subtitles with 10 built-in presets. Real-time preview with playback.',
    color: 'from-violet-500 to-violet-700',
  },
  {
    icon: Zap,
    title: 'Word Highlighting',
    desc: 'Karaoke-style active word tracking. Perfect for short-form content.',
    color: 'from-amber-500 to-orange-600',
  },
  {
    icon: Share2,
    title: 'Social Captions',
    desc: 'Generate hooks, hashtags, and CTAs for Instagram Reels, YouTube Shorts & more.',
    color: 'from-pink-500 to-rose-600',
  },
  {
    icon: Download,
    title: 'Video Export',
    desc: 'Burn captions into MP4 or export SRT/VTT files. 720p and 1080p output.',
    color: 'from-emerald-500 to-green-700',
  },
  {
    icon: Video,
    title: 'Local Processing',
    desc: 'All processing on your machine. No cloud required. Your data stays private.',
    color: 'from-cyan-500 to-teal-600',
  },
];

const presets = [
  'Clean White', 'Bold Creator', 'Yellow Highlight',
  'Karaoke Active Word', 'Minimal Subtitle', 'Podcast Style',
  'Neon Accent', 'Classic Cinema', 'Educational', 'High Contrast',
];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary overflow-x-hidden">
      {/* ── Header ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-surface-border/50 bg-bg-primary/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-blue to-accent-violet flex items-center justify-center">
              <Video className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">Capzee</span>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary text-sm"
            id="hero-open-app-btn"
          >
            Open App
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full bg-accent-blue/5 blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-accent-violet/5 blur-3xl" />
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent-blue/30 bg-accent-blue/5 text-accent-blue text-xs font-medium mb-8 animate-fade-in">
            <Sparkles className="w-3 h-3" />
            Local AI · No subscription · Open source
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-tight mb-6 animate-slide-up">
            Caption Your Videos{' '}
            <span className="text-gradient">Automatically</span>
          </h1>

          <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up">
            AI-powered transcription, animated subtitles, and social media caption generation
            — all running locally on your machine. No API keys required to get started.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
            <button
              onClick={() => navigate('/projects/new')}
              className="btn-primary text-base px-8 py-3 glow-blue"
              id="hero-start-btn"
            >
              Start Captioning
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-secondary text-base px-8 py-3"
              id="hero-dashboard-btn"
            >
              View Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6" aria-labelledby="features-heading">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 id="features-heading" className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to caption
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              A complete pipeline from raw video to finished, captioned content ready for social media.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat) => (
              <div
                key={feat.title}
                className="panel p-6 hover:border-surface-border transition-all duration-200 group"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feat.color} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200`}>
                  <feat.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-text-primary mb-2">{feat.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Presets ── */}
      <section className="py-24 px-6 bg-bg-secondary/30" aria-labelledby="presets-heading">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 id="presets-heading" className="text-3xl font-bold mb-4">10 Caption Presets</h2>
            <p className="text-text-secondary">Ready-to-use styles for every type of content.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {presets.map((preset) => (
              <span
                key={preset}
                className="px-4 py-2 rounded-full bg-surface-DEFAULT border border-surface-border text-sm text-text-secondary hover:text-text-primary hover:border-accent-blue/50 transition-colors duration-150 cursor-default"
              >
                {preset}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to start?</h2>
          <p className="text-text-secondary mb-8">
            Import your first video and get a transcript in minutes.
            FFmpeg and Python required for full functionality.
          </p>
          <button
            onClick={() => navigate('/projects/new')}
            className="btn-primary text-base px-10 py-3"
            id="cta-start-btn"
          >
            Import a Video
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-surface-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-accent-blue" />
            <span className="font-semibold">Capzee</span>
            <span className="text-text-muted text-sm">v0.1.0</span>
          </div>
          <p className="text-text-muted text-xs text-center">
            Open-source · Local processing · No mandatory subscriptions
          </p>
        </div>
      </footer>
    </div>
  );
}
