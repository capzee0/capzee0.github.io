import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Mic, Settings2, Download, Share2, Loader2, AlertCircle,
  ChevronLeft, Clock
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { getProject, getTranscript, startTranscription, getJob, saveTranscript } from '@/services/api';
import { CaptionStylePanel } from './components/CaptionStylePanel';
import { CaptionOverlay } from './components/CaptionOverlay';
import { TranscriptionPanel } from './components/TranscriptionPanel';
import { ExportModal } from './components/ExportModal';
import { formatDuration, cn } from '@/lib/utils';
import type { Transcript, Segment } from '@capzee/contracts';

type PanelTab = 'transcript' | 'style';

export function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const {
    currentProject, setCurrentProject,
    currentTranscript, setCurrentTranscript,
    captionStyle, localVideoFile,
    currentJob, setCurrentJob, updateJob,
  } = useProjectStore();

  // Video state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [activeSegment, setActiveSegment] = useState<Segment | null>(null);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);

  // UI state
  const [panelTab, setPanelTab] = useState<PanelTab>('transcript');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Job polling
  const jobPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load project & transcript ────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;

    async function load() {
      setLoading(true);
      try {
        let project = currentProject?.id === projectId ? currentProject : null;
        if (!project) {
          try {
            project = await getProject(projectId!) as typeof currentProject;
          } catch {
            // Use local store project
            project = currentProject;
          }
        }
        if (project) setCurrentProject(project as typeof currentProject);

        // Set video source
        if (localVideoFile) {
          setVideoSrc(URL.createObjectURL(localVideoFile));
        } else if ((project as { localVideoUrl?: string })?.localVideoUrl) {
          setVideoSrc((project as { localVideoUrl?: string }).localVideoUrl!);
        }

        // Load transcript if available
        if (!currentTranscript) {
          try {
            const transcript = await getTranscript(projectId!);
            setCurrentTranscript(transcript);
          } catch {
            // No transcript yet — normal for new projects
          }
        }
      } catch (err) {
        setError('Failed to load project.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  // ── Video events ─────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      const t = video.currentTime;
      setCurrentTime(t);

      if (currentTranscript) {
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

  // ── Job polling ──────────────────────────────────────────────────────────
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
            setCurrentTranscript(transcript);
          } catch {/* ignore */}
        } else if (job.status === 'failed') {
          clearInterval(jobPollRef.current!);
        }
      } catch {/* ignore poll errors */}
    }, 1500);

    return () => { if (jobPollRef.current) clearInterval(jobPollRef.current); };
  }, [currentJob?.id, currentJob?.status]);

  // ── Playback controls ────────────────────────────────────────────────────
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

  function handleScrub(e: React.ChangeEvent<HTMLInputElement>) {
    seekTo(parseFloat(e.target.value));
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !muted;
    setMuted(!muted);
  }

  // ── Transcript save ──────────────────────────────────────────────────────
  const handleTranscriptChange = useCallback(async (transcript: Transcript) => {
    setCurrentTranscript(transcript);
    try {
      await saveTranscript(projectId!, transcript);
    } catch {/* local save is fine */}
  }, [projectId]);

  // ── Transcription start ──────────────────────────────────────────────────
  async function handleStartTranscription(opts: { language: string; model: string }) {
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
    } catch (err) {
      setError('Failed to start transcription. Ensure the API server is running.');
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent-blue" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border bg-bg-panel flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-ghost p-2"
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="font-semibold text-sm text-text-primary leading-tight">
              {currentProject?.title ?? 'Editor'}
            </h2>
            <p className="text-xs text-text-muted leading-tight">
              {formatDuration(duration)} · {currentProject?.status ?? 'ready'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/social-captions/${projectId}`)}
            className="btn-secondary text-xs py-1.5 px-3"
            disabled={!currentTranscript}
          >
            <Share2 className="w-3.5 h-3.5" />
            Social Captions
          </button>
          <button
            onClick={() => setExportModalOpen(true)}
            className="btn-primary text-xs py-1.5 px-3"
            disabled={!currentTranscript}
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="mx-4 mt-3 flex items-start gap-2 p-3 rounded-lg bg-status-error/10 border border-status-error/30 text-status-error text-xs">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-status-error hover:text-red-300">✕</button>
        </div>
      )}

      {/* ── Main layout ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <div className="w-[280px] flex-shrink-0 flex flex-col border-r border-surface-border overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-surface-border">
            {([['transcript', 'Transcript', Mic], ['style', 'Style', Settings2]] as const).map(([tab, label, Icon]) => (
              <button
                key={tab}
                onClick={() => setPanelTab(tab)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors',
                  panelTab === tab
                    ? 'text-accent-blue border-b-2 border-accent-blue'
                    : 'text-text-muted hover:text-text-secondary'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto">
            {panelTab === 'transcript' ? (
              <TranscriptionPanel
                transcript={currentTranscript}
                currentJob={currentJob}
                activeSegment={activeSegment}
                onTranscriptChange={handleTranscriptChange}
                onStartTranscription={handleStartTranscription}
                onSeek={seekTo}
              />
            ) : (
              <CaptionStylePanel />
            )}
          </div>
        </div>

        {/* Centre: video preview */}
        <div className="flex-1 flex flex-col items-center justify-center bg-black overflow-hidden relative">
          {videoSrc ? (
            <>
              <div className="relative max-h-full max-w-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className="max-h-[calc(100vh-220px)] max-w-full object-contain"
                  playsInline
                  onClick={togglePlay}
                />
                {/* Caption overlay */}
                {activeSegment && (
                  <CaptionOverlay
                    segment={activeSegment}
                    activeWordIndex={activeWordIndex}
                    style={captionStyle}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-surface-DEFAULT flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-text-muted" />
              </div>
              <p className="text-text-secondary">No video loaded</p>
              <p className="text-xs text-text-muted mt-1">Go back and select a video file</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Playback bar ── */}
      {videoSrc && (
        <div className="flex-shrink-0 bg-bg-panel border-t border-surface-border px-6 py-3">
          {/* Scrubber */}
          <div className="mb-2">
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.01}
              value={currentTime}
              onChange={handleScrub}
              className="w-full h-1.5 rounded-full accent-accent-blue cursor-pointer"
              aria-label="Video playback position"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted font-mono">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>

            <div className="flex items-center gap-3">
              <button
                onClick={() => seekTo(currentTime - 5)}
                className="btn-ghost p-1.5"
                aria-label="Skip back 5 seconds"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-accent-blue hover:bg-blue-500 flex items-center justify-center transition-colors"
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
              </button>
              <button
                onClick={() => seekTo(currentTime + 5)}
                className="btn-ghost p-1.5"
                aria-label="Skip forward 5 seconds"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={toggleMute}
              className="btn-ghost p-1.5"
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* ── Export Modal ── */}
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
