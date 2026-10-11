import { useState } from 'react';
import {
  Loader2, AlertCircle, CheckCircle2, RefreshCw, Upload, Clock,
  ChevronDown, Plus
} from 'lucide-react';
import type { Transcript, Segment } from '@capzee/contracts';
import { parseSRT, parseVTT, generateSRT, generateVTT, getCaptionOutputMeta } from '@capzee/contracts';
import type { JobState } from '@/stores/projectStore';
import { cn, formatDuration } from '@/lib/utils';

const INDIAN_LANGUAGES = [
  { code: 'auto', label: 'Auto detect' },
  { code: 'ta', label: 'Tamil' },
  { code: 'hi', label: 'Hindi' },
  { code: 'te', label: 'Telugu' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'kn', label: 'Kannada' },
  { code: 'mr', label: 'Marathi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'en-in', label: 'English (India)' },
];

const GLOBAL_LANGUAGES = [
  { code: 'auto', label: 'Auto detect' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'ru', label: 'Russian' },
  { code: 'pt', label: 'Portuguese' },
];

const SUPPORTED_TRANSCRIPTION_LANGUAGES = [
  ...INDIAN_LANGUAGES,
  ...GLOBAL_LANGUAGES.filter((g) => !INDIAN_LANGUAGES.some((i) => i.code === g.code)),
];

interface TranscriptionPanelProps {
  transcript: Transcript | null;
  currentJob: JobState | null;
  activeSegment: Segment | null;
  onTranscriptChange: (transcript: Transcript) => void;
  onStartTranscription: (opts: { language: string; model: string; captionOutput?: 'native' | 'roman' | 'translate' }) => void;
  onSeek: (seconds: number) => void;
  hasVideo?: boolean;
  onSplitSegment?: () => void;
  onDeleteSegment?: (segId: string) => void;
  onMergeSegment?: (segId: string) => void;
  onAddSegment?: () => void;
}

export function TranscriptionPanel({
  transcript,
  currentJob,
  activeSegment,
  onTranscriptChange,
  onStartTranscription,
  onSeek,
  hasVideo = true,
  onSplitSegment,
  onMergeSegment,
  onAddSegment,
}: TranscriptionPanelProps) {
  const [isIndian, setIsIndian] = useState(true);
  const [language, setLanguage] = useState('auto');
  const [captionOutput, setCaptionOutput] = useState<'native' | 'roman' | 'translate'>('native');
  const model = 'small';
  const [editingSegId, setEditingSegId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editStart, setEditStart] = useState<number>(0);
  const [editEnd, setEditEnd] = useState<number>(0);

  const isProcessing = currentJob?.status === 'queued' || currentJob?.status === 'processing';

  function startEdit(seg: Segment) {
    setEditingSegId(seg.id);
    setEditText(seg.text);
    setEditStart(seg.start);
    setEditEnd(seg.end);
  }

  function commitEdit(segId: string) {
    if (!transcript) return;
    const updated: Transcript = {
      ...transcript,
      segments: transcript.segments.map((s) =>
        s.id === segId
          ? {
              ...s,
              text: editText,
              start: Number(editStart),
              end: Number(editEnd),
            }
          : s
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
    setEditingSegId(null);
  }

  function downloadSubtitleFile(format: 'srt' | 'vtt') {
    if (!transcript) return;
    const content = format === 'srt' ? generateSRT(transcript) : generateVTT(transcript);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `captions.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Auto-generating / Setup screen matching reference screenshot ───────────
  if (!transcript && !isProcessing) {
    return (
      <div className="p-3.5 space-y-3.5 font-sans text-[#2F3020] bg-[#FAF7F5] rounded-2xl border border-[#2F3020]/15 shadow-sm">
        {/* SPOKEN LANGUAGE */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold tracking-wider text-[#2F3020]/60 uppercase">
              SPOKEN LANGUAGE
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-[#2F3020]/80">Indian</span>
              <button
                type="button"
                role="switch"
                aria-checked={isIndian}
                onClick={() => setIsIndian(!isIndian)}
                className={cn(
                  "w-8 h-4.5 rounded-full transition-colors p-0.5 flex items-center cursor-pointer",
                  isIndian ? "bg-[#16A34A] justify-end" : "bg-[#2F3020]/20 justify-start"
                )}
              >
                <div className="w-3.5 h-3.5 rounded-full bg-white shadow-xs" />
              </button>
            </div>
          </div>

          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-white border border-[#2F3020]/20 rounded-xl px-3 py-2 text-xs font-semibold text-[#2F3020] appearance-none focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] cursor-pointer shadow-xs pr-7"
            >
              {(isIndian ? INDIAN_LANGUAGES : GLOBAL_LANGUAGES).map((l) => (
                <option key={l.code} value={l.code} className="bg-white text-[#2F3020]">{l.label}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#2F3020]/50 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* CAPTION OUTPUT */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold tracking-wider text-[#2F3020]/60 uppercase">
              CAPTION OUTPUT
            </span>
            <span className="text-[9.5px] font-bold text-[#16A34A] bg-[#16A34A]/10 px-2 py-0.5 rounded-md border border-[#16A34A]/30">
              {captionOutput === 'native' ? getCaptionOutputMeta(language).nativeLabel : captionOutput === 'roman' ? getCaptionOutputMeta(language).romanLabel : getCaptionOutputMeta(language).translateLabel}
            </span>
          </div>

          <div className="bg-white border border-[#2F3020]/15 rounded-xl p-1 flex items-center gap-1 shadow-xs">
            {getCaptionOutputMeta(language).options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCaptionOutput(opt.id)}
                className={cn(
                  "flex-1 py-1.5 px-1 rounded-lg text-xs font-bold text-center transition-all cursor-pointer truncate",
                  captionOutput === opt.id
                    ? "bg-[#16A34A] text-white shadow-xs"
                    : "text-[#2F3020]/70 hover:text-[#2F3020] hover:bg-[#FAF7F5]"
                )}
                title={opt.hint}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* User-visible dynamic hint showing Tanglish / Hinglish / Native explanation */}
          <p className="text-[10px] text-[#2F3020]/80 mt-1.5 font-medium flex items-center gap-1.5 bg-white border border-[#2F3020]/15 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <span className="text-[#16A34A] font-bold text-xs">✨</span>
            <span>
              {captionOutput === 'native' && getCaptionOutputMeta(language).nativeHint}
              {captionOutput === 'roman' && getCaptionOutputMeta(language).romanHint}
              {captionOutput === 'translate' && getCaptionOutputMeta(language).translateHint}
            </span>
          </p>
        </div>

        {/* Action Button: Red 'Select a video layer' if !hasVideo, or vibrant Green 'Generate captions' */}
        <button
          type="button"
          onClick={() => hasVideo && onStartTranscription({ language, model, captionOutput })}
          disabled={!hasVideo}
          className={cn(
            "w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-md transition-transform active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer",
            !hasVideo
              ? "bg-rose-600 hover:bg-rose-700 opacity-80"
              : "bg-[#16A34A] hover:bg-[#15803D] hover:scale-[1.01]"
          )}
        >
          {!hasVideo ? "Select a video layer" : "Generate captions"}
        </button>

        {/* Or Import Subtitles (.srt / .vtt) */}
        <div className="pt-2 border-t border-[#2F3020]/15">
          <label className="w-full text-[11px] flex items-center justify-center gap-1.5 cursor-pointer py-1.5 font-semibold text-[#2F3020]/70 hover:text-[#2F3020] hover:bg-white rounded-lg transition-colors">
            <Upload className="w-3.5 h-3.5" />
            Or Import Subtitles (.srt / .vtt)
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
      </div>
    );
  }

  // ── Processing ───────────────────────────────────────────────────────────
  if (isProcessing && currentJob) {
    return (
      <div className="p-4 space-y-4 bg-[#FAF7F5] rounded-2xl border border-[#2F3020]/15 text-[#2F3020] shadow-sm">
        <div className="text-center py-6">
          <Loader2 className="w-8 h-8 animate-spin text-[#16A34A] mx-auto mb-4" />
          <p className="font-semibold text-sm text-[#2F3020]">
            {currentJob.stage === 'loading_model' ? 'Loading AI model…' :
              currentJob.stage === 'extracting_audio' ? 'Extracting audio…' :
                currentJob.stage === 'transcribing' ? 'Transcribing speech…' :
                  'Processing…'}
          </p>
          <p className="text-xs text-[#2F3020]/60 mt-1">
            This may take a few moments depending on video length and model size.
          </p>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-[#2F3020]/60 mb-1 font-mono">
            <span>Progress</span>
            <span>{currentJob.progress}%</span>
          </div>
          <div className="h-2 bg-[#2F3020]/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#16A34A] transition-all duration-500 rounded-full"
              style={{ width: `${currentJob.progress}%` }}
            />
          </div>
        </div>

        {currentJob.status === 'failed' && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
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
      <div className="flex flex-col h-full bg-[#FAF7F5] rounded-xl overflow-hidden border border-[#2F3020]/15 text-[#2F3020]">
        {/* Header with language, add subtitle, export, and regenerate controls */}
        <div className="flex flex-col gap-1.5 px-3 py-2.5 border-b border-[#2F3020]/15 flex-shrink-0 bg-[#FAF7F5]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
              <span className="text-xs font-bold text-[#2F3020]">
                {transcript.segments.length} segments
              </span>
            </div>
            {onAddSegment && (
              <button
                onClick={onAddSegment}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#16A34A] hover:bg-[#15803D] text-white text-[10px] font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                title="Add caption at current playhead"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                <span>Add Subtitle</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[#2F3020]/10 text-[10px]">
            {/* Quick Export options */}
            <div className="flex items-center gap-1">
              <span className="text-[#2F3020]/50 font-mono text-[9px] uppercase font-bold">Export:</span>
              <button
                onClick={() => downloadSubtitleFile('srt')}
                className="px-2 py-0.5 bg-white hover:bg-[#FAF7F5] border border-[#2F3020]/15 rounded text-[9.5px] font-mono font-bold text-[#2F3020] cursor-pointer transition-colors shadow-2xs"
                title="Download .SRT file"
              >
                .SRT
              </button>
              <button
                onClick={() => downloadSubtitleFile('vtt')}
                className="px-2 py-0.5 bg-white hover:bg-[#FAF7F5] border border-[#2F3020]/15 rounded text-[9.5px] font-mono font-bold text-[#2F3020] cursor-pointer transition-colors shadow-2xs"
                title="Download .VTT file"
              >
                .VTT
              </button>
            </div>

            {/* Language & Regenerate */}
            <div className="flex items-center gap-1.5">
              <select
                value={language}
                onChange={(e) => {
                  const newLang = e.target.value;
                  setLanguage(newLang);
                  onStartTranscription({ language: newLang, model });
                }}
                className="text-[10px] bg-white border border-[#2F3020]/15 rounded px-2 py-0.5 text-[#2F3020] font-semibold cursor-pointer max-w-[100px] truncate shadow-2xs"
                title="Change speech language"
              >
                {SUPPORTED_TRANSCRIPTION_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="bg-white text-[#2F3020]">{l.label}</option>
                ))}
              </select>
              <button
                onClick={() => onStartTranscription({ language, model })}
                className="p-1 text-[#2F3020]/60 hover:text-[#2F3020] hover:bg-white rounded transition-colors cursor-pointer"
                title="Regenerate speech subtitles"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Segments list */}
        <div className="flex-1 overflow-auto p-2 space-y-1.5 bg-[#FAF7F5]">
          {transcript.segments.map((seg, idx) => {
            const isActive = activeSegment?.id === seg.id;
            const isEditing = editingSegId === seg.id;
            const isLast = idx === transcript.segments.length - 1;

            return (
              <div
                key={seg.id}
                className={cn(
                  'rounded-xl p-2.5 cursor-pointer transition-all duration-150 group',
                  isActive
                    ? 'bg-[#16A34A]/10 border-2 border-[#16A34A] shadow-sm ring-1 ring-[#16A34A]/25'
                    : 'bg-white hover:bg-white/80 border border-[#2F3020]/15 shadow-2xs'
                )}
                onClick={() => !isEditing && onSeek(seg.start)}
              >
                {/* Timestamp & segment actions */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-[#16A34A]">
                    <Clock className="w-3 h-3 text-[#16A34A]" />
                    {formatDuration(seg.start)} - {formatDuration(seg.end)}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onSplitSegment && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeek(seg.start);
                          onSplitSegment();
                        }}
                        className="text-[10px] text-[#2F3020]/70 hover:text-[#16A34A] px-1.5 py-0.5 rounded hover:bg-[#FAF7F5] font-semibold cursor-pointer"
                        title="Split segment"
                      >
                        Split
                      </button>
                    )}
                    {onMergeSegment && !isLast && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMergeSegment(seg.id);
                        }}
                        className="text-[10px] text-[#2F3020]/70 hover:text-[#16A34A] px-1.5 py-0.5 rounded hover:bg-[#FAF7F5] font-semibold cursor-pointer"
                        title="Merge with next segment"
                      >
                        Merge
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); startEdit(seg); }}
                      className="text-[10px] text-[#2F3020]/70 hover:text-[#16A34A] px-1.5 py-0.5 rounded hover:bg-[#FAF7F5] font-semibold cursor-pointer"
                      title="Edit text & timings"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSegment(seg.id); }}
                      className="text-[10px] text-rose-600 hover:text-rose-700 px-1.5 py-0.5 rounded hover:bg-rose-50 font-semibold cursor-pointer"
                      title="Delete segment"
                    >
                      Del
                    </button>
                  </div>
                </div>

                {/* Text */}
                {isEditing ? (
                  <div onClick={(e) => e.stopPropagation()} className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full bg-white border border-[#2F3020]/25 rounded-lg p-2 text-xs text-[#2F3020] font-medium focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] resize-none"
                      rows={2}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          commitEdit(seg.id);
                        }
                        if (e.key === 'Escape') setEditingSegId(null);
                      }}
                    />

                    {/* Fine-tuning Start & End timestamps */}
                    <div className="flex items-center gap-3 text-[10px]">
                      <label className="flex items-center gap-1 font-mono text-[#2F3020]/80">
                        <span className="text-[#2F3020]/50">Start:</span>
                        <input
                          type="number"
                          step="0.1"
                          value={editStart}
                          onChange={(e) => setEditStart(parseFloat(e.target.value) || 0)}
                          className="w-14 px-1.5 py-0.5 rounded border border-[#2F3020]/20 bg-white text-[#2F3020] text-[10px] font-mono focus:border-[#16A34A] focus:outline-none"
                        />
                      </label>
                      <label className="flex items-center gap-1 font-mono text-[#2F3020]/80">
                        <span className="text-[#2F3020]/50">End:</span>
                        <input
                          type="number"
                          step="0.1"
                          value={editEnd}
                          onChange={(e) => setEditEnd(parseFloat(e.target.value) || 0)}
                          className="w-14 px-1.5 py-0.5 rounded border border-[#2F3020]/20 bg-white text-[#2F3020] text-[10px] font-mono focus:border-[#16A34A] focus:outline-none"
                        />
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => commitEdit(seg.id)}
                        className="bg-[#16A34A] hover:bg-[#15803D] text-white text-[10px] font-bold py-1 px-3 rounded-lg shadow-xs cursor-pointer"
                      >Save</button>
                      <button
                        onClick={() => setEditingSegId(null)}
                        className="bg-[#2F3020]/10 hover:bg-[#2F3020]/15 text-[#2F3020] text-[10px] font-semibold py-1 px-2.5 rounded-lg cursor-pointer"
                      >Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className={cn('text-xs leading-relaxed flex flex-wrap gap-x-1.5 gap-y-1', isActive ? 'text-[#2F3020] font-bold' : 'text-[#2F3020]/80 font-medium')}>
                    {seg.words && seg.words.length > 0 ? (
                      seg.words.map((w) => (
                        <span
                          key={w.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSeek(w.start);
                          }}
                          className="hover:text-[#16A34A] hover:bg-[#16A34A]/10 cursor-pointer rounded px-1 py-0.5 transition-colors font-medium"
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
