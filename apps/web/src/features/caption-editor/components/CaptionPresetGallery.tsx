import { CAPTION_PRESETS, type CaptionPreset } from '@capzee/contracts';
import { CaptionPresetCard } from './CaptionPresetCard';
import { cn } from '@/lib/utils';

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
  return (
    <div className={cn("grid grid-cols-2 gap-2.5", className)}>
      {(CAPTION_PRESETS as CaptionPreset[]).map((preset) => (
        <CaptionPresetCard
          key={preset.id}
          preset={preset}
          isSelected={selectedPresetId === preset.id}
          onSelect={onSelectPreset}
          viewMode="grid"
        />
      ))}
    </div>
  );
}
