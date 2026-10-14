import {
  ChevronLeft, CheckCircle2, Smartphone, Monitor, Square,
  Shield, Keyboard, Download
} from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import type { AspectRatio } from '@capzee/contracts';

interface EditorHeaderProps {
  title: string;
  durationSeconds?: number | null;
  aspectRatio: AspectRatio;
  safeZone: boolean;
  onBack: () => void;
  onSetAspectRatio: (ratio: AspectRatio) => void;
  onToggleSafeZone: () => void;
  onOpenShortcuts: () => void;
  onOpenExport: () => void;
}

export function EditorHeader({
  title,
  durationSeconds,
  aspectRatio,
  safeZone,
  onBack,
  onSetAspectRatio,
  onToggleSafeZone,
  onOpenShortcuts,
  onOpenExport,
}: EditorHeaderProps) {
  return (
    <header className="h-14 bg-[#CDCBD6] border-b border-[#2F3020]/20 px-3 sm:px-4 flex items-center justify-between gap-2 flex-shrink-0 z-30 select-none">
      {/* Left: Back & Project Info */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to dashboard"
          className="p-1.5 rounded-lg text-[#2F3020]/70 hover:text-[#2F3020] hover:bg-[#DBD8E3] transition-colors flex items-center gap-1 cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-xs sm:text-sm font-bold text-[#2F3020] truncate max-w-[120px] xs:max-w-[180px] sm:max-w-[260px]">
            {title || 'Untitled Project'}
          </h1>
          {durationSeconds != null && durationSeconds > 0 && (
            <span className="hidden md:inline-block text-[10px] font-mono font-medium text-[#2F3020]/60">
              {formatDuration(durationSeconds)}
            </span>
          )}
          <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#16A34A]/10 border border-[#16A34A]/25 text-[#16A34A] text-[9.5px] font-bold">
            <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />
            <span>Saved</span>
          </div>
        </div>
      </div>

      {/* Center: Aspect Ratio Switcher with Visual Device Icons */}
      <div className="flex items-center gap-0.5 sm:gap-1 bg-[#FAF7F5] p-0.5 sm:p-1 rounded-xl border border-[#2F3020]/15 shadow-2xs">
        <button
          type="button"
          onClick={() => onSetAspectRatio('9:16')}
          className={cn(
            'px-1.5 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer',
            aspectRatio === '9:16'
              ? 'bg-[#16A34A] text-white shadow-xs'
              : 'text-[#2F3020]/70 hover:text-[#2F3020] hover:bg-black/5'
          )}
          title="9:16 Vertical (Reels, TikTok, Shorts)"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">9:16</span>
        </button>

        <button
          type="button"
          onClick={() => onSetAspectRatio('16:9')}
          className={cn(
            'px-1.5 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer',
            aspectRatio === '16:9'
              ? 'bg-[#16A34A] text-white shadow-xs'
              : 'text-[#2F3020]/70 hover:text-[#2F3020] hover:bg-black/5'
          )}
          title="16:9 Widescreen (YouTube, Landscape)"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">16:9</span>
        </button>

        <button
          type="button"
          onClick={() => onSetAspectRatio('1:1')}
          className={cn(
            'px-1.5 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer',
            aspectRatio === '1:1'
              ? 'bg-[#16A34A] text-white shadow-xs'
              : 'text-[#2F3020]/70 hover:text-[#2F3020] hover:bg-black/5'
          )}
          title="1:1 Square (Instagram Posts, Feed)"
        >
          <Square className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">1:1</span>
        </button>
      </div>

      {/* Right: Actions (Safe Zone, Shortcuts, Export) */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={onToggleSafeZone}
          className={cn(
            'p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer',
            safeZone
              ? 'bg-[#16A34A] text-white border-[#16A34A]'
              : 'bg-[#FAF7F5] text-[#2F3020]/80 border-[#2F3020]/15 hover:bg-[#DBD8E3]'
          )}
          title="Toggle TikTok / Reels UI safe zone guidelines"
        >
          <Shield className="w-4 h-4" />
          <span className="hidden md:inline">Safe Zone</span>
        </button>

        <button
          type="button"
          onClick={onOpenShortcuts}
          aria-label="Keyboard Shortcuts"
          className="p-1.5 rounded-lg text-[#2F3020]/70 hover:text-[#2F3020] hover:bg-[#DBD8E3] border border-transparent hover:border-[#2F3020]/15 transition-colors cursor-pointer"
          title="Keyboard Shortcuts (?)"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onOpenExport}
          className="px-3 sm:px-4 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
}
