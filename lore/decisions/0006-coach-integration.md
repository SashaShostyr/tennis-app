# 0006 — AI Coach integration

- **Status:** Accepted
- **Date:** 2026-06-16

## Context

A separate working MVP, **Tennis AI Coach** (`../tennis-ai-coach`), let a user upload a single-shot clip and get technique feedback: the browser samples frames, runs **MediaPipe Pose locally**, computes objective metrics, and sends metrics + 3 keyframes to **Gemini**, which returns structured coaching (`summary`, `strengths`, `improvements[{tip,why,drill}]`, `overallScore`). It was built as a standalone **Express + Gemini** server and a **Vite/React/Tailwind-v4** client with no auth or persistence.

The user asked to fold it into the tracker as a first-class feature.

## Decision

Integrate, don't bolt on a second app:

- **Port the single `/api/analyze` endpoint into a new NestJS `CoachModule`** (`POST /coach/analyze` + history endpoints), behind the existing `JwtAuthGuard`. The Gemini call (`server/src/gemini.ts`) ported almost verbatim into `GeminiService`. No second server process.
- **Keep pose + metrics client-side** (inherits the coach's privacy design — see the coach's own ADR 0004; video never leaves the device, only metrics + 3 small keyframes are sent). Ported `frames.ts`, `pose.ts`, `metrics.ts` into `apps/web/src/lib/coach/` unchanged except type imports.
- **MediaPipe WASM + model still load from CDN** (coach ADR 0002/0008 hybrid approach) — no build-time asset handling; just added `@mediapipe/tasks-vision`.
- **Keep Gemini** (user decision; reuses the working free-tier code) rather than switching to Claude.
- **Coach UI is a lazy-loaded `/coach` route** behind login, reusing the app shell/nav, wired through the existing axios client so the JWT attaches. The route is code-split so MediaPipe stays out of the main bundle.
- **Tailwind v4 → v3:** the coach's `@theme` tokens + `@layer components` were reproduced in the web app's existing v3 config (`tailwind.config.js` colors + `index.css` component classes).

## Consequences

- One auth model, one API, one deploy. The coach's feedback is now per-user.
- The API stays self-contained: coach request/response types live in `apps/api/src/coach/coach.types.ts` (not imported from `@tennis/shared`) so the API's TS compile root stays inside `src/` — see [0007](0007-coach-data-model.md) consequences.
- Gemini calls can fail from unsupported regions ("User location is not supported"); `GeminiService` maps quota/region errors to clean `503`s instead of `500`s.
- Body-parser limit raised to 12 MB on the API (base64 keyframes) — the 100 kb Nest default would reject requests.
