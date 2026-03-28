import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full py-10 bg-background border-t border-primary-container/10 mt-auto">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex flex-col items-center md:items-start gap-0.5">
          <span className="text-[0.6875rem] font-extrabold tracking-tight text-on-surface-variant/70">
            VoiceDrop
          </span>
          <span className="text-[0.575rem] uppercase tracking-widest text-on-surface-variant/40">
            By Anteratic Solutions · Built with ElevenLabs + Cloudflare
          </span>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link
            href="/privacy"
            className="text-[0.6rem] uppercase tracking-widest font-medium text-on-surface-variant/50 hover:text-primary transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-[0.6rem] uppercase tracking-widest font-medium text-on-surface-variant/50 hover:text-primary transition-colors"
          >
            Terms
          </Link>
          <a
            href="mailto:support@anteratic.com"
            className="text-[0.6rem] uppercase tracking-widest font-medium text-on-surface-variant/50 hover:text-primary transition-colors"
          >
            Support
          </a>
          <Link
            href="/pricing"
            className="text-[0.6rem] uppercase tracking-widest font-medium text-on-surface-variant/50 hover:text-primary transition-colors"
          >
            Pricing
          </Link>
        </div>

        {/* Copyright */}
        <span className="text-[0.575rem] uppercase tracking-widest text-on-surface-variant/35">
          © 2026 Anteratic Solutions
        </span>
      </div>
    </footer>
  );
}
