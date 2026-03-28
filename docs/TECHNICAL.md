# VoiceDrop — Technical Architecture

> **Confidential | 7EDGE**

---

## 1. Overview

VoiceDrop is a **Next.js 16 App Router** application deployed on **Vercel**, with AI inference via **Cloudflare Workers AI** and text-to-speech synthesis via **ElevenLabs**. Authentication and billing are handled by **Clerk**.

```
Browser
  │
  ├── GET  /           → Next.js App (Vercel Edge)
  ├── GET  /pricing    → Clerk PricingTable (Clerk Billing / Stripe)
  │
  └── POST /api/generate
        │
        ├── 1. Clerk auth() → userId + plan check (has({ plan }))
        ├── 2. Clerk clerkClient().users.getUser() → usage quota check
        ├── 3. fetch(articleUrl) → HTML → stripHtml() → plain text
        ├── 4. Cloudflare Workers AI (llama-3.1-8b-instruct) → dialogue JSON
        ├── 5. ElevenLabs TTS × N turns → ArrayBuffer[]
        ├── 6. concatBuffers() → single MP3
        ├── 7. Clerk updateUser() → persist usage count
        └── 8. Return { audio: base64, transcript, title, source, duration }
```

---

## 2. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 16 App Router | Edge-compatible, React Server Components, file-based routing |
| **Hosting** | Vercel (Pro) | Zero-config Next.js deployment, Edge Functions, global CDN |
| **Auth + Billing** | Clerk | `<PricingTable />`, `has({ plan })`, `clerkMiddleware()` — billing without webhook code |
| **AI (LLM)** | Cloudflare Workers AI (`@cf/meta/llama-3.1-8b-instruct`) | Free tier (10k neurons/day), low latency, no GPU needed |
| **TTS** | ElevenLabs (`eleven_multilingual_v2`, `mp3_44100_128`) | Studio-quality voices, 6 distinct personalities |
| **Styling** | Tailwind CSS v4 | `@theme {}` tokens, `@layer clerk` for Clerk overrides |
| **Language** | TypeScript (strict mode) | 7EDGE standard — type safety end-to-end |

---

## 3. Key Files

```
VoiceDrop/
├── app/
│   ├── layout.tsx              # ClerkProvider + Inter font
│   ├── page.tsx                # Home: Hero + InputCard + PlayerCard + Transcript
│   ├── globals.css             # Tailwind v4 + Clerk dark-mode overrides (@layer clerk)
│   ├── pricing/
│   │   └── page.tsx            # Clerk PricingTable + CouponInput + FAQ
│   └── api/
│       ├── generate/
│       │   └── route.ts        # Main generation pipeline (POST)
│       └── coupon/
│           └── redeem/
│               └── route.ts    # Promo code validation + Clerk metadata write
├── components/
│   ├── TopAppBar.tsx           # Fixed header with Clerk auth buttons
│   ├── Hero.tsx                # Founder-focused headline + stats
│   ├── InputCard.tsx           # URL input + voice/tone selectors + error states
│   ├── PlayerCard.tsx          # Audio player with seek bar + download
│   ├── TranscriptPreview.tsx   # Chat-bubble transcript rendering
│   ├── WelcomeModal.tsx        # First-visit onboarding (3 steps, localStorage-gated)
│   ├── CouponInput.tsx         # Promo code redemption UI
│   └── Footer.tsx              # Attribution + links
├── lib/
│   └── plans.ts                # Single source of truth: plan slugs, limits, voices
├── types/
│   └── index.ts                # Shared TypeScript types (PodcastData)
├── proxy.ts                    # Clerk middleware (Next.js 16 uses proxy.ts, not middleware.ts)
└── .env.local                  # API keys (never committed)
```

---

## 4. Generation Pipeline Deep Dive (`/api/generate`)

### Step 1 — Authentication & Plan Resolution
```typescript
const { userId, has } = await auth();
// Priority: Clerk Billing subscription > couponPlan (publicMetadata) > free
function resolvePlan(has, couponPlan): PlanId {
  if (has({ plan: 'enterprise' }) || couponPlan === 'enterprise') return 'enterprise';
  if (has({ plan: 'pro' })        || couponPlan === 'pro')        return 'pro';
  if (has({ plan: 'starter' })    || couponPlan === 'starter')    return 'starter';
  return 'free';
}
```

### Step 2 — Usage Quota (Clerk privateMetadata)
Usage is stored in Clerk `privateMetadata` (server-only, never exposed to client):
```json
{ "usageMonth": "2026-03", "usageCount": 7 }
```
Resets automatically: if `usageMonth !== currentMonth`, counter is treated as 0.

### Step 3 — Article Fetch + Parse
```typescript
const html = await fetch(articleUrl).then(r => r.text());
const text = stripHtml(html).slice(0, 3000); // 3k char cap → ~600 tokens
```
`stripHtml` removes `<script>`, `<style>`, HTML tags, and HTML entities.

### Step 4 — Cloudflare Workers AI (LLM)
```
POST https://api.cloudflare.com/client/v4/accounts/{id}/ai/run/@cf/meta/llama-3.1-8b-instruct
```
Prompt uses **messages/chat format** (more reliable JSON output than raw prompting):
- System: "You are a JSON API. Output ONLY raw valid JSON."
- User: "Write a {tone} podcast dialogue... Output JSON array of 6 objects..."

Robust JSON extraction handles:
- Markdown code fences (` ```json `)
- Truncated arrays (missing `]`) → `repairTruncatedJsonArray()`

### Step 5 — ElevenLabs TTS
```
POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}
Model: eleven_multilingual_v2
Output: mp3_44100_128 (44.1 kHz, 128 kbps — broadcast quality)
```
6 voices mapped to ElevenLabs IDs:
- Sarah (Tech) → `EXAVITQu4vr4xnSDxMaL`
- David (Deep) → `onwK4e9ZLuTAKqWW03F9`
- Marcus (Hype) → `pNInz6obpgDQGcFmaJgB`
- James (Analyst) → `TX3LPaxmHKxFdv7VOQHJ`
- Elena (Skeptic) → `ThT5KcBeYPX3keUQqHPh`
- Riley (Casual) → `jBpfuIE2acCO8z3wKNLl`

Voice access is **server-side enforced** — even if a client bypasses the UI lock, the API validates against `PLAN_VOICES[plan]`.

### Step 6 — MP3 Stitching
Raw `ArrayBuffer` concatenation works for MP3 playback (browsers tolerate multi-frame MP3 streams). No muxer library needed — keeps bundle size at zero.

### Step 7 — Usage Persistence
```typescript
await client.users.updateUser(userId, {
  privateMetadata: { usageMonth: currentMonth, usageCount: newCount }
});
```

---

## 5. Billing & Coupon Architecture

### Clerk Billing
- Plans defined in Clerk Dashboard (not in code)
- `<PricingTable for="user" />` renders checkout automatically
- `has({ plan: 'slug' })` from `auth()` checks active subscription
- 0.7% Clerk fee on all transactions (Clerk wraps Stripe)

### Coupon System (Custom)
Clerk Billing has no native coupon support, so we built one:

```
COUPON_CODES env var → "LAUNCH50:pro,HACKATHON:starter,VIP:enterprise"
                              ↓
POST /api/coupon/redeem → validates code → writes to Clerk publicMetadata:
  { couponPlan: 'pro', couponCode: 'LAUNCH50', couponRedeemedAt: '...' }
                              ↓
resolvePlan() checks publicMetadata.couponPlan as fallback to Clerk subscription
```

To add new codes: update `COUPON_CODES` in Vercel Environment Variables (no redeploy needed in dev; requires redeploy in production).

---

## 6. Next.js 16 Specifics

- **Middleware file**: `proxy.ts` (not `middleware.ts`) — breaking change in Next.js 16
- **`useSearchParams()`**: Must be wrapped in `<Suspense>` boundary for static builds
- **Tailwind CSS v4**: Uses `@import "tailwindcss"` + `@theme {}` (not `tailwind.config.js`)
- **`@layer clerk`**: Declared before `utilities` in `@layer` order so Tailwind utilities always win

---

## 7. Environment Variables

| Variable | Where set | Purpose |
|----------|-----------|---------|
| `ELEVENLABS_API_KEY` | Vercel + `.env.local` | TTS API authentication |
| `CLOUDFLARE_ACCOUNT_ID` | Vercel + `.env.local` | Workers AI endpoint |
| `CLOUDFLARE_API_TOKEN` | Vercel + `.env.local` | Workers AI authentication |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Vercel + `.env.local` | Clerk client-side |
| `CLERK_SECRET_KEY` | Vercel + `.env.local` | Clerk server-side |
| `COUPON_CODES` | Vercel + `.env.local` | Promo code list (`CODE:plan,...`) |

---

## 8. Performance Characteristics

| Metric | Value |
|--------|-------|
| Time to first byte (TTFB) | <100ms (Vercel Edge) |
| Article fetch | 500ms–2s (external) |
| LLM inference (Workers AI) | 2–5s |
| TTS per turn (ElevenLabs) | 1–3s × 6 turns = 6–18s |
| Total generation time | **10–25 seconds** |
| Audio size | ~300–800 KB (128 kbps MP3) |
| Vercel function timeout | 60s (configured via `export const maxDuration = 60`) |

---

## 9. Deployment

```bash
# Local development
npm run dev           # http://localhost:3000

# Production deployment
vercel --prod         # Deploys to voicedrop-beta.vercel.app
```

Live URL: **https://voicedrop-beta.vercel.app**

---

*Confidential | 7EDGE*
