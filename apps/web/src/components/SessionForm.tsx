import { FormEvent, useMemo, useState } from 'react';
import {
  SURFACES,
  SESSION_TYPES,
  SURFACE_LABELS,
  SESSION_TYPE_LABELS,
  PARTICIPANT_ROLE_LABELS,
  ParticipantRole,
  type Session,
} from '@tennis/shared';
import { useContacts, type SessionInput } from '../hooks/queries';

interface Props {
  initial?: Session;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (input: SessionInput) => void;
}

interface ParticipantRow {
  contactId: string;
  role: ParticipantRole;
}

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-court focus:ring-1 focus:ring-court';

// Format a Date/ISO into the value a datetime-local input expects.
function toLocalInput(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SessionForm({ initial, submitLabel, busy, onSubmit }: Props) {
  const { data: contacts = [] } = useContacts();

  const [date, setDate] = useState(toLocalInput(initial?.date));
  const [durationMin, setDurationMin] = useState(initial?.durationMin ?? 60);
  const [location, setLocation] = useState(initial?.location ?? '');
  const [surface, setSurface] = useState<string>(initial?.surface ?? 'HARD');
  const [indoor, setIndoor] = useState(initial?.indoor ?? false);
  const [type, setType] = useState<string>(initial?.type ?? 'PRACTICE');
  const [feelRating, setFeel] = useState<number | null>(initial?.feelRating ?? null);
  const [energyRating, setEnergy] = useState<number | null>(initial?.energyRating ?? null);
  const [funRating, setFun] = useState<number | null>(initial?.funRating ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [participants, setParticipants] = useState<ParticipantRow[]>(
    initial?.participants?.map((p) => ({ contactId: p.contactId, role: p.role })) ?? [],
  );

  const availableContacts = useMemo(
    () => contacts.filter((c) => !participants.some((p) => p.contactId === c.id)),
    [contacts, participants],
  );

  function addParticipant(contactId: string) {
    if (!contactId) return;
    setParticipants((prev) => [...prev, { contactId, role: ParticipantRole.OPPONENT }]);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      date: new Date(date).toISOString(),
      durationMin: Number(durationMin),
      location: location.trim() || undefined,
      surface,
      indoor,
      type,
      feelRating,
      energyRating,
      funRating,
      notes: notes.trim() || undefined,
      participants: participants.map((p) => ({ contactId: p.contactId, role: p.role })),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Labeled label="Date & time">
          <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} required />
        </Labeled>
        <Labeled label="Duration (minutes)">
          <input
            type="number"
            min={1}
            max={1440}
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            className={fieldClass}
            required
          />
        </Labeled>
        <Labeled label="Type">
          <select value={type} onChange={(e) => setType(e.target.value)} className={fieldClass}>
            {SESSION_TYPES.map((t) => (
              <option key={t} value={t}>
                {SESSION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Surface">
          <select value={surface} onChange={(e) => setSurface(e.target.value)} className={fieldClass}>
            {SURFACES.map((s) => (
              <option key={s} value={s}>
                {SURFACE_LABELS[s]}
              </option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Location">
          <input value={location} onChange={(e) => setLocation(e.target.value)} className={fieldClass} placeholder="e.g. City Courts" />
        </Labeled>
        <label className="flex items-center gap-2 self-end pb-2">
          <input type="checkbox" checked={indoor} onChange={(e) => setIndoor(e.target.checked)} className="h-4 w-4" />
          <span className="text-sm text-slate-700">Indoor</span>
        </label>
      </div>

      {/* Participants */}
      <div>
        <p className="mb-1 text-sm font-medium text-slate-700">Partners / opponents</p>
        {participants.length === 0 && <p className="text-sm text-slate-400">None added.</p>}
        <div className="space-y-2">
          {participants.map((p, idx) => {
            const contact = contacts.find((c) => c.id === p.contactId);
            return (
              <div key={p.contactId} className="flex items-center gap-2">
                <span className="flex-1 text-sm">{contact?.name ?? 'Unknown'}</span>
                <select
                  value={p.role}
                  onChange={(e) =>
                    setParticipants((prev) =>
                      prev.map((row, i) => (i === idx ? { ...row, role: e.target.value as ParticipantRole } : row)),
                    )
                  }
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                >
                  {Object.entries(PARTICIPANT_ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setParticipants((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-sm text-red-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
        {availableContacts.length > 0 ? (
          <select
            value=""
            onChange={(e) => addParticipant(e.target.value)}
            className="mt-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">+ Add a contact…</option>
            {availableContacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          contacts.length === 0 && (
            <p className="mt-2 text-xs text-slate-400">Add people on the Contacts page to tag them here.</p>
          )
        )}
      </div>

      {/* Ratings */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <RatingPicker label="How you felt" value={feelRating} onChange={setFeel} />
        <RatingPicker label="Energy" value={energyRating} onChange={setEnergy} />
        <RatingPicker label="Fun" value={funRating} onChange={setFun} />
      </div>

      <Labeled label="Notes">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={fieldClass} />
      </Labeled>

      <button
        disabled={busy}
        className="w-full rounded-lg bg-court py-2.5 font-medium text-white hover:bg-court-dark disabled:opacity-60"
      >
        {busy ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function RatingPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            className={`h-9 w-9 rounded-full text-sm font-medium ${
              value && n <= value ? 'bg-court text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
