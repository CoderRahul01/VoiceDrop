'use client';

import { SignUpButton } from '@clerk/nextjs';

const STATS = [
  { value: '30s', label: 'avg. generation' },
  { value: '6', label: 'AI voices' },
  { value: '∞', label: 'articles supported' },
];

export default function Hero() {
  return (
    <section className="text-center space-y-6 py-6 pt-8">
      {/* Pill badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high ghost-border">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
        <span className="text-[0.6875rem] uppercase tracking-[0.05em] font-medium text-on-surface-variant">
          AI-powered · two-host podcast · instant
        </span>
      </div>

      {/* Headline */}
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface leading-[1.1]">
        Read less.{' '}
        <span className="text-primary">Know more.</span>
      </h1>

      {/* Sub-headline */}
      <p className="text-on-surface-variant text-base md:text-lg leading-relaxed max-w-lg mx-auto">
        Paste any article URL and get a two-host podcast in under 30 seconds —
        perfect for founders, PMs, and execs who never have time to read but
        can&apos;t afford to miss a thing.
      </p>

      {/* Stats row */}
      <div className="flex items-center justify-center gap-6 md:gap-10 pt-1">
        {STATS.map(({ value, label }) => (
          <div key={label} className="text-center">
            <p className="text-2xl font-extrabold text-primary">{value}</p>
            <p className="text-[0.625rem] uppercase tracking-widest text-on-surface-variant font-medium mt-0.5">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Social proof nudge — signed-out only via CSS opacity trick (no client hook needed) */}
      <p className="text-xs text-on-surface-variant/60 mt-1">
        No credit card required · Free plan included · Upgrade anytime
      </p>
    </section>
  );
}
