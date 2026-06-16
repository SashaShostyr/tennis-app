import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/sessions', label: 'Sessions', end: false },
  { to: '/coach', label: 'Coach', end: false },
  { to: '/contacts', label: 'Contacts', end: false },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <header className="bg-court text-white shadow">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎾</span>
            <span className="font-semibold">Tennis Tracker</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline opacity-90">{user?.name}</span>
            <button onClick={handleLogout} className="rounded bg-white/15 px-3 py-1 hover:bg-white/25">
              Log out
            </button>
          </div>
        </div>
        {/* Desktop nav */}
        <nav className="mx-auto hidden max-w-3xl gap-1 px-2 sm:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-4 py-2 text-sm font-medium ${isActive ? 'border-b-2 border-white' : 'opacity-80 hover:opacity-100'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-white sm:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex-1 py-3 text-center text-xs font-medium ${isActive ? 'text-court' : 'text-slate-500'}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
