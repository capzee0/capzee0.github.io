# Capzee — Known Limitations and System Constraints

This document catalogs technical limitations, security policies, and known edge cases in the current Capzee implementation.

---

## 1. Windows Application Control / AppLocker Policy Constraints (Severity: Medium)

### Symptoms
When FFmpeg binaries or compiled C/Rust Python extensions (`.pyd`, `.exe`) reside inside user application folders (such as `C:\Users\<user>\AppData\Local\...`), Windows Defender Application Control (WDAC) or AppLocker blocks execution with:
```
An Application Control policy has blocked this file.
```

### Handled Mitigations
1. **Rollup / Vite Native DLLs**: Replaced `@rollup/rollup-win32-x64-msvc` native DLL dependency with pure WebAssembly `@rollup/wasm-node`. This eliminated AppLocker build blocks and enabled Vite to bundle and run locally.
2. **Pydantic Extension Block**: Python 3.14 blocked `_pydantic_core.pyd`. Implemented pure-Python fallback classes in `services/ai-worker/capzee_worker/schemas/__init__.py` to maintain exact type validation without requiring native compilation.
3. **Actionable Error Codes for FFmpeg**: `inspector.py`, `extractor.py`, and `renderer.py` detect `PermissionError` and error code `4551` to raise explicit, actionable error codes:
   - `FFPROBE_POLICY_BLOCKED`
   - `FFMPEG_POLICY_BLOCKED`
4. **Permanent Workaround for Users**: Install FFmpeg into a trusted administrator-approved system path such as `C:\Program Files\ffmpeg\bin\` and set:
   ```ini
   CAPZEE_FFMPEG_PATH=C:\Program Files\ffmpeg\bin\ffmpeg.exe
   CAPZEE_FFPROBE_PATH=C:\Program Files\ffmpeg\bin\ffprobe.exe
   ```

---

## 2. In-Memory Local Store in Local Mode (Severity: Low)

In default local mode (`CAPZEE_PROCESSING_MODE=local`), projects and job states are stored in-memory in `services/api/src/db/local-store.ts`.
- **Limitation**: Restarting the API server clears the project metadata list from RAM (uploaded files in `uploads/` and rendered exports in `exports/` remain safely on disk).
- **Production Mode**: In cloud mode, `CAPZEE_PROCESSING_MODE=cloud` connects to PostgreSQL via Supabase migrations for persistent relational storage.

---

## 3. Large Whisper Model Memory Requirements (Severity: Low)

- Running `large-v2` or `large-v3` on CPU requires 4 GB–6 GB of RAM and is slower than running on CUDA GPUs.
- **Recommendation**: For local development on CPU, use `small` (244 MB model, fast int8 inference) or `base` (74 MB model).

---

## 4. Single-Process Concurrency in Local Mode (Severity: Low)

- Local transcription and video rendering spawn background child processes (`transcribe_cli.py`, `render_cli.py`).
- Concurrency is throttled to 1 simultaneous render by default (`CAPZEE_WORKER_CONCURRENCY=1`) to prevent CPU saturation during high-definition video encoding.
