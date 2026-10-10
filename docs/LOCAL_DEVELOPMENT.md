# Capzee — Local Development Guide

This guide walks through configuring, running, and debugging the Capzee monorepo in **Local Mode** without requiring external cloud dependencies (such as Supabase or Redis).

---

## 1. Prerequisites

- **Node.js**: `v20.x` or `v22.x` (or newer)
- **npm**: `v9.x` or newer
- **Python**: `3.10`–`3.12` recommended (Python `3.14` supported with pure-Python fallback mode)
- **FFmpeg & FFprobe**: Version 6+ or 7+ installed and accessible via system PATH or configured path.

---

## 2. Directory & Architecture Overview

The repository is organized as an npm workspace monorepo:

| Path | Purpose | Tech Stack |
|---|---|---|
| `packages/contracts` | Shared TypeScript schemas, types, and subtitle generators | TypeScript, Zod |
| `apps/web` | Creator Studio Web Frontend | React 18, Vite 6, Tailwind CSS, Lucide |
| `apps/desktop` | Cross-platform Desktop Application | Electron 33, TypeScript |
| `services/api` | REST API Server & Job Coordinator | Express 4/5, TypeScript, Multer |
| `services/ai-worker` | Audio Extraction, Whisper Transcription & FFmpeg Video Renderer | Python, faster-whisper, ctranslate2, FFmpeg |

---

## 3. Environment Setup

1. Copy `.env.example` to `.env` in the root (and in `services/api` if running separately):
   ```bash
   cp .env.example .env
   ```

2. Key environment variables for local operation:
   ```ini
   CAPZEE_PROCESSING_MODE=local
   CAPZEE_WHISPER_MODEL=small
   CAPZEE_WHISPER_DEVICE=cpu
   CAPZEE_WHISPER_COMPUTE_TYPE=int8
   CAPZEE_LLM_PROVIDER=mock
   # Optional: set custom FFmpeg paths if not on standard PATH:
   # CAPZEE_FFMPEG_PATH=C:\Program Files\ffmpeg\bin\ffmpeg.exe
   # CAPZEE_FFPROBE_PATH=C:\Program Files\ffmpeg\bin\ffprobe.exe
   ```

---

## 4. Install Dependencies

```bash
# Install root & workspace npm packages
npm install

# Setup Python worker virtual environment
cd services/ai-worker
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
# source .venv/bin/activate
pip install -r requirements.txt
cd ../..
```

---

## 5. Building the Project

```bash
# Build contracts, web app, and API
npm run build
```

---

## 6. Running the Applications

### A. Run REST API Server (Port 4000)
```bash
cd services/api
npm run start
# Server listens on http://127.0.0.1:4000
# Health check: http://127.0.0.1:4000/health
```

### B. Run Web Creator Studio (Port 5173)
```bash
cd apps/web
npm run dev
# Studio opens on http://127.0.0.1:5173
```

### C. Run Electron Desktop App
```bash
cd apps/desktop
npm run dev
```

---

## 7. Running Automated Tests

```bash
# Shared contracts (11 tests)
node --experimental-strip-types --test packages/contracts/tests/contracts.test.ts

# API server endpoints & integration (20 tests)
node --experimental-strip-types --test services/api/tests/api.test.ts

# Web Studio utilities (10 tests)
node --experimental-strip-types --test apps/web/tests/utils.test.ts

# Python AI Worker & Subtitle Renderer (20 tests)
python -m pytest services/ai-worker/tests/
```
