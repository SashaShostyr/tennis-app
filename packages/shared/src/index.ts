// Shared enums and types used by both the NestJS API and the React web app.
// Kept framework-agnostic (plain TS) so either side can import them.

export const Surface = {
  HARD: 'HARD',
  CLAY: 'CLAY',
  GRASS: 'GRASS',
  CARPET: 'CARPET',
} as const;
export type Surface = (typeof Surface)[keyof typeof Surface];
export const SURFACES = Object.values(Surface);

export const SessionType = {
  MATCH: 'MATCH',
  PRACTICE: 'PRACTICE',
  DRILLS: 'DRILLS',
  LESSON: 'LESSON',
  WALL: 'WALL',
  CARDIO: 'CARDIO',
} as const;
export type SessionType = (typeof SessionType)[keyof typeof SessionType];
export const SESSION_TYPES = Object.values(SessionType);

export const ParticipantRole = {
  PARTNER: 'PARTNER',
  OPPONENT: 'OPPONENT',
} as const;
export type ParticipantRole = (typeof ParticipantRole)[keyof typeof ParticipantRole];
export const PARTICIPANT_ROLES = Object.values(ParticipantRole);

// ---- Entity shapes (as returned by the API, JSON-serialized) ----

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  name: string;
  notes: string | null;
}

export interface SessionParticipant {
  id: string;
  contactId: string;
  role: ParticipantRole;
  contact?: Contact;
}

export interface Session {
  id: string;
  date: string;
  durationMin: number;
  location: string | null;
  surface: Surface;
  indoor: boolean;
  type: SessionType;
  feelRating: number | null;
  energyRating: number | null;
  funRating: number | null;
  notes: string | null;
  createdAt: string;
  participants: SessionParticipant[];
}

// ---- Auth payloads ----

export interface AuthResponse {
  accessToken: string;
  user: User;
}

// ---- Stats payload (GET /stats) ----

export interface WeeklyPoint {
  weekStart: string; // ISO date of the week's Monday
  count: number;
}

export interface BreakdownItem {
  key: string;
  count: number;
}

export interface Stats {
  totalSessions: number;
  totalHours: number;
  currentStreakWeeks: number;
  longestStreakWeeks: number;
  perWeekLast4: number; // avg sessions/week over last 4 weeks
  perWeekLast12: number;
  weekly: WeeklyPoint[]; // last 12 weeks
  bySurface: BreakdownItem[];
  byType: BreakdownItem[];
}

// Human-friendly labels for enums (handy for UI dropdowns).
export const SURFACE_LABELS: Record<Surface, string> = {
  HARD: 'Hard',
  CLAY: 'Clay',
  GRASS: 'Grass',
  CARPET: 'Carpet',
};

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  MATCH: 'Match',
  PRACTICE: 'Practice',
  DRILLS: 'Drills',
  LESSON: 'Lesson',
  WALL: 'Hitting wall',
  CARDIO: 'Cardio',
};

export const PARTICIPANT_ROLE_LABELS: Record<ParticipantRole, string> = {
  PARTNER: 'Partner',
  OPPONENT: 'Opponent',
};

// ---- AI Coach ----
// Shot type / handedness use lowercase string values to match the in-browser
// pose/metrics logic and the wire format (also the Prisma enum values).

export const ShotType = {
  forehand: 'forehand',
  backhand: 'backhand',
  serve: 'serve',
  volley: 'volley',
} as const;
export type ShotType = (typeof ShotType)[keyof typeof ShotType];
export const SHOT_TYPES = Object.values(ShotType);

export const Handedness = {
  right: 'right',
  left: 'left',
} as const;
export type Handedness = (typeof Handedness)[keyof typeof Handedness];

export type MetricStatus = 'good' | 'check' | 'needs-work';

export interface Metric {
  /** Human label, e.g. "Knee bend (load)". */
  label: string;
  /** Numeric value in `unit`, or null if it couldn't be measured. */
  value: number | null;
  unit: string;
  status: MetricStatus;
  /** One-line plain-language read of this metric. */
  note: string;
}

export interface Improvement {
  tip: string;
  why: string;
  drill: string;
}

/** Request body for POST /coach/analyze. */
export interface AnalyzeRequest {
  shotType: ShotType;
  handedness: Handedness;
  /** Two-handed backhand (only meaningful for backhand). */
  twoHandedBackhand?: boolean;
  metrics: Metric[];
  /** ~3 base64-encoded JPEG keyframes (no data: prefix). */
  keyframes: string[];
  /** Optional session to attach this analysis to. */
  sessionId?: string;
}

/** Coaching feedback returned by the model. */
export interface AnalyzeResponse {
  summary: string;
  strengths: string[];
  improvements: Improvement[];
  /** 0–100 coarse technique score. */
  overallScore: number;
}

/** Response from POST /coach/analyze: the feedback plus the saved row id. */
export interface AnalyzeResult extends AnalyzeResponse {
  analysisId: string;
}

/** A persisted analysis (as returned by the coach history endpoints). */
export interface Analysis {
  id: string;
  sessionId: string | null;
  shotType: ShotType;
  handedness: Handedness;
  twoHandedBackhand: boolean;
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: Improvement[];
  metrics: Metric[];
  createdAt: string;
}

export const SHOT_TYPE_LABELS: Record<ShotType, string> = {
  forehand: 'Forehand',
  backhand: 'Backhand',
  serve: 'Serve',
  volley: 'Volley',
};
