# VoiceDrop

**AI-powered two-host podcast generator.** Paste any article URL and get a fully synthesised, two-voice audio podcast in under 30 seconds.

Built by **Anteratic Solutions**.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-voicedrop--beta.vercel.app-68dbae?style=for-the-badge)](https://voicedrop-beta.vercel.app)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.2.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org)

---

## What it does

1. You paste an article URL
2. Cloudflare Workers AI (Llama 3.1-8b) extracts key facts and generates a two-host dialogue script
3. ElevenLabs (`eleven_multilingual_v2`) synthesises each dialogue turn into audio
4. MP3 segments are stitched and returned inline — ready to play or download

Supports **English** and **Hinglish**. Four podcast tones: Professional, Conversational, Debate, Summary. Duration: 1 / 2 / 3 minutes (plan-gated).

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Auth + Billing | Clerk v7 + Clerk Billing + Stripe |
| AI Dialogue | Cloudflare Workers AI (`@cf/meta/llama-3.1-8b-instruct`) |
| Text-to-Speech | ElevenLabs (`eleven_multilingual_v2`) |
| Hosting | Vercel (serverless, `maxDuration: 120s`) |

---

## Architecture

```
User Browser
  │
  ├─ POST /api/generate
  │     │
  │     ├─ 1. Auth check (Clerk)     ──► Plan resolution + usage check
  │     ├─ 2. Fetch article URL      ──► Strip HTML, extract title
  │     ├─ 3. CF Workers AI (step 1) ──► Extract key facts (400 tokens)
  │     ├─ 4. CF Workers AI (step 2) ──► Generate N-turn dialogue
  │     ├─ 5. ElevenLabs TTS         ──► Synthesise each turn (sequential)
  │     ├─ 6. Stitch MP3 buffers     ──► Single audio payload (base64)
  │     └─ 7. Update usage count     ──► Clerk privateMetadata
  │
  └─ Response: { audio, transcript, title, source, duration, usageCount }
```

---

## Environment variables

Create `.env.local` at the project root (never commit this file):

```bash
# Clerk — https://dashboard.clerk.com → API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Cloudflare Workers AI — https://dash.cloudflare.com → AI
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token_with_workers_ai_permission

# ElevenLabs — https://elevenlabs.io → Profile → API Key
ELEVENLABS_API_KEY=your_elevenlabs_key

# Promo/coupon codes (optional)
# Format: CODE1:plan,CODE2:plan   e.g. LAUNCH50:pro,BETA:starter,VIP:enterprise
COUPON_CODES=
```

---

## Local development

```bash
npm install
# Fill in .env.local with values above
npm run dev
# Open http://localhost:3000
```

---

## Plan tiers

| Feature | Free | Starter | Pro | Enterprise |
|---------|------|---------|-----|-----------|
| Podcasts / month | 3 | 20 | 100 | Unlimited |
| Max duration | 1 min | 2 min | 3 min | 3 min |
| Voice choice | Fixed | All 6 | All 6 | All 6 |
| Hinglish | ✓ | ✓ | ✓ | ✓ |
| Price | $0 | $7/mo | $19/mo | $100/mo |

---

## Clerk setup (manual steps required)

1. **Clerk Dashboard → Billing → Subscription Plans** — create 4 plans with these exact slugs:
   - `free` — $0
   - `starter` — $7/month
   - `pro` — $19/month
   - `enterprise` — $100/month

2. **Clerk Dashboard → Billing → Pricing Table** — enable and configure which plans appear and their feature lists.

3. Verify plan slugs match the `resolvePlan()` function in `app/api/generate/route.ts` and `lib/plans.ts`.

---

## ElevenLabs voice IDs

| Name | ElevenLabs ID | Slot | Availability |
|------|--------------|------|-------------|
| Sarah (Tech) | `EXAVITQu4vr4xnSDxMaL` | Host A | All plans |
| David (Deep) | `onwK4e9ZLuTAKqWW03F9` | Host A | Starter+ |
| Marcus (Hype) | `pNInz6obpgDQGcFmaJgB` | Host A | Starter+ |
| James (Analyst) | `TX3LPaxmHKxFdv7VOQHJ` | Host B | All plans |
| Elena (Skeptic) | `ThT5KcBeYPX3keUQqHPh` | Host B | Starter+ |
| Riley (Casual) | `jBpfuIE2acCO8z3wKNLl` | Host B | Starter+ |
| Anya | `d3MFdIuCfbAIwiu7jC4a` | Conversational EN A | Auto-selected |
| Andrew | `zSiMZcCo0oBh047sunsX` | Conversational EN B | Auto-selected |
| Akshita | `9SsFrOutdZkCkU5hIoQm` | Conversational HI A | Auto-selected |
| Vidya | `ulZgFXalzbrnPUGQGs0S` | Conversational HI B | Auto-selected |

Ensure all IDs are accessible under your ElevenLabs account tier.

---

## Coupon codes

Set via the `COUPON_CODES` environment variable. Format: `CODE:plan,CODE:plan`

Example:
```
LAUNCH50:pro,BETA:starter,VIP:enterprise
```

Codes are case-insensitive. Once redeemed, the plan is stored in Clerk `publicMetadata.couponPlan` and takes effect immediately — no Stripe subscription required.

---

## Security

- All API routes require Clerk authentication — unauthenticated requests return `401`
- Plan limits and voice access are validated server-side on every request — cannot be bypassed client-side
- Usage tracked in Clerk `privateMetadata` (not client-accessible)
- Security headers via `next.config.ts`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`
- Clerk middleware (`middleware.ts`) handles session management at the edge

---

## Deployment

```bash
npx vercel --prod
```

Set all environment variables in **Vercel Dashboard → Project → Settings → Environment Variables** for the Production environment.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Ensure TypeScript strict mode compliance and no lint errors
4. Open a pull request — do not push directly to `main`

---

## Legal

- Privacy Policy: [/privacy](https://voicedrop-beta.vercel.app/privacy)
- Terms of Service: [/terms](https://voicedrop-beta.vercel.app/terms)
- Company: **Anteratic Solutions**
- Contact: legal@anteratic.com · support@anteratic.com

---

© 2026 Anteratic Solutions
