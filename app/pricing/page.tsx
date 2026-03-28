'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PricingTable } from '@clerk/nextjs';
import TopAppBar from '@/components/TopAppBar';
import Footer from '@/components/Footer';
import CouponInput from '@/components/CouponInput';

export default function PricingPage() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success') === '1';

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-sans">
      <TopAppBar />

      <main className="pt-28 pb-24 px-4 flex-grow">
        {/* Post-checkout success banner */}
        {success && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-primary/10 border border-primary/40 rounded-xl flex items-center gap-3">
            <span
              className="material-symbols-outlined text-primary"
              aria-hidden="true"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            <p className="text-sm font-medium text-on-surface">
              Payment successful — your plan is now active. Welcome aboard!
            </p>
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

        {/* Clerk-managed pricing table — reads plans from your Clerk Dashboard */}
        <div className="max-w-6xl mx-auto mt-4">
          <PricingTable
            for="user"
            ctaPosition="bottom"
            newSubscriptionRedirectUrl="/pricing?success=1"
            appearance={{
              cssLayerName: 'clerk',
              variables: {
                colorPrimary: '#68dbae',
                colorBackground: '#1b211e',
                colorText: '#e8f5f0',
                colorTextSecondary: '#8eada1',
                colorNeutral: '#2e3d36',
                colorInputBackground: '#232e28',
                colorInputText: '#e8f5f0',
                borderRadius: '0.75rem',
                fontFamily: 'var(--font-inter), sans-serif',
              },
            }}
          />
        </div>

        {/* Coupon / promo code redemption */}
        <CouponInput />

        {/* FAQ / trust signals */}
        <section className="max-w-2xl mx-auto mt-20 space-y-8">
          <h2 className="text-center text-[0.6875rem] uppercase tracking-[0.05em] font-bold text-primary">
            Common questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: 'What counts as one podcast?',
                a: 'Each URL you convert counts as one podcast episode, regardless of article length or audio duration.',
              },
              {
                q: 'Do unused podcasts roll over?',
                a: "No — your quota resets on the first of each month.",
              },
              {
                q: 'Can I change plans any time?',
                a: 'Yes. Upgrades take effect immediately. Downgrades take effect at the start of your next billing cycle.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'All major cards via Stripe, managed securely by Clerk Billing.',
              },
              {
                q: 'Is my payment data safe?',
                a: 'Yes — Clerk Billing uses Stripe under the hood. VoiceDrop never stores card details.',
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
            Have a question?{' '}
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
