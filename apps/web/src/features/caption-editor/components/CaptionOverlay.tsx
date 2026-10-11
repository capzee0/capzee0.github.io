import { type CaptionStyle, type CaptionPreset, type Segment } from '@capzee/contracts';

interface CaptionOverlayProps {
  segment: Segment;
  activeWordIndex: number;
  style: CaptionStyle | CaptionPreset;
  onPositionChange?: (offsetY: number) => void;
}

/**
 * Renders the active caption segment as an overlay on the video.
 * Supports live styling and interactive drag positioning on the video canvas.
 */
export function CaptionOverlay({ segment, activeWordIndex, style, onPositionChange }: CaptionOverlayProps) {
  const hasWords = (segment.words?.length ?? 0) > 0;

  // Build position styles with safe defaults
  const vertical = style?.position?.vertical || 'bottom';
  const horizontal = style?.position?.horizontal || 'center';
  const safeAreaMargin = style?.safeAreaMarginPercent ?? 12;
  const offsetY = style?.position?.offsetY || 0;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!onPositionChange) return;
    e.preventDefault();
    const startY = e.clientY;
    const initialOffset = offsetY;

    const onMouseMove = (ev: MouseEvent) => {
      const deltaY = ev.clientY - startY;
      // Convert pixel delta to percentage of typical container height (~400-600px)
      const percentDelta = Math.round((deltaY / 400) * 100);
      const newOffset = Math.max(-40, Math.min(40, initialOffset - percentDelta));
      onPositionChange(newOffset);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const positionStyle: React.CSSProperties = {
    position: 'absolute',
    left: horizontal === 'left' ? '6%' : horizontal === 'right' ? 'auto' : '0',
    right: horizontal === 'right' ? '6%' : horizontal === 'left' ? 'auto' : '0',
    margin: horizontal === 'center' ? '0 auto' : undefined,
    width: 'fit-content',
    maxWidth: '86%',
    bottom:
      vertical === 'bottom'
        ? `${Math.max(8, safeAreaMargin + offsetY)}%`
        : 'auto',
    top:
      vertical === 'top'
        ? `${Math.max(8, safeAreaMargin + offsetY)}%`
        : vertical === 'center'
        ? `${50 + offsetY}%`
        : 'auto',
    transform: vertical === 'center' ? 'translateY(-50%)' : undefined,
    textAlign: style?.textAlign || 'center',
    padding: '2px 6px',
    display: 'flex',
    justifyContent:
      horizontal === 'left'
        ? 'flex-start'
        : horizontal === 'right'
        ? 'flex-end'
        : 'center',
    zIndex: 35,
    pointerEvents: 'auto',
  };

  // Proportional font scaling for video canvas
  // Maps preset's 8-64px range down to a clean, readable preview range (down to 8px for compact styles)
  const baseSize = style?.fontSize || 24;
  const previewFontSize = Math.max(8, Math.min(36, Math.round(baseSize * 0.52)));

  const textStyle: React.CSSProperties = {
    fontFamily: `${style?.fontFamily || 'Inter'}, 'Noto Sans Tamil', 'Latha', system-ui, sans-serif`,
    fontSize: `${previewFontSize}px`,
    fontWeight: style?.fontWeight || '800',
    color: style?.textColor || '#FFFFFF',
    lineHeight: 1.25,
    wordBreak: 'normal',
    overflowWrap: 'normal',
    whiteSpace: 'normal',
    textAlign: style?.textAlign || 'center',
    textShadow:
      (style?.outlineWidth || 0) > 0
        ? `${Math.max(1, Math.round(style.outlineWidth * 0.55))}px ${Math.max(1, Math.round(style.outlineWidth * 0.55))}px 0 ${style.outlineColor || '#000000'},
           -${Math.max(1, Math.round(style.outlineWidth * 0.55))}px ${Math.max(1, Math.round(style.outlineWidth * 0.55))}px 0 ${style.outlineColor || '#000000'},
           ${Math.max(1, Math.round(style.outlineWidth * 0.55))}px -${Math.max(1, Math.round(style.outlineWidth * 0.55))}px 0 ${style.outlineColor || '#000000'},
           -${Math.max(1, Math.round(style.outlineWidth * 0.55))}px -${Math.max(1, Math.round(style.outlineWidth * 0.55))}px 0 ${style.outlineColor || '#000000'}`
        : style?.shadow?.enabled
        ? `${style.shadow.offsetX}px ${style.shadow.offsetY}px ${style.shadow.blur}px ${style.shadow.color}`
        : '0 2px 4px rgba(0,0,0,0.8)',
  };

  const hasBg = style?.backgroundStyle === 'pill' || style?.backgroundStyle === 'box';
  const backgroundStyle: React.CSSProperties = hasBg
    ? {
        backgroundColor: style?.backgroundColor
          ? hexToRgba(style.backgroundColor, style.backgroundOpacity ?? 0.85)
          : 'rgba(18, 18, 20, 0.85)',
        borderRadius: style?.backgroundStyle === 'pill' ? '12px' : '6px',
        padding: '4px 10px',
        display: 'inline-flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        columnGap: '5px',
        rowGap: '2px',
        maxWidth: '100%',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      }
    : {
        display: 'inline-flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        columnGap: '5px',
        rowGap: '2px',
        maxWidth: '100%',
      };

  function renderWords() {
    const isScriptLessons = style?.animationEffect === 'script-lessons' || style?.id === 'script-lessons';
    const isCenterScript = style?.animationEffect === 'center-script' || style?.id === 'center-script';
    const isLyricalPop = style?.animationEffect === 'lyrical-pop' || style?.id === 'lyrical-pop';

    const effect = style?.animationEffect || style?.id;

    if (!hasWords || style?.animationMode === 'phrase') {
      if (isScriptLessons) {
        const parts = segment.text.trim().split(/\s+/);
        const first = parts[0] || '';
        const rest = parts.slice(1, 4).join(' ');
        return (
          <span style={textStyle} className="inline-flex items-center justify-center gap-1.5 leading-snug text-center flex-wrap">
            <span
              style={{ fontFamily: style?.scriptFont || "'Great Vibes', 'Alex Brush', 'Dancing Script', cursive" }}
              className="text-white text-[1.2em] italic leading-none font-normal drop-shadow"
            >
              {first}
            </span>
            {rest && (
              <span className="text-[#EF4444] font-black uppercase tracking-wider text-[0.92em]">
                {rest}
              </span>
            )}
          </span>
        );
      }

      if (isCenterScript) {
        const parts = segment.text.trim().split(/\s+/).slice(0, 4);
        const midIdx = Math.max(0, Math.floor((parts.length - 1) / 2));
        const before = parts.slice(0, midIdx).join(' ');
        const center = parts[midIdx] || '';
        const after = parts.slice(midIdx + 1).join(' ');
        return (
          <span style={textStyle} className="inline-flex items-center justify-center gap-1.5 text-center flex-wrap">
            {before && <span className="text-white font-bold">{style?.uppercase ? before.toUpperCase() : before}</span>}
            <span
              style={{
                fontFamily: style?.scriptFont || "'Dancing Script', 'Great Vibes', cursive",
                textShadow: '0 0 10px rgba(239, 68, 68, 0.85)',
              }}
              className="text-[#EF4444] text-[1.22em] italic font-bold leading-none mx-0.5"
            >
              {style?.uppercase ? center.toUpperCase() : center}
            </span>
            {after && <span className="text-white font-bold">{style?.uppercase ? after.toUpperCase() : after}</span>}
          </span>
        );
      }

      if (isLyricalPop) {
        const words = segment.text.trim().split(/\s+/).slice(0, 4);
        return (
          <div style={textStyle} className="flex items-center justify-center gap-x-1.5 text-center flex-wrap">
            {words.map((word, wIdx) => (
              <span key={wIdx} className="text-white font-semibold">
                {style?.uppercase ? word.toUpperCase() : word}
              </span>
            ))}
          </div>
        );
      }

      let phraseClass = "text-center font-bold tracking-wide";
      if (effect === 'whisper-fade') phraseClass = "text-center font-bold tracking-widest uppercase anim-whisper-fade";
      else if (effect === 'rise-and-settle') phraseClass = "text-center font-bold anim-rise-settle";
      else if (effect === 'blur-in') phraseClass = "text-center font-bold anim-blur-in";
      else if (effect === 'mask-wipe') phraseClass = "text-center font-bold uppercase anim-mask-wipe";
      else if (effect === 'underline-sweep') phraseClass = "text-center font-bold anim-underline-sweep pb-1";
      else if (effect === 'slide-up') phraseClass = "text-center font-bold anim-slide-up";
      else if (effect === 'fade-in') phraseClass = "text-center font-bold anim-fade-in";
      else if (effect === 'zoom-statistic') phraseClass = "text-center font-black anim-zoom-statistic";
      else if (effect === 'lower-third') phraseClass = "text-left font-bold px-2.5 py-1 bg-[#0F172A]/90 border-l-4 border-[#16A34A] rounded text-white shadow-lg text-[0.9em]";

      const displayPhrase = style?.uppercase ? segment.text.toUpperCase() : segment.text;
      return (
        <span style={textStyle} className={phraseClass}>
          {displayPhrase}
        </span>
      );
    }

    // ─── CapCut Style Word Windowing (2 to 3 words per screen) ────────────────
    const allWords = segment.words || [];
    const CHUNK_SIZE = 3; // Maximum words displayed at once (prevents screen flooding)
    
    let visibleWords: Array<{ word: typeof allWords[0]; index: number }>;
    if (allWords.length > CHUNK_SIZE && activeWordIndex >= 0) {
      const chunkIdx = Math.floor(activeWordIndex / CHUNK_SIZE);
      const startIdx = chunkIdx * CHUNK_SIZE;
      const endIdx = Math.min(allWords.length, startIdx + CHUNK_SIZE);
      visibleWords = allWords.slice(startIdx, endIdx).map((w, subIdx) => ({
        word: w,
        index: startIdx + subIdx,
      }));
    } else if (allWords.length > CHUNK_SIZE && activeWordIndex === -1) {
      visibleWords = allWords.slice(0, CHUNK_SIZE).map((w, subIdx) => ({
        word: w,
        index: subIdx,
      }));
    } else {
      visibleWords = allWords.map((w, idx) => ({ word: w, index: idx }));
    }

    // Active word index: if paused or seeking (activeWordIndex === -1), highlight first visible word
    // so user immediately sees the preset color and style in real-time!
    const effectiveActiveIndex = activeWordIndex >= 0 ? activeWordIndex : (visibleWords[0]?.index ?? 0);

    // Lyrical Pop
    if (isLyricalPop) {
      return (
        <div style={textStyle} className="flex items-center justify-center gap-x-2 text-center flex-wrap">
          {visibleWords.map(({ word, index }) => {
            const isActive = index === effectiveActiveIndex;
            const displayText = style?.uppercase ? word.text.toUpperCase() : word.text;
            return (
              <span
                key={word.id || index}
                style={{
                  color: isActive ? '#16A34A' : '#FFFFFF',
                  transform: isActive ? 'scale(1.1)' : 'scale(1.0)',
                  transition: 'all 0.1s ease-out',
                }}
                className={isActive ? 'font-black drop-shadow text-[#16A34A] inline-block whitespace-nowrap' : 'font-semibold inline-block whitespace-nowrap'}
              >
                {displayText}
              </span>
            );
          })}
        </div>
      );
    }

    return (
      <span style={textStyle} className="inline-flex flex-wrap justify-center items-center gap-x-1.5 gap-y-0.5 text-center">
        {visibleWords.map(({ word, index }, subIdx) => {
          const isActive = index === effectiveActiveIndex;
          const isChunkFirst = subIdx === 0;
          const displayText = style?.uppercase ? word.text.toUpperCase() : word.text;

          // Script Lessons styling: first word of chunk is cursive script white, rest is bold red uppercase
          if (isScriptLessons) {
            if (isChunkFirst) {
              return (
                <span
                  key={word.id || index}
                  style={{
                    fontFamily: style?.scriptFont || "'Great Vibes', 'Alex Brush', 'Dancing Script', cursive",
                    transform: isActive ? 'scale(1.08)' : 'scale(1.0)',
                    transition: 'all 0.1s ease-out',
                  }}
                  className="text-white text-[1.2em] italic font-normal inline-block whitespace-nowrap mr-0.5 leading-none drop-shadow"
                >
                  {word.text}
                </span>
              );
            }
            return (
              <span
                key={word.id || index}
                style={{
                  color: isActive ? '#FFFFFF' : '#EF4444',
                  transform: isActive ? 'scale(1.08)' : 'scale(1.0)',
                  transition: 'all 0.1s ease-out',
                }}
                className="font-black uppercase tracking-wider inline-block whitespace-nowrap text-[0.92em]"
              >
                {word.text}
              </span>
            );
          }

          // Center Script styling: active word is glowing red cursive script
          if (isCenterScript) {
            if (isActive) {
              return (
                <span
                  key={word.id || index}
                  style={{
                    fontFamily: style?.scriptFont || "'Dancing Script', 'Playfair Display', cursive",
                    color: '#EF4444',
                    textShadow: '0 0 10px rgba(239, 68, 68, 0.85)',
                    transform: 'scale(1.12)',
                    transition: 'all 0.1s ease-out',
                  }}
                  className="text-[1.22em] italic font-bold inline-block whitespace-nowrap mx-0.5"
                >
                  {displayText}
                </span>
              );
            }
            return (
              <span
                key={word.id || index}
                style={{
                  color: '#FFFFFF',
                  transform: 'scale(1.0)',
                }}
                className="font-bold inline-block whitespace-nowrap text-[0.95em]"
              >
                {displayText}
              </span>
            );
          }

          // Dynamic Animation Effects per Word
          if (isActive) {
            let activeAnimClass = "font-black drop-shadow inline-block whitespace-nowrap";
            if (effect === 'kinetic-pop') activeAnimClass = "anim-kinetic-pop font-black inline-block whitespace-nowrap drop-shadow";
            else if (effect === 'kinetic-slam') activeAnimClass = "anim-kinetic-slam font-black inline-block whitespace-nowrap drop-shadow";
            else if (effect === 'word-bounce') activeAnimClass = "anim-word-bounce font-black inline-block whitespace-nowrap";
            else if (effect === 'glitch-caption') activeAnimClass = "anim-glitch font-black inline-block whitespace-nowrap";
            else if (effect === 'shake-caption') activeAnimClass = "anim-shake font-black inline-block whitespace-nowrap";
            else if (effect === 'zoom-caption') activeAnimClass = "anim-zoom-pulse font-black inline-block whitespace-nowrap";
            else if (effect === 'neon-glow') activeAnimClass = "anim-neon-pulse font-black inline-block whitespace-nowrap";
            else if (effect === 'zoom-statistic') activeAnimClass = "anim-zoom-statistic font-black inline-block whitespace-nowrap";
            else if (effect === 'pill-karaoke') activeAnimClass = "bg-[#16A34A]/25 px-1.5 py-0.5 rounded-md font-black inline-block whitespace-nowrap text-[#16A34A]";
            else if (effect === 'gradient-highlight') activeAnimClass = "bg-gradient-to-r from-[#F59E0B] to-[#EF4444] bg-clip-text text-transparent font-black inline-block whitespace-nowrap";

            return (
              <span
                key={word.id || index}
                style={{
                  color: effect === 'gradient-highlight' ? undefined : (style?.activeWordColor || '#FFDF00'),
                  transform: !['kinetic-pop', 'kinetic-slam', 'word-bounce', 'zoom-caption'].includes(effect) ? 'scale(1.08)' : undefined,
                  transition: 'all 0.1s ease-out',
                }}
                className={activeAnimClass}
              >
                {displayText}
              </span>
            );
          }

          // Inactive Word Default
          return (
            <span
              key={word.id || index}
              style={{
                color: style?.textColor || '#FFFFFF',
                transform: 'scale(1.0)',
                display: 'inline-block',
                whiteSpace: 'nowrap',
              }}
              className="font-bold opacity-90"
            >
              {displayText}
            </span>
          );
        })}
      </span>
    );
  }

  return (
    <div
      style={positionStyle}
      onMouseDown={handleMouseDown}
      className="group select-none cursor-move pointer-events-auto"
      title="Click and drag vertically to position subtitle"
    >
      <div
        style={backgroundStyle}
        className="group-hover:ring-1 group-hover:ring-[#16A34A]/80 group-hover:ring-dashed transition-shadow rounded-sm relative"
      >
        {renderWords()}
      </div>
    </div>
  );
}

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
