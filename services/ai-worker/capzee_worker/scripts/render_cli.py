"""
CLI entry point for video rendering jobs.
Burns styled subtitles into video using FFmpeg.

Usage:
    python render_cli.py --video /path/to/video.mp4 \
        --transcript /path/to/transcript.json \
        --style '{"fontSize": 36}' \
        --output /path/to/output.mp4 \
        --job-id job_123
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

# Add the worker package root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from capzee_worker.media.renderer import render_video, VideoRenderError
from capzee_worker.schemas import Transcript, CaptionStyle


def main() -> None:
    parser = argparse.ArgumentParser(description="Capzee video rendering worker")
    parser.add_argument("--video", required=True, help="Path to input video file")
    parser.add_argument("--transcript", required=True, help="Path to transcript JSON file or JSON string")
    parser.add_argument("--style", default="{}", help="Style configuration as JSON string or file path")
    parser.add_argument("--output", required=True, help="Path for rendered output video")
    parser.add_argument("--resolution", default="original", help="Output resolution (original, 1080p, 720p)")
    parser.add_argument("--job-id", default=None, help="Job ID for tracking")
    args = parser.parse_args()

    def emit_progress(pct: int, stage: str) -> None:
        print(json.dumps({"type": "progress", "progress": pct, "stage": stage}), file=sys.stderr)

    try:
        # Load transcript
        transcript_path = Path(args.transcript)
        if transcript_path.exists() and transcript_path.is_file():
            with open(transcript_path, "r", encoding="utf-8") as f:
                raw_transcript = json.load(f)
        else:
            raw_transcript = json.loads(args.transcript)

        transcript = Transcript.model_validate(raw_transcript)

        # Load style
        style_path = Path(args.style)
        if style_path.exists() and style_path.is_file():
            with open(style_path, "r", encoding="utf-8") as f:
                style_dict = json.load(f)
        else:
            try:
                style_dict = json.loads(args.style)
            except json.JSONDecodeError:
                style_dict = {}

        # Render video
        result = render_video(
            video_path=args.video,
            transcript=transcript,
            style=style_dict,
            output_path=args.output,
            resolution=args.resolution,
            on_progress=emit_progress,
        )

        response = {
            "success": True,
            "job_id": args.job_id,
            "result": result.model_dump(),
        }
        print(json.dumps(response))

    except VideoRenderError as e:
        emit_error(str(e), e.code)
    except Exception as e:
        emit_error(f"Render failed: {e}", "UNEXPECTED_RENDER_ERROR")


def emit_error(message: str, code: str) -> None:
    result = {"success": False, "error": {"code": code, "message": message}}
    print(json.dumps(result))
    sys.exit(1)


if __name__ == "__main__":
    main()
