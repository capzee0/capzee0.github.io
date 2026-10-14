import { useState, useMemo } from 'react';
import { CAPTION_PRESETS, type CaptionPreset } from '@capzee/contracts';
import { CaptionPresetCard } from './CaptionPresetCard';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';

interface CaptionPresetGalleryProps {
  selectedPresetId: string;
  onSelectPreset: (preset: CaptionPreset) => void;
  className?: string;
}

export function CaptionPresetGallery({
  selectedPresetId,
  onSelectPreset,
  className,
}: CaptionPresetGalleryProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredPresets = useMemo(() => {
    return (CAPTION_PRESETS as CaptionPreset[]).filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase().trim()) ||
        p.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase().trim()));
      if (!matchesSearch) return false;
      if (selectedCategory === 'all') return true;
      return p.category === selectedCategory;
    });
  }, [search, selectedCategory]);

  return (
    <div className="flex flex-col gap-3">
      {/* Search & Categories */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#2F3020]/50 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search 20+ viral styles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#FAF7F5] border border-[#2F3020]/20 rounded-xl pl-8 pr-7 py-1.5 text-xs font-semibold text-[#2F3020] placeholder:text-[#2F3020]/50 focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] shadow-2xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#2F3020]/50 hover:text-[#2F3020]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none [scrollbar-width:none]">
          {(['all', 'social', 'cinematic', 'bilingual'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[10.5px] font-bold capitalize transition-all shrink-0 cursor-pointer',
                selectedCategory === cat
                  ? 'bg-[#16A34A] text-white shadow-xs'
                  : 'bg-[#FAF7F5] text-[#2F3020]/75 hover:text-[#2F3020] border border-[#2F3020]/15'
              )}
            >
              {cat === 'all' ? 'All Styles' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Preset Grid */}
      <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2.5", className)}>
        {filteredPresets.map((preset) => (
          <CaptionPresetCard
            key={preset.id}
            preset={preset}
            isSelected={selectedPresetId === preset.id}
            onSelect={onSelectPreset}
            viewMode="grid"
          />
        ))}
      </div>
    </div>
  );
}
