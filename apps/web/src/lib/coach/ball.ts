// Tennis-ball detection in the browser, reusing MediaPipe's ObjectDetector
// (EfficientDet-Lite, COCO classes — a tennis ball is the "sports ball" class).
// Used to confirm the contact moment: the frame where the ball is closest to the
// racket hand is the strongest contact signal. Best-effort — fast/blurry balls are
// often missed, so callers must fall back to pose-only logic when no ball is found.

import { ObjectDetector } from '@mediapipe/tasks-vision';
import { getVisionFileset } from './pose';
import type { ExtractedFrame } from './frames';

/** A ball candidate, centre in normalized [0..1] coords to match pose landmarks. */
export interface BallCandidate {
  x: number;
  y: number;
  score: number;
}

/** Per-frame ball candidates (empty when none detected or detection unavailable). */
export interface BallFrame {
  time: number;
  candidates: BallCandidate[];
}

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.task';

let detectorPromise: Promise<ObjectDetector> | null = null;

function getDetector(): Promise<ObjectDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const fileset = await getVisionFileset();
      return ObjectDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        // IMAGE mode: frames are discontinuous samples, not a continuous stream.
        runningMode: 'IMAGE',
        // Tennis balls are small and motion-blurred — keep the bar low and let the
        // fusion step (proximity to the wrist) reject false positives.
        scoreThreshold: 0.2,
        maxResults: 5,
        categoryAllowlist: ['sports ball'],
      });
    })();
  }
  return detectorPromise;
}

/** Warm up the ball detector (download WASM + weights) ahead of time. */
export async function preloadBall(): Promise<void> {
  try {
    await getDetector();
  } catch {
    /* detection is optional; pipeline falls back to pose-only */
  }
}

/**
 * Detect ball candidates per frame, in capture order. Returns one entry per input
 * frame. On any failure (model load, runtime error) returns all-empty candidates so
 * the caller transparently falls back to wrist-speed contact detection.
 */
export async function detectBalls(frames: ExtractedFrame[]): Promise<BallFrame[]> {
  let detector: ObjectDetector;
  try {
    detector = await getDetector();
  } catch {
    return frames.map((f) => ({ time: f.time, candidates: [] }));
  }

  const out: BallFrame[] = [];
  for (const f of frames) {
    let candidates: BallCandidate[] = [];
    try {
      const result = detector.detect(f.canvas);
      const w = f.canvas.width || 1;
      const h = f.canvas.height || 1;
      candidates = (result.detections ?? []).map((d) => {
        const box = d.boundingBox;
        const cx = box ? (box.originX + box.width / 2) / w : 0.5;
        const cy = box ? (box.originY + box.height / 2) / h : 0.5;
        const score = d.categories?.[0]?.score ?? 0;
        return { x: cx, y: cy, score };
      });
    } catch {
      candidates = [];
    }
    out.push({ time: f.time, candidates });
  }
  return out;
}
