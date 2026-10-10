# Capzee — AI-Powered Video Captioning & Smart Editing Platform

Capzee is a production-grade, AI-powered video captioning and smart editing platform tailored for creators, editors, and social media managers. It automatically extracts speech with high-precision word-level timestamps, formats dynamic viral subtitles, and generates platform-tailored hooks, descriptions, and hashtags.

---

## 🚀 Key Highlights & Architecture

```
capzee/
├── apps/
│   ├── web/           # React 18 + Vite + Tailwind CSS + Radix UI + Zustand (Creator Studio)
│   └── desktop/       # Electron desktop app with native file dialogs and window controls
├── packages/
│   └── contracts/     # Shared schemas, Zod validators, presets, and SRT/VTT generators
└── services/
    ├── api/           # Node.js + Express 5 REST API (Projects, Jobs, Transcripts, Social)
    └── ai-worker/     # Python 3 worker (faster-whisper, media inspection, SRT/VTT engine)
```

### 1. High-Performance Monorepo
- **`packages/contracts`**: Universal TypeScript contracts, Zod schemas, and caption presets. Pure ESM, zero runtime bloat.
- **`apps/web`**: Dark-aesthetic studio interface with real-time video preview, synchronized word-by-word highlights, caption styling panel, and export options.
- **`apps/desktop`**: Electron-powered desktop application with native file pickers (`.mp4`, `.mov`, `.webm`, `.mkv`), native menus, and direct filesystem export.
- **`services/api`**: REST API with modular routers, job queue management, local in-memory/file storage with cloud-ready architecture.
- **`services/ai-worker`**: Speech-to-text pipeline supporting Whisper models (`tiny`, `base`, `small`, `medium`, `large-v3`) with Tamil, Tanglish, Hindi, and multilingual recognition, plus auto-fallback.

---

## 🛠️ Quickstart

### Prerequisites
- **Node.js**: v18.0.0 or later (v24 recommended)
- **Python**: 3.9+ (Python 3.10–3.14 supported)
- **FFmpeg**: Optional for UI/mock mode; required for live audio extraction and burned-in video rendering.

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
```

### Building for Production

```bash
# Builds contracts, web client bundle, API, and desktop app
npm run build
```

---

## 🧪 Testing & Quality Assurance

Each workspace includes test suites:

```bash
# Test shared contracts
node --experimental-strip-types --test packages/contracts/tests/contracts.test.ts

# Test API endpoints
node --experimental-strip-types --test services/api/tests/api.test.ts

# Test Web app utilities
node --experimental-strip-types --test apps/web/tests/utils.test.ts

# Test Python AI worker (captions, inspector, schemas)
python -m pytest services/ai-worker/tests/
```

### Test Summary
- **Python AI Worker**: 17 tests passed (`test_captions.py`, `test_inspector.py`)
- **Shared Contracts**: 11 tests passed (`contracts.test.ts`)
- **Backend API**: 14 tests passed (`api.test.ts`)
- **Frontend Utilities**: 10 tests passed (`utils.test.ts`)
- **Total**: 52 passed tests across all components.

---

## 🎨 Features & Capabilities

### Word-Level Animated Subtitles
- Real-time timestamp tracking down to millisecond accuracy.
- Viral caption presets:
  - **Clean White**: Professional outline with subtle drop shadow.
  - **Viral Yellow**: High-converting TikTok/Reels style with bold yellow active-word highlight.
  - **Neon Green**: Modern gaming/vlog contrast style.
  - **Bold Box**: High-readability solid pill background.
- Full customization: Font family, font size, active word color, text color, outline width, shadows, background opacity, safe-area margins, and aspect ratios (9:16, 16:9, 1:1).

### Subtitle & Video Export
- **SubRip (.SRT)**: Standard subtitle files with escaped formatting and clean timestamping.
- **WebVTT (.VTT)**: HTML5-compliant web subtitles for modern video platforms.
- **Transcript (.JSON)**: Complete data hierarchy with word-level bounds and confidence scores.
- **Clean Script (.TXT)**: Timestamp-free readable script for copy-pasting into blog posts or articles.
- **Burned-in Video (MP4)**: Video re-encoding with captions burned directly into the video stream.

### AI Social Media Caption Generator
- Generates platform-tailored post copy:
  - **Instagram Reels**: Hook line, caption body, targeted hashtags, and call-to-action.
  - **TikTok**: High-energy trend hooks and viral hashtags.
  - **YouTube Shorts**: SEO-optimized short descriptions and engagement triggers.
- Multiple tone options: *Conversational*, *Educational*, *Hype*, *Professional*, *Cinematic*, *Inspirational*.
- Multilingual and Tanglish support.

---

## 🔒 Security & Resilience
- **Strict Content Security Policy & CORS** implemented across API services.
- **Graceful Degradation**: If FFmpeg or native GPU drivers are absent, the platform cleanly falls back to demo mode with clear diagnostics and download links in Settings.
- **Windows Application Control Compatibility**: Pure WebAssembly and pure Python fallback schemes ensure zero blocking by corporate security policies.
