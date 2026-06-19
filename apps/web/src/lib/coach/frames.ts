// Extract frames from a video File, entirely in the browser.
//
// The clip is loaded into a hidden <video> once via `openVideo`, then any number
// of frame batches can be snapshotted with `extractAt(times)`. This lets the coach
// do a two-pass scan (coarse, then dense around the swing) without reloading the
// file each time.

export interface ExtractedFrame {
  /** Timestamp in seconds. */
  time: number;
  /** Frame drawn onto a canvas (downscaled). Used for pose detection + keyframes. */
  canvas: HTMLCanvasElement;
}

export interface ExtractResult {
  frames: ExtractedFrame[];
  duration: number;
  width: number;
  height: number;
}

export interface VideoHandle {
  duration: number;
  width: number;
  height: number;
  /** Snapshot the frame nearest each timestamp (seconds), in the order given. */
  extractAt(times: number[]): Promise<ExtractedFrame[]>;
  /** Release the object URL / <video>. Always call when done. */
  close(): void;
}

export class VideoLoadError extends Error {}

/**
 * Load `file` into a hidden <video> and return a handle for snapshotting frames.
 * Frames are downscaled so the longest side is at most `maxDim` (keeps pose
 * detection fast). Remember to call `close()` when finished.
 */
export async function openVideo(file: File, maxDim = 640): Promise<VideoHandle> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.crossOrigin = 'anonymous';

  let closed = false;
  try {
    await waitForEvent(video, 'loadedmetadata', 'Could not read this video file.');

    const duration = video.duration;
    if (!isFinite(duration) || duration <= 0) {
      throw new VideoLoadError('This video has no readable duration.');
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const scale = Math.min(1, maxDim / Math.max(vw, vh));
    const width = Math.round(vw * scale);
    const height = Math.round(vh * scale);

    return {
      duration,
      width,
      height,
      async extractAt(times: number[]): Promise<ExtractedFrame[]> {
        if (closed) throw new VideoLoadError('Video handle already closed.');
        const frames: ExtractedFrame[] = [];
        for (const t of times) {
          await seek(video, t);
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new VideoLoadError('Canvas 2D context unavailable.');
          ctx.drawImage(video, 0, 0, width, height);
          frames.push({ time: video.currentTime, canvas });
        }
        return frames;
      },
      close() {
        if (closed) return;
        closed = true;
        URL.revokeObjectURL(url);
      },
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

/** Evenly-spaced timestamps across [start, end] (seconds). */
export function evenTimes(count: number, start: number, end: number): number[] {
  const span = Math.max(end - start, 0);
  if (count <= 1) return [start + span / 2];
  return Array.from({ length: count }, (_, i) => start + (span * i) / (count - 1));
}

/**
 * Convenience: open, extract `count` evenly-spaced frames across [5%, 95%] of the
 * clip (skipping black lead-in/out), and close. Kept for simple one-shot callers.
 */
export async function extractFrames(
  file: File,
  count = 14,
  maxDim = 640,
): Promise<ExtractResult> {
  const handle = await openVideo(file, maxDim);
  try {
    const times = evenTimes(count, handle.duration * 0.05, handle.duration * 0.95);
    const frames = await handle.extractAt(times);
    return { frames, duration: handle.duration, width: handle.width, height: handle.height };
  } finally {
    handle.close();
  }
}

/** Encode a canvas to a base64 JPEG string (no `data:` prefix). */
export function canvasToBase64Jpeg(canvas: HTMLCanvasElement, quality = 0.8): string {
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

function waitForEvent(el: HTMLMediaElement, event: string, errMsg: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onOk = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new VideoLoadError(errMsg));
    };
    const cleanup = () => {
      el.removeEventListener(event, onOk);
      el.removeEventListener('error', onErr);
    };
    el.addEventListener(event, onOk, { once: true });
    el.addEventListener('error', onErr, { once: true });
  });
}

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new VideoLoadError('Failed while seeking the video.'));
    };
    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onErr);
    };
    video.addEventListener('seeked', onSeeked, { once: true });
    video.addEventListener('error', onErr, { once: true });
    video.currentTime = Math.min(Math.max(time, 0), Math.max(0, video.duration - 0.01));
  });
}
