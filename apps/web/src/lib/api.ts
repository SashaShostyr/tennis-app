import axios from 'axios';

const TOKEN_KEY = 'tennis.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const api = axios.create({
  // In dev, Vite proxies /api -> http://localhost:3000. Override via VITE_API_URL in prod.
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
});

// Attach the JWT to every request.
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, drop the token so the app redirects to login.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      tokenStore.clear();
    }
    return Promise.reject(error);
  },
);
