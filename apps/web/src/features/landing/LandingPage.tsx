import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Video, Zap, Mic, Palette, Download, Share2,
  ArrowRight
} from 'lucide-react';
import { UserMenu } from '@/components/auth/UserMenu';
import { useAuthStore } from '@/stores/authStore';

const features = [
  {
    icon: Mic,
    title: 'AI Transcription',
    desc: 'Powered by Whisper — fast, accurate speech-to-text with word-level timestamps.',
    color: 'from-terracotta to-terracotta-hover',
  },
  {
    icon: Palette,
    title: 'Caption Editor',
    desc: 'Design animated subtitles with 10 built-in presets. Real-time preview with playback.',
    color: 'from-olive to-olive-hover',
  },
  {
    icon: Zap,
    title: 'Word Highlighting',
    desc: 'Karaoke-style active word tracking. Perfect for short-form content.',
    color: 'from-terracotta to-olive',
  },
  {
    icon: Share2,
    title: 'Social Captions',
    desc: 'Generate hooks, hashtags, and CTAs for Instagram Reels, YouTube Shorts & more.',
    color: 'from-forest to-olive',
  },
  {
    icon: Download,
    title: 'Video Export',
    desc: 'Burn captions into MP4 or export SRT/VTT files. 720p and 1080p output.',
    color: 'from-olive to-forest',
  },
  {
    icon: Video,
    title: 'Local Processing',
    desc: 'All processing on your machine. No cloud required. Your data stays private.',
    color: 'from-terracotta-hover to-terracotta',
  },
];

const presets = [
  'Clean White', 'Bold Creator', 'Yellow Highlight',
  'Karaoke Active Word', 'Minimal Subtitle', 'Podcast Style',
  'Neon Accent', 'Classic Cinema', 'Educational', 'High Contrast',
];

export function LandingPage() {
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuthStore();

  // Automatically navigate to dashboard if already signed in
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleGoToApp = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      openAuthModal();
    }
  };

  return (
    <div className="min-h-screen bg-[#D96846] text-[#2F3020] overflow-x-hidden font-sans">
      {/* ── Header ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-[#2F3020]/15 bg-[#D96846]/95 backdrop-blur-md text-[#2F3020]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/capzee-wordmark.png"
              alt="Capzee"
              className="h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-105 drop-shadow-sm"
            />
          </Link>
          <div className="flex items-center gap-3">
            {user && <UserMenu />}
            <button
              onClick={handleGoToApp}
              className="button-secondary text-sm py-2 px-5 font-bold shadow-sm cursor-pointer"
              id="hero-open-app-btn"
            >
              {user ? 'Open Studio' : 'Open App'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden bg-[#D96846]">
        {/* Background gradient decorative shapes */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full bg-[#FAF7F5]/10 blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-[#16A34A]/15 blur-3xl" />
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          {/* Brand Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#FAF7F5]/25 border border-[#FAF7F5]/40 mb-6 backdrop-blur-sm shadow-sm hover:bg-[#FAF7F5]/35 transition-all">
            <img src="/capzee-icon.png" alt="Capzee Icon" className="w-6 h-6 object-contain drop-shadow" />
            <span className="text-xs font-black uppercase tracking-wider text-[#2F3020]">
              The Spicy-Fast AI Video Caption Studio
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-tight mb-6 text-[#2F3020]">
            Caption Your Videos{' '}
            <span className="text-[#FAF7F5] underline decoration-[#16A34A] decoration-wavy decoration-2">
              Automatically
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-[#2F3020]/90 max-w-2xl mx-auto mb-10 leading-relaxed font-semibold">
            AI-powered transcription, viral karaoke subtitles, silence remover, and social media hook generation
            — fast, flexible, and completely customizable.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleGoToApp}
              className="px-8 py-3.5 bg-[#FAF7F5] hover:bg-white text-[#2F3020] font-extrabold rounded-lg shadow-lg border-2 border-[#2F3020]/20 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
              id="hero-start-btn"
            >
              Start Captioning
              <ArrowRight className="w-4 h-4 text-[#16A34A]" />
            </button>
            <button
              onClick={handleGoToApp}
              className="button-secondary text-base px-8 py-3.5 shadow-lg font-bold cursor-pointer"
              id="hero-dashboard-btn"
            >
              {user ? 'View Dashboard' : 'Sign in to Dashboard'}
            </button>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6 bg-[#D96846]" aria-labelledby="features-heading">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 id="features-heading" className="text-3xl sm:text-4xl font-black mb-4 text-[#2F3020]">
              Everything you need to caption
            </h2>
            <p className="text-[#2F3020]/80 max-w-xl mx-auto font-medium">
              A complete pipeline from raw video to finished, captioned content ready for social media.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat) => (
              <div
                key={feat.title}
                className="bg-[#CDCBD6] border border-[#2F3020]/15 rounded-xl p-6 hover:shadow-lg transition-all duration-200 group text-[#2F3020] shadow-sm"
              >
                <div className="w-10 h-10 rounded-lg bg-[#16A34A] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200">
                  <feat.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-[#2F3020] mb-2">{feat.title}</h3>
                <p className="text-sm text-[#2F3020]/80 leading-relaxed font-medium">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Presets ── */}
      <section className="py-24 px-6 bg-[#C85A3A]/40 border-y border-[#2F3020]/15" aria-labelledby="presets-heading">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 id="presets-heading" className="text-3xl font-black mb-4 text-[#2F3020]">10 Caption Presets</h2>
            <p className="text-[#2F3020]/80 font-medium">Ready-to-use styles for every type of content.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {presets.map((preset) => (
              <span
                key={preset}
                className="px-4 py-2 rounded-full bg-[#FAF7F5] border border-[#2F3020]/15 text-sm font-semibold text-[#2F3020] shadow-sm hover:border-[#16A34A] transition-colors duration-150 cursor-default"
              >
                {preset}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 text-center bg-[#D96846]">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black mb-4 text-[#2F3020]">Ready to start?</h2>
          <p className="text-[#2F3020]/85 mb-8 font-medium">
            Import your first video and get a transcript in minutes.
            FFmpeg and Python required for full functionality.
          </p>
          <button
            onClick={handleGoToApp}
            className="button-secondary text-base px-10 py-3.5 shadow-lg font-bold cursor-pointer"
            id="cta-start-btn"
          >
            Import a Video
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#2F3020]/20 py-8 px-6 bg-[#C85A3A] text-[#FAF7F5]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/capzee-wordmark.png"
              alt="Capzee"
              className="h-8 w-auto object-contain brightness-110 drop-shadow-sm"
            />
            <span className="text-[#FAF7F5]/80 text-sm font-semibold">v0.1.0</span>
          </div>
          <p className="text-[#FAF7F5]/80 text-xs text-center font-medium">
            Open-source · Local processing · Capzee Studio
          </p>
        </div>
      </footer>
    </div>
  );
}
