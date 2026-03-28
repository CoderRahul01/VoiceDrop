# 🎙️ VoiceDrop

**Turn any article URL into a two-host AI podcast in ~30 seconds.**

> _Because your "read later" list is never getting read._

[![Built for ElevenHacks 2025](https://img.shields.io/badge/Built%20for-ElevenHacks%202025-68dbae?style=for-the-badge)](https://elevenlabs.io/hackathon)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-voicedrop--beta.vercel.app-68dbae?style=for-the-badge)](https://voicedrop-beta.vercel.app)
[![MIT License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.2.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org)

---

## Screenshot

> _Live demo: [https://voicedrop-beta.vercel.app](https://voicedrop-beta.vercel.app)_

![VoiceDrop UI — paste a URL, pick voices, hit generate](./Image%201.png)

---

## The Problem: The "Read Later" Graveyard

You've bookmarked 847 articles. You've opened 12 of them.

The average knowledge worker saves 30+ articles per week but reads fewer than 20% of them. The problem is not motivation — it is time. Commuting, cooking, exercising, and walking between meetings are all dead time where reading is physically impossible.

**VoiceDrop kills the backlog.** Paste any URL — a long-form essay, a research paper, a news story, a Hacker News thread — and in about 30 seconds you have a natural two-host podcast episode playing in your ears. No app to install. No waiting for a human to record. No schedule to align with.

---

## How It Works

```
 1️⃣  PASTE              2️⃣  GENERATE                3️⃣  LISTEN
┌─────────────┐      ┌──────────────────────┐      ┌──────────────────┐
│  Any URL    │ ───► │ Cloudflare Workers AI │ ───► │ Two-host MP3     │
│  from the   │      │ writes a dialogue,   │      │ plays instantly  │
│  internet   │      │ ElevenLabs voices it │      │ in your browser  │
└─────────────┘      └──────────────────────┘      └──────────────────┘
```

**Step 1 — Paste a URL** from any publisher, blog, or journal. VoiceDrop fetches and strips the article text server-side.

**Step 2 — AI writes the dialogue.** Cloudflare Workers AI (Llama 3.1 8B Instruct) generates a 6-turn back-and-forth conversation between two podcast hosts, grounded in the article's actual facts.

**Step 3 — ElevenLabs voices it.** Each turn is synthesised using `eleven_turbo_v2`, stitched into a single MP3, and streamed to your browser. Total elapsed time: ~25–35 seconds.

---

## Key Features

- 🎙️ **Two-host AI podcast** — not a robot reading text, but a genuine back-and-forth dialogue
- ⚡ **~30-second generation** — from URL to playable audio
- 🗣️ **6 distinct AI voices** — Sarah (Tech), David (Deep), Marcus (Hype), James (Analyst), Elena (Skeptic), Riley (Casual)
- 🎚️ **Tone control** — Casual, Professional, or Energetic conversation styles
- 📄 **Full transcript** — read along or copy the script
- 📥 **MP3 download** — save episodes for offline listening
- 🔐 **Clerk Auth** — sign-in gated generation, usage tracked per user per month
- 💳 **Clerk Billing** — Free / Starter / Pro / Enterprise tiers with Stripe payments
- 🎟️ **Coupon codes** — promo codes grant plan-level access without a credit card
- 📱 **Mobile-first UI** — works on any device, dark-mode by default

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 16.2.1 (App Router) | UI, routing, API routes |
| **Styling** | Tailwind CSS v4 | Utility-first design system |
| **Auth** | Clerk (`@clerk/nextjs` v7) | Authentication + session management |
| **Billing** | Clerk Billing + Stripe | Subscription plans, PricingTable component |
| **LLM** | Cloudflare Workers AI — `@cf/meta/llama-3.1-8b-instruct` | Dialogue script generation |
| **TTS** | ElevenLabs — `eleven_turbo_v2` | Text-to-speech, 6 AI voices |
| **Middleware** | `proxy.ts` (`clerkMiddleware`) | Auth guard on all routes and API |
| **Deployment** | Vercel | Serverless hosting, 60 s function timeout |
| **Language** | TypeScript (strict mode) | End-to-end type safety |

---

## Quick Start

### Prerequisites

- Node.js 20+
- A [Clerk](https://clerk.com) account (free)
- A [Cloudflare](https://cloudflare.com) account with Workers AI enabled
- An [ElevenLabs](https://elevenlabs.io) API key (free tier works)

### 1. Clone the repository

```bash
git clone https://github.com/CoderRahul01/VoiceDrop.git
cd VoiceDrop
npm install
```

### 2. Configure environment variables

Create a `.env.local` file at the project root and populate it with the variables listed in the table below.

### 3. Run the development server

```bash
npm run dev
# App available at http://localhost:3000
```

---

## Environment Variables

| Variable | Required | Description | Where to get it |
|---|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk public key | Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key | Clerk Dashboard → API Keys |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Yes | Sign-in redirect path | Set to `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Yes | Sign-up redirect path | Set to `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Yes | Post-sign-in redirect | Set to `/` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Yes | Post-sign-up redirect | Set to `/` |
| `CLOUDFLARE_ACCOUNT_ID` | Yes | Your Cloudflare account ID | Cloudflare Dashboard → Overview |
| `CLOUDFLARE_API_TOKEN` | Yes | CF API token with Workers AI permission | Cloudflare Dashboard → API Tokens |
| `ELEVENLABS_API_KEY` | Yes | ElevenLabs API key | ElevenLabs → Profile → API Keys |
| `COUPON_CODES` | No | Comma-separated `CODE:plan` pairs | Self-managed (see below) |

**Example `COUPON_CODES` value:**

```
LAUNCH50:pro,VOICEDROP:pro,HACKATHON:starter,EARLYBIRD:starter
```

---

## Coupon Codes

VoiceDrop supports coupon codes that grant full plan-level access without a credit card. Codes are configured via the `COUPON_CODES` environment variable on Vercel (or locally in `.env.local`).

### Active promo codes (hackathon launch)

| Code | Plan granted | Intended audience |
|---|---|---|
| `LAUNCH50` | Pro (100 podcasts/mo) | General launch promotion |
| `VOICEDROP` | Pro (100 podcasts/mo) | Brand awareness / influencer campaign |
| `HACKATHON` | Starter (20 podcasts/mo) | ElevenHacks 2025 attendees |
| `EARLYBIRD` | Starter (20 podcasts/mo) | Early adopter reward |

Codes are redeemed on the `/pricing` page. Once applied, the granted plan is stored in Clerk `publicMetadata.couponPlan` and takes effect immediately — no Stripe subscription required.

---

## Architecture Diagram

```
Browser
  │
  │  HTTPS
  ▼
┌────────────────────────────────────────────────────────────┐
│                     Vercel (Next.js 16)                    │
│                                                            │
│  ┌──────────────┐    ┌────────────────────────────────┐   │
│  │  proxy.ts    │    │  App Router Pages               │   │
│  │  (Clerk      │───►│  /          → Generator UI     │   │
│  │  Middleware) │    │  /pricing   → PricingTable      │   │
│  └──────────────┘    └────────────────────────────────┘   │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  API Routes                          │  │
│  │  POST /api/generate          (maxDuration: 60 s)    │  │
│  │  POST /api/coupon/redeem                             │  │
│  └──────────────────────────────────────────────────────┘  │
│         │                          │                       │
└─────────┼──────────────────────────┼───────────────────────┘
          │                          │
          ▼                          ▼
┌──────────────────┐       ┌───────────────────────┐
│ Cloudflare       │       │ ElevenLabs TTS         │
│ Workers AI       │       │ eleven_turbo_v2        │
│ llama-3.1-8b     │       │ 6 AI voices            │
│ (dialogue JSON)  │       │ (MP3 per dialogue turn)│
└──────────────────┘       └───────────────────────┘
          │                          │
          └───────────┬──────────────┘
                      ▼
             ┌─────────────────┐
             │  Buffer stitch  │
             │  → base64 MP3   │
             │  → JSON response│
             │  → Browser audio│
             └─────────────────┘

┌────────────────────────────────────────────────┐
│  Clerk (Auth + Billing)                        │
│  ├── clerkMiddleware (proxy.ts)                │
│  ├── auth() — userId + has() plan checks       │
│  ├── publicMetadata  — couponPlan / couponCode │
│  └── privateMetadata — usageMonth, usageCount  │
└────────────────────────────────────────────────┘
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes with full TypeScript strict-mode compliance
4. Open a pull request — code review is mandatory before merge

Please do not push directly to `main`.

---

## License

MIT — see [LICENSE](LICENSE) for details.

Built with love (and caffeine) at ElevenHacks 2025.

---

Confidential | 7EDGE
