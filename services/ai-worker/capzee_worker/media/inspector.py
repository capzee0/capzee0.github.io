"""
Media inspection using FFprobe.
Validates video files and extracts media metadata.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Optional

from capzee_worker.config import config
from capzee_worker.schemas import MediaInfo


class MediaInspectionError(Exception):
    """Raised when media cannot be inspected or fails validation."""

    def __init__(self, message: str, code: str = "MEDIA_ERROR"):
        super().__init__(message)
        self.code = code


def inspect_media(video_path: str) -> MediaInfo:
    """
    Run FFprobe on the given video file and return a MediaInfo object.

    Raises MediaInspectionError on any failure.
    """
    path = Path(video_path)
    if not path.exists():
        raise MediaInspectionError(f"File not found: {video_path}", "FILE_NOT_FOUND")
    if not path.is_file():
        raise MediaInspectionError(f"Path is not a file: {video_path}", "NOT_A_FILE")

    ffprobe = config.ffprobe_path or "ffprobe"

    cmd = [
        ffprobe,
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        str(path),
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30,
        )
    except FileNotFoundError:
        raise MediaInspectionError(
            "ffprobe not found. Install FFmpeg and ensure it is on your PATH, "
            "or set CAPZEE_FFPROBE_PATH.",
            "FFPROBE_NOT_FOUND",
        )
    except (PermissionError, OSError) as e:
        if "policy" in str(e).lower() or getattr(e, "winerror", None) == 4551:
            raise MediaInspectionError(
                "FFprobe execution was blocked by Windows Application Control or system policy. "
                "Move FFmpeg to an allowed directory (e.g. C:\\Program Files\\ffmpeg\\bin) or update policy.",
                "FFPROBE_POLICY_BLOCKED",
            )
        raise MediaInspectionError(f"Failed to execute ffprobe: {e}", "FFPROBE_EXEC_ERROR")
    except subprocess.TimeoutExpired:
        raise MediaInspectionError("ffprobe timed out", "FFPROBE_TIMEOUT")

    if result.returncode != 0:
        err = result.stderr.strip()
        if "policy" in err.lower() or "blocked" in err.lower():
            raise MediaInspectionError(
                "FFprobe execution was blocked by system policy.", "FFPROBE_POLICY_BLOCKED"
            )
        raise MediaInspectionError(
            f"ffprobe failed: {err}", "FFPROBE_ERROR"
        )

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError as e:
        raise MediaInspectionError(f"Failed to parse ffprobe output: {e}", "PARSE_ERROR")

    return _parse_ffprobe_output(data, path)


def _parse_ffprobe_output(data: dict, path: Path) -> MediaInfo:
    streams = data.get("streams", [])
    fmt = data.get("format", {})

    video_stream: Optional[dict] = None
    audio_stream: Optional[dict] = None

    for stream in streams:
        codec_type = stream.get("codec_type", "")
        if codec_type == "video" and video_stream is None:
            video_stream = stream
        elif codec_type == "audio" and audio_stream is None:
            audio_stream = stream

    if video_stream is None:
        raise MediaInspectionError(
            "No video stream found in file.", "NO_VIDEO_STREAM"
        )

    # Duration: prefer format duration, fallback to stream duration
    duration_str = fmt.get("duration") or video_stream.get("duration", "0")
    try:
        duration = float(duration_str)
    except (ValueError, TypeError):
        duration = 0.0

    if duration <= 0:
        raise MediaInspectionError("Video duration is zero or unknown.", "ZERO_DURATION")

    if duration > config.max_duration_seconds:
        raise MediaInspectionError(
            f"Video duration ({duration:.0f}s) exceeds the allowed maximum "
            f"({config.max_duration_seconds}s).",
            "DURATION_EXCEEDED",
        )

    # Frame rate
    r_frame_rate = video_stream.get("r_frame_rate", "0/1")
    try:
        num, den = map(int, r_frame_rate.split("/"))
        frame_rate = num / den if den != 0 else 0.0
    except (ValueError, ZeroDivisionError):
        frame_rate = 0.0

    size_bytes = int(fmt.get("size", 0))
    file_format = fmt.get("format_name", "unknown")

    return MediaInfo(
        duration_seconds=duration,
        width=int(video_stream.get("width", 0)),
        height=int(video_stream.get("height", 0)),
        frame_rate=frame_rate,
        video_codec=video_stream.get("codec_name", "unknown"),
        audio_codec=audio_stream.get("codec_name") if audio_stream else None,
        has_audio=audio_stream is not None,
        size_bytes=size_bytes,
        format=file_format,
    )
