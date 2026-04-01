import type { DurationOption, PlanId, ResolvedPlanEntitlements, Tone, Language } from '@/lib/plans';

export interface Turn {
  speaker: 'A' | 'B';
  text: string;
}

export interface ResolvedSelections {
  language: Language;
  duration: DurationOption;
  tone: Tone;
  voiceA: string;
  voiceB: string;
}

export interface PodcastData {
  audio: string;
  transcript: Turn[];
  title: string;
  source: string;
  duration: string;
  plan: PlanId;
  resolvedSelections: ResolvedSelections;
  tokenBudget: number;
  tokensUsed: number;
  tokensRemaining: number;
  tokensCharged: number;
}

export interface EntitlementsData {
  plan: PlanId;
  entitlements: ResolvedPlanEntitlements;
  tokenBudget: number;
  tokensUsed: number;
  tokensRemaining: number;
}
