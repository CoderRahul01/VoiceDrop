'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import type { PlanId } from '@/lib/plans';

const PLAN_LABELS: Record<PlanId, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

export default function CouponInput() {
  const { user, isSignedIn } = useUser();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [grantedPlan, setGrantedPlan] = useState<PlanId | null>(null);

  // Already redeemed coupon
  const existingCoupon = user?.publicMetadata?.couponCode as string | undefined;
  const existingCouponPlan = user?.publicMetadata?.couponPlan as PlanId | undefined;

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/coupon/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (data.success) {
        setStatus('success');
        setGrantedPlan(data.plan);
        setMessage(`Coupon applied! You now have ${PLAN_LABELS[data.plan as PlanId]} access.`);
        setCode('');
        // Reload to reflect updated publicMetadata
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setStatus('error');
        setMessage(data.error ?? 'Invalid coupon code.');
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  if (!isSignedIn) return null;

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="bg-surface-container-low ghost-border rounded-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-primary text-xl"
            aria-hidden="true"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            local_activity
          </span>
          <div>
            <p className="text-[0.6875rem] uppercase tracking-widest font-bold text-primary">
              Promo code
            </p>
            <p className="text-on-surface-variant text-xs">
              Have a coupon? Unlock a paid plan instantly.
            </p>
          </div>
        </div>

        {/* Already redeemed */}
        {existingCoupon && existingCouponPlan && status !== 'success' && (
          <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/30 rounded-xl">
            <span
              className="material-symbols-outlined text-primary text-sm"
              aria-hidden="true"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            <p className="text-xs text-on-surface">
              Code <span className="font-mono font-bold text-primary">{existingCoupon}</span> active
              {' '}— {PLAN_LABELS[existingCouponPlan]} access granted.
            </p>
          </div>
        )}

        {/* Input row */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter code (e.g. LAUNCH50)"
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setStatus('idle'); }}
            onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
            disabled={status === 'loading' || status === 'success'}
            className="flex-grow bg-surface-container-highest ghost-border rounded-xl px-4 py-2.5 text-sm font-mono text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary outline-none transition-all uppercase tracking-widest disabled:opacity-50"
          />
          <button
            onClick={handleRedeem}
            disabled={!code.trim() || status === 'loading' || status === 'success'}
            className="bg-primary text-on-primary text-[0.6875rem] uppercase tracking-widest font-bold px-4 py-2.5 rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 whitespace-nowrap"
          >
            {status === 'loading' ? 'Checking…' : status === 'success' ? 'Applied ✓' : 'Redeem'}
          </button>
        </div>

        {/* Feedback */}
        {message && (
          <p
            className={`text-xs flex items-center gap-1.5 font-medium ${
              status === 'success' ? 'text-primary' : 'text-error'
            }`}
          >
            <span className="material-symbols-outlined text-sm" aria-hidden="true">
              {status === 'success' ? 'check_circle' : 'error'}
            </span>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
