import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import {
  Trash2, Clock, AlertCircle,
  CheckCircle2, Loader2, Play, FileVideo, Film,
  Upload, Sparkles, Plus, ChevronDown
} from "lucide-react";
import { useProjectStore, type Project } from "@/stores/projectStore";
import { listProjects, deleteProject, createProject, uploadMedia, startTranscription } from "@/services/api";
import { formatDuration, cn, ACCEPTED_VIDEO_TYPES } from "@/lib/utils";
import { getDemoTranscript, getCaptionOutputMeta } from "@capzee/contracts";

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;

const INDIAN_LANGUAGES = [
  { code: "auto", label: "Auto detect" },
  { code: "ta", label: "Tamil" },
  { code: "hi", label: "Hindi" },
  { code: "te", label: "Telugu" },
  { code: "ml", label: "Malayalam" },
  { code: "kn", label: "Kannada" },
  { code: "mr", label: "Marathi" },
  { code: "bn", label: "Bengali" },
  { code: "gu", label: "Gujarati" },
  { code: "pa", label: "Punjabi" },
  { code: "en", label: "English (India)" },
];

const GLOBAL_LANGUAGES = [
  { code: "auto", label: "Auto detect" },
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" },
  { code: "ru", label: "Russian" },
  { code: "pt", label: "Portuguese" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  created: { label: "Created", color: "bg-[#2F3020]/80 text-white", icon: Clock },
  uploading: { label: "Uploading", color: "bg-[#D96846] text-white", icon: Loader2 },
  processing: { label: "Processing", color: "bg-[#D96846] text-white", icon: Loader2 },
  transcribed: { label: "Transcribed", color: "bg-[#16A34A] text-white", icon: CheckCircle2 },
  ready: { label: "Ready", color: "bg-[#16A34A] text-white", icon: CheckCircle2 },
  error: { label: "Error", color: "bg-red-600 text-white", icon: AlertCircle },
};

interface VideoMetadata {
  width: number; height: number; duration: number;
  qualityLabel: string; resolution: string; aspectRatio: string;
}

function validateFile(file: File) {
  const accepted = ["video/mp4", "video/quicktime", "video/webm"];
  if (!accepted.includes(file.type)) return "File type not supported. Use MP4, MOV or WebM.";
  if (file.size > MAX_FILE_SIZE_BYTES) return "File exceeds 500 MB limit.";
  return null;
}

function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    let url = "";
    try { url = URL.createObjectURL(file); } catch {
      return resolve({ width: 0, height: 0, duration: 0, qualityLabel: "HD", resolution: "", aspectRatio: "" });
    }
    video.src = url;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const w = video.videoWidth || 0, h = video.videoHeight || 0, dur = video.duration || 0;
      const max = Math.max(w, h), min = Math.min(w, h);
      let q = "SD";
      if (max >= 3840 || min >= 2160) q = "4K";
      else if (max >= 2560 || min >= 1440) q = "2K";
      else if (max >= 1920 || min >= 1080) q = "1080p";
      else if (max >= 1280 || min >= 720) q = "720p";
      else if (max >= 854 || min >= 480) q = "480p";
      let ar = "9:16";
      if (w > 0 && h > 0) {
        const r = w / h;
        if (Math.abs(r - 9 / 16) < 0.08) ar = "9:16";
        else if (Math.abs(r - 16 / 9) < 0.08) ar = "16:9";
        else if (Math.abs(r - 1) < 0.08) ar = "1:1";
        else ar = r < 1 ? "9:16" : "16:9";
      }
      resolve({ width: w, height: h, duration: dur, qualityLabel: q, resolution: w && h ? `${w}x${h}` : "", aspectRatio: ar });
    };
    video.onerror = () => { URL.revokeObjectURL(url); resolve({ width: 0, height: 0, duration: 0, qualityLabel: "HD", resolution: "", aspectRatio: "" }); };
  });
}

function generateVideoThumbnail(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata"; video.muted = true; video.playsInline = true;
    let url = "";
    try { url = URL.createObjectURL(file); } catch { return resolve(null); }
    video.src = url;
    const cleanup = () => { try { URL.revokeObjectURL(url); } catch { } };
    const timeout = setTimeout(() => { cleanup(); resolve(null); }, 4000);
    video.onloadedmetadata = () => { video.currentTime = Math.min(1, video.duration > 1 ? 0.5 : 0.1); };
    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 480 / (video.videoWidth || 480));
        canvas.width = Math.round((video.videoWidth || 320) * scale);
        canvas.height = Math.round((video.videoHeight || 240) * scale);
        const ctx = canvas.getContext("2d");
        if (ctx) { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); cleanup(); return resolve(canvas.toDataURL("image/jpeg", 0.85)); }
      } catch { }
      cleanup(); resolve(null);
    };
    video.onerror = () => { clearTimeout(timeout); cleanup(); resolve(null); };
  });
}

function formatTimeAgo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  } catch {
    return dateStr;
  }
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { projects, setProjects, removeProject, addProject, setCurrentProject, setLocalVideoFile, setCurrentTranscript, setCurrentJob } = useProjectStore();

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoMeta, setVideoMeta] = useState<VideoMetadata | null>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [isIndian, setIsIndian] = useState(true);
  const [language, setLanguage] = useState("auto");
  const [captionOutput, setCaptionOutput] = useState<"native" | "roman" | "translate">("native");
  const [creating, setCreating] = useState(false);
  const [creationStep, setCreationStep] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const data = await listProjects();
        const localProjects = useProjectStore.getState().projects;
        const serverIds = new Set(data.map((p) => p.id));
        const mergedServerProjects = data.map((p) => {
          const local = localProjects.find((e) => e.id === p.id);
          return {
            ...p,
            originalAssetPath: (p as { originalAssetPath?: string | null })?.originalAssetPath ?? local?.originalAssetPath ?? null,
            localVideoUrl: local?.localVideoUrl ?? null,
            thumbnailUrl: local?.thumbnailUrl ?? null,
            qualityLabel: local?.qualityLabel ?? null,
            aspectRatio: local?.aspectRatio ?? null,
          };
        });
        // Preserve local projects that haven't synced to server yet
        const localOnly = localProjects.filter((p) => !serverIds.has(p.id));
        setProjects([...mergedServerProjects, ...localOnly]);
      } catch {
        /* use persisted projects in store */
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, [setProjects]);

  const onDrop = useCallback((accepted: File[], rejected: unknown[]) => {
    setUploadError(null);
    if ((rejected as unknown[]).length > 0) { setUploadError("File rejected. Use MP4, MOV, or WebM under 500 MB."); return; }
    const file = accepted[0]; if (!file) return;
    const err = validateFile(file); if (err) { setUploadError(err); return; }
    setSelectedFile(file);
    setThumbUrl(null);
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").slice(0, 100));
    extractVideoMetadata(file).then(setVideoMeta);
    generateVideoThumbnail(file).then((t) => { if (t) setThumbUrl(t); });
  }, [title]);

  const { getRootProps, getInputProps, isDragActive, open: openFilePicker } = useDropzone({
    onDrop,
    accept: ACCEPTED_VIDEO_TYPES,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE_BYTES,
    noClick: !!selectedFile,
  });

  async function handleCreate() {
    if (!selectedFile) return;
    if (!title.trim()) { setUploadError("Please enter a project title."); return; }
    setCreating(true); setApiError(null); setUploadError(null);

    try {
      setCreationStep("Creating project...");
      const proj = await createProject({ title: title.trim() });
      const fullProject: Project = {
        ...proj,
        durationSeconds: videoMeta?.duration ?? null,
        originalAssetPath: null,
        localVideoUrl: URL.createObjectURL(selectedFile),
        thumbnailUrl: thumbUrl,
        qualityLabel: videoMeta?.qualityLabel ?? null,
        aspectRatio: videoMeta?.aspectRatio ?? null,
      };
      addProject(fullProject);
      setCurrentProject(fullProject);
      setLocalVideoFile(selectedFile);

      setCreationStep("Uploading media...");
      try {
        await uploadMedia(proj.id, selectedFile);
      } catch (uploadErr) {
        console.warn("Media cloud upload deferred / continuing locally:", uploadErr);
      }

      setCreationStep("Generating captions...");
      const job = await startTranscription(proj.id, {
        language: language || "auto",
        captionOutput,
      }).catch(() => null);
      if (job) {
        setCurrentJob({
          id: job.jobId ?? proj.id,
          status: "processing",
          progress: 0,
          stage: null,
          errorCode: null,
          errorMessage: null,
        });
      }

      setCurrentTranscript(getDemoTranscript(language, captionOutput));
      navigate(`/editor/${proj.id}`);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Something went wrong.");
      setCreationStep(null);
    } finally { setCreating(false); }
  }

  function resetSelectedFile(e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedFile(null);
    setThumbUrl(null);
    setVideoMeta(null);
    setTitle("");
    setIsIndian(true);
    setLanguage("auto");
    setCaptionOutput("native");
    setUploadError(null);
  }

  function requestDelete(project: Project, e: React.MouseEvent) {
    e.stopPropagation();
    setProjectToDelete(project);
  }

  async function confirmDelete() {
    if (!projectToDelete) return;
    const id = projectToDelete.id; setDeleting(id);
    try { await deleteProject(id); } catch { }
    removeProject(id); setDeleting(null); setProjectToDelete(null);
  }

  const totalDuration = projects.reduce((s, p) => s + (p.durationSeconds ?? 0), 0);

  return (
    <div className="flex-1 h-full min-h-0 overflow-y-auto md:overflow-hidden px-3 sm:px-6 py-2 sm:py-3 bg-[#D96846] text-[#2F3020] flex flex-col">
      <div className="max-w-6xl w-full mx-auto flex-1 min-h-0 flex flex-col gap-2 sm:gap-2.5">

        {/* Top Section: dropzone (left) + Stats (right) */}
        <div className={cn(
          "flex flex-col md:flex-row gap-2.5 items-stretch flex-shrink-0 transition-all duration-200",
          selectedFile ? "min-h-[220px] md:h-[142px]" : "min-h-[130px] md:h-[124px]"
        )}>

          {/* Compact Drop Zone / Video Preview Box */}
          <div
            {...getRootProps()}
            className={cn(
              "relative flex-1 min-w-0 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between transition-all duration-200 bg-[#FAF7F5] shadow-xs overflow-hidden",
              selectedFile
                ? "border-2 border-[#16A34A]/60"
                : "border-2 border-dashed border-[#2F3020]/25 hover:border-[#16A34A] hover:bg-white cursor-pointer",
              isDragActive && !selectedFile && "border-[#16A34A] bg-white scale-[1.005]"
            )}
            id="dashboard-drop-zone"
          >
            {/* Subtle radial glow background like reference */}
            {!selectedFile && (
              <div className="absolute top-0 right-1/4 w-48 h-48 bg-[#16A34A]/8 rounded-full blur-2xl pointer-events-none" />
            )}

            <input {...getInputProps()} id="dashboard-video-file-input" />

            {selectedFile ? (
              /* Selected Video Mode: Spoken language + Indian toggle + Caption output */
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3.5 h-full w-full">
                {/* 9:16 Video Thumbnail */}
                <div className="h-20 sm:h-full aspect-[9/16] rounded-xl overflow-hidden flex-shrink-0 border border-[#2F3020]/20 bg-black/95 shadow-xs relative self-center sm:self-auto">
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt="Video thumbnail"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FAF7F5]" />
                    </div>
                  )}
                  <div className="absolute bottom-1 right-1 bg-black/85 px-1 py-0.2 rounded text-[7.5px] font-mono font-bold text-white shadow-xs">
                    {videoMeta?.duration ? formatDuration(videoMeta.duration) : "0:00"}
                  </div>
                </div>

                {/* Middle: Controls */}
                <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5 gap-2 sm:gap-0">
                  {/* Top Status & Title Row */}
                  <div className="flex items-center justify-between gap-2">
                    <input
                      id="dashboard-project-title-input"
                      type="text"
                      aria-label="Project title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Project title..."
                      className="bg-transparent text-[13px] font-black text-[#2F3020] placeholder-[#2F3020]/45 outline-none border-b border-[#2F3020]/25 focus:border-[#16A34A] pb-0.5 leading-tight flex-1 min-w-0"
                    />
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[9px] font-mono font-bold text-[#2F3020]/60 bg-white border border-[#2F3020]/15 px-1.5 py-0.2 rounded-full">
                        {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                      <button
                        type="button"
                        onClick={resetSelectedFile}
                        className="text-[9.5px] font-bold text-[#2F3020]/65 hover:text-red-700 transition-colors cursor-pointer"
                      >
                        Change video
                      </button>
                    </div>
                  </div>

                  {/* Settings Row: Spoken Language + Caption Output */}
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-2.5 items-center mt-1">
                    {/* Spoken Language Block */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[8.5px] sm:text-[9px] font-mono font-bold tracking-wider text-[#2F3020]/60 uppercase">
                          SPOKEN LANGUAGE
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-medium text-[#2F3020]/80">Indian</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isIndian}
                            onClick={(e) => { e.stopPropagation(); setIsIndian(!isIndian); }}
                            className={cn(
                              "w-7 h-4 rounded-full transition-colors p-0.5 flex items-center cursor-pointer",
                              isIndian ? "bg-[#16A34A] justify-end" : "bg-[#2F3020]/25 justify-start"
                            )}
                          >
                            <div className="w-3 h-3 rounded-full bg-white shadow-2xs" />
                          </button>
                        </div>
                      </div>

                      <div className="relative">
                        <select
                          id="dashboard-language-select"
                          aria-label="Spoken language"
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-white border border-[#2F3020]/20 rounded-lg px-2.5 py-1 text-[11px] font-medium text-[#2F3020] appearance-none focus:outline-none focus:border-[#16A34A] cursor-pointer shadow-2xs pr-6"
                        >
                          {(isIndian ? INDIAN_LANGUAGES : GLOBAL_LANGUAGES).map((l) => (
                            <option key={l.code} value={l.code}>{l.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-3 h-3 text-[#2F3020]/60 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Caption Output Block */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[8.5px] sm:text-[9px] font-mono font-bold tracking-wider text-[#2F3020]/60 uppercase">
                          CAPTION OUTPUT
                        </span>
                        <span className="text-[8px] sm:text-[8.5px] font-bold text-[#16A34A] bg-[#D5EBD7] px-1 py-0.2 rounded truncate max-w-[120px]">
                          {captionOutput === 'native' ? getCaptionOutputMeta(language).nativeLabel : captionOutput === 'roman' ? getCaptionOutputMeta(language).romanLabel : getCaptionOutputMeta(language).translateLabel}
                        </span>
                      </div>
                      <div className="bg-white border border-[#2F3020]/15 rounded-lg p-0.5 flex items-center gap-0.5">
                        {getCaptionOutputMeta(language).options.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setCaptionOutput(opt.id); }}
                            className={cn(
                              "flex-1 py-0.5 px-0.5 rounded text-[8.5px] sm:text-[9px] font-medium text-center transition-all cursor-pointer truncate",
                              captionOutput === opt.id
                                ? "bg-[#D5EBD7] text-[#16A34A] font-bold shadow-2xs"
                                : "text-[#2F3020]/70 hover:text-[#2F3020]"
                            )}
                            title={opt.hint}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[8.5px] text-[#2F3020]/75 mt-0.5 truncate font-medium">
                        ✨ {captionOutput === 'native' && getCaptionOutputMeta(language).nativeHint}
                        {captionOutput === 'roman' && getCaptionOutputMeta(language).romanHint}
                        {captionOutput === 'translate' && getCaptionOutputMeta(language).translateHint}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right: Generate captions button */}
                <div className="flex-shrink-0 flex items-center sm:pr-1 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); void handleCreate(); }}
                    disabled={creating}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:py-2.5 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white text-[11px] font-bold shadow-xs transition-transform active:scale-95 disabled:opacity-60 cursor-pointer"
                    id="dashboard-start-btn"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{creationStep ?? "Starting..."}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate captions</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Idle Drop State: Exact reference matching layout */
              <div className="flex flex-col justify-between h-full relative z-10 gap-2">
                {/* Top row */}
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-xl bg-[#D5EBD7] text-[#16A34A] flex items-center justify-center flex-shrink-0 shadow-2xs">
                    <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <span className="text-[9.5px] font-mono text-[#2F3020]/50 tracking-wider">
                    Free plan
                  </span>
                </div>

                {/* Bottom row: Typography + New Project Button */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-[13px] sm:text-[15.5px] font-black text-[#2F3020] tracking-tight leading-snug">
                      Drop your media, <span className="italic font-serif font-normal text-[#16A34A]">start generating.</span>
                    </h2>
                    <p className="text-[10px] text-[#2F3020]/65 mt-0.5 font-normal truncate">
                      Video or audio. Captions and Auto Trim inside.
                    </p>
                    {uploadError && <p className="text-[9px] text-red-600 font-bold mt-0.5">{uploadError}</p>}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openFilePicker(); }}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white text-[11px] font-bold shadow-xs transition-transform active:scale-95 flex-shrink-0 cursor-pointer w-full sm:w-auto"
                    id="dashboard-new-project-btn"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>New project</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Stats: Responsive Cards (2x2 on mobile, 4x1 on tablet, 2x2 on desktop) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 gap-2 w-full md:w-72 lg:w-80 flex-shrink-0 md:h-full">
            {[
              { label: "PROJECTS ON DEVICE", value: String(projects.length) },
              { label: "FOOTAGE IN REEL", value: totalDuration > 0 ? formatDuration(totalDuration) : "—" },
              { label: "CAPTION TIME LEFT", value: "2 min" },
              { label: "YOUR PLAN", value: "Free" },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-[#FAF7F5] border border-[#2F3020]/15 rounded-2xl px-3 py-1.5 sm:px-3.5 sm:py-2 flex flex-col justify-between shadow-2xs hover:border-[#16A34A]/40 transition-colors min-h-[50px] md:min-h-0"
              >
                <p className="text-[7.5px] sm:text-[8.5px] font-mono font-medium tracking-wider uppercase text-[#2F3020]/50 truncate">{label}</p>
                <p className="text-[15px] sm:text-[18px] font-black text-[#2F3020] leading-none">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* API Error Alert */}
        {apiError && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-100 border border-red-300 text-red-800 text-xs font-medium flex-shrink-0">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        {/* Projects Divider with horizontal line like in reference image */}
        <div className="flex items-center gap-3 py-1 flex-shrink-0">
          <span className="text-[10px] font-mono font-medium tracking-widest uppercase text-[#2F3020]/75">
            YOUR PROJECTS
          </span>
          <div className="flex-1 h-px bg-[#2F3020]/20" />
        </div>

        {/* Projects Container - Single Page Fit */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {loading && projects.length === 0 ? (
            <div className="w-full h-32 sm:h-36 rounded-2xl bg-[#FAF7F5]/50 border border-[#2F3020]/15 flex flex-col items-center justify-center p-4 text-center shadow-2xs">
              <Loader2 className="w-5 h-5 text-[#16A34A] animate-spin mb-2" />
              <p className="text-xs font-semibold text-[#2F3020]/70">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            /* Empty state matching reference image exactly */
            <div className="w-full h-32 sm:h-36 rounded-2xl bg-[#FAF7F5] border border-[#2F3020]/15 flex flex-col items-center justify-center p-4 text-center shadow-2xs">
              <Film className="w-5 h-5 text-[#2F3020]/45 stroke-[1.5] mb-2" />
              <p className="text-[11px] sm:text-[11.5px] font-medium text-[#2F3020]/65">
                Nothing here yet — drop your first video above.
              </p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3.5 pb-2 items-start">
                {projects.map((project) => (
                  <CompactProjectCard
                    key={project.id}
                    project={project}
                    onOpen={() => {
                      const curr = useProjectStore.getState().currentProject;
                      if (curr?.id !== project.id) {
                        setLocalVideoFile(null);
                      }
                      setCurrentProject(project);
                      navigate(`/editor/${project.id}`);
                    }}
                    onDelete={(e) => requestDelete(project, e)}
                    deleting={deleting === project.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Storage disclaimer - Compact footer */}
        <p className="text-[9.5px] text-[#2F3020]/50 text-center py-0.5 flex-shrink-0 font-medium">
          Local-first storage: Captions and media are stored on this device.
        </p>
      </div>

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !deleting && setProjectToDelete(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-[#FAF7F5] text-[#2F3020] rounded-2xl border border-[#2F3020]/20 shadow-2xl max-w-sm w-full p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold">Delete Project?</h3>
                <p className="text-xs text-[#2F3020]/80 mt-1 leading-relaxed">
                  Are you sure you want to delete <span className="font-bold">"{projectToDelete.title}"</span>? This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2F3020]/15">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                disabled={!!deleting}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-[#2F3020]/80 bg-black/5 hover:bg-black/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={!!deleting}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {deleting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Deleting...</> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CompactProjectCard({
  project,
  onOpen,
  onDelete,
  deleting
}: {
  project: Project;
  onOpen: () => void;
  onDelete: (e: React.MouseEvent) => void;
  deleting: boolean;
}) {
  const status = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.created;
  const StatusIcon = status.icon;

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden bg-[#FAF7F5] border border-[#2F3020]/25 shadow-xs hover:shadow-xl hover:border-[#16A34A] transition-all duration-200 cursor-pointer group flex flex-col justify-between"
      aria-label={`Open project ${project.title}`}
    >
      {/* Thumbnail or Fallback */}
      {project.thumbnailUrl ? (
        <img
          src={project.thumbnailUrl}
          alt={project.title}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div className="absolute inset-0 bg-[#FAF7F5] flex flex-col items-center justify-center p-3 text-center">
          <div className="w-9 h-9 rounded-full bg-white border border-[#2F3020]/15 flex items-center justify-center mb-1 shadow-2xs">
            <FileVideo className="w-4 h-4 text-[#16A34A]" />
          </div>
          <span className="text-[10px] font-bold text-[#2F3020]">Capzee Video</span>
        </div>
      )}

      {/* Hover Play Button Overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 bg-black/20">
        <div className="w-9 h-9 rounded-full bg-[#FAF7F5] text-[#2F3020] flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform">
          <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
        </div>
      </div>

      {/* Top Bar: Status Badge + Delete Button */}
      <div className="relative z-10 p-2 flex items-center justify-between gap-1 pointer-events-none">
        <span className={cn("text-[8.5px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs", status.color)}>
          <StatusIcon className={cn("w-2.5 h-2.5", project.status === "processing" && "animate-spin")} />
          <span>{status.label}</span>
        </span>

        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="pointer-events-auto w-6 h-6 rounded-full bg-[#2F3020]/80 hover:bg-red-600 text-white flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all shadow-xs cursor-pointer active:scale-95"
          title={`Delete ${project.title}`}
          aria-label={`Delete ${project.title}`}
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Bottom Overlay Gradient with title & metadata */}
      <div className="relative z-10 bg-gradient-to-t from-[#2F3020] via-[#2F3020]/75 to-transparent pt-6 pb-2.5 px-2.5 flex flex-col gap-0.5 text-white">
        <p className="text-[11.5px] font-bold truncate leading-tight drop-shadow-xs" title={project.title}>
          {project.title}
        </p>
        <div className="flex items-center justify-between text-[9px] font-mono text-white/90 mt-0.5">
          <div className="flex items-center gap-1">
            {project.durationSeconds != null && (
              <span className="flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5 text-white/80" />
                <span>{formatDuration(project.durationSeconds)}</span>
              </span>
            )}
            <span className="bg-white/20 text-white px-1 py-0.2 rounded text-[8px] font-bold">
              {project.aspectRatio ?? "9:16"}
            </span>
          </div>
          <span className="text-white/70 text-[8px]">
            {formatTimeAgo(project.updatedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
