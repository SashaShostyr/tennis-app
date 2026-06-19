// Fullscreen keyframe viewer with the pose/annotation overlay. Tap a keyframe in
// the feedback panel to open it here, swipe/arrow between frames, and toggle the
// pose analysis on or off.

import { useCallback, useEffect, useState } from 'react';
import type { FrameOverlay } from '../../lib/coach/metrics';
import { PoseOverlay } from './PoseOverlay';

interface Props {
  frames: string[];
  overlays?: FrameOverlay[];
  vw: number;
  vh: number;
  startIndex: number;
  contactPos: number;
  onClose: () => void;
}

export function Lightbox({ frames, overlays, vw, vh, startIndex, contactPos, onClose }: Props) {
  const [index, setIndex] = useState(startIndex);
  const [showOverlay, setShowOverlay] = useState(true);

  const clamp = (i: number) => Math.max(0, Math.min(frames.length - 1, i));
  const go = useCallback(
    (delta: number) => setIndex((i) => Math.max(0, Math.min(frames.length - 1, i + delta))),
    [frames.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  const i = clamp(index);
  const overlay = overlays?.[i];
  const hasOverlay = Boolean(overlay && (overlay.landmarks || overlay.annotations.length));

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-sm font-medium">
          {phaseLabel(i, contactPos)} · frame {i + 1}/{frames.length}
        </span>
        <div className="flex items-center gap-2">
          {hasOverlay && (
            <button
              type="button"
              onClick={() => setShowOverlay((v) => !v)}
              className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25"
            >
              {showOverlay ? 'Hide pose' : 'Show pose'}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Image + overlay */}
      <div
        className="flex flex-1 items-center justify-center px-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={i === 0}
          aria-label="Previous frame"
          className="mr-1 shrink-0 rounded-full bg-white/15 px-3 py-3 text-lg text-white disabled:opacity-25"
        >
          ‹
        </button>

        <div className="relative inline-block">
          <img
            src={`data:image/jpeg;base64,${frames[i]}`}
            alt={`${phaseLabel(i, contactPos)} frame`}
            className="block h-auto max-h-[74vh] w-auto max-w-[82vw] rounded-lg"
          />
          {showOverlay && overlay && (
            <PoseOverlay overlay={overlay} vw={vw} vh={vh} />
          )}
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          disabled={i === frames.length - 1}
          aria-label="Next frame"
          className="ml-1 shrink-0 rounded-full bg-white/15 px-3 py-3 text-lg text-white disabled:opacity-25"
        >
          ›
        </button>
      </div>

      {/* Legend */}
      <div
        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-3 text-xs text-white/90"
        onClick={(e) => e.stopPropagation()}
      >
        <LegendDot color="#1c7a52" label="Good" />
        <LegendDot color="#c08a17" label="Check" />
        <LegendDot color="#c0432e" label="Work on" />
        <span className="text-white/50">Colors match the measured metrics below.</span>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function phaseLabel(i: number, contactPos: number): string {
  if (contactPos < 0) return `Frame ${i + 1}`;
  if (i === contactPos) return 'Contact';
  return i < contactPos ? 'Preparation' : 'Follow-through';
}
