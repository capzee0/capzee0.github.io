import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Download, ChevronLeft, Film, Upload, Sparkles,
  Type, Sliders, Shield,
  Smartphone, Monitor, Square
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import {
  getProject, getTranscript, startTranscription, getJob
} from '@/services/api';
import { CaptionOverlay } from './components/CaptionOverlay';
import { CaptionPresetGallery } from './components/CaptionPresetGallery';
import { CaptionStyleControls } from './components/CaptionStyleControls';
import { TranscriptionPanel } from './components/TranscriptionPanel';
import { ExportModal } from './components/ExportModal';
import { FluxoCutTimeline } from './components/FluxoCutTimeline';
import { formatDuration, cn } from '@/lib/utils';
import {
  type Segment,
  type Transcript,
  type CaptionPreset,
  type CaptionStyle,
  getDemoTranscript,
  chunkWordsIntoSegments,
} from '@capzee/contracts';

type AspectRatio = '9:16' | '16:9' | '1:1';
type StudioTab = 'presets' | 'transcript' | 'style';

export function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const {
    projects,
    currentProject, setCurrentProject,
    currentTranscript, setCurrentTranscript,
    captionStyle, setCaptionStyle, replaceCaptionStyle,
    localVideoFile, setLocalVideoFile,
    currentJob, setCurrentJob, updateJob,
  } = useProjectStore();

  // Video playback state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeSegment, setActiveSegment] = useState<Segment | null>(null);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);

  // Dedicated Caption & Presets Studio UI
  const [studioTab, setStudioTab] = useState<StudioTab>('presets');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    (captionStyle?.aspectRatio as AspectRatio) || '9:16'
  );
  const [safeZone, setSafeZone] = useState(false);

  // Resizable layout (Center Video Canvas vs Right Studio Panel)
  const [rightPanelWidth, setRightPanelWidth] = useState(380);
  const [timelineHeight, setTimelineHeight] = useState(138);

  const isResizingRightPanel = useRef(false);
  const isResizingTimeline = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (isResizingRightPanel.current) {
        const newWidth = Math.max(300, Math.min(560, window.innerWidth - e.clientX));
        setRightPanelWidth(newWidth);
      }
      if (isResizingTimeline.current) {
        const newHeight = Math.max(110, Math.min(300, window.innerHeight - e.clientY));
        setTimelineHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      isResizingRightPanel.current = false;
      isResizingTimeline.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Modals & status
  const [loading, setLoading] = useState(true);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const jobPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load project & transcript ────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;

    async function load() {
      setLoading(true);
      try {
        let project = currentProject?.id === projectId ? currentProject : null;
        if (!project) {
          const stored = projects.find((p) => p.id === projectId);
          if (stored) {
            project = stored;
          } else if (projectId && !projectId.startsWith('local-')) {
            try {
              project = (await getProject(projectId!)) as typeof currentProject;
            } catch {
              // Not reachable on server
            }
          }
        }

        if (project) {
          setCurrentProject(project as typeof currentProject);
        } else {
          const fallback = {
            id: projectId,
            title: 'Sample Video Project',
            status: 'created',
            durationSeconds: 20.5,
            originalAssetPath: null,
            localVideoUrl: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          project = fallback as typeof currentProject;
          setCurrentProject(fallback as typeof currentProject);
        }

        // Video source resolution
        if (localVideoFile) {
          setVideoSrc(URL.createObjectURL(localVideoFile));
        } else if ((project as { localVideoUrl?: string })?.localVideoUrl) {
          setVideoSrc((project as { localVideoUrl?: string }).localVideoUrl!);
        } else if (project?.originalAssetPath) {
          setVideoSrc(`/api/v1/projects/${projectId}/media`);
        }

        // Auto-load or generate captions immediately
        const hasSegments = Boolean(currentTranscript?.segments && currentTranscript.segments.length > 0);
        if (!hasSegments) {
          let loaded = false;
          if (project?.status === 'transcribed') {
            try {
              const transcript = await getTranscript(projectId!);
              if (transcript?.segments?.length) {
                const chunked = {
                  ...transcript,
                  segments: chunkWordsIntoSegments(transcript.segments, 5),
                };
                setCurrentTranscript(chunked);
                setActiveSegment(chunked.segments[0] || null);
                loaded = true;
              }
            } catch {
              // fallback
            }
          }
          if (!loaded) {
            const demo = getDemoTranscript('en');
            setCurrentTranscript(demo);
            setActiveSegment(demo.segments[0] || null);
          }
        } else if (!activeSegment && currentTranscript?.segments?.length) {
          setActiveSegment(currentTranscript.segments[0]);
        }
      } catch (err) {
        console.error('Failed to load project in editor:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [projectId]);

  // Sync video time with subtitle overlay and word index
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      const t = video.currentTime;
      setCurrentTime(t);

      if (currentTranscript?.segments) {
        const seg = currentTranscript.segments.find(
          (s) => t >= s.start && t <= s.end
        ) ?? null;
        setActiveSegment(seg);

        if (seg?.words) {
          const wordIdx = seg.words.findIndex(
            (w) => t >= w.start && t <= w.end
          );
          setActiveWordIndex(wordIdx);
        } else {
          setActiveWordIndex(-1);
        }
      }
    };

    const onDurationChange = () => setDuration(video.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('loadedmetadata', onDurationChange);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('loadedmetadata', onDurationChange);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
    };
  }, [currentTranscript]);

  // Polling for transcription jobs
  useEffect(() => {
    if (!currentJob || !['queued', 'processing'].includes(currentJob.status)) {
      if (jobPollRef.current) clearInterval(jobPollRef.current);
      return;
    }

    jobPollRef.current = setInterval(async () => {
      try {
        const job = await getJob(currentJob.id);
        updateJob(job);

        if (job.status === 'completed') {
          clearInterval(jobPollRef.current!);
          try {
            const transcript = await getTranscript(projectId!);
            if (transcript?.segments?.length) {
              setCurrentTranscript({
                ...transcript,
                segments: chunkWordsIntoSegments(transcript.segments, 3),
              });
            }
          } catch {
            // fallback
          }
        } else if (job.status === 'failed') {
          clearInterval(jobPollRef.current!);
        }
      } catch {
        /* ignore poll errors */
      }
    }, 1500);

    return () => {
      if (jobPollRef.current) clearInterval(jobPollRef.current);
    };
  }, [currentJob?.id, currentJob?.status]);

  // ── Undo / Redo history tracking ──────────────────────────────────────────
  const [history, setHistory] = useState<{ past: Transcript[]; future: Transcript[] }>({
    past: [],
    future: [],
  });

  const applyTranscriptChange = (nextTranscript: Transcript) => {
    if (currentTranscript) {
      setHistory((prev) => ({
        past: [...prev.past.slice(-30), currentTranscript],
        future: [],
      }));
    }
    setCurrentTranscript(nextTranscript);
  };

  const handleUndo = () => {
    if (history.past.length === 0 || !currentTranscript) return;
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);
    setHistory({
      past: newPast,
      future: [currentTranscript, ...history.future],
    });
    setCurrentTranscript(previous);
  };

  const handleRedo = () => {
    if (history.future.length === 0 || !currentTranscript) return;
    const next = history.future[0];
    const newFuture = history.future.slice(1);
    setHistory({
      past: [...history.past, currentTranscript],
      future: newFuture,
    });
    setCurrentTranscript(next);
  };

  // ── Subtitle Segment Operations ───────────────────────────────────────────
  const handleSplitSegment = () => {
    if (!currentTranscript) return;
    const targetSeg = activeSegment || currentTranscript.segments.find(
      (s) => currentTime >= s.start && currentTime <= s.end
    );
    if (!targetSeg) return;

    const splitTime = currentTime;
    if (splitTime <= targetSeg.start + 0.2 || splitTime >= targetSeg.end - 0.2) return;

    const wordsBefore = targetSeg.words?.filter((w) => w.end <= splitTime) || [];
    const wordsAfter = targetSeg.words?.filter((w) => w.start >= splitTime) || [];

    let text1 = wordsBefore.map((w) => w.text).join(' ');
    let text2 = wordsAfter.map((w) => w.text).join(' ');

    if (!text1 && !text2) {
      const ratio = (splitTime - targetSeg.start) / (targetSeg.end - targetSeg.start);
      const splitIndex = Math.max(1, Math.min(targetSeg.text.length - 1, Math.floor(targetSeg.text.length * ratio)));
      text1 = targetSeg.text.slice(0, splitIndex).trim();
      text2 = targetSeg.text.slice(splitIndex).trim();
    }

    const seg1: Segment = {
      ...targetSeg,
      id: `${targetSeg.id || 'seg'}-1`,
      end: Number(splitTime.toFixed(2)),
      text: text1 || '...',
      words: wordsBefore,
    };
    const seg2: Segment = {
      ...targetSeg,
      id: `${targetSeg.id || 'seg'}-2`,
      start: Number(splitTime.toFixed(2)),
      text: text2 || '...',
      words: wordsAfter,
    };

    const newSegments = currentTranscript.segments.flatMap((s) => (s.id === targetSeg.id ? [seg1, seg2] : [s]));
    applyTranscriptChange({ ...currentTranscript, segments: newSegments });
    setActiveSegment(seg1);
  };

  const handleDeleteSegment = (segId?: string) => {
    if (!currentTranscript) return;
    const targetId = segId || activeSegment?.id || currentTranscript.segments.find(
      (s) => currentTime >= s.start && currentTime <= s.end
    )?.id;
    if (!targetId) return;

    const newSegments = currentTranscript.segments.filter((s) => s.id !== targetId);
    applyTranscriptChange({ ...currentTranscript, segments: newSegments });
    if (activeSegment?.id === targetId) {
      setActiveSegment(null);
    }
  };

  const handleUpdateSegmentTime = (segId: string, newStart: number, newEnd: number) => {
    if (!currentTranscript) return;
    const newSegments = currentTranscript.segments.map((s) => {
      if (s.id !== segId) return s;
      return { ...s, start: newStart, end: newEnd };
    });
    applyTranscriptChange({ ...currentTranscript, segments: newSegments });
  };

  const handleMergeSegment = (segId: string) => {
    if (!currentTranscript) return;
    const idx = currentTranscript.segments.findIndex((s) => s.id === segId);
    if (idx === -1 || idx >= currentTranscript.segments.length - 1) return;
    const seg1 = currentTranscript.segments[idx];
    const seg2 = currentTranscript.segments[idx + 1];

    const mergedSeg: Segment = {
      id: seg1.id,
      start: seg1.start,
      end: seg2.end,
      text: `${seg1.text} ${seg2.text}`.trim(),
      words: [...(seg1.words || []), ...(seg2.words || [])],
    };

    const newSegments = [
      ...currentTranscript.segments.slice(0, idx),
      mergedSeg,
      ...currentTranscript.segments.slice(idx + 2),
    ];
    applyTranscriptChange({ ...currentTranscript, segments: newSegments });
    setActiveSegment(mergedSeg);
  };

  const handleAddSegment = () => {
    if (!currentTranscript) return;
    const start = currentTime;
    const end = Math.min(duration || 20.5, currentTime + 2.5);
    const newSeg: Segment = {
      id: `seg-manual-${Date.now()}`,
      start: Number(start.toFixed(2)),
      end: Number(end.toFixed(2)),
      text: 'New Caption',
      words: [
        { id: `w-${Date.now()}-1`, text: 'New', start: Number(start.toFixed(2)), end: Number((start + 1.0).toFixed(2)) },
        { id: `w-${Date.now()}-2`, text: 'Caption', start: Number((start + 1.0).toFixed(2)), end: Number(end.toFixed(2)) },
      ],
    };
    const updated = [...currentTranscript.segments, newSeg].sort((a, b) => a.start - b.start);
    applyTranscriptChange({ ...currentTranscript, segments: updated });
    setActiveSegment(newSeg);
  };

  // Keyboard Shortcuts (Space, S, Delete, Ctrl+Z, Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSplitSegment();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSegment();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        seekTo(Math.max(0, currentTime - step));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        seekTo(Math.min(duration || 20.5, currentTime + step));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playing, currentTranscript, activeSegment, currentTime, history, duration]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (playing) video.pause();
    else video.play();
  }

  function seekTo(seconds: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(seconds, duration));
  }

  async function handleStartTranscription(opts: {
    language: string;
    model: string;
    captionOutput?: 'native' | 'roman' | 'translate';
  }) {
    if (!projectId) return;
    try {
      const { jobId } = await startTranscription(projectId, opts);
      setCurrentJob({
        id: jobId,
        status: 'queued',
        progress: 0,
        stage: null,
        errorCode: null,
        errorMessage: null,
      });
    } catch {
      const demoTranscript = getDemoTranscript(opts.language, opts.captionOutput);
      setCurrentTranscript(demoTranscript);
      if (currentProject) {
        setCurrentProject({ ...currentProject, status: 'transcribed' });
      }
    }
  }

  function handleSelectPreset(preset: CaptionPreset) {
    const fullStyle: CaptionStyle = {
      ...preset,
      aspectRatio: captionStyle.aspectRatio || '9:16',
      scriptAccent: preset.scriptAccent ?? false,
      scriptFont: preset.scriptFont ?? undefined,
      uppercase: preset.uppercase ?? false,
      backgroundColor: preset.backgroundColor || '#000000',
      animationIntensity: preset.animationIntensity ?? 1.0,
    };
    replaceCaptionStyle(fullStyle);
  }

  function handleStyleChange(patch: Partial<CaptionStyle>) {
    setCaptionStyle(patch);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#D96846] text-[#2F3020]">
        <div className="flex flex-col items-center gap-4 bg-[#CDCBD6] p-8 rounded-xl shadow-lg border border-[#2F3020]/20">
          <img src="/capzee-icon.png" alt="Capzee" className="w-12 h-12 object-contain animate-pulse drop-shadow" />
          <p className="text-sm font-bold tracking-wide text-[#2F3020]">Loading Caption Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#D96846] text-[#2F3020] select-none font-sans">
      {/* ── 1. Top Header Bar: Capzee Theme ── */}
      <header className="h-12 flex-shrink-0 bg-[#CDCBD6] border-b border-[#2F3020]/20 px-4 flex items-center justify-between z-20 text-[#2F3020] shadow-xs">
        {/* Left: Back & Project Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-xs font-bold text-[#2F3020]/80 hover:text-[#2F3020] transition-colors px-2 py-1 rounded-lg hover:bg-[#FAF7F5] group cursor-pointer"
            title="Back to Projects Dashboard"
          >
            <ChevronLeft className="w-4 h-4 text-[#2F3020]/60 group-hover:text-[#2F3020] transition-colors" />
            <span className="hidden sm:inline">Projects</span>
          </button>

          <div className="h-4 w-px bg-[#2F3020]/15" />

          <div className="flex items-center gap-2.5">
            <img src="/capzee-icon.png" alt="Capzee" className="w-5 h-5 object-contain drop-shadow-xs" />
            <span className="text-xs font-bold text-[#2F3020] tracking-tight truncate max-w-xs md:max-w-md">
              {currentProject?.title || 'Video Caption Project'}
            </span>
            <span className="text-[10px] text-[#16A34A] bg-[#16A34A]/10 border border-[#16A34A]/25 font-mono font-bold px-2 py-0.5 rounded-full">
              {formatDuration(duration || 20.5)}
            </span>
          </div>
        </div>

        {/* Center: Aspect Ratio Selector with Visual Device Icons */}
        <div className="flex items-center gap-1 bg-[#FAF7F5] p-1 rounded-xl border border-[#2F3020]/15 shadow-2xs">
          <button
            onClick={() => {
              setAspectRatio('9:16');
              setCaptionStyle({ aspectRatio: '9:16' });
            }}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
              aspectRatio === '9:16'
                ? 'bg-[#16A34A] text-white shadow-xs'
                : 'text-[#2F3020]/70 hover:text-[#2F3020] hover:bg-black/5'
            )}
            title="9:16 Vertical (Instagram Reels, TikTok, YouTube Shorts)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>9:16</span>
          </button>

          <button
            onClick={() => {
              setAspectRatio('16:9');
              setCaptionStyle({ aspectRatio: '16:9' });
            }}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
              aspectRatio === '16:9'
                ? 'bg-[#16A34A] text-white shadow-xs'
                : 'text-[#2F3020]/70 hover:text-[#2F3020] hover:bg-black/5'
            )}
            title="16:9 Widescreen (YouTube, Landscape Video)"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>16:9</span>
          </button>

          <button
            onClick={() => {
              setAspectRatio('1:1');
              setCaptionStyle({ aspectRatio: '1:1' });
            }}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
              aspectRatio === '1:1'
                ? 'bg-[#16A34A] text-white shadow-xs'
                : 'text-[#2F3020]/70 hover:text-[#2F3020] hover:bg-black/5'
            )}
            title="1:1 Square (Instagram Posts, Feed)"
          >
            <Square className="w-3.5 h-3.5" />
            <span>1:1</span>
          </button>
        </div>

        {/* Right: Safe Zone Toggle & Primary Export Button */}
        <div className="flex items-center gap-2.5">
          {/* Safe Zone Boundary Guide */}
          <button
            onClick={() => setSafeZone(!safeZone)}
            className={cn(
              "px-2.5 py-1.5 rounded-lg transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer border",
              safeZone
                ? "bg-[#16A34A] text-white border-[#16A34A] shadow-xs"
                : "bg-[#FAF7F5] text-[#2F3020]/80 border-[#2F3020]/15 hover:text-[#2F3020]"
            )}
            title="Toggle TikTok / Instagram Reels Safe Zone"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px]">Safe Zone</span>
          </button>

          {/* Primary Export Action */}
          <button
            onClick={() => setExportModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-[#16A34A] hover:bg-[#15803D] active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            id="export-video-btn"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Export Video</span>
          </button>
        </div>
      </header>

      {/* ── 2. Main Studio Workspace: Center Video Player + Right Caption & Preset Studio ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Center: Video Player Canvas (Terracotta Studio Background) */}
        <main className="flex-1 bg-[#D96846] relative flex flex-col items-center justify-center p-3 overflow-hidden min-w-0 min-h-0">
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
                "relative bg-black rounded-2xl overflow-hidden border-2 border-[#2F3020]/30 shadow-2xl flex items-center justify-center select-none max-h-full",
                aspectRatio === '9:16' && "h-full max-h-[92%] aspect-[9/16] w-auto",
                aspectRatio === '16:9' && "w-[94%] max-w-[800px] aspect-[16/9] max-h-full",
                aspectRatio === '1:1' && "h-full max-h-[92%] aspect-square w-auto"
              )}
            >
              {videoSrc ? (
                <>
                  <video
                    ref={videoRef}
                    src={videoSrc}
                    playsInline
                    crossOrigin="anonymous"
                    className="w-full h-full object-contain bg-black"
                  />

                  {/* Animated CapCut Captions Overlay */}
                  {activeSegment && (
                    <CaptionOverlay
                      segment={activeSegment}
                      activeWordIndex={activeWordIndex}
                      style={captionStyle}
                      onPositionChange={(offsetY) =>
                        setCaptionStyle({
                          position: { ...captionStyle.position, offsetY },
                        })
                      }
                    />
                  )}

                  {/* Safe Zone Overlay */}
                  {safeZone && (
                    <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-[#16A34A] flex flex-col justify-between p-4 z-40">
                      <span className="text-[10px] font-mono text-white bg-[#16A34A] px-2 py-0.5 rounded-md self-start font-bold shadow-md">
                        Safe Zone Top
                      </span>
                      <span className="text-[10px] font-mono text-white bg-[#16A34A] px-2 py-0.5 rounded-md self-end font-bold shadow-md">
                        Reels / TikTok UI Safe Zone
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center text-center p-8 text-[#2F3020] bg-[#CDCBD6] rounded-2xl border border-[#2F3020]/20 max-w-sm shadow-md">
                  <div className="w-14 h-14 rounded-2xl bg-[#16A34A]/10 border border-[#16A34A]/25 flex items-center justify-center text-[#16A34A] mb-3 shadow-inner">
                    <Film className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-bold text-[#2F3020] mb-1">No Video Loaded</p>
                  <p className="text-xs text-[#2F3020]/70 mb-5 leading-relaxed">
                    Upload your video clip to start applying animated CapCut caption presets.
                  </p>
                  <label className="bg-[#16A34A] hover:bg-[#15803D] text-white text-xs py-2.5 px-5 rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <Upload className="w-3.5 h-3.5" />
                    Select Video File
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setLocalVideoFile(file);
                          setVideoSrc(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Drag resize handle for Right Studio Panel */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            isResizingRightPanel.current = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
          className="w-1 hover:w-1.5 bg-[#2F3020]/15 hover:bg-[#16A34A] active:bg-[#16A34A] cursor-col-resize transition-all flex-shrink-0 z-20 border-l border-[#2F3020]/10"
          title="Drag to resize studio panel"
        />

        {/* Right: Dedicated Caption & Presets Command Center in Lavender Neutral */}
        <aside
          style={{ width: `${rightPanelWidth}px` }}
          className="flex-shrink-0 bg-[#CDCBD6] border-l border-[#2F3020]/20 flex flex-col overflow-hidden text-[#2F3020]"
        >
          {/* Top 3-Way Tabs: Presets | Captions | Customize */}
          <div className="p-2.5 border-b border-[#2F3020]/15 bg-[#CDCBD6] flex-shrink-0">
            <div className="flex bg-[#FAF7F5] p-1 rounded-xl border border-[#2F3020]/15 gap-1 shadow-2xs">
              <button
                onClick={() => setStudioTab('presets')}
                className={cn(
                  "flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate",
                  studioTab === 'presets'
                    ? "bg-[#16A34A] text-white shadow-xs"
                    : "text-[#2F3020]/75 hover:text-[#2F3020] hover:bg-black/5"
                )}
              >
                <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Presets</span>
              </button>

              <button
                onClick={() => setStudioTab('transcript')}
                className={cn(
                  "flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate",
                  studioTab === 'transcript'
                    ? "bg-[#16A34A] text-white shadow-xs"
                    : "text-[#2F3020]/75 hover:text-[#2F3020] hover:bg-black/5"
                )}
              >
                <Type className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Captions</span>
              </button>

              <button
                onClick={() => setStudioTab('style')}
                className={cn(
                  "flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate",
                  studioTab === 'style'
                    ? "bg-[#16A34A] text-white shadow-xs"
                    : "text-[#2F3020]/75 hover:text-[#2F3020] hover:bg-black/5"
                )}
              >
                <Sliders className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Style</span>
              </button>
            </div>
          </div>

          {/* Studio Panel Body */}
          <div className="flex-1 overflow-y-auto p-3">
            {/* Tab 1: 31 CapCut Animated Presets */}
            {studioTab === 'presets' && (
              <CaptionPresetGallery
                selectedPresetId={captionStyle.id}
                onSelectPreset={handleSelectPreset}
              />
            )}

            {/* Tab 2: Word & Segment Editor */}
            {studioTab === 'transcript' && (
              <TranscriptionPanel
                transcript={currentTranscript}
                currentJob={currentJob}
                activeSegment={activeSegment}
                onSeek={seekTo}
                onTranscriptChange={applyTranscriptChange}
                onStartTranscription={handleStartTranscription}
                hasVideo={Boolean(videoSrc || localVideoFile || currentProject?.localVideoUrl || currentProject?.originalAssetPath)}
                onSplitSegment={handleSplitSegment}
                onDeleteSegment={handleDeleteSegment}
                onMergeSegment={handleMergeSegment}
                onAddSegment={handleAddSegment}
              />
            )}

            {/* Tab 3: Detailed Style & Typography Controls */}
            {studioTab === 'style' && (
              <CaptionStyleControls
                captionStyle={captionStyle}
                onChange={handleStyleChange}
              />
            )}
          </div>
        </aside>
      </div>

      {/* ── 3. Bottom Multi-Track Subtitle Timeline in Lavender Neutral ── */}
      <div
        style={{ height: `${timelineHeight}px` }}
        className="flex-shrink-0 flex flex-col relative bg-[#CDCBD6] border-t border-[#2F3020]/25 shadow-lg select-none text-[#2F3020] overflow-hidden"
      >
        {/* Resize handle */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            isResizingTimeline.current = true;
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
          }}
          className="absolute -top-1.5 left-0 right-0 h-3 cursor-row-resize z-30 flex items-center justify-center group"
          title="Drag to resize timeline"
        >
          <div className="w-16 h-1 rounded-full bg-[#2F3020]/35 group-hover:bg-[#16A34A] group-hover:h-1.5 transition-all shadow-xs" />
        </div>

        <div className="h-full w-full overflow-hidden flex flex-col">
          <FluxoCutTimeline
            currentTime={currentTime}
            duration={duration}
            playing={playing}
            onSeek={seekTo}
            onTogglePlay={togglePlay}
            onSkipBack={() => seekTo(Math.max(0, currentTime - 1))}
            onSkipForward={() => seekTo(Math.min(duration || 20.5, currentTime + 1))}
            videoElement={videoRef.current}
            transcript={currentTranscript}
            activeSegment={activeSegment}
            onSplit={handleSplitSegment}
            onDelete={handleDeleteSegment}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={history.past.length > 0}
            canRedo={history.future.length > 0}
            onSelectSegment={(seg) => setActiveSegment(seg)}
            onUpdateSegmentTime={handleUpdateSegmentTime}
          />
        </div>
      </div>

      {/* ── Export Modal (Burns preset styling into final MP4) ── */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        transcript={currentTranscript}
        captionStyle={captionStyle}
        projectId={projectId!}
        videoTitle={currentProject?.title || 'video'}
      />
    </div>
  );
}
