'use client';

import Link from 'next/link';
import { Show, SignInButton, SignUpButton, UserButton, useAuth, useUser } from '@clerk/nextjs';

const PLAN_BADGE: Record<string, { label: string; className: string }> = {
  starter:    { label: 'Starter', className: 'bg-secondary-container/60 text-on-secondary-container border-secondary-container' },
  pro:        { label: 'Pro',     className: 'bg-primary/10 text-primary border-primary/30' },
  enterprise: { label: 'Elite',  className: 'bg-[rgba(219,114,107,0.12)] text-[#db726b] border-[rgba(219,114,107,0.3)]' },
};

export default function TopAppBar() {
  const { has } = useAuth();
  const { user } = useUser();
  const couponPlan = user?.publicMetadata?.couponPlan as string | undefined;
  const activePaid =
    has?.({ plan: 'enterprise' }) || couponPlan === 'enterprise' ? 'enterprise' :
    has?.({ plan: 'pro' })        || couponPlan === 'pro'        ? 'pro' :
    has?.({ plan: 'starter' })    || couponPlan === 'starter'    ? 'starter' :
    null;
  const badge = activePaid ? PLAN_BADGE[activePaid] : null;

  return (
    <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-primary-container/20">
      <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span
            className="material-symbols-outlined text-primary"
            style={{ fontSize: '24px' }}
            aria-hidden="true"
          >
            settings_voice
          </span>
          <div className="text-2xl font-bold tracking-tighter text-primary">VoiceDrop</div>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Powered by badge — hide when signed in to save space */}
          <Show when="signed-out">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high border border-outline-variant/20">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
              <span className="text-[0.6875rem] uppercase tracking-[0.05em] font-medium text-on-surface-variant">
                Powered by ElevenLabs
              </span>
            </div>
          </Show>

          {/* Pricing link */}
          <Link
            href="/pricing"
            className="text-[0.6875rem] uppercase tracking-[0.05em] font-bold text-on-surface-variant hover:text-primary transition-colors hidden sm:block"
          >
            Pricing
          </Link>

          {/* Auth — signed out */}
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="text-[0.6875rem] uppercase tracking-[0.05em] font-bold text-on-surface-variant hover:text-primary transition-colors px-2 sm:px-3 py-1.5">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="bg-primary text-on-primary text-[0.6875rem] uppercase tracking-[0.05em] font-bold px-3 sm:px-4 py-1.5 rounded-lg hover:opacity-90 active:scale-95 transition-all whitespace-nowrap">
                Get Started
              </button>
            </SignUpButton>
          </Show>

          {/* Auth — signed in */}
          <Show when="signed-in">
            {badge && (
              <span className={`text-[0.5rem] uppercase tracking-widest font-extrabold px-2 py-0.5 rounded-full border ${badge.className}`}>
                {badge.label}
              </span>
            )}
            <UserButton
              appearance={{
                elements: { avatarBox: 'w-8 h-8' },
              }}
            />
          </Show>
        </div>
      </div>
    </header>
  );
}
