import { useState } from 'react';
import {
  Settings, Monitor, Cpu, HardDrive, Globe, Info, AlertTriangle
} from 'lucide-react';
import { WHISPER_MODELS } from '@capzee/contracts';

export function SettingsPage() {
  const [whisperModel, setWhisperModel] = useState(
    () => localStorage.getItem('capzee.whisper_model') ?? 'small'
  );
  const [ffmpegPath, setFfmpegPath] = useState(
    () => localStorage.getItem('capzee.ffmpeg_path') ?? ''
  );

  function save() {
    localStorage.setItem('capzee.whisper_model', whisperModel);
    localStorage.setItem('capzee.ffmpeg_path', ffmpegPath);
    alert('Settings saved. Restart the dev server to apply backend changes.');
  }

  const selectedModel = WHISPER_MODELS.find((m) => m.id === whisperModel);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto px-8 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-accent-blue" />
            Settings
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Configure local processing preferences
          </p>
        </div>

        {/* Transcription settings */}
        <section className="panel p-6 space-y-4">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <Cpu className="w-4 h-4 text-accent-blue" />
            Transcription (Whisper)
          </h2>

          <div>
            <label className="label" htmlFor="settings-model">Whisper Model</label>
            <select
              id="settings-model"
              className="input"
              value={whisperModel}
              onChange={(e) => setWhisperModel(e.target.value)}
            >
              {WHISPER_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>

            {selectedModel && (
              <div className="mt-2 grid grid-cols-3 gap-3">
                {[
                  { label: 'Disk', value: `~${selectedModel.diskMb} MB` },
                  { label: 'RAM', value: `~${selectedModel.ramMb} MB` },
                  { label: 'Speed', value: selectedModel.speed },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-surface-DEFAULT rounded p-2 text-center">
                    <p className="text-xs text-text-muted">{label}</p>
                    <p className="text-sm font-medium text-text-primary">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-status-info/10 border border-status-info/20 text-xs text-text-secondary">
            <Info className="w-3.5 h-3.5 text-status-info flex-shrink-0 mt-0.5" />
            <span>
              Models are downloaded on first use from Hugging Face.
              The "small" model (244 MB) offers a good balance of accuracy and speed.
            </span>
          </div>
        </section>

        {/* FFmpeg settings */}
        <section className="panel p-6 space-y-4">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <Monitor className="w-4 h-4 text-accent-blue" />
            FFmpeg
          </h2>

          <div>
            <label className="label" htmlFor="ffmpeg-path">
              FFmpeg Path (leave empty to use system PATH)
            </label>
            <input
              id="ffmpeg-path"
              type="text"
              className="input font-mono text-sm"
              placeholder="e.g. C:\ffmpeg\bin\ffmpeg.exe"
              value={ffmpegPath}
              onChange={(e) => setFfmpegPath(e.target.value)}
            />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-status-warning/10 border border-status-warning/20 text-xs text-text-secondary">
            <AlertTriangle className="w-3.5 h-3.5 text-status-warning flex-shrink-0 mt-0.5" />
            <span>
              FFmpeg is required for audio extraction and video rendering.
              Download from{' '}
              <a
                href="https://ffmpeg.org/download.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-blue hover:underline"
              >
                ffmpeg.org
              </a>{' '}
              and add it to your PATH.
            </span>
          </div>
        </section>

        {/* System info */}
        <section className="panel p-6 space-y-3">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-accent-blue" />
            System
          </h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between text-text-secondary">
              <span>Processing Mode:</span>
              <span className="text-text-primary">Local</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Cloud Sync:</span>
              <span className="text-text-primary">Disabled</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Version:</span>
              <span className="text-text-primary">0.1.0</span>
            </div>
          </div>
        </section>

        {/* Python note */}
        <section className="panel p-6 space-y-3">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <Globe className="w-4 h-4 text-accent-blue" />
            Python Worker
          </h2>
          <div className="text-sm text-text-secondary space-y-2">
            <p>
              Transcription requires Python 3.9+ and faster-whisper.
            </p>
            <div className="bg-bg-secondary rounded p-3 font-mono text-xs text-text-primary space-y-1">
              <p className="text-text-muted"># Set up the Python worker</p>
              <p>cd services/ai-worker</p>
              <p>python -m venv .venv</p>
              <p>.venv\Scripts\activate  <span className="text-text-muted"># Windows</span></p>
              <p>pip install pydantic faster-whisper</p>
            </div>
            <p className="text-xs text-text-muted">
              Note: faster-whisper officially supports Python 3.8–3.11. Python 3.14 may require
              additional workarounds. See docs/LOCAL_SETUP.md for details.
            </p>
          </div>
        </section>

        {/* Save */}
        <button onClick={save} className="btn-primary px-8 py-2.5">
          Save Settings
        </button>
      </div>
    </div>
  );
}
