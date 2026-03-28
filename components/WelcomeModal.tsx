'use client';

import { useEffect, useState } from 'react';

const STEPS = [
  {
    icon: 'link',
    title: 'Paste any article URL',
    body: 'TechCrunch, Substack, Medium, HN — any public URL works. We fetch and parse it for you.',
  },
  {
    icon: 'smart_toy',
    title: 'AI writes the script',
    body: 'Cloudflare Workers AI generates a two-host dialogue that captures every key insight from the article.',
  },
  {
    icon: 'headphones',
    title: 'Listen in 30 seconds',
    body: 'ElevenLabs converts the script into studio-quality audio with two distinct AI voices. Download or stream instantly.',
  },
];

export default function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem('vd_welcome_seen');
    if (!seen) setOpen(true);
  }, []);

  const handleClose = () => {
    localStorage.setItem('vd_welcome_seen', '1');
    setOpen(false);
  };

  if (!open) return null;

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(10, 15, 13, 0.85)', backdropFilter: 'blur(12px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to VoiceDrop"
    >
      <div className="bg-surface-container-low ghost-border rounded-2xl w-full max-w-sm p-8 space-y-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Logo + welcome */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 mb-3">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontSize: '28px' }}
              aria-hidden="true"
            >
              settings_voice
            </span>
            <span className="text-xl font-extrabold tracking-tighter text-primary">VoiceDrop</span>
          </div>
          <p className="text-[0.6875rem] uppercase tracking-[0.05em] font-bold text-on-surface-variant">
            How it works — Step {step + 1} of {STEPS.length}
          </p>
        </div>

        {/* Step card */}
        <div className="bg-surface-container rounded-xl p-6 space-y-3 ghost-border text-center animate-in fade-in duration-300" key={step}>
          <span
            className="material-symbols-outlined text-primary mx-auto"
            style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            {current.icon}
          </span>
          <h2 className="text-on-surface font-bold text-base">{current.title}</h2>
          <p className="text-on-surface-variant text-sm leading-relaxed">{current.body}</p>
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5" aria-hidden="true">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-primary' : 'w-1.5 bg-surface-container-highest'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {!isLast && (
            <button
              onClick={handleClose}
              className="flex-1 text-[0.6875rem] uppercase tracking-widest font-bold text-on-surface-variant hover:text-primary transition-colors py-2.5"
            >
              Skip
            </button>
          )}
          <button
            onClick={isLast ? handleClose : () => setStep((s) => s + 1)}
            className="flex-1 bg-primary text-on-primary text-[0.6875rem] uppercase tracking-widest font-bold px-5 py-2.5 rounded-xl hover:opacity-90 active:scale-95 transition-all"
          >
            {isLast ? "Let's go →" : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
