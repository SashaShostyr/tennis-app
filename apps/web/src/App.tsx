import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { SessionsPage } from './pages/SessionsPage';
import { LogSessionPage } from './pages/LogSessionPage';
import { SessionEditPage } from './pages/SessionEditPage';
import { ContactsPage } from './pages/ContactsPage';

// Lazy-loaded so MediaPipe + the coach pipeline stay out of the main bundle.
const CoachPage = lazy(() => import('./pages/CoachPage').then((m) => ({ default: m.CoachPage })));

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading…</div>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Suspense fallback={<div className="py-10 text-center text-slate-500">Loading…</div>}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/sessions/new" element={<LogSessionPage />} />
          <Route path="/sessions/:id" element={<SessionEditPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/coach" element={<CoachPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
