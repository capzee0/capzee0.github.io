import type { CaptionPreset } from '@capzee/contracts';
import { cn } from '@/lib/utils';
import { Heart } from 'lucide-react';

interface CaptionPresetCardProps {
  preset: CaptionPreset;
  isSelected: boolean;
  onSelect: (preset: CaptionPreset) => void;
  viewMode?: 'grid' | 'strip';
}

export function CaptionPresetCard({
  preset,
  isSelected,
  onSelect,
  viewMode = 'grid',
}: CaptionPresetCardProps) {
  const isMinimalNone = preset.id === 'none';

  function renderCardPreview() {
    const effect = preset.animationEffect;
    const sample = preset.sampleText || preset.name;

    switch (effect) {
      case 'script-lessons':
        return (
          <div className="flex flex-col items-center justify-center leading-none text-center">
            <span
              style={{ fontFamily: "'Great Vibes', 'Alex Brush', 'Dancing Script', cursive" }}
              className="text-white text-3xl font-normal italic leading-none drop-shadow"
            >
              Are
            </span>
            <span className="text-[#EF4444] font-black uppercase text-[11px] tracking-wider mt-1 font-sans">
              THE REAL LESSONS
            </span>
          </div>
        );

      case 'center-script':
        return (
          <div className="text-white text-xs font-medium flex items-center justify-center gap-1 text-center font-sans">
            <span>tum ek</span>
            <span
              style={{ fontFamily: "'Dancing Script', 'Great Vibes', cursive" }}
              className="text-[#EF4444] text-xl italic font-bold leading-none mx-0.5 drop-shadow-[0_0_10px_rgba(239,68,68,0.9)]"
            >
              video
            </span>
            <span>banao</span>
          </div>
        );

      case 'lyrical-pop':
        return (
          <div className="text-white text-xs leading-relaxed font-medium text-center font-sans space-y-0.5">
            <div>zaroorat</div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-[#16A34A] font-bold">hi</span>
              <span>nahi</span>
            </div>
            <div>hai.</div>
          </div>
        );

      case 'kinetic-pop':
        return (
          <div className="flex items-center justify-center gap-1.5 font-sans font-black text-xs uppercase tracking-wider text-center">
            <span className="text-white">LEVEL</span>
            <span className="text-[#FFDF00] anim-kinetic-pop drop-shadow">UP</span>
            <span className="text-white">NOW</span>
          </div>
        );

      case 'kinetic-slam':
        return (
          <div className="flex items-center justify-center gap-1.5 font-sans font-black text-xs uppercase tracking-wider text-center">
            <span className="text-white">DON'T</span>
            <span className="text-[#EF4444] anim-kinetic-slam drop-shadow-[0_2px_8px_rgba(239,68,68,0.7)]">SLAM</span>
          </div>
        );

      case 'word-bounce':
        return (
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-center font-sans">
            <span className="text-white">Keep</span>
            <span className="text-[#16A34A] anim-word-bounce font-black">bouncing</span>
            <span className="text-white">high</span>
          </div>
        );

      case 'glitch-caption':
        return (
          <div className="text-xs font-black uppercase tracking-wider text-center font-sans">
            <span className="text-[#00F0FF] anim-glitch inline-block">CYBER GLITCH</span>
          </div>
        );

      case 'shake-caption':
        return (
          <div className="text-xs font-black uppercase tracking-wider text-center font-sans">
            <span className="text-[#F59E0B] anim-shake inline-block">INTENSE SHAKE</span>
          </div>
        );

      case 'zoom-caption':
        return (
          <div className="text-xs font-extrabold text-center font-sans">
            <span className="text-[#38BDF8] anim-zoom-pulse inline-block">Focus Zoom</span>
          </div>
        );

      case 'karaoke-highlight':
        return (
          <div className="flex items-center justify-center gap-1 text-xs font-extrabold text-center font-sans">
            <span className="text-white">Sing</span>
            <span className="text-[#FFDF00] scale-110 drop-shadow transition-transform font-black">along</span>
            <span className="text-white">now</span>
          </div>
        );

      case 'karaoke-fill':
        return (
          <div className="flex items-center justify-center gap-1 text-xs font-extrabold text-center font-sans">
            <span className="text-gray-400">Feel</span>
            <span className="text-[#10B981] font-black drop-shadow">the</span>
            <span className="text-white">rhythm</span>
          </div>
        );

      case 'pill-karaoke':
        return (
          <div className="px-2.5 py-1 rounded-full bg-[#2F3020] border border-white/20 flex items-center gap-1.5 text-[11px] font-black uppercase font-sans">
            <span className="text-white">CLEAR</span>
            <span className="text-[#16A34A] bg-[#16A34A]/20 px-1 rounded">FOCUS</span>
          </div>
        );

      case 'neon-glow':
        return (
          <div className="text-xs font-black uppercase tracking-wider text-center font-sans">
            <span className="text-[#00F0FF] anim-neon-pulse inline-block">NEON PULSE</span>
          </div>
        );

      case 'gradient-highlight':
        return (
          <div className="text-xs font-black uppercase tracking-wider text-center font-sans">
            <span className="bg-gradient-to-r from-[#F59E0B] to-[#EF4444] bg-clip-text text-transparent font-black">
              GOLDEN HOUR
            </span>
          </div>
        );

      case 'whisper-fade':
        return (
          <div
            style={{ fontFamily: "'Playfair Display', serif" }}
            className="text-xs italic text-gray-200 tracking-widest uppercase anim-whisper-fade"
          >
            Whisper Fade
          </div>
        );

      case 'rise-and-settle':
        return (
          <div className="text-xs font-semibold text-white tracking-wide anim-rise-settle font-sans">
            Rise and Settle
          </div>
        );

      case 'letter-cascade':
        return (
          <div className="text-xs font-black uppercase tracking-wider font-sans text-center">
            <span className="text-white">C</span>
            <span className="text-[#FBBF24]">A</span>
            <span className="text-white">S</span>
            <span className="text-[#FBBF24]">C</span>
            <span className="text-white">A</span>
            <span className="text-white">D</span>
            <span className="text-white">E</span>
          </div>
        );

      case 'blur-in':
        return (
          <div className="text-xs font-bold text-white anim-blur-in font-sans">
            Blur Into Focus
          </div>
        );

      case 'mask-wipe':
        return (
          <div className="text-xs font-black uppercase tracking-wider text-white anim-mask-wipe font-sans">
            MASK WIPE
          </div>
        );

      case 'underline-sweep':
        return (
          <div className="text-xs font-black uppercase tracking-wider text-white anim-underline-sweep font-sans pb-1">
            KEY TAKEAWAY
          </div>
        );

      case 'editorial-emphasis':
        return (
          <div
            style={{ fontFamily: "'Playfair Display', serif" }}
            className="text-xs italic font-bold text-center text-white"
          >
            <span>The </span>
            <span className="text-[#FFDF00] underline decoration-[#FFDF00]/60">essential</span>
            <span> distinction</span>
          </div>
        );

      case 'lower-third':
        return (
          <div className="px-2.5 py-1 rounded bg-[#0F172A] border-l-2 border-[#16A34A] text-[10px] font-bold uppercase text-white tracking-wider">
            EXCLUSIVE INTERVIEW
          </div>
        );

      case 'zoom-statistic':
        return (
          <div className="text-xs font-black uppercase tracking-wider text-[#16A34A] anim-zoom-statistic font-sans">
            +150% GROWTH
          </div>
        );

      case 'typewriter-reveal':
        return (
          <div className="px-2 py-0.5 rounded bg-[#0F172A] border border-emerald-500/30 text-[10px] font-mono text-emerald-400">
            command_exec<span className="animate-pulse">_</span>
          </div>
        );

      case 'bold-outline':
        return (
          <div
            style={{
              textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
            }}
            className="text-xs font-black uppercase tracking-wider text-[#FFDF00] font-sans"
          >
            BOLD OUTLINE
          </div>
        );

      case 'none':
      default:
        return (
          <div className="text-white text-xs font-medium tracking-normal text-center font-sans">
            {sample}
          </div>
        );
    }
  }

  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={`Select ${preset.name} preset`}
      onClick={() => onSelect(preset)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(preset);
        }
      }}
      className={cn(
        "group cursor-pointer flex flex-col gap-1.5 transition-all select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A]",
        viewMode === 'strip' ? "min-w-[170px] w-[170px] flex-shrink-0 snap-start" : "w-full"
      )}
    >
      {/* Visual Thumbnail Card */}
      <div
        className={cn(
          "relative h-28 w-full rounded-2xl bg-[#2F3020] border flex flex-col items-center justify-center p-3 overflow-hidden transition-all duration-200 shadow-sm",
          isSelected
            ? "border-[#16A34A] ring-2 ring-[#16A34A]/80 shadow-md shadow-[#16A34A]/25 scale-[1.02]"
            : "border-[#2F3020]/30 hover:border-[#2F3020]/60 hover:shadow-md"
        )}
      >
        {/* Heart Active Indicator Badge in Top Right */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#FAF7F5] border border-[#16A34A]/50 flex items-center justify-center shadow-xs">
            <Heart className="w-3 h-3 fill-[#16A34A] text-[#16A34A]" />
          </div>
        )}

        {/* Category Badge in Top Left */}
        <span className="absolute top-2 left-2 text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-white/15 text-white/90 group-hover:text-white">
          {preset.category}
        </span>

        {/* Dynamic Card Typography Preview */}
        <div className="mt-2.5">
          {renderCardPreview()}
        </div>
      </div>

      {/* Bottom Label and Dot */}
      <div className="flex items-center gap-1.5 px-1">
        {!isMinimalNone && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] flex-shrink-0" />
        )}
        <span
          className={cn(
            "text-xs truncate transition-colors",
            !isMinimalNone ? "text-[#2F3020] font-semibold group-hover:text-[#16A34A]" : "text-[#2F3020]/70 font-medium group-hover:text-[#2F3020]",
            isSelected && "text-[#16A34A] font-extrabold"
          )}
        >
          {preset.name}
        </span>
      </div>

      {/* Short descriptive tooltip or subtitle */}
      <p className="text-[10px] text-[#2F3020]/65 px-1 truncate leading-tight font-medium">
        {preset.description}
      </p>
    </div>
  );
}
