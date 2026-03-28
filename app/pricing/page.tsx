'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PricingTable, SignUpButton, useAuth, useUser } from '@clerk/nextjs';
import TopAppBar from '@/components/TopAppBar';
import Footer from '@/components/Footer';
import CouponInput from '@/components/CouponInput';

// ─── Plan config ─────────────────────────────────────────────────────────────

interface PlanConfig {
  slug: string;
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  highlight: boolean;
  badge?: string;
  icon: string;
}

const PLANS: PlanConfig[] = [
  {
    slug: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    tagline: 'Try it out, no card needed.',
    icon: 'bolt',
    highlight: false,
    features: [
      '3 podcast episodes / month',
      '2 AI voices (Sarah + James)',
      'HD audio download',
      'Full transcript included',
    ],
  },
  {
    slug: 'starter',
    name: 'Starter',
    price: '$7',
    period: '/month',
    tagline: 'For weekly readers who want an edge.',
    icon: 'local_fire_department',
    highlight: false,
    features: [
      '20 episodes / month',
      'All 6 AI voice personalities',
      'HD audio + full transcript',
      'Custom podcast tone',
    ],
  },
  {
    slug: 'pro',
    name: 'Pro',
    price: '$19',
    period: '/month',
    tagline: 'For founders who never stop reading.',
    icon: 'rocket_launch',
    highlight: true,
    badge: 'Most popular',
    features: [
      '50 episodes / month',
      'All 6 AI voices + priority TTS',
      'HD audio + full transcript',
      'All podcast tones',
      'Shareable episode links',
    ],
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    price: '$100',
    period: '/month',
    tagline: 'For teams that run on information.',
    icon: 'domain',
    highlight: false,
    features: [
      'Unlimited episodes',
      'All 6 AI voices + priority TTS',
      'Bulk generation API',
      'Custom voices (voice clone)',
      'White-label output',
      'Email support',
    ],
  },
];

// ─── Checkout modal ───────────────────────────────────────────────────────────

function CheckoutModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(8,13,11,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Subscribe to a plan"
    >
      <div className="bg-surface-container-low w-full sm:max-w-5xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl ghost-border animate-in slide-in-from-bottom-4 sm:fade-in sm:zoom-in-95 duration-300">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 sticky top-0 bg-surface-container-low z-10">
          <div>
            <p className="text-[0.6875rem] uppercase tracking-[0.08em] font-bold text-primary">Subscribe</p>
            <p className="text-xs text-on-surface-variant mt-0.5">Secured by Clerk &amp; Stripe · Cancel any time</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg ghost-border text-on-surface-variant hover:text-on-surface transition-colors"
            aria-label="Close checkout"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
          </button>
        </div>

        {/* Clerk PricingTable inside modal */}
        <div className="p-6">
          <PricingTable
            for="user"
            ctaPosition="bottom"
            newSubscriptionRedirectUrl="/pricing?success=1"
            appearance={{
              cssLayerName: 'clerk',
              variables: {
                colorPrimary: '#68dbae',
                colorBackground: '#141a17',
                colorText: '#dee4de',
                colorTextSecondary: '#b9c8be',
                colorNeutral: '#dee4de',
                colorInputBackground: '#1e2622',
                colorInputText: '#dee4de',
                colorShimmer: 'transparent',
                borderRadius: '0.75rem',
                fontFamily: 'Inter, ui-sans-serif, system-ui',
                fontSize: '14px',
              },
              elements: {
                pricingTable: { background: 'transparent' },
                pricingTableCard: { backgroundColor: '#141a17', border: '1px solid rgba(58,70,66,0.6)', color: '#dee4de' },
                pricingTableCardTitle: { color: '#dee4de', fontWeight: '800' },
                pricingTableCardDescription: { color: '#8eada1' },
                pricingTableCardPrice: { color: '#dee4de' },
                pricingTableCardFeatureItem: { color: '#b9c8be' },
                pricingTableCardFeatureIcon: { color: '#68dbae' },
                pricingTableCardCta: { fontWeight: '700' },
              },
            }}
          />
        </div>

        <div className="px-6 pb-6 text-center">
          <CouponInput />
        </div>
      </div>
    </div>
  );
}

// ─── Success banner ───────────────────────────────────────────────────────────

function SuccessBanner() {
  const params = useSearchParams();
  if (params.get('success') !== '1') return null;
  return (
    <div className="max-w-2xl mx-auto mb-6 p-4 bg-primary/8 border border-primary/30 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
      <span className="material-symbols-outlined text-primary" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
      <p className="text-sm font-medium text-on-surface">Payment successful — your plan is now active. Welcome aboard! 🎉</p>
    </div>
  );
}

// ─── Plan cards ──────────────────────────────────────────────────────────────

function PlanCards({ onSubscribe }: { onSubscribe: () => void }) {
  const { isSignedIn, has } = useAuth();
  const { user } = useUser();
  const couponPlan = user?.publicMetadata?.couponPlan as string | undefined;
  const activePlan =
    has?.({ plan: 'enterprise' }) || couponPlan === 'enterprise' ? 'enterprise' :
    has?.({ plan: 'pro' })        || couponPlan === 'pro'        ? 'pro' :
    has?.({ plan: 'starter' })    || couponPlan === 'starter'    ? 'starter' :
    'free';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {PLANS.map((plan) => {
        const isActive = activePlan === plan.slug;
        return (
          <div
            key={plan.slug}
            className={`relative flex flex-col rounded-2xl p-5 transition-all duration-300 ${
              plan.highlight
                ? 'bg-surface-container border-2 border-primary/50 shadow-[0_0_32px_rgba(104,219,174,0.12)]'
                : 'bg-surface-container-low ghost-border hover:border-outline'
            }`}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-[0.6rem] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap">
                {plan.badge}
              </div>
            )}
            {isActive && (
              <div className="absolute -top-3 right-4 bg-secondary-container text-on-secondary-container text-[0.6rem] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">
                Active
              </div>
            )}

            <div className="flex items-center gap-2 mb-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${plan.highlight ? 'bg-primary/15' : 'bg-surface-container-highest'}`}>
                <span className="material-symbols-outlined text-primary text-base" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {plan.icon}
                </span>
              </div>
              <span className="font-bold text-on-surface">{plan.name}</span>
            </div>

            <div className="mb-1">
              <span className="text-3xl font-extrabold text-on-surface tracking-tight">{plan.price}</span>
              <span className="text-on-surface-variant text-xs ml-1">{plan.period}</span>
            </div>
            <p className="text-on-surface-variant text-xs leading-relaxed mb-5">{plan.tagline}</p>

            <ul className="space-y-2.5 flex-grow mb-6">
              {plan.features.map((feat) => (
                <li key={feat} className="flex items-start gap-2 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary flex-shrink-0 mt-0.5" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                    check_circle
                  </span>
                  {feat}
                </li>
              ))}
            </ul>

            {/* CTA */}
            {isActive ? (
              <div className="text-center py-2 text-[0.65rem] uppercase tracking-widest font-bold text-primary ghost-border rounded-xl">
                Current plan
              </div>
            ) : plan.slug === 'free' ? (
              isSignedIn ? (
                <Link
                  href="/"
                  className="block text-center py-2.5 rounded-xl text-[0.65rem] uppercase tracking-widest font-bold ghost-border text-on-surface-variant hover:text-on-surface transition-all"
                >
                  Start generating →
                </Link>
              ) : (
                <SignUpButton mode="modal">
                  <button className="w-full py-2.5 rounded-xl text-[0.65rem] uppercase tracking-widest font-bold ghost-border text-on-surface-variant hover:text-on-surface transition-all">
                    Get started free →
                  </button>
                </SignUpButton>
              )
            ) : (
              <button
                onClick={onSubscribe}
                className={`py-2.5 rounded-xl text-[0.65rem] uppercase tracking-widest font-bold transition-all ${
                  plan.highlight
                    ? 'bg-primary text-on-primary hover:opacity-90 shadow-[0_4px_16px_rgba(104,219,174,0.25)]'
                    : 'ghost-border text-on-surface-variant hover:text-on-surface hover:border-outline'
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-sans">
      <TopAppBar />

      {checkoutOpen && <CheckoutModal onClose={() => setCheckoutOpen(false)} />}

      <main className="pt-28 pb-24 px-4 flex-grow">
        <Suspense fallback={null}><SuccessBanner /></Suspense>

        {/* Header */}
        <section className="text-center space-y-4 py-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container ghost-border mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
            <span className="text-[0.6875rem] uppercase tracking-[0.05em] font-medium text-on-surface-variant">
              Simple, transparent pricing
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface">
            Turn articles into podcasts —<br />
            <span className="text-primary">at every scale</span>
          </h1>
          <p className="text-on-surface-variant text-base leading-relaxed">
            Start free. No credit card required. Upgrade when you need more.
          </p>
        </section>

        {/* Plan cards */}
        <div className="max-w-5xl mx-auto mb-16">
          <PlanCards onSubscribe={() => setCheckoutOpen(true)} />
        </div>

        {/* FAQ */}
        <section className="max-w-2xl mx-auto mt-8 space-y-6">
          <h2 className="text-center text-[0.6875rem] uppercase tracking-[0.05em] font-bold text-primary">
            Common questions
          </h2>
          <div className="space-y-3">
            {[
              { q: 'What counts as one podcast?', a: 'Each URL you convert counts as one episode, regardless of length.' },
              { q: 'Do unused podcasts roll over?', a: 'No — your quota resets on the 1st of each month.' },
              { q: 'Can I change plans any time?', a: 'Yes. Upgrades take effect immediately; downgrades at the next billing cycle.' },
              { q: 'What payment methods do you accept?', a: 'All major cards via Stripe, managed securely by Clerk Billing.' },
              { q: 'Do you have promo codes?', a: 'Yes! Try LAUNCH50 for Pro or HACKATHON for Starter. Click Subscribe and enter the code inside checkout.' },
            ].map(({ q, a }) => (
              <details key={q} className="bg-surface-container-low ghost-border rounded-xl group">
                <summary className="px-5 py-4 cursor-pointer flex items-center justify-between font-bold text-sm text-on-surface select-none list-none">
                  {q}
                  <span className="material-symbols-outlined text-on-surface-variant group-open:rotate-180 transition-transform text-base" aria-hidden="true">
                    expand_more
                  </span>
                </summary>
                <p className="px-5 pb-4 text-on-surface-variant text-sm leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <div className="text-center mt-12 space-y-3">
          <p className="text-on-surface-variant text-sm">
            Have a question?{' '}
            <a href="mailto:hello@voicedrop.ai" className="text-primary hover:underline underline-offset-2">Email us</a>
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
