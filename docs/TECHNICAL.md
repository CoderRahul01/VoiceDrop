# VoiceDrop — Technical Architecture

> Version 1.0 | Next.js 16.2.1 + Cloudflare Workers AI + ElevenLabs

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER (Client)                            │
│                                                                     │
│  React 19 SPA (Next.js App Router, client components)              │
│  ├── InputCard   — URL entry, voice/tone selectors                  │
│  ├── PlayerCard  — base64 MP3 → <audio> element                     │
│  └── TranscriptPreview — dialogue turns rendered                    │
└───────────────────────┬─────────────────────────────────────────────┘
                        │ HTTPS (POST JSON)
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   VERCEL EDGE / SERVERLESS                          │
│                                                                     │
│  proxy.ts  ──  clerkMiddleware()                                    │
│  ├── Intercepts all requests (matcher: /* and /api/*)               │
│  ├── Validates Clerk session token                                  │
│  └── Attaches userId + has() to request context                     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  POST /api/generate          (app/api/generate/route.ts)    │   │
│  │  maxDuration = 60 s                                         │   │
│  │  ├── auth() → userId + has()                                │   │
│  │  ├── clerkClient.users.getUser() → publicMetadata           │   │
│  │  ├── resolvePlan(has, couponPlan) → 'free'|'starter'|...    │   │
│  │  ├── Usage gate (privateMetadata.usageCount vs PLAN_LIMITS) │   │
│  │  ├── Voice gate (PLAN_VOICES enforcement, server-side)      │   │
│  │  ├── fetch(articleUrl) → stripHtml() → 3,000-char slice     │   │
│  │  ├── Cloudflare Workers AI REST → dialogue JSON             │   │
│  │  ├── repairTruncatedJsonArray() → JSON.parse()              │   │
│  │  ├── ElevenLabs TTS (per turn, sequential) → ArrayBuffer[]  │   │
│  │  ├── concatBuffers() → base64 MP3                           │   │
│  │  ├── clerkClient.users.updateUser() → increment usageCount  │   │
│  │  └── NextResponse.json({ audio, transcript, title, ... })   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  POST /api/coupon/redeem   (app/api/coupon/redeem/route.ts) │   │
│  │  ├── auth() → userId                                        │   │
│  │  ├── parseCouponMap() from COUPON_CODES env var             │   │
│  │  ├── Lookup normalised code → PlanId                        │   │
│  │  └── clerkClient.users.updateUser() → publicMetadata        │   │
│  └─────────────────────────────────────────────────────────────┘   │
└──────────┬───────────────────────────┬───────────────────────────┬─┘
           │                           │                           │
           ▼                           ▼                           ▼
┌────────────────────┐  ┌──────────────────────────┐  ┌──────────────────┐
│ Cloudflare         │  │ ElevenLabs               │  │ Clerk            │
│ Workers AI         │  │ TTS API                  │  │ Auth + Billing   │
│                    │  │                          │  │                  │
│ Model:             │  │ Model: eleven_turbo_v2   │  │ ├── Session JWT  │
│ @cf/meta/          │  │ 6 voice IDs              │  │ ├── publicMeta   │
│ llama-3.1-8b-      │  │ Sequential per-turn      │  │ │   couponPlan   │
│ instruct           │  │ POST requests            │  │ └── privateMeta  │
│                    │  │ Accept: audio/mpeg        │  │     usageCount   │
│ REST API           │  │ ArrayBuffer response     │  │     usageMonth   │
│ POST /v4/accounts/ │  │                          │  │                  │
│ .../ai/run/...     │  │ voice_settings:          │  │ Stripe (via      │
│                    │  │  stability: 0.5          │  │ Clerk Billing)   │
│ max_tokens: 2048   │  │  similarity_boost: 0.75  │  │ PricingTable     │
│ Chat messages      │  │  style: 0.3              │  │ component        │
│ format             │  │  use_speaker_boost: true │  │                  │
└────────────────────┘  └──────────────────────────┘  └──────────────────┘
```

---

## Full API Reference

### POST /api/generate

Generates a two-host AI podcast from an article URL. Requires authentication.

**Auth:** Clerk session token (set automatically via `clerkMiddleware`). Returns `401` if unauthenticated.

**Rate limiting:** Per-user monthly quota enforced server-side via Clerk `privateMetadata`. Returns `429` when quota is exhausted.

**Function timeout:** 60 seconds (`export const maxDuration = 60`)

#### Request

```http
POST /api/generate
Content-Type: application/json
Cookie: __session=<clerk_session_token>
```

```json
{
  "url": "https://example.com/some-article",
  "voiceA": "Sarah (Tech)",
  "voiceB": "James (Analyst)",
  "tone": "casual"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `url` | `string` | Yes | The article URL to convert. Must be a valid HTTP/HTTPS URL. |
| `voiceA` | `string` | Yes | Display name of the Host A voice. Server enforces plan-allowed voices; an invalid value falls back to the plan default. |
| `voiceB` | `string` | Yes | Display name of the Host B voice. Same enforcement as `voiceA`. |
| `tone` | `string` | Yes | Conversation tone passed verbatim to the LLM prompt. Typical values: `casual`, `professional`, `energetic`. |

#### Response — 200 OK

```json
{
  "audio": "<base64-encoded MP3 string>",
  "transcript": [
    { "speaker": "A", "text": "Today we are looking at..." },
    { "speaker": "B", "text": "Right, and the key finding here is..." }
  ],
  "title": "Article Title",
  "source": "example.com",
  "duration": "3:42",
  "usageCount": 1,
  "limit": 3,
  "plan": "free"
}
```

| Field | Type | Description |
|---|---|---|
| `audio` | `string` | Base64-encoded MP3 of the stitched podcast episode. |
| `transcript` | `Turn[]` | Array of `{ speaker: "A" | "B", text: string }` objects. |
| `title` | `string` | Article title extracted from the `<title>` tag, with site suffix stripped. |
| `source` | `string` | Article hostname (e.g. `techcrunch.com`). |
| `duration` | `string` | Estimated playback duration in `M:SS` format (derived from byte length / 16000). |
| `usageCount` | `number` | Updated usage count for the current month after this generation. |
| `limit` | `number` | Monthly generation limit for the user's current plan. |
| `plan` | `string` | Resolved plan ID: `free`, `starter`, `pro`, or `enterprise`. |

#### Error Responses

| Status | `error` field | Condition |
|---|---|---|
| `400` | `"Please provide a valid URL..."` | Malformed or non-HTTP URL |
| `400` | `"Could not fetch article (HTTP NNN)"` | Article URL returned non-2xx |
| `400` | `"The article content seems too short or restricted."` | Extracted text < 100 characters |
| `401` | `"Sign in to generate podcasts."` | No valid Clerk session |
| `429` | `"You've used all N podcasts on your X plan this month."` | Monthly quota exhausted; also includes `limitReached: true`, `usageCount`, `limit`, `plan` |
| `500` | `"Server configuration error"` | Missing required environment variables |
| `503` | `"AI synthesis failed. ...try again in a few minutes."` | Cloudflare Workers AI returned non-2xx |

---

### POST /api/coupon/redeem

Redeems a coupon code and writes the granted plan to the user's Clerk `publicMetadata`. Requires authentication.

**Auth:** Clerk session token. Returns `401` if unauthenticated.

**Idempotency:** Re-submitting the same code overwrites `couponPlan` with the same value. Re-submitting a different code overwrites the existing grant.

#### Request

```http
POST /api/coupon/redeem
Content-Type: application/json
Cookie: __session=<clerk_session_token>
```

```json
{
  "code": "LAUNCH50"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `code` | `string` | Yes | The coupon code to redeem. Case-insensitive; normalised to uppercase server-side. |

#### Response — 200 OK

```json
{
  "success": true,
  "plan": "pro",
  "code": "LAUNCH50"
}
```

#### Error Responses

| Status | `error` field | Condition |
|---|---|---|
| `400` | `"Please enter a coupon code."` | Empty or whitespace-only `code` field |
| `401` | `"Sign in to redeem a coupon."` | No valid Clerk session |
| `404` | `"Invalid or expired coupon code."` | Code not found in `COUPON_CODES` env var |

---

## Data Flow: URL to MP3

```
1. Client sends POST /api/generate { url, voiceA, voiceB, tone }
        │
2. clerkMiddleware validates session token → userId, has()
        │
3. clerkClient.users.getUser(userId)
   ├── publicMetadata.couponPlan  → coupon-based plan override
   └── privateMetadata.usageCount / usageMonth → current month usage
        │
4. resolvePlan(has, couponPlan)
   → 'enterprise' | 'pro' | 'starter' | 'free'
        │
5. Usage gate: usageCount >= PLAN_LIMITS[plan] → 429
        │
6. Voice gate: voiceA/voiceB clamped to PLAN_VOICES[plan] (server-side)
        │
7. fetch(articleUrl, { headers: { User-Agent: 'VoiceDrop/1.0' } })
   → HTML string
   → stripHtml() — removes <script>, <style>, all tags, entities
   → .slice(0, 3000) → articleText (≥100 chars or 400 returned)
        │
8. POST https://api.cloudflare.com/client/v4/accounts/{id}/ai/run/
         @cf/meta/llama-3.1-8b-instruct
   Body: {
     messages: [
       { role: 'system', content: 'You are a JSON API...' },
       { role: 'user',   content: `Write a ${tone} podcast dialogue...` }
     ],
     max_tokens: 2048
   }
   → aiData.result.response  (raw string, may include markdown fences)
        │
9. JSON extraction pipeline:
   a. Strip leading/trailing ``` code fences
   b. Find first '[' in response string
   c. Find last ']' — if missing, call repairTruncatedJsonArray()
      (finds last complete '}', closes array after it)
   d. JSON.parse() → Turn[]  (validated: must be non-empty array)
        │
10. For each turn in turns[]:
    POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}
    Headers: { xi-api-key, Content-Type: application/json, Accept: audio/mpeg }
    Body: { text: turn.text, model_id: 'eleven_turbo_v2', voice_settings: {...} }
    → ArrayBuffer pushed to audioBuffers[]
        │
11. concatBuffers(audioBuffers)
    → single ArrayBuffer (all turns stitched in order)
    Buffer.from(stitched).toString('base64') → audioBase64
    estimatedSeconds = byteLength / 16000 → formatDuration()
        │
12. clerkClient.users.updateUser(userId, {
      privateMetadata: {
        ...user.privateMetadata,
        usageMonth: 'YYYY-MM',
        usageCount: newCount
      }
    })
        │
13. NextResponse.json({
      audio, transcript, title, source, duration,
      usageCount, limit, plan
    })
        │
14. Browser: new Audio('data:audio/mpeg;base64,' + audio).play()
    Transcript rendered as dialogue turns in TranscriptPreview component.
```

---

## Clerk Billing Integration

### Overview

Clerk Billing manages subscriptions through Stripe. Subscription plans are created in the Clerk Dashboard under **Billing → Subscription plans**. Each plan is assigned a slug that is used in code with `has({ plan: slug })`.

### Plan slugs (as configured in Clerk Dashboard)

| Plan | Clerk slug | `PLAN_LIMITS` value | Voices (Host A / B) |
|---|---|---|---|
| Free | `free` | 3 | Sarah (Tech) only / James (Analyst) only |
| Starter | `starter` | 20 | All 3 Host A voices / All 3 Host B voices |
| Pro | `pro` | 100 | All 3 Host A voices / All 3 Host B voices |
| Enterprise | `enterprise` | Infinity | All voices + custom |

### How `has()` works in the generate route

The `has()` function is returned by `auth()` and performs a server-side check against the user's active Clerk Billing subscription. It does not require an additional network call — Clerk embeds subscription information in the session token.

```typescript
const { userId, has } = await auth();

function resolvePlan(
  has: (params: { plan: string }) => boolean,
  couponPlan?: string
): PlanId {
  // Enterprise checked first (highest privilege)
  if (has({ plan: 'enterprise' }) || couponPlan === 'enterprise') return 'enterprise';
  if (has({ plan: 'pro' })        || couponPlan === 'pro')        return 'pro';
  if (has({ plan: 'starter' })    || couponPlan === 'starter')    return 'starter';
  return 'free';
}
```

The `couponPlan` value from `publicMetadata` takes equal precedence to a Stripe subscription. This enables promo code access without a billing relationship.

### PricingTable component

The `/pricing` page renders Clerk's `<PricingTable>` component:

```tsx
<PricingTable
  for="user"
  ctaPosition="bottom"
  newSubscriptionRedirectUrl="/pricing?success=1"
  appearance={{ cssLayerName: 'clerk', variables: { ... } }}
/>
```

The component reads plan definitions from the Clerk Dashboard (not from `lib/plans.ts`). It handles Stripe checkout, webhook processing, and subscription state management transparently. The `lib/plans.ts` `PLANS` array is used only for custom UI display (feature lists, labels) and never as a source of truth for subscription state.

---

## Voice ID Mapping Table

All six AI voices are mapped in `app/api/generate/route.ts` in the `VOICE_IDS` constant:

| Display name | Persona | ElevenLabs voice ID | Plan availability |
|---|---|---|---|
| Sarah (Tech) | Enthusiastic tech explainer | `EXAVITQu4vr4xnSDxMaL` | All plans (default Host A) |
| David (Deep) | Deep, authoritative analyst | `onwK4e9ZLuTAKqWW03F9` | Starter, Pro, Enterprise |
| Marcus (Hype) | Energetic hype voice | `pNInz6obpgDQGcFmaJgB` | Starter, Pro, Enterprise |
| James (Analyst) | Clear, measured commentator | `TX3LPaxmHKxFdv7VOQHJ` | All plans (default Host B) |
| Elena (Skeptic) | Thoughtful, questioning tone | `ThT5KcBeYPX3keUQqHPh` | Starter, Pro, Enterprise |
| Riley (Casual) | Relaxed conversational voice | `jBpfuIE2acCO8z3wKNLl` | Starter, Pro, Enterprise |

Voice access per plan is defined in `lib/plans.ts` as `PLAN_VOICES` and enforced server-side in the generate route. The client cannot bypass voice gating by sending an arbitrary voice name — invalid names fall back to the plan default silently.

---

## Environment Variables Reference

| Variable | Scope | Required | Description |
|---|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Client + Server | Yes | Clerk publishable key (safe to expose to browser) |
| `CLERK_SECRET_KEY` | Server only | Yes | Clerk secret key — never expose to client |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Client | Yes | Sign-in page path. Set to `/sign-in`. |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Client | Yes | Sign-up page path. Set to `/sign-up`. |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Client | Yes | Post-sign-in redirect. Set to `/`. |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Client | Yes | Post-sign-up redirect. Set to `/`. |
| `CLOUDFLARE_ACCOUNT_ID` | Server only | Yes | Cloudflare account ID (Dashboard → Overview) |
| `CLOUDFLARE_API_TOKEN` | Server only | Yes | CF API token with `Workers AI Run` permission |
| `ELEVENLABS_API_KEY` | Server only | Yes | ElevenLabs API key |
| `COUPON_CODES` | Server only | No | Comma-separated `CODE:plan` pairs, e.g. `LAUNCH50:pro,HACKATHON:starter` |

All server-only variables are accessed via `process.env` exclusively within Next.js API route handlers and are never referenced in client components or passed to the browser.

---

## Local Development Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env.local`

```
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Cloudflare Workers AI
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_key

# Coupon codes (optional)
COUPON_CODES=LAUNCH50:pro,HACKATHON:starter,EARLYBIRD:starter
```

### 3. Configure Clerk Dashboard

1. Create a Clerk application at [clerk.com](https://clerk.com)
2. Enable **Billing** under Clerk Dashboard → Configure → Billing
3. Create subscription plans with slugs: `free`, `starter`, `pro`, `enterprise`
4. Set prices: Free ($0), Starter ($7/mo), Pro ($19/mo), Enterprise (contact us)
5. Connect Stripe in Clerk Dashboard → Billing → Stripe

### 4. Start the development server

```bash
npm run dev
# App available at http://localhost:3000
```

---

## Deployment (Vercel)

### Prerequisites

- Vercel account linked to the GitHub repository at `github.com/CoderRahul01/VoiceDrop`
- All environment variables configured in Vercel Dashboard → Project → Settings → Environment Variables

### Deploy

```bash
# Pushing to main triggers an automatic Vercel production deployment
git push origin main
```

### Key Vercel settings

| Setting | Value | Reason |
|---|---|---|
| Framework preset | Next.js | Auto-detected |
| Node.js version | 20.x | Required for `@clerk/nextjs` v7 |
| Build command | `next build` | Standard |
| Output directory | `.next` | Standard |
| Function region | `iad1` (US East) | Minimises latency to Cloudflare and ElevenLabs |
| `maxDuration` | 60 s | Set in `app/api/generate/route.ts` via `export const maxDuration = 60` |

The `proxy.ts` file at the root of the project is automatically picked up by Next.js 16 as the project middleware. It exports `clerkMiddleware()` as the default export and the route `config.matcher`.

---

## Performance Characteristics

### Latency budget (typical request)

| Step | Estimated time |
|---|---|
| Article fetch and HTML parse | 500 ms – 2 s |
| Cloudflare Workers AI (dialogue generation, 6 turns) | 5 – 12 s |
| ElevenLabs TTS, 6 turns sequential | 12 – 20 s |
| Buffer stitch and base64 encode | < 100 ms |
| Clerk `updateUser` (usage increment) | 200 – 500 ms |
| **Total end-to-end** | **~18 – 35 s** |

### Cold start behaviour

Vercel Serverless Functions experience cold starts of 500 ms – 1 s on the first request after a period of inactivity. Subsequent requests within the same warm instance are unaffected. Cold starts do not materially affect user-perceived latency given the ~20-second generation time.

### Timeout configuration

The generate route exports `maxDuration = 60` (the Vercel Pro plan maximum for serverless functions). Requests exceeding 60 s (caused by slow article servers or ElevenLabs latency spikes) result in a `504 Gateway Timeout` from Vercel. The client should surface this as a user-friendly retry prompt.

### TTS sequential execution

TTS calls are made sequentially in a `for` loop over the dialogue turns. This preserves correct audio segment ordering without additional reordering logic. Sequential execution means the ElevenLabs latency compounds linearly: 6 turns × ~2.5 s average = ~15 s. Parallel execution with ordered re-joining is a planned improvement that would reduce this to ~3–5 s.

---

## Security Model

### Authentication guards

`proxy.ts` runs `clerkMiddleware()` on every non-static request (matcher covers all paths except images, fonts, and other static assets). Every API route calls `auth()` as its first operation and returns `401` immediately if `userId` is null. No route is accessible without a valid Clerk session token.

### Server-side voice gating

The client cannot unlock paid voices by manipulating the request payload. The generate route resolves the plan server-side, then clamps submitted voice names against `PLAN_VOICES[plan]`:

```typescript
const voiceA = allowedVoices.a.includes(body.voiceA) ? body.voiceA : allowedVoices.a[0];
const voiceB = allowedVoices.b.includes(body.voiceB) ? body.voiceB : allowedVoices.b[0];
```

### Usage gating

Monthly usage counts are stored in Clerk `privateMetadata`, which is not readable by the client. The gate is enforced server-side before any external API call. There is no client-side quota state that a user can manipulate.

### No PII in logs

The generate route logs only the article URL (public, not personal data) and the anonymised Clerk `userId` (an opaque internal ID, not an email or name). No email addresses, names, or card details are ever written to application logs. All PII is stored in Clerk and Stripe's compliant infrastructure.

### Secret management

All API keys (`CLERK_SECRET_KEY`, `CLOUDFLARE_API_TOKEN`, `ELEVENLABS_API_KEY`) are server-only environment variables. They are validated at request time and the route returns a generic `500` if any are missing — key values are never reflected in error responses or logs.

### Transport security

All client–server communication is over HTTPS enforced by Vercel. All outbound API calls (to Cloudflare and ElevenLabs) originate from the Vercel serverless environment. API keys are never exposed in browser network traffic.

---

## Known Limitations and Planned Improvements

| Limitation | User impact | Planned fix | Target |
|---|---|---|---|
| Sequential ElevenLabs TTS calls | ~15 s of avoidable latency | Parallel `Promise.all` with ordered buffer re-join | Month 1 |
| Article scraping blocked by paywalls | ~20% of URLs fail or return sparse content | Jina Reader or Firecrawl as scraping fallback | Month 2 |
| 3,000-character article truncation | Long articles lose detail in the dialogue | Increase limit or implement chunked summarisation | Month 2 |
| No persistent episode storage | Generated podcasts exist only in browser memory; browser refresh loses the audio | Store MP3 to Cloudflare R2 or Vercel Blob; return permanent URL | Month 2 |
| No shareable episode links | Pro feature listed in plans but not yet implemented | Build shareable URLs backed by R2 storage | Month 2 |
| `eleven_turbo_v2` model only | Good quality but not multilingual | Offer `eleven_multilingual_v2` on Pro for non-English articles | Month 3 |
| No streaming audio delivery | Full MP3 must complete before playback begins | Implement SSE or WebSocket streaming with chunked audio | Month 3 |
| Single-region Vercel deployment | Higher latency for users outside US East | Deploy to multiple Vercel Edge regions; use CF Workers global network | Month 3 |

---

Confidential | 7EDGE
