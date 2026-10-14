import { useState, useCallback, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  Upload, Sparkles, FileVideo, AlertCircle, Loader2,
  ChevronLeft, CheckCircle2
} from 'lucide-react';
import { cn, formatFileSize, formatDuration, ACCEPTED_VIDEO_TYPES } from '@/lib/utils';
import { createProject, uploadMedia, startTranscription } from '@/services/api';
import { useProjectStore } from '@/stores/projectStore';
import { getDemoTranscript, getCaptionOutputMeta } from '@capzee/contracts';
import {
  INDIAN_LANGUAGES,
  GLOBAL_LANGUAGES,
  validateVideoFile,
  extractVideoMetadata,
  generateVideoThumbnail,
  type VideoMetadata,
} from './lib/mediaUtils';

export function NewProjectPage() {
  const navigate = useNavigate();
  const formUid = useId();
  const { setCurrentProject, setLocalVideoFile, setCurrentTranscript } = useProjectStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [meta, setMeta] = useState<VideoMetadata | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('auto');
  const [captionOutput, setCaptionOutput] = useState<'native' | 'roman' | 'translate'>('native');
  const [languageCategory, setLanguageCategory] = useState<'indic' | 'global'>('indic');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFileError(null);
    setSubmitError(null);
    if (!acceptedFiles || acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const validationError = validateVideoFile(file);
    if (validationError) {
      setFileError(validationError);
      return;
    }

    setSelectedFile(file);
    setTitle(file.name.replace(/\.[^/.]+$/, ''));

    // Only probe video metadata & thumbnail on real video files
    if (file.size > 100) {
      extractVideoMetadata(file).then((metadata) => {
        setMeta(metadata);
      });
      generateVideoThumbnail(file).then((thumb) => {
        setThumbnail(thumb);
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_VIDEO_TYPES,
    maxFiles: 1,
    multiple: false,
  });

  const handleLaunchSampleDemo = () => {
    const demoProject = {
      id: `local-demo-${Date.now()}`,
      title: 'Capzee Viral Reel Demo',
      status: 'ready' as const,
      durationSeconds: 15.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setCurrentProject(demoProject);
    setCurrentTranscript(getDemoTranscript(language, captionOutput));
    navigate(`/editor/${demoProject.id}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setFileError('Please select a video file first.');
      return;
    }

    const projectTitle = title.trim() || selectedFile.name.replace(/\.[^/.]+$/, '');
    setSubmitting(true);
    setSubmitError(null);

    try {
      const project = await createProject({ title: projectTitle });
      setLocalVideoFile(selectedFile);
      setCurrentProject({
        ...project,
        thumbnailUrl: thumbnail || undefined,
        durationSeconds: meta?.duration || null,
      });

      try {
        await uploadMedia(project.id, selectedFile);
        await startTranscription(project.id, { language, captionOutput });
      } catch (uploadErr) {
        console.warn('Backend upload skipped, continuing in local preview mode:', uploadErr);
        setCurrentTranscript(getDemoTranscript(language, captionOutput));
      }

      navigate(`/editor/${project.id}`);
    } catch (err) {
      console.error('Failed to create project:', err);
      setSubmitError((err as Error).message || 'Failed to create project');
      setSubmitting(false);
    }
  };

  const outputMeta = getCaptionOutputMeta(language);
  const activeLanguages = languageCategory === 'indic' ? INDIAN_LANGUAGES : GLOBAL_LANGUAGES;

  const fileInputId = `new-project-file-input-${formUid}`;
  const titleInputId = `new-project-title-input-${formUid}`;
  const langSelectId = `new-project-lang-select-${formUid}`;

  return (
    <div className="min-h-screen bg-[#D96846] text-[#2F3020]">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2F3020] hover:text-[#2F3020]/70 mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#2F3020]/15">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#2F3020]">
              New Project
            </h1>
            <p className="text-sm text-[#454832] mt-1 font-medium">
              Upload video to generate synced animated captions in seconds.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLaunchSampleDemo}
            className="px-4 py-2 rounded-lg bg-[#E3E1EB] hover:bg-[#DBD8E3] text-[#2F3020] text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Sparkles className="w-4 h-4 text-[#D96846]" />
            Try 1-Click Demo
          </button>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-16">
        <form onSubmit={handleSubmit} className="bg-[#CDCBD6] border border-[#2F3020]/15 rounded-2xl p-6 sm:p-8 shadow-md space-y-6">
          {/* Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-[#2F3020] uppercase tracking-wider mb-2">
              Select or Drop Video
            </label>
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
                isDragActive
                  ? 'border-[#16A34A] bg-[#16A34A]/10'
                  : 'border-[#2F3020]/20 bg-[#FAF7F5] hover:border-[#D96846] hover:bg-[#FAF7F5]/80',
                fileError ? 'border-red-500 bg-red-50/50' : ''
              )}
            >
              <input {...getInputProps()} id={fileInputId} />
              {selectedFile ? (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  {thumbnail ? (
                    <img src={thumbnail} alt="Thumbnail preview" className="w-24 h-16 object-cover rounded shadow" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-[#E3E1EB] flex items-center justify-center text-[#D96846]">
                      <FileVideo className="w-8 h-8" />
                    </div>
                  )}
                  <div className="text-center sm:text-left">
                    <p className="font-semibold text-base text-[#2F3020] truncate max-w-sm">{selectedFile.name}</p>
                    <p className="text-xs text-[#454832] mt-0.5">
                      {formatFileSize(selectedFile.size)}
                      {meta?.duration ? ` • ${formatDuration(meta.duration)}` : ''}
                      {meta?.qualityLabel ? ` • ${meta.qualityLabel}` : ''}
                      {meta?.aspectRatio ? ` • ${meta.aspectRatio}` : ''}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#454832]">
                  <div className="w-12 h-12 rounded-full bg-[#E3E1EB] flex items-center justify-center text-[#D96846] mb-1">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-[#2F3020]">
                    Drop your video here, or <span className="text-[#D96846] underline">browse</span>
                  </p>
                  <p className="text-xs text-[#454832]/80">MP4, MOV, or WebM (up to 500 MB)</p>
                </div>
              )}
            </div>
            {fileError && <p className="text-xs text-red-600 mt-2 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{fileError}</p>}
          </div>

          {/* Project Title */}
          <div>
            <label htmlFor={titleInputId} className="block text-xs font-semibold text-[#2F3020] uppercase tracking-wider mb-2">
              Project Title
            </label>
            <input
              id={titleInputId}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Tamil Cooking Reel #1"
              className="w-full px-4 py-2.5 rounded-lg bg-white border border-[#2F3020]/20 text-[#2F3020] text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
            />
          </div>

          {/* Language Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor={langSelectId} className="text-xs font-semibold text-[#2F3020] uppercase tracking-wider">
                Spoken Language
              </label>
              <div className="flex items-center gap-1 bg-[#E3E1EB] p-0.5 rounded-md text-xs">
                <button
                  type="button"
                  onClick={() => setLanguageCategory('indic')}
                  className={cn('px-2.5 py-1 rounded font-semibold transition-colors', languageCategory === 'indic' ? 'bg-[#16A34A] text-white' : 'text-[#2F3020]')}
                >
                  Indian / Indic
                </button>
                <button
                  type="button"
                  onClick={() => setLanguageCategory('global')}
                  className={cn('px-2.5 py-1 rounded font-semibold transition-colors', languageCategory === 'global' ? 'bg-[#16A34A] text-white' : 'text-[#2F3020]')}
                >
                  Global
                </button>
              </div>
            </div>
            <select
              id={langSelectId}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white border border-[#2F3020]/20 text-[#2F3020] text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
            >
              {activeLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Caption Output Mode */}
          <div>
            <label className="block text-xs font-semibold text-[#2F3020] uppercase tracking-wider mb-2">
              Caption Output Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['native', 'roman', 'translate'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCaptionOutput(mode)}
                  className={cn(
                    'p-3.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 text-center transition-all',
                    captionOutput === mode
                      ? 'border-[#16A34A] bg-[#16A34A] text-white shadow-md'
                      : 'border-[#2F3020]/20 bg-white text-[#2F3020] hover:bg-[#FAF7F5]'
                  )}
                >
                  <span>{mode === 'native' ? outputMeta.nativeLabel : mode === 'roman' ? outputMeta.romanLabel : outputMeta.translateLabel}</span>
                  <span className={cn('text-[11px] font-normal opacity-90', captionOutput === mode ? 'text-white/90' : 'text-[#454832]')}>
                    {mode === 'native' ? outputMeta.nativeHint : mode === 'roman' ? outputMeta.romanHint : outputMeta.translateHint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {submitError && (
            <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2F3020]/15">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold text-[#454832] hover:bg-[#DBD8E3] transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || !selectedFile}
              className="px-6 py-2.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white text-sm font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Start Captioning
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
