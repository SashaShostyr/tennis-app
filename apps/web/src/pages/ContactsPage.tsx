import { FormEvent, useState } from 'react';
import type { Contact } from '@tennis/shared';
import {
  useContacts,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
} from '../hooks/queries';

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-court focus:ring-1 focus:ring-court';

export function ContactsPage() {
  const { data: contacts = [], isLoading } = useContacts();
  const create = useCreateContact();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim(), notes: notes.trim() || undefined },
      {
        onSuccess: () => {
          setName('');
          setNotes('');
        },
      },
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Contacts</h1>

      <form onSubmit={onAdd} className="mb-6 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-700">Add a partner or opponent</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={fieldClass} />
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className={fieldClass} />
        <button
          disabled={create.isPending || !name.trim()}
          className="rounded-lg bg-court px-4 py-2 text-sm font-medium text-white hover:bg-court-dark disabled:opacity-60"
        >
          Add contact
        </button>
      </form>

      {isLoading ? (
        <p className="text-slate-500">Loading…</p>
      ) : contacts.length === 0 ? (
        <p className="text-sm text-slate-400">No contacts yet.</p>
      ) : (
        <ul className="space-y-2">
          {contacts.map((c) => (
            <ContactRow key={c.id} contact={c} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ContactRow({ contact }: { contact: Contact }) {
  const update = useUpdateContact();
  const del = useDeleteContact();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(contact.name);
  const [notes, setNotes] = useState(contact.notes ?? '');

  if (editing) {
    return (
      <li className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" className={fieldClass} />
        <div className="flex gap-2">
          <button
            onClick={() =>
              update.mutate(
                { id: contact.id, name: name.trim(), notes: notes.trim() },
                { onSuccess: () => setEditing(false) },
              )
            }
            className="rounded-lg bg-court px-3 py-1.5 text-sm font-medium text-white hover:bg-court-dark"
          >
            Save
          </button>
          <button onClick={() => setEditing(false)} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100">
            Cancel
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="font-medium">{contact.name}</p>
        {contact.notes && <p className="text-sm text-slate-500">{contact.notes}</p>}
      </div>
      <div className="flex gap-3 text-sm">
        <button onClick={() => setEditing(true)} className="font-medium text-court hover:underline">
          Edit
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete ${contact.name}?`)) del.mutate(contact.id);
          }}
          className="font-medium text-red-600 hover:underline"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
