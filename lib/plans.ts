export type PlanId = 'free' | 'starter' | 'pro' | 'enterprise';

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  price: number | null;    // null = contact us
  priceLabel: string;
  podcastsPerMonth: number;  // Infinity for enterprise
  podcastLabel: string;
  voices: number;            // 0 = custom
  voiceLabel: string;
  audioQuality: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  /**
   * The slug you set when creating the plan in the Clerk Dashboard
   * (Billing → Subscription plans → plan slug field).
   * Used with has({ plan: clerkPlanSlug }) for feature gating.
   */
  clerkPlanSlug: string;
}

/** All voices with metadata — used to render the visual voice picker */
export const ALL_VOICES: {
  name: string;
  id: string;
  desc: string;
  slot: 'a' | 'b' | 'both';
}[] = [
  { name: 'Sarah (Tech)',     id: 'EXAVITQu4vr4xnSDxMaL', desc: 'Analytical · Clear',    slot: 'a' },
  { name: 'David (Deep)',     id: 'onwK4e9ZLuTAKqWW03F9', desc: 'Authoritative · Calm',  slot: 'a' },
  { name: 'Marcus (Hype)',    id: 'pNInz6obpgDQGcFmaJgB', desc: 'Energetic · Bold',      slot: 'a' },
  { name: 'James (Analyst)',  id: 'TX3LPaxmHKxFdv7VOQHJ', desc: 'Precise · Measured',   slot: 'b' },
  { name: 'Elena (Skeptic)',  id: 'ThT5KcBeYPX3keUQqHPh', desc: 'Inquisitive · Sharp',  slot: 'b' },
  { name: 'Riley (Casual)',   id: 'jBpfuIE2acCO8z3wKNLl', desc: 'Warm · Accessible',    slot: 'b' },
];

// Voices available per plan tier
export const PLAN_VOICES: Record<PlanId, { a: string[]; b: string[] }> = {
  free:       { a: ['Sarah (Tech)'],   b: ['James (Analyst)'] },
  starter:    { a: ['Sarah (Tech)', 'David (Deep)', 'Marcus (Hype)'], b: ['James (Analyst)', 'Elena (Skeptic)', 'Riley (Casual)'] },
  pro:        { a: ['Sarah (Tech)', 'David (Deep)', 'Marcus (Hype)'], b: ['James (Analyst)', 'Elena (Skeptic)', 'Riley (Casual)'] },
  enterprise: { a: ['Sarah (Tech)', 'David (Deep)', 'Marcus (Hype)'], b: ['James (Analyst)', 'Elena (Skeptic)', 'Riley (Casual)'] },
};

export const PLAN_LIMITS: Record<PlanId, number> = {
  free: 3,
  starter: 20,
  pro: 100,
  enterprise: Infinity,
};

/** Maximum podcast duration (minutes) per plan */
export const PLAN_MAX_DURATION: Record<PlanId, number> = {
  free: 1,
  starter: 2,
  pro: 3,
  enterprise: 3,
};

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Try it out',
    price: 0,
    priceLabel: '$0 / month',
    podcastsPerMonth: 3,
    podcastLabel: '3 podcasts / month',
    voices: 2,
    voiceLabel: '2 AI voices',
    audioQuality: 'Standard audio',
    features: [
      '3 podcast episodes per month',
      '2 AI host voices',
      'Standard audio quality',
      'MP3 download',
      'Transcript preview',
    ],
    cta: 'Get Started Free',
    highlighted: false,
    clerkPlanSlug: 'free',
  },
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For regular readers',
    price: 7,
    priceLabel: '$7 / month',
    podcastsPerMonth: 20,
    podcastLabel: '20 podcasts / month',
    voices: 6,
    voiceLabel: 'All 6 AI voices',
    audioQuality: 'HD audio',
    features: [
      '20 podcast episodes per month',
      'All 6 AI host voices',
      'HD audio quality',
      'MP3 download',
      'Full transcript',
      'No usage watermark',
    ],
    cta: 'Start Creating',
    highlighted: false,
    clerkPlanSlug: 'starter',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For power users',
    price: 19,
    priceLabel: '$19 / month',
    podcastsPerMonth: 100,
    podcastLabel: '100 podcasts / month',
    voices: 6,
    voiceLabel: 'All 6 AI voices',
    audioQuality: 'HD priority',
    features: [
      '100 podcast episodes per month',
      'All 6 AI host voices',
      'HD priority audio',
      'MP3 download',
      'Full transcript export',
      'Shareable episode links',
      'Priority processing',
      'Email support',
    ],
    cta: 'Go Pro',
    highlighted: true,
    clerkPlanSlug: 'pro',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For teams & publishers',
    price: null,
    priceLabel: 'Custom pricing',
    podcastsPerMonth: Infinity,
    podcastLabel: 'Unlimited',
    voices: 0,
    voiceLabel: 'Custom + cloned voices',
    audioQuality: 'Enterprise grade',
    features: [
      'Unlimited podcast episodes',
      'Custom & cloned AI voices',
      'Enterprise audio pipeline',
      'REST API access',
      'White-label option',
      'Bulk generation',
      'SSO & team management',
      'Dedicated SLA support',
    ],
    cta: 'Contact Us',
    highlighted: false,
    clerkPlanSlug: 'enterprise',
  },
];
