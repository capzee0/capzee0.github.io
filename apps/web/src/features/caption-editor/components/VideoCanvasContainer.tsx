import React from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CaptionOverlay } from './CaptionOverlay';
import { SafeZoneOverlay } from './SafeZoneOverlay';
import type { AspectRatio, Segment, CaptionStyle } from '@capzee/contracts';

interface VideoCanvasContainerProps {
  aspectRatio: AspectRatio;
  videoSrc: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  activeSegment: Segment | null;
  activeWordIndex: number;
  captionStyle: CaptionStyle;
  safeZone: boolean;
  onPositionChange: (offsetY: number) => void;
  onSelectLocalVideo: (file: File) => void;
}

export function VideoCanvasContainer({
  aspectRatio,
  videoSrc,
  videoRef,
  activeSegment,
  activeWordIndex,
  captionStyle,
  safeZone,
  onPositionChange,
  onSelectLocalVideo,
}: VideoCanvasContainerProps) {
  return (
    <div className="bg-[#D96846] relative flex flex-col items-center justify-center p-2 sm:p-3 overflow-hidden min-w-0 min-h-0 flex-1 w-full h-full">
      {/* Subtle dotted organic studio grid */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#2F3020 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Video Container (Responsive aspect frame) */}
      <div className="flex-1 w-full min-h-0 flex items-center justify-center relative overflow-hidden py-1">
        <div
          className={cn(
            'relative bg-black rounded-2xl overflow-hidden border-2 border-[#2F3020]/30 shadow-2xl flex items-center justify-center select-none max-h-full',
            aspectRatio === '9:16' && 'h-full max-h-[92%] aspect-[9/16] w-auto',
            aspectRatio === '16:9' && 'w-[94%] max-w-[800px] aspect-[16/9] max-h-full',
            aspectRatio === '1:1' && 'h-full max-h-[92%] aspect-square w-auto'
          )}
        >
          {videoSrc ? (
            <>
              <video
                ref={videoRef as React.RefObject<HTMLVideoElement>}
                src={videoSrc}
                playsInline
                crossOrigin="anonymous"
                className="w-full h-full object-contain bg-black"
                onError={() => {
                  console.warn('Video failed to play from source:', videoSrc);
                }}
              />

              {/* Animated CapCut Captions Overlay */}
              {activeSegment && (
                <CaptionOverlay
                  segment={activeSegment}
                  activeWordIndex={activeWordIndex}
                  style={captionStyle}
                  onPositionChange={onPositionChange}
                />
              )}

              {/* Safe Zone Overlay */}
              <SafeZoneOverlay visible={safeZone} />
            </>
          ) : (
            /* Virtual Studio Canvas Preview (Allows previewing animated captions even without video file) */
            <div className="relative w-full h-full bg-gradient-to-b from-[#2F3020] via-black to-[#2F3020] flex items-center justify-center overflow-hidden">
              {/* Dynamic backdrop grid & light beam */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(#16A34A 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />
              <div className="absolute top-1/4 w-40 h-40 bg-[#16A34A]/15 rounded-full blur-3xl pointer-events-none" />

              {/* Top banner: Virtual Preview Mode */}
              <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
                <span className="text-[10px] font-mono font-bold text-white/90 bg-[#2F3020]/80 backdrop-blur-xs px-2 py-0.5 rounded-full border border-white/10 shadow-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                  Studio Preview
                </span>
                <label className="pointer-events-auto bg-[#16A34A] hover:bg-[#15803D] text-white text-[10px] font-bold py-1 px-2.5 rounded-full shadow-xs cursor-pointer flex items-center gap-1 transition-all hover:scale-105 active:scale-95">
                  <Upload className="w-3 h-3" />
                  Add Video
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onSelectLocalVideo(file);
                      }
                    }}
                  />
                </label>
              </div>

              {/* Live Preview Subtitles rendered directly on the virtual stage */}
              {activeSegment ? (
                <CaptionOverlay
                  segment={activeSegment}
                  activeWordIndex={activeWordIndex}
                  style={captionStyle}
                  onPositionChange={onPositionChange}
                />
              ) : (
                <div className="text-center p-6 text-[#CDCBD6]/60 pointer-events-none">
                  <p className="text-sm font-bold text-white/80 tracking-wide uppercase font-mono">
                    Virtual Studio Canvas
                  </p>
                  <p className="text-xs text-[#CDCBD6]/60 mt-1 max-w-[200px] mx-auto">
                    Press Play or spacebar to preview animated viral subtitles live.
                  </p>
                </div>
              )}

              {/* Safe Zone Overlay */}
              <SafeZoneOverlay visible={safeZone} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
