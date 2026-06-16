import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { AuthResponse, User } from '@tennis/shared';
import { api, tokenStore } from './api';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, if we have a token, verify it and load the user.
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<User>('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  async function handleAuth(path: 'login' | 'register', body: Record<string, string>) {
    const res = await api.post<AuthResponse>(`/auth/${path}`, body);
    tokenStore.set(res.data.accessToken);
    setUser(res.data.user);
  }

  const value: AuthState = {
    user,
    loading,
    login: (email, password) => handleAuth('login', { email, password }),
    register: (email, password, name) => handleAuth('register', { email, password, name }),
    logout: () => {
      tokenStore.clear();
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
