import { useState } from 'react';
import {
  Settings, Cpu, Video, Scissors, Check,
  RotateCcw, Sparkles
} from 'lucide-react';
import { WHISPER_MODELS, SUPPORTED_TRANSCRIPTION_LANGUAGES } from '@capzee/contracts';

export function SettingsPage() {
  // AI Speech Settings
  const [whisperModel, setWhisperModel] = useState(
    () => localStorage.getItem('capzee.whisper_model') ?? 'small'
  );
  const [defaultLanguage, setDefaultLanguage] = useState(
    () => localStorage.getItem('capzee.default_language') ?? 'auto'
  );

  // Video Export Defaults
  const [defaultAspectRatio, setDefaultAspectRatio] = useState(
    () => localStorage.getItem('capzee.default_aspect_ratio') ?? '9:16'
  );
  const [defaultQuality, setDefaultQuality] = useState(
    () => localStorage.getItem('capzee.default_quality') ?? '1080p'
  );

  // Silence Trimmer Defaults
  const [silenceThreshold, setSilenceThreshold] = useState(
    () => localStorage.getItem('capzee.silence_threshold') ?? '-35'
  );
  const [minPauseDuration, setMinPauseDuration] = useState(
    () => localStorage.getItem('capzee.min_pause_duration') ?? '0.5'
  );

  // Advanced / Engine
  const [ffmpegPath, setFfmpegPath] = useState(
    () => localStorage.getItem('capzee.ffmpeg_path') ?? ''
  );
  const [savedToast, setSavedToast] = useState(false);

  function handleSave() {
    localStorage.setItem('capzee.whisper_model', whisperModel);
    localStorage.setItem('capzee.default_language', defaultLanguage);
    localStorage.setItem('capzee.default_aspect_ratio', defaultAspectRatio);
    localStorage.setItem('capzee.default_quality', defaultQuality);
    localStorage.setItem('capzee.silence_threshold', silenceThreshold);
    localStorage.setItem('capzee.min_pause_duration', minPauseDuration);
    localStorage.setItem('capzee.ffmpeg_path', ffmpegPath);

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  }

  function handleReset() {
    setWhisperModel('small');
    setDefaultLanguage('auto');
    setDefaultAspectRatio('9:16');
    setDefaultQuality('1080p');
    setSilenceThreshold('-35');
    setMinPauseDuration('0.5');
    setFfmpegPath('');
  }

  const selectedModel = WHISPER_MODELS.find((m) => m.id === whisperModel);

  return (
    <div className="h-full flex flex-col bg-[#D96846] text-[#2F3020] overflow-hidden font-sans">
      {/* Content Header (Compact) */}
      <div className="px-6 py-3 flex-shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black flex items-center gap-2 text-[#2F3020] tracking-tight">
            <Settings className="w-5 h-5 text-[#16A34A]" />
            Settings
          </h1>
          <p className="text-[#2F3020]/80 text-[11px] font-semibold">
            Studio preferences and AI model configuration · Capzee Studio
          </p>
        </div>

        {/* Quick save button in header */}
        <div className="flex items-center gap-2">
          {savedToast && (
            <span className="text-xs font-bold text-[#16A34A] bg-[#FAF7F5] px-2.5 py-1 rounded-md border border-[#16A34A]/30 shadow-xs animate-in fade-in">
              ✓ Saved!
            </span>
          )}
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#16A34A] hover:bg-[#15803D] active:scale-95 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Main Settings 2-Column Grid (Zero Scroll) */}
      <div className="flex-1 overflow-hidden px-6 pb-4 flex flex-col justify-between min-h-0 max-w-4xl w-full mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
          {/* Column 1: AI Speech & Advanced */}
          <div className="space-y-3">
            {/* 1. AI Speech & Transcription Section */}
            <section className="bg-[#CDCBD6] border border-[#2F3020]/15 rounded-xl p-3.5 space-y-2.5 shadow-sm text-[#2F3020]">
              <h2 className="font-bold text-[#2F3020] text-xs flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#16A34A]" />
                AI Speech & Transcription
              </h2>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Default Language */}
                <div>
                  <label className="block text-[10px] font-bold text-[#2F3020] mb-1" htmlFor="default-language">
                    Default Language
                  </label>
                  <select
                    id="default-language"
                    className="w-full bg-[#FAF7F5] border border-[#2F3020]/20 rounded-md px-2 py-1.5 text-xs font-semibold text-[#2F3020] focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                    value={defaultLanguage}
                    onChange={(e) => setDefaultLanguage(e.target.value)}
                  >
                    <option value="auto">Auto-detect</option>
                    {SUPPORTED_TRANSCRIPTION_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.label} ({lang.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* AI Model */}
                <div>
                  <label className="block text-[10px] font-bold text-[#2F3020] mb-1" htmlFor="whisper-model">
                    Whisper AI Model
                  </label>
                  <select
                    id="whisper-model"
                    className="w-full bg-[#FAF7F5] border border-[#2F3020]/20 rounded-md px-2 py-1.5 text-xs font-semibold text-[#2F3020] focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                    value={whisperModel}
                    onChange={(e) => setWhisperModel(e.target.value)}
                  >
                    {WHISPER_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} ({m.speed})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Model info badges */}
              {selectedModel && (
                <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                  {[
                    { label: 'Download', value: `~${selectedModel.diskMb} MB` },
                    { label: 'Memory', value: `~${selectedModel.ramMb} MB` },
                    { label: 'Speed', value: selectedModel.speed },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-[#FAF7F5] border border-[#2F3020]/15 rounded-md p-1.5 text-center shadow-xs">
                      <p className="text-[9px] text-[#2F3020]/60 font-medium leading-none">{label}</p>
                      <p className="text-[11px] font-bold text-[#2F3020] mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Advanced Engine Info */}
            <section className="bg-[#CDCBD6] border border-[#2F3020]/15 rounded-xl p-3 shadow-sm text-[#2F3020]">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-[#16A34A]" />
                  Engine & Version
                </span>
                <span className="text-[10px] font-mono text-[#16A34A] bg-[#FAF7F5] px-2 py-0.5 rounded border border-[#2F3020]/15">
                  Capzee AI v0.1.0
                </span>
              </div>
            </section>
          </div>

          {/* Column 2: Video Export Defaults & Silence Trimmer */}
          <div className="space-y-3">
            {/* 2. Video & Canvas Export Defaults */}
            <section className="bg-[#CDCBD6] border border-[#2F3020]/15 rounded-xl p-3.5 space-y-2.5 shadow-sm text-[#2F3020]">
              <h2 className="font-bold text-[#2F3020] text-xs flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-[#16A34A]" />
                Video & Canvas Defaults
              </h2>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-[#2F3020] mb-1" htmlFor="default-aspect">
                    Default Aspect Ratio
                  </label>
                  <select
                    id="default-aspect"
                    className="w-full bg-[#FAF7F5] border border-[#2F3020]/20 rounded-md px-2 py-1.5 text-xs font-semibold text-[#2F3020] focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                    value={defaultAspectRatio}
                    onChange={(e) => setDefaultAspectRatio(e.target.value)}
                  >
                    <option value="9:16">9:16 Vertical (Reels/TikTok)</option>
                    <option value="16:9">16:9 Landscape (YouTube)</option>
                    <option value="1:1">1:1 Square (Instagram)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#2F3020] mb-1" htmlFor="default-quality">
                    Export Resolution
                  </label>
                  <select
                    id="default-quality"
                    className="w-full bg-[#FAF7F5] border border-[#2F3020]/20 rounded-md px-2 py-1.5 text-xs font-semibold text-[#2F3020] focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                    value={defaultQuality}
                    onChange={(e) => setDefaultQuality(e.target.value)}
                  >
                    <option value="1080p">1080p Full HD</option>
                    <option value="4K">4K Ultra HD</option>
                    <option value="720p">720p HD</option>
                  </select>
                </div>
              </div>
            </section>

            {/* 3. Smart Silence Trimmer Defaults */}
            <section className="bg-[#CDCBD6] border border-[#2F3020]/15 rounded-xl p-3.5 space-y-2.5 shadow-sm text-[#2F3020]">
              <h2 className="font-bold text-[#2F3020] text-xs flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-[#16A34A]" />
                Smart Silence Trimmer Defaults
              </h2>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-[#2F3020] mb-1" htmlFor="silence-thresh">
                    Sensitivity
                  </label>
                  <select
                    id="silence-thresh"
                    className="w-full bg-[#FAF7F5] border border-[#2F3020]/20 rounded-md px-2 py-1.5 text-xs font-semibold text-[#2F3020] focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                    value={silenceThreshold}
                    onChange={(e) => setSilenceThreshold(e.target.value)}
                  >
                    <option value="-30">Subtle (-30 dB)</option>
                    <option value="-35">Balanced (-35 dB)</option>
                    <option value="-40">Aggressive (-40 dB)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#2F3020] mb-1" htmlFor="pause-duration">
                    Min Pause Cut
                  </label>
                  <select
                    id="pause-duration"
                    className="w-full bg-[#FAF7F5] border border-[#2F3020]/20 rounded-md px-2 py-1.5 text-xs font-semibold text-[#2F3020] focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                    value={minPauseDuration}
                    onChange={(e) => setMinPauseDuration(e.target.value)}
                  >
                    <option value="0.3">0.3s (Fast)</option>
                    <option value="0.5">0.5s (Standard)</option>
                    <option value="0.8">0.8s (Natural)</option>
                  </select>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#2F3020]/75 hover:text-[#2F3020] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 bg-[#16A34A] hover:bg-[#15803D] active:scale-95 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
