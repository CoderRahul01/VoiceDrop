'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SignInButton, SignUpButton, useAuth, useUser } from '@clerk/nextjs';
import { PodcastData } from '@/types';
import { PLAN_LIMITS, PLAN_MAX_DURATION, PLAN_VOICES, type PlanId } from '@/lib/plans';

interface InputCardProps {
  onGenerate: (data: PodcastData) => void;
}

type ErrorKind =
  | { type: 'auth' }
  | { type: 'limit'; plan: string; limit: number }
  | { type: 'message'; text: string }
  | null;

const TONES = ['Professional', 'Conversational', 'Debate', 'Summary'] as const;
type Tone = typeof TONES[number];
type Language = 'English' | 'Hinglish';

const TONE_META: Record<Tone, { icon: string; desc: string }> = {
  Professional:   { icon: 'business_center', desc: 'Formal, concise, executive-ready' },
  Conversational: { icon: 'forum', desc: 'Casual dialogue with relatable examples' },
  Debate:         { icon: 'balance', desc: 'Two opposing views explored' },
  Summary:        { icon: 'summarize', desc: 'Key takeaways only, ultra-short' },
};

const DURATION_OPTIONS: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: '~1 min' },
  { value: 2, label: '~2 min' },
  { value: 3, label: '~3 min' },
];

export default function InputCard({ onGenerate }: InputCardProps) {
  const { has } = useAuth();
  const { user } = useUser();
  const couponPlan = user?.publicMetadata?.couponPlan as string | undefined;
  const plan: PlanId =
    has?.({ plan: 'enterprise' }) || couponPlan === 'enterprise' ? 'enterprise' :
    has?.({ plan: 'pro' })        || couponPlan === 'pro'        ? 'pro' :
    has?.({ plan: 'starter' })    || couponPlan === 'starter'    ? 'starter' :
    'free';
  const allowedVoices = PLAN_VOICES[plan] ?? PLAN_VOICES.free;
  const isPaidPlan = plan !== 'free';

  const [url, setUrl] = useState('');
  const [voiceA, setVoiceA] = useState('Sarah (Tech)');
  const [voiceB, setVoiceB] = useState('James (Analyst)');
  const [tone, setTone] = useState<Tone>('Professional');
  const [language, setLanguage] = useState<Language>('English');
  const [duration, setDuration] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const maxDurationAllowed = PLAN_MAX_DURATION[plan];
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
        body: JSON.stringify({ url, voiceA, voiceB, tone, language, duration }),
      });
      const data = await res.json();
      if (data.requiresAuth) {
        setErrorKind({ type: 'auth' });
      } else if (data.limitReached) {
        setErrorKind({ type: 'limit', plan: data.plan ?? 'free', limit: data.limit ?? PLAN_LIMITS.free });
      } else if (data.error) {
        setErrorKind({ type: 'message', text: data.error });
      } else {
        if (data.usageCount !== undefined && data.limit !== undefined) {
          setUsage({ count: data.usageCount, limit: data.limit });
        }
        onGenerate(data);
      }
    } catch {
      setErrorKind({ type: 'message', text: 'Failed to connect to the generation service. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const remainingPodcasts = usage ? usage.limit - usage.count : null;

  return (
    <>
      {/* Generation overlay */}
      {loading && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6"
          style={{ background: 'rgba(13,18,16,0.9)', backdropFilter: 'blur(12px)' }}
          aria-live="polite"
        >
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-[2px] border-primary/15" />
            <div className="absolute inset-0 rounded-full border-[2px] border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            <div className="absolute inset-2 rounded-full bg-primary/8 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>
                podcasts
              </span>
            </div>
          </div>
          <div className="text-center space-y-1.5">
            <p className="text-[0.6875rem] uppercase tracking-[0.12em] font-bold text-primary">
              Generating your podcast…
            </p>
            <p className="text-on-surface-variant text-xs">Scripting → Voices → Stitching audio</p>
          </div>
        </div>
      )}

      <div className="bg-surface-container ghost-border rounded-2xl p-5 space-y-5">
        {/* URL input row */}
        <div className="space-y-2">
          <label htmlFor="article-url" className="text-[0.6rem] uppercase tracking-[0.1em] font-bold text-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm" aria-hidden="true">link</span>
            Article or blog URL
          </label>
          <div className="flex gap-2">
            <input
              id="article-url"
              className="flex-grow bg-surface-container-low ghost-border rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="https://techcrunch.com/2026/…"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              disabled={loading}
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !url}
              className="bg-primary text-on-primary text-sm font-bold px-4 sm:px-5 py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 whitespace-nowrap disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed glow-primary flex-shrink-0"
            >
              <span className="hidden sm:inline">{loading ? 'Generating…' : 'Generate'}</span>
              <span className="material-symbols-outlined text-base" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>
                {loading ? 'sync' : 'bolt'}
              </span>
            </button>
          </div>
        </div>

        {/* Language toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[0.6rem] uppercase tracking-[0.1em] font-bold text-on-surface-variant/70 flex-shrink-0">
            Language
          </p>
          <div className="flex flex-wrap gap-2">
            {(['English', 'Hinglish'] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                disabled={loading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[0.65rem] font-bold uppercase tracking-wider transition-all border ${
                  language === lang
                    ? 'bg-primary/10 border-primary/50 text-primary'
                    : 'ghost-border text-on-surface-variant hover:border-outline hover:text-on-surface'
                }`}
              >
                <span>{lang === 'English' ? '🇬🇧' : '🇮🇳'}</span>
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Duration pills */}
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[0.6rem] uppercase tracking-[0.1em] font-bold text-on-surface-variant/70 flex-shrink-0">
            Length
          </p>
          <div className="flex flex-wrap gap-2">
            {DURATION_OPTIONS.map(({ value, label }) => {
              const locked = value > maxDurationAllowed;
              return (
                <button
                  key={value}
                  onClick={() => !locked && setDuration(value)}
                  disabled={loading || locked}
                  title={locked ? `Upgrade to unlock ${value}-min podcasts` : undefined}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[0.65rem] font-bold uppercase tracking-wider transition-all border ${
                    locked
                      ? 'ghost-border text-on-surface-variant/30 cursor-not-allowed'
                      : duration === value
                        ? 'bg-primary/10 border-primary/50 text-primary'
                        : 'ghost-border text-on-surface-variant hover:border-outline hover:text-on-surface'
                  }`}
                >
                  {locked && (
                    <span className="material-symbols-outlined text-[10px]" aria-hidden="true">lock</span>
                  )}
                  {label}
                </button>
              );
            })}
          </div>
          {maxDurationAllowed < 3 && (
            <Link href="/pricing" className="text-[0.6rem] text-primary/70 hover:text-primary transition-colors ml-auto">
              Upgrade for longer
            </Link>
          )}
        </div>

        {/* Tone selector — pill buttons */}
        <div className="space-y-2">
          <p className="text-[0.6rem] uppercase tracking-[0.1em] font-bold text-on-surface-variant/70 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm" aria-hidden="true">tune</span>
            Podcast tone
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TONES.map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                disabled={loading}
                className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-center transition-all ${
                  tone === t
                    ? 'bg-primary/10 border-primary/50 text-primary'
                    : 'ghost-border text-on-surface-variant hover:border-outline hover:text-on-surface'
                }`}
              >
                <span
                  className="material-symbols-outlined text-xl"
                  aria-hidden="true"
                  style={{ fontVariationSettings: tone === t ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {TONE_META[t].icon}
                </span>
                <span className="text-[0.6rem] font-bold uppercase tracking-wider leading-none">{t}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Voice selectors — hidden for Conversational (auto-matched) */}
        {tone === 'Conversational' ? (
          <div className="flex items-center gap-2.5 py-2.5 px-3 bg-surface-container-low ghost-border rounded-xl">
            <span className="material-symbols-outlined text-base text-primary flex-shrink-0" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
            <div className="min-w-0">
              <p className="text-[0.6rem] uppercase tracking-widest font-bold text-primary">Auto-matched voices</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {language === 'Hinglish'
                  ? '🇮🇳 Akshita + Vidya — natural Hindi speakers'
                  : '🇬🇧 Anya + Andrew — warm conversational pair'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { id: 'voice-a', label: 'Host A', value: voiceA, voices: allowedVoices.a, set: setVoiceA },
                { id: 'voice-b', label: 'Host B', value: voiceB, voices: allowedVoices.b, set: setVoiceB },
              ] as const
            ).map(({ id, label, value, voices, set }) => (
              <div key={id} className="space-y-1.5">
                <label htmlFor={id} className="text-[0.6rem] uppercase tracking-[0.1em] font-bold text-on-surface-variant/70 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs" aria-hidden="true">
                    {isPaidPlan ? 'record_voice_over' : 'lock'}
                  </span>
                  {label}
                  {!isPaidPlan && (
                    <Link href="/pricing" className="text-primary/70 hover:text-primary transition-colors normal-case font-normal tracking-normal text-[0.55rem]">
                      &nbsp;upgrade
                    </Link>
                  )}
                </label>
                <div className="relative">
                  <select
                    id={id}
                    className="w-full bg-surface-container-low ghost-border rounded-xl px-3 py-2.5 text-xs text-on-surface focus:ring-1 focus:ring-primary outline-none appearance-none disabled:opacity-50 cursor-pointer"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    disabled={loading || !isPaidPlan}
                  >
                    {voices.map((v) => <option key={v}>{v}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none text-on-surface-variant/50" aria-hidden="true">
                    expand_more
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error states */}
        {errorKind?.type === 'auth' && (
          <div className="p-4 bg-surface-container-low ghost-border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-on-surface text-sm font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base" aria-hidden="true">lock</span>
              Sign in to generate podcasts — it&apos;s free
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <SignInButton mode="modal">
                <button className="text-[0.6875rem] uppercase tracking-wider font-bold text-on-surface-variant hover:text-primary transition-colors px-3 py-1.5 ghost-border rounded-lg">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="bg-primary text-on-primary text-[0.6875rem] uppercase tracking-wider font-bold px-4 py-1.5 rounded-lg hover:opacity-90 transition-all">
                  Start free
                </button>
              </SignUpButton>
            </div>
          </div>
        )}

        {errorKind?.type === 'limit' && (
          <div className="p-4 bg-surface-container-low ghost-border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <p className="text-on-surface text-sm font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base" aria-hidden="true">upgrade</span>
                {errorKind.plan} limit reached ({errorKind.limit}/{errorKind.limit} used)
              </p>
              <p className="text-on-surface-variant text-xs mt-0.5">Resets on the 1st of next month</p>
            </div>
            <Link
              href="/pricing"
              className="bg-primary text-on-primary text-[0.6875rem] uppercase tracking-wider font-bold px-4 py-1.5 rounded-lg hover:opacity-90 transition-all flex-shrink-0"
            >
              Upgrade →
            </Link>
          </div>
        )}

        {errorKind?.type === 'message' && (
          <p className="text-red-400 text-xs font-medium flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
            <span className="material-symbols-outlined text-sm" aria-hidden="true">error</span>
            {errorKind.text}
          </p>
        )}

        {remainingPodcasts !== null && errorKind === null && (
          <p className="text-[0.6875rem] text-on-surface-variant flex items-center gap-1.5 animate-in fade-in duration-300">
            <span className="material-symbols-outlined text-sm text-primary" aria-hidden="true">data_usage</span>
            {remainingPodcasts <= 0
              ? "All podcasts used this month."
              : `${remainingPodcasts} podcast${remainingPodcasts !== 1 ? 's' : ''} left this month`}
            {' · '}
            <Link href="/pricing" className="text-primary hover:underline underline-offset-2">Upgrade</Link>
          </p>
        )}
      </div>
    </>
  );
}
