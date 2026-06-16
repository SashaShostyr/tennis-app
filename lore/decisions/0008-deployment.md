# 0008 — Deployment: single same-origin service on Render

- **Status:** Accepted
- **Date:** 2026-06-16

## Context

The app needed a production deployment story. In dev it runs as two processes
(NestJS :3000 + Vite :5173 with a `/api` proxy) against a local Docker Postgres.
The user chose a **single same-origin deploy** on **Render**, with migrations
applied automatically on container start.

## Decision

Ship one Docker image: the NestJS API serves `/api` **and** the static React build.

- **API serves the SPA** (`apps/api/src/main.ts`): `useStaticAssets(apps/web/dist)` +
  an Express fallback returning `index.html` for non-`/api` GET routes (client-side
  routing). Guarded by `existsSync(webDist)` so local dev (no build) is unaffected.
  Binds `0.0.0.0` for containers. No frontend change needed — the web client already
  defaults `VITE_API_URL` to `/api`, which is same-origin in production. CORS is
  irrelevant same-origin (the existing `enableCors` is left as a harmless no-op).
- **`GET /api/health`** (`HealthModule`) for the platform health check.
- **Multi-stage `Dockerfile`** on `node:20-slim` (Debian, not Alpine, to avoid Prisma
  musl engine issues; `openssl` installed for Prisma). Build stage installs workspaces,
  `prisma generate`, builds both apps; runtime stage runs
  `prisma migrate deploy && node dist/main.js`.
- **`render.yaml`** Blueprint: managed Postgres + one Docker web service, with
  `DATABASE_URL` wired from the DB, `JWT_SECRET` auto-generated, `GEMINI_API_KEY` set
  manually (never committed), region pinned to a Gemini-supported US region.

## Consequences

- One artifact, one origin, no CORS, one URL. Simplest possible operations.
- Single-instance assumption: migrate-on-start is fine here; multi-instance scaling would
  want a separate release-phase migration step (out of scope).
- The **Gemini region constraint** ([0006](0006-coach-integration.md)) now applies to the
  deploy region — pinned to US in `render.yaml`; documented in `DEPLOY.md` with the
  Claude-swap as the fallback.
- HTTPS (required for the PWA service worker and camera capture) is provided by Render.
- The same image runs on any container host; only `render.yaml` is Render-specific.
