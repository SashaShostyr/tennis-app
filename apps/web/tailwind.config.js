/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        court: {
          DEFAULT: '#15803d', // tennis-court green
          dark: '#166534',
        },
        // AI Coach design tokens (ported from the standalone coach's styles.css).
        brand: {
          DEFAULT: '#0b3d2e',
          accent: '#1c7a52',
        },
        page: '#f4f7f5',
        line: '#e1e8e4',
        good: '#1c7a52',
        check: '#c08a17',
        warn: '#c0432e',
      },
    },
  },
  plugins: [],
};
