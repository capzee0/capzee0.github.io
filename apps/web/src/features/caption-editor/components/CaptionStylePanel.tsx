import { useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import type { CaptionStyle, CaptionPreset } from '@capzee/contracts';
import { CaptionPresetGallery } from './CaptionPresetGallery';
import { CaptionStyleControls } from './CaptionStyleControls';
import { Sparkles, Sliders } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CaptionStylePanel() {
  const { captionStyle, setCaptionStyle } = useProjectStore();
  const [activeTab, setActiveTab] = useState<'presets' | 'customize'>('presets');

  function handleSelectPreset(preset: CaptionPreset) {
    setCaptionStyle({
      ...preset,
      aspectRatio: captionStyle.aspectRatio,
    });
  }

  function handleCustomChange(patch: Partial<CaptionStyle>) {
    setCaptionStyle(patch);
  }

  return (
    <div className="p-3 space-y-3.5 overflow-auto bg-[#CDCBD6] text-[#2F3020]">
      {/* Top Tab Bar: Preset Library vs Custom Tuning */}
      <div className="flex bg-[#FAF7F5] p-1 rounded-xl border border-[#2F3020]/15 gap-1">
        <button
          onClick={() => setActiveTab('presets')}
          className={cn(
            "flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
            activeTab === 'presets'
              ? "bg-[#16A34A] text-white shadow-xs"
              : "text-[#2F3020]/80 hover:text-[#2F3020] hover:bg-[#CDCBD6]/40"
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Preset Library
        </button>
        <button
          onClick={() => setActiveTab('customize')}
          className={cn(
            "flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
            activeTab === 'customize'
              ? "bg-[#16A34A] text-white shadow-xs"
              : "text-[#2F3020]/80 hover:text-[#2F3020] hover:bg-[#CDCBD6]/40"
          )}
        >
          <Sliders className="w-3.5 h-3.5" />
          Customize Style
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'presets' ? (
        <CaptionPresetGallery
          selectedPresetId={captionStyle.id}
          onSelectPreset={handleSelectPreset}
        />
      ) : (
        <CaptionStyleControls
          captionStyle={captionStyle}
          onChange={handleCustomChange}
        />
      )}
    </div>
  );
}
