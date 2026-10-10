import { type CaptionStyle, type Segment } from '@capzee/contracts';

interface CaptionOverlayProps {
  segment: Segment;
  activeWordIndex: number;
  style: CaptionStyle;
}

/**
 * Renders the active caption segment as an overlay on the video.
 * Uses inline styles from the CaptionStyle schema.
 */
export function CaptionOverlay({ segment, activeWordIndex, style }: CaptionOverlayProps) {
  const hasWords = (segment.words?.length ?? 0) > 0;

  // Build position styles
  const vertical = style.position.vertical;
  const horizontal = style.position.horizontal;

  const positionStyle: React.CSSProperties = {
    position: 'absolute',
    left: horizontal === 'left' ? '5%' : horizontal === 'right' ? 'auto' : '50%',
    right: horizontal === 'right' ? '5%' : 'auto',
    transform: horizontal === 'center' ? `translateX(-50%)` : undefined,
    bottom: vertical === 'bottom' ? `${style.safeAreaMarginPercent + Math.abs(style.position.offsetY)}%` : 'auto',
    top: vertical === 'top' ? `${style.safeAreaMarginPercent + Math.abs(style.position.offsetY)}%` : 'auto',
    textAlign: style.textAlign,
    maxWidth: '90%',
    padding: '4px 8px',
  };

  const textStyle: React.CSSProperties = {
    fontFamily: style.fontFamily,
    fontSize: `clamp(14px, ${style.fontSize * 0.04}vw + 8px, ${style.fontSize}px)`,
    fontWeight: style.fontWeight,
    color: style.textColor,
    lineHeight: style.lineHeightMultiplier,
    textShadow:
      style.outlineWidth > 0
        ? `${style.outlineWidth}px ${style.outlineWidth}px 0 ${style.outlineColor},
           -${style.outlineWidth}px ${style.outlineWidth}px 0 ${style.outlineColor},
           ${style.outlineWidth}px -${style.outlineWidth}px 0 ${style.outlineColor},
           -${style.outlineWidth}px -${style.outlineWidth}px 0 ${style.outlineColor}`
        : style.shadow.enabled
        ? `${style.shadow.offsetX}px ${style.shadow.offsetY}px ${style.shadow.blur}px ${style.shadow.color}`
        : undefined,
  };

  const backgroundStyle: React.CSSProperties =
    style.backgroundStyle === 'pill' || style.backgroundStyle === 'box'
      ? {
          backgroundColor: style.backgroundColor
            ? hexToRgba(style.backgroundColor, style.backgroundOpacity)
            : 'rgba(0,0,0,0.7)',
          borderRadius: style.backgroundStyle === 'pill' ? '9999px' : '6px',
          padding: '4px 12px',
          display: 'inline-block',
        }
      : {};

  function renderWords() {
    if (!hasWords || style.animationMode === 'phrase') {
      return <span style={textStyle}>{segment.text}</span>;
    }

    return (
      <span style={{ ...textStyle }}>
        {segment.words!.map((word, i) => {
          const isActive = i === activeWordIndex;
          return (
            <span
              key={word.id}
              style={{
                color: isActive ? style.activeWordColor : style.textColor,
                transform: isActive ? 'scale(1.14)' : 'scale(1.0)',
                display: 'inline-block',
                transition: 'all 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              }}
            >
              {word.text}{i < segment.words!.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </span>
    );
  }

  return (
    <div style={positionStyle} className="pointer-events-none select-none">
      <div style={backgroundStyle}>
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
