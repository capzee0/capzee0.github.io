import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles, Type, Sliders, Scissors
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { CaptionPresetGallery } from './components/CaptionPresetGallery';
import { CaptionStyleControls } from './components/CaptionStyleControls';
import { TranscriptionPanel } from './components/TranscriptionPanel';
import { ExportModal } from './components/ExportModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { FluxoCutTimeline } from './components/FluxoCutTimeline';
import { FluxoCutSilencePanel } from './components/FluxoCutSilencePanel';
import { AiSocialPanel } from './components/AiSocialPanel';
import { EditorHeader } from './components/EditorHeader';
import { VideoCanvasContainer } from './components/VideoCanvasContainer';
import { useVideoPlayback } from './hooks/useVideoPlayback';
import { useProjectLoader } from './hooks/useProjectLoader';
import { cn } from '@/lib/utils';
import { startTranscription } from '@/services/api';
import type { AspectRatio, CaptionPreset, Segment, Transcript } from '@capzee/contracts';
import { getDemoTranscript } from '@capzee/contracts';

type StudioTab = 'presets' | 'transcript' | 'style' | 'silence' | 'ai';
type MobileTab = 'preview' | 'presets' | 'transcript' | 'style' | 'silence' | 'ai';

export function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const {
    currentProject,
    currentTranscript,
    setCurrentTranscript,
    captionStyle,
    setCaptionStyle,
    replaceCaptionStyle,
    setLocalVideoFile,
    currentJob,
    setCurrentJob,
    updateProject,
  } = useProjectStore();

  const [studioTab, setStudioTab] = useState<StudioTab>('presets');
  const [mobileTab, setMobileTab] = useState<MobileTab>('preview');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    (captionStyle?.aspectRatio as AspectRatio) || '9:16'
  );
  const [safeZone, setSafeZone] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Undo / Redo history stack
  const [history, setHistory] = useState<Transcript[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Project loader hook
  const { videoSrc, setVideoSrc } = useProjectLoader({ projectId });

  // Video playback & active caption tracking hook
  const {
    videoRef,
    playing,
    currentTime,
    duration,
    activeSegment,
    activeWordIndex,
    togglePlay,
    seek,
    setDuration,
  } = useVideoPlayback({
    transcript: currentTranscript,
    videoSrc,
  });

  // Keep duration synchronized if project has a saved duration
  useEffect(() => {
    if (currentProject?.durationSeconds && duration === 0) {
      setDuration(currentProject.durationSeconds);
    }
  }, [currentProject?.durationSeconds, duration, setDuration]);

  // Handle preset selection
  const handleSelectPreset = useCallback((preset: CaptionPreset) => {
    replaceCaptionStyle({
      ...preset,
      aspectRatio,
    });
  }, [aspectRatio, replaceCaptionStyle]);

  // Handle caption generation trigger
  const handleStartTranscription = useCallback(
    async (opts: { language: string; model: string; captionOutput?: 'native' | 'roman' | 'translate' }) => {
      if (!projectId || projectId.startsWith('local-')) {
        const demo = getDemoTranscript(opts.language || 'ta', opts.captionOutput === 'native' ? 'native' : 'roman');
        setCurrentTranscript(demo);
        return;
      }
      try {
        setCurrentJob({
          id: 'job-init',
          status: 'queued',
          progress: 0,
          stage: 'Queued',
          errorCode: null,
          errorMessage: null,
        });
        const res = await startTranscription(projectId, opts);
        setCurrentJob({
          id: res.jobId,
          status: 'processing',
          progress: 10,
          stage: 'Transcribing',
          errorCode: null,
          errorMessage: null,
        });
      } catch (err) {
        console.error('Failed to start transcription:', err);
        const demo = getDemoTranscript(opts.language || 'ta', opts.captionOutput === 'native' ? 'native' : 'roman');
        setCurrentTranscript(demo);
      }
    },
    [projectId, setCurrentJob, setCurrentTranscript]
  );

  // Push transcript state to history for undo / redo
  const pushHistory = useCallback((transcript: Transcript) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, JSON.parse(JSON.stringify(transcript))];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const handleUpdateTranscript = useCallback((newTranscript: Transcript) => {
    if (currentTranscript) {
      pushHistory(currentTranscript);
    }
    setCurrentTranscript(newTranscript);
  }, [currentTranscript, pushHistory, setCurrentTranscript]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex((i) => i - 1);
      setCurrentTranscript(JSON.parse(JSON.stringify(prev)));
    }
  }, [history, historyIndex, setCurrentTranscript]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex((i) => i + 1);
      setCurrentTranscript(JSON.parse(JSON.stringify(next)));
    }
  }, [history, historyIndex, setCurrentTranscript]);

  // Split segment at current playhead time
  const handleSplitSegment = useCallback(() => {
    if (!currentTranscript || !activeSegment) return;
    const splitTime = currentTime;
    if (splitTime <= activeSegment.start || splitTime >= activeSegment.end) return;

    const words = activeSegment.words || [];
    const beforeWords = words.filter((w) => w.end <= splitTime);
    const afterWords = words.filter((w) => w.start >= splitTime);

    const seg1: Segment = {
      id: `${activeSegment.id}-a`,
      start: activeSegment.start,
      end: splitTime,
      text: beforeWords.map((w) => w.text).join(' ') || activeSegment.text,
      words: beforeWords,
    };

    const seg2: Segment = {
      id: `${activeSegment.id}-b`,
      start: splitTime,
      end: activeSegment.end,
      text: afterWords.map((w) => w.text).join(' ') || activeSegment.text,
      words: afterWords,
    };

    const newSegments: Segment[] = [];
    for (const s of currentTranscript.segments) {
      if (s.id === activeSegment.id) {
        newSegments.push(seg1, seg2);
      } else {
        newSegments.push(s);
      }
    }

    handleUpdateTranscript({
      ...currentTranscript,
      segments: newSegments,
    });
  }, [activeSegment, currentTime, currentTranscript, handleUpdateTranscript]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;

      if (!isInput && e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (!isInput && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
        e.preventDefault();
        setShortcutsModalOpen((prev) => !prev);
      } else if (!isInput && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRedo, handleUndo, togglePlay]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#D96846] text-[#2F3020]">
      {/* ── 1. STUDIO HEADER ── */}
      <EditorHeader
        title={currentProject?.title || 'Capzee Studio'}
        durationSeconds={currentProject?.durationSeconds}
        aspectRatio={aspectRatio}
        safeZone={safeZone}
        onBack={() => navigate('/')}
        onSetAspectRatio={(ratio) => {
          setAspectRatio(ratio);
          setCaptionStyle({ aspectRatio: ratio });
        }}
        onToggleSafeZone={() => setSafeZone((prev) => !prev)}
        onOpenShortcuts={() => setShortcutsModalOpen(true)}
        onOpenExport={() => setExportModalOpen(true)}
      />

      {/* ── MOBILE TAB SWITCHER (Visible on small screens) ── */}
      <div className="lg:hidden flex items-center justify-between bg-[#CDCBD6] border-b border-[#2F3020]/20 px-2.5 py-2 z-20 shadow-2xs">
        <div className="flex items-center gap-1 w-full bg-[#FAF7F5] p-1 rounded-2xl border border-[#2F3020]/15">
          {(
            [
              { id: 'preview', label: 'Monitor' },
              { id: 'presets', label: 'Presets' },
              { id: 'transcript', label: 'Captions' },
              { id: 'style', label: 'Style' },
              { id: 'silence', label: 'Silence' },
              { id: 'ai', label: 'AI Copy' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setMobileTab(tab.id);
                if (tab.id !== 'preview') setStudioTab(tab.id as StudioTab);
              }}
              className={cn(
                'flex-1 py-1.5 text-[11px] font-bold rounded-xl transition-all capitalize text-center cursor-pointer',
                mobileTab === tab.id
                  ? 'bg-[#16A34A] text-white shadow-xs'
                  : 'text-[#2F3020]/70 hover:text-[#2F3020]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. DESKTOP 3-PANE STUDIO LAYOUT ── */}
      <div className="hidden lg:flex flex-1 overflow-hidden min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full">
          {/* ── LEFT PANE: Preset Gallery ── */}
          <ResizablePanel
            defaultSize={22}
            minSize={16}
            maxSize={30}
            id="left-pane"
            collapsible
            className="bg-[#CDCBD6] border-r border-[#2F3020]/20 flex flex-col overflow-hidden text-[#2F3020]"
          >
            <div className="p-3 border-b border-[#2F3020]/15 bg-[#E3E1EB] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#2F3020]">
                <Sparkles className="w-3.5 h-3.5 text-[#16A34A]" />
                <span>Preset Gallery</span>
              </div>
              <span className="text-[10px] font-bold text-[#16A34A] bg-[#16A34A]/10 px-2 py-0.5 rounded-full border border-[#16A34A]/20 font-mono">
                CapCut Styles
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <CaptionPresetGallery
                selectedPresetId={captionStyle.id}
                onSelectPreset={handleSelectPreset}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* ── CENTER PANE: Video Canvas & Scrubber Timeline ── */}
          <ResizablePanel
            defaultSize={52}
            minSize={36}
            id="center-pane"
            className="flex flex-col min-w-0 min-h-0"
          >
            <ResizablePanelGroup direction="vertical" className="h-full w-full">
              {/* Top: Video Player Canvas */}
              <ResizablePanel
                defaultSize={68}
                minSize={40}
                id="center-video"
                className="relative flex flex-col min-w-0 min-h-0"
              >
                <VideoCanvasContainer
                  aspectRatio={aspectRatio}
                  videoSrc={videoSrc}
                  videoRef={videoRef}
                  activeSegment={activeSegment}
                  activeWordIndex={activeWordIndex}
                  captionStyle={captionStyle}
                  safeZone={safeZone}
                  onPositionChange={(offsetY) =>
                    setCaptionStyle({
                      position: { ...captionStyle.position, offsetY },
                    })
                  }
                  onSelectLocalVideo={(file) => {
                    setLocalVideoFile(file);
                    setVideoSrc(URL.createObjectURL(file));
                  }}
                />
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Bottom: FluxoCut Timeline Scrubber */}
              <ResizablePanel
                defaultSize={32}
                minSize={22}
                maxSize={45}
                id="center-timeline"
                className="bg-[#CDCBD6] border-t border-[#2F3020]/20 flex flex-col overflow-hidden"
              >
                <FluxoCutTimeline
                  currentTime={currentTime}
                  duration={duration}
                  playing={playing}
                  onSeek={seek}
                  onTogglePlay={togglePlay}
                  videoElement={videoRef.current}
                  transcript={currentTranscript}
                  activeSegment={activeSegment}
                  onSplit={handleSplitSegment}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  canUndo={historyIndex > 0}
                  canRedo={historyIndex < history.length - 1}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* ── RIGHT PANE: Multi-Tab Inspector ── */}
          <ResizablePanel
            defaultSize={26}
            minSize={20}
            maxSize={38}
            id="right-pane"
            className="bg-[#CDCBD6] border-l border-[#2F3020]/20 flex flex-col overflow-hidden text-[#2F3020]"
          >
            {/* Inspector Tab Switcher */}
            <div className="flex items-center justify-between border-b border-[#2F3020]/15 bg-[#E3E1EB] p-1.5 shrink-0">
              {(
                [
                  { id: 'transcript', label: 'Captions', icon: Type },
                  { id: 'style', label: 'Style', icon: Sliders },
                  { id: 'silence', label: 'Silence Cut', icon: Scissors },
                  { id: 'ai', label: 'AI Copy', icon: Sparkles },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStudioTab(tab.id)}
                    className={cn(
                      'flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                      studioTab === tab.id
                        ? 'bg-[#16A34A] text-white shadow-xs'
                        : 'text-[#2F3020]/75 hover:text-[#2F3020] hover:bg-black/5'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Inspector Tab Content */}
            <div className="flex-1 overflow-y-auto p-3">
              {studioTab === 'transcript' && (
                <TranscriptionPanel
                  transcript={currentTranscript}
                  currentJob={currentJob}
                  activeSegment={activeSegment}
                  onTranscriptChange={handleUpdateTranscript}
                  onStartTranscription={handleStartTranscription}
                  onSeek={seek}
                  hasVideo={Boolean(videoSrc)}
                />
              )}

              {studioTab === 'style' && (
                <CaptionStyleControls
                  idPrefix="desktop-style"
                  captionStyle={captionStyle}
                  onChange={(updates) => setCaptionStyle(updates)}
                />
              )}

              {studioTab === 'silence' && (
                <FluxoCutSilencePanel
                  projectId={currentProject?.id || ''}
                  onClipsRemoved={(clips, total) => {
                    console.info(`Trimmed ${clips.length} pauses (${total}s)`);
                  }}
                />
              )}

              {studioTab === 'ai' && (
                <AiSocialPanel
                  transcript={currentTranscript}
                  videoTitle={currentProject?.title}
                  onUpdateTitle={(newTitle) => {
                    if (currentProject) {
                      updateProject(currentProject.id, { title: newTitle });
                    }
                  }}
                />
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* ── 3. MOBILE VIEW CONTAINER ── */}
      <div className="lg:hidden flex-1 overflow-y-auto flex flex-col bg-[#CDCBD6]">
        {mobileTab === 'preview' && (
          <div className="flex-1 flex flex-col h-full">
            <div className="flex-1 min-h-[300px]">
              <VideoCanvasContainer
                aspectRatio={aspectRatio}
                videoSrc={videoSrc}
                videoRef={videoRef}
                activeSegment={activeSegment}
                activeWordIndex={activeWordIndex}
                captionStyle={captionStyle}
                safeZone={safeZone}
                onPositionChange={(offsetY) =>
                  setCaptionStyle({
                    position: { ...captionStyle.position, offsetY },
                  })
                }
                onSelectLocalVideo={(file) => {
                  setLocalVideoFile(file);
                  setVideoSrc(URL.createObjectURL(file));
                }}
              />
            </div>
            <div className="h-44 border-t border-[#2F3020]/20 bg-[#CDCBD6]">
              <FluxoCutTimeline
                currentTime={currentTime}
                duration={duration}
                playing={playing}
                onSeek={seek}
                onTogglePlay={togglePlay}
                videoElement={videoRef.current}
                transcript={currentTranscript}
                activeSegment={activeSegment}
                onSplit={handleSplitSegment}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
              />
            </div>
          </div>
        )}

        {mobileTab === 'presets' && (
          <div className="p-4 flex-1">
            <CaptionPresetGallery
              selectedPresetId={captionStyle.id}
              onSelectPreset={handleSelectPreset}
            />
          </div>
        )}

        {mobileTab === 'transcript' && (
          <div className="p-4 flex-1">
            <TranscriptionPanel
              transcript={currentTranscript}
              currentJob={currentJob}
              activeSegment={activeSegment}
              onTranscriptChange={handleUpdateTranscript}
              onStartTranscription={handleStartTranscription}
              onSeek={seek}
              hasVideo={Boolean(videoSrc)}
            />
          </div>
        )}

        {mobileTab === 'style' && (
          <div className="p-4 flex-1">
            <CaptionStyleControls
              idPrefix="mobile-style"
              captionStyle={captionStyle}
              onChange={(updates) => setCaptionStyle(updates)}
            />
          </div>
        )}

        {mobileTab === 'silence' && (
          <div className="p-4 flex-1">
            <FluxoCutSilencePanel
              projectId={currentProject?.id || ''}
              onClipsRemoved={(clips, total) => {
                console.info(`Trimmed ${clips.length} pauses (${total}s)`);
              }}
            />
          </div>
        )}

        {mobileTab === 'ai' && (
          <div className="p-4 flex-1">
            <AiSocialPanel
              transcript={currentTranscript}
              videoTitle={currentProject?.title}
              onUpdateTitle={(newTitle) => {
                if (currentProject) {
                  updateProject(currentProject.id, { title: newTitle });
                }
              }}
            />
          </div>
        )}
      </div>

      {/* ── 4. MODALS ── */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        transcript={currentTranscript}
        captionStyle={captionStyle}
        projectId={currentProject?.id || ''}
        videoTitle={currentProject?.title || 'Video'}
      />

      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
    </div>
  );
}
