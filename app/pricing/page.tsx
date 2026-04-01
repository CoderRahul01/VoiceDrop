'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { SignUpButton, useAuth, useUser } from '@clerk/nextjs';
import TopAppBar from '@/components/TopAppBar';
import Footer from '@/components/Footer';
import { PLANS, resolvePlan } from '@/lib/plans';

function SuccessBanner() {
  const params = useSearchParams();
  if (params.get('success') !== '1') return null;

  return (
    <div className="animate-in slide-in-from-top-2 mx-auto mb-6 flex max-w-2xl items-center gap-3 rounded-xl border border-primary/30 bg-primary/8 p-4 duration-500">
      <span className="material-symbols-outlined text-primary" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
      <p className="text-sm font-medium text-on-surface">Payment successful — your plan is now active.</p>
    </div>
  );
}

function PlanCards({ onSubscribe }: { onSubscribe: () => void }) {
  const { isSignedIn, has } = useAuth();
  const { user } = useUser();
  const couponPlan = user?.publicMetadata?.couponPlan as string | undefined;
  const activePlan = resolvePlan((params) => Boolean(has?.(params)), couponPlan);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {PLANS.map((plan) => {
        const isActive = activePlan === plan.id;
        return (
          <div
            key={plan.id}
            className={`relative flex flex-col rounded-2xl p-5 transition-all duration-300 ${
              plan.highlighted
                ? 'border-2 border-primary/50 bg-surface-container shadow-[0_0_32px_rgba(104,219,174,0.12)]'
                : 'bg-surface-container-low ghost-border hover:border-outline'
            }`}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[0.6rem] font-extrabold uppercase tracking-widest text-on-primary whitespace-nowrap">
                Most popular
              </div>
            )}
            {isActive && (
              <div className="absolute -top-3 right-4 rounded-full bg-secondary-container px-3 py-1 text-[0.6rem] font-extrabold uppercase tracking-widest text-on-secondary-container">
                Active
              </div>
            )}

            <div className="mb-4 flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${plan.highlighted ? 'bg-primary/15' : 'bg-surface-container-highest'}`}>
                <span className="material-symbols-outlined text-base text-primary" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {plan.id === 'free' ? 'bolt' : plan.id === 'starter' ? 'local_fire_department' : plan.id === 'pro' ? 'rocket_launch' : 'domain'}
                </span>
              </div>
              <span className="font-bold text-on-surface">{plan.name}</span>
            </div>

            <div className="mb-1">
              <span className="text-3xl font-extrabold tracking-tight text-on-surface">
                {plan.price === null ? 'Custom' : `$${plan.price}`}
              </span>
              <span className="ml-1 text-xs text-on-surface-variant">
                {plan.price === null ? '' : '/month'}
              </span>
            </div>
            <p className="mb-1 text-xs font-semibold text-primary">{plan.tokenLabel}</p>
            <p className="mb-5 text-xs leading-relaxed text-on-surface-variant">{plan.tagline}</p>

            <ul className="mb-6 flex-grow space-y-2.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined mt-0.5 flex-shrink-0 text-primary" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                    check_circle
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            {isActive ? (
              <div className="rounded-xl py-2 text-center text-[0.65rem] font-bold uppercase tracking-widest text-primary ghost-border">
                Current plan
              </div>
            ) : plan.id === 'free' ? (
              isSignedIn ? (
                <Link
                  href="/"
                  className="block rounded-xl py-2.5 text-center text-[0.65rem] font-bold uppercase tracking-widest text-on-surface-variant transition-all hover:text-on-surface ghost-border"
                >
                  Start generating →
                </Link>
              ) : (
                <SignUpButton mode="modal">
                  <button className="w-full rounded-xl py-2.5 text-[0.65rem] font-bold uppercase tracking-widest text-on-surface-variant transition-all hover:text-on-surface ghost-border">
                    Get started free →
                  </button>
                </SignUpButton>
              )
            ) : (
              <button
                onClick={onSubscribe}
                className={`rounded-xl py-2.5 text-[0.65rem] font-bold uppercase tracking-widest transition-all ${
                  plan.highlighted
                    ? 'bg-primary text-on-primary shadow-[0_4px_16px_rgba(104,219,174,0.25)] hover:opacity-90'
                    : 'text-on-surface-variant hover:border-outline hover:text-on-surface ghost-border'
                }`}
              >
                Subscribe →
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PricingPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-on-surface">
      <TopAppBar />

      <main className="flex-grow px-4 pb-24 pt-28">
        <Suspense fallback={null}><SuccessBanner /></Suspense>

        <section className="mx-auto max-w-2xl space-y-4 py-10 text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-surface-container px-3 py-1 ghost-border">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
            <span className="text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-on-surface-variant">
              Unified access by plan
            </span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
            Pay for usage that actually maps to value
          </h1>
          <p className="text-base leading-relaxed text-on-surface-variant">
            Every plan unlocks more voices, tones, duration, and a larger monthly token budget. Higher tiers inherit everything below them automatically.
          </p>
        </section>

        <div className="mx-auto mb-16 max-w-5xl">
          <PlanCards onSubscribe={() => router.push('/checkout')} />
        </div>

        <section className="mx-auto mt-8 max-w-2xl space-y-6">
          <h2 className="text-center text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-primary">
            Common questions
          </h2>
          <div className="space-y-3">
            {[
              { q: 'What are tokens?', a: 'Tokens are your monthly generation budget. Each episode burns tokens based on AI plus actual TTS usage.' },
              { q: 'Do unused tokens roll over?', a: 'No. Token budgets reset monthly so usage stays predictable and fair across plans.' },
              { q: 'Do higher tiers include lower-tier benefits?', a: 'Yes. Starter includes Free, Pro includes Starter, and Enterprise includes everything in Pro plus enterprise features.' },
              { q: 'What happens when I run out?', a: 'Generation stops server-side and the app prompts you to upgrade before creating another episode.' },
              { q: 'Do upgrades unlock features immediately?', a: 'Yes. As soon as your plan changes, the same entitlement rules update both the UI and backend checks.' },
            ].map(({ q, a }) => (
              <details key={q} className="rounded-xl bg-surface-container-low ghost-border group">
                <summary className="list-none cursor-pointer select-none px-5 py-4 text-sm font-bold text-on-surface flex items-center justify-between">
                  {q}
                  <span className="material-symbols-outlined text-base text-on-surface-variant transition-transform group-open:rotate-180" aria-hidden="true">
                    expand_more
                  </span>
                </summary>
                <p className="px-5 pb-4 text-sm leading-relaxed text-on-surface-variant">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="mt-12 space-y-3 text-center">
          <p className="text-sm text-on-surface-variant">
            Have a question?{' '}
            <a href="mailto:hello@voicedrop.ai" className="text-primary hover:underline underline-offset-2">Email us</a>
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant transition-colors hover:text-primary"
          >
            <span className="material-symbols-outlined text-sm" aria-hidden="true">arrow_back</span>
            Back to generator
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
