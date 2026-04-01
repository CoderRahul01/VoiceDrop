'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { PodcastData } from '@/types';

interface PlayerCardProps {
  data: PodcastData;
}

export default function PlayerCard({ data }: PlayerCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [durationRaw, setDurationRaw] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !durationRaw) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * durationRaw;
  }, [durationRaw]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `data:audio/mpeg;base64,${data.audio}`;
    link.download = `${data.title.replace(/\s+/g, '_')}.mp3`;
    link.click();
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.src = `data:audio/mpeg;base64,${data.audio}`;
    const updateMetadata = () => setDurationRaw(audio.duration || 0);
    const updateTime = () => setCurrentTime(audio.currentTime || 0);
    const handleEnd = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', updateMetadata);
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnd);

    return () => {
      audio.removeEventListener('loadedmetadata', updateMetadata);
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnd);
    };
  }, [data.audio]);

  const progress = durationRaw > 0 ? (currentTime / durationRaw) * 100 : 0;

  return (
    <div className="space-y-6 rounded-xl bg-surface-container-low p-6 ghost-border" role="region" aria-label="Audio player">
      <audio ref={audioRef} className="hidden" aria-hidden="true" />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[10px] text-primary" aria-hidden="true">podcasts</span>
          <span className="text-[0.625rem] font-bold uppercase tracking-widest text-primary">
            Episode ready
          </span>
        </div>
        <div className="rounded bg-secondary-container px-2 py-0.5 text-[0.6rem] font-bold tracking-tighter text-on-secondary-container" aria-label="High definition audio">
          HD AUDIO
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-primary-container/10 ghost-border" aria-hidden="true">
          <span className="material-symbols-outlined text-3xl text-primary" aria-hidden="true">
            podcasts
          </span>
        </div>
        <div className="min-w-0 flex-grow">
          <h3 className="truncate font-bold text-on-surface">{data.title}</h3>
          <p className="truncate text-xs text-on-surface-variant">Source: {data.source}</p>
          <p className="mt-1 text-[0.6875rem] font-medium text-on-surface" aria-live="polite">
            {formatTime(durationRaw - currentTime)} Remaining
          </p>
        </div>
        <button
          onClick={handleDownload}
          aria-label="Download podcast episode"
          className="rounded-xl bg-surface-container-highest p-3 text-on-surface transition-colors hover:bg-surface-bright focus-visible:ring-1 focus-visible:ring-primary outline-none ghost-border"
        >
          <span className="material-symbols-outlined" aria-hidden="true">download</span>
        </button>
      </div>

      <div className="rounded-xl bg-surface-container px-3 py-2 text-[0.7rem] text-on-surface-variant ghost-border">
        Charged {data.tokensCharged} tokens · {data.tokensRemaining} left this month · {data.resolvedSelections.language} · {data.resolvedSelections.tone}
      </div>

      <div className="space-y-2">
        <div
          className="relative h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-surface-container-highest"
          role="progressbar"
          aria-valuenow={currentTime}
          aria-valuemin={0}
          aria-valuemax={durationRaw}
          aria-label="Playback progress — click to seek"
          onClick={handleSeek}
        >
          <div
            className="absolute left-0 top-0 h-full bg-primary transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[0.6rem] font-medium tracking-wider text-on-surface-variant" aria-hidden="true">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(durationRaw)}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 py-2">
        <button
          onClick={() => {
            if (audioRef.current) audioRef.current.currentTime -= 10;
          }}
          aria-label="Rewind 10 seconds"
          className="text-on-surface-variant transition-colors hover:text-on-surface focus-visible:text-primary outline-none"
        >
          <span className="material-symbols-outlined text-3xl" aria-hidden="true">replay_10</span>
        </button>

        <button
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-on-surface text-background transition-transform hover:brightness-110 active:scale-90 focus-visible:ring-2 focus-visible:ring-primary outline-none"
        >
          <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>

        <button
          onClick={() => {
            if (audioRef.current) audioRef.current.currentTime += 30;
          }}
          aria-label="Forward 30 seconds"
          className="text-on-surface-variant transition-colors hover:text-on-surface focus-visible:text-primary outline-none"
        >
          <span className="material-symbols-outlined text-3xl" aria-hidden="true">forward_30</span>
        </button>
      </div>
    </div>
  );
}
