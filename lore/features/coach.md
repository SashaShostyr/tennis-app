# Feature: AI Coach

Upload a short clip of a single tennis shot and get technique feedback. Pose analysis runs **in the browser** (video never leaves the device); only objective metrics + ~3 keyframes are sent to the server, which asks **Gemini** for coaching.

## Flow

1. Pick shot type + handedness (and two-handed backhand if relevant). Optionally link to a logged session.
2. Upload/record a clip (≤ ~12s, side-on, whole body in frame).
3. Browser: extract frames → **MediaPipe Pose** (CDN WASM + model) → compute metrics (`src/lib/coach/`).
4. `POST /coach/analyze` (JWT) with metrics + 3 base64 keyframes → Gemini → structured feedback, which is persisted as an `Analysis`.
5. UI shows score (0–100), summary, strengths, prioritized improvements (each with a drill), the sent keyframes, and the measured metrics.

## Metrics computed (client-side, approximate)

Knee bend (load), hitting-arm extension at contact, shoulder–hip separation (coil), contact height vs hips, balance, follow-through length, off-arm involvement.

## API (all JWT, user-scoped)

- `POST /coach/analyze` — body `AnalyzeRequest` (+ optional `sessionId`); returns `AnalyzeResponse` + `analysisId`.
- `GET /coach/analyses` — list (newest first; optional `?sessionId=`).
- `GET /coach/analyses/:id`, `DELETE /coach/analyses/:id`.

## Web

- Lazy-loaded `/coach` route (MediaPipe code-split out of the main bundle), in the nav.
- History list of past analyses; session edit page shows analyses linked to that session + an "Analyze a shot" link.

## Notes / limits

- Coaching uses Gemini free-tier; daily limits apply and it can be unavailable from some regions (the API maps those to a clean 503).
- Estimates come from a single uncalibrated camera — guidance, not measurement.
- Keyframes are not persisted (only shown right after analysis).

## Status

Implemented (API + web). See [ADR 0006](../decisions/0006-coach-integration.md) and [0007](../decisions/0007-coach-data-model.md).
