// Turn per-frame pose landmarks into approximate, tennis-specific metrics.
// Single uncalibrated camera => these are coarse signals, not measurements.
// Ported from the standalone Tennis AI Coach (types now come from @tennis/shared).

import type { Metric, MetricStatus, ShotType, Handedness } from '@tennis/shared';
import { LM, type FramePose, type Landmarks } from './pose';
import type { BallFrame } from './ball';

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

// Status thresholds, shared by the metrics table and the on-image overlay so both
// agree on what counts as good / check / needs-work.
export function kneeBendStatus(angle: number): MetricStatus {
  return band(angle, [110, 150], [150, 165]);
}
export function armExtensionStatus(angle: number, shotType: ShotType): MetricStatus {
  const target: [number, number] = shotType === 'serve' ? [160, 180] : [120, 170];
  return band(angle, target, [target[0] - 25, target[1]]);
}
export function separationStatus(deg: number): MetricStatus {
  return band(deg, [20, 90], [10, 20]);
}
export function contactHeightStatus(pct: number, shotType: ShotType): MetricStatus {
  return shotType === 'serve' ? band(pct, [60, 140], [30, 60]) : band(pct, [10, 70], [-10, 10]);
}
export function balanceStatus(offsetPct: number): MetricStatus {
  return band(offsetPct, [0, 18], [18, 30]);
}
export function followThroughStatus(travelPct: number): MetricStatus {
  return band(travelPct, [25, 200], [12, 25]);
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
 * Per-frame dominant-wrist speed, normalized by the inter-frame time gap (so coarse
 * and dense samplings are comparable) and 3-tap smoothed to suppress jitter.
 * Frames with a missing wrist contribute 0.
 */
function wristSpeeds(poses: FramePose[], domWrist: number): number[] {
  const raw: (number | null)[] = poses.map(() => null);
  for (let i = 1; i < poses.length; i++) {
    const prev = get(poses[i - 1].landmarks, domWrist);
    const cur = get(poses[i].landmarks, domWrist);
    if (!prev || !cur) continue;
    const dt = Math.max(poses[i].time - poses[i - 1].time, 1e-3);
    raw[i] = dist(prev, cur) / dt;
  }
  return raw.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let k = i - 1; k <= i + 1; k++) {
      if (k >= 0 && k < raw.length && raw[k] != null) {
        sum += raw[k] as number;
        n += 1;
      }
    }
    return n ? sum / n : 0;
  });
}

/**
 * Time (seconds) of peak smoothed dominant-wrist motion — the rough centre of the
 * swing. Used to window the dense second sampling pass. Null if no wrist was tracked.
 */
export function findMotionPeakTime(poses: FramePose[], handedness: Handedness): number | null {
  const s = sides(handedness);
  const speeds = wristSpeeds(poses, s.domWrist);
  let best = -1;
  let bi = -1;
  for (let i = 0; i < speeds.length; i++) {
    if (speeds[i] > best) {
      best = speeds[i];
      bi = i;
    }
  }
  return bi >= 0 && best > 0 ? poses[bi].time : null;
}

/** Smallest distance from the dominant wrist to any ball candidate in a frame, or null. */
function ballWristDist(pose: FramePose, balls: BallFrame | undefined, domWrist: number): number | null {
  const wr = get(pose.landmarks, domWrist);
  const cands = balls?.candidates ?? [];
  if (!wr || !cands.length) return null;
  let best = Infinity;
  for (const c of cands) best = Math.min(best, Math.hypot(c.x - wr.x, c.y - wr.y));
  return isFinite(best) ? best : null;
}

/**
 * Locate the contact frame by fusing two signals:
 *  - smoothed dominant-wrist speed (contact sits at peak swing speed), and
 *  - ball→wrist proximity (the ball is nearest the racket hand at contact).
 *
 * Every frame is scored on its full, normalized wrist speed; ball proximity is an
 * additive *bonus* when a ball is detected near the wrist. This is deliberate: at
 * the true contact frame the ball is most motion-blurred and is the one EfficientDet
 * is likeliest to miss, so a multiplicative/penalizing scheme would bias selection
 * toward slower neighbours where the ball happens to be detectable. A bonus can only
 * pull the estimate toward a nearby ball, never push a fast (likely-contact) frame
 * down. With no reliable ball signal this reduces to the de-noised wrist-speed peak.
 */
function findContact(
  poses: FramePose[],
  balls: BallFrame[] | undefined,
  domWrist: number,
): number {
  const speeds = wristSpeeds(poses, domWrist);
  const maxSpeed = Math.max(...speeds, 1e-6);

  const ballDist = poses.map((p, i) => ballWristDist(p, balls?.[i], domWrist));
  const valid = ballDist.filter((d): d is number => d != null);
  const haveBall = valid.length;
  const maxDist = haveBall ? Math.max(...valid, 1e-6) : 1;

  let best = -Infinity;
  let bi = -1;
  for (let i = 0; i < poses.length; i++) {
    let score = speeds[i] / maxSpeed; // 0..1, every frame on the same scale
    if (haveBall >= 2 && ballDist[i] != null) {
      const prox = 1 - (ballDist[i] as number) / maxDist; // 1 = ball closest to wrist
      score += 0.6 * prox; // bonus only — never penalizes a missing-ball frame
    }
    if (score > best) {
      best = score;
      bi = i;
    }
  }
  return bi >= 0 ? bi : Math.floor(poses.length / 2);
}

export interface ComputedMetrics {
  metrics: Metric[];
  contactIndex: number;
  /** A ball was detected close to the racket hand at the contact frame. */
  ballDetected: boolean;
}

export function computeMetrics(
  poses: FramePose[],
  shotType: ShotType,
  handedness: Handedness,
  twoHandedBackhand = false,
  balls?: BallFrame[],
): ComputedMetrics {
  const s = sides(handedness);
  const h = bodyHeight(poses);
  const cIdx = findContact(poses, balls, s.domWrist);
  const contact = poses[cIdx];
  const metrics: Metric[] = [];

  // A ball sitting near the racket hand at contact (within ~18% of frame width).
  const contactBallDist = ballWristDist(contact, balls?.[cIdx], s.domWrist);
  const ballDetected = contactBallDist != null && contactBallDist < 0.18;

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
    const status = kneeBendStatus(minKnee);
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
      const status = armExtensionStatus(ang, shotType);
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
      const status = separationStatus(maxSep);
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
      const status = contactHeightStatus(pct, shotType);
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
      const status = balanceStatus(offset);
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
      const status = followThroughStatus(travel);
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

  return { metrics, contactIndex: cIdx, ballDetected };
}

// ---------------------------------------------------------------------------
// On-image overlay geometry. Built from the same landmarks/thresholds as the
// metrics above so the drawn highlights and the metrics table always agree.
// All coordinates are normalized [0..1] (origin top-left), ready to scale onto
// an image of any size.
// ---------------------------------------------------------------------------

export interface OverlayPoint {
  x: number;
  y: number;
}

export interface OverlayAnnotation {
  /** angle = arc at points[1] between points[0] and points[2]; segment = line points[0]→[1];
   *  plumb = vertical reference + lean line; arrow = points[0]→[1] with head; ball = circle at points[0]. */
  kind: 'angle' | 'segment' | 'plumb' | 'arrow' | 'ball';
  status: MetricStatus;
  label: string;
  points: OverlayPoint[];
}

export interface FrameOverlay {
  /** Pose landmarks for this frame (for the skeleton), or null if undetected. */
  landmarks: OverlayPoint[] | null;
  /** Per-landmark visibility, parallel to `landmarks`. */
  visibility: number[] | null;
  /** Diagnostic highlights to draw on top of the skeleton. */
  annotations: OverlayAnnotation[];
}

function pt(p: Pt): OverlayPoint {
  return { x: p.x, y: p.y };
}

/** Deeper-bent of the two legs (smaller knee angle) among those clearly visible. */
function deeperKnee(
  lms: Landmarks | null,
): { hip: Pt; knee: Pt; ankle: Pt; angle: number } | null {
  let best: { hip: Pt; knee: Pt; ankle: Pt; angle: number } | null = null;
  for (const [hip, knee, ankle] of [
    [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE],
    [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
  ]) {
    const a = get(lms, hip);
    const b = get(lms, knee);
    const c = get(lms, ankle);
    if (!a || !b || !c) continue;
    const angle = angleDeg(a, b, c);
    if (isNaN(angle)) continue;
    if (!best || angle < best.angle) best = { hip: a, knee: b, ankle: c, angle };
  }
  return best;
}

/**
 * Build draw-ready overlay data for the keyframes being displayed.
 *
 * @param poses        all dense-pass poses
 * @param frameIdxs    dense indices being shown, in chronological order
 * @param contactIdx   dense index of the estimated contact frame
 */
export function buildOverlays(
  poses: FramePose[],
  frameIdxs: number[],
  contactIdx: number,
  shotType: ShotType,
  handedness: Handedness,
  twoHandedBackhand = false,
  balls?: BallFrame[],
): FrameOverlay[] {
  void twoHandedBackhand; // reserved for a future off-arm overlay
  const s = sides(handedness);
  const h = bodyHeight(poses) || 0.6;
  const contactPos = frameIdxs.indexOf(contactIdx);

  return frameIdxs.map((di, k) => {
    const lms = poses[di]?.landmarks ?? null;
    const annotations: OverlayAnnotation[] = [];
    const isContact = di === contactIdx;
    // The displayed frame just before contact is the "load"; if contact is first,
    // fold the load annotations onto the contact frame so they still show.
    const isLoad = contactPos > 0 ? k === contactPos - 1 : isContact;
    const isFinish = k === frameIdxs.length - 1 && k > contactPos;

    if (lms) {
      // Knee bend (load).
      if (isLoad) {
        const leg = deeperKnee(lms);
        if (leg) {
          annotations.push({
            kind: 'angle',
            status: kneeBendStatus(leg.angle),
            label: `Knee ${Math.round(leg.angle)}°`,
            points: [pt(leg.hip), pt(leg.knee), pt(leg.ankle)],
          });
        }
        // Shoulder–hip separation (coil): show both lines.
        const ls = get(lms, LM.LEFT_SHOULDER);
        const rs = get(lms, LM.RIGHT_SHOULDER);
        const lh = get(lms, LM.LEFT_HIP);
        const rh = get(lms, LM.RIGHT_HIP);
        if (ls && rs && lh && rh) {
          const shAng = Math.atan2(rs.y - ls.y, rs.x - ls.x);
          const hipAng = Math.atan2(rh.y - lh.y, rh.x - lh.x);
          let diff = Math.abs(shAng - hipAng) * (180 / Math.PI);
          if (diff > 180) diff = 360 - diff;
          const status = separationStatus(diff);
          annotations.push({
            kind: 'segment',
            status,
            label: `Coil ${Math.round(diff)}°`,
            points: [pt(ls), pt(rs)],
          });
          annotations.push({ kind: 'segment', status, label: '', points: [pt(lh), pt(rh)] });
        }
      }

      if (isContact) {
        // Hitting-arm extension.
        const sh = get(lms, s.domShoulder);
        const el = get(lms, s.domElbow);
        const wr = get(lms, s.domWrist);
        if (sh && el && wr) {
          const ang = angleDeg(sh, el, wr);
          if (!isNaN(ang)) {
            annotations.push({
              kind: 'angle',
              status: armExtensionStatus(ang, shotType),
              label: `Arm ${Math.round(ang)}°`,
              points: [pt(sh), pt(el), pt(wr)],
            });
          }
        }
        // Balance: shoulders-midpoint plumbed over the base.
        const ls = get(lms, LM.LEFT_SHOULDER);
        const rs = get(lms, LM.RIGHT_SHOULDER);
        const la = get(lms, LM.LEFT_ANKLE);
        const ra = get(lms, LM.RIGHT_ANKLE);
        if (ls && rs && la && ra) {
          const top = mid(ls, rs);
          const base = mid(la, ra);
          const offset = (Math.abs(top.x - base.x) / h) * 100;
          annotations.push({
            kind: 'plumb',
            status: balanceStatus(offset),
            label: `Lean ${Math.round(offset)}%`,
            points: [pt(top), pt(base)],
          });
        }
        // Ball at contact (only when close to the racket hand).
        if (wr && balls?.[di]) {
          let nearest: { x: number; y: number; d: number } | null = null;
          for (const c of balls[di].candidates) {
            const d = Math.hypot(c.x - wr.x, c.y - wr.y);
            if (!nearest || d < nearest.d) nearest = { x: c.x, y: c.y, d };
          }
          if (nearest && nearest.d < 0.18) {
            annotations.push({
              kind: 'ball',
              status: 'good',
              label: 'Ball',
              points: [{ x: nearest.x, y: nearest.y }],
            });
          }
        }
      }

      // Follow-through: wrist travel from contact to this finishing frame.
      if (isFinish) {
        const startWr = get(poses[contactIdx]?.landmarks ?? null, s.domWrist);
        const endWr = get(lms, s.domWrist);
        if (startWr && endWr) {
          const travel = (dist(startWr, endWr) / h) * 100;
          annotations.push({
            kind: 'arrow',
            status: followThroughStatus(travel),
            label: 'Follow-through',
            points: [pt(startWr), pt(endWr)],
          });
        }
      }
    }

    return {
      landmarks: lms ? lms.map((l) => ({ x: l.x, y: l.y })) : null,
      visibility: lms ? lms.map((l) => l.visibility ?? 0) : null,
      annotations,
    };
  });
}

// Surface for overlay consumers that gate on the same visibility floor.
export const VISIBILITY_FLOOR = VIS;
