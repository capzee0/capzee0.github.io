import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import {
  X, Upload, Sparkles, FileVideo, AlertCircle, Loader2, CheckCircle2
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { createProject, uploadMedia, startTranscription } from '@/services/api';
import { formatDuration, formatFileSize, cn, ACCEPTED_VIDEO_TYPES } from '@/lib/utils';
import { getDemoTranscript, getCaptionOutputMeta } from '@capzee/contracts';
import {
  INDIAN_LANGUAGES,
  GLOBAL_LANGUAGES,
  validateVideoFile,
  extractVideoMetadata,
  generateVideoThumbnail,
  type VideoMetadata,
} from '../../projects/lib/mediaUtils';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const navigate = useNavigate();
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

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
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

    // Extract metadata & thumbnail in parallel
    const [metadata, thumb] = await Promise.all([
      extractVideoMetadata(file),
      generateVideoThumbnail(file),
    ]);
    setMeta(metadata);
    setThumbnail(thumb);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_VIDEO_TYPES,
    maxFiles: 1,
    multiple: false,
  });

  const handleLaunchSampleDemo = useCallback(() => {
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
    onClose();
    navigate(`/editor/${demoProject.id}`);
  }, [captionOutput, language, navigate, onClose, setCurrentProject, setCurrentTranscript]);

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

      // Upload media
      try {
        await uploadMedia(project.id, selectedFile);
        await startTranscription(project.id, { language, captionOutput });
      } catch (uploadErr) {
        console.warn('Backend upload skipped, continuing in local mode:', uploadErr);
        setCurrentTranscript(getDemoTranscript(language, captionOutput));
      }

      onClose();
      navigate(`/editor/${project.id}`);
    } catch (err) {
      console.error('Failed to create project:', err);
      setSubmitError((err as Error).message || 'Failed to create project');
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const outputMeta = getCaptionOutputMeta(language);
  const activeLanguages = languageCategory === 'indic' ? INDIAN_LANGUAGES : GLOBAL_LANGUAGES;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2F3020]/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-[#CDCBD6] border border-[#2F3020]/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2F3020]/15 bg-[#E3E1EB]">
          <h2 className="text-lg font-bold text-[#2F3020] flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#D96846]" />
            New Video Project
          </h2>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#2F3020]/60 hover:text-[#2F3020] hover:bg-[#DBD8E3] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-[#2F3020] uppercase tracking-wider mb-2">
              Video File
            </label>
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200',
                isDragActive
                  ? 'border-[#16A34A] bg-[#16A34A]/10'
                  : 'border-[#2F3020]/20 bg-[#FAF7F5] hover:border-[#D96846] hover:bg-[#FAF7F5]/80',
                fileError ? 'border-red-500 bg-red-50/50' : ''
              )}
            >
              <input {...getInputProps()} id="dashboard-modal-file-upload-input" />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  {thumbnail ? (
                    <img src={thumbnail} alt="Thumbnail preview" className="w-16 h-12 object-cover rounded shadow" />
                  ) : (
                    <FileVideo className="w-10 h-10 text-[#D96846]" />
                  )}
                  <div className="text-left">
                    <p className="font-semibold text-sm text-[#2F3020] truncate max-w-xs">{selectedFile.name}</p>
                    <p className="text-xs text-[#454832]">
                      {formatFileSize(selectedFile.size)}
                      {meta?.duration ? ` • ${formatDuration(meta.duration)}` : ''}
                      {meta?.resolution ? ` • ${meta.resolution}` : ''}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#454832]">
                  <Upload className="w-8 h-8 text-[#D96846]" />
                  <p className="text-sm font-medium text-[#2F3020]">
                    Drag and drop your video here, or <span className="text-[#D96846] underline">browse</span>
                  </p>
                  <p className="text-xs text-[#454832]/80">MP4, MOV, or WebM (up to 500 MB)</p>
                </div>
              )}
            </div>
            {fileError && <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{fileError}</p>}
          </div>

          {/* Project Title */}
          <div>
            <label htmlFor="dashboard-modal-project-title-input" className="block text-xs font-semibold text-[#2F3020] uppercase tracking-wider mb-1.5">
              Project Title
            </label>
            <input
              id="dashboard-modal-project-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. My Viral Reel"
              className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#2F3020]/20 text-[#2F3020] text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
            />
          </div>

          {/* Language Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="dashboard-modal-language-select" className="text-xs font-semibold text-[#2F3020] uppercase tracking-wider">
                Spoken Language
              </label>
              <div className="flex items-center gap-1 bg-[#E3E1EB] p-0.5 rounded-md text-xs">
                <button
                  type="button"
                  onClick={() => setLanguageCategory('indic')}
                  className={cn('px-2 py-0.5 rounded font-medium transition-colors', languageCategory === 'indic' ? 'bg-[#16A34A] text-white' : 'text-[#2F3020]')}
                >
                  Indian / Indic
                </button>
                <button
                  type="button"
                  onClick={() => setLanguageCategory('global')}
                  className={cn('px-2 py-0.5 rounded font-medium transition-colors', languageCategory === 'global' ? 'bg-[#16A34A] text-white' : 'text-[#2F3020]')}
                >
                  Global
                </button>
              </div>
            </div>
            <select
              id="dashboard-modal-language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#2F3020]/20 text-[#2F3020] text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
            >
              {activeLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Caption Output Mode (Native, Tanglish/Roman, Translate) */}
          <div>
            <label className="block text-xs font-semibold text-[#2F3020] uppercase tracking-wider mb-2">
              Caption Output Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['native', 'roman', 'translate'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCaptionOutput(mode)}
                  className={cn(
                    'p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 text-center transition-all',
                    captionOutput === mode
                      ? 'border-[#16A34A] bg-[#16A34A] text-white shadow-sm'
                      : 'border-[#2F3020]/20 bg-white text-[#2F3020] hover:bg-[#FAF7F5]'
                  )}
                >
                  <span>{mode === 'native' ? outputMeta.nativeLabel : mode === 'roman' ? outputMeta.romanLabel : outputMeta.translateLabel}</span>
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

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#2F3020]/15">
            <button
              type="button"
              onClick={handleLaunchSampleDemo}
              className="px-3.5 py-2 rounded-lg bg-[#E3E1EB] hover:bg-[#DBD8E3] text-[#2F3020] text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D96846]" />
              Try 1-Click Demo
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-[#454832] hover:bg-[#DBD8E3] transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || !selectedFile}
                className="px-5 py-2 rounded-lg bg-[#D96846] hover:bg-[#C25534] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Create Project
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
