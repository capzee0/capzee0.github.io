import { useState } from 'react';
import { Mic, Loader2, AlertCircle, CheckCircle2, RefreshCw, Clock, Upload } from 'lucide-react';
import type { Transcript, Segment } from '@capzee/contracts';
import { parseSRT, parseVTT } from '@capzee/contracts';
import type { JobState } from '@/stores/projectStore';
import { formatDuration, cn } from '@/lib/utils';
import { SUPPORTED_TRANSCRIPTION_LANGUAGES, WHISPER_MODELS } from '@capzee/contracts';

interface TranscriptionPanelProps {
  transcript: Transcript | null;
  currentJob: JobState | null;
  activeSegment: Segment | null;
  onTranscriptChange: (transcript: Transcript) => void;
  onStartTranscription: (opts: { language: string; model: string }) => void;
  onSeek: (seconds: number) => void;
}

export function TranscriptionPanel({
  transcript,
  currentJob,
  activeSegment,
  onTranscriptChange,
  onStartTranscription,
  onSeek,
}: TranscriptionPanelProps) {
  const [language, setLanguage] = useState('auto');
  const [model, setModel] = useState('small');
  const [editingSegId, setEditingSegId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const isProcessing = currentJob?.status === 'queued' || currentJob?.status === 'processing';

  function startEdit(seg: Segment) {
    setEditingSegId(seg.id);
    setEditText(seg.text);
  }

  function commitEdit(segId: string) {
    if (!transcript) return;
    const updated: Transcript = {
      ...transcript,
      segments: transcript.segments.map((s) =>
        s.id === segId ? { ...s, text: editText } : s
      ),
    };
    onTranscriptChange(updated);
    setEditingSegId(null);
  }

  function deleteSegment(segId: string) {
    if (!transcript) return;
    const updated: Transcript = {
      ...transcript,
      segments: transcript.segments.filter((s) => s.id !== segId),
    };
    onTranscriptChange(updated);
  }

  // ── Not yet transcribed ──────────────────────────────────────────────────
  if (!transcript && !isProcessing) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-2 p-3 rounded-lg bg-accent-blue/5 border border-accent-blue/20 text-xs text-text-secondary">
          <Mic className="w-3.5 h-3.5 text-accent-blue flex-shrink-0 mt-0.5" />
          <span>Transcribe your video to extract speech as editable text with timestamps.</span>
        </div>

        {/* Language selector */}
        <div>
          <label className="label" htmlFor="transcribe-language">Language</label>
          <select
            id="transcribe-language"
            className="input text-sm"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {SUPPORTED_TRANSCRIPTION_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>

        {/* Model selector */}
        <div>
          <label className="label" htmlFor="transcribe-model">Whisper Model</label>
          <select
            id="transcribe-model"
            className="input text-sm"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {WHISPER_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.quality}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-muted mt-1">
            Larger models are more accurate but slower. "Small" is recommended.
          </p>
        </div>

        <button
          onClick={() => onStartTranscription({ language, model })}
          className="btn-primary w-full text-sm"
          id="start-transcription-btn"
        >
          <Mic className="w-3.5 h-3.5" />
          Start AI Transcription
        </button>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-surface-border"></div>
          <span className="flex-shrink mx-2 text-[10px] uppercase font-bold text-text-muted">Or (No-AI Options)</span>
          <div className="flex-grow border-t border-surface-border"></div>
        </div>

        {/* File Import Button */}
        <div>
          <label className="btn-secondary w-full text-xs flex items-center justify-center gap-1.5 cursor-pointer py-2">
            <Upload className="w-3.5 h-3.5 text-accent-blue" />
            Import Subtitles (.srt / .vtt)
            <input
              type="file"
              accept=".srt,.vtt,.txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                  const content = event.target?.result as string;
                  if (!content) return;
                  try {
                    const parsed = file.name.endsWith('.vtt') ? parseVTT(content) : parseSRT(content);
                    if (parsed.segments.length > 0) {
                      onTranscriptChange(parsed);
                    }
                  } catch (err) {
                    console.error('Subtitle parse error:', err);
                  }
                };
                reader.readAsText(file);
              }}
            />
          </label>
        </div>

        <p className="text-[11px] text-text-muted text-center">
          ⚡ 100% Offline & Instant: Drop your existing SRT/VTT file without needing AI models.
        </p>
      </div>
    );
  }

  // ── Processing ───────────────────────────────────────────────────────────
  if (isProcessing && currentJob) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-6">
          <Loader2 className="w-8 h-8 animate-spin text-accent-blue mx-auto mb-4" />
          <p className="font-medium text-sm text-text-primary">
            {currentJob.stage === 'loading_model' ? 'Loading AI model…' :
             currentJob.stage === 'extracting_audio' ? 'Extracting audio…' :
             currentJob.stage === 'transcribing' ? 'Transcribing speech…' :
             'Processing…'}
          </p>
          <p className="text-xs text-text-muted mt-1">
            This may take a few minutes depending on video length and model size.
          </p>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-text-muted mb-1">
            <span>Progress</span>
            <span>{currentJob.progress}%</span>
          </div>
          <div className="h-1.5 bg-surface-DEFAULT rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-blue transition-all duration-500"
              style={{ width: `${currentJob.progress}%` }}
            />
          </div>
        </div>

        {currentJob.status === 'failed' && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-status-error/10 border border-status-error/30 text-status-error text-xs">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{currentJob.errorMessage ?? 'Transcription failed.'}</span>
          </div>
        )}
      </div>
    );
  }

  // ── Has transcript ───────────────────────────────────────────────────────
  if (transcript) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-border flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
            <span className="text-xs text-text-secondary">
              {transcript.segments.length} segments · {transcript.language}
            </span>
          </div>
          <button
            onClick={() => onStartTranscription({ language, model })}
            className="btn-ghost p-1.5 text-xs gap-1"
            title="Regenerate transcript"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        {/* Segments list */}
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {transcript.segments.map((seg) => {
            const isActive = activeSegment?.id === seg.id;
            const isEditing = editingSegId === seg.id;

            return (
              <div
                key={seg.id}
                className={cn(
                  'rounded-md p-2.5 cursor-pointer transition-all duration-150 group',
                  isActive
                    ? 'bg-accent-blue/10 border border-accent-blue/30'
                    : 'hover:bg-surface-hover border border-transparent'
                )}
                onClick={() => !isEditing && onSeek(seg.start)}
              >
                {/* Timestamp */}
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1 text-xs text-text-muted font-mono">
                    <Clock className="w-2.5 h-2.5" />
                    {formatDuration(seg.start)}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); startEdit(seg); }}
                      className="text-xs text-text-muted hover:text-text-primary px-1.5 py-0.5 rounded hover:bg-surface-active"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSegment(seg.id); }}
                      className="text-xs text-status-error hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-status-error/10"
                    >
                      Del
                    </button>
                  </div>
                </div>

                {/* Text */}
                {isEditing ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="input text-xs w-full resize-none"
                      rows={3}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          commitEdit(seg.id);
                        }
                        if (e.key === 'Escape') setEditingSegId(null);
                      }}
                    />
                    <div className="flex gap-1.5 mt-1.5">
                      <button
                        onClick={() => commitEdit(seg.id)}
                        className="btn-primary text-xs py-0.5 px-2"
                      >Save</button>
                      <button
                        onClick={() => setEditingSegId(null)}
                        className="btn-ghost text-xs py-0.5 px-2"
                      >Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className={cn('text-xs leading-relaxed flex flex-wrap gap-x-1 gap-y-0.5', isActive ? 'text-text-primary' : 'text-text-secondary')}>
                    {seg.words && seg.words.length > 0 ? (
                      seg.words.map((w) => (
                        <span
                          key={w.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSeek(w.start);
                          }}
                          className="hover:text-accent-blue hover:underline cursor-pointer rounded px-0.5 transition-colors"
                          title={`Click to seek to ${w.start.toFixed(2)}s`}
                        >
                          {w.text}
                        </span>
                      ))
                    ) : (
                      <span>{seg.text}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
