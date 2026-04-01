export type PlanId = 'free' | 'starter' | 'pro' | 'enterprise';

export const LANGUAGES = ['English', 'Hinglish'] as const;
export type Language = (typeof LANGUAGES)[number];

export const TONES = ['Professional', 'Conversational', 'Debate', 'Summary'] as const;
export type Tone = (typeof TONES)[number];

export const DURATION_OPTIONS = [1, 2, 3] as const;
export type DurationOption = (typeof DURATION_OPTIONS)[number];

export interface VoiceOption {
  name: string;
  id: string;
  desc: string;
  slot: 'a' | 'b' | 'both';
}

export interface PlanFeatureFlags {
  priorityTts: boolean;
  shareEpisodeLinks: boolean;
  apiAccess: boolean;
  customVoices: boolean;
  whiteLabel: boolean;
  teamManagement: boolean;
}

export interface VoiceSlots {
  a: string[];
  b: string[];
}

interface PlanEntitlementDefinition {
  languages?: Language[];
  durations?: DurationOption[];
  tones?: Tone[];
  voices?: Partial<VoiceSlots>;
  featureFlags?: Partial<PlanFeatureFlags>;
}

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  price: number | null;
  priceLabel: string;
  tokenBudget: number;
  tokenLabel: string;
  voices: number;
  voiceLabel: string;
  audioQuality: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  clerkPlanSlug: string;
  parentId?: PlanId;
  entitlements: PlanEntitlementDefinition;
}

export interface ResolvedPlanEntitlements {
  languages: Language[];
  durations: DurationOption[];
  tones: Tone[];
  voices: VoiceSlots;
  featureFlags: PlanFeatureFlags;
  monthlyTokenBudget: number;
}

export interface TokenChargeBreakdown {
  aiTokens: number;
  ttsCharacters: number;
  ttsTokens: number;
  totalTokens: number;
}

/** All voices with metadata — used to render the visual voice picker */
export const ALL_VOICES: VoiceOption[] = [
  { name: 'Sarah (Tech)', id: 'EXAVITQu4vr4xnSDxMaL', desc: 'Analytical · Clear', slot: 'a' },
  { name: 'David (Deep)', id: 'onwK4e9ZLuTAKqWW03F9', desc: 'Authoritative · Calm', slot: 'a' },
  { name: 'Marcus (Hype)', id: 'pNInz6obpgDQGcFmaJgB', desc: 'Energetic · Bold', slot: 'a' },
  { name: 'James (Analyst)', id: 'TX3LPaxmHKxFdv7VOQHJ', desc: 'Precise · Measured', slot: 'b' },
  { name: 'Elena (Skeptic)', id: 'ThT5KcBeYPX3keUQqHPh', desc: 'Inquisitive · Sharp', slot: 'b' },
  { name: 'Riley (Casual)', id: 'jBpfuIE2acCO8z3wKNLl', desc: 'Warm · Accessible', slot: 'b' },
];

const DEFAULT_FEATURE_FLAGS: PlanFeatureFlags = {
  priorityTts: false,
  shareEpisodeLinks: false,
  apiAccess: false,
  customVoices: false,
  whiteLabel: false,
  teamManagement: false,
};

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Try it out',
    price: 0,
    priceLabel: '$0 / month',
    tokenBudget: 300,
    tokenLabel: '300 monthly tokens',
    voices: 2,
    voiceLabel: 'Fixed AI hosts',
    audioQuality: 'Standard audio',
    features: [
      '300 monthly tokens',
      'English only · 1-minute podcasts',
      'Professional + Summary tones',
      'Default AI hosts only',
    ],
    cta: 'Get Started Free',
    highlighted: false,
    clerkPlanSlug: 'free',
    entitlements: {
      languages: ['English'],
      durations: [1],
      tones: ['Professional', 'Summary'],
      voices: {
        a: ['Sarah (Tech)'],
        b: ['James (Analyst)'],
      },
    },
  },
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For regular readers',
    price: 7,
    priceLabel: '$7 / month',
    tokenBudget: 2500,
    tokenLabel: '2,500 monthly tokens',
    voices: 6,
    voiceLabel: 'All 6 standard AI voices',
    audioQuality: 'HD audio',
    features: [
      '2,500 monthly tokens',
      'English + Hinglish',
      'Up to 2-minute podcasts',
      'All 4 tones + all 6 standard voices',
    ],
    cta: 'Start Creating',
    highlighted: false,
    clerkPlanSlug: 'starter',
    parentId: 'free',
    entitlements: {
      languages: ['Hinglish'],
      durations: [2],
      tones: ['Conversational', 'Debate'],
      voices: {
        a: ['David (Deep)', 'Marcus (Hype)'],
        b: ['Elena (Skeptic)', 'Riley (Casual)'],
      },
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For power users',
    price: 19,
    priceLabel: '$19 / month',
    tokenBudget: 7500,
    tokenLabel: '7,500 monthly tokens',
    voices: 6,
    voiceLabel: 'All standard voices + priority processing',
    audioQuality: 'HD priority',
    features: [
      '7,500 monthly tokens',
      'Up to 3-minute podcasts',
      'Priority processing',
      'Shareable episode links',
    ],
    cta: 'Go Pro',
    highlighted: true,
    clerkPlanSlug: 'pro',
    parentId: 'starter',
    entitlements: {
      durations: [3],
      featureFlags: {
        priorityTts: true,
        shareEpisodeLinks: true,
      },
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For teams & publishers',
    price: null,
    priceLabel: 'Custom pricing',
    tokenBudget: 30000,
    tokenLabel: '30,000 monthly tokens',
    voices: 0,
    voiceLabel: 'Custom + cloned voices',
    audioQuality: 'Enterprise grade',
    features: [
      '30,000 monthly tokens',
      'Custom voices + API access',
      'White-label output',
      'All Pro features included',
    ],
    cta: 'Contact Us',
    highlighted: false,
    clerkPlanSlug: 'enterprise',
    parentId: 'pro',
    entitlements: {
      featureFlags: {
        apiAccess: true,
        customVoices: true,
        whiteLabel: true,
        teamManagement: true,
      },
    },
  },
];

const PLAN_INDEX = Object.fromEntries(PLANS.map((plan) => [plan.id, plan])) as Record<PlanId, Plan>;

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export function getPlanDefinition(planId: PlanId): Plan {
  return PLAN_INDEX[planId];
}

export function resolvePlan(
  has: (params: { plan: string }) => boolean | undefined,
  couponPlan?: string
): PlanId {
  if (has({ plan: 'enterprise' }) || couponPlan === 'enterprise') return 'enterprise';
  if (has({ plan: 'pro' }) || couponPlan === 'pro') return 'pro';
  if (has({ plan: 'starter' }) || couponPlan === 'starter') return 'starter';
  return 'free';
}

export function getPlanEntitlements(planId: PlanId): ResolvedPlanEntitlements {
  const plan = getPlanDefinition(planId);
  const parent = plan.parentId
    ? getPlanEntitlements(plan.parentId)
    : {
        languages: [] as Language[],
        durations: [] as DurationOption[],
        tones: [] as Tone[],
        voices: { a: [], b: [] },
        featureFlags: DEFAULT_FEATURE_FLAGS,
      };

  return {
    languages: unique([...parent.languages, ...(plan.entitlements.languages ?? [])]),
    durations: unique([...parent.durations, ...(plan.entitlements.durations ?? [])]).sort((a, b) => a - b) as DurationOption[],
    tones: unique([...parent.tones, ...(plan.entitlements.tones ?? [])]),
    voices: {
      a: unique([...parent.voices.a, ...(plan.entitlements.voices?.a ?? [])]),
      b: unique([...parent.voices.b, ...(plan.entitlements.voices?.b ?? [])]),
    },
    featureFlags: {
      ...parent.featureFlags,
      ...plan.entitlements.featureFlags,
    },
    monthlyTokenBudget: plan.tokenBudget,
  };
}

export function estimateTokenChargeForDuration(duration: number): number {
  if (duration >= 3) return 360;
  if (duration === 2) return 220;
  return 120;
}

export function calculateTokenCharge(ttsCharacters: number): TokenChargeBreakdown {
  const aiTokens = 20;
  const ttsTokens = Math.ceil(Math.max(ttsCharacters, 0) / 100);

  return {
    aiTokens,
    ttsCharacters,
    ttsTokens,
    totalTokens: aiTokens + ttsTokens,
  };
}
