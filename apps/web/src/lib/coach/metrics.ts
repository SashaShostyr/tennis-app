// Turn per-frame pose landmarks into approximate, tennis-specific metrics.
// Single uncalibrated camera => these are coarse signals, not measurements.
// Ported from the standalone Tennis AI Coach (types now come from @tennis/shared).

import type { Metric, MetricStatus, ShotType, Handedness } from '@tennis/shared';
import { LM, type FramePose, type Landmarks } from './pose';

interface Pt {
  x: number;
  y: number;
  v: number; // visibility 0..1
}

const VIS = 0.4; // minimum visibility to trust a landmark

function get(lms: Landmarks | null, i: number): Pt | null {
  if (!lms) return null;
  const l = lms[i];
  if (!l) return null;
  const v = l.visibility ?? 0;
  if (v < VIS) return null;
  return { x: l.x, y: l.y, v };
}

function mid(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, v: Math.min(a.v, b.v) };
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Interior angle at vertex `b` formed by a-b-c, in degrees (0..180). */
function angleDeg(a: Pt, b: Pt, c: Pt): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const dot = v1x * v2x + v1y * v2y;
  const m1 = Math.hypot(v1x, v1y);
  const m2 = Math.hypot(v2x, v2y);
  if (m1 === 0 || m2 === 0) return NaN;
  const cos = Math.max(-1, Math.min(1, dot / (m1 * m2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Indices for the player's hitting (dominant) and off sides. */
function sides(handedness: Handedness) {
  return handedness === 'right'
    ? {
        domShoulder: LM.RIGHT_SHOULDER,
        domElbow: LM.RIGHT_ELBOW,
        domWrist: LM.RIGHT_WRIST,
        offWrist: LM.LEFT_WRIST,
      }
    : {
        domShoulder: LM.LEFT_SHOULDER,
        domElbow: LM.LEFT_ELBOW,
        domWrist: LM.LEFT_WRIST,
        offWrist: LM.RIGHT_WRIST,
      };
}

/** Median distance from shoulders to ankles — a per-frame body-height proxy in normalized units. */
function bodyHeight(poses: FramePose[]): number {
  const heights: number[] = [];
  for (const p of poses) {
    const ls = get(p.landmarks, LM.LEFT_SHOULDER);
    const rs = get(p.landmarks, LM.RIGHT_SHOULDER);
    const la = get(p.landmarks, LM.LEFT_ANKLE);
    const ra = get(p.landmarks, LM.RIGHT_ANKLE);
    if (ls && rs && la && ra) heights.push(dist(mid(ls, rs), mid(la, ra)));
  }
  if (!heights.length) return 0.6; // fallback guess in normalized space
  heights.sort((a, b) => a - b);
  return heights[Math.floor(heights.length / 2)];
}

function metric(
  label: string,
  value: number | null,
  unit: string,
  status: MetricStatus,
  note: string,
): Metric {
  return { label, value: value === null ? null : round(value), unit, status, note };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function band(value: number, good: [number, number], check: [number, number]): MetricStatus {
  if (value >= good[0] && value <= good[1]) return 'good';
  if (value >= check[0] && value <= check[1]) return 'check';
  return 'needs-work';
}

/** Number of frames in which a full body was detected. */
export function detectedFrameCount(poses: FramePose[]): number {
  return poses.filter((p) => {
    const ls = get(p.landmarks, LM.LEFT_SHOULDER);
    const rh = get(p.landmarks, LM.RIGHT_HIP);
    return Boolean(ls && rh);
  }).length;
}

/**
 * Find the approximate contact frame: the frame where the dominant wrist is moving fastest.
 * Returns an index into `poses`, or the middle frame as a fallback.
 */
function contactIndex(poses: FramePose[], domWrist: number): number {
  let best = -1;
  let bestSpeed = -1;
  for (let i = 1; i < poses.length; i++) {
    const prev = get(poses[i - 1].landmarks, domWrist);
    const cur = get(poses[i].landmarks, domWrist);
    if (!prev || !cur) continue;
    const speed = dist(prev, cur);
    if (speed > bestSpeed) {
      bestSpeed = speed;
      best = i;
    }
  }
  return best >= 0 ? best : Math.floor(poses.length / 2);
}

export interface ComputedMetrics {
  metrics: Metric[];
  contactIndex: number;
}

export function computeMetrics(
  poses: FramePose[],
  shotType: ShotType,
  handedness: Handedness,
  twoHandedBackhand = false,
): ComputedMetrics {
  const s = sides(handedness);
  const h = bodyHeight(poses);
  const cIdx = contactIndex(poses, s.domWrist);
  const contact = poses[cIdx];
  const metrics: Metric[] = [];

  // 1. Knee bend (load): deepest (minimum) knee angle across the clip, more-visible leg.
  let minKnee = Infinity;
  for (const p of poses) {
    for (const [hip, knee, ankle] of [
      [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE],
      [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
    ]) {
      const a = get(p.landmarks, hip);
      const b = get(p.landmarks, knee);
      const c = get(p.landmarks, ankle);
      if (a && b && c) {
        const ang = angleDeg(a, b, c);
        if (!isNaN(ang)) minKnee = Math.min(minKnee, ang);
      }
    }
  }
  if (isFinite(minKnee)) {
    // ~180 = straight legs (no load); lower = deeper bend.
    const status = band(minKnee, [110, 150], [150, 165]);
    metrics.push(
      metric(
        'Knee bend (load)',
        minKnee,
        '°',
        status,
        status === 'good'
          ? "Good knee flexion — you're loading the legs to drive up into the shot."
          : status === 'check'
            ? 'Moderate knee bend; a bit more load could add power.'
            : 'Legs look fairly straight — bend the knees more to load and push up.',
      ),
    );
  } else {
    metrics.push(metric('Knee bend (load)', null, '°', 'check', 'Legs not clearly visible.'));
  }

  // 2. Hitting-arm extension at contact.
  {
    const sh = get(contact.landmarks, s.domShoulder);
    const el = get(contact.landmarks, s.domElbow);
    const wr = get(contact.landmarks, s.domWrist);
    if (sh && el && wr) {
      const ang = angleDeg(sh, el, wr);
      // Serves want near-full extension; groundstrokes a strong but slightly softer arm.
      const target: [number, number] = shotType === 'serve' ? [160, 180] : [120, 170];
      const status = band(ang, target, [target[0] - 25, target[1]]);
      metrics.push(
        metric(
          'Hitting-arm extension at contact',
          ang,
          '°',
          status,
          status === 'good'
            ? 'Arm extension at contact looks solid.'
            : 'Check arm extension at contact — aim to meet the ball with a stable, extended structure.',
        ),
      );
    } else {
      metrics.push(
        metric(
          'Hitting-arm extension at contact',
          null,
          '°',
          'check',
          'Hitting arm not clearly visible at contact.',
        ),
      );
    }
  }

  // 3. Shoulder–hip separation (coil): max angular difference between shoulder line and hip line.
  {
    let maxSep = -Infinity;
    for (const p of poses) {
      const ls = get(p.landmarks, LM.LEFT_SHOULDER);
      const rs = get(p.landmarks, LM.RIGHT_SHOULDER);
      const lh = get(p.landmarks, LM.LEFT_HIP);
      const rh = get(p.landmarks, LM.RIGHT_HIP);
      if (ls && rs && lh && rh) {
        const shAng = Math.atan2(rs.y - ls.y, rs.x - ls.x);
        const hipAng = Math.atan2(rh.y - lh.y, rh.x - lh.x);
        let diff = Math.abs(shAng - hipAng) * (180 / Math.PI);
        if (diff > 180) diff = 360 - diff;
        maxSep = Math.max(maxSep, diff);
      }
    }
    if (isFinite(maxSep)) {
      const status = band(maxSep, [20, 90], [10, 20]);
      metrics.push(
        metric(
          'Shoulder–hip separation (coil)',
          maxSep,
          '°',
          status,
          status === 'good'
            ? 'Nice separation between shoulders and hips — that coil stores energy.'
            : 'Limited shoulder/hip separation — try coiling the upper body more during preparation.',
        ),
      );
    } else {
      metrics.push(
        metric('Shoulder–hip separation (coil)', null, '°', 'check', 'Torso not clearly visible.'),
      );
    }
  }

  // 4. Contact height: dominant wrist height relative to hips, as % of body height.
  {
    const wr = get(contact.landmarks, s.domWrist);
    const lh = get(contact.landmarks, LM.LEFT_HIP);
    const rh = get(contact.landmarks, LM.RIGHT_HIP);
    if (wr && lh && rh && h > 0) {
      const hipMid = mid(lh, rh);
      const pct = ((hipMid.y - wr.y) / h) * 100; // +ve = above hips
      // Groundstrokes ~ around waist/chest; serves much higher.
      const status =
        shotType === 'serve' ? band(pct, [60, 140], [30, 60]) : band(pct, [10, 70], [-10, 10]);
      metrics.push(
        metric(
          'Contact height (vs hips)',
          pct,
          '%',
          status,
          shotType === 'serve'
            ? 'Higher is better on the serve — reach up to contact.'
            : 'Contact height relative to your hips; aim to meet the ball comfortably out and up.',
        ),
      );
    } else {
      metrics.push(
        metric('Contact height (vs hips)', null, '%', 'check', 'Wrist/hips not visible at contact.'),
      );
    }
  }

  // 5. Balance at contact: horizontal offset of shoulders over ankles, as % of body height (lower = better).
  {
    const ls = get(contact.landmarks, LM.LEFT_SHOULDER);
    const rs = get(contact.landmarks, LM.RIGHT_SHOULDER);
    const la = get(contact.landmarks, LM.LEFT_ANKLE);
    const ra = get(contact.landmarks, LM.RIGHT_ANKLE);
    if (ls && rs && la && ra && h > 0) {
      const offset = (Math.abs(mid(ls, rs).x - mid(la, ra).x) / h) * 100;
      const status = band(offset, [0, 18], [18, 30]);
      metrics.push(
        metric(
          'Balance (shoulders over base)',
          offset,
          '%',
          status,
          status === 'good'
            ? 'Well balanced — upper body stacked over your base.'
            : 'Upper body is leaning off your base; work on staying balanced through contact.',
        ),
      );
    } else {
      metrics.push(
        metric('Balance (shoulders over base)', null, '%', 'check', 'Body not fully visible at contact.'),
      );
    }
  }

  // 6. Follow-through: dominant-wrist travel from contact to the last detected frame, as % of body height.
  {
    const start = get(contact.landmarks, s.domWrist);
    let end: Pt | null = null;
    for (let i = poses.length - 1; i > cIdx; i--) {
      end = get(poses[i].landmarks, s.domWrist);
      if (end) break;
    }
    if (start && end && h > 0) {
      const travel = (dist(start, end) / h) * 100;
      const status = band(travel, [25, 200], [12, 25]);
      metrics.push(
        metric(
          'Follow-through length',
          travel,
          '%',
          status,
          status === 'good'
            ? "Full follow-through — you're swinging through the ball."
            : 'Short follow-through — keep accelerating through and finish the swing.',
        ),
      );
    } else {
      metrics.push(
        metric('Follow-through length', null, '%', 'check', "Couldn't track the wrist after contact."),
      );
    }
  }

  // 7. Off-arm involvement: distance between wrists at contact, as % of body height.
  {
    const dom = get(contact.landmarks, s.domWrist);
    const off = get(contact.landmarks, s.offWrist);
    if (dom && off && h > 0) {
      const spread = (dist(dom, off) / h) * 100;
      const expectTogether = shotType === 'serve' || (shotType === 'backhand' && twoHandedBackhand);
      const status = expectTogether ? band(spread, [0, 25], [25, 40]) : band(spread, [25, 120], [12, 25]);
      metrics.push(
        metric(
          'Off-arm involvement',
          spread,
          '%',
          status,
          expectTogether
            ? 'Hands stay connected for this shot — looks appropriate.'
            : status === 'good'
              ? 'Off-arm is active and helping you stay balanced and coiled.'
              : 'Use your non-hitting arm more — it aids balance, coil, and tracking the ball.',
        ),
      );
    } else {
      metrics.push(
        metric('Off-arm involvement', null, '%', 'check', 'Off arm not clearly visible at contact.'),
      );
    }
  }

  return { metrics, contactIndex: cIdx };
}
