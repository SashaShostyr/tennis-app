// MediaPipe Pose landmark detection, running locally in the browser.
// Uses the more accurate `full` model in IMAGE running mode: we feed it
// discontinuous, re-sampled frames (a coarse whole-clip scan, then a dense window
// that jumps backward in real time), so per-frame detection is correct — VIDEO
// mode's temporal tracking assumes a continuous stream and would mislead here.

import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';
import type { ExtractedFrame } from './frames';

export type Landmarks = NormalizedLandmark[];

/** A frame paired with its detected pose (null if no person was found). */
export interface FramePose {
  time: number;
  canvas: HTMLCanvasElement;
  landmarks: Landmarks | null;
}

// CDN locations. WASM is pinned to the installed runtime version to avoid an
// API/WASM skew; the `full` model is more accurate than `lite` (and `heavy` is
// too slow for phones).
const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';

let filesetPromise: Promise<Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>> | null =
  null;

/** Shared WASM fileset so the pose landmarker and the ball detector load it once. */
export function getVisionFileset() {
  if (!filesetPromise) {
    filesetPromise = FilesetResolver.forVisionTasks(WASM_BASE);
  }
  return filesetPromise;
}

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

function getLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const fileset = await getVisionFileset();
      return PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'IMAGE',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
      });
    })();
  }
  return landmarkerPromise;
}

/** Warm up the model (download WASM + weights) ahead of time. */
export async function preloadPose(): Promise<void> {
  await getLandmarker();
}

/** Run pose detection over every extracted frame, independently per frame. */
export async function detectPoses(frames: ExtractedFrame[]): Promise<FramePose[]> {
  const landmarker = await getLandmarker();
  const out: FramePose[] = [];
  for (const f of frames) {
    let landmarks: Landmarks | null = null;
    try {
      const result = landmarker.detect(f.canvas);
      landmarks = result.landmarks?.[0] ?? null;
    } catch {
      landmarks = null;
    }
    out.push({ time: f.time, canvas: f.canvas, landmarks });
  }
  return out;
}

// MediaPipe Pose landmark indices we use.
export const LM = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

// Body connections we draw for the skeleton overlay (torso, arms, legs — no face).
export const SKELETON_EDGES: ReadonlyArray<readonly [number, number]> = [
  [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
  [LM.LEFT_SHOULDER, LM.LEFT_ELBOW],
  [LM.LEFT_ELBOW, LM.LEFT_WRIST],
  [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
  [LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
  [LM.LEFT_SHOULDER, LM.LEFT_HIP],
  [LM.RIGHT_SHOULDER, LM.RIGHT_HIP],
  [LM.LEFT_HIP, LM.RIGHT_HIP],
  [LM.LEFT_HIP, LM.LEFT_KNEE],
  [LM.LEFT_KNEE, LM.LEFT_ANKLE],
  [LM.RIGHT_HIP, LM.RIGHT_KNEE],
  [LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
];

// Joints we draw as dots (skip face landmarks for a cleaner look).
export const SKELETON_JOINTS: readonly number[] = [
  LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
  LM.LEFT_ELBOW, LM.RIGHT_ELBOW,
  LM.LEFT_WRIST, LM.RIGHT_WRIST,
  LM.LEFT_HIP, LM.RIGHT_HIP,
  LM.LEFT_KNEE, LM.RIGHT_KNEE,
  LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
];
