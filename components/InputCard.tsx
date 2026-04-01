'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SignInButton, SignUpButton, useAuth, useUser } from '@clerk/nextjs';
import type { EntitlementsData, PodcastData, ResolvedSelections } from '@/types';
import {
  ALL_VOICES,
  DURATION_OPTIONS,
  estimateTokenChargeForDuration,
  getPlanDefinition,
  getPlanEntitlements,
  resolvePlan,
  TONES,
  type Language,
  type PlanId,
  type Tone,
} from '@/lib/plans';

interface InputCardProps {
  onGenerate: (data: PodcastData) => void;
}

type ErrorKind =
  | { type: 'auth' }
  | { type: 'limit'; plan: PlanId; tokenBudget: number; tokensRemaining: number }
  | { type: 'message'; text: string }
  | null;

const TONE_META: Record<Tone, { icon: string; desc: string }> = {
  Professional: { icon: 'business_center', desc: 'Formal, concise, executive-ready' },
  Conversational: { icon: 'forum', desc: 'Casual dialogue with relatable examples' },
  Debate: { icon: 'balance', desc: 'Two opposing views explored' },
  Summary: { icon: 'summarize', desc: 'Key takeaways only, ultra-short' },
};

export default function InputCard({ onGenerate }: InputCardProps) {
  const { has, isSignedIn } = useAuth();
  const { user } = useUser();
  const couponPlan = user?.publicMetadata?.couponPlan as string | undefined;
  const clientPlan = resolvePlan((params) => Boolean(has?.(params)), couponPlan);

  const [url, setUrl] = useState('');
  const [voiceA, setVoiceA] = useState('Sarah (Tech)');
  const [voiceB, setVoiceB] = useState('James (Analyst)');
  const [tone, setTone] = useState<Tone>('Professional');
  const [language, setLanguage] = useState<Language>('English');
  const [duration, setDuration] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [errorKind, setErrorKind] = useState<ErrorKind>(null);
  const [planState, setPlanState] = useState<EntitlementsData | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/entitlements')
      .then((res) => res.json())
      .then((data: EntitlementsData) => {
        if (!cancelled) setPlanState(data);
      })
      .catch(() => {
        if (!cancelled) setPlanState(null);
      });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, user?.id, couponPlan]);

  const effectivePlan = planState?.plan ?? clientPlan;
  const entitlements = planState?.entitlements ?? getPlanEntitlements(effectivePlan);
  const planMeta = getPlanDefinition(effectivePlan);
  const tokenBudget = planState?.tokenBudget ?? entitlements.monthlyTokenBudget;
  const tokensUsed = planState?.tokensUsed ?? 0;
  const tokensRemaining = planState?.tokensRemaining ?? tokenBudget;
  const estimatedTokens = estimateTokenChargeForDuration(duration);
  const insufficientTokens = isSignedIn && estimatedTokens > tokensRemaining;

  useEffect(() => {
    if (!entitlements.languages.includes(language)) setLanguage(entitlements.languages[0]);
  }, [entitlements.languages, language]);

  useEffect(() => {
    if (!entitlements.durations.includes(duration)) setDuration(entitlements.durations[0]);
  }, [entitlements.durations, duration]);

  useEffect(() => {
    if (!entitlements.tones.includes(tone)) setTone(entitlements.tones[0]);
  }, [entitlements.tones, tone]);

  useEffect(() => {
    if (!entitlements.voices.a.includes(voiceA)) setVoiceA(entitlements.voices.a[0]);
  }, [entitlements.voices.a, voiceA]);

  useEffect(() => {
    if (!entitlements.voices.b.includes(voiceB)) setVoiceB(entitlements.voices.b[0]);
  }, [entitlements.voices.b, voiceB]);

  const syncResolvedSelections = (resolved?: ResolvedSelections) => {
    if (!resolved) return;
    setLanguage(resolved.language);
    setDuration(resolved.duration);
    setTone(resolved.tone);
    setVoiceA(resolved.voiceA);
    setVoiceB(resolved.voiceB);
  };

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
      } else if (data.tokenLimitReached) {
        syncResolvedSelections(data.resolvedSelections);
        setPlanState((prev) => ({
          plan: (data.plan ?? prev?.plan ?? clientPlan) as PlanId,
          entitlements: prev?.entitlements ?? entitlements,
          tokenBudget: data.tokenBudget ?? prev?.tokenBudget ?? tokenBudget,
          tokensUsed: data.tokensUsed ?? prev?.tokensUsed ?? tokensUsed,
          tokensRemaining: data.tokensRemaining ?? prev?.tokensRemaining ?? tokensRemaining,
        }));
        setErrorKind({
          type: 'limit',
          plan: (data.plan ?? clientPlan) as PlanId,
          tokenBudget: data.tokenBudget ?? tokenBudget,
          tokensRemaining: data.tokensRemaining ?? 0,
        });
      } else if (data.error) {
        setErrorKind({ type: 'message', text: data.error });
      } else {
        syncResolvedSelections(data.resolvedSelections);
        setPlanState((prev) => ({
          plan: data.plan ?? prev?.plan ?? clientPlan,
          entitlements: prev?.entitlements ?? entitlements,
          tokenBudget: data.tokenBudget ?? prev?.tokenBudget ?? tokenBudget,
          tokensUsed: data.tokensUsed ?? prev?.tokensUsed ?? tokensUsed,
          tokensRemaining: data.tokensRemaining ?? prev?.tokensRemaining ?? tokensRemaining,
        }));
        onGenerate(data as PodcastData);
      }
    } catch {
      setErrorKind({ type: 'message', text: 'Failed to connect to the generation service. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6"
          style={{ background: 'rgba(13,18,16,0.9)', backdropFilter: 'blur(12px)' }}
          aria-live="polite"
        >
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-[2px] border-primary/15" />
            <div className="absolute inset-0 animate-spin rounded-full border-[2px] border-l-transparent border-b-transparent border-t-primary border-r-transparent" />
            <div className="absolute inset-2 flex items-center justify-center rounded-full bg-primary/8">
              <span className="material-symbols-outlined text-xl text-primary" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>
                podcasts
              </span>
            </div>
          </div>
          <div className="space-y-1.5 text-center">
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-primary">
              Generating your podcast…
            </p>
            <p className="text-xs text-on-surface-variant">Scripting → Tokens → Voices → Stitching audio</p>
          </div>
        </div>
      )}

      <div className="space-y-5 rounded-2xl bg-surface-container p-5 ghost-border">
        <div className="rounded-xl bg-surface-container-low p-4 ghost-border">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary">Current access</p>
              <h3 className="mt-1 text-sm font-bold text-on-surface">{planMeta.name} plan</h3>
              <p className="text-xs text-on-surface-variant">{planMeta.tokenLabel} · {planMeta.audioQuality}</p>
            </div>
            <div className="text-right">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant/70">This episode</p>
              <p className="text-sm font-bold text-on-surface">~{estimatedTokens} tokens</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[0.7rem] text-on-surface-variant">
            <span>{tokensRemaining} tokens left this month</span>
            <span>·</span>
            <span>{tokensUsed} used</span>
            <span>·</span>
            <Link href="/pricing" className="font-medium text-primary hover:underline underline-offset-2">
              Upgrade unlocks more options
            </Link>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="article-url" className="flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary">
            <span className="material-symbols-outlined text-sm" aria-hidden="true">link</span>
            Article or blog URL
          </label>
          <div className="flex gap-2">
            <input
              id="article-url"
              className="flex-grow rounded-xl bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary ghost-border"
              placeholder="https://techcrunch.com/2026/..."
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              disabled={loading}
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !url || insufficientTokens}
              className="flex-shrink-0 whitespace-nowrap rounded-xl bg-primary px-4 py-3 text-sm font-bold text-on-primary transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:scale-100 glow-primary"
            >
              {loading ? 'Generating…' : 'Generate'}
            </button>
          </div>
          {insufficientTokens && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-red-400">
              <span className="material-symbols-outlined text-sm" aria-hidden="true">lock</span>
              This episode estimate is higher than your remaining monthly tokens.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <p className="flex-shrink-0 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant/70">
            Language
          </p>
          <div className="flex flex-wrap gap-2">
            {(['English', 'Hinglish'] as Language[]).map((lang) => {
              const locked = !entitlements.languages.includes(lang);
              const active = language === lang;
              return (
                <button
                  key={lang}
                  onClick={() => !locked && setLanguage(lang)}
                  disabled={loading || locked}
                  title={locked ? 'Upgrade to unlock this language' : undefined}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-wider transition-all ${
                    locked
                      ? 'cursor-not-allowed ghost-border text-on-surface-variant/30'
                      : active
                        ? 'border-primary/50 bg-primary/10 text-primary'
                        : 'ghost-border text-on-surface-variant hover:border-outline hover:text-on-surface'
                  }`}
                >
                  {locked && <span className="material-symbols-outlined text-[10px]" aria-hidden="true">lock</span>}
                  <span>{lang === 'English' ? '🇬🇧' : '🇮🇳'}</span>
                  {lang}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <p className="flex-shrink-0 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant/70">
            Length
          </p>
          <div className="flex flex-wrap gap-2">
            {DURATION_OPTIONS.map((value) => {
              const locked = !entitlements.durations.includes(value);
              const active = duration === value;
              return (
                <button
                  key={value}
                  onClick={() => !locked && setDuration(value)}
                  disabled={loading || locked}
                  title={locked ? `Upgrade to unlock ${value}-minute podcasts` : undefined}
                  className={`flex items-center gap-1 rounded-xl border px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-wider transition-all ${
                    locked
                      ? 'cursor-not-allowed ghost-border text-on-surface-variant/30'
                      : active
                        ? 'border-primary/50 bg-primary/10 text-primary'
                        : 'ghost-border text-on-surface-variant hover:border-outline hover:text-on-surface'
                  }`}
                >
                  {locked && <span className="material-symbols-outlined text-[10px]" aria-hidden="true">lock</span>}
                  ~{value} min
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant/70">
            <span className="material-symbols-outlined text-sm" aria-hidden="true">tune</span>
            Podcast tone
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TONES.map((option) => {
              const locked = !entitlements.tones.includes(option);
              const active = tone === option;
              return (
                <button
                  key={option}
                  onClick={() => !locked && setTone(option)}
                  disabled={loading || locked}
                  title={locked ? 'Upgrade to unlock this tone' : TONE_META[option].desc}
                  className={`relative flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition-all ${
                    locked
                      ? 'cursor-not-allowed ghost-border text-on-surface-variant/35'
                      : active
                        ? 'border-primary/50 bg-primary/10 text-primary'
                        : 'ghost-border text-on-surface-variant hover:border-outline hover:text-on-surface'
                  }`}
                >
                  {locked && (
                    <span className="absolute right-2 top-2 material-symbols-outlined text-[10px]" aria-hidden="true">lock</span>
                  )}
                  <span className="material-symbols-outlined text-xl" aria-hidden="true" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
                    {TONE_META[option].icon}
                  </span>
                  <span className="text-[0.6rem] font-bold uppercase tracking-wider leading-none">{option}</span>
                </button>
              );
            })}
          </div>
        </div>

        {tone === 'Conversational' ? (
          <div className="flex items-center gap-2.5 rounded-xl bg-surface-container-low px-3 py-2.5 ghost-border">
            <span className="material-symbols-outlined flex-shrink-0 text-base text-primary" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
            <div className="min-w-0">
              <p className="text-[0.6rem] font-bold uppercase tracking-widest text-primary">Auto-matched voices</p>
              <p className="mt-0.5 text-xs text-on-surface-variant">
                {language === 'Hinglish'
                  ? '🇮🇳 Akshita + Vidya — natural Hindi speakers'
                  : '🇬🇧 Anya + Andrew — warm conversational pair'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="flex items-center gap-1 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant/70">
                <span className="material-symbols-outlined text-xs" aria-hidden="true">record_voice_over</span>
                Host A
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {ALL_VOICES.filter((voice) => voice.slot === 'a').map((voice) => {
                  const locked = !entitlements.voices.a.includes(voice.name);
                  const active = voiceA === voice.name;
                  return (
                    <button
                      key={voice.name}
                      onClick={() => !locked && setVoiceA(voice.name)}
                      disabled={loading || locked}
                      title={locked ? 'Upgrade to unlock this voice' : voice.desc}
                      className={`relative flex flex-col items-start rounded-xl border px-2.5 py-2 text-left transition-all ${
                        locked
                          ? 'cursor-not-allowed ghost-border opacity-40'
                          : active
                            ? 'border-primary/50 bg-primary/10 text-primary'
                            : 'ghost-border text-on-surface-variant hover:border-outline hover:text-on-surface'
                      }`}
                    >
                      {locked && (
                        <span className="absolute right-1.5 top-1.5 material-symbols-outlined text-[10px] text-on-surface-variant/50" aria-hidden="true">lock</span>
                      )}
                      <span className="text-[0.6rem] font-bold leading-tight">{voice.name.split(' (')[0]}</span>
                      <span className="mt-0.5 text-[0.5rem] leading-tight opacity-60">{voice.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="flex items-center gap-1 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant/70">
                <span className="material-symbols-outlined text-xs" aria-hidden="true">record_voice_over</span>
                Host B
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {ALL_VOICES.filter((voice) => voice.slot === 'b').map((voice) => {
                  const locked = !entitlements.voices.b.includes(voice.name);
                  const active = voiceB === voice.name;
                  return (
                    <button
                      key={voice.name}
                      onClick={() => !locked && setVoiceB(voice.name)}
                      disabled={loading || locked}
                      title={locked ? 'Upgrade to unlock this voice' : voice.desc}
                      className={`relative flex flex-col items-start rounded-xl border px-2.5 py-2 text-left transition-all ${
                        locked
                          ? 'cursor-not-allowed ghost-border opacity-40'
                          : active
                            ? 'border-primary/50 bg-primary/10 text-primary'
                            : 'ghost-border text-on-surface-variant hover:border-outline hover:text-on-surface'
                      }`}
                    >
                      {locked && (
                        <span className="absolute right-1.5 top-1.5 material-symbols-outlined text-[10px] text-on-surface-variant/50" aria-hidden="true">lock</span>
                      )}
                      <span className="text-[0.6rem] font-bold leading-tight">{voice.name.split(' (')[0]}</span>
                      <span className="mt-0.5 text-[0.5rem] leading-tight opacity-60">{voice.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {errorKind?.type === 'auth' && (
          <div className="animate-in slide-in-from-top-2 flex flex-col items-start justify-between gap-3 rounded-xl bg-surface-container-low p-4 ghost-border duration-300 sm:flex-row sm:items-center">
            <p className="flex items-center gap-2 text-sm font-medium text-on-surface">
              <span className="material-symbols-outlined text-base text-primary" aria-hidden="true">lock</span>
              Sign in to generate podcasts — it&apos;s free
            </p>
            <div className="flex flex-shrink-0 gap-2">
              <SignInButton mode="modal">
                <button className="rounded-lg px-3 py-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant transition-colors hover:text-primary ghost-border">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="rounded-lg bg-primary px-4 py-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-on-primary transition-all hover:opacity-90">
                  Start free
                </button>
              </SignUpButton>
            </div>
          </div>
        )}

        {errorKind?.type === 'limit' && (
          <div className="animate-in slide-in-from-top-2 flex flex-col items-start justify-between gap-3 rounded-xl bg-surface-container-low p-4 ghost-border duration-300 sm:flex-row sm:items-center">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-on-surface">
                <span className="material-symbols-outlined text-base text-primary" aria-hidden="true">upgrade</span>
                {getPlanDefinition(errorKind.plan).name} tokens are nearly exhausted
              </p>
              <p className="mt-0.5 text-xs text-on-surface-variant">
                {errorKind.tokensRemaining} tokens left out of {errorKind.tokenBudget} this month.
              </p>
            </div>
            <Link
              href="/pricing"
              className="flex-shrink-0 rounded-lg bg-primary px-4 py-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-on-primary transition-all hover:opacity-90"
            >
              Upgrade →
            </Link>
          </div>
        )}

        {errorKind?.type === 'message' && (
          <p className="animate-in slide-in-from-top-1 flex items-center gap-1.5 text-xs font-medium text-red-400 duration-300">
            <span className="material-symbols-outlined text-sm" aria-hidden="true">error</span>
            {errorKind.text}
          </p>
        )}
      </div>
    </>
  );
}
