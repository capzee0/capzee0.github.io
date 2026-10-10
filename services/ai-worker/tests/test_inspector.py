"""
Tests for media inspection error handling.
These mock subprocess calls so FFprobe is not required.
"""
import pytest
from unittest.mock import patch, MagicMock
from capzee_worker.media.inspector import inspect_media, MediaInspectionError


MOCK_FFPROBE_OUTPUT = {
    "streams": [
        {
            "codec_type": "video",
            "codec_name": "h264",
            "width": 1920,
            "height": 1080,
            "r_frame_rate": "30/1",
            "duration": "10.0",
        },
        {
            "codec_type": "audio",
            "codec_name": "aac",
        },
    ],
    "format": {
        "format_name": "mp4",
        "duration": "10.0",
        "size": "5000000",
    },
}


class TestMediaInspector:
    def test_file_not_found_raises(self):
        with pytest.raises(MediaInspectionError) as exc_info:
            inspect_media("/nonexistent/video.mp4")
        assert exc_info.value.code == "FILE_NOT_FOUND"

    def test_valid_video_returns_media_info(self, tmp_path):
        # Create a dummy file so the path check passes
        video = tmp_path / "test.mp4"
        video.write_bytes(b"dummy")

        import json
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = json.dumps(MOCK_FFPROBE_OUTPUT)

        with patch("subprocess.run", return_value=mock_result):
            info = inspect_media(str(video))

        assert info.duration_seconds == 10.0
        assert info.width == 1920
        assert info.height == 1080
        assert info.frame_rate == 30.0
        assert info.has_audio is True
        assert info.video_codec == "h264"
        assert info.audio_codec == "aac"

    def test_no_video_stream_raises(self, tmp_path):
        video = tmp_path / "audio_only.mp3"
        video.write_bytes(b"dummy")

        import json
        no_video = {"streams": [{"codec_type": "audio", "codec_name": "mp3"}], "format": {}}
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = json.dumps(no_video)

        with patch("subprocess.run", return_value=mock_result):
            with pytest.raises(MediaInspectionError) as exc_info:
                inspect_media(str(video))
        assert exc_info.value.code == "NO_VIDEO_STREAM"

    def test_ffprobe_not_found_raises(self, tmp_path):
        video = tmp_path / "test.mp4"
        video.write_bytes(b"dummy")

        with patch("subprocess.run", side_effect=FileNotFoundError):
            with pytest.raises(MediaInspectionError) as exc_info:
                inspect_media(str(video))
        assert exc_info.value.code == "FFPROBE_NOT_FOUND"

    def test_ffprobe_nonzero_exit_raises(self, tmp_path):
        video = tmp_path / "corrupt.mp4"
        video.write_bytes(b"not a video")

        mock_result = MagicMock()
        mock_result.returncode = 1
        mock_result.stderr = "Invalid data found when processing input"

        with patch("subprocess.run", return_value=mock_result):
            with pytest.raises(MediaInspectionError) as exc_info:
                inspect_media(str(video))
        assert exc_info.value.code == "FFPROBE_ERROR"
