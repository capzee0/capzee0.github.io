import { useRef, useEffect, useState, useMemo } from 'react';
import {
  ZoomIn, ZoomOut, Maximize2,
  Undo2, Redo2, Scissors, Trash2,
  RotateCcw, RotateCw, Play, Pause,
  Clock, Type, Volume2, Volume1, VolumeX
} from 'lucide-react';
import type { Transcript, Segment } from '@capzee/contracts';

interface FluxoCutTimelineProps {
  currentTime: number;
  duration: number;
  playing: boolean;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  videoElement: HTMLVideoElement | null;
  transcript: Transcript | null;
  activeSegment: Segment | null;
  onSplit?: () => void;
  onDelete?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onSelectSegment?: (segment: Segment) => void;
  onUpdateSegmentTime?: (segId: string, newStart: number, newEnd: number) => void;
  onSkipBack?: () => void;
  onSkipForward?: () => void;
}

export function FluxoCutTimeline({
  currentTime,
  duration,
  playing,
  onSeek,
  onTogglePlay,
  videoElement,
  transcript,
  activeSegment,
  onSplit,
  onDelete,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onSelectSegment,
  onUpdateSegmentTime,
  onSkipBack,
  onSkipForward,
}: FluxoCutTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  // Synchronize playback speed, volume, and mute states to the video element
  useEffect(() => {
    if (videoElement) {
      videoElement.playbackRate = playbackSpeed;
      videoElement.muted = isMuted;
      videoElement.volume = isMuted ? 0 : volume;
    }
  }, [videoElement, playbackSpeed, isMuted, volume]);

  // Keyboard shortcut: 'M' toggles mute
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (e.key === 'm' || e.key === 'M') {
        setIsMuted((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const safeDuration = duration > 0 ? duration : 20.5;

  // Format digital timecode (e.g. 00:03.2 / 00:20.5)
  const formatTimecode = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const tenths = Math.floor((sec % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
  };

  // Draw authentic dual-sided emerald audio waveform
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const centerY = height / 2;

    // Subtle 0dB acoustic baseline
    ctx.strokeStyle = 'rgba(47, 48, 32, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Vibrant Emerald gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#22C55E');
    gradient.addColorStop(0.3, '#16A34A');
    gradient.addColorStop(0.5, '#15803D');
    gradient.addColorStop(0.7, '#16A34A');
    gradient.addColorStop(1, '#22C55E');

    ctx.fillStyle = gradient;

    // Draw speech-aligned dual-sided acoustic audio waveform bars
    const barWidth = 2.5;
    const barGap = 1.2;
    const totalBars = Math.floor(width / (barWidth + barGap));

    for (let i = 0; i < totalBars; i++) {
      const barTime = (i / totalBars) * safeDuration;

      let energy = 0.12; // ambient noise floor
      if (transcript?.segments && transcript.segments.length > 0) {
        for (const seg of transcript.segments) {
          if (barTime >= seg.start && barTime <= seg.end) {
            // Natural speech pattern with amplitude modulation & attack/decay
            const speechProgress = (barTime - seg.start) / Math.max(0.1, seg.end - seg.start);
            const attackDecay = Math.sin(speechProgress * Math.PI);
            const microNoise = 0.5 + 0.5 * Math.abs(Math.sin(i * 0.75) * Math.cos(i * 0.35));
            energy = 0.25 + 0.68 * attackDecay * microNoise;
            break;
          }
        }
      } else {
        energy = 0.25 + 0.5 * Math.abs(Math.sin(i * 0.4) * Math.cos(i * 0.25));
      }

      const amplitude = Math.max(2, (energy * (height - 4)) / 2);
      const x = i * (barWidth + barGap);
      const y = centerY - amplitude;
      const barHeight = amplitude * 2;

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 1);
      ctx.fill();
    }
  }, [transcript, safeDuration, zoom]);

  // Timeline dragging / scrubbing handler
  const isScrubbingRef = useRef(false);

  const seekFromClientX = (clientX: number) => {
    if (!timelineRef.current) return;
    const el = timelineRef.current;
    const rect = el.getBoundingClientRect();
    const scrollLeft = el.scrollLeft || 0;
    const contentWidth = el.scrollWidth || (rect.width * Math.max(1, zoom));
    const clickX = Math.max(0, Math.min(contentWidth, (clientX - rect.left) + scrollLeft));
    const percentage = clickX / contentWidth;
    const targetTime = Math.max(0, Math.min(safeDuration, percentage * safeDuration));
    onSeek(targetTime);
  };

  const handleMouseDownTimeline = (e: React.MouseEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    isScrubbingRef.current = true;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    seekFromClientX(e.clientX);

    const onMouseMove = (ev: globalThis.MouseEvent) => {
      if (isScrubbingRef.current) {
        seekFromClientX(ev.clientX);
      }
    };

    const onMouseUp = () => {
      isScrubbingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTouchStartTimeline = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return;
    isScrubbingRef.current = true;
    seekFromClientX(e.touches[0].clientX);

    const onTouchMove = (ev: TouchEvent) => {
      if (isScrubbingRef.current && ev.touches.length > 0) {
        seekFromClientX(ev.touches[0].clientX);
      }
    };

    const onTouchEnd = () => {
      isScrubbingRef.current = false;
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
  };

  const handleTrimStart = (e: React.MouseEvent, seg: Segment) => {
    e.stopPropagation();
    if (!timelineRef.current || !onUpdateSegmentTime) return;
    const el = timelineRef.current;
    const rect = el.getBoundingClientRect();
    const contentWidth = el.scrollWidth || (rect.width * Math.max(1, zoom));
    const initialStart = seg.start;
    const startX = e.clientX;

    const onMouseMove = (ev: globalThis.MouseEvent) => {
      const deltaX = ev.clientX - startX;
      const deltaTime = (deltaX / contentWidth) * safeDuration;
      const newStart = Math.max(0, Math.min(seg.end - 0.2, initialStart + deltaTime));
      onUpdateSegmentTime(seg.id, Number(newStart.toFixed(2)), seg.end);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTrimEnd = (e: React.MouseEvent, seg: Segment) => {
    e.stopPropagation();
    if (!timelineRef.current || !onUpdateSegmentTime) return;
    const el = timelineRef.current;
    const rect = el.getBoundingClientRect();
    const contentWidth = el.scrollWidth || (rect.width * Math.max(1, zoom));
    const initialEnd = seg.end;
    const startX = e.clientX;

    const onMouseMove = (ev: globalThis.MouseEvent) => {
      const deltaX = ev.clientX - startX;
      const deltaTime = (deltaX / contentWidth) * safeDuration;
      const newEnd = Math.max(seg.start + 0.2, Math.min(safeDuration, initialEnd + deltaTime));
      onUpdateSegmentTime(seg.id, seg.start, Number(newEnd.toFixed(2)));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const playheadPercent = Math.min(100, Math.max(0, (currentTime / safeDuration) * 100));

  // Time ruler intervals
  const rulerTicks = useMemo(() => {
    const ticks: Array<{ time: number; label: string; percent: number }> = [];
    const step = safeDuration > 60 ? 10 : 5;
    for (let t = 0; t <= safeDuration; t += step) {
      ticks.push({
        time: t,
        label: `00:${t.toString().padStart(2, '0')}`,
        percent: (t / safeDuration) * 100,
      });
    }
    return ticks;
  }, [safeDuration]);

    return (
    <div className="h-full w-full bg-[#CDCBD6] select-none flex flex-col font-sans text-[#2F3020] overflow-hidden">
      {/* ── Top Bar: Timeline Editing Tools & Track Zoom ── */}
      <div className="flex items-center justify-between px-2 sm:px-3 py-1 sm:py-1.5 border-b border-[#2F3020]/15 bg-[#FAF7F5] flex-shrink-0 gap-1 overflow-x-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Left: History, Split, Playback Pill, Delete */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {/* Quick Edit Actions: Undo / Redo */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-1 sm:p-1.5 rounded transition-colors ${canUndo ? 'hover:text-[#16A34A] text-[#2F3020]/80 cursor-pointer hover:bg-[#CDCBD6]/50' : 'text-[#2F3020]/30 cursor-not-allowed'}`}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-1 sm:p-1.5 rounded transition-colors ${canRedo ? 'hover:text-[#16A34A] text-[#2F3020]/80 cursor-pointer hover:bg-[#CDCBD6]/50' : 'text-[#2F3020]/30 cursor-not-allowed'}`}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-3.5 w-px bg-[#2F3020]/15 mx-0.5" />

          {/* Split button */}
          <button
            onClick={onSplit}
            className="flex items-center gap-1 px-1.5 sm:px-2 py-1 text-xs text-[#2F3020]/80 hover:text-[#16A34A] hover:bg-[#CDCBD6]/50 rounded font-semibold transition-colors cursor-pointer"
            title="Split Segment at Current Time (S)"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span className="text-[10px] hidden xs:inline">Split</span>
          </button>

          <div className="h-3.5 w-px bg-[#2F3020]/15 mx-0.5" />

          {/* ── Playback Controls Pill ── */}
          <div className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 bg-white border border-[#2F3020]/20 rounded-full shadow-2xs">
            {/* Skip Back -1s */}
            <button
              onClick={onSkipBack ? onSkipBack : () => onSeek(Math.max(0, currentTime - 1))}
              className="p-1 rounded-full text-[#2F3020]/75 hover:text-[#16A34A] hover:bg-[#CDCBD6]/40 transition-colors cursor-pointer"
              title="Rewind 1s (Left Arrow)"
            >
              <RotateCcw className="w-3 h-3" />
            </button>

            {/* Play / Pause Toggle */}
            <button
              onClick={onTogglePlay}
              className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full bg-[#16A34A] text-white hover:bg-[#15803D] flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 flex-shrink-0"
              title={playing ? 'Pause (Space)' : 'Play (Space)'}
            >
              {playing ? (
                <Pause className="w-3 h-3 fill-current" />
              ) : (
                <Play className="w-3 h-3 fill-current translate-x-0.5" />
              )}
            </button>

            {/* Skip Forward +1s */}
            <button
              onClick={onSkipForward ? onSkipForward : () => onSeek(Math.min(safeDuration, currentTime + 1))}
              className="p-1 rounded-full text-[#2F3020]/75 hover:text-[#16A34A] hover:bg-[#CDCBD6]/40 transition-colors cursor-pointer"
              title="Forward 1s (Right Arrow)"
            >
              <RotateCw className="w-3 h-3" />
            </button>

            <div className="h-3 w-px bg-[#2F3020]/15 mx-0.5" />

            {/* Monospace Digital Timecode */}
            <div className="flex items-center gap-1 font-mono text-[9px] sm:text-[10px] font-bold px-0.5 sm:px-1 select-none">
              <span className="text-[#16A34A] tracking-wider">{formatTimecode(currentTime)}</span>
              <span className="text-[#2F3020]/40">/</span>
              <span className="text-[#2F3020]/70">{formatTimecode(safeDuration)}</span>
            </div>
          </div>

          <div className="h-3.5 w-px bg-[#2F3020]/15 mx-0.5" />

          {/* Playback Speed Control */}
          <div className="flex items-center gap-1 bg-white border border-[#2F3020]/20 rounded-md px-1.5 py-0.5 shadow-2xs">
            <label htmlFor="timeline-playback-speed-select" className="text-[9px] font-mono font-bold text-[#2F3020]/60 hidden xs:inline">
              Speed
            </label>
            <select
              id="timeline-playback-speed-select"
              aria-label="Playback speed"
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              className="text-[10px] font-mono font-bold text-[#2F3020] bg-transparent focus:outline-none cursor-pointer"
            >
              <option value={0.5}>0.5×</option>
              <option value={0.75}>0.75×</option>
              <option value={1}>1.0×</option>
              <option value={1.25}>1.25×</option>
              <option value={1.5}>1.5×</option>
              <option value={2}>2.0×</option>
            </select>
          </div>

          {/* Audio Volume & Mute Control */}
          <div className="flex items-center gap-1 bg-white border border-[#2F3020]/20 rounded-md px-1.5 py-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              className="text-[#2F3020]/75 hover:text-[#16A34A] transition-colors cursor-pointer"
              title={isMuted ? 'Unmute Audio (M)' : 'Mute Audio (M)'}
              aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-500" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-3.5 h-3.5 text-[#2F3020]" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[#16A34A]" />
              )}
            </button>
            <input
              id="timeline-volume-slider"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setVolume(val);
                setIsMuted(val === 0);
              }}
              className="w-10 sm:w-14 h-1 bg-[#2F3020]/20 accent-[#16A34A] rounded cursor-pointer hidden sm:inline-block"
              aria-label="Audio volume level"
            />
          </div>

          <div className="h-3.5 w-px bg-[#2F3020]/15 mx-0.5" />

          {/* Delete button */}
          <button
            onClick={onDelete}
            className="flex items-center gap-1 px-1.5 sm:px-2 py-1 text-xs text-[#2F3020]/80 hover:text-rose-600 hover:bg-rose-100 rounded font-semibold transition-colors cursor-pointer"
            title="Delete Active Segment (Del)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="text-[10px] hidden xs:inline">Delete</span>
          </button>
        </div>

        {/* Right: Timeline Zoom & Shortcuts */}
        <div className="flex items-center gap-1 sm:gap-2.5 flex-shrink-0">
          {/* Shortcuts hint */}
          <div className="hidden lg:flex items-center gap-2 text-[9px] font-mono text-[#2F3020]/60">
            <span><kbd className="text-[#16A34A] bg-white border border-[#2F3020]/15 px-1 py-0.5 rounded font-bold shadow-2xs">S</kbd> Split</span>
            <span><kbd className="text-rose-600 bg-white border border-[#2F3020]/15 px-1 py-0.5 rounded font-bold shadow-2xs">Del</kbd> Delete</span>
            <span><kbd className="text-[#16A34A] bg-white border border-[#2F3020]/15 px-1 py-0.5 rounded font-bold shadow-2xs">Space</kbd> Play</span>
          </div>

          <div className="h-3.5 w-px bg-[#2F3020]/15 hidden lg:block" />

          {/* Timeline Zoom Slider */}
          <div className="hidden sm:flex items-center gap-1 text-[#2F3020]/70">
            <button
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(1)))}
              className="p-0.5 hover:text-[#16A34A] cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <input
              id="timeline-zoom-slider"
              aria-label="Timeline zoom level"
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-12 sm:w-16 h-1 bg-[#2F3020]/20 accent-[#16A34A] rounded cursor-pointer"
            />
            <button
              onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(1)))}
              className="p-0.5 hover:text-[#16A34A] cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
          <button
            className="p-1 text-[#2F3020]/70 hover:text-[#2F3020] hover:bg-[#CDCBD6]/50 rounded transition-colors cursor-pointer"
            title="Fit to Screen"
            onClick={() => setZoom(1)}
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ── Multi-Track Area With Dedicated Left Header Gutter ── */}
      <div className="flex-1 flex min-h-0 bg-[#FAF7F5] overflow-hidden border-t border-[#2F3020]/15">
        {/* Left Track Headers (Fixed Gutter - avoids overlapping clips at 00:00) */}
        <div className="w-16 sm:w-20 md:w-24 border-r border-[#2F3020]/15 bg-[#FAF7F5] flex flex-col flex-shrink-0 z-20 select-none">
          {/* Ruler header */}
          <div className="h-6 border-b border-[#2F3020]/20 flex items-center justify-center px-1 sm:px-2 bg-[#CDCBD6]/50">
            <span className="text-[8px] sm:text-[9px] font-mono font-bold tracking-wider text-[#2F3020]/60 uppercase flex items-center gap-0.5 sm:gap-1">
              <Clock className="w-2.5 h-2.5 text-[#2F3020]/60" />
              <span>TIME</span>
            </span>
          </div>

          {/* Track 1 Header (Subtitles) */}
          <div className="h-12 border-b border-[#2F3020]/15 flex items-center px-1.5 sm:px-2.5 gap-1.5 sm:gap-2 bg-[#FAF7F5]">
            <div className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded bg-[#16A34A]/10 border border-[#16A34A]/30 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <Type className="w-3 h-3 text-[#16A34A]" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] sm:text-[10px] font-extrabold text-[#2F3020] leading-tight truncate">Subtitles</div>
              <div className="text-[7.5px] sm:text-[8px] font-mono text-[#2F3020]/50 font-semibold tracking-wider hidden xs:block">T1 TRACK</div>
            </div>
          </div>

          {/* Track 2 Header (Audio) */}
          <div className="h-10 border-b border-[#2F3020]/15 flex items-center px-1.5 sm:px-2.5 gap-1.5 sm:gap-2 bg-[#FAF7F5]">
            <div className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded bg-[#16A34A]/10 border border-[#16A34A]/30 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <Volume2 className="w-3 h-3 text-[#16A34A]" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] sm:text-[10px] font-extrabold text-[#2F3020] leading-tight truncate">Audio</div>
              <div className="text-[7.5px] sm:text-[8px] font-mono text-[#2F3020]/50 font-semibold tracking-wider hidden xs:block">A1 TRACK</div>
            </div>
          </div>
        </div>

        {/* Scrollable / Zoomable Tracks Area */}
        <div
          ref={timelineRef}
          onMouseDown={handleMouseDownTimeline}
          onTouchStart={handleTouchStartTimeline}
          className={`relative flex-1 bg-[#FAF7F5] cursor-pointer select-none overflow-y-hidden scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            zoom > 1 ? 'overflow-x-auto' : 'overflow-x-hidden'
          }`}
        >
          <div
            style={{ width: zoom > 1 ? `${zoom * 100}%` : '100%' }}
            className="relative w-full h-full flex flex-col overflow-hidden"
          >
            {/* Time Ruler (Directly draggable scrubbing surface) */}
            <div
              onMouseDown={handleMouseDownTimeline}
              onTouchStart={handleTouchStartTimeline}
              className="h-6 border-b border-[#2F3020]/20 relative flex items-center px-2 text-[9.5px] font-mono text-[#2F3020]/75 bg-[#CDCBD6]/40 cursor-ew-resize select-none flex-shrink-0"
              title="Click or drag anywhere on ruler to seek playhead"
            >
              {rulerTicks.map((tick) => (
                <div
                  key={tick.time}
                  style={{ left: `${tick.percent}%` }}
                  className="absolute flex flex-col items-start transform -translate-x-1/2 pointer-events-none"
                >
                  <span className="font-semibold">{tick.label}</span>
                  <div className="w-px h-1.5 bg-[#2F3020]/30 mt-0.5" />
                </div>
              ))}
            </div>

            {/* Track 1: Captions / Subtitles Layer (T1) */}
            <div className="h-12 border-b border-[#2F3020]/15 relative bg-[#FAF7F5] flex items-center px-1 overflow-hidden flex-shrink-0">
              {transcript?.segments && transcript.segments.length > 0 ? (
                <div className="relative w-full h-[36px] flex items-center">
                  {transcript.segments.map((seg, sIdx) => {
                    const left = Math.max(0, (seg.start / safeDuration) * 100);
                    const width = Math.max(1.2, ((seg.end - seg.start) / safeDuration) * 100);
                    const isActive = activeSegment?.id === seg.id;

                    return (
                      <div
                        key={seg.id || sIdx}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeek(seg.start);
                          if (onSelectSegment) onSelectSegment(seg);
                        }}
                        className={`absolute inset-y-0.5 rounded-md text-[11px] px-2 flex items-center justify-center overflow-hidden transition-all cursor-pointer select-none group font-medium shadow-2xs ${
                          isActive
                            ? 'bg-[#16A34A] text-white font-bold border border-[#15803D] border-t-2 border-t-white/60 shadow-md z-20 ring-2 ring-[#16A34A]/30'
                            : 'bg-white hover:bg-emerald-50/40 text-[#2F3020] border border-[#2F3020]/20 border-t-2 border-t-[#16A34A]/50 hover:border-[#16A34A]'
                        }`}
                        title={`"${seg.text}" • ${formatTimecode(seg.start)} - ${formatTimecode(seg.end)}`}
                      >
                        {/* Trim Handles for active segment */}
                        {isActive && onUpdateSegmentTime && (
                          <>
                            <div
                              onMouseDown={(e) => handleTrimStart(e, seg)}
                              className="absolute left-0 top-0 bottom-0 w-2.5 bg-[#14532D] hover:bg-[#0F3E22] cursor-ew-resize flex items-center justify-center z-30 rounded-l-md border-r border-white/20 transition-colors"
                              title="Drag to trim start time"
                            >
                              <div className="w-0.5 h-3 bg-white/80 rounded-full" />
                            </div>
                            <div
                              onMouseDown={(e) => handleTrimEnd(e, seg)}
                              className="absolute right-0 top-0 bottom-0 w-2.5 bg-[#14532D] hover:bg-[#0F3E22] cursor-ew-resize flex items-center justify-center z-30 rounded-r-md border-l border-white/20 transition-colors"
                              title="Drag to trim end time"
                            >
                              <div className="w-0.5 h-3 bg-white/80 rounded-full" />
                            </div>
                          </>
                        )}
                        <span className="truncate select-none font-semibold text-center w-full leading-tight">
                          {seg.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 h-full text-[10px] font-mono text-[#2F3020]/50 italic">
                  No captions generated yet
                </div>
              )}
            </div>

            {/* Track 2: Audio Waveform (A1) */}
            <div className="h-10 border-b border-[#2F3020]/15 relative bg-[#FAF7F5] flex items-center px-1 overflow-hidden flex-shrink-0">
              <div className="relative w-full h-[32px] rounded-md border border-[#2F3020]/15 bg-white overflow-hidden flex items-center shadow-2xs">
                <canvas
                  ref={waveformCanvasRef}
                  width={1600}
                  height={32}
                  className="w-full h-full pointer-events-none"
                />
              </div>
            </div>

            {/* ── Playhead Scrubbing Indicator with Accessible Grab Handle ── */}
            <div
              style={{ left: `${playheadPercent}%` }}
              className="absolute top-0 bottom-0 pointer-events-none z-40 transform -translate-x-1/2 flex flex-col items-center group"
            >
              {/* Needle Head Grab Badge (Sits neatly on the ruler) */}
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleMouseDownTimeline(e);
                }}
                className="w-5 h-5 flex flex-col items-center justify-center cursor-ew-resize pointer-events-auto hover:scale-110 active:scale-95 transition-transform"
                title={`Playhead: ${formatTimecode(currentTime)} (Click or drag to scrub)`}
              >
                <div className="w-3.5 h-3 bg-[#D96846] rounded-xs shadow-md border border-white flex flex-col items-center justify-center">
                  <div className="w-1.5 h-0.5 bg-white/90 rounded-full mb-0.5" />
                  <div className="w-1 h-0.5 bg-white/70 rounded-full" />
                </div>
                {/* Arrow indicator */}
                <div className="w-0 h-0 border-x-[2.5px] border-x-transparent border-t-[3px] border-t-[#D96846]" />
              </div>

              {/* Full-height Draggable Vertical Hit Zone Strip */}
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleMouseDownTimeline(e);
                }}
                className="w-3 flex-1 flex justify-center cursor-ew-resize pointer-events-auto group-hover:bg-[#D96846]/10 transition-colors"
                title="Drag playhead line to scrub"
              >
                <div className="w-0.5 h-full bg-[#D96846] shadow-xs" />
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
