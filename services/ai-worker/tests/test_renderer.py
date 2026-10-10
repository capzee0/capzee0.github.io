from __future__ import annotations

import pytest
from capzee_worker.media.renderer import generate_ass_subtitles, _format_ass_time, _hex_to_ass_color
from capzee_worker.schemas import Transcript, Segment, Word


def test_format_ass_time():
    assert _format_ass_time(0.0) == "0:00:00.00"
    assert _format_ass_time(1.234) == "0:00:01.23"
    assert _format_ass_time(65.5) == "0:01:05.50"
    assert _format_ass_time(3661.05) == "1:01:01.05"


def test_hex_to_ass_color():
    # #RRGGBB -> &H00BBGGRR
    assert _hex_to_ass_color("#FFFFFF") == "&H00FFFFFF"
    assert _hex_to_ass_color("#FF0000") == "&H000000FF"
    assert _hex_to_ass_color("#00FF00") == "&H0000FF00"


def test_generate_ass_subtitles():
    transcript = Transcript(
        text="Hello world test",
        segments=[
            Segment(
                id="seg-1",
                start=0.0,
                end=2.0,
                text="Hello world test",
                words=[
                    Word(id="w-1", text="Hello", start=0.0, end=0.5, confidence=0.9),
                    Word(id="w-2", text="world", start=0.5, end=1.0, confidence=0.9),
                    Word(id="w-3", text="test", start=1.0, end=2.0, confidence=0.9),
                ]
            )
        ],
        language="en",
    )
    style = {
        "fontFamily": "Montserrat",
        "fontSize": 40,
        "textColor": "#FFFFFF",
        "activeWordColor": "#FACC15",
        "outlineWidth": 3,
        "animationMode": "phrase",
    }
    ass_text = generate_ass_subtitles(transcript, style)
    assert "[Script Info]" in ass_text
    assert "[V4+ Styles]" in ass_text
    assert "Montserrat" in ass_text
    assert "Hello world test" in ass_text
    assert "Dialogue: 0,0:00:00.00,0:00:02.00,Default" in ass_text
