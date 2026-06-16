// Extract evenly-spaced frames from a video File, entirely in the browser.
// Ported verbatim from the standalone Tennis AI Coach.

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

export class VideoLoadError extends Error {}

/**
 * Load `file` into a hidden <video>, then seek to `count` evenly-spaced times and
 * snapshot each frame onto a downscaled canvas.
 */
export async function extractFrames(
  file: File,
  count = 14,
  maxDim = 640,
): Promise<ExtractResult> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.crossOrigin = 'anonymous';

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

    // Sample within [5%, 95%] of the clip to skip black lead-in/out frames.
    const start = duration * 0.05;
    const end = duration * 0.95;
    const span = Math.max(end - start, 0);

    const frames: ExtractedFrame[] = [];
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? duration / 2 : start + (span * i) / (count - 1);
      await seek(video, t);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new VideoLoadError('Canvas 2D context unavailable.');
      ctx.drawImage(video, 0, 0, width, height);
      frames.push({ time: video.currentTime, canvas });
    }

    return { frames, duration, width, height };
  } finally {
    URL.revokeObjectURL(url);
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
    video.currentTime = Math.min(time, Math.max(0, video.duration - 0.01));
  });
}
