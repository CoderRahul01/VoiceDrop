'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SignInButton, SignUpButton, useUser } from '@clerk/nextjs';
import { PodcastData } from '@/types';
import { PLAN_LIMITS, PLAN_VOICES, type PlanId } from '@/lib/plans';

interface InputCardProps {
  onGenerate: (data: PodcastData) => void;
}

type ErrorKind =
  | { type: 'auth' }
  | { type: 'limit'; plan: string; limit: number }
  | { type: 'message'; text: string }
  | null;

export default function InputCard({ onGenerate }: InputCardProps) {
  const { user } = useUser();
  const plan = ((user?.publicMetadata?.plan as string) ?? 'free') as PlanId;
  const allowedVoices = PLAN_VOICES[plan] ?? PLAN_VOICES.free;
  const isPaidPlan = plan !== 'free';

  const [url, setUrl] = useState('');
  const [voiceA, setVoiceA] = useState('Sarah (Tech)');
  const [voiceB, setVoiceB] = useState('James (Analyst)');
  const [tone, setTone] = useState('Professional');
  const [loading, setLoading] = useState(false);
  const [errorKind, setErrorKind] = useState<ErrorKind>(null);
  const [usage, setUsage] = useState<{ count: number; limit: number } | null>(null);

  const handleGenerate = async () => {
    if (!url) return;
    setLoading(true);
    setErrorKind(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, voiceA, voiceB, tone }),
      });
      const data = await res.json();

      if (data.requiresAuth) {
        setErrorKind({ type: 'auth' });
      } else if (data.limitReached) {
        setErrorKind({ type: 'limit', plan: data.plan ?? 'free', limit: data.limit ?? PLAN_LIMITS.free });
      } else if (data.error) {
        setErrorKind({ type: 'message', text: data.error });
      } else {
        // Success — store usage and bubble up
        if (data.usageCount !== undefined && data.limit !== undefined) {
          setUsage({ count: data.usageCount, limit: data.limit });
        }
        onGenerate(data);
      }
    } catch (err) {
      console.error(err);
      setErrorKind({ type: 'message', text: 'Failed to connect to the generation service. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const remainingPodcasts = usage ? usage.limit - usage.count : null;

  return (
    <>
      {/* Full-screen generation overlay */}
      {loading && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6"
          style={{ background: 'rgba(15, 21, 18, 0.88)', backdropFilter: 'blur(8px)' }}
          aria-live="polite"
          aria-label="Generating podcast"
        >
          <div
            className="w-14 h-14 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin"
            aria-hidden="true"
          />
          <div className="text-center space-y-1">
            <p className="text-[0.6875rem] uppercase tracking-[0.1em] font-bold text-primary">
              Generating your podcast…
            </p>
            <p className="text-on-surface-variant text-xs">
              Scripting → Voices → Stitching audio
            </p>
          </div>
        </div>
      )}

      <div className="bg-surface-container-low ghost-border rounded-xl p-6 space-y-6">
        <div className="space-y-2">
          <label
            htmlFor="article-url"
            className="text-[0.6875rem] uppercase tracking-[0.05em] font-bold text-primary"
          >
            Article or blog URL
          </label>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              id="article-url"
              className="flex-grow bg-surface-container-highest border-0 ghost-border rounded-xl px-4 py-3 text-on-surface placeholder:text-on-surface-variant/50 focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="https://techcrunch.com/..."
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              disabled={loading}
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !url}
              className="bg-primary text-on-primary font-bold px-6 py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:scale-100"
            >
              <span>{loading ? 'Synthesising...' : 'Generate podcast'}</span>
              <span
                className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              >
                {loading ? 'sync' : 'bolt'}
              </span>
            </button>
          </div>

          {/* Error states */}
          {errorKind?.type === 'auth' && (
            <div className="mt-3 p-4 bg-surface-container ghost-border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-on-surface text-sm font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base" aria-hidden="true">lock</span>
                Sign in to generate podcasts
              </p>
              <div className="flex gap-2 flex-shrink-0">
                <SignInButton mode="modal">
                  <button className="text-[0.6875rem] uppercase tracking-wider font-bold text-on-surface-variant hover:text-primary transition-colors px-3 py-1.5 ghost-border rounded-lg">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="bg-primary text-on-primary text-[0.6875rem] uppercase tracking-wider font-bold px-4 py-1.5 rounded-lg hover:opacity-90 transition-all">
                    Free Sign Up
                  </button>
                </SignUpButton>
              </div>
            </div>
          )}

          {errorKind?.type === 'limit' && (
            <div className="mt-3 p-4 bg-surface-container ghost-border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-on-surface text-sm font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-base" aria-hidden="true">upgrade</span>
                  {errorKind.plan} plan limit reached ({errorKind.limit}/{errorKind.limit} used)
                </p>
                <p className="text-on-surface-variant text-xs mt-0.5">Resets at the start of next month</p>
              </div>
              <Link
                href="/pricing"
                className="bg-primary text-on-primary text-[0.6875rem] uppercase tracking-wider font-bold px-4 py-1.5 rounded-lg hover:opacity-90 transition-all flex-shrink-0"
              >
                Upgrade Plan
              </Link>
            </div>
          )}

          {errorKind?.type === 'message' && (
            <p className="text-error text-xs font-medium mt-2 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
              <span className="material-symbols-outlined text-sm" aria-hidden="true">error</span>
              {errorKind.text}
            </p>
          )}

          {/* Usage remaining badge after a successful generation */}
          {remainingPodcasts !== null && errorKind === null && (
            <p className="text-[0.6875rem] text-on-surface-variant mt-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-primary" aria-hidden="true">data_usage</span>
              {remainingPodcasts <= 0
                ? "You've used your last podcast this month."
                : `${remainingPodcasts} podcast${remainingPodcasts !== 1 ? 's' : ''} remaining this month`}
              {' · '}
              <Link href="/pricing" className="text-primary hover:underline underline-offset-2">
                Upgrade
              </Link>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label
              htmlFor="voice-a"
              className="text-[0.6rem] uppercase tracking-widest text-on-surface-variant block ml-1"
            >
              Host A {!isPaidPlan && <span className="text-on-surface-variant/50 normal-case">(upgrade for more)</span>}
            </label>
            <div className="relative">
              <select
                id="voice-a"
                className="w-full bg-surface-container-highest border-0 ghost-border rounded-lg px-3 py-2 text-xs text-on-surface focus:ring-1 focus:ring-primary outline-none appearance-none disabled:opacity-60"
                value={voiceA}
                onChange={(e) => setVoiceA(e.target.value)}
                disabled={loading || !isPaidPlan}
              >
                {allowedVoices.a.map((v) => <option key={v}>{v}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-xs pointer-events-none text-on-surface-variant/50" aria-hidden="true">
                {isPaidPlan ? 'expand_more' : 'lock'}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="voice-b"
              className="text-[0.6rem] uppercase tracking-widest text-on-surface-variant block ml-1"
            >
              Host B {!isPaidPlan && <span className="text-on-surface-variant/50 normal-case">(upgrade for more)</span>}
            </label>
            <div className="relative">
              <select
                id="voice-b"
                className="w-full bg-surface-container-highest border-0 ghost-border rounded-lg px-3 py-2 text-xs text-on-surface focus:ring-1 focus:ring-primary outline-none appearance-none disabled:opacity-60"
                value={voiceB}
                onChange={(e) => setVoiceB(e.target.value)}
                disabled={loading || !isPaidPlan}
              >
                {allowedVoices.b.map((v) => <option key={v}>{v}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-xs pointer-events-none text-on-surface-variant/50" aria-hidden="true">
                {isPaidPlan ? 'expand_more' : 'lock'}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="tone-select"
              className="text-[0.6rem] uppercase tracking-widest text-on-surface-variant block ml-1"
            >
              Tone
            </label>
            <div className="relative">
              <select
                id="tone-select"
                className="w-full bg-surface-container-highest border-0 ghost-border rounded-lg px-3 py-2 text-xs text-on-surface focus:ring-1 focus:ring-primary outline-none appearance-none"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                disabled={loading}
              >
                <option>Professional</option>
                <option>Conversational</option>
                <option>Debate</option>
                <option>Summary</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-xs pointer-events-none text-on-surface-variant/50" aria-hidden="true">
                expand_more
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
