import { useState, useRef, useEffect, useCallback } from 'react';
import type { Transcript, Segment } from '@capzee/contracts';

interface UseVideoPlaybackProps {
  transcript: Transcript | null;
  videoSrc: string | null;
}

export function useVideoPlayback({ transcript, videoSrc }: UseVideoPlaybackProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeSegment, setActiveSegment] = useState<Segment | null>(null);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);
  const [playbackRate, setPlaybackRateState] = useState<number>(1.0);
  const [volume, setVolumeState] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Play / Pause toggle
  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        setPlaying(true);
      } else {
        videoRef.current.pause();
        setPlaying(false);
      }
    } else {
      setPlaying((prev) => !prev);
    }
  }, []);

  // Seek
  const seek = useCallback((time: number) => {
    const clamped = Math.max(0, Math.min(time, duration || 100));
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
    setCurrentTime(clamped);
  }, [duration]);

  // Set Playback Speed
  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  }, []);

  // Set Volume
  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    if (videoRef.current) {
      videoRef.current.volume = clamped;
      videoRef.current.muted = clamped === 0;
    }
    setIsMuted(clamped === 0);
  }, []);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    } else {
      setIsMuted((prev) => !prev);
    }
  }, []);

  // Sync video element time and duration
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const onLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
    };
  }, [videoSrc]);

  // Virtual playback ticker when no video file exists
  useEffect(() => {
    if (videoSrc || !playing) return;

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 0.1 * playbackRate;
        if (duration > 0 && next >= duration) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [videoSrc, playing, duration, playbackRate]);

  // Determine active segment and word from currentTime
  useEffect(() => {
    if (!transcript?.segments || transcript.segments.length === 0) {
      setActiveSegment(null);
      setActiveWordIndex(-1);
      return;
    }

    const currentSeg = transcript.segments.find(
      (s) => currentTime >= s.start && currentTime <= s.end
    );

    if (currentSeg) {
      setActiveSegment(currentSeg);
      if (currentSeg.words && currentSeg.words.length > 0) {
        const wordIdx = currentSeg.words.findIndex(
          (w) => currentTime >= w.start && currentTime <= w.end
        );
        setActiveWordIndex(wordIdx);
      } else {
        setActiveWordIndex(-1);
      }
    } else {
      setActiveSegment(null);
      setActiveWordIndex(-1);
    }
  }, [currentTime, transcript]);

  return {
    videoRef,
    playing,
    currentTime,
    duration,
    activeSegment,
    activeWordIndex,
    playbackRate,
    volume,
    isMuted,
    togglePlay,
    seek,
    setPlaybackRate,
    setVolume,
    toggleMute,
    setDuration,
    setCurrentTime,
  };
}
