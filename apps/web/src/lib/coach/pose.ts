// MediaPipe Pose landmark detection, running locally in the browser.
// Ported verbatim from the standalone Tennis AI Coach (WASM + model load from CDN).

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

// CDN locations (pinned major version). No build-time asset wrangling needed.
const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

function getLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      return PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'IMAGE',
        numPoses: 1,
      });
    })();
  }
  return landmarkerPromise;
}

/** Warm up the model (download WASM + weights) ahead of time. */
export async function preloadPose(): Promise<void> {
  await getLandmarker();
}

/** Run pose detection over every extracted frame. */
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
