'use client';

import Link from 'next/link';
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';

export default function TopAppBar() {
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
              <button className="text-[0.6875rem] uppercase tracking-[0.05em] font-bold text-on-surface-variant hover:text-primary transition-colors px-3 py-1.5">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="bg-primary text-on-primary text-[0.6875rem] uppercase tracking-[0.05em] font-bold px-4 py-1.5 rounded-lg hover:opacity-90 active:scale-95 transition-all">
                Get Started
              </button>
            </SignUpButton>
          </Show>

          {/* Auth — signed in */}
          <Show when="signed-in">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8',
                },
              }}
            />
          </Show>
        </div>
      </div>
    </header>
  );
}
