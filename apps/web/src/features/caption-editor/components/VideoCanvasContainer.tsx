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
    <div className="bg-[#D96846] relative flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden min-w-0 min-h-0 flex-1 w-full h-full select-none">
      {/* Subtle organic studio texture pattern */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#2F3020 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Video Container (Responsive aspect frame) */}
      <div className="flex-1 w-full min-h-0 flex items-center justify-center relative overflow-hidden py-1">
        <div
          className={cn(
            'group relative bg-black rounded-3xl overflow-hidden border-2 border-[#2F3020]/40 shadow-2xl flex items-center justify-center select-none max-h-full transition-all duration-300',
            aspectRatio === '9:16' && 'h-full max-h-[94%] aspect-[9/16] w-auto',
            aspectRatio === '16:9' && 'w-[96%] max-w-[850px] aspect-[16/9] max-h-full',
            aspectRatio === '1:1' && 'h-full max-h-[94%] aspect-square w-auto'
          )}
        >
          {/* Studio Monitor Viewfinder Corner Guides */}
          <div className="absolute top-2.5 left-2.5 w-3 h-3 border-t-2 border-l-2 border-white/40 pointer-events-none z-30" />
          <div className="absolute top-2.5 right-2.5 w-3 h-3 border-t-2 border-r-2 border-white/40 pointer-events-none z-30" />
          <div className="absolute bottom-2.5 left-2.5 w-3 h-3 border-b-2 border-l-2 border-white/40 pointer-events-none z-30" />
          <div className="absolute bottom-2.5 right-2.5 w-3 h-3 border-b-2 border-r-2 border-white/40 pointer-events-none z-30" />

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
              <div className="absolute top-1/4 w-44 h-44 bg-[#16A34A]/15 rounded-full blur-3xl pointer-events-none" />

              {/* Top banner: Virtual Preview Mode */}
              <div className="absolute top-3.5 left-3.5 right-3.5 z-30 flex items-center justify-between pointer-events-none">
                <span className="text-[10px] font-mono font-bold text-white/95 bg-[#2F3020]/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                  <span>Preview Studio</span>
                </span>
                <label className="pointer-events-auto bg-[#16A34A] hover:bg-[#15803D] active:scale-95 text-white text-[10.5px] font-bold py-1.5 px-3 rounded-full shadow-md cursor-pointer flex items-center gap-1.5 transition-all hover:scale-105">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Load Video</span>
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
                <div className="text-center p-6 text-[#CDCBD6]/75 pointer-events-none">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <span className="text-xl">✨</span>
                  </div>
                  <p className="text-xs sm:text-sm font-extrabold text-white tracking-wider uppercase font-mono">
                    Virtual Studio Canvas
                  </p>
                  <p className="text-[11px] sm:text-xs text-[#CDCBD6]/75 mt-1.5 max-w-[220px] mx-auto leading-relaxed">
                    Press Spacebar or Play on the timeline to preview dynamic viral animations.
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
