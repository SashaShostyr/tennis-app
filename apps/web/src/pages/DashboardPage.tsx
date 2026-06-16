import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  SESSION_TYPE_LABELS,
  SURFACE_LABELS,
  type SessionType,
  type Surface,
} from '@tennis/shared';
import { useStats, useSessions } from '../hooks/queries';
import { formatDate, formatDuration } from '../lib/format';

export function DashboardPage() {
  const { data: stats, isLoading } = useStats();
  const { data: sessions = [] } = useSessions();

  if (isLoading || !stats) return <p className="text-slate-500">Loading…</p>;

  const chartData = stats.weekly.map((w) => ({
    label: new Date(w.weekStart + 'T00:00:00Z').toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
    sessions: w.count,
  }));

  const recent = sessions.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link to="/sessions/new" className="rounded-lg bg-court px-4 py-2 text-sm font-medium text-white hover:bg-court-dark">
          + Log session
        </Link>
      </div>

      {/* Streak banner */}
      <StreakBanner currentStreak={stats.currentStreakWeeks} perWeek={stats.perWeekLast4} />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Sessions" value={stats.totalSessions} />
        <StatCard label="Hours" value={stats.totalHours} />
        <StatCard label="Current streak" value={`${stats.currentStreakWeeks} wk`} />
        <StatCard label="Longest streak" value={`${stats.longestStreakWeeks} wk`} />
      </div>

      {/* Frequency chart */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">Sessions per week (last 12 weeks)</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" fontSize={11} tickLine={false} />
              <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="sessions" fill="#15803d" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Breakdown
          title="By type"
          items={stats.byType.map((i) => ({ label: SESSION_TYPE_LABELS[i.key as SessionType] ?? i.key, count: i.count }))}
          total={stats.totalSessions}
        />
        <Breakdown
          title="By surface"
          items={stats.bySurface.map((i) => ({ label: SURFACE_LABELS[i.key as Surface] ?? i.key, count: i.count }))}
          total={stats.totalSessions}
        />
      </div>

      {/* Recent sessions */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Recent sessions</h2>
          <Link to="/sessions" className="text-sm font-medium text-court hover:underline">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing logged yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {recent.map((s) => (
              <li key={s.id}>
                <Link to={`/sessions/${s.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-medium">{SESSION_TYPE_LABELS[s.type]}</p>
                    <p className="text-xs text-slate-500">{formatDate(s.date)}</p>
                  </div>
                  <span className="text-xs text-slate-500">{formatDuration(s.durationMin)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StreakBanner({ currentStreak, perWeek }: { currentStreak: number; perWeek: number }) {
  const message =
    currentStreak > 0
      ? `🔥 ${currentStreak} week${currentStreak > 1 ? 's' : ''} in a row — averaging ${perWeek}×/week`
      : 'No active streak. Log a session to start one!';
  return <div className="rounded-xl bg-court px-5 py-4 font-medium text-white shadow-sm">{message}</div>;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <p className="text-2xl font-bold text-court">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function Breakdown({
  title,
  items,
  total,
}: {
  title: string;
  items: { label: string; count: number }[];
  total: number;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">No data yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.label}>
              <div className="mb-0.5 flex justify-between text-sm">
                <span>{i.label}</span>
                <span className="text-slate-500">{i.count}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-court"
                  style={{ width: `${total ? (i.count / total) * 100 : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
