'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface PlayerCardProps {
  data: {
    audio: string;
    title: string;
    source: string;
    duration: string;
  };
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
    if (audio) {
      audio.src = `data:audio/mpeg;base64,${data.audio}`;
      const updateMetadata = () => {
        setDurationRaw(audio.duration || 0);
      };
      const updateTime = () => {
        setCurrentTime(audio.currentTime || 0);
      };
      const handleEnd = () => {
        setIsPlaying(false);
      };

      audio.addEventListener('loadedmetadata', updateMetadata);
      audio.addEventListener('timeupdate', updateTime);
      audio.addEventListener('ended', handleEnd);

      return () => {
        audio.removeEventListener('loadedmetadata', updateMetadata);
        audio.removeEventListener('timeupdate', updateTime);
        audio.removeEventListener('ended', handleEnd);
      };
    }
  }, [data.audio]);

  const progress = durationRaw > 0 ? (currentTime / durationRaw) * 100 : 0;

  return (
    <div className="bg-surface-container-low ghost-border rounded-xl p-6 space-y-6" role="region" aria-label="Audio player">
      <audio ref={audioRef} className="hidden" aria-hidden="true" />
      
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[10px] text-primary" aria-hidden="true">podcasts</span>
          <span className="text-[0.625rem] uppercase tracking-widest font-bold text-primary">
            Episode ready
          </span>
        </div>
        <div className="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded text-[0.6rem] font-bold tracking-tighter" aria-label="High definition audio">
          HD AUDIO
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-primary-container/10 rounded-xl flex items-center justify-center ghost-border flex-shrink-0" aria-hidden="true">
          <span className="material-symbols-outlined text-primary text-3xl" aria-hidden="true">
            podcasts
          </span>
        </div>
        <div className="flex-grow min-w-0">
          <h3 className="text-on-surface font-bold truncate">{data.title}</h3>
          <p className="text-on-surface-variant text-xs truncate">Source: {data.source}</p>
          <p className="text-[0.6875rem] text-on-surface mt-1 font-medium" aria-live="polite">
            {formatTime(durationRaw - currentTime)} Remaining
          </p>
        </div>
        <button 
          onClick={handleDownload}
          aria-label="Download podcast episode"
          className="p-3 bg-surface-container-highest text-on-surface rounded-xl ghost-border hover:bg-surface-bright transition-colors focus-visible:ring-1 focus-visible:ring-primary outline-none"
        >
          <span className="material-symbols-outlined" aria-hidden="true">download</span>
        </button>
      </div>

      <div className="space-y-2">
        <div
          className="relative w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden cursor-pointer"
          role="progressbar"
          aria-valuenow={currentTime}
          aria-valuemin={0}
          aria-valuemax={durationRaw}
          aria-label="Playback progress — click to seek"
          onClick={handleSeek}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-primary transition-all duration-200"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-[0.6rem] font-medium text-on-surface-variant tracking-wider" aria-hidden="true">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(durationRaw)}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 py-2">
        <button 
          onClick={() => { if (audioRef.current) audioRef.current.currentTime -= 10 }}
          aria-label="Rewind 10 seconds"
          className="text-on-surface-variant hover:text-on-surface transition-colors focus-visible:text-primary outline-none"
        >
          <span className="material-symbols-outlined text-3xl" aria-hidden="true">replay_10</span>
        </button>
        
        <button 
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="w-14 h-14 bg-on-surface text-background rounded-full flex items-center justify-center active:scale-90 transition-transform hover:brightness-110 focus-visible:ring-2 focus-visible:ring-primary outline-none"
        >
          <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>
        
        <button 
          onClick={() => { if (audioRef.current) audioRef.current.currentTime += 30 }}
          aria-label="Forward 30 seconds"
          className="text-on-surface-variant hover:text-on-surface transition-colors focus-visible:text-primary outline-none">
          <span className="material-symbols-outlined text-3xl" aria-hidden="true">forward_30</span>
        </button>
      </div>
    </div>
  );
}
