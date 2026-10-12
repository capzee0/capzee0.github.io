# Capzee — AI-Powered Video Captioning & Smart Editing Platform

Capzee is a production-grade, AI-powered video captioning and smart editing platform tailored for creators, editors, and social media managers. It automatically extracts speech with high-precision word-level timestamps, formats dynamic viral subtitles, and generates platform-tailored hooks, descriptions, and hashtags.

---

## 🚀 Key Highlights & Architecture

```
capzee/
├── apps/
│   ├── web/           # React 18 + Vite + Tailwind CSS + Radix UI + Zustand (3-Pane Studio)
│   └── desktop/       # Electron desktop app with native file dialogs and window controls
├── packages/
│   └── contracts/     # Shared schemas, Zod validators, presets, SRT/VTT/ASS generators
└── services/
    ├── api/           # Node.js + Express 5 REST API (Projects, SSE Jobs, Transcripts, Storage)
    └── ai-worker/     # Python 3 worker (faster-whisper, media inspection, ASS/FFmpeg render engine)
```

### 1. High-Performance Monorepo
- **`packages/contracts`**: Universal TypeScript contracts, Zod schemas, and caption presets. Pure ESM, zero runtime bloat. Includes `generateSRT`, `generateVTT`, `generateASS`, and `generatePlainText`.
- **`apps/web`**: Dark-aesthetic studio interface with **3-Pane Resizable Layout** (`react-resizable-panels`), real-time video preview, synchronized word-by-word highlights, safe-zone guides, timeline scrubber, silence remover, and export modal.
- **`apps/desktop`**: Electron-powered desktop application with native file pickers (`.mp4`, `.mov`, `.webm`, `.mkv`), native menus, and direct filesystem export.
- **`services/api`**: REST API with real-time **Server-Sent Events (SSE)** job streaming, magic bytes media validation, modular storage provider (Local Disk + Supabase direct signed URLs), and silence detection.
- **`services/ai-worker`**: Speech-to-text pipeline supporting Whisper models (`tiny`, `base`, `small`, `medium`, `large-v3`) with Tamil, Tanglish, Hindi, and multilingual recognition, plus automatic cloud fallback chain (Groq ➡️ OpenAI ➡️ Local Whisper ➡️ Mock).

---

## 🛠️ Quickstart

### Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **Python**: 3.9+ (Python 3.10–3.14 supported)
- **Docker** (optional): For running PostgreSQL 16 & Redis 7 services locally.

### Installation

```bash
# Clone and install dependencies
npm install --ignore-scripts
```

### Running Locally

```bash
# 1. Run the Web Studio & REST API concurrently
npm run dev

# 2. Or run individual workspaces:
npm run dev:web        # Launches Vite development server on http://localhost:5173
npm run dev:api        # Launches Express API on http://localhost:4000
npm run dev:desktop    # Launches Electron Desktop application

# 3. Optional: Start local Postgres and Redis via Docker
npm run docker:up
npm run docker:down
```

### Building for Production

```bash
# Builds contracts, web client bundle, API, and desktop app
npm run build
```

---

## 🧪 Testing & Quality Assurance

Each workspace includes automated test suites with **93 passing tests**:

```bash
# Run all Node.js and React tests across monorepo workspaces (Vitest)
npm test

# Run Python AI worker tests (pytest)
npm run test:worker

# Run full TypeScript typecheck
npm run typecheck
```

### Test Suite Breakdown
- **`@capzee/web`**: 28 passed tests (Dashboard, Studio, Timeline, Silence Remover, Utils)
- **`@capzee/api`**: 26 passed tests (Projects, SSE Jobs, Transcription Fallback, Media Validation, Storage)
- **`@capzee/contracts`**: 19 passed tests (Schemas, Presets, SRT, VTT, ASS Subtitles)
- **`ai-worker`**: 20 passed tests (ASS Subtitle Generation, Media Inspector, Schema validation)
- **Total**: 93 passed tests with 100% pass rate.

---

## 🎨 Features & Capabilities

### 3-Pane Creator Studio
- **Left Pane**: Viral Preset Gallery with animated CapCut-style presets.
- **Center Pane**: Video Canvas with draggable `CaptionOverlay`, TikTok / Reels Safe Zone overlay, and `FluxoCutTimeline` with timecode scrubber and waveform visualization.
- **Right Pane**: Multi-tab Inspector featuring:
  - **Captions**: Word-level subtitle editor, Tanglish toggle, confidence indicators, add/split/merge actions.
  - **Style**: Comprehensive typography, color palettes, border, shadow, and positioning controls.
  - **Silence Cut**: One-click AI silence remover with Gentle, Balanced, and Tight pause thresholds.

### Word-Level Animated Subtitles & Parity
- Real-time timestamp tracking down to millisecond accuracy.
- **Tamil & Tanglish Font Stack**: Embedded `'Noto Sans Tamil'` font fallback ensures Tamil characters render cleanly without missing glyph tofu blocks in both web canvas preview and burned-in video exports.
- **3-Word Windowing**: Keeps dialogue readable without screen flooding, highlighting active words in synchronization with speech.

### Subtitle & Video Export
- **SubRip (.SRT)**: Standard subtitle files compatible with YouTube, Premiere Pro, and DaVinci Resolve.
- **WebVTT (.VTT)**: HTML5-compliant web subtitles for modern web players.
- **Styled SubStation (.ASS)**: Advanced subtitle file preserving full CapZee typography, colors, and word animations for professional NLEs.
- **Transcript (.JSON)**: Complete data hierarchy with word-level bounds and confidence scores.
- **Clean Script (.TXT)**: Timestamp-free readable script for articles and show notes.
- **Burned-in Video (MP4)**: Video re-encoding with captions burned directly into the video stream via FFmpeg.

### AI Social Media Caption Generator
- Generates platform-tailored post copy:
  - **Instagram Reels**: Hook line, caption body, targeted hashtags, and call-to-action.
  - **TikTok**: High-energy trend hooks and viral hashtags.
  - **YouTube Shorts**: SEO-optimized short descriptions and engagement triggers.
- Multiple tone options: *Conversational*, *Educational*, *Hype*, *Professional*, *Cinematic*, *Inspirational*.

---

## 🔒 Security & Resilience
- **Magic Bytes Validation**: Uploaded media is verified at the binary header level (MP4 `ftyp`, WebM EBML, WAV RIFF, MP3 ID3/sync) preventing malicious file disguised extensions.
- **SSE Real-time Streaming**: Non-blocking asynchronous job queue with Server-Sent Events and client polling fallback.
- **Multi-Provider Fallback**: Seamless fallback across Groq, OpenAI, Local Faster-Whisper, and deterministic Mock providers.
- **Strict Content Security Policy & CORS** configured across API services.
