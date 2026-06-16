# Changelog

Chronological history of notable changes. Newest first.

## 2026-06-16

- **Made the app deployable as a single same-origin service** (target: Render). See ADR [0008](../decisions/0008-deployment.md).
  - The NestJS API now serves the built React SPA: `app.useStaticAssets(apps/web/dist)` + an Express SPA fallback for non-`/api` GETs (so client routes like `/coach` survive refresh), guarded by `existsSync` so dev is untouched. Server binds `0.0.0.0`.
  - Added `GET /api/health` (`HealthModule`) for platform health checks.
  - Added a multi-stage `Dockerfile` (`node:20-slim` + openssl for Prisma), `.dockerignore`, a Render Blueprint (`render.yaml`: managed Postgres + docker web service, `DATABASE_URL`/`JWT_SECRET` wired, `GEMINI_API_KEY` set manually), and `DEPLOY.md`. Migrations run on container start via `prisma migrate deploy`.
  - **Verified the production image locally:** `docker build` + `docker run` against local Postgres — migrations applied, `/api/health` 200, SPA root + `/coach` deep link 200, JS assets + PWA manifest/sw served, demo login works, and a coach analyze round-trip returned real Gemini coaching (HTTP 201, persisted).

- **Integrated the standalone Tennis AI Coach** (`../tennis-ai-coach`) as a first-class feature. ADRs [0006](../decisions/0006-coach-integration.md) (integration approach) and [0007](../decisions/0007-coach-data-model.md) (Analysis data model); feature doc [coach](../features/coach.md).
  - **API:** new `CoachModule` (`POST /coach/analyze` + `GET/DELETE /coach/analyses`) behind JWT; `GeminiService` ported from the coach's `gemini.ts` (kept Gemini per user decision); maps Gemini quota/region errors to clean 503s; body-parser limit raised to 12 MB for base64 keyframes.
  - **DB:** new `Analysis` model + lowercase `ShotType`/`Handedness` enums; per-user, optional `sessionId` (onDelete SetNull); keyframes not stored. Migration `add_analysis`.
  - **Web:** lazy-loaded `/coach` route (MediaPipe code-split into its own 144 KB chunk); ported `frames/pose/metrics` libs and `ShotForm/Uploader/Feedback` components; pose runs client-side; wired through the axios client (JWT); session-link dropdown + `?sessionId=`; history list; session edit page shows linked analyses. Tailwind v4 tokens/classes reproduced in the v3 setup.
  - **Shared:** coach types added to `@tennis/shared` (web); API keeps local `coach.types.ts` to keep its build output flat.
  - **Verified:** API end-to-end with the demo JWT — auth (401), validation (400), a **real Gemini call returning structured coaching**, persistence + history, session filter. Web typechecks and production-builds clean with the coach route code-split.
  - **Gotchas fixed:** stale root-level `tsconfig.tsbuildinfo` + `deleteOutDir` produced empty API builds → disabled `incremental`; importing `@tennis/shared` source into the API nested `dist/` → kept API coach types local.

## 2026-06-08

- **Project kickoff.** Scoped the MVP to core activity tracking (session logging, session types, partner/opponent tracking, subjective ratings, streaks & frequency).
- **Stack decided** and recorded as ADRs [0001](../decisions/0001-stack-overview.md)–[0005](../decisions/0005-data-model.md): monorepo (npm workspaces), NestJS + PostgreSQL + Prisma + JWT, React + Vite SPA as a PWA, Tailwind, TanStack Query, Recharts.
- **Created `lore/`** — project memory folder with README, decisions, changelog, and feature docs.
- **Scaffolded monorepo** — root `package.json` (npm workspaces), `.gitignore`, `docker-compose.yml` (Postgres 16), and `packages/shared` (enums, entity & stats types shared by API and web).
- **Added project `.npmrc`** pointing at the public npm registry, since the machine's global npm config targets a private CodeArtifact registry. Documented in [ADR-supplement]; needed for installs to work.
- **Built the NestJS API** (`apps/api`): Prisma schema + initial migration against Postgres; `PrismaModule`; `AuthModule` (register/login/me, bcrypt, JWT + Passport, `JwtAuthGuard`, `@CurrentUser`); `ContactsModule` and `SessionsModule` (CRUD, DTO validation, user scoping, nested session participants with ownership checks); `StatsModule` (`GET /stats`: totals, current/longest weekly streaks, frequency over last 4/12 weeks, surface/type breakdowns). Global `ValidationPipe`, `/api` prefix, CORS for the web origin.
- **Verified the API end-to-end** with curl: register → me → 401-when-unauth → create contact → create session (with participant) → 400-on-invalid-enum → list → stats. All passed.
- **Built the web app** (`apps/web`): React + Vite + Tailwind SPA. Axios client with JWT interceptor (`/api` proxied to the NestJS server in dev), `AuthProvider` (login/register/me + localStorage token), TanStack Query hooks for sessions/contacts/stats. Pages: Login, Register, Dashboard (streak banner, sessions-per-week bar chart via Recharts, type/surface breakdowns, recent sessions), Sessions list (type filter), Log Session + Edit (shared `SessionForm` with participants and 1–5 rating pickers), Contacts (inline CRUD). Responsive layout with desktop tabs + mobile bottom nav.
- **Added PWA support** via `vite-plugin-pwa` (`autoUpdate`, manifest, tennis-ball SVG icon, app-shell precache, API paths excluded from the service worker). Production build emits `manifest.webmanifest` + `sw.js`.
- **Added a Prisma seed** (`apps/api/prisma/seed.ts`) creating a demo user (`demo@tennis.app` / `password123`), 3 contacts, and 8 sessions spread over ~8 weeks.
- **Added root `README.md`** with setup/run instructions.
- **Verified the full stack** through the Vite dev proxy: demo login, `GET /stats` (8 sessions, 8.3h, 5-week streak, correct breakdowns), sessions list with participants, app HTML + icon served. Web app typechecks and production-builds clean.

### Notes / follow-ups
- PWA icons are a single SVG; proper rasterized PNG icon set is a follow-up for best cross-platform install polish.
- Web bundle is ~648 KB (Recharts-heavy); consider code-splitting if it grows.
- `apps/api/.env` is created locally (gitignored); `.env.example` is committed.
