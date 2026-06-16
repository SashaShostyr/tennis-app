// Local coach types for the API. Kept here (rather than imported from
// @tennis/shared) so the API's TS compile root stays inside src/ — importing the
// shared package's source would nest the build output. The web app imports the
// equivalent shapes from @tennis/shared. Keep the two in sync.

import type { ShotType, Handedness } from '@prisma/client';

export type MetricStatus = 'good' | 'check' | 'needs-work';

export interface Metric {
  label: string;
  value: number | null;
  unit: string;
  status: MetricStatus;
  note: string;
}

export interface Improvement {
  tip: string;
  why: string;
  drill: string;
}

export interface AnalyzeRequest {
  shotType: ShotType;
  handedness: Handedness;
  twoHandedBackhand?: boolean;
  metrics: Metric[];
  keyframes: string[];
}

export interface AnalyzeResponse {
  summary: string;
  strengths: string[];
  improvements: Improvement[];
  overallScore: number;
}

export interface AnalyzeResult extends AnalyzeResponse {
  analysisId: string;
}
