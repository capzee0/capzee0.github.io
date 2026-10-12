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
  generateASS,
  type Transcript,
  type CaptionStyle,
} from '@capzee/contracts';
import { cn } from '@/lib/utils';
import { renderVideo, subscribeJobEvents, getExportUrl } from '@/services/api';

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

  if (!isOpen) return null;

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

  function downloadASS() {
    if (!transcript) return;
    const ass = generateASS(transcript, captionStyle);
    triggerDownload(ass, `${baseFileName}_styled.ass`, 'text/x-ssa;charset=utf-8');
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

      // Stream render job progress via SSE (with polling fallback)
      await subscribeJobEvents(
        job.id,
        (updatedJob) => {
          if (updatedJob.progress != null) {
            setRenderProgress(Math.max(10, Math.min(updatedJob.progress, 95)));
          }
        }
      );

      setRenderProgress(100);
      setRenderedUrl(getExportUrl(projectId, 'mp4'));
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
  const assContent = transcript ? generateASS(transcript, captionStyle) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2F3020]/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-[#CDCBD6] border-2 border-[#2F3020]/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#2F3020]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2F3020]/15 bg-[#FAF7F5]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#16A34A]/15 flex items-center justify-center text-[#16A34A]">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#2F3020]">Export Captions & Video</h2>
              <p className="text-xs text-[#2F3020]/70 font-medium">Export subtitles in standard formats or render burned-in video</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#2F3020]/70 hover:text-[#2F3020] hover:bg-[#CDCBD6] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!transcript ? (
          <div className="p-8 text-center space-y-4 my-auto">
            <div className="w-12 h-12 rounded-full bg-amber-500/15 text-amber-700 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#2F3020]">No Transcripts Available Yet</h3>
              <p className="text-xs text-[#2F3020]/75 mt-1.5 max-w-sm mx-auto font-medium">
                Please generate captions first using the <span className="font-bold text-[#16A34A]">Text / Transcribe</span> tab in the editor before exporting subtitles or burned-in video.
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold rounded-lg text-xs shadow-sm transition-all cursor-pointer"
            >
              Back to Editor
            </button>
          </div>
        ) : (
          <>
            {/* Tab switch */}
            <div className="flex border-b border-[#2F3020]/15 bg-[#CDCBD6] px-6">
              <button
                onClick={() => setActiveTab('subtitles')}
                className={cn(
                  'flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-colors',
                  activeTab === 'subtitles'
                    ? 'border-[#16A34A] text-[#16A34A]'
                    : 'border-transparent text-[#2F3020]/70 hover:text-[#2F3020]'
                )}
              >
                <FileText className="w-4 h-4" />
                Subtitle Files (SRT, VTT, JSON)
              </button>
              <button
                onClick={() => setActiveTab('video')}
                className={cn(
                  'flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-colors',
                  activeTab === 'video'
                    ? 'border-[#16A34A] text-[#16A34A]'
                    : 'border-transparent text-[#2F3020]/70 hover:text-[#2F3020]'
                )}
              >
                <Video className="w-4 h-4" />
                Burned-In Video Render
              </button>
            </div>

            {/* Tab content */}
            <div className="p-3.5 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4 flex-1">
              {activeTab === 'subtitles' ? (
                <div className="space-y-2.5 sm:space-y-3">
                  {/* SRT */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-3.5 bg-[#FAF7F5] border border-[#2F3020]/15 rounded-xl shadow-xs gap-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#2F3020]">SubRip (.SRT)</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#16A34A]/15 text-[#16A34A] font-bold">Standard</span>
                      </div>
                      <p className="text-xs text-[#2F3020]/70 mt-0.5">Compatible with YouTube, Premiere, DaVinci, Final Cut</p>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleCopy(srtContent, 'srt')}
                        className="text-xs px-2.5 py-1.5 flex items-center gap-1.5 bg-[#CDCBD6] hover:bg-[#CDCBD6]/80 text-[#2F3020] rounded font-semibold transition-colors cursor-pointer"
                        title="Copy SRT to clipboard"
                      >
                        {copiedFormat === 'srt' ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedFormat === 'srt' ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={downloadSRT}
                        className="text-xs px-3 py-1.5 flex items-center gap-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>

                  {/* VTT */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-3.5 bg-[#FAF7F5] border border-[#2F3020]/15 rounded-xl shadow-xs gap-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#2F3020]">WebVTT (.VTT)</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#16A34A]/15 text-[#16A34A] font-bold">Web Standard</span>
                      </div>
                      <p className="text-xs text-[#2F3020]/70 mt-0.5">HTML5 video players, TikTok web upload, Vimeo</p>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleCopy(vttContent, 'vtt')}
                        className="text-xs px-2.5 py-1.5 flex items-center gap-1.5 bg-[#CDCBD6] hover:bg-[#CDCBD6]/80 text-[#2F3020] rounded font-semibold transition-colors cursor-pointer"
                        title="Copy VTT to clipboard"
                      >
                        {copiedFormat === 'vtt' ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedFormat === 'vtt' ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={downloadVTT}
                        className="text-xs px-3 py-1.5 flex items-center gap-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>

                  {/* Styled ASS Subtitles */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-3.5 bg-[#FAF7F5] border border-[#2F3020]/15 rounded-xl shadow-xs gap-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#2F3020]">Styled SubStation (.ASS)</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D96846]/15 text-[#D96846] font-bold">CapZee Styles</span>
                      </div>
                      <p className="text-xs text-[#2F3020]/70 mt-0.5">Retains exact CapZee fonts, colors & word animations in Premiere & DaVinci</p>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleCopy(assContent, 'ass')}
                        className="text-xs px-2.5 py-1.5 flex items-center gap-1.5 bg-[#CDCBD6] hover:bg-[#CDCBD6]/80 text-[#2F3020] rounded font-semibold transition-colors cursor-pointer"
                        title="Copy ASS to clipboard"
                      >
                        {copiedFormat === 'ass' ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedFormat === 'ass' ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={downloadASS}
                        className="text-xs px-3 py-1.5 flex items-center gap-1.5 bg-[#D96846] hover:bg-[#c55736] text-white rounded font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>

                  {/* Plain text */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-3.5 bg-[#FAF7F5] border border-[#2F3020]/15 rounded-xl shadow-xs gap-2.5">
                    <div>
                      <span className="font-bold text-sm text-[#2F3020]">Clean Script (.TXT)</span>
                      <p className="text-xs text-[#2F3020]/70 mt-0.5">Plain transcribed text without timestamps</p>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleCopy(txtContent, 'txt')}
                        className="text-xs px-2.5 py-1.5 flex items-center gap-1.5 bg-[#CDCBD6] hover:bg-[#CDCBD6]/80 text-[#2F3020] rounded font-semibold transition-colors cursor-pointer"
                      >
                        {copiedFormat === 'txt' ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedFormat === 'txt' ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={downloadTXT}
                        className="text-xs px-3 py-1.5 flex items-center gap-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>

                  {/* JSON */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-3.5 bg-[#FAF7F5] border border-[#2F3020]/15 rounded-xl shadow-xs gap-2.5">
                    <div>
                      <span className="font-bold text-sm text-[#2F3020]">Full Transcript (.JSON)</span>
                      <p className="text-xs text-[#2F3020]/70 mt-0.5">Complete metadata with word-level start & end timestamps</p>
                    </div>
                    <button
                      onClick={downloadJSON}
                      className="text-xs px-3 py-1.5 flex items-center gap-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded font-bold shadow-xs transition-colors self-end sm:self-auto cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-[#FAF7F5] border border-[#2F3020]/15 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label htmlFor="export-resolution-select" className="text-xs font-bold text-[#2F3020]">Render Resolution</label>
                      <select
                        id="export-resolution-select"
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value as 'original' | '1080p' | '720p')}
                        className="text-xs py-1 px-2.5 bg-white border border-[#2F3020]/20 rounded-lg text-[#2F3020] font-semibold"
                      >
                        <option value="original">Original Resolution</option>
                        <option value="1080p">1080p Full HD</option>
                        <option value="720p">720p HD</option>
                      </select>
                    </div>

                    <div className="text-xs text-[#2F3020]/80 space-y-1">
                      <p>Active preset style will be burned directly into the video frames using FFmpeg.</p>
                      <p className="text-[11px] text-[#2F3020]/70">Preset: <strong className="text-[#16A34A]">{captionStyle.name || captionStyle.id}</strong> • Font: <strong className="text-[#2F3020]">{captionStyle.fontFamily}</strong> • Position: <strong className="text-[#2F3020]">{captionStyle.position.vertical}</strong> • Active Word: <strong className="text-[#2F3020]">{captionStyle.activeWordColor}</strong></p>
                    </div>
                  </div>

                  {renderError && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-[#FAF7F5] border border-red-700/30 text-red-700 text-xs">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Video Render Notice</p>
                        <p className="mt-0.5 opacity-90">{renderError}</p>
                        <p className="mt-1 text-[11px] opacity-75">Tip: You can always download the .SRT file above and import it directly into your video editing software.</p>
                      </div>
                    </div>
                  )}

                  {rendering && (
                    <div className="p-4 bg-[#FAF7F5] border border-[#16A34A]/30 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 text-[#16A34A] font-bold">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Rendering burned-in video...
                        </span>
                        <span className="font-mono text-[#2F3020] font-bold">{renderProgress}%</span>
                      </div>
                      <div className="w-full bg-[#CDCBD6] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#16A34A] h-full transition-all duration-300 rounded-full"
                          style={{ width: `${renderProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {renderedUrl && (
                    <div className="p-4 bg-[#FAF7F5] border border-[#16A34A] rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-[#16A34A]">Video Render Complete!</p>
                        <p className="text-[11px] text-[#2F3020]/70">Your video is ready to download.</p>
                      </div>
                      <a
                        href={renderedUrl}
                        download={`${baseFileName}_captioned.mp4`}
                        className="text-xs py-1.5 px-3 flex items-center gap-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold rounded-lg shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download MP4
                      </a>
                    </div>
                  )}

                  <button
                    onClick={handleStartRender}
                    disabled={rendering}
                    className="w-full py-3 text-xs font-bold bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    {rendering ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        Rendering Video...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-white" />
                        Start Burned-In Video Render
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#2F3020]/15 bg-[#FAF7F5] flex justify-end">
          <button onClick={onClose} className="px-4 py-1.5 text-xs font-bold bg-[#CDCBD6] hover:bg-[#2F3020]/10 text-[#2F3020] rounded-md transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
