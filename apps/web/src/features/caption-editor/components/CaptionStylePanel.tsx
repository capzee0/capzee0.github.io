import { useProjectStore } from '@/stores/projectStore';
import { CAPTION_PRESETS } from '@capzee/contracts';
import type { CaptionStyle } from '@capzee/contracts';
import { cn } from '@/lib/utils';

const FONT_FAMILIES = ['Inter', 'Montserrat', 'Georgia', 'Roboto', 'Arial', 'Courier New'];
const ASPECT_RATIOS = [
  { value: '9:16', label: '9:16 Vertical' },
  { value: '16:9', label: '16:9 Landscape' },
  { value: '1:1',  label: '1:1 Square' },
] as const;
const ANIMATION_MODES = [
  { value: 'phrase',       label: 'Phrase' },
  { value: 'word-by-word', label: 'Word by Word' },
  { value: 'karaoke',      label: 'Karaoke' },
  { value: 'none',         label: 'None' },
] as const;

export function CaptionStylePanel() {
  const { captionStyle, setCaptionStyle } = useProjectStore();

  function applyPreset(preset: Omit<CaptionStyle, 'aspectRatio'>) {
    setCaptionStyle({ ...preset, aspectRatio: captionStyle.aspectRatio });
  }

  return (
    <div className="p-4 space-y-5 overflow-auto">
      {/* Presets */}
      <section>
        <p className="label mb-2">Presets</p>
        <div className="grid grid-cols-2 gap-1.5">
          {CAPTION_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset as Omit<CaptionStyle, 'aspectRatio'>)}
              className={cn(
                'px-2 py-1.5 rounded text-xs text-left transition-all duration-150 truncate',
                captionStyle.id === preset.id
                  ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/40'
                  : 'bg-surface-DEFAULT hover:bg-surface-hover text-text-secondary border border-surface-border'
              )}
              title={preset.name}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* Aspect ratio */}
      <section>
        <p className="label mb-2">Aspect Ratio</p>
        <div className="flex gap-1.5">
          {ASPECT_RATIOS.map(({ value }) => (
            <button
              key={value}
              onClick={() => setCaptionStyle({ aspectRatio: value })}
              className={cn(
                'flex-1 py-1.5 rounded text-xs font-medium transition-all',
                captionStyle.aspectRatio === value
                  ? 'bg-accent-blue text-white'
                  : 'bg-surface-DEFAULT text-text-secondary hover:bg-surface-hover border border-surface-border'
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* Animation mode */}
      <section>
        <label className="label" htmlFor="animation-mode">Animation</label>
        <select
          id="animation-mode"
          className="input text-sm"
          value={captionStyle.animationMode}
          onChange={(e) => setCaptionStyle({ animationMode: e.target.value as CaptionStyle['animationMode'] })}
        >
          {ANIMATION_MODES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </section>

      {/* Font */}
      <section>
        <label className="label" htmlFor="font-family">Font</label>
        <select
          id="font-family"
          className="input text-sm"
          value={captionStyle.fontFamily}
          onChange={(e) => setCaptionStyle({ fontFamily: e.target.value })}
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </section>

      {/* Font size */}
      <section>
        <div className="flex justify-between items-center mb-1">
          <label className="label" htmlFor="font-size">Font Size</label>
          <span className="text-xs text-text-muted">{captionStyle.fontSize}px</span>
        </div>
        <input
          id="font-size"
          type="range"
          min={12}
          max={80}
          value={captionStyle.fontSize}
          onChange={(e) => setCaptionStyle({ fontSize: parseInt(e.target.value) })}
          className="w-full accent-accent-blue"
        />
      </section>

      {/* Font weight */}
      <section>
        <label className="label" htmlFor="font-weight">Font Weight</label>
        <select
          id="font-weight"
          className="input text-sm"
          value={captionStyle.fontWeight}
          onChange={(e) => setCaptionStyle({ fontWeight: e.target.value as CaptionStyle['fontWeight'] })}
        >
          {['400', '600', '700', '800', '900'].map((w) => (
            <option key={w} value={w}>{w === '400' ? 'Normal' : w === '600' ? 'Semi-bold' : w === '700' ? 'Bold' : w === '800' ? 'Extra Bold' : 'Black'}</option>
          ))}
        </select>
      </section>

      {/* Colors */}
      <section>
        <p className="label mb-2">Colors</p>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <label className="text-xs text-text-secondary w-20 flex-shrink-0" htmlFor="text-color">Text</label>
            <input
              id="text-color"
              type="color"
              value={captionStyle.textColor}
              onChange={(e) => setCaptionStyle({ textColor: e.target.value })}
              className="w-8 h-7 rounded cursor-pointer bg-transparent border-0"
            />
            <code className="text-xs text-text-muted">{captionStyle.textColor}</code>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-text-secondary w-20 flex-shrink-0" htmlFor="active-color">Active Word</label>
            <input
              id="active-color"
              type="color"
              value={captionStyle.activeWordColor}
              onChange={(e) => setCaptionStyle({ activeWordColor: e.target.value })}
              className="w-8 h-7 rounded cursor-pointer bg-transparent border-0"
            />
            <code className="text-xs text-text-muted">{captionStyle.activeWordColor}</code>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-text-secondary w-20 flex-shrink-0" htmlFor="outline-color">Outline</label>
            <input
              id="outline-color"
              type="color"
              value={captionStyle.outlineColor}
              onChange={(e) => setCaptionStyle({ outlineColor: e.target.value })}
              className="w-8 h-7 rounded cursor-pointer bg-transparent border-0"
            />
            <span className="text-xs text-text-muted">
              <input
                type="range"
                min={0}
                max={8}
                value={captionStyle.outlineWidth}
                onChange={(e) => setCaptionStyle({ outlineWidth: parseInt(e.target.value) })}
                className="accent-accent-blue w-16"
              />
              {captionStyle.outlineWidth}px
            </span>
          </div>
        </div>
      </section>

      {/* Position */}
      <section>
        <p className="label mb-2">Position</p>
        <div className="grid grid-cols-3 gap-1">
          {(['top', 'center', 'bottom'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setCaptionStyle({ position: { ...captionStyle.position, vertical: v } })}
              className={cn(
                'py-1 rounded text-xs capitalize transition-colors',
                captionStyle.position.vertical === v
                  ? 'bg-accent-blue text-white'
                  : 'bg-surface-DEFAULT text-text-secondary hover:bg-surface-hover border border-surface-border'
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </section>

      {/* Background */}
      <section>
        <label className="label" htmlFor="bg-style">Background</label>
        <select
          id="bg-style"
          className="input text-sm"
          value={captionStyle.backgroundStyle}
          onChange={(e) => setCaptionStyle({ backgroundStyle: e.target.value as CaptionStyle['backgroundStyle'] })}
        >
          <option value="none">None</option>
          <option value="pill">Pill</option>
          <option value="box">Box</option>
          <option value="blur">Blur</option>
        </select>
      </section>

      {/* Max line length */}
      <section>
        <div className="flex justify-between items-center mb-1">
          <label className="label" htmlFor="max-line">Max line length</label>
          <span className="text-xs text-text-muted">{captionStyle.maxLineLength} chars</span>
        </div>
        <input
          id="max-line"
          type="range"
          min={20}
          max={80}
          value={captionStyle.maxLineLength}
          onChange={(e) => setCaptionStyle({ maxLineLength: parseInt(e.target.value) })}
          className="w-full accent-accent-blue"
        />
      </section>
    </div>
  );
}
