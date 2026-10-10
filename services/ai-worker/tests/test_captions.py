"""
Tests for the caption generator (SRT and VTT output).
These tests run without FFmpeg or Whisper.
"""
import pytest
from capzee_worker.schemas import Transcript, Segment, Word
from capzee_worker.captions.generator import generate_srt, generate_vtt


def make_transcript(segments_data: list[dict]) -> Transcript:
    segments = []
    for i, sd in enumerate(segments_data):
        words = [
            Word(
                id=f"w-{i}-{j}",
                text=w["text"],
                start=w["start"],
                end=w["end"],
            )
            for j, w in enumerate(sd.get("words", []))
        ]
        segments.append(
            Segment(
                id=f"seg-{i}",
                start=sd["start"],
                end=sd["end"],
                text=sd["text"],
                words=words,
            )
        )
    return Transcript(schemaVersion=1, language="en", segments=segments)


class TestSRTGeneration:
    def test_basic_srt(self):
        t = make_transcript([
            {"start": 0.5, "end": 2.0, "text": "Hello world"},
            {"start": 2.5, "end": 4.0, "text": "Goodbye world"},
        ])
        srt = generate_srt(t)
        assert "1\n" in srt
        assert "2\n" in srt
        assert "Hello world" in srt
        assert "00:00:00,500 --> 00:00:02,000" in srt

    def test_empty_transcript(self):
        t = Transcript(schemaVersion=1, language="en", segments=[])
        srt = generate_srt(t)
        assert srt.strip() == ""

    def test_srt_escapes_html(self):
        t = make_transcript([
            {"start": 0.5, "end": 2.0, "text": "<b>Bold & italic</b>"},
        ])
        srt = generate_srt(t)
        assert "<b>" not in srt
        assert "&lt;b&gt;" in srt
        assert "&amp;" in srt

    def test_long_text_wraps(self):
        long_text = "This is a very long sentence that should be wrapped across multiple lines for readability"
        t = make_transcript([{"start": 0.0, "end": 5.0, "text": long_text}])
        srt = generate_srt(t, max_chars_per_line=42)
        lines = [line for line in srt.split("\n") if line and not "-->" in line and not line.isdigit()]
        # Should have multiple lines (wrapped)
        assert len(lines) >= 2

    def test_unicode_tamil(self):
        t = make_transcript([
            {"start": 0.0, "end": 2.0, "text": "வணக்கம் நண்பர்களே"},
        ])
        srt = generate_srt(t)
        assert "வணக்கம்" in srt


class TestVTTGeneration:
    def test_basic_vtt(self):
        t = make_transcript([
            {"start": 1.0, "end": 3.0, "text": "Hello"},
        ])
        vtt = generate_vtt(t)
        assert vtt.startswith("WEBVTT")
        assert "00:00:01.000 --> 00:00:03.000" in vtt
        assert "Hello" in vtt

    def test_empty_transcript(self):
        t = Transcript(schemaVersion=1, language="ta", segments=[])
        vtt = generate_vtt(t)
        assert vtt.startswith("WEBVTT")

    def test_vtt_escapes(self):
        t = make_transcript([
            {"start": 0.0, "end": 1.0, "text": "A & B"},
        ])
        vtt = generate_vtt(t)
        assert "&amp;" in vtt


class TestSchemaValidation:
    def test_segment_end_before_start_raises(self):
        with pytest.raises(Exception):
            Segment(id="s1", start=5.0, end=2.0, text="Bad")

    def test_word_end_before_start_raises(self):
        with pytest.raises(Exception):
            Word(id="w1", text="bad", start=3.0, end=1.0)

    def test_negative_start_raises(self):
        with pytest.raises(Exception):
            Word(id="w1", text="bad", start=-1.0, end=1.0)

    def test_valid_segment(self):
        seg = Segment(id="s1", start=0.5, end=2.0, text="Valid")
        assert seg.start == 0.5
        assert seg.end == 2.0
