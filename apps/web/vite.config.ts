import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['tennis.svg'],
      manifest: {
        name: 'Tennis Tracker',
        short_name: 'Tennis',
        description: 'Track your tennis sessions, partners, and progress.',
        theme_color: '#15803d',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'tennis.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: 'tennis.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
          { src: 'tennis.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the app shell. Offline write/sync is a future enhancement.
        globPatterns: ['**/*.{js,css,html,svg}'],
        navigateFallback: '/index.html',
        // Don't let the SW intercept API calls — they need the network.
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true, // expose on the LAN so you can test phone capture for the coach
    proxy: {
      // Proxy API calls to the NestJS server during development.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
