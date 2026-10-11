"""
CLI entry point for transcription jobs.
Called by the Node.js API server to process local videos.

Usage:
    python transcribe_cli.py --video /path/to/video.mp4 \
        --language auto --model small --device cpu --job-id abc123
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from pathlib import Path

# Add the worker package root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from capzee_worker.media.inspector import inspect_media, MediaInspectionError
from capzee_worker.media.extractor import extract_audio, AudioExtractionError
from capzee_worker.transcription.whisper import transcribe, TranscriptionError


def main() -> None:
    parser = argparse.ArgumentParser(description="Capzee transcription worker")
    parser.add_argument("--video", required=True, help="Path to input video file")
    parser.add_argument("--language", default="auto", help="Language code or 'auto'")
    parser.add_argument("--model", default="small", help="Whisper model size")
    parser.add_argument("--task", default="transcribe", choices=["transcribe", "translate"], help="Whisper task")
    parser.add_argument("--device", default="cpu", help="cpu, cuda, or auto")
    parser.add_argument("--compute-type", default="int8", help="Compute type")
    parser.add_argument("--job-id", default=None, help="Optional job ID for tracking")
    args = parser.parse_args()

    def emit_progress(pct: int, stage: str) -> None:
        """Write progress updates to stderr so stdout stays clean for JSON output."""
        print(json.dumps({"type": "progress", "progress": pct, "stage": stage}), file=sys.stderr)

    audio_path: str | None = None

    try:
        # Step 1: Inspect media
        emit_progress(5, "inspecting_media")
        media_info = inspect_media(args.video)

        if not media_info.has_audio:
            emit_error("Video has no audio stream. Cannot transcribe.", "NO_AUDIO_STREAM")
            return

        # Step 2: Extract audio
        emit_progress(15, "extracting_audio")
        audio_path = extract_audio(args.video)

        # Step 3: Transcribe
        def on_transcription_progress(pct: int, stage: str) -> None:
            emit_progress(pct, stage)

        transcript = transcribe(
            audio_path=audio_path,
            language=args.language,
            task=args.task,
            model_size=args.model,
            device=args.device,
            compute_type=args.compute_type,
            on_progress=on_transcription_progress,
        )

        # Step 4: Output result as JSON to stdout
        result = {
            "success": True,
            "job_id": args.job_id,
            "transcript": transcript.model_dump(),
            "media_info": media_info.model_dump(),
        }
        print(json.dumps(result))

    except MediaInspectionError as e:
        emit_error(str(e), e.code)
    except AudioExtractionError as e:
        emit_error(str(e), e.code)
    except TranscriptionError as e:
        emit_error(str(e), e.code)
    except Exception as e:
        emit_error(f"Unexpected error: {e}", "UNKNOWN_ERROR")
    finally:
        # Clean up temp audio file
        if audio_path and os.path.exists(audio_path):
            try:
                os.unlink(audio_path)
            except OSError:
                pass


def emit_error(message: str, code: str) -> None:
    result = {"success": False, "error": {"code": code, "message": message}}
    print(json.dumps(result))
    sys.exit(1)


if __name__ == "__main__":
    main()
