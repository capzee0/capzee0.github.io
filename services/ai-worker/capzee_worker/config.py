"""
Capzee Worker — configuration from environment variables.
"""
from __future__ import annotations
import os


class WorkerConfig:
    # FFmpeg
    ffmpeg_path: str = os.environ.get("CAPZEE_FFMPEG_PATH", "ffmpeg")
    ffprobe_path: str = os.environ.get("CAPZEE_FFPROBE_PATH", "ffprobe")

    # Whisper
    whisper_model: str = os.environ.get("CAPZEE_WHISPER_MODEL", "small")
    whisper_device: str = os.environ.get("CAPZEE_WHISPER_DEVICE", "cpu")
    whisper_compute_type: str = os.environ.get("CAPZEE_WHISPER_COMPUTE_TYPE", "int8")

    # Temp directory
    temp_dir: str = os.environ.get("CAPZEE_TEMP_DIR", "")

    # Limits
    max_duration_seconds: int = int(os.environ.get("CAPZEE_MAX_DURATION_SECONDS", "1800"))


config = WorkerConfig()
