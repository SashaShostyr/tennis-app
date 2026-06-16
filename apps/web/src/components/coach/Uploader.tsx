import { useRef, useState } from 'react';

interface Props {
  disabled?: boolean;
  onSelect: (file: File) => void;
}

const MAX_SECONDS = 12;
const MAX_MB = 60;

export function Uploader({ disabled, onSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Please choose a video file.');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`That file is over ${MAX_MB} MB. Please use a shorter or lower-resolution clip.`);
      return;
    }

    const duration = await readDuration(file).catch(() => null);
    if (duration !== null && duration > MAX_SECONDS) {
      setError(`Clip is ${Math.round(duration)}s — please trim it to ${MAX_SECONDS}s or less (one shot).`);
      return;
    }

    setFileName(file.name);
    onSelect(file);
  }

  return (
    <div className="card">
      <h2 className="mb-3 text-base font-semibold">2. Add your clip</h2>
      <p className="mb-3 text-sm text-gray-500">
        Film one shot from the side, whole body in frame, ≤ {MAX_SECONDS}s. Your video stays on your
        device — only a few frames are sent for coaching.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        capture="environment"
        hidden
        disabled={disabled}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <button type="button" className="btn-primary" disabled={disabled} onClick={() => inputRef.current?.click()}>
        {fileName ? 'Choose a different clip' : 'Upload / record a clip'}
      </button>

      {fileName && <p className="mt-2.5 text-sm text-gray-500">Selected: {fileName}</p>}
      {error && <p className="mt-2.5 text-sm text-warn">{error}</p>}
    </div>
  );
}

function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(v.duration);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('metadata error'));
    };
    v.src = url;
  });
}
