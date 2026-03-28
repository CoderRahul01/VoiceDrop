export default function Footer() {
  return (
    <footer className="w-full py-12 bg-background border-t border-primary-container/10 mt-auto">
      <div className="flex flex-col md:flex-row justify-between items-center px-8 gap-4 max-w-7xl mx-auto">
        <span className="text-[0.6875rem] uppercase tracking-[0.05em] font-medium text-on-surface-variant/60">
          © 2024 VoiceDrop. Built with ElevenLabs + Cloudflare.
        </span>
        <div className="flex gap-6">
          <a
            href="#"
            className="text-[0.6875rem] uppercase tracking-[0.05em] font-medium text-on-surface-variant/60 hover:text-primary transition-colors"
          >
            Privacy
          </a>
          <a
            href="#"
            className="text-[0.6875rem] uppercase tracking-[0.05em] font-medium text-on-surface-variant/60 hover:text-primary transition-colors"
          >
            Terms
          </a>
          <a
            href="#"
            className="text-[0.6875rem] uppercase tracking-[0.05em] font-medium text-on-surface-variant/60 hover:text-primary transition-colors"
          >
            API
          </a>
        </div>
      </div>
    </footer>
  );
}
