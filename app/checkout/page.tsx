'use client';

import Link from 'next/link';
import { PricingTable } from '@clerk/nextjs';

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal header */}
      <header className="w-full px-6 py-5 flex items-center justify-between border-b border-outline-variant/20">
        <Link href="/" className="flex items-center gap-2 hover:opacity-75 transition-opacity">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px' }} aria-hidden="true">
            settings_voice
          </span>
          <span className="text-lg font-extrabold tracking-tighter text-primary">VoiceDrop</span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-widest font-bold text-on-surface-variant/60">
            <span className="material-symbols-outlined text-sm text-primary/60" aria-hidden="true">lock</span>
            Secured by Stripe
          </div>
          <Link
            href="/pricing"
            className="text-[0.65rem] uppercase tracking-widest font-bold text-on-surface-variant hover:text-on-surface transition-colors"
          >
            ← Back
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow flex flex-col items-center justify-start px-4 py-12 max-w-5xl mx-auto w-full">
        {/* Section label */}
        <div className="text-center mb-10 space-y-2">
          <p className="text-[0.65rem] uppercase tracking-[0.12em] font-bold text-primary">Choose your plan</p>
          <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">
            Select a plan to complete checkout
          </h1>
          <p className="text-on-surface-variant text-sm">
            All plans include a free tier. Upgrade or cancel any time.
          </p>
        </div>

        {/* Clerk PricingTable — full width, clean */}
        <div className="w-full">
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
                pricingTableCard: {
                  backgroundColor: '#141a17',
                  border: '1px solid rgba(58,70,66,0.6)',
                  color: '#dee4de',
                  borderRadius: '1rem',
                },
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

        {/* Promo code — minimal */}
        <div className="mt-10 w-full max-w-md mx-auto text-center space-y-3">
          <p className="text-[0.65rem] uppercase tracking-widest font-bold text-on-surface-variant/50">
            Have a promo code?
          </p>
          <div className="flex gap-2">
            <input
              id="promo-inline"
              className="flex-grow bg-surface-container-low ghost-border rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary outline-none"
              placeholder="e.g. LAUNCH50"
              type="text"
              style={{ textTransform: 'uppercase' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const input = e.currentTarget;
                  redeemCode(input.value, input);
                }
              }}
            />
            <button
              className="bg-surface-container ghost-border text-on-surface text-[0.65rem] uppercase tracking-widest font-bold px-4 py-2.5 rounded-xl hover:bg-surface-container-high transition-colors"
              onClick={(e) => {
                const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                redeemCode(input.value, input);
              }}
            >
              Apply
            </button>
          </div>
          <p id="promo-status" className="text-xs text-on-surface-variant/60 min-h-[1.25rem]" aria-live="polite" />
        </div>
      </main>

      {/* Footer strip */}
      <footer className="w-full py-4 border-t border-outline-variant/20 text-center">
        <p className="text-[0.6rem] uppercase tracking-widest text-on-surface-variant/40">
          © 2026 VoiceDrop · Payments powered by Stripe · Managed by Clerk
        </p>
      </footer>
    </div>
  );
}

// Inline promo-code redemption (no full CouponInput component needed here)
async function redeemCode(rawCode: string, input: HTMLInputElement) {
  const code = rawCode.trim().toUpperCase();
  const status = document.getElementById('promo-status');
  if (!status) return;
  if (!code) { status.textContent = 'Please enter a code.'; return; }

  status.textContent = 'Redeeming…';
  try {
    const res = await fetch('/api/coupon/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (data.success) {
      status.textContent = `✓ Code applied — ${data.plan} plan unlocked!`;
      status.style.color = '#68dbae';
      input.value = '';
      setTimeout(() => { window.location.href = '/pricing?success=1'; }, 1500);
    } else {
      status.textContent = data.error ?? 'Invalid code.';
      status.style.color = '#f87171';
    }
  } catch {
    status.textContent = 'Network error — please try again.';
    status.style.color = '#f87171';
  }
}
