'use client';

import { useState } from 'react';

interface Turn {
  speaker: 'A' | 'B';
  text: string;
}

interface TranscriptPreviewProps {
  transcript: Turn[];
}

export default function TranscriptPreview({ transcript }: TranscriptPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  if (!transcript || transcript.length === 0) return null;

  const visibleTurns = expanded ? transcript : transcript.slice(0, 3);

  return (
    <div className="bg-surface-container-low ghost-border rounded-xl p-6 space-y-6">
      <label className="text-[0.6875rem] uppercase tracking-[0.05em] font-bold text-primary">
        Transcript preview
      </label>
      <div className="space-y-6">
        {visibleTurns.map((turn, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 ${
              turn.speaker === 'B' ? 'flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                turn.speaker === 'A'
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-tertiary-container text-on-tertiary-container'
              }`}
            >
              {turn.speaker}
            </div>
            <div
              className={`rounded-xl p-3 max-w-[85%] ${
                turn.speaker === 'A'
                  ? 'bg-surface-container-high rounded-tl-none'
                  : 'bg-surface-container rounded-tr-none border border-outline-variant/10'
              }`}
            >
              <p className="text-sm leading-relaxed text-on-surface">
                {turn.text}
              </p>
            </div>
          </div>
        ))}
      </div>
      {transcript.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center gap-2"
          aria-label={expanded ? 'Collapse transcript' : 'View full transcript'}
        >
          <span>{expanded ? 'Collapse Transcript' : 'View Full Transcript'}</span>
          <span className="material-symbols-outlined text-sm" aria-hidden="true">
            {expanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
          </span>
        </button>
      )}
    </div>
  );
}
