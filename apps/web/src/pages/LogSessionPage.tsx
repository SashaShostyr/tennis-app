import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { SessionForm } from '../components/SessionForm';
import { useCreateSession } from '../hooks/queries';
import { extractError } from '../lib/errors';

export function LogSessionPage() {
  const navigate = useNavigate();
  const create = useCreateSession();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Log a session</h1>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <SessionForm
        submitLabel="Save session"
        busy={create.isPending}
        onSubmit={(input) => {
          setError(null);
          create.mutate(input, {
            onSuccess: () => navigate('/sessions'),
            onError: (err) => setError(extractError(err, 'Could not save session')),
          });
        }}
      />
    </div>
  );
}
