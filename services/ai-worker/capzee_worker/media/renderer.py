"""
Video rendering module using FFmpeg to burn subtitles into video.
Generates styled ASS/SRT subtitles and encodes with libx264/aac.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Callable, Optional

from capzee_worker.config import config
from capzee_worker.schemas import RenderResult, Transcript


class VideoRenderError(Exception):
    def __init__(self, message: str, code: str = "RENDER_ERROR"):
        super().__init__(message)
        self.code = code


def _format_ass_time(seconds: float) -> str:
    """Format seconds as ASS timestamp: H:MM:SS.cc (centiseconds)"""
    total_cs = max(0, int(round(seconds * 100)))
    hours = total_cs // 360000
    minutes = (total_cs % 360000) // 6000
    secs = (total_cs % 6000) // 100
    cs = total_cs % 100
    return f"{hours}:{minutes:02d}:{secs:02d}.{cs:02d}"


def _hex_to_ass_color(hex_color: str, default: str = "&H00FFFFFF") -> str:
    """Convert #RRGGBB to ASS &HAABBGGRR format."""
    if not hex_color or not hex_color.startswith("#"):
        return default
    c = hex_color.lstrip("#")
    if len(c) == 6:
        r, g, b = c[0:2], c[2:4], c[4:6]
        return f"&H00{b}{g}{r}".upper()
    elif len(c) == 8:
        r, g, b, a = c[0:2], c[2:4], c[4:6], c[6:8]
        return f"&H{a}{b}{g}{r}".upper()
    return default


def generate_ass_subtitles(transcript: Transcript, style: dict) -> str:
    """
    Generate Advanced SubStation Alpha (.ass) subtitle file content
    with typography, outline, shadow, alignment, and word highlights.
    """
    font_name = style.get("fontFamily", "Inter")
    font_size = int(style.get("fontSize", 32))
    primary_color = _hex_to_ass_color(style.get("textColor", "#FFFFFF"), "&H00FFFFFF")
    highlight_color = _hex_to_ass_color(style.get("activeWordColor", "#FACC15"), "&H0015CAFA")
    outline_color = _hex_to_ass_color(style.get("outlineColor", "#000000"), "&H00000000")
    back_color = _hex_to_ass_color(style.get("backgroundColor", "#000000"), "&H80000000")
    outline_width = int(style.get("outlineWidth", 2))
    bold = -1 if style.get("fontWeight") in ("bold", "700", "800", "900") else 0

    # Alignment: 2 = bottom-center, 8 = top-center, 5 = middle-center
    pos_v = (style.get("position") or {}).get("vertical", "bottom")
    alignment = 2 if pos_v == "bottom" else (8 if pos_v == "top" else 5)
    margin_v = 40

    ass_content = [
        "[Script Info]",
        "ScriptType: v4.00+",
        "PlayResX: 1080",
        "PlayResY: 1920",
        "ScaledBorderAndShadow: yes",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, "
        "Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        f"Style: Default,{font_name},{font_size},{primary_color},{highlight_color},{outline_color},"
        f"{back_color},{bold},0,0,0,100,100,0,0,1,{outline_width},1,{alignment},20,20,{margin_v},1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]

    is_uppercase = bool(style.get("uppercase", False))

    for seg in transcript.segments:
        start_t = _format_ass_time(seg.start)
        end_t = _format_ass_time(seg.end)
        text = seg.text.replace("\n", "\\N").replace("{", "(").replace("}", ")")
        if is_uppercase:
            text = text.upper()

        # If words exist and word animation is requested, highlight active words
        words = getattr(seg, "words", None) or []
        anim_mode = style.get("animationMode", "phrase")

        if words and anim_mode in ("word-by-word", "karaoke"):
            # Emit dialogue per word or with highlight tags
            for w in words:
                w_start = _format_ass_time(w.start)
                w_end = _format_ass_time(w.end)
                w_text = w.text.upper() if is_uppercase else w.text
                ass_content.append(
                    f"Dialogue: 0,{w_start},{w_end},Default,,0,0,0,,{{\\c{highlight_color}&}}{w_text}"
                )
        else:
            ass_content.append(f"Dialogue: 0,{start_t},{end_t},Default,,0,0,0,,{text}")

    return "\n".join(ass_content)


def render_video(
    video_path: str,
    transcript: Transcript,
    style: dict,
    output_path: str,
    resolution: str = "original",
    on_progress: Optional[Callable[[int, str], None]] = None,
) -> RenderResult:
    """
    Burn subtitles into video using FFmpeg.
    """
    video = Path(video_path)
    if not video.exists():
        raise VideoRenderError(f"Video file not found: {video_path}", "FILE_NOT_FOUND")

    ffmpeg = config.ffmpeg_path or "ffmpeg"

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    if on_progress:
        on_progress(10, "generating_subtitles")

    # Generate ASS subtitle file
    tmp_dir = Path(config.temp_dir) if config.temp_dir else Path(tempfile.gettempdir())
    with tempfile.NamedTemporaryFile(suffix=".ass", dir=tmp_dir, delete=False, mode="w", encoding="utf-8") as sub_f:
        sub_path = sub_f.name
        sub_content = generate_ass_subtitles(transcript, style)
        sub_f.write(sub_content)

    # Subtitle path for ffmpeg filter (escaped for Windows paths)
    escaped_sub_path = sub_path.replace("\\", "/").replace(":", "\\:")

    # Build video filter chain
    vf_filters = []
    if resolution == "1080p":
        vf_filters.append("scale=1080:-2")
    elif resolution == "720p":
        vf_filters.append("scale=720:-2")
    vf_filters.append(f"subtitles='{escaped_sub_path}'")

    filter_complex = ",".join(vf_filters)

    cmd = [
        ffmpeg,
        "-y",
        "-i", str(video),
        "-vf", filter_complex,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", "192k",
        str(out),
    ]

    if on_progress:
        on_progress(30, "encoding_video")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600,
        )
    except (FileNotFoundError, PermissionError, OSError) as e:
        # Cleanup sub file
        try:
            os.remove(sub_path)
        except OSError:
            pass
        if "Application Control" in str(e) or isinstance(e, PermissionError):
            raise VideoRenderError(
                "FFmpeg execution was blocked by Windows Application Control or system policy. "
                "Ensure FFmpeg is installed in an approved directory (e.g. C:\\Program Files\\ffmpeg\\bin) "
                "or set CAPZEE_FFMPEG_PATH.",
                "FFMPEG_POLICY_BLOCKED",
            )
        raise VideoRenderError(
            "FFmpeg not found. Install FFmpeg and ensure it is on your PATH, "
            "or set CAPZEE_FFMPEG_PATH.",
            "FFMPEG_NOT_FOUND",
        )
    except subprocess.TimeoutExpired:
        try:
            os.remove(sub_path)
        except OSError:
            pass
        raise VideoRenderError("Video rendering timed out (>10min)", "RENDER_TIMEOUT")

    # Cleanup temp subtitle file
    try:
        os.remove(sub_path)
    except OSError:
        pass

    if result.returncode != 0:
        raise VideoRenderError(
            f"FFmpeg rendering failed (code {result.returncode}): {result.stderr[-400:]}",
            "RENDER_FAILED",
        )

    if not out.exists():
        raise VideoRenderError("Rendered video file was not created", "OUTPUT_NOT_FOUND")

    file_size = out.stat().st_size

    if on_progress:
        on_progress(100, "completed")

    return RenderResult(
        output_path=str(out.resolve()),
        file_size_bytes=file_size,
        duration_seconds=0.0,
    )
