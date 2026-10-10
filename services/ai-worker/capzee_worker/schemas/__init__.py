"""
Capzee Worker — Pydantic schemas for transcript, media info, and job contracts.
These mirror the TypeScript contracts in packages/contracts/src/index.ts.
Includes pure-Python fallback when Pydantic or its compiled C/Rust extensions
are unavailable or blocked by system security policies on Python 3.14.
"""
from __future__ import annotations

import json
from typing import Optional, Any
from enum import Enum

_HAS_PYDANTIC = False
try:
    from pydantic import BaseModel as _PydanticBaseModel, field_validator, model_validator
    _HAS_PYDANTIC = True
except Exception:
    _HAS_PYDANTIC = False

if _HAS_PYDANTIC:
    class Word(_PydanticBaseModel):
        id: str
        text: str
        start: float
        end: float
        confidence: Optional[float] = None

        @field_validator("start", "end")
        @classmethod
        def must_be_nonnegative(cls, v: float) -> float:
            if v < 0:
                raise ValueError("Timestamps must be non-negative")
            return v

        @model_validator(mode="after")
        def end_must_be_after_start(self) -> "Word":
            if self.end <= self.start:
                raise ValueError(f"Word end ({self.end}) must be > start ({self.start})")
            return self

    class Segment(_PydanticBaseModel):
        id: str
        start: float
        end: float
        text: str
        words: list[Word] = []

        @model_validator(mode="after")
        def end_must_be_after_start(self) -> "Segment":
            if self.end <= self.start:
                raise ValueError(f"Segment end ({self.end}) must be > start ({self.start})")
            return self

    class Transcript(_PydanticBaseModel):
        schemaVersion: int = 1
        language: str
        segments: list[Segment]

    class MediaInfo(_PydanticBaseModel):
        duration_seconds: float
        width: int
        height: int
        frame_rate: float
        video_codec: str
        audio_codec: Optional[str]
        has_audio: bool
        size_bytes: int
        format: str

    class TranscribeRequest(_PydanticBaseModel):
        video_path: str
        language: str = "auto"
        model: str = "small"
        device: str = "cpu"
        compute_type: str = "int8"
        job_id: Optional[str] = None

    class TranscribeResult(_PydanticBaseModel):
        transcript: Transcript
        media_info: MediaInfo
        job_id: Optional[str] = None

    class RenderRequest(_PydanticBaseModel):
        video_path: str
        transcript: Transcript
        style_json: dict
        output_path: str
        resolution: str = "original"
        job_id: Optional[str] = None

    class RenderResult(_PydanticBaseModel):
        output_path: str
        file_size_bytes: int
        duration_seconds: float
        job_id: Optional[str] = None

else:
    class _PureBaseModel:
        def model_dump(self) -> dict[str, Any]:
            def _dump(val: Any) -> Any:
                if isinstance(val, _PureBaseModel):
                    return val.model_dump()
                elif isinstance(val, list):
                    return [_dump(item) for item in val]
                elif isinstance(val, dict):
                    return {k: _dump(v) for k, v in val.items()}
                elif isinstance(val, Enum):
                    return val.value
                return val
            return {k: _dump(v) for k, v in self.__dict__.items() if not k.startswith("_")}

        def model_dump_json(self) -> str:
            return json.dumps(self.model_dump())

        def dict(self) -> dict[str, Any]:
            return self.model_dump()

    class Word(_PureBaseModel):
        def __init__(
            self,
            id: str,
            text: str,
            start: float,
            end: float,
            confidence: Optional[float] = None,
            **kwargs: Any
        ):
            if start < 0 or end < 0:
                raise ValueError("Timestamps must be non-negative")
            if end <= start:
                raise ValueError(f"Word end ({end}) must be > start ({start})")
            self.id = str(id)
            self.text = str(text)
            self.start = float(start)
            self.end = float(end)
            self.confidence = float(confidence) if confidence is not None else None

        def __repr__(self) -> str:
            return f"Word(id={self.id!r}, text={self.text!r}, start={self.start}, end={self.end})"

    class Segment(_PureBaseModel):
        def __init__(
            self,
            id: str,
            start: float,
            end: float,
            text: str,
            words: Optional[list[Any]] = None,
            **kwargs: Any
        ):
            if end <= start:
                raise ValueError(f"Segment end ({end}) must be > start ({start})")
            self.id = str(id)
            self.start = float(start)
            self.end = float(end)
            self.text = str(text)
            parsed_words: list[Word] = []
            if words:
                for w in words:
                    if isinstance(w, Word):
                        parsed_words.append(w)
                    elif isinstance(w, dict):
                        parsed_words.append(Word(**w))
            self.words = parsed_words

        def __repr__(self) -> str:
            return f"Segment(id={self.id!r}, start={self.start}, end={self.end}, text={self.text!r})"

    class Transcript(_PureBaseModel):
        def __init__(
            self,
            schemaVersion: int = 1,
            language: str = "en",
            segments: Optional[list[Any]] = None,
            **kwargs: Any
        ):
            self.schemaVersion = int(schemaVersion)
            self.language = str(language)
            parsed_segments: list[Segment] = []
            if segments:
                for s in segments:
                    if isinstance(s, Segment):
                        parsed_segments.append(s)
                    elif isinstance(s, dict):
                        parsed_segments.append(Segment(**s))
            self.segments = parsed_segments

        def __repr__(self) -> str:
            return f"Transcript(schemaVersion={self.schemaVersion}, language={self.language!r}, segments={len(self.segments)} items)"

    class MediaInfo(_PureBaseModel):
        def __init__(
            self,
            duration_seconds: float,
            width: int,
            height: int,
            frame_rate: float,
            video_codec: str,
            audio_codec: Optional[str] = None,
            has_audio: bool = True,
            size_bytes: int = 0,
            format: str = "mp4",
            **kwargs: Any
        ):
            self.duration_seconds = float(duration_seconds)
            self.width = int(width)
            self.height = int(height)
            self.frame_rate = float(frame_rate)
            self.video_codec = str(video_codec)
            self.audio_codec = str(audio_codec) if audio_codec else None
            self.has_audio = bool(has_audio)
            self.size_bytes = int(size_bytes)
            self.format = str(format)

    class TranscribeRequest(_PureBaseModel):
        def __init__(
            self,
            video_path: str,
            language: str = "auto",
            model: str = "small",
            device: str = "cpu",
            compute_type: str = "int8",
            job_id: Optional[str] = None,
            **kwargs: Any
        ):
            self.video_path = video_path
            self.language = language
            self.model = model
            self.device = device
            self.compute_type = compute_type
            self.job_id = job_id

    class TranscribeResult(_PureBaseModel):
        def __init__(
            self,
            transcript: Transcript,
            media_info: MediaInfo,
            job_id: Optional[str] = None,
            **kwargs: Any
        ):
            self.transcript = transcript
            self.media_info = media_info
            self.job_id = job_id

    class RenderRequest(_PureBaseModel):
        def __init__(
            self,
            video_path: str,
            transcript: Transcript,
            style_json: dict,
            output_path: str,
            resolution: str = "original",
            job_id: Optional[str] = None,
            **kwargs: Any
        ):
            self.video_path = video_path
            self.transcript = transcript
            self.style_json = style_json
            self.output_path = output_path
            self.resolution = resolution
            self.job_id = job_id

    class RenderResult(_PureBaseModel):
        def __init__(
            self,
            output_path: str,
            file_size_bytes: int,
            duration_seconds: float,
            job_id: Optional[str] = None,
            **kwargs: Any
        ):
            self.output_path = output_path
            self.file_size_bytes = int(file_size_bytes)
            self.duration_seconds = float(duration_seconds)
            self.job_id = job_id


class JobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
