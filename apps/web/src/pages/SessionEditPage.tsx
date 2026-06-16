import { Link, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { SHOT_TYPE_LABELS } from '@tennis/shared';
import { SessionForm } from '../components/SessionForm';
import { useSession, useUpdateSession, useDeleteSession, useAnalyses } from '../hooks/queries';
import { extractError } from '../lib/errors';
import { formatDate } from '../lib/format';

export function SessionEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session, isLoading } = useSession(id);
  const update = useUpdateSession(id!);
  const del = useDeleteSession();
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <p className="text-slate-500">Loading…</p>;
  if (!session) return <p className="text-slate-500">Session not found.</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit session</h1>
        <button
          onClick={() => {
            if (confirm('Delete this session?')) {
              del.mutate(session.id, { onSuccess: () => navigate('/sessions') });
            }
          }}
          className="text-sm font-medium text-red-600 hover:underline"
        >
          Delete
        </button>
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <SessionForm
        initial={session}
        submitLabel="Save changes"
        busy={update.isPending}
        onSubmit={(input) => {
          setError(null);
          update.mutate(input, {
            onSuccess: () => navigate('/sessions'),
            onError: (err) => setError(extractError(err, 'Could not update session')),
          });
        }}
      />

      <SessionAnalyses sessionId={session.id} />
    </div>
  );
}

function SessionAnalyses({ sessionId }: { sessionId: string }) {
  const { data: analyses = [] } = useAnalyses(sessionId);

  return (
    <section className="mt-8">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">AI Coach analyses</h2>
        <Link
          to={`/coach?sessionId=${sessionId}`}
          className="text-sm font-medium text-court hover:underline"
        >
          Analyze a shot →
        </Link>
      </div>
      {analyses.length === 0 ? (
        <p className="text-sm text-slate-400">No analyses linked to this session yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {analyses.map((a) => (
            <li key={a.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{SHOT_TYPE_LABELS[a.shotType]}</p>
                <p className="text-xs text-slate-500">{formatDate(a.createdAt)}</p>
              </div>
              <span className="text-lg font-bold text-brand">{a.overallScore}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
