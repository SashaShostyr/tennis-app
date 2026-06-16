import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { extractError } from '../lib/errors';
import { AuthShell, Field, inputClass, btnClass } from './LoginPage';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(email, password, name);
      navigate('/');
    } catch (err) {
      setError(extractError(err, 'Registration failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Start tracking your sessions.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Name">
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Email">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Password">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </Field>
        <p className="text-xs text-slate-400">At least 8 characters.</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className={btnClass}>
          {busy ? 'Creating…' : 'Sign up'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-court hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
