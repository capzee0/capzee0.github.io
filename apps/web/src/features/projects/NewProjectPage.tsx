import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { AlertCircle, Loader2, FileVideo, Sparkles, Video, Play } from 'lucide-react';
import { cn, formatFileSize, formatDuration, ACCEPTED_VIDEO_TYPES } from '@/lib/utils';
import { createProject, uploadMedia, startTranscription } from '@/services/api';
import { useProjectStore, type Project } from '@/stores/projectStore';
import { SUPPORTED_TRANSCRIPTION_LANGUAGES, getDemoTranscript, getCaptionOutputMeta } from '@capzee/contracts';

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

interface ValidationError {
  code: string;
  message: string;
}

interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  qualityLabel: string;
  resolution: string;
  aspectRatio: string;
}

function validateFile(file: File): ValidationError | null {
  const accepted = ['video/mp4', 'video/quicktime', 'video/webm'];
  if (!accepted.includes(file.type)) {
    return {
      code: 'INVALID_TYPE',
      message: `File type "${file.type}" is not supported. Please use MP4, MOV, or WebM.`,
    };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      code: 'FILE_TOO_LARGE',
      message: `File size ${formatFileSize(file.size)} exceeds the 500 MB limit.`,
    };
  }
  return null;
}

function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.URL?.createObjectURL) {
      resolve({
        width: 1080,
        height: 1920,
        duration: 0,
        qualityLabel: '1080p Full HD',
        resolution: '1080×1920',
        aspectRatio: '9:16',
      });
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    let url = '';
    try {
      url = URL.createObjectURL(file);
    } catch {
      resolve({
        width: 0,
        height: 0,
        duration: 0,
        qualityLabel: 'HD Video',
        resolution: '',
        aspectRatio: '',
      });
      return;
    }

    video.src = url;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;
      const duration = video.duration || 0;

      const maxDim = Math.max(width, height);
      const minDim = Math.min(width, height);

      let qualityLabel = 'SD';
      if (maxDim >= 3840 || minDim >= 2160) {
        qualityLabel = '4K Ultra HD';
      } else if (maxDim >= 2560 || minDim >= 1440) {
        qualityLabel = '1440p 2K';
      } else if (maxDim >= 1920 || minDim >= 1080) {
        qualityLabel = '1080p Full HD';
      } else if (maxDim >= 1280 || minDim >= 720) {
        qualityLabel = '720p HD';
      } else if (maxDim >= 854 || minDim >= 480) {
        qualityLabel = '480p SD';
      }

      let aspectRatio = '';
      if (width > 0 && height > 0) {
        const ratio = width / height;
        if (Math.abs(ratio - 9 / 16) < 0.05) aspectRatio = '9:16';
        else if (Math.abs(ratio - 16 / 9) < 0.05) aspectRatio = '16:9';
        else if (Math.abs(ratio - 1) < 0.05) aspectRatio = '1:1';
        else if (ratio < 1) aspectRatio = 'Vertical';
        else aspectRatio = 'Landscape';
      }

      resolve({
        width,
        height,
        duration,
        qualityLabel,
        resolution: width > 0 && height > 0 ? `${width}×${height}` : '',
        aspectRatio,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: 0,
        height: 0,
        duration: 0,
        qualityLabel: 'HD Video',
        resolution: '',
        aspectRatio: '',
      });
    };
  });
}

function generateVideoThumbnail(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.URL?.createObjectURL) {
      resolve(null);
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    let url = '';
    try {
      url = URL.createObjectURL(file);
    } catch {
      resolve(null);
      return;
    }

    video.src = url;

    const cleanup = () => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Revoking a temporary preview URL is best-effort cleanup.
      }
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 4000);

    video.onloadedmetadata = () => {
      const seekTime = Math.min(1.0, video.duration > 1 ? 0.5 : 0.1);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 480 / (video.videoWidth || 480));
        canvas.width = Math.max(1, Math.round((video.videoWidth || 320) * scale));
        canvas.height = Math.max(1, Math.round((video.videoHeight || 240) * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumb = canvas.toDataURL('image/jpeg', 0.85);
          cleanup();
          resolve(thumb);
          return;
        }
      } catch (err) {
        console.warn('Failed to capture video frame thumbnail:', err);
      }
      cleanup();
      resolve(null);
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      resolve(null);
    };
  });
}

function normalizeLanguageCode(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed || trimmed === 'auto') return 'auto';

  const byCode = SUPPORTED_TRANSCRIPTION_LANGUAGES.find((l) => l.code.toLowerCase() === trimmed);
  if (byCode) return byCode.code;

  const byLabel = SUPPORTED_TRANSCRIPTION_LANGUAGES.find(
    (l) => l.label.toLowerCase() === trimmed || l.label.toLowerCase().startsWith(trimmed)
  );
  if (byLabel) return byLabel.code;

  return trimmed.slice(0, 10);
}

export function NewProjectPage() {
  const navigate = useNavigate();
  const {
    addProject,
    setCurrentProject,
    setLocalVideoFile,
    setCurrentTranscript,
    setCurrentJob,
  } = useProjectStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoMeta, setVideoMeta] = useState<VideoMetadata | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('auto');
  const [captionOutput, setCaptionOutput] = useState<'native' | 'roman' | 'translate'>('native');
  const [isCustomLanguage, setIsCustomLanguage] = useState(false);
  const [customLanguage, setCustomLanguage] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [creationStep, setCreationStep] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: unknown[]) => {
    setValidationError(null);
    setApiError(null);

    if (rejectedFiles && (rejectedFiles as unknown[]).length > 0) {
      setValidationError('File was rejected. Please use MP4, MOV, or WebM under 500 MB.');
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    const err = validateFile(file);
    if (err) {
      setValidationError(err.message);
      return;
    }

    setSelectedFile(file);
    setThumbnailUrl(null);

    extractVideoMetadata(file).then((meta) => {
      setVideoMeta(meta);
    });

    generateVideoThumbnail(file).then((thumb) => {
      if (thumb) setThumbnailUrl(thumb);
    });

    if (!title) {
      // Auto-fill title from filename
      const name = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(name.slice(0, 100));
    }
  }, [title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_VIDEO_TYPES,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE_BYTES,
    noClick: false,
  });

  function handleCreateSample() {
    const sampleId = `sample-${Date.now()}`;
    const sampleProject: Project = {
      id: sampleId,
      title: 'Viral Creator Showcase',
      status: 'ready',
      durationSeconds: 20.5,
      originalAssetPath: null,
      localVideoUrl: null,
      thumbnailUrl: null,
      qualityLabel: '1080p HD',
      aspectRatio: '9:16',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addProject(sampleProject);
    setCurrentProject(sampleProject);
    setLocalVideoFile(null);
    setCurrentTranscript(getDemoTranscript('en', 'native'));
    navigate(`/editor/${sampleId}`);
  }

  async function handleCreate() {
    if (!selectedFile) {
      setValidationError('Please select a video file first.');
      return;
    }
    if (!title.trim()) {
      setValidationError('Please enter a project title.');
      return;
    }

    setCreating(true);
    setCreationStep('Creating project…');
    setApiError(null);

    const targetLanguage = isCustomLanguage ? (customLanguage.trim() || 'auto') : language;
    const resolvedCode = normalizeLanguageCode(targetLanguage);

    try {
      const project = await createProject({
        title: title.trim(),
      });

      let serverAssetPath = null;
      setCreationStep('Uploading media…');
      try {
        const uploaded = await uploadMedia(project.id, selectedFile);
        serverAssetPath = (uploaded as { originalAssetPath?: string })?.originalAssetPath ?? null;
      } catch (uploadErr) {
        console.warn('Backend media upload skipped or failed:', uploadErr);
      }

      setCreationStep('Starting AI speech transcription…');
      try {
        const { jobId } = await startTranscription(project.id, {
          language: resolvedCode || 'auto',
          model: 'small',
          captionOutput,
        });
        setCurrentJob({
          id: jobId,
          status: 'queued',
          progress: 0,
          stage: 'extracting_audio',
          errorCode: null,
          errorMessage: null,
        });
      } catch {
        // Offline demo transcript fallback
        const demo = getDemoTranscript(resolvedCode, captionOutput);
        setCurrentTranscript(demo);
      }

      const fullProject = {
        ...project,
        originalAssetPath: serverAssetPath,
        localVideoUrl: URL.createObjectURL(selectedFile),
        thumbnailUrl: thumbnailUrl ?? null,
        qualityLabel: videoMeta?.qualityLabel ?? null,
        aspectRatio: videoMeta?.aspectRatio ?? null,
        durationSeconds: videoMeta?.duration ? Math.round(videoMeta.duration) : null,
      };

      addProject(fullProject);
      setCurrentProject(fullProject);
      setLocalVideoFile(selectedFile);

      navigate(`/editor/${project.id}`);
    } catch {
      // If API is not reachable, create a local-only project with immediate transcription ready
      const localId = `local-${Date.now()}`;
      const now = new Date().toISOString();
      const localProject = {
        id: localId,
        title: title.trim(),
        status: 'created' as const,
        durationSeconds: videoMeta?.duration ? Math.round(videoMeta.duration) : null,
        originalAssetPath: null,
        localVideoUrl: URL.createObjectURL(selectedFile),
        thumbnailUrl: thumbnailUrl ?? null,
        qualityLabel: videoMeta?.qualityLabel ?? null,
        aspectRatio: videoMeta?.aspectRatio ?? null,
        createdAt: now,
        updatedAt: now,
      };

      const demo = getDemoTranscript(resolvedCode, captionOutput);
      setCurrentTranscript(demo);

      addProject(localProject);
      setCurrentProject(localProject);
      setLocalVideoFile(selectedFile);

      navigate(`/editor/${localId}`);
    } finally {
      setCreating(false);
      setCreationStep(null);
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#D96846] text-[#2F3020] overflow-hidden">
      {/* Content Header (Compact) */}
      <div className="px-6 py-3 flex-shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-[#2F3020]">New Project</h1>
          <p className="text-[#2F3020]/80 text-[11px] font-semibold">Import a video to start captioning · Capzee Studio</p>
        </div>
      </div>

      {/* Main Form Area (Single Unified Studio Container, Zero Scroll, Zero Duplicates) */}
      <div className="flex-1 overflow-hidden px-6 pb-4 flex items-center justify-center min-h-0">
        <div className="max-w-3xl w-full bg-[#CDCBD6] rounded-2xl border border-[#2F3020]/15 shadow-md p-5 sm:p-6 text-[#2F3020]">
          {!selectedFile ? (
            /* ── State 1: Dropzone before video is imported ── */
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 bg-[#FAF7F5]/60 flex flex-col items-center justify-center min-h-[220px]',
                  isDragActive
                    ? 'border-[#16A34A] bg-[#E3E1EB]'
                    : 'border-[#2F3020]/25 hover:border-[#16A34A] hover:bg-[#FAF7F5]'
                )}
                id="video-dropzone-initial"
                aria-label="Video file drop area"
              >
                <input {...getInputProps()} id="video-file-input-initial" />
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#FAF7F5] border border-[#2F3020]/15 flex items-center justify-center mx-auto shadow-xs">
                    <FileVideo className="w-7 h-7 text-[#16A34A]" />
                  </div>
                  <div>
                    <p className="font-bold text-[#2F3020] text-base">Drop video file here</p>
                    <p className="text-xs text-[#2F3020]/70 mt-0.5 font-medium">or click to browse files from your computer</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-[11px] text-[#2F3020]/60 font-semibold font-mono bg-[#FAF7F5] px-3 py-1 rounded-md border border-[#2F3020]/15">
                    <span>MP4 · MOV · WebM</span>
                    <span>•</span>
                    <span>Max 500 MB</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-1">
                <span className="text-xs text-[#2F3020]/70 font-semibold">Want to test the studio first?</span>
                <button
                  type="button"
                  onClick={handleCreateSample}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#FAF7F5] hover:bg-white border border-[#2F3020]/20 text-[#2F3020] text-xs font-bold shadow-2xs transition-all cursor-pointer hover:border-[#16A34A]/50"
                  id="new-project-try-demo-btn"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>Try Sample Demo Project</span>
                </button>
              </div>
            </div>
          ) : (
            /* ── State 2: Single Unified Studio Container (Zero Duplicates) ── */
            <div className="flex flex-col sm:flex-row items-stretch gap-5">
              {/* Left Side: Video Thumbnail & Quick Replace */}
              <div
                {...getRootProps()}
                className="relative group w-full sm:w-44 h-48 sm:h-auto min-h-[225px] rounded-xl overflow-hidden bg-[#2F3020]/10 border border-[#2F3020]/20 flex-shrink-0 flex items-center justify-center cursor-pointer shadow-xs hover:border-[#16A34A] transition-all"
                id="video-dropzone-replace"
                title="Click or drag to change video"
              >
                <input {...getInputProps()} id="video-file-input-replace" />

                {thumbnailUrl ? (
                  <>
                    <img
                      src={thumbnailUrl}
                      alt="Imported video thumbnail"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 pointer-events-none" />

                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center shadow-md text-[#2F3020] group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 ml-0.5 fill-[#2F3020] text-[#2F3020]" />
                      </div>
                    </div>

                    {videoMeta?.qualityLabel && (
                      <span className="absolute top-2 left-2 bg-[#FAF7F5]/90 backdrop-blur-xs text-[#2F3020] text-[10px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                        <Video className="w-3 h-3 text-[#16A34A]" />
                        <span>{videoMeta.qualityLabel}</span>
                      </span>
                    )}

                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-white font-mono font-semibold">
                      {videoMeta?.aspectRatio && (
                        <span className="bg-[#2F3020]/80 px-1.5 py-0.5 rounded backdrop-blur-xs">
                          {videoMeta.aspectRatio}
                        </span>
                      )}
                      {videoMeta?.duration ? (
                        <span className="bg-[#2F3020]/80 px-1.5 py-0.5 rounded backdrop-blur-xs">
                          {formatDuration(videoMeta.duration)}
                        </span>
                      ) : null}
                    </div>

                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="text-[11px] font-bold text-white bg-black/70 px-2.5 py-1 rounded-md backdrop-blur-xs">
                        Change Video
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-3 text-center text-[#2F3020]/60">
                    <Loader2 className="w-6 h-6 animate-spin mb-1.5 text-[#16A34A]" />
                    <span className="text-[11px] font-semibold">Loading thumbnail…</span>
                  </div>
                )}
              </div>

              {/* Right Side: Title, Language & Create Button (Zero Duplicates) */}
              <div className="flex-1 min-w-0 flex flex-col justify-between space-y-3">
                <div className="space-y-3">
                  {/* Validation error */}
                  {validationError && (
                    <div className="flex items-start gap-1.5 p-2 rounded-lg bg-[#FAF7F5] border border-red-700/30 text-red-700 text-xs font-semibold shadow-xs" role="alert">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>{validationError}</span>
                    </div>
                  )}

                  {/* Project Title Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-[#2F3020]" htmlFor="project-title">
                        Project Title
                      </label>
                      <span className="text-[10px] font-mono text-[#2F3020]/65 font-semibold">
                        {formatFileSize(selectedFile.size)} · {videoMeta?.resolution || 'Video'}
                      </span>
                    </div>
                    <input
                      id="project-title"
                      type="text"
                      className="w-full bg-[#FAF7F5] border border-[#2F3020]/20 rounded-lg px-3 py-2 text-xs font-medium text-[#2F3020] focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                      placeholder="My awesome video"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={255}
                    />
                  </div>

                  {/* Spoken Language / Mention Language */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-[#2F3020]" htmlFor="project-language">
                        Spoken Language
                      </label>
                      <span className="text-[10px] text-[#2F3020]/65 font-medium">
                        {isCustomLanguage && customLanguage.trim()
                          ? `Selected: ${customLanguage.trim()}`
                          : language === 'auto'
                            ? 'Auto-detecting'
                            : SUPPORTED_TRANSCRIPTION_LANGUAGES.find((l) => l.code === language)?.label || language}
                      </span>
                    </div>

                    {/* Compact Segmented Studio Pills */}
                    <div className="grid grid-cols-5 gap-1.5 p-1 bg-[#FAF7F5] rounded-lg border border-[#2F3020]/15">
                      {[
                        { code: 'auto', label: '✨ Auto' },
                        { code: 'ta', label: 'Tamil' },
                        { code: 'en', label: 'English' },
                        { code: 'hi', label: 'Hindi' },
                        { code: '__custom__', label: '✍️ Other' },
                      ].map((item) => {
                        const isSelected = item.code === '__custom__'
                          ? isCustomLanguage
                          : !isCustomLanguage && language === item.code;

                        return (
                          <button
                            key={item.code}
                            type="button"
                            onClick={() => {
                              if (item.code === '__custom__') {
                                setIsCustomLanguage(true);
                              } else {
                                setIsCustomLanguage(false);
                                setLanguage(item.code);
                              }
                            }}
                            className={cn(
                              'py-1.5 px-1 rounded-md text-[11px] font-bold text-center transition-all cursor-pointer truncate',
                              isSelected
                                ? 'bg-[#16A34A] text-white shadow-xs'
                                : 'text-[#2F3020]/75 hover:text-[#2F3020] hover:bg-black/5'
                            )}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Accessible fallback select (for full compatibility & form serialization) */}
                    <select
                      id="project-language"
                      aria-label="Spoken Language"
                      className="sr-only"
                      value={isCustomLanguage ? '__custom__' : language}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setIsCustomLanguage(true);
                        } else {
                          setIsCustomLanguage(false);
                          setLanguage(e.target.value);
                        }
                      }}
                      tabIndex={-1}
                    >
                      <option value="auto">Auto-detect spoken language</option>
                      {SUPPORTED_TRANSCRIPTION_LANGUAGES.filter((l) => l.code !== 'auto').map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.label} ({l.code})
                        </option>
                      ))}
                      <option value="__custom__">Other / Custom</option>
                    </select>

                    {/* Inline other/custom language input & quick tags (only when 'Other' selected) */}
                    {isCustomLanguage && (
                      <div className="mt-2 space-y-1.5 animate-in fade-in duration-150">
                        <div className="relative">
                          <input
                            id="custom-language-input"
                            type="text"
                            className="w-full bg-[#FAF7F5] border border-[#16A34A] rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#2F3020] placeholder-[#2F3020]/45 focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                            placeholder="Type any language (e.g. Telugu, Malayalam, Spanish...)"
                            value={customLanguage}
                            onChange={(e) => setCustomLanguage(e.target.value)}
                            autoFocus
                          />
                          {customLanguage && (
                            <button
                              type="button"
                              onClick={() => setCustomLanguage('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#2F3020]/50 hover:text-[#2F3020] cursor-pointer"
                              aria-label="Clear language input"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[10px] text-[#2F3020]/60 font-semibold">Popular:</span>
                          {['Telugu', 'Malayalam', 'Kannada', 'Spanish', 'French', 'Japanese'].map((sug) => (
                            <button
                              key={sug}
                              type="button"
                              onClick={() => setCustomLanguage(sug)}
                              className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors border cursor-pointer',
                                customLanguage.toLowerCase() === sug.toLowerCase()
                                  ? 'bg-[#16A34A] text-white border-[#16A34A]'
                                  : 'bg-[#FAF7F5] text-[#2F3020]/80 border-[#2F3020]/15 hover:bg-[#FAF7F5]/80'
                              )}
                            >
                              {sug}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-[#2F3020]/75 mt-1 font-medium">
                      {isCustomLanguage && customLanguage.trim()
                        ? `AI will transcribe speech in "${customLanguage.trim()}".`
                        : 'Speech is transcribed & word timestamps aligned automatically.'}
                    </p>
                  </div>

                  {/* Caption Output */}
                  {(() => {
                    const resolvedCode = isCustomLanguage ? customLanguage.toLowerCase().trim() : language;
                    return (
                      <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-[#2F3020]">
                        Caption Output
                      </label>
                      <span className="text-[10px] font-bold text-[#16A34A] bg-[#D5EBD7] px-1.5 py-0.5 rounded-md">
                        {captionOutput === 'native' ? getCaptionOutputMeta(resolvedCode).nativeLabel : captionOutput === 'roman' ? getCaptionOutputMeta(resolvedCode).romanLabel : getCaptionOutputMeta(resolvedCode).translateLabel}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#FAF7F5] rounded-lg border border-[#2F3020]/15">
                      {getCaptionOutputMeta(resolvedCode).options.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCaptionOutput(item.id)}
                          className={cn(
                            'py-1.5 px-1 rounded-md text-[11px] font-bold text-center transition-all cursor-pointer truncate',
                            captionOutput === item.id
                              ? 'bg-[#16A34A] text-white shadow-xs'
                              : 'text-[#2F3020]/75 hover:text-[#2F3020] hover:bg-black/5'
                          )}
                          title={item.hint}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-[#2F3020]/80 mt-1 font-medium bg-[#FAF7F5] border border-[#2F3020]/10 rounded-md px-2.5 py-1.5 flex items-center gap-1.5">
                      <span className="text-[#16A34A] font-bold text-xs">✨</span>
                      <span>
                        {captionOutput === 'native' && getCaptionOutputMeta(resolvedCode).nativeHint}
                        {captionOutput === 'roman' && getCaptionOutputMeta(resolvedCode).romanHint}
                        {captionOutput === 'translate' && getCaptionOutputMeta(resolvedCode).translateHint}
                      </span>
                    </p>
                  </div>
                    );
                  })()}

                  {/* API error */}
                  {apiError && (
                    <div className="flex items-start gap-1.5 p-2 rounded-lg bg-[#FAF7F5] border border-amber-600/30 text-[#2F3020] text-xs shadow-xs" role="alert">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-700" />
                      <span>{apiError}</span>
                    </div>
                  )}
                </div>

                {/* Primary Action Button */}
                <div className="pt-1">
                  <button
                    onClick={handleCreate}
                    disabled={creating || !selectedFile}
                    className="w-full py-2.5 text-xs font-bold bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer active:scale-[0.99]"
                    id="create-project-btn"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        <span>{creationStep || 'Creating project & captions…'}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                        <span>Create & Auto-Generate Captions</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
