import { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  FileText,
  Video,
  Sparkles,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  generateSRT,
  generateVTT,
  generatePlainText,
  type Transcript,
  type CaptionStyle,
} from '@capzee/contracts';
import { cn } from '@/lib/utils';
import { renderVideo, pollJob } from '@/services/api';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transcript: Transcript | null;
  captionStyle: CaptionStyle;
  projectId: string;
  videoTitle: string;
}

type TabType = 'subtitles' | 'video';

export function ExportModal({
  isOpen,
  onClose,
  transcript,
  captionStyle,
  projectId,
  videoTitle,
}: ExportModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('subtitles');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [resolution, setResolution] = useState<'original' | '1080p' | '720p'>('original');

  // Video render state
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderedUrl, setRenderedUrl] = useState<string | null>(null);

  if (!isOpen || !transcript) return null;

  const baseFileName = (videoTitle || 'captions').replace(/[^a-zA-Z0-9_-]/g, '_');

  function triggerDownload(content: string, filename: string, mimeType: string) {
    // If running in Desktop app, check for native saveFile
    const desktop = (window as unknown as { capzeeDesktop?: { saveFile: (c: string, name: string, f: Array<{ name: string; extensions: string[] }>) => Promise<{ canceled: boolean; filePath?: string }> } }).capzeeDesktop;
    if (desktop) {
      const ext = filename.split('.').pop() || '';
      desktop.saveFile(content, filename, [{ name: ext.toUpperCase(), extensions: [ext] }]);
      return;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleCopy(text: string, format: string) {
    navigator.clipboard.writeText(text);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  }

  function downloadSRT() {
    if (!transcript) return;
    const srt = generateSRT(transcript);
    triggerDownload(srt, `${baseFileName}.srt`, 'text/plain;charset=utf-8');
  }

  function downloadVTT() {
    if (!transcript) return;
    const vtt = generateVTT(transcript);
    triggerDownload(vtt, `${baseFileName}.vtt`, 'text/vtt;charset=utf-8');
  }

  function downloadJSON() {
    if (!transcript) return;
    const jsonStr = JSON.stringify(transcript, null, 2);
    triggerDownload(jsonStr, `${baseFileName}_transcript.json`, 'application/json');
  }

  function downloadTXT() {
    if (!transcript) return;
    const txt = generatePlainText(transcript);
    triggerDownload(txt, `${baseFileName}_script.txt`, 'text/plain;charset=utf-8');
  }

  async function handleStartRender() {
    setRendering(true);
    setRenderError(null);
    setRenderProgress(10);
    setRenderedUrl(null);

    try {
      const { job } = await renderVideo(projectId, {
        resolution,
        style: captionStyle,
      });

      // Poll render job
      await pollJob(
        job.id,
        (updatedJob: { progress?: number }) => {
          if (updatedJob.progress != null) {
            setRenderProgress(Math.max(10, Math.min(updatedJob.progress, 95)));
          }
        },
        3000,
        60
      );

      setRenderProgress(100);
      setRenderedUrl(`/api/v1/projects/${projectId}/export?format=mp4`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Rendering failed. Ensure backend AI worker and FFmpeg are available.';
      setRenderError(msg);
    } finally {
      setRendering(false);
    }
  }

  const srtContent = transcript ? generateSRT(transcript) : '';
  const vttContent = transcript ? generateVTT(transcript) : '';
  const txtContent = transcript ? generatePlainText(transcript) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-bg-panel border border-surface-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">Export Captions & Video</h2>
              <p className="text-xs text-text-muted">Export subtitles in standard formats or render burned-in video</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-DEFAULT rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-surface-border bg-bg-secondary px-6">
          <button
            onClick={() => setActiveTab('subtitles')}
            className={cn(
              'flex items-center gap-2 py-3 px-3 text-xs font-medium border-b-2 transition-colors',
              activeTab === 'subtitles'
                ? 'border-accent-blue text-accent-blue'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            )}
          >
            <FileText className="w-4 h-4" />
            Subtitle Files (SRT, VTT, JSON)
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={cn(
              'flex items-center gap-2 py-3 px-3 text-xs font-medium border-b-2 transition-colors',
              activeTab === 'video'
                ? 'border-accent-blue text-accent-blue'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            )}
          >
            <Video className="w-4 h-4" />
            Burned-In Video Render
          </button>
        </div>

        {/* Tab content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'subtitles' ? (
            <div className="space-y-3">
              {/* SRT */}
              <div className="flex items-center justify-between p-3.5 bg-surface-DEFAULT border border-surface-border rounded-xl hover:border-surface-hover transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-text-primary">SubRip (.SRT)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue font-medium">Standard</span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">Compatible with YouTube, Premiere, DaVinci, Final Cut</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(srtContent, 'srt')}
                    className="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1.5"
                    title="Copy SRT to clipboard"
                  >
                    {copiedFormat === 'srt' ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedFormat === 'srt' ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={downloadSRT}
                    className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              </div>

              {/* VTT */}
              <div className="flex items-center justify-between p-3.5 bg-surface-DEFAULT border border-surface-border rounded-xl hover:border-surface-hover transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-text-primary">WebVTT (.VTT)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple font-medium">Web Standard</span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">HTML5 video players, TikTok web upload, Vimeo</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(vttContent, 'vtt')}
                    className="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1.5"
                    title="Copy VTT to clipboard"
                  >
                    {copiedFormat === 'vtt' ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedFormat === 'vtt' ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={downloadVTT}
                    className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              </div>

              {/* Plain text */}
              <div className="flex items-center justify-between p-3.5 bg-surface-DEFAULT border border-surface-border rounded-xl hover:border-surface-hover transition-colors">
                <div>
                  <span className="font-semibold text-sm text-text-primary">Clean Script (.TXT)</span>
                  <p className="text-xs text-text-muted mt-0.5">Plain transcribed text without timestamps</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(txtContent, 'txt')}
                    className="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1.5"
                  >
                    {copiedFormat === 'txt' ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedFormat === 'txt' ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={downloadTXT}
                    className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              </div>

              {/* JSON */}
              <div className="flex items-center justify-between p-3.5 bg-surface-DEFAULT border border-surface-border rounded-xl hover:border-surface-hover transition-colors">
                <div>
                  <span className="font-semibold text-sm text-text-primary">Full Transcript (.JSON)</span>
                  <p className="text-xs text-text-muted mt-0.5">Complete metadata with word-level start & end timestamps</p>
                </div>
                <button
                  onClick={downloadJSON}
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-surface-DEFAULT border border-surface-border rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-text-primary">Render Resolution</label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value as 'original' | '1080p' | '720p')}
                    className="select-field text-xs py-1 px-2.5 bg-bg-secondary border border-surface-border rounded-lg text-text-primary"
                  >
                    <option value="original">Original Resolution</option>
                    <option value="1080p">1080p Full HD</option>
                    <option value="720p">720p HD</option>
                  </select>
                </div>

                <div className="text-xs text-text-muted space-y-1">
                  <p>Active preset style will be burned directly into the video frames using FFmpeg.</p>
                  <p className="text-[11px] text-text-muted/80">Font: <strong className="text-text-secondary">{captionStyle.fontFamily}</strong> • Position: <strong className="text-text-secondary">{captionStyle.position.vertical}</strong> • Active Word: <strong className="text-text-secondary">{captionStyle.activeWordColor}</strong></p>
                </div>
              </div>

              {renderError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-status-error/10 border border-status-error/30 text-status-error text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Video Render Notice</p>
                    <p className="mt-0.5 opacity-90">{renderError}</p>
                    <p className="mt-1 text-[11px] opacity-75">Tip: You can always download the .SRT file above and import it directly into your video editing software or social media platform.</p>
                  </div>
                </div>
              )}

              {rendering && (
                <div className="p-4 bg-surface-DEFAULT border border-accent-blue/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-accent-blue font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Rendering burned-in video...
                    </span>
                    <span className="font-mono text-text-secondary">{renderProgress}%</span>
                  </div>
                  <div className="w-full bg-surface-hover h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-accent-blue h-full transition-all duration-300 rounded-full"
                      style={{ width: `${renderProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {renderedUrl && (
                <div className="p-4 bg-status-success/10 border border-status-success/30 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-status-success">Video Render Complete!</p>
                    <p className="text-[11px] text-text-muted">Your video is ready to download.</p>
                  </div>
                  <a
                    href={renderedUrl}
                    download={`${baseFileName}_captioned.mp4`}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 bg-status-success hover:bg-emerald-600 text-white"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download MP4
                  </a>
                </div>
              )}

              <button
                onClick={handleStartRender}
                disabled={rendering}
                className="btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-2"
              >
                {rendering ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Rendering Video...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Start Burned-In Video Render
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-surface-border bg-bg-secondary flex justify-end">
          <button onClick={onClose} className="btn-secondary text-xs py-1.5 px-4">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
