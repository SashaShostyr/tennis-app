import { useState } from 'react';
import type { AnalyzeResponse, Metric, MetricStatus } from '@tennis/shared';
import type { FrameOverlay } from '../../lib/coach/metrics';
import { PoseOverlay } from './PoseOverlay';
import { Lightbox } from './Lightbox';

interface Props {
  /** AI coaching result, or null when the coaching call was unavailable. */
  result: AnalyzeResponse | null;
  metrics: Metric[];
  /** base64 jpeg keyframes sent to the coach (chronological). Empty for saved history. */
  frames?: string[];
  /** index within `frames` of the estimated contact frame, or -1. */
  contactPos?: number;
  /** Pose/annotation overlay per keyframe, aligned with `frames`. Current session only. */
  overlays?: FrameOverlay[];
  /** Keyframe pixel dimensions, for undistorted overlays. */
  frameSize?: { w: number; h: number };
}

const STATUS_TEXT: Record<MetricStatus, string> = {
  good: 'text-good',
  check: 'text-check',
  'needs-work': 'text-warn',
};

export function Feedback({
  result,
  metrics,
  frames = [],
  contactPos = -1,
  overlays,
  frameSize,
}: Props) {
  // Without an AI result the metrics are the only feedback, so show them expanded.
  const [showMetrics, setShowMetrics] = useState(!result);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const vw = frameSize?.w ?? 1;
  const vh = frameSize?.h ?? 1;
  const canOverlay = Boolean(overlays && frameSize);

  return (
    <div className="card">
      <h2 className="mb-3 text-base font-semibold">
        {result ? 'Your coaching feedback' : 'Your shot analysis'}
      </h2>

      {result ? (
        <div className="flex items-center gap-4">
          <ScoreDial score={result.overallScore} />
          <p className="text-[0.97rem]">{result.summary}</p>
        </div>
      ) : (
        <p className="text-[0.97rem] text-gray-500">
          Here's what was measured on your device from the clip. AI coaching text isn't available
          right now, but the frames, pose, and metrics below still show how the shot looked.
        </p>
      )}

      {frames.length > 0 && (
        <figure className="mt-4">
          <figcaption className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
            Frames sent to the coach{canOverlay ? ' — tap to enlarge & see your pose' : ''}
          </figcaption>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${frames.length}, minmax(0, 1fr))` }}
          >
            {frames.map((f, i) => (
              <div key={i} className="text-center">
                <button
                  type="button"
                  onClick={() => canOverlay && setLightbox(i)}
                  className={`relative block w-full overflow-hidden rounded-lg ${
                    canOverlay ? 'cursor-zoom-in' : 'cursor-default'
                  } ${i === contactPos ? 'ring-2 ring-brand-accent' : ''}`}
                >
                  <img
                    src={`data:image/jpeg;base64,${f}`}
                    alt={i === contactPos ? 'Estimated contact frame' : `Keyframe ${i + 1}`}
                    className="block w-full"
                  />
                  {canOverlay && overlays?.[i] && (
                    <PoseOverlay
                      overlay={overlays[i]}
                      vw={vw}
                      vh={vh}
                      showAnnotations={false}
                    />
                  )}
                </button>
                <span className="mt-1 block text-[0.7rem] text-gray-500">{frameLabel(i, contactPos)}</span>
              </div>
            ))}
          </div>
        </figure>
      )}

      {lightbox !== null && (
        <Lightbox
          frames={frames}
          overlays={overlays}
          vw={vw}
          vh={vh}
          startIndex={lightbox}
          contactPos={contactPos}
          onClose={() => setLightbox(null)}
        />
      )}

      {result && result.strengths.length > 0 && (
        <section>
          <h3 className="mb-1.5 mt-4 text-base font-semibold">✅ Strengths</h3>
          <ul className="list-disc pl-5">
            {result.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </section>
      )}

      {result && result.improvements.length > 0 && (
        <section>
          <h3 className="mb-1.5 mt-4 text-base font-semibold">🎯 Top things to work on</h3>
          <ol className="list-decimal pl-5">
            {result.improvements.map((imp, i) => (
              <li key={i} className="mb-3.5">
                <p className="font-semibold">{imp.tip}</p>
                <p className="mt-1 text-sm text-gray-500">
                  <span className="font-semibold text-gray-800">Why:</span> {imp.why}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  <span className="font-semibold text-gray-800">Drill:</span> {imp.drill}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {metrics.length > 0 && (
        <>
          <button
            type="button"
            className="cursor-pointer pt-3.5 pb-1 text-sm text-brand-accent underline"
            onClick={() => setShowMetrics((v) => !v)}
          >
            {showMetrics ? 'Hide' : 'Show'} measured metrics
          </button>

          {showMetrics && (
            <table className="w-full border-collapse text-sm">
              <tbody>
                {metrics.map((m, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="py-2 pr-1">{m.label}</td>
                    <td className="py-2 pr-1 text-right tabular-nums">
                      {m.value === null ? '—' : `${m.value}${m.unit}`}
                    </td>
                    <td className={`w-[70px] py-2 text-right font-semibold ${STATUS_TEXT[m.status]}`}>
                      {statusLabel(m.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      <p className="mt-4 text-xs text-gray-500">
        Estimates come from a single camera and are approximate — use them as guidance, not precise
        measurements.
      </p>
    </div>
  );
}

function frameLabel(i: number, contactPos: number): string {
  if (contactPos < 0) return `frame ${i + 1}`;
  if (i === contactPos) return 'contact';
  return i < contactPos ? 'before' : 'after';
}

function statusLabel(s: MetricStatus): string {
  return s === 'good' ? 'Good' : s === 'check' ? 'Check' : 'Work on';
}

function ScoreDial({ score }: { score: number }) {
  const hue = Math.round((score / 100) * 120); // red→green
  return (
    <div
      className="grid h-[84px] w-[84px] flex-none place-items-center rounded-full"
      style={{ background: `conic-gradient(hsl(${hue} 70% 45%) ${score}%, #e4e9e6 0)` }}
    >
      <div className="grid h-16 w-16 place-items-center rounded-full bg-white leading-none">
        <span className="text-2xl font-bold text-brand">{score}</span>
        <span className="text-[0.7rem] text-gray-500">/100</span>
      </div>
    </div>
  );
}
