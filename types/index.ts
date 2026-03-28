import type { PlanId } from '@/lib/plans';

export interface Turn {
  speaker: 'A' | 'B';
  text: string;
}

export interface PodcastData {
  audio: string;
  transcript: Turn[];
  title: string;
  source: string;
  duration: string;
  // Usage metadata returned by the API
  usageCount?: number;
  limit?: number;
  plan?: PlanId;
}
