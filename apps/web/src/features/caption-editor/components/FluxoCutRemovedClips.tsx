import { Scissors, Play, RotateCcw } from 'lucide-react';
import type { RemovedClip } from '@/services/api';

interface FluxoCutRemovedClipsProps {
  removedClips: RemovedClip[];
  onRestoreClip: (clipId: string) => void;
  onPreviewClip: (start: number) => void;
}

export function FluxoCutRemovedClips({
  removedClips,
  onRestoreClip,
  onPreviewClip,
}: FluxoCutRemovedClipsProps) {
  return (
    <div className="flex flex-col h-full bg-[#CDCBD6] text-[#2F3020] p-3 select-none overflow-y-auto font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-1 border-b border-[#2F3020]/15">
        <h2 className="text-xs font-extrabold text-[#2F3020] tracking-tight">
          Removed clips
        </h2>
        {removedClips.length > 0 && (
          <span className="text-[10px] font-mono bg-[#16A34A] text-white px-2 py-0.5 rounded-full font-bold shadow-xs">
            {removedClips.length} cut
          </span>
        )}
      </div>

      {/* Empty State */}
      {removedClips.length === 0 ? (
        <div className="border border-dashed border-[#2F3020]/25 rounded-lg p-4 flex flex-col items-center justify-center text-center mt-2 bg-[#FAF7F5]/60">
          <div className="w-8 h-8 rounded-full bg-[#FAF7F5] border border-[#2F3020]/15 flex items-center justify-center text-[#16A34A] mb-2 shadow-xs">
            <Scissors className="w-4 h-4 text-[#16A34A]" />
          </div>
          <p className="text-[11px] text-[#2F3020]/75 leading-relaxed font-medium">
            Run Silence or Auto-Trim — cut pause sections will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 mt-1">
          {removedClips.map((clip) => (
            <div
              key={clip.id}
              className="bg-[#FAF7F5] border border-[#2F3020]/15 hover:border-[#16A34A] rounded-lg p-3 transition-colors shadow-sm"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono font-bold text-[#D96846]">
                  {clip.start.toFixed(1)}s - {clip.end.toFixed(1)}s
                </span>
                <span className="text-[10px] font-mono font-bold text-[#16A34A]">
                  -{clip.duration.toFixed(1)}s
                </span>
              </div>
              <p className="text-xs text-[#2F3020]/80 mb-2.5 truncate font-medium" title={clip.reason}>
                {clip.reason}
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onPreviewClip(clip.start)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-[#2F3020] hover:text-white bg-[#CDCBD6] hover:bg-[#16A34A] rounded flex items-center gap-1 transition-colors"
                >
                  <Play className="w-3 h-3" />
                  Play
                </button>
                <button
                  type="button"
                  onClick={() => onRestoreClip(clip.id)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded flex items-center gap-1 transition-colors shadow-sm"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restore
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
