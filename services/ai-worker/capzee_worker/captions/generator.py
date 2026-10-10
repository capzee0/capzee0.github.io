"""
SRT and VTT caption file generation from Transcript objects.
"""
from __future__ import annotations

import math
import re
import textwrap
from capzee_worker.schemas import Segment, Transcript


def _format_srt_time(seconds: float) -> str:
    """Format seconds as SRT timestamp: HH:MM:SS,mmm"""
    total_ms = int(round(seconds * 1000))
    hours, remainder = divmod(total_ms, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, ms = divmod(remainder, 1_000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{ms:03d}"


def _format_vtt_time(seconds: float) -> str:
    """Format seconds as VTT timestamp: HH:MM:SS.mmm"""
    total_ms = int(round(seconds * 1000))
    hours, remainder = divmod(total_ms, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, ms = divmod(remainder, 1_000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{ms:03d}"


def _wrap_text(text: str, max_chars: int = 42, max_lines: int = 2) -> str:
    """Wrap text to max_chars per line, capped at max_lines lines."""
    lines = textwrap.wrap(text, width=max_chars)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1].rstrip(".…") + "…"
    return "\n".join(lines)


def _escape_srt(text: str) -> str:
    """Escape SRT special characters (minimal)."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _escape_vtt(text: str) -> str:
    """Escape VTT special characters."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def generate_srt(
    transcript: Transcript,
    max_chars_per_line: int = 42,
    max_lines: int = 2,
) -> str:
    """Generate a valid SRT subtitle file from a Transcript."""
    lines: list[str] = []
    index = 1

    for seg in transcript.segments:
        text = _wrap_text(_escape_srt(seg.text), max_chars_per_line, max_lines)
        if not text.strip():
            continue

        lines.append(str(index))
        lines.append(f"{_format_srt_time(seg.start)} --> {_format_srt_time(seg.end)}")
        lines.append(text)
        lines.append("")  # blank line separator
        index += 1

    return "\n".join(lines)


def generate_vtt(
    transcript: Transcript,
    max_chars_per_line: int = 42,
    max_lines: int = 2,
) -> str:
    """Generate a valid WebVTT subtitle file from a Transcript."""
    lines: list[str] = ["WEBVTT", ""]

    for i, seg in enumerate(transcript.segments, 1):
        text = _wrap_text(_escape_vtt(seg.text), max_chars_per_line, max_lines)
        if not text.strip():
            continue

        lines.append(f"cue-{i}")
        lines.append(f"{_format_vtt_time(seg.start)} --> {_format_vtt_time(seg.end)}")
        lines.append(text)
        lines.append("")

    return "\n".join(lines)
