// Draws the pose skeleton and the diagnostic annotations on top of a keyframe.
// Landmarks are normalized [0..1]; we scale them into a viewBox that matches the
// frame's real pixel aspect (preserveAspectRatio "meet") so nothing is distorted,
// and the SVG is sized to exactly cover the <img> beneath it.

import type { MetricStatus } from '@tennis/shared';
import { SKELETON_EDGES, SKELETON_JOINTS } from '../../lib/coach/pose';
import {
  VISIBILITY_FLOOR,
  type FrameOverlay,
  type OverlayPoint,
  type OverlayAnnotation,
} from '../../lib/coach/metrics';

const STATUS_COLOR: Record<MetricStatus, string> = {
  good: '#1c7a52',
  check: '#c08a17',
  'needs-work': '#c0432e',
};

interface Props {
  overlay: FrameOverlay;
  /** Frame pixel dimensions, used for an undistorted viewBox. */
  vw: number;
  vh: number;
  showSkeleton?: boolean;
  showAnnotations?: boolean;
}

export function PoseOverlay({
  overlay,
  vw,
  vh,
  showSkeleton = true,
  showAnnotations = true,
}: Props) {
  const u = Math.max(vw, vh) || 1;
  const lms = overlay.landmarks;
  const vis = overlay.visibility;
  const X = (p: OverlayPoint) => p.x * vw;
  const Y = (p: OverlayPoint) => p.y * vh;
  const visible = (i: number) => (vis ? (vis[i] ?? 0) >= VISIBILITY_FLOOR : false);

  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {/* Skeleton */}
      {showSkeleton && lms && (
        <g stroke="rgba(255,255,255,0.75)" strokeWidth={u * 0.004} strokeLinecap="round">
          {SKELETON_EDGES.map(([a, b], i) =>
            visible(a) && visible(b) ? (
              <line key={`e${i}`} x1={X(lms[a])} y1={Y(lms[a])} x2={X(lms[b])} y2={Y(lms[b])} />
            ) : null,
          )}
          {SKELETON_JOINTS.map((j) =>
            visible(j) ? (
              <circle
                key={`j${j}`}
                cx={X(lms[j])}
                cy={Y(lms[j])}
                r={u * 0.006}
                fill="#ffffff"
                stroke="none"
              />
            ) : null,
          )}
        </g>
      )}

      {/* Annotations */}
      {showAnnotations &&
        overlay.annotations.map((a, i) => (
          <Annotation key={`a${i}`} a={a} X={X} Y={Y} u={u} />
        ))}
    </svg>
  );
}

function Annotation({
  a,
  X,
  Y,
  u,
}: {
  a: OverlayAnnotation;
  X: (p: OverlayPoint) => number;
  Y: (p: OverlayPoint) => number;
  u: number;
}) {
  const color = STATUS_COLOR[a.status];
  const sw = u * 0.0075;

  switch (a.kind) {
    case 'angle': {
      const [p0, v, p1] = a.points;
      return (
        <g>
          <polyline
            points={`${X(p0)},${Y(p0)} ${X(v)},${Y(v)} ${X(p1)},${Y(p1)}`}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={X(v)} cy={Y(v)} r={u * 0.012} fill="none" stroke={color} strokeWidth={sw * 0.7} />
          <Label x={X(v) + u * 0.02} y={Y(v) - u * 0.02} text={a.label} u={u} />
        </g>
      );
    }
    case 'segment': {
      const [p0, p1] = a.points;
      return (
        <g>
          <line
            x1={X(p0)}
            y1={Y(p0)}
            x2={X(p1)}
            y2={Y(p1)}
            stroke={color}
            strokeWidth={sw}
            strokeDasharray={`${u * 0.012} ${u * 0.012}`}
            strokeLinecap="round"
          />
          {a.label && (
            <Label x={(X(p0) + X(p1)) / 2} y={(Y(p0) + Y(p1)) / 2 - u * 0.015} text={a.label} u={u} />
          )}
        </g>
      );
    }
    case 'plumb': {
      const [top, base] = a.points;
      return (
        <g>
          {/* ideal vertical reference */}
          <line
            x1={X(top)}
            y1={Y(top)}
            x2={X(top)}
            y2={Y(base)}
            stroke="rgba(255,255,255,0.6)"
            strokeWidth={sw * 0.7}
            strokeDasharray={`${u * 0.01} ${u * 0.01}`}
          />
          {/* actual lean */}
          <line x1={X(top)} y1={Y(top)} x2={X(base)} y2={Y(base)} stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <circle cx={X(top)} cy={Y(top)} r={u * 0.008} fill={color} />
          <Label x={X(top) + u * 0.02} y={Y(top) - u * 0.01} text={a.label} u={u} />
        </g>
      );
    }
    case 'arrow': {
      const [p0, p1] = a.points;
      const x0 = X(p0);
      const y0 = Y(p0);
      const x1 = X(p1);
      const y1 = Y(p1);
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const hl = u * 0.03;
      const hw = u * 0.018;
      const bx = x1 - ux * hl;
      const by = y1 - uy * hl;
      const px = -uy;
      const py = ux;
      return (
        <g>
          <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <polygon
            points={`${x1},${y1} ${bx + px * hw},${by + py * hw} ${bx - px * hw},${by - py * hw}`}
            fill={color}
          />
          <Label x={(x0 + x1) / 2} y={(y0 + y1) / 2 - u * 0.015} text={a.label} u={u} />
        </g>
      );
    }
    case 'ball': {
      const [c] = a.points;
      return (
        <g>
          <circle cx={X(c)} cy={Y(c)} r={u * 0.022} fill="none" stroke={color} strokeWidth={sw} />
          <circle cx={X(c)} cy={Y(c)} r={u * 0.004} fill={color} />
          <Label x={X(c) + u * 0.028} y={Y(c) - u * 0.02} text={a.label} u={u} />
        </g>
      );
    }
    default:
      return null;
  }
}

/** White text with a dark halo so labels stay legible over any background. */
function Label({ x, y, text, u }: { x: number; y: number; text: string; u: number }) {
  return (
    <text
      x={x}
      y={y}
      fontSize={u * 0.034}
      fontWeight={700}
      fill="#ffffff"
      stroke="#0b3d2e"
      strokeWidth={u * 0.007}
      paintOrder="stroke"
      style={{ paintOrder: 'stroke' }}
    >
      {text}
    </text>
  );
}
