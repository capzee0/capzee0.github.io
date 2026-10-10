import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Upload, Video, AlertCircle, Loader2, CheckCircle2, FileVideo } from 'lucide-react';
import { cn, formatFileSize, ACCEPTED_VIDEO_TYPES } from '@/lib/utils';
import { createProject, uploadMedia } from '@/services/api';
import { useProjectStore } from '@/stores/projectStore';

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

interface ValidationError {
  code: string;
  message: string;
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

export function NewProjectPage() {
  const navigate = useNavigate();
  const { addProject, setCurrentProject, setLocalVideoFile } = useProjectStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
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
    setApiError(null);

    try {
      const project = await createProject({
        title: title.trim(),
      });

      let serverAssetPath = null;
      try {
        const uploaded = await uploadMedia(project.id, selectedFile);
        serverAssetPath = (uploaded as { originalAssetPath?: string })?.originalAssetPath ?? null;
      } catch (uploadErr) {
        console.warn('Backend media upload skipped or failed:', uploadErr);
      }

      const fullProject = {
        ...project,
        originalAssetPath: serverAssetPath,
        localVideoUrl: URL.createObjectURL(selectedFile),
        durationSeconds: null,
      };

      addProject(fullProject);
      setCurrentProject(fullProject);
      setLocalVideoFile(selectedFile);

      navigate(`/editor/${project.id}`);
    } catch (err) {
      // If API is not reachable, create a local-only project
      const localId = `local-${Date.now()}`;
      const now = new Date().toISOString();
      const localProject = {
        id: localId,
        title: title.trim(),
        status: 'created' as const,
        durationSeconds: null,
        originalAssetPath: null,
        localVideoUrl: URL.createObjectURL(selectedFile),
        createdAt: now,
        updatedAt: now,
      };

      addProject(localProject);
      setCurrentProject(localProject);
      setLocalVideoFile(selectedFile);

      navigate(`/editor/${localId}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-8 py-6 border-b border-surface-border">
        <h1 className="text-2xl font-bold">New Project</h1>
        <p className="text-text-secondary text-sm mt-0.5">Import a video to start captioning</p>
      </div>

      <div className="flex-1 overflow-auto px-8 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Drop zone */}
          <div
            {...getRootProps()}
            className={cn(
              'relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200',
              isDragActive
                ? 'border-accent-blue bg-accent-blue/5'
                : selectedFile
                ? 'border-status-success/50 bg-status-success/5'
                : 'border-surface-border hover:border-accent-blue/50 hover:bg-surface-hover/20'
            )}
            id="video-dropzone"
            aria-label="Video file drop area"
          >
            <input {...getInputProps()} id="video-file-input" />

            {selectedFile ? (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-xl bg-status-success/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-status-success" />
                </div>
                <div>
                  <p className="font-semibold text-text-primary">{selectedFile.name}</p>
                  <p className="text-sm text-text-secondary mt-1">{formatFileSize(selectedFile.size)}</p>
                </div>
                <p className="text-xs text-text-muted">Click or drag to replace</p>
              </div>
            ) : isDragActive ? (
              <div className="space-y-3">
                <Upload className="w-12 h-12 text-accent-blue mx-auto" />
                <p className="font-medium text-accent-blue">Drop the file here</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-xl bg-surface-DEFAULT flex items-center justify-center mx-auto">
                  <FileVideo className="w-7 h-7 text-text-muted" />
                </div>
                <div>
                  <p className="font-semibold text-text-primary">Drop a video here</p>
                  <p className="text-sm text-text-secondary mt-1">or click to browse files</p>
                </div>
                <div className="flex items-center justify-center gap-4 text-xs text-text-muted">
                  <span>MP4 · MOV · WebM</span>
                  <span>·</span>
                  <span>Max 500 MB</span>
                </div>
              </div>
            )}
          </div>

          {/* Validation error */}
          {validationError && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-status-error/10 border border-status-error/30 text-status-error text-sm" role="alert">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Title input */}
          <div>
            <label className="label" htmlFor="project-title">Project Title</label>
            <input
              id="project-title"
              type="text"
              className="input"
              placeholder="My awesome video"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
            />
          </div>

          {/* API error */}
          {apiError && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-status-warning/10 border border-status-warning/30 text-status-warning text-sm" role="alert">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleCreate}
            disabled={creating || !selectedFile}
            className="btn-primary w-full py-3 text-base"
            id="create-project-btn"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating project…
              </>
            ) : (
              <>
                <Video className="w-4 h-4" />
                Create Project
              </>
            )}
          </button>

          {/* Info note */}
          <p className="text-xs text-text-muted text-center">
            FFmpeg must be installed for transcription and rendering.{' '}
            <a href="https://ffmpeg.org/download.html" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">
              Download FFmpeg →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
