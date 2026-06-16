# 🎾 Tennis Tracker

A multi-user web app to track your tennis activity — sessions, partners/opponents, subjective ratings, and streaks/frequency, plus an **AI Coach** that analyzes a shot clip (in-browser pose + Gemini) for technique feedback. Installable on mobile as a PWA.

Monorepo:

- **`apps/api`** — NestJS + PostgreSQL + Prisma + JWT auth
- **`apps/web`** — React + Vite SPA (PWA), Tailwind, TanStack Query, Recharts
- **`packages/shared`** — TypeScript enums/types shared by both
- **`lore/`** — project memory: architecture decisions + change history

## Prerequisites

- Node.js ≥ 20
- Docker (for local PostgreSQL)

## Getting started

```bash
# 1. Install dependencies (uses public npm registry via .npmrc)
npm install

# 2. Start PostgreSQL
npm run db:up

# 3. Set up the API env + database
cp apps/api/.env.example apps/api/.env        # adjust if needed
#    For the AI Coach, set GEMINI_API_KEY (free key: https://aistudio.google.com/app/apikey)
npm run prisma:migrate --workspace apps/api    # apply migrations
npm run db:seed --workspace apps/api           # optional: demo data

# 4. Run both apps (in two terminals)
npm run dev:api    # http://localhost:3000/api
npm run dev:web    # http://localhost:5173
```

The Vite dev server proxies `/api` → `http://localhost:3000`, so no CORS setup is needed in development.

### Demo account (after seeding)

- **Email:** `demo@tennis.app`
- **Password:** `password123`

## Useful scripts

| Command | What it does |
|---|---|
| `npm run db:up` / `npm run db:down` | Start/stop the Postgres container |
| `npm run dev:api` | NestJS in watch mode |
| `npm run dev:web` | Vite dev server |
| `npm run build` | Build all workspaces |
| `npm run prisma:studio --workspace apps/api` | Browse the DB |

## Production notes

- Set a strong `JWT_SECRET` and a real `DATABASE_URL` in `apps/api/.env`.
- Build the web app (`npm run build --workspace apps/web`) and serve `apps/web/dist` behind your host; point it at the API via `VITE_API_URL`.
- The PWA precaches the app shell (installable + offline-capable shell). Offline write/sync is a planned enhancement.

See [`lore/`](lore/README.md) for the "why" behind the architecture and a history of changes.
