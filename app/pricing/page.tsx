'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { SignUpButton, useUser } from '@clerk/nextjs';
import { PLANS, type Plan, type PlanId } from '@/lib/plans';
import TopAppBar from '@/components/TopAppBar';
import Footer from '@/components/Footer';

function CheckIcon() {
  return (
    <span className="material-symbols-outlined text-primary text-base" aria-hidden="true"
      style={{ fontVariationSettings: "'FILL' 1" }}>
      check_circle
    </span>
  );
}

function CrossIcon() {
  return (
    <span className="material-symbols-outlined text-on-surface-variant/30 text-base" aria-hidden="true">
      cancel
    </span>
  );
}

function PlanCard({ plan, userPlan }: { plan: Plan; userPlan: string }) {
  const { isSignedIn } = useUser();
  const isCurrent = userPlan === plan.id;
  const isHighlighted = plan.highlighted;
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleCheckout = useCallback(async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setCheckoutLoading(false);
    }
  }, [plan.id]);

  return (
    <div
      className={`relative flex flex-col rounded-2xl p-6 space-y-6 transition-all
        ${isHighlighted
          ? 'bg-primary-container/10 border border-primary/40 shadow-[0_0_40px_-8px_rgba(104,219,174,0.15)]'
          : 'bg-surface-container-low ghost-border'
        }`}
    >
      {/* Most popular badge */}
      {isHighlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-on-primary text-[0.6rem] uppercase tracking-widest font-bold px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}

      {/* Current plan badge */}
      {isCurrent && (
        <div className="absolute -top-3 right-4">
          <span className="bg-secondary-container text-on-secondary-container text-[0.6rem] uppercase tracking-widest font-bold px-3 py-1 rounded-full">
            Current Plan
          </span>
        </div>
      )}

      {/* Header */}
      <div>
        <p className="text-[0.6875rem] uppercase tracking-[0.05em] font-bold text-primary mb-1">
          {plan.name}
        </p>
        <div className="flex items-end gap-1.5 mb-1">
          {plan.price === null ? (
            <span className="text-3xl font-extrabold tracking-tight text-on-surface">Custom</span>
          ) : plan.price === 0 ? (
            <span className="text-3xl font-extrabold tracking-tight text-on-surface">Free</span>
          ) : (
            <>
              <span className="text-3xl font-extrabold tracking-tight text-on-surface">${plan.price}</span>
              <span className="text-on-surface-variant text-sm mb-1">/ month</span>
            </>
          )}
        </div>
        <p className="text-on-surface-variant text-sm">{plan.tagline}</p>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface-container ghost-border rounded-lg p-3 text-center">
          <p className="text-primary font-extrabold text-lg leading-none">
            {plan.podcastsPerMonth === Infinity ? '∞' : plan.podcastsPerMonth}
          </p>
          <p className="text-[0.6rem] uppercase tracking-widest text-on-surface-variant mt-1">
            Podcasts / mo
          </p>
        </div>
        <div className="bg-surface-container ghost-border rounded-lg p-3 text-center">
          <p className="text-primary font-extrabold text-lg leading-none">
            {plan.voices === 0 ? '∞' : plan.voices}
          </p>
          <p className="text-[0.6rem] uppercase tracking-widest text-on-surface-variant mt-1">
            AI Voices
          </p>
        </div>
      </div>

      {/* Feature list */}
      <ul className="space-y-2.5 flex-grow">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-on-surface">
            <CheckIcon />
            <span>{feature}</span>
          </li>
        ))}
        {/* Stub out features higher tiers have */}
        {plan.id === 'free' && (
          <>
            <li className="flex items-start gap-2.5 text-sm text-on-surface-variant/40">
              <CrossIcon /><span>Shareable links</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm text-on-surface-variant/40">
              <CrossIcon /><span>Priority processing</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm text-on-surface-variant/40">
              <CrossIcon /><span>API access</span>
            </li>
          </>
        )}
        {plan.id === 'starter' && (
          <>
            <li className="flex items-start gap-2.5 text-sm text-on-surface-variant/40">
              <CrossIcon /><span>Priority processing</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm text-on-surface-variant/40">
              <CrossIcon /><span>API access</span>
            </li>
          </>
        )}
        {plan.id === 'pro' && (
          <li className="flex items-start gap-2.5 text-sm text-on-surface-variant/40">
            <CrossIcon /><span>API access</span>
          </li>
        )}
      </ul>

      {/* CTA */}
      <div className="pt-2">
        {isCurrent ? (
          <div className="w-full py-3 text-center text-[0.6875rem] uppercase tracking-widest font-bold text-on-surface-variant ghost-border rounded-xl">
            Current Plan
          </div>
        ) : plan.id === 'enterprise' ? (
          <a
            href="mailto:hello@voicedrop.ai"
            className="block w-full py-3 text-center text-[0.6875rem] uppercase tracking-widest font-bold ghost-border rounded-xl text-on-surface hover:text-primary hover:border-primary/40 transition-colors"
          >
            {plan.cta}
          </a>
        ) : !isSignedIn ? (
          <SignUpButton mode="modal">
            <button
              className={`w-full py-3 text-[0.6875rem] uppercase tracking-widest font-bold rounded-xl transition-all active:scale-95
                ${isHighlighted
                  ? 'bg-primary text-on-primary hover:opacity-90'
                  : 'ghost-border text-on-surface hover:text-primary hover:border-primary/40'
                }`}
            >
              {plan.cta}
            </button>
          </SignUpButton>
        ) : plan.id === 'free' ? (
          <Link
            href="/"
            className="block w-full py-3 text-center text-[0.6875rem] uppercase tracking-widest font-bold rounded-xl transition-all active:scale-95 ghost-border text-on-surface hover:text-primary hover:border-primary/40"
          >
            Start Generating
          </Link>
        ) : (
          <button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            className={`w-full py-3 text-[0.6875rem] uppercase tracking-widest font-bold rounded-xl transition-all active:scale-95 disabled:opacity-60 disabled:scale-100
              ${isHighlighted
                ? 'bg-primary text-on-primary hover:opacity-90'
                : 'ghost-border text-on-surface hover:text-primary hover:border-primary/40'
              }`}
          >
            {checkoutLoading ? 'Redirecting...' : plan.cta}
          </button>
        )}
      </div>
    </div>
  );
}

export default function PricingPage() {
  const { user } = useUser();
  const userPlan = (user?.publicMetadata?.plan as string) ?? 'free';
  const searchParams = useSearchParams();
  const success = searchParams.get('success') === '1';
  const cancelled = searchParams.get('cancelled') === '1';

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-sans">
      <TopAppBar />

      <main className="pt-28 pb-24 px-4 flex-grow">
        {/* Post-checkout banners */}
        {success && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-primary/10 border border-primary/40 rounded-xl flex items-center gap-3">
            <span className="material-symbols-outlined text-primary" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <p className="text-sm font-medium text-on-surface">
              Payment successful! Your plan has been upgraded. Welcome aboard.
            </p>
          </div>
        )}
        {cancelled && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-surface-container ghost-border rounded-xl flex items-center gap-3">
            <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">info</span>
            <p className="text-sm text-on-surface-variant">Checkout was cancelled — no charge was made.</p>
          </div>
        )}

        {/* Header */}
        <section className="text-center space-y-4 py-12 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high ghost-border mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
            <span className="text-[0.6875rem] uppercase tracking-[0.05em] font-medium text-on-surface-variant">
              Simple, transparent pricing
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface">
            Turn articles into podcasts —<br />
            <span className="text-primary">at every scale</span>
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed">
            Start free. No credit card required. Upgrade when you need more.
          </p>
        </section>

        {/* Plan cards */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} userPlan={userPlan} />
          ))}
        </div>

        {/* FAQ / trust signals */}
        <section className="max-w-2xl mx-auto mt-20 space-y-8">
          <h2 className="text-center text-[0.6875rem] uppercase tracking-[0.05em] font-bold text-primary">
            Common questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: 'What counts as one podcast?',
                a: 'Each URL you convert counts as one podcast episode, regardless of article length or duration.',
              },
              {
                q: 'Do unused podcasts roll over?',
                a: "No — your quota resets on the first of each month. We're working on rollover for annual plans.",
              },
              {
                q: 'Can I change plans any time?',
                a: 'Yes. Upgrades take effect immediately. Downgrades take effect at the start of your next billing cycle.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'All major cards via Stripe. Bank transfer available for Enterprise plans.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="bg-surface-container-low ghost-border rounded-xl p-5 space-y-2">
                <p className="font-bold text-on-surface text-sm">{q}</p>
                <p className="text-on-surface-variant text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <div className="text-center mt-16 space-y-4">
          <p className="text-on-surface-variant text-sm">
            Have a question? {' '}
            <a href="mailto:hello@voicedrop.ai" className="text-primary hover:underline underline-offset-2">
              Email us
            </a>
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[0.6875rem] uppercase tracking-widest font-bold text-on-surface-variant hover:text-primary transition-colors"
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
