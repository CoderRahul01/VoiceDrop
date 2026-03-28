# VoiceDrop — Monetisation Strategy

> Version 1.0 | ElevenHacks 2025 Launch

---

## Pricing Philosophy

VoiceDrop's pricing is designed around three principles:

**1. The Free tier must create genuine value, not a demo.**
3 podcasts/month is enough for a casual user to convert a backlog of saved articles over a weekend. It demonstrates the product's quality convincingly. The limit is tight enough that a regular reader — saving 5+ articles per week — will hit it within 7 days and face a real upgrade decision.

**2. Starter at $7/month passes the "coffee test".**
$7 is below the psychological ceiling for impulse subscription decisions. It is less than a single coffee at most airport cafés. The 20 podcast/month allowance covers a power user's daily commute listening 4 days per week. The price point is positioned to eliminate price as the objection.

**3. Pro at $19/month targets the "serious" segment.**
$19/month puts VoiceDrop in the same category as Readwise ($7.99), Matter, and Notion Personal Pro ($16). Users who pay for multiple productivity tools self-select as high-value subscribers. The 100 podcast/month limit is effectively unlimited for all but the most extreme use cases, removing friction from the upgrade decision.

**4. Enterprise is value-based, not cost-plus.**
Custom pricing is negotiated based on team size, volume, and white-label requirements. There is no published price because the value varies by 10×–100× between a 5-person startup team and a media publisher with 500 journalists.

---

## Revenue Model

VoiceDrop operates a **SaaS subscription model** with three additional revenue layers:

| Revenue stream | Mechanism | Timeline |
|---|---|---|
| Core subscriptions | Monthly recurring (Stripe via Clerk Billing) | Active at launch |
| Annual plans | 2 months free (16.7% discount); full year upfront | Month 2 |
| Enterprise contracts | Negotiated annually; white-label, API, custom voices | Month 3+ |
| API access tier | Pay-per-call or monthly capacity for developers | Month 4+ |

---

## Unit Economics Per Tier

### Cost of Goods (COGS) Per Podcast Episode

Each podcast episode generation consists of:
- **Cloudflare Workers AI** — Llama 3.1 8B Instruct inference via REST API
- **ElevenLabs TTS** — `eleven_turbo_v2`, typically 6 dialogue turns of ~100–150 characters each

**Estimated characters per episode:** ~900 characters (6 turns × 150 chars average)

**ElevenLabs pricing (Indie plan reference):** ~$0.30 per 1,000 characters
→ Cost per episode: ~$0.00027 × 900 = **~$0.27 per episode**

**Cloudflare Workers AI pricing:** $0.01 per 1,000 neurons (Llama 3.1 8B, ~500 neurons/request)
→ Cost per episode: ~**$0.005 per episode**

**Infrastructure (Vercel, bandwidth):** ~$0.005 per episode at scale

**Total estimated COGS per episode: ~$0.28**

### Gross Margin Per Tier

| Tier | Price | Monthly episodes | COGS | Gross profit | Gross margin |
|---|---|---|---|---|---|
| Free | $0 | 3 | ~$0.84 | -$0.84 | N/A (acquisition cost) |
| Starter | $7 | 20 (avg usage: 12) | ~$3.36 | $3.64 | 52% |
| Pro | $19 | 100 (avg usage: 40) | ~$11.20 | $7.80 | 41% |
| Enterprise | $200+ | Unlimited (avg: 300) | ~$84 | $116+ | 58%+ |

**Notes:**
- Free tier COGS are treated as customer acquisition cost (CAC subsidy)
- Average usage is estimated at 60% of plan limit based on SaaS benchmarks
- Gross margin improves significantly as Cloudflare and ElevenLabs volume discounts apply at scale
- At 10,000+ MAU, ElevenLabs enterprise pricing is expected to reduce per-character cost by 30–50%

---

## Revenue Projections

### Assumptions

- Month 1: 1,000 registered users; 3% paid conversion = 30 paying users
- Monthly churn: 12% (conservative), 8% (base), 5% (aggressive)
- Paid user mix: 60% Starter, 35% Pro, 5% Enterprise (by revenue)
- Monthly growth rate: 20% (conservative), 40% (base), 60% (aggressive)

### Conservative Scenario

| Period | Registered users | Paying users | MRR | ARR run-rate |
|---|---|---|---|---|
| Month 3 | 2,500 | 85 | $960 | $11,520 |
| Month 6 | 5,000 | 220 | $2,860 | $34,320 |
| Month 12 | 12,000 | 620 | $9,300 | $111,600 |

### Base Scenario

| Period | Registered users | Paying users | MRR | ARR run-rate |
|---|---|---|---|---|
| Month 3 | 5,000 | 200 | $2,600 | $31,200 |
| Month 6 | 15,000 | 750 | $10,500 | $126,000 |
| Month 12 | 40,000 | 2,400 | $36,000 | $432,000 |

### Aggressive Scenario

| Period | Registered users | Paying users | MRR | ARR run-rate |
|---|---|---|---|---|
| Month 3 | 10,000 | 500 | $7,000 | $84,000 |
| Month 6 | 35,000 | 2,100 | $33,600 | $403,200 |
| Month 12 | 120,000 | 9,000 | $162,000 | $1,944,000 |

The base scenario assumes one successful Product Hunt launch (top 5 product of the day), one HN front page appearance, and steady content-driven SEO growth from Month 2 onwards.

---

## Expansion Revenue Opportunities

### Annual Plans (Month 2)

Offer annual billing with an effective 2-month discount (pay for 10, get 12):

| Plan | Monthly price | Annual price | ARR equivalent | Discount |
|---|---|---|---|---|
| Starter Annual | $7/mo | $59/year | $70 | 15.7% |
| Pro Annual | $19/mo | $159/year | $228 | 30.3% |

Annual plans improve cash flow, reduce monthly churn to effectively 0% for the year, and improve LTV by 30–40% versus monthly subscribers. Target: 25% of paying users on annual plans by Month 6.

### API Access Tier (Month 4)

A developer-facing API tier enables:
- B2B integration (learning management systems, publishing platforms, news aggregators)
- Webhook-based bulk generation workflows
- Custom voice integration for branded podcasts

**Pricing model:** $0.50 per episode via API (3× the cost-of-goods), with volume tiers at $0.35/episode above 500/month.

### Team Seats (Month 3)

Enterprise accounts can add team members under a shared monthly quota. Pricing: Enterprise base + $10/seat/month for seats 2–10, $7/seat/month above 10.

### White-Label (Month 5)

Podcast publishers, media brands, and corporate L&D departments can run a VoiceDrop-powered experience under their own branding. White-label contracts are negotiated annually at a base of $500/month minimum. The white-label feature includes custom domain, custom voices, and custom branding in the player UI.

---

## Coupon / Promo Code Strategy

Coupon codes are stored as plaintext `CODE:plan` pairs in the `COUPON_CODES` environment variable. Redemption writes `couponPlan`, `couponCode`, and `couponRedeemedAt` to Clerk `publicMetadata`. The generate endpoint grants the coupon-level allowance immediately, independently of any Stripe subscription.

### Strategic use cases

| Use case | Code(s) | Plan | Goal |
|---|---|---|---|
| Launch-day virality | `LAUNCH50`, `VOICEDROP` | Pro | Drive premium trial; reduce friction for power users |
| Hackathon / event | `HACKATHON` | Starter | Convert event attendees into retained users |
| Early adopter loyalty | `EARLYBIRD` | Starter | Reward first 500 sign-ups |
| Influencer / affiliate | `[INFLUENCER_NAME]` | Pro | Track attribution; incentivise promotion |
| Sales / enterprise trial | `[COMPANY_NAME]` | Enterprise | De-risk enterprise evaluation |
| Retention / win-back | `COMEBACK` | Starter | Reactivate churned free-tier users |

### Coupon economics

A Pro coupon costs ~$11 COGS/month (at 40 avg episode usage) against $0 revenue. Treating it as CAC: if 10% of coupon users convert to paid Starter ($7/mo), the effective CAC is $110 COGS per paying customer. With an LTV of ~$80 at 12-month average retention, coupons must be time-limited (30–60 days) to remain economically viable. Permanent coupon grants should be reserved for strategic partnerships with clear reciprocal value.

---

## Conversion Funnel Analysis

```
Visitor (100%)
    │
    │  60% — sign-up friction (Clerk Auth)
    ▼
Registered user (40%)
    │
    │  80% — generate at least one podcast (activation)
    ▼
Activated user (32%)
    │
    │  75% — use all 3 Free podcasts within 7 days
    ▼
Limit-hit user (24%)
    │
    │  25% — upgrade to paid (pricing page conversion)
    ▼
Paying customer (~6% of visitors)
```

**Key conversion levers:**

1. **Activation rate (visitor → first generation):** The hero copy, demo video, and 0-friction URL input drive this. Target: >70% of registered users generate at least one podcast on Day 1.

2. **Free-to-paid conversion (limit-hit → paid):** The upgrade prompt shown at the 3/3 limit is the primary paywall moment. It includes usage context (`usageCount`, `limit`, `plan` fields returned by the API), pricing comparison, and a coupon code input. Target: 20–30% of limit-hit users upgrade within 7 days.

3. **Starter-to-Pro upgrade:** The Starter user who generates 20 episodes/month is a natural Pro candidate. The API returns real-time usage data so the UI can surface a "You've used 18/20 — Go Pro for 5× more" nudge 3 episodes before the limit.

---

## Churn Reduction Strategies

### Proactive

- **Usage nudges:** Email users who have not generated a podcast in 7+ days: "You have 2 podcasts left this month — use them on your saved articles."
- **Onboarding sequence:** 3-email drip over 7 days: (1) Welcome + first-use tips, (2) "Try a different voice" feature highlight, (3) Pro feature tease.
- **Monthly recap:** "Your VoiceDrop month: 14 podcasts, ~4 hours of content consumed" — reinforces value perception before renewal.

### Reactive

- **Cancellation flow:** Before cancellation confirm, surface the user's usage history and estimated value consumed. Offer a 1-month pause option instead of cancellation.
- **Downgrade to Free:** Users who cancel Starter revert to Free (3/month) rather than losing access entirely, preserving the re-conversion opportunity.
- **Win-back campaign:** Churned users who do not re-subscribe within 30 days receive a `COMEBACK` coupon for a free month of Starter.

---

## LTV Calculations

**Assumptions:**
- Average monthly churn: 8% (base scenario)
- Average monthly price: $13 (60% Starter + 35% Pro + 5% Enterprise weighted average)
- Annual plan users (25% of paid base): effectively 0% monthly churn for 12 months

**Monthly subscribers:**

```
LTV = ARPU / Monthly churn rate
LTV = $13 / 0.08
LTV = $162.50 (average across all paid tiers)
```

**Annual subscribers (25% of base):**

```
LTV = $13 × 12 months × (1 + renewal rate)
Assuming 65% annual renewal rate:
LTV = $156 + (0.65 × $156) = $257.40
```

**Blended LTV (75% monthly, 25% annual):**

```
Blended LTV = (0.75 × $162.50) + (0.25 × $257.40)
Blended LTV = $121.87 + $64.35 = ~$186
```

**Target CAC:** Less than $30 (LTV:CAC ratio > 6:1). At scale, content-driven organic acquisition should push effective CAC below $10.

---

Confidential | 7EDGE
