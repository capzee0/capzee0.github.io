import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Download, ChevronLeft, Film, Upload, Sparkles,
  Type, Sliders, Shield, Scissors,
  Smartphone, Monitor, Square,
  Keyboard, CheckCircle2
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useAuthStore } from '@/stores/authStore';
import {
  getProject, getTranscript, startTranscription, getJob, getMediaUrl, subscribeJobEvents, type RemovedClip
} from '@/services/api';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { CaptionOverlay } from './components/CaptionOverlay';
import { CaptionPresetGallery } from './components/CaptionPresetGallery';
import { CaptionStyleControls } from './components/CaptionStyleControls';
import { TranscriptionPanel } from './components/TranscriptionPanel';
import { ExportModal } from './components/ExportModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { FluxoCutTimeline } from './components/FluxoCutTimeline';
import { FluxoCutSilencePanel } from './components/FluxoCutSilencePanel';
import { AiSocialPanel } from './components/AiSocialPanel';
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
type StudioTab = 'presets' | 'transcript' | 'style' | 'silence' | 'ai';
type MobileTab = 'preview' | 'presets' | 'transcript' | 'style' | 'silence' | 'ai';

export function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const {
    currentProject, setCurrentProject,
    currentTranscript, setCurrentTranscript,
    captionStyle, setCaptionStyle, replaceCaptionStyle,
    localVideoFile, setLocalVideoFile,
    currentJob, setCurrentJob, updateJob,
  } = useProjectStore();
  const { user } = useAuthStore();

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
  const [mobileTab, setMobileTab] = useState<MobileTab>('preview');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    (captionStyle?.aspectRatio as AspectRatio) || '9:16'
  );
  const [safeZone, setSafeZone] = useState(false);

  // Resizable layout state & Modals
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const jobPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load project & transcript ────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;

    async function load() {
      const {
        projects,
        currentProject,
        currentTranscript,
        localVideoFile,
        setCurrentProject,
        setCurrentTranscript,
      } = useProjectStore.getState();
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
        const storedProject = projects.find((p) => p.id === projectId) || project;
        if (localVideoFile && currentProject?.id === projectId) {
          setVideoSrc(URL.createObjectURL(localVideoFile));
        } else if (storedProject?.localVideoUrl) {
          setVideoSrc(storedProject.localVideoUrl);
        } else if (storedProject?.originalAssetPath) {
          setVideoSrc(getMediaUrl(projectId!));
        }

        // Auto-load or generate captions immediately
        const hasSegments = Boolean(currentTranscript?.segments && currentTranscript.segments.length > 0);
        if (!hasSegments) {
          let loaded = false;
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
            // Not yet generated on backend
          }

          if (!loaded) {
            const demo = getDemoTranscript('en');
            setCurrentTranscript(demo);
            setActiveSegment(demo.segments[0] || null);
          }
        } else if (currentTranscript?.segments?.length) {
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

  // Sync video time with subtitle overlay and word index (60fps rAF when playing)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animFrameId: number | null = null;

    const syncTime = () => {
      const t = video.currentTime;
      setCurrentTime(t);

      if (currentTranscript?.segments) {
        const seg = currentTranscript.segments.find(
          (s) => t >= s.start && t <= s.end
        ) ?? null;
        setActiveSegment(seg);

        if (seg?.words && seg.words.length > 0) {
          const wordIdx = seg.words.findIndex(
            (w) => t >= w.start && t <= w.end
          );
          setActiveWordIndex(wordIdx);
        } else {
          setActiveWordIndex(-1);
        }
      }
    };

    const loop = () => {
      syncTime();
      if (!video.paused && !video.ended) {
        animFrameId = requestAnimationFrame(loop);
      }
    };

    const onPlay = () => {
      setPlaying(true);
      if (animFrameId) cancelAnimationFrame(animFrameId);
      animFrameId = requestAnimationFrame(loop);
    };

    const onPause = () => {
      setPlaying(false);
      if (animFrameId) cancelAnimationFrame(animFrameId);
      syncTime();
    };

    const onEnded = () => {
      setPlaying(false);
      if (animFrameId) cancelAnimationFrame(animFrameId);
      syncTime();
    };

    const onDurationChange = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };

    video.addEventListener('timeupdate', syncTime);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('loadedmetadata', onDurationChange);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      video.removeEventListener('timeupdate', syncTime);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('loadedmetadata', onDurationChange);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
    };
  }, [currentTranscript]);

  // Polling for transcription jobs
  useEffect(() => {
    const activeJobId = currentJob?.id;
    const jobStatus = currentJob?.status;
    if (!activeJobId || !['queued', 'processing'].includes(jobStatus ?? '')) {
      if (jobPollRef.current) clearInterval(jobPollRef.current);
      return;
    }

    jobPollRef.current = setInterval(async () => {
      try {
        const job = await getJob(activeJobId);
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
  }, [currentJob?.id, currentJob?.status, projectId, setCurrentTranscript, updateJob]);

  // ── Undo / Redo history tracking ──────────────────────────────────────────
  const [history, setHistory] = useState<{ past: Transcript[]; future: Transcript[] }>({
    past: [],
    future: [],
  });

  const applyTranscriptChange = useCallback((nextTranscript: Transcript) => {
    if (currentTranscript) {
      setHistory((prev) => ({
        past: [...prev.past.slice(-30), currentTranscript],
        future: [],
      }));
    }
    setCurrentTranscript(nextTranscript);
  }, [currentTranscript, setCurrentTranscript]);

  const handleUndo = useCallback(() => {
    if (history.past.length === 0 || !currentTranscript) return;
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);
    setHistory({
      past: newPast,
      future: [currentTranscript, ...history.future],
    });
    setCurrentTranscript(previous);
  }, [currentTranscript, history, setCurrentTranscript]);

  const handleRedo = useCallback(() => {
    if (history.future.length === 0 || !currentTranscript) return;
    const next = history.future[0];
    const newFuture = history.future.slice(1);
    setHistory({
      past: [...history.past, currentTranscript],
      future: newFuture,
    });
    setCurrentTranscript(next);
  }, [currentTranscript, history, setCurrentTranscript]);

  // ── Subtitle Segment Operations ───────────────────────────────────────────
  const handleSplitSegment = useCallback(() => {
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
  }, [activeSegment, applyTranscriptChange, currentTime, currentTranscript]);

  const handleDeleteSegment = useCallback((segId?: string) => {
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
  }, [activeSegment, applyTranscriptChange, currentTime, currentTranscript]);

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

  const handleClipsRemoved = (clips: RemovedClip[]) => {
    if (!currentTranscript) return;
    let adjustedSegments = [...currentTranscript.segments];
    for (const clip of clips) {
      adjustedSegments = adjustedSegments.map((seg) => {
        if (seg.start >= clip.end) {
          const delta = clip.duration;
          return {
            ...seg,
            start: Math.max(0, Number((seg.start - delta).toFixed(2))),
            end: Math.max(0, Number((seg.end - delta).toFixed(2))),
            words: seg.words?.map((w) => ({
              ...w,
              start: Math.max(0, Number((w.start - delta).toFixed(2))),
              end: Math.max(0, Number((w.end - delta).toFixed(2))),
            })),
          };
        }
        return seg;
      });
    }
    applyTranscriptChange({ ...currentTranscript, segments: adjustedSegments });
  };

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      if (playing) {
        video.pause();
      } else {
        video.play().catch((err) => {
          console.warn('Playback deferred / autoplay policy:', err);
          setPlaying(false);
        });
      }
    } else {
      setPlaying((prev) => !prev);
    }
  }, [playing]);

  const seekTo = useCallback((seconds: number) => {
    const video = videoRef.current;
    const maxDur = duration > 0 ? duration : (video?.duration && !isNaN(video.duration) ? video.duration : 20.5);
    const target = Math.max(0, Math.min(seconds, maxDur));
    setCurrentTime(target);
    if (video) {
      video.currentTime = target;
    }
  }, [duration]);

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

      if (e.code === 'Space' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        seekTo(Math.max(0, currentTime - 2));
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        seekTo(Math.min(duration || 20.5, currentTime + 2));
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShortcutsModalOpen((prev) => !prev);
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
  }, [
    playing,
    currentTranscript,
    activeSegment,
    currentTime,
    history,
    duration,
    handleDeleteSegment,
    handleRedo,
    handleSplitSegment,
    handleUndo,
    seekTo,
    togglePlay,
  ]);

  // Virtual clock loop when playing in demo / virtual canvas mode (without HTML video element)
  useEffect(() => {
    if (videoSrc) return;
    if (!playing) return;
    let animId: number;
    let lastTime = performance.now();
    const maxDur = duration > 0 ? duration : 20.5;

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      setCurrentTime((prev) => {
        const next = prev + dt;
        if (next >= maxDur) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [playing, videoSrc, duration]);

  // Sync virtual clock with active segment & word index in demo mode
  useEffect(() => {
    if (videoSrc) return;
    if (currentTranscript?.segments) {
      const seg = currentTranscript.segments.find(
        (s) => currentTime >= s.start && currentTime <= s.end
      ) ?? null;
      setActiveSegment(seg);

      if (seg?.words && seg.words.length > 0) {
        const wordIdx = seg.words.findIndex(
          (w) => currentTime >= w.start && currentTime <= w.end
        );
        setActiveWordIndex(wordIdx);
      } else {
        setActiveWordIndex(-1);
      }
    }
  }, [currentTime, videoSrc, currentTranscript]);

  async function handleStartTranscription(opts: {
    language: string;
    model: string;
    captionOutput?: 'native' | 'roman' | 'translate';
  }) {
    if (!projectId) return;
    try {
      const { jobId } = await startTranscription(projectId, opts);
      const initialJob = {
        id: jobId,
        status: 'queued',
        progress: 0,
        stage: 'queued',
        errorCode: null,
        errorMessage: null,
      };
      setCurrentJob(initialJob);

      // Stream progress in real-time via SSE
      subscribeJobEvents(jobId, (update) => {
        updateJob({
          status: update.status,
          progress: update.progress,
          stage: update.stage,
          errorCode: update.errorCode,
          errorMessage: update.errorMessage,
        });
      })
        .then(async () => {
          try {
            const freshTranscript = await getTranscript(projectId);
            if (freshTranscript) {
              setCurrentTranscript(freshTranscript);
            }
          } catch {
            // fallback
          }
          if (currentProject) {
            setCurrentProject({ ...currentProject, status: 'transcribed' });
          }
        })
        .catch((err) => {
          console.warn('[EditorPage] Transcription job failed:', err);
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
      <header className="h-12 flex-shrink-0 bg-[#CDCBD6] border-b border-[#2F3020]/20 px-2 sm:px-4 flex items-center justify-between z-20 text-[#2F3020] shadow-xs">
        {/* Left: Back, Project Title & Autosave Badge */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1 text-xs font-bold text-[#2F3020]/80 hover:text-[#2F3020] transition-colors p-1 sm:px-2 sm:py-1 rounded-lg hover:bg-[#FAF7F5] group cursor-pointer flex-shrink-0"
            title="Back to Projects Dashboard"
          >
            <ChevronLeft className="w-4 h-4 text-[#2F3020]/60 group-hover:text-[#2F3020] transition-colors" />
            <span className="hidden sm:inline">Projects</span>
          </button>

          <div className="h-4 w-px bg-[#2F3020]/15 hidden xs:block" />

          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            <img src="/capzee-icon.png" alt="Capzee" className="w-4.5 h-4.5 sm:w-5 sm:h-5 object-contain drop-shadow-xs flex-shrink-0" />
            <span className="text-[11px] sm:text-xs font-bold text-[#2F3020] tracking-tight truncate max-w-[80px] xs:max-w-[120px] sm:max-w-xs md:max-w-md">
              {currentProject?.title || 'Video Caption Project'}
            </span>
            <span className="hidden xs:inline-block text-[9px] sm:text-[10px] text-[#16A34A] bg-[#16A34A]/10 border border-[#16A34A]/25 font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-full flex-shrink-0">
              {formatDuration(duration || 20.5)}
            </span>
            {/* Autosave Status Pill */}
            <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#16A34A]/10 border border-[#16A34A]/25 text-[#16A34A] text-[9.5px] font-bold">
              <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />
              <span>Saved</span>
            </div>
          </div>
        </div>

        {/* Center: Aspect Ratio Selector with Visual Device Icons */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-[#FAF7F5] p-0.5 sm:p-1 rounded-xl border border-[#2F3020]/15 shadow-2xs">
          <button
            onClick={() => {
              setAspectRatio('9:16');
              setCaptionStyle({ aspectRatio: '9:16' });
            }}
            className={cn(
              'px-1.5 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer',
              aspectRatio === '9:16'
                ? 'bg-[#16A34A] text-white shadow-xs'
                : 'text-[#2F3020]/70 hover:text-[#2F3020] hover:bg-black/5'
            )}
            title="9:16 Vertical (Instagram Reels, TikTok, YouTube Shorts)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">9:16</span>
          </button>

          <button
            onClick={() => {
              setAspectRatio('16:9');
              setCaptionStyle({ aspectRatio: '16:9' });
            }}
            className={cn(
              'px-1.5 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer',
              aspectRatio === '16:9'
                ? 'bg-[#16A34A] text-white shadow-xs'
                : 'text-[#2F3020]/70 hover:text-[#2F3020] hover:bg-black/5'
            )}
            title="16:9 Widescreen (YouTube, Landscape Video)"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">16:9</span>
          </button>

          <button
            onClick={() => {
              setAspectRatio('1:1');
              setCaptionStyle({ aspectRatio: '1:1' });
            }}
            className={cn(
              'px-1.5 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer',
              aspectRatio === '1:1'
                ? 'bg-[#16A34A] text-white shadow-xs'
                : 'text-[#2F3020]/70 hover:text-[#2F3020] hover:bg-black/5'
            )}
            title="1:1 Square (Instagram Posts, Feed)"
          >
            <Square className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">1:1</span>
          </button>
        </div>

        {/* Right: Keyboard Shortcuts Guide, Safe Zone Toggle & Primary Export Button */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Shortcuts Guide Button (?) */}
          <button
            onClick={() => setShortcutsModalOpen(true)}
            className="p-1.5 sm:px-2 sm:py-1.5 rounded-lg transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer bg-[#FAF7F5] text-[#2F3020] border border-[#2F3020]/15 hover:bg-white"
            title="Keyboard Shortcuts Guide (?)"
          >
            <Keyboard className="w-3.5 h-3.5 text-[#2F3020]/80" />
            <span className="hidden xl:inline text-[11px] font-bold">Shortcuts</span>
          </button>

          {/* Safe Zone Boundary Guide */}
          <button
            onClick={() => setSafeZone(!safeZone)}
            className={cn(
              "p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer border",
              safeZone
                ? "bg-[#16A34A] text-white border-[#16A34A] shadow-xs"
                : "bg-[#FAF7F5] text-[#2F3020]/80 border-[#2F3020]/15 hover:text-[#2F3020]"
            )}
            title="Toggle TikTok / Instagram Reels Safe Zone"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px]">Safe Zone</span>
          </button>

          {/* Social Posts Generator Navigation */}
          <button
            onClick={() => navigate(`/social-captions/${projectId}`)}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-[#FAF7F5] text-[#2F3020] border border-[#2F3020]/15 hover:bg-white hover:text-[#D96846]"
            title="Generate AI Social Media Captions, Hooks & Hashtags"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D96846]" />
            <span className="hidden lg:inline text-[11px] font-bold">Social Posts</span>
          </button>

          {/* Primary Export Action */}
          <button
            onClick={() => setExportModalOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 bg-[#16A34A] hover:bg-[#15803D] active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex-shrink-0"
            id="export-video-btn"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden xs:inline">Export Video</span>
            <span className="xs:hidden">Export</span>
          </button>

          {/* User Profile Pill in Editor Top Bar */}
          {user && (
            <button
              onClick={() => navigate('/dashboard')}
              className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-[#FAF7F5] hover:bg-white border border-[#2F3020]/20 rounded-xl cursor-pointer shadow-2xs transition-all text-left group ml-1"
              title="Return to Dashboard & Profile Settings"
            >
              <div className="w-6 h-6 rounded-full p-0.5 bg-gradient-to-tr from-[#16A34A]/50 to-emerald-300 flex-shrink-0 shadow-xs">
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#D96846] text-white flex items-center justify-center text-[10px] font-black">
                    {(user.email ? user.email[0] : 'U').toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-[11px] font-bold text-[#2F3020] truncate max-w-[110px]">
                {user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'User')}
              </span>
              <span className="text-[8.5px] font-extrabold text-[#16A34A] bg-[#16A34A]/10 border border-[#16A34A]/30 px-1.5 py-0.5 rounded-full">
                Free
              </span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile / Tablet View Switcher Tab Bar */}
      <div className="lg:hidden flex items-center justify-between px-2 sm:px-4 py-1.5 bg-[#CDCBD6] border-b border-[#2F3020]/20 flex-shrink-0 z-10">
        <div className="flex bg-[#FAF7F5] p-0.5 rounded-xl border border-[#2F3020]/15 w-full max-w-md mx-auto shadow-2xs gap-0.5 sm:gap-1">
          <button
            onClick={() => setMobileTab('preview')}
            className={cn(
              "flex-1 py-1 px-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate",
              mobileTab === 'preview'
                ? "bg-[#16A34A] text-white shadow-xs"
                : "text-[#2F3020]/75 hover:text-[#2F3020]"
            )}
          >
            <Film className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Preview</span>
          </button>
          <button
            onClick={() => { setMobileTab('presets'); setStudioTab('presets'); }}
            className={cn(
              "flex-1 py-1 px-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate",
              mobileTab === 'presets'
                ? "bg-[#16A34A] text-white shadow-xs"
                : "text-[#2F3020]/75 hover:text-[#2F3020]"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Presets</span>
          </button>
          <button
            onClick={() => { setMobileTab('transcript'); setStudioTab('transcript'); }}
            className={cn(
              "flex-1 py-1 px-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate",
              mobileTab === 'transcript'
                ? "bg-[#16A34A] text-white shadow-xs"
                : "text-[#2F3020]/75 hover:text-[#2F3020]"
            )}
          >
            <Type className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Captions</span>
          </button>
          <button
            onClick={() => { setMobileTab('style'); setStudioTab('style'); }}
            className={cn(
              "flex-1 py-1 px-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate",
              mobileTab === 'style'
                ? "bg-[#16A34A] text-white shadow-xs"
                : "text-[#2F3020]/75 hover:text-[#2F3020]"
            )}
          >
            <Sliders className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Style</span>
          </button>
          <button
            onClick={() => { setMobileTab('silence'); setStudioTab('silence'); }}
            className={cn(
              "flex-1 py-1 px-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate",
              mobileTab === 'silence'
                ? "bg-[#16A34A] text-white shadow-xs"
                : "text-[#2F3020]/75 hover:text-[#2F3020]"
            )}
          >
            <Scissors className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Silence</span>
          </button>
          <button
            onClick={() => { setMobileTab('ai'); setStudioTab('ai'); }}
            className={cn(
              "flex-1 py-1 px-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate",
              mobileTab === 'ai'
                ? "bg-[#16A34A] text-white shadow-xs"
                : "text-[#2F3020]/75 hover:text-[#2F3020]"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
            <span>AI</span>
          </button>
        </div>
      </div>

      {/* ── 2. DESKTOP 3-PANE STUDIO LAYOUT (Left: Presets | Center: Video + Timeline | Right: Inspector) ── */}
      <div className="hidden lg:flex flex-1 overflow-hidden min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full">
          {/* ── LEFT PANE: Media & Preset Library ── */}
          <ResizablePanel
            defaultSize={22}
            minSize={16}
            maxSize={32}
            id="left-pane"
            collapsible
            className="bg-[#CDCBD6] border-r border-[#2F3020]/20 flex flex-col overflow-hidden text-[#2F3020]"
          >
            <div className="p-2.5 border-b border-[#2F3020]/15 bg-[#CDCBD6] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#2F3020]">
                <Sparkles className="w-3.5 h-3.5 text-[#16A34A]" />
                <span>Preset Gallery</span>
              </div>
              <span className="text-[10px] font-bold text-[#16A34A] bg-[#16A34A]/10 px-1.5 py-0.5 rounded-full border border-[#16A34A]/20 font-mono">
                Viral Styles
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-2.5">
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
                className="bg-[#D96846] relative flex flex-col items-center justify-center p-2 sm:p-3 overflow-hidden min-w-0 min-h-0"
              >
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
                          onError={() => {
                            console.warn("Video failed to play from source:", videoSrc);
                          }}
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
                    ) : currentTranscript && currentTranscript.segments.length > 0 ? (
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
                                  setLocalVideoFile(file);
                                  setVideoSrc(URL.createObjectURL(file));
                                }
                              }}
                            />
                          </label>
                        </div>

                        {/* Animated CapCut Captions Overlay in Virtual Canvas */}
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
                      </div>
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
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Bottom Multi-Track Subtitle Timeline */}
              <ResizablePanel
                defaultSize={32}
                minSize={20}
                id="center-timeline"
                className="bg-[#CDCBD6] border-t border-[#2F3020]/25 flex flex-col overflow-hidden"
              >
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
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* ── RIGHT PANE: Inspector (Captions & Style Customization) ── */}
          <ResizablePanel
            defaultSize={26}
            minSize={20}
            maxSize={38}
            id="right-pane"
            collapsible
            className="bg-[#CDCBD6] border-l border-[#2F3020]/20 flex flex-col overflow-hidden text-[#2F3020]"
          >
            {/* Top Tabs: Captions | Style */}
            <div className="p-2.5 border-b border-[#2F3020]/15 bg-[#CDCBD6] flex-shrink-0">
              <div className="flex bg-[#FAF7F5] p-1 rounded-xl border border-[#2F3020]/15 gap-1 shadow-2xs">
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

                <button
                  onClick={() => setStudioTab('silence')}
                  className={cn(
                    "flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate",
                    studioTab === 'silence'
                      ? "bg-[#16A34A] text-white shadow-xs"
                      : "text-[#2F3020]/75 hover:text-[#2F3020] hover:bg-black/5"
                  )}
                >
                  <Scissors className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Silence</span>
                </button>

                <button
                  onClick={() => setStudioTab('ai')}
                  className={cn(
                    "flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate",
                    studioTab === 'ai'
                      ? "bg-[#16A34A] text-white shadow-xs"
                      : "text-[#2F3020]/75 hover:text-[#2F3020] hover:bg-black/5"
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>AI Hooks</span>
                </button>
              </div>
            </div>

            {/* Right Inspector Body */}
            <div className="flex-1 overflow-y-auto p-3">
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

              {studioTab === 'style' && (
                <CaptionStyleControls
                  idPrefix="desktop-style"
                  captionStyle={captionStyle}
                  onChange={handleStyleChange}
                />
              )}

              {studioTab === 'silence' && (
                <FluxoCutSilencePanel
                  projectId={projectId!}
                  onClipsRemoved={handleClipsRemoved}
                />
              )}

              {studioTab === 'ai' && (
                <AiSocialPanel
                  transcript={currentTranscript}
                  videoTitle={currentProject?.title}
                  onUpdateTitle={(newTitle) => {
                    if (currentProject) {
                      setCurrentProject({ ...currentProject, title: newTitle });
                    }
                  }}
                />
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* ── MOBILE / TABLET WORKSPACE FALLBACK (< lg) ── */}
      <div className="lg:hidden flex-1 flex flex-col overflow-hidden min-h-0">
        {mobileTab === 'preview' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex-1 bg-[#D96846] relative flex items-center justify-center p-2 overflow-hidden">
              <div
                className={cn(
                  "relative bg-black rounded-2xl overflow-hidden border border-[#2F3020]/30 shadow-xl flex items-center justify-center",
                  aspectRatio === '9:16' && "h-full aspect-[9/16]",
                  aspectRatio === '16:9' && "w-full aspect-[16/9]",
                  aspectRatio === '1:1' && "h-full aspect-square"
                )}
              >
                {videoSrc && (
                  <>
                    <video
                      ref={videoRef}
                      src={videoSrc}
                      playsInline
                      crossOrigin="anonymous"
                      className="w-full h-full object-contain"
                    />
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
                  </>
                )}
              </div>
            </div>
            <div className="h-44 bg-[#CDCBD6] border-t border-[#2F3020]/20 flex flex-col flex-shrink-0">
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
        )}

        {mobileTab === 'presets' && (
          <div className="flex-1 overflow-y-auto p-3 bg-[#CDCBD6]">
            <CaptionPresetGallery
              selectedPresetId={captionStyle.id}
              onSelectPreset={handleSelectPreset}
            />
          </div>
        )}

        {mobileTab === 'transcript' && (
          <div className="flex-1 overflow-y-auto p-3 bg-[#CDCBD6]">
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
          </div>
        )}

        {mobileTab === 'style' && (
          <div className="flex-1 overflow-y-auto p-3 bg-[#CDCBD6]">
            <CaptionStyleControls
              idPrefix="mobile-style"
              captionStyle={captionStyle}
              onChange={handleStyleChange}
            />
          </div>
        )}

        {mobileTab === 'silence' && (
          <div className="flex-1 overflow-y-auto p-3 bg-[#CDCBD6]">
            <FluxoCutSilencePanel
              projectId={projectId!}
              onClipsRemoved={handleClipsRemoved}
            />
          </div>
        )}

        {mobileTab === 'ai' && (
          <div className="flex-1 overflow-y-auto p-3 bg-[#CDCBD6]">
            <AiSocialPanel
              transcript={currentTranscript}
              videoTitle={currentProject?.title}
              onUpdateTitle={(newTitle) => {
                if (currentProject) {
                  setCurrentProject({ ...currentProject, title: newTitle });
                }
              }}
            />
          </div>
        )}
      </div>

      {/* ── Keyboard Shortcuts Guide Modal ── */}
      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

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
