import type { Transcript } from '../schemas/transcript.js';
import type { CaptionStyle, CaptionPreset } from '../presets/captionPresetTypes.js';

export function formatASSTime(seconds: number): string {
  const totalCs = Math.max(0, Math.round(seconds * 100));
  const hours = Math.floor(totalCs / 360000);
  const minutes = Math.floor((totalCs % 360000) / 6000);
  const secs = Math.floor((totalCs % 6000) / 100);
  const cs = totalCs % 100;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export function hexToASSColor(hexColor?: string, defaultColor = '&H00FFFFFF'): string {
  if (!hexColor || !hexColor.startsWith('#')) return defaultColor;
  const c = hexColor.replace('#', '');
  if (c.length === 6) {
    const r = c.slice(0, 2);
    const g = c.slice(2, 4);
    const b = c.slice(4, 6);
    return `&H00${b}${g}${r}`.toUpperCase();
  } else if (c.length === 8) {
    const r = c.slice(0, 2);
    const g = c.slice(2, 4);
    const b = c.slice(4, 6);
    const a = c.slice(6, 8);
    return `&H${a}${b}${g}${r}`.toUpperCase();
  }
  return defaultColor;
}

export function generateASS(
  transcript: Transcript,
  style?: Partial<CaptionStyle> | Partial<CaptionPreset>
): string {
  const fontName = style?.fontFamily ? `${style.fontFamily}, Noto Sans Tamil, sans-serif` : 'Noto Sans Tamil, Inter, sans-serif';
  const fontSize = style?.fontSize || 32;
  const primaryColor = hexToASSColor(style?.textColor, '&H00FFFFFF');
  const highlightColor = hexToASSColor(style?.activeWordColor, '&H0015CAFA');
  const outlineColor = hexToASSColor(style?.outlineColor, '&H00000000');
  const backColor = hexToASSColor(style?.backgroundColor, '&H80000000');
  const outlineWidth = style?.outlineWidth ?? 2;
  const shadowDepth = style?.shadow?.enabled ? 2 : 0;
  const bold =
    style?.fontWeight === 'bold' ||
    style?.fontWeight === '700' ||
    style?.fontWeight === '800' ||
    style?.fontWeight === '900'
      ? -1
      : 0;

  const posV = style?.position?.vertical || 'bottom';
  const alignment = posV === 'bottom' ? 2 : posV === 'top' ? 8 : 5;
  const offsetY = style?.position?.offsetY || 0;
  const marginV = Math.max(20, Math.round(50 + offsetY * 5));

  const lines: string[] = [
    '[Script Info]',
    'ScriptType: v4.00+',
    'PlayResX: 1080',
    'PlayResY: 1920',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Default,${fontName},${fontSize},${primaryColor},${highlightColor},${outlineColor},${backColor},${bold},0,0,0,100,100,0,0,1,${outlineWidth},${shadowDepth},${alignment},20,20,${marginV},1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];

  const uppercase = Boolean(style?.uppercase);
  const animMode = style?.animationMode || 'phrase';

  for (const seg of transcript.segments) {
    const words = seg.words || [];
    if (words.length > 0 && (animMode === 'word-by-word' || animMode === 'karaoke')) {
      const CHUNK_SIZE = 3;
      for (let i = 0; i < words.length; i += CHUNK_SIZE) {
        const chunk = words.slice(i, i + CHUNK_SIZE);
        for (let activeIdx = 0; activeIdx < chunk.length; activeIdx++) {
          const w = chunk[activeIdx];
          const wStart = formatASSTime(w.start);
          const wEnd = formatASSTime(w.end);
          const formattedChunk = chunk
            .map((item, idx) => {
              const text = uppercase ? item.text.toUpperCase() : item.text;
              return idx === activeIdx ? `{\\c${highlightColor}&}${text}{\\c${primaryColor}&}` : text;
            })
            .join(' ');
          lines.push(`Dialogue: 0,${wStart},${wEnd},Default,,0,0,0,,${formattedChunk}`);
        }
      }
    } else {
      const startT = formatASSTime(seg.start);
      const endT = formatASSTime(seg.end);
      const text = (uppercase ? seg.text.toUpperCase() : seg.text).replace(/\\n/g, '\\N');
      lines.push(`Dialogue: 0,${startT},${endT},Default,,0,0,0,,${text}`);
    }
  }

  return lines.join('\n');
}
