"""
Audio extraction using FFmpeg.
Extracts audio to WAV format for Whisper processing.
"""
from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

from capzee_worker.config import config


class AudioExtractionError(Exception):
    def __init__(self, message: str, code: str = "AUDIO_ERROR"):
        super().__init__(message)
        self.code = code


def extract_audio(
    video_path: str,
    temp_dir: str | None = None,
    sample_rate: int = 16000,
    channels: int = 1,
) -> str:
    """
    Extract audio from a video file to a WAV file compatible with Whisper.

    Returns the path to the temporary WAV file.
    The caller is responsible for deleting the file when done.
    """
    video = Path(video_path)
    if not video.exists():
        raise AudioExtractionError(f"Video file not found: {video_path}", "FILE_NOT_FOUND")

    ffmpeg = config.ffmpeg_path or "ffmpeg"

    # Create a temp file in the specified directory or system default
    tmp_dir = temp_dir or config.temp_dir or None
    suffix = ".wav"
    with tempfile.NamedTemporaryFile(
        suffix=suffix, dir=tmp_dir, delete=False
    ) as tmp_f:
        out_path = tmp_f.name

    cmd = [
        ffmpeg,
        "-y",                           # overwrite output
        "-i", str(video),               # input file
        "-vn",                          # no video
        "-acodec", "pcm_s16le",         # PCM 16-bit little-endian
        "-ar", str(sample_rate),        # sample rate
        "-ac", str(channels),           # channels (mono)
        out_path,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
        )
    except FileNotFoundError:
        raise AudioExtractionError(
            "ffmpeg not found. Install FFmpeg and ensure it is on your PATH, "
            "or set CAPZEE_FFMPEG_PATH.",
            "FFMPEG_NOT_FOUND",
        )
    except (PermissionError, OSError) as e:
        if "policy" in str(e).lower() or getattr(e, "winerror", None) == 4551:
            raise AudioExtractionError(
                "FFmpeg execution was blocked by Windows Application Control or system policy. "
                "Move FFmpeg to an allowed directory (e.g. C:\\Program Files\\ffmpeg\\bin) or update policy.",
                "FFMPEG_POLICY_BLOCKED",
            )
        raise AudioExtractionError(f"Failed to execute ffmpeg: {e}", "FFMPEG_EXEC_ERROR")
    except subprocess.TimeoutExpired:
        raise AudioExtractionError("Audio extraction timed out (>5min)", "TIMEOUT")

    if result.returncode != 0:
        # Check if it's a no-audio-stream error
        if "does not contain any stream" in result.stderr or \
           "Output file does not contain any stream" in result.stderr:
            raise AudioExtractionError(
                "Video contains no audio stream.", "NO_AUDIO_STREAM"
            )
        raise AudioExtractionError(
            f"ffmpeg failed (code {result.returncode}): {result.stderr[-300:]}",
            "FFMPEG_ERROR",
        )

    out = Path(out_path)
    if not out.exists() or out.stat().st_size == 0:
        raise AudioExtractionError(
            "Audio extraction produced an empty file.", "EMPTY_OUTPUT"
        )

    return out_path
