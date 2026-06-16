import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  SESSION_TYPES,
  SESSION_TYPE_LABELS,
  SURFACE_LABELS,
  PARTICIPANT_ROLE_LABELS,
} from '@tennis/shared';
import { useSessions } from '../hooks/queries';
import { formatDate, formatDuration } from '../lib/format';

export function SessionsPage() {
  const { data: sessions = [], isLoading } = useSessions();
  const [typeFilter, setTypeFilter] = useState<string>('');

  const filtered = typeFilter ? sessions.filter((s) => s.type === typeFilter) : sessions;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <Link to="/sessions/new" className="rounded-lg bg-court px-4 py-2 text-sm font-medium text-white hover:bg-court-dark">
          + Log session
        </Link>
      </div>

      <div className="mb-4">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          {SESSION_TYPES.map((t) => (
            <option key={t} value={t}>
              {SESSION_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-slate-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <EmptyState hasAny={sessions.length > 0} />
      ) : (
        <ul className="space-y-3">
          {filtered.map((s) => (
            <li key={s.id}>
              <Link
                to={`/sessions/${s.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-court"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{SESSION_TYPE_LABELS[s.type]}</p>
                    <p className="text-sm text-slate-500">{formatDate(s.date)}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {formatDuration(s.durationMin)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600">
                  <span>{SURFACE_LABELS[s.surface]}</span>
                  <span>·</span>
                  <span>{s.indoor ? 'Indoor' : 'Outdoor'}</span>
                  {s.location && (
                    <>
                      <span>·</span>
                      <span>{s.location}</span>
                    </>
                  )}
                </div>
                {s.participants.length > 0 && (
                  <p className="mt-2 text-sm text-slate-500">
                    {s.participants
                      .map((p) => `${p.contact?.name} (${PARTICIPANT_ROLE_LABELS[p.role]})`)
                      .join(', ')}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
      <p className="text-slate-500">{hasAny ? 'No sessions match this filter.' : 'No sessions yet.'}</p>
      {!hasAny && (
        <Link to="/sessions/new" className="mt-3 inline-block font-medium text-court hover:underline">
          Log your first session →
        </Link>
      )}
    </div>
  );
}
