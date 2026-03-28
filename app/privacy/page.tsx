import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | VoiceDrop',
  description: 'Privacy Policy for VoiceDrop by Anteratic Solutions',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Minimal header */}
      <header className="w-full px-6 py-5 flex items-center justify-between border-b border-outline-variant/20">
        <Link href="/" className="flex items-center gap-2 hover:opacity-75 transition-opacity">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px' }} aria-hidden="true">settings_voice</span>
          <span className="text-lg font-extrabold tracking-tighter text-primary">VoiceDrop</span>
        </Link>
        <Link href="/" className="text-[0.65rem] uppercase tracking-widest font-bold text-on-surface-variant hover:text-on-surface transition-colors">
          ← Back
        </Link>
      </header>

      <main className="flex-grow max-w-2xl mx-auto w-full px-6 py-12 space-y-8">
        <div className="space-y-2">
          <p className="text-[0.65rem] uppercase tracking-[0.12em] font-bold text-primary">Legal</p>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Privacy Policy</h1>
          <p className="text-on-surface-variant text-sm">Anteratic Solutions · Effective 29 March 2026</p>
        </div>

        <div className="prose-sm space-y-6 text-on-surface-variant leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-on-surface font-bold text-base">1. Who we are</h2>
            <p>
              VoiceDrop is a product of <strong className="text-on-surface">Anteratic Solutions</strong>, a technology startup. We build tools that help people consume information more efficiently through AI-generated audio.
            </p>
            <p>For privacy questions, email us at <a href="mailto:legal@anteratic.com" className="text-primary hover:underline">legal@anteratic.com</a>.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-on-surface font-bold text-base">2. What data we collect</h2>
            <p>We collect the minimum data necessary to provide the service:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong className="text-on-surface">Account information</strong> — your email address and name, managed entirely by Clerk (our authentication provider). We never see your password.</li>
              <li><strong className="text-on-surface">Usage counts</strong> — the number of podcasts you have generated in the current calendar month, stored as a counter in Clerk&apos;s secure metadata. Used to enforce plan limits.</li>
              <li><strong className="text-on-surface">Article URLs</strong> — the URLs you submit for podcast generation. These are fetched during processing and are not stored after the request completes.</li>
              <li><strong className="text-on-surface">Payment information</strong> — processed entirely by Stripe via Clerk Billing. We never see or store your card details.</li>
              <li><strong className="text-on-surface">Coupon codes</strong> — if you redeem a promotional code, we store the code and redemption timestamp in Clerk metadata.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-on-surface font-bold text-base">3. What we do NOT store</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Generated audio files — audio is returned inline to your browser and is never persisted on our servers.</li>
              <li>Article content — text extracted from URLs is held in memory only during generation and discarded immediately after.</li>
              <li>Transcripts — dialogue scripts are returned to your browser and not saved server-side.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-on-surface font-bold text-base">4. Third-party services</h2>
            <p>VoiceDrop uses the following third-party providers, each with their own privacy policies:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong className="text-on-surface">Clerk</strong> — authentication, user management, and billing</li>
              <li><strong className="text-on-surface">Stripe</strong> — payment processing (via Clerk Billing)</li>
              <li><strong className="text-on-surface">ElevenLabs</strong> — text-to-speech audio synthesis. Article-derived text is sent to ElevenLabs for voice generation.</li>
              <li><strong className="text-on-surface">Cloudflare Workers AI</strong> — AI dialogue generation. Article text is sent to Cloudflare for LLM processing.</li>
              <li><strong className="text-on-surface">Vercel</strong> — hosting and serverless compute.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-on-surface font-bold text-base">5. How we use your data</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>To authenticate you and manage your account</li>
              <li>To enforce your plan&apos;s monthly generation limits</li>
              <li>To process subscription payments</li>
              <li>We do not use your data for advertising, profiling, or selling to third parties</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-on-surface font-bold text-base">6. Your rights</h2>
            <p>You may delete your account at any time by going to <strong className="text-on-surface">Profile → Manage Account → Delete Account</strong> in the app. This removes all your data from Clerk&apos;s systems. For any other data requests, email <a href="mailto:legal@anteratic.com" className="text-primary hover:underline">legal@anteratic.com</a>.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-on-surface font-bold text-base">7. Cookies</h2>
            <p>Clerk sets a session cookie to keep you signed in. No third-party advertising or tracking cookies are used.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-on-surface font-bold text-base">8. Changes to this policy</h2>
            <p>We may update this policy as the product evolves. We will update the effective date above and, for significant changes, notify you by email.</p>
          </section>
        </div>
      </main>

      <footer className="w-full py-4 border-t border-outline-variant/20 text-center">
        <p className="text-[0.6rem] uppercase tracking-widest text-on-surface-variant/40">
          © 2026 Anteratic Solutions · <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
        </p>
      </footer>
    </div>
  );
}
