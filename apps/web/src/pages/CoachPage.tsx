import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AnalyzeResponse, Handedness, Metric, ShotType, Analysis } from '@tennis/shared';
import { SHOT_TYPE_LABELS } from '@tennis/shared';
import { ShotForm } from '../components/coach/ShotForm';
import { Uploader } from '../components/coach/Uploader';
import { Feedback } from '../components/coach/Feedback';
import { extractFrames, canvasToBase64Jpeg } from '../lib/coach/frames';
import { detectPoses, preloadPose } from '../lib/coach/pose';
import { computeMetrics, detectedFrameCount } from '../lib/coach/metrics';
import { useAnalyzeShot, useAnalyses, useSessions } from '../hooks/queries';
import { extractError } from '../lib/errors';
import { formatDate } from '../lib/format';

type Phase = 'idle' | 'extracting' | 'detecting' | 'coaching' | 'done' | 'error';

const PHASE_LABEL: Record<Exclude<Phase, 'idle' | 'done' | 'error'>, string> = {
  extracting: 'Extracting frames from your clip…',
  detecting: 'Detecting your body pose…',
  coaching: 'Asking the AI coach…',
};

export function CoachPage() {
  const [searchParams] = useSearchParams();
  const initialSessionId = searchParams.get('sessionId') ?? '';

  const { data: sessions = [] } = useSessions();
  const analyze = useAnalyzeShot();

  const [shotType, setShotType] = useState<ShotType>('forehand');
  const [handedness, setHandedness] = useState<Handedness>('right');
  const [twoHandedBackhand, setTwoHandedBackhand] = useState(false);
  const [sessionId, setSessionId] = useState(initialSessionId);

  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [sentFrames, setSentFrames] = useState<string[]>([]);
  const [contactPos, setContactPos] = useState(-1);

  // Warm up the pose model in the background so analysis feels fast.
  useEffect(() => {
    preloadPose().catch(() => {
      /* will retry on first analyze */
    });
  }, []);

  const busy = phase === 'extracting' || phase === 'detecting' || phase === 'coaching';

  async function runAnalysis() {
    if (!file) return;
    setError(null);
    setResult(null);

    try {
      setPhase('extracting');
      const { frames } = await extractFrames(file, 14);

      setPhase('detecting');
      const poses = await detectPoses(frames);
      if (detectedFrameCount(poses) < 3) {
        throw new Error(
          "Couldn't reliably detect a player in this clip. Film from the side with your whole body in frame, in good light.",
        );
      }

      const { metrics: computed, contactIndex } = computeMetrics(
        poses,
        shotType,
        handedness,
        twoHandedBackhand,
      );
      setMetrics(computed);

      // Send 3 keyframes around the estimated contact moment.
      const idxs = [contactIndex - 2, contactIndex, contactIndex + 2]
        .map((i) => Math.max(0, Math.min(frames.length - 1, i)))
        .filter((v, i, arr) => arr.indexOf(v) === i);
      const keyframes = idxs.map((i) => canvasToBase64Jpeg(frames[i].canvas));
      setSentFrames(keyframes);
      setContactPos(idxs.indexOf(contactIndex));

      setPhase('coaching');
      const response = await analyze.mutateAsync({
        shotType,
        handedness,
        twoHandedBackhand,
        metrics: computed,
        keyframes,
        sessionId: sessionId || undefined,
      });

      setResult(response);
      setPhase('done');
    } catch (err) {
      setError(extractError(err, err instanceof Error ? err.message : 'Something went wrong.'));
      setPhase('error');
    }
  }

  return (
    <div>
      <header className="pb-2 text-center">
        <h1 className="text-2xl font-bold text-brand">🎾 AI Coach</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload one shot, get technique feedback. Pose analysis runs on your device.
        </p>
      </header>

      <ShotForm
        shotType={shotType}
        handedness={handedness}
        twoHandedBackhand={twoHandedBackhand}
        disabled={busy}
        onChange={(n) => {
          setShotType(n.shotType);
          setHandedness(n.handedness);
          setTwoHandedBackhand(n.twoHandedBackhand);
        }}
      />

      <Uploader disabled={busy} onSelect={setFile} />

      {/* Optional: attach this analysis to a logged session. */}
      <div className="card">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
          Link to a session (optional)
        </span>
        <select
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          disabled={busy}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm"
        >
          <option value="">Don't link</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {SHOT_TYPE_LABELS[shotType]} · {formatDate(s.date)} · {s.location ?? 'session'}
            </option>
          ))}
        </select>
      </div>

      <button className="btn-primary mt-4" disabled={!file || busy} onClick={runAnalysis}>
        {busy ? 'Analyzing…' : 'Analyze my shot'}
      </button>

      {busy && (
        <div className="card flex items-center gap-3">
          <div className="h-[22px] w-[22px] flex-none animate-spin rounded-full border-[3px] border-line border-t-brand-accent" />
          <span>{PHASE_LABEL[phase as keyof typeof PHASE_LABEL]}</span>
        </div>
      )}

      {phase === 'error' && error && (
        <div className="card border-warn">
          <strong className="text-warn">Couldn't analyze that clip</strong>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {phase === 'done' && result && (
        <Feedback result={result} metrics={metrics} frames={sentFrames} contactPos={contactPos} />
      )}

      <History />

      <footer className="mt-7 text-center text-xs text-gray-500">
        Pose by MediaPipe · coaching by Gemini · estimates are approximate.
      </footer>
    </div>
  );
}

function History() {
  const { data: analyses = [], isLoading } = useAnalyses();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading || analyses.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-2 font-semibold">Past analyses</h2>
      <ul className="space-y-2">
        {analyses.map((a) => (
          <li key={a.id} className="rounded-xl border border-line bg-white">
            <button
              type="button"
              onClick={() => setExpandedId((id) => (id === a.id ? null : a.id))}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div>
                <p className="font-medium">{SHOT_TYPE_LABELS[a.shotType]}</p>
                <p className="text-xs text-gray-500">{formatDate(a.createdAt)}</p>
              </div>
              <span className="text-lg font-bold text-brand">{a.overallScore}</span>
            </button>
            {expandedId === a.id && <ExpandedAnalysis analysis={a} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExpandedAnalysis({ analysis }: { analysis: Analysis }) {
  return (
    <div className="px-2 pb-2">
      <Feedback
        result={{
          summary: analysis.summary,
          strengths: analysis.strengths,
          improvements: analysis.improvements,
          overallScore: analysis.overallScore,
        }}
        metrics={analysis.metrics}
      />
    </div>
  );
}
