import { useId } from 'react';
import type { CaptionStyle, CaptionPreset } from '@capzee/contracts';
import { CAPTION_PRESETS } from '@capzee/contracts';
import { cn } from '@/lib/utils';
import { RotateCcw } from 'lucide-react';

interface CaptionStyleControlsProps {
  captionStyle: CaptionStyle;
  onChange: (patch: Partial<CaptionStyle>) => void;
  idPrefix?: string;
}

const FONT_FAMILIES = [
  'Inter',
  'Montserrat',
  'Playfair Display',
  'Dancing Script',
  'Great Vibes',
  'Oswald',
  'JetBrains Mono',
  'Georgia',
  'Roboto',
  'Arial',
];

const ASPECT_RATIOS = [
  { value: '9:16', label: '9:16 Vertical' },
  { value: '16:9', label: '16:9 Landscape' },
  { value: '1:1', label: '1:1 Square' },
] as const;

const ANIMATION_MODES = [
  { value: 'karaoke', label: 'Karaoke Active Word' },
  { value: 'word-by-word', label: 'Word by Word Reveal' },
  { value: 'phrase', label: 'Whole Phrase' },
  { value: 'none', label: 'Static None' },
] as const;

export function CaptionStyleControls({
  captionStyle,
  onChange,
  idPrefix,
}: CaptionStyleControlsProps) {
  const reactId = useId();
  const cleanReactId = reactId.replace(/[^a-zA-Z0-9_-]/g, '');
  const baseId = idPrefix ? `${idPrefix}-ctrl` : `ctrl-${cleanReactId}`;
  const fontId = `${baseId}-font`;
  const weightId = `${baseId}-weight`;
  const sizeId = `${baseId}-size`;
  const textColorId = `${baseId}-text-color`;
  const activeColorId = `${baseId}-active-color`;
  const outlineWidthId = `${baseId}-outline-width`;
  const bgId = `${baseId}-bg`;
  const animId = `${baseId}-anim`;

  function handleResetToDefaults() {
    const defaultPreset = (CAPTION_PRESETS as CaptionPreset[]).find(
      (p) => p.id === captionStyle.id
    ) || CAPTION_PRESETS[0];

    onChange({
      ...defaultPreset,
      aspectRatio: captionStyle.aspectRatio,
    });
  }

  return (
    <div className="space-y-4 text-[#2F3020]">
      {/* Reset to Defaults Action Bar */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#2F3020]/15">
        <span className="text-xs font-bold text-[#2F3020] uppercase tracking-wider">
          Style Customization
        </span>
        <button
          onClick={handleResetToDefaults}
          className="text-xs font-semibold text-[#16A34A] hover:text-[#15803D] flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Reset current style to its preset defaults"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Defaults
        </button>
      </div>

      {/* Aspect Ratio */}
      <section className="space-y-1.5">
        <label className="text-xs font-bold text-[#2F3020]/90">Aspect Ratio</label>
        <div className="flex gap-1.5">
          {ASPECT_RATIOS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onChange({ aspectRatio: value })}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                captionStyle.aspectRatio === value
                  ? 'bg-[#16A34A] text-white shadow-xs'
                  : 'bg-white text-[#2F3020]/70 hover:text-[#2F3020] border border-[#2F3020]/15 shadow-2xs'
              )}
            >
              {label.split(' ')[0]}
            </button>
          ))}
        </div>
      </section>

      {/* Typography: Font & Weight */}
      <section className="space-y-2.5">
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-bold text-[#2F3020]/90" htmlFor={fontId}>
              Font Family
            </label>
            <select
              id={fontId}
              value={captionStyle.fontFamily}
              onChange={(e) => onChange({ fontFamily: e.target.value })}
              className="mt-1 w-full text-xs py-2 px-2.5 bg-white border border-[#2F3020]/20 rounded-xl text-[#2F3020] font-medium focus:outline-none focus:border-[#16A34A] cursor-pointer shadow-2xs"
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f} value={f} className="bg-white text-[#2F3020]">{f}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[#2F3020]/90" htmlFor={weightId}>
              Weight
            </label>
            <select
              id={weightId}
              value={captionStyle.fontWeight}
              onChange={(e) => onChange({ fontWeight: e.target.value as CaptionStyle['fontWeight'] })}
              className="mt-1 w-full text-xs py-2 px-2.5 bg-white border border-[#2F3020]/20 rounded-xl text-[#2F3020] font-medium focus:outline-none focus:border-[#16A34A] cursor-pointer shadow-2xs"
            >
              {['400', '600', '700', '800', '900'].map((w) => (
                <option key={w} value={w} className="bg-white text-[#2F3020]">
                  {w === '400' ? 'Regular' : w === '600' ? 'Semi-bold' : w === '700' ? 'Bold' : w === '800' ? 'Extra Bold' : 'Black (900)'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Font Size */}
        <div className="bg-white p-2.5 rounded-xl border border-[#2F3020]/15 shadow-2xs">
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-bold text-[#2F3020]/90" htmlFor={sizeId}>
              Font Size
            </label>
            <span className="text-xs font-mono font-bold text-[#16A34A] bg-[#16A34A]/10 px-2 py-0.5 rounded border border-[#16A34A]/30">
              {captionStyle.fontSize}px
            </span>
          </div>
          <input
            id={sizeId}
            type="range"
            min={8}
            max={64}
            value={captionStyle.fontSize}
            onChange={(e) => onChange({ fontSize: parseInt(e.target.value) })}
            className="w-full accent-[#16A34A] cursor-pointer"
          />
          {/* Quick Size Shortcuts */}
          <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-[#2F3020]/10">
            {[
              { label: 'XS', size: 10 },
              { label: 'S', size: 14 },
              { label: 'M', size: 22 },
              { label: 'L', size: 30 },
              { label: 'XL', size: 42 },
            ].map(({ label, size }) => (
              <button
                key={label}
                type="button"
                onClick={() => onChange({ fontSize: size })}
                className={cn(
                  "flex-1 py-1 rounded text-[10px] font-bold font-mono transition-all cursor-pointer border",
                  captionStyle.fontSize === size
                    ? "bg-[#16A34A] text-white border-[#16A34A] shadow-xs"
                    : "bg-[#FAF7F5] text-[#2F3020]/75 border-[#2F3020]/15 hover:border-[#16A34A] hover:text-[#16A34A]"
                )}
                title={`Set font size to ${size}px`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Colors */}
      <section className="space-y-2.5 bg-white p-3 rounded-xl border border-[#2F3020]/15 shadow-2xs">
        <label className="text-xs font-bold text-[#2F3020]/90 uppercase tracking-wide">Color & Highlight</label>
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
          <div className="flex items-center gap-2.5 bg-[#FAF7F5] p-2 rounded-lg border border-[#2F3020]/15 shadow-2xs">
            <input
              id={textColorId}
              type="color"
              value={captionStyle.textColor}
              onChange={(e) => onChange({ textColor: e.target.value })}
              className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
              aria-label="Text fill color"
            />
            <label htmlFor={textColorId} className="text-[11px] leading-tight cursor-pointer">
              <p className="font-bold text-[#2F3020]">Text Fill</p>
              <span className="font-mono text-[#2F3020]/50 text-[10px] uppercase">{captionStyle.textColor}</span>
            </label>
          </div>

          <div className="flex items-center gap-2.5 bg-[#FAF7F5] p-2 rounded-lg border border-[#2F3020]/15 shadow-2xs">
            <input
              id={activeColorId}
              type="color"
              value={captionStyle.activeWordColor}
              onChange={(e) => onChange({ activeWordColor: e.target.value })}
              className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
              aria-label="Active word color"
            />
            <label htmlFor={activeColorId} className="text-[11px] leading-tight cursor-pointer">
              <p className="font-bold text-[#16A34A]">Active Word</p>
              <span className="font-mono text-[#2F3020]/50 text-[10px] uppercase">{captionStyle.activeWordColor}</span>
            </label>
          </div>
        </div>

        {/* Outline width */}
        <div className="pt-2 border-t border-[#2F3020]/10 flex items-center justify-between gap-2">
          <label htmlFor={outlineWidthId} className="text-xs font-semibold text-[#2F3020]/80 cursor-pointer">Stroke Outline</label>
          <div className="flex items-center gap-2">
            <input
              id={outlineWidthId}
              type="range"
              min={0}
              max={6}
              value={captionStyle.outlineWidth}
              onChange={(e) => onChange({ outlineWidth: parseInt(e.target.value) })}
              className="w-20 accent-[#16A34A] cursor-pointer"
            />
            <span className="text-xs font-mono font-bold w-7 text-right text-[#16A34A]">{captionStyle.outlineWidth}px</span>
          </div>
        </div>
      </section>

      {/* Position Vertical */}
      <section className="space-y-1.5">
        <label className="text-xs font-bold text-[#2F3020]/90">Vertical Placement</label>
        <div className="grid grid-cols-3 gap-1.5">
          {(['top', 'center', 'bottom'] as const).map((v) => (
            <button
              key={v}
              onClick={() => onChange({ position: { ...captionStyle.position, vertical: v } })}
              className={cn(
                'py-1.5 rounded-lg text-xs capitalize transition-all font-semibold cursor-pointer',
                captionStyle.position.vertical === v
                  ? 'bg-[#16A34A] text-white shadow-xs'
                  : 'bg-white text-[#2F3020]/70 hover:text-[#2F3020] border border-[#2F3020]/15 shadow-2xs'
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </section>

      {/* Background Style */}
      <section className="space-y-1.5">
        <label className="text-xs font-bold text-[#2F3020]/90" htmlFor={bgId}>
          Background Container
        </label>
        <select
          id={bgId}
          value={captionStyle.backgroundStyle}
          onChange={(e) => onChange({ backgroundStyle: e.target.value as CaptionStyle['backgroundStyle'] })}
          className="w-full text-xs py-2 px-2.5 bg-white border border-[#2F3020]/20 rounded-xl text-[#2F3020] font-medium focus:outline-none focus:border-[#16A34A] cursor-pointer shadow-2xs"
        >
          <option value="none" className="bg-white text-[#2F3020]">None (Transparent)</option>
          <option value="pill" className="bg-white text-[#2F3020]">Pill (Rounded Badge)</option>
          <option value="box" className="bg-white text-[#2F3020]">Box (Solid Block)</option>
          <option value="blur" className="bg-white text-[#2F3020]">Blur (Glassmorphism)</option>
        </select>
      </section>

      {/* Animation Timing Mode */}
      <section className="space-y-1.5">
        <label className="text-xs font-bold text-[#2F3020]/90" htmlFor={animId}>
          Playback Animation Sync
        </label>
        <select
          id={animId}
          value={captionStyle.animationMode}
          onChange={(e) => onChange({ animationMode: e.target.value as CaptionStyle['animationMode'] })}
          className="w-full text-xs py-2 px-2.5 bg-white border border-[#2F3020]/20 rounded-xl text-[#2F3020] font-medium focus:outline-none focus:border-[#16A34A] cursor-pointer shadow-2xs"
        >
          {ANIMATION_MODES.map(({ value, label }) => (
            <option key={value} value={value} className="bg-white text-[#2F3020]">{label}</option>
          ))}
        </select>
      </section>
    </div>
  );
}
