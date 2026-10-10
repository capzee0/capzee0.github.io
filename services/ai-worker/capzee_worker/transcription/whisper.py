"""
Transcription module using faster-whisper.
Handles model loading, inference, and transcript building.
"""
from __future__ import annotations

import sys
import uuid
from pathlib import Path
from typing import Callable, Optional

from capzee_worker.config import config
from capzee_worker.schemas import Segment, Transcript, Word


class TranscriptionError(Exception):
    def __init__(self, message: str, code: str = "TRANSCRIPTION_ERROR"):
        super().__init__(message)
        self.code = code


def _load_faster_whisper():
    """Lazy import of faster-whisper to avoid import failure if not installed."""
    try:
        from faster_whisper import WhisperModel  # type: ignore
        return WhisperModel
    except ImportError:
        return None


def transcribe(
    audio_path: str,
    language: str = "auto",
    model_size: Optional[str] = None,
    device: Optional[str] = None,
    compute_type: Optional[str] = None,
    on_progress: Optional[Callable[[int, str], None]] = None,
) -> Transcript:
    """
    Transcribe audio using faster-whisper.

    Args:
        audio_path: Path to WAV/MP3/etc audio file.
        language: Language code (e.g. "en", "ta") or "auto" for detection.
        model_size: Whisper model variant (tiny, base, small, medium, large-v2, large-v3).
        device: "cpu", "cuda", or "auto".
        compute_type: "int8", "float32", "float16", etc.
        on_progress: Optional callback(progress_pct, stage).

    Returns:
        A validated Transcript object.
    """
    model_size = model_size or config.whisper_model
    device = device or config.whisper_device
    compute_type = compute_type or config.whisper_compute_type

    # Normalise device auto-detection
    if device == "auto":
        try:
            import torch  # type: ignore
            device = "cuda" if torch.cuda.is_available() else "cpu"
        except ImportError:
            device = "cpu"

    audio = Path(audio_path)
    if not audio.exists():
        raise TranscriptionError(f"Audio file not found: {audio_path}", "FILE_NOT_FOUND")

    if on_progress:
        on_progress(10, "loading_model")

    WhisperModel = _load_faster_whisper()
    if WhisperModel is None:
        raise TranscriptionError(
            "faster-whisper is not installed. "
            "Run: pip install faster-whisper\n"
            f"Note: faster-whisper officially supports Python 3.8–3.11. "
            f"You are running Python {sys.version}. "
            "Installation may require additional steps on newer Python versions.",
            "FASTER_WHISPER_NOT_INSTALLED",
        )

    try:
        model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
        )
    except Exception as e:
        raise TranscriptionError(
            f"Failed to load Whisper model '{model_size}': {e}",
            "MODEL_LOAD_ERROR",
        )

    if on_progress:
        on_progress(20, "transcribing")

    whisper_language = language if language != "auto" else None

    try:
        segments_iter, info = model.transcribe(
            str(audio),
            language=whisper_language,
            word_timestamps=True,
            beam_size=5,
            vad_filter=True,           # filter non-speech
            vad_parameters={"min_silence_duration_ms": 500},
        )
    except Exception as e:
        raise TranscriptionError(
            f"Transcription failed: {e}", "INFERENCE_ERROR"
        )

    detected_language = info.language or language or "unknown"

    segments: list[Segment] = []
    total_duration = info.duration or 1.0

    for raw_seg in segments_iter:
        words: list[Word] = []
        for w in (raw_seg.words or []):
            try:
                word = Word(
                    id=f"word-{uuid.uuid4().hex[:8]}",
                    text=w.word,
                    start=max(0.0, float(w.start)),
                    end=float(w.end),
                    confidence=float(w.probability) if w.probability is not None else None,
                )
                words.append(word)
            except Exception:
                pass  # Skip malformed words

        seg_start = max(0.0, float(raw_seg.start))
        seg_end = float(raw_seg.end)
        if seg_end <= seg_start:
            seg_end = seg_start + 0.1

        seg = Segment(
            id=f"seg-{uuid.uuid4().hex[:8]}",
            start=seg_start,
            end=seg_end,
            text=raw_seg.text.strip(),
            words=words,
        )
        segments.append(seg)

        if on_progress and total_duration > 0:
            pct = min(90, int(20 + (seg_end / total_duration) * 70))
            on_progress(pct, "transcribing")

    if on_progress:
        on_progress(95, "building_transcript")

    transcript = Transcript(
        schemaVersion=1,
        language=detected_language,
        segments=segments,
    )

    if on_progress:
        on_progress(100, "done")

    return transcript
