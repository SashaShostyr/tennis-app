# 0007 — Coach data model (Analysis)

- **Status:** Accepted
- **Date:** 2026-06-16

## Context

The user chose to **persist** coaching analyses (not keep them one-off) so progress is trackable, optionally tied to a logged session. See [0006](0006-coach-integration.md).

## Decision

New Prisma model **`Analysis`** (user-scoped), plus enums `ShotType` and `Handedness`:

- Fields: `shotType`, `handedness`, `twoHandedBackhand`, `overallScore`, `summary`, `strengths String[]`, `improvements Json`, `metrics Json`, `createdAt`, nullable `sessionId`.
- Relations: `user` (onDelete Cascade), `session` (onDelete **SetNull** — deleting a session keeps its analyses).
- **Keyframes are NOT stored** — they're large base64 blobs; we persist only metrics + feedback + score. Keyframe thumbnails show only in-memory right after an analysis.
- Enum values are **lowercase** (`forehand`, `right`, …) to match the client wire format and the in-browser metrics logic (`shotType === 'serve'`), so no case mapping is needed anywhere.

## Consequences

- `improvements` / `metrics` are `Json`, not normalized tables — fine for display-only data; not queryable by sub-field (acceptable).
- The lowercase enums intentionally differ in casing from the tracker's other enums (`Surface = HARD`, etc.); the trade-off (zero mapping between client/DB) was judged worth the minor inconsistency.
- The API defines its own coach types in `apps/api/src/coach/coach.types.ts` instead of importing `@tennis/shared`. Importing the shared package's **source** `.ts` into the API expanded tsc's `rootDir` and nested the build output (`dist/src/main.js`). Keeping coach types local (the web app uses `@tennis/shared`) keeps the API build flat (`dist/main.js`). Also disabled `incremental` in the API tsconfig — a stale root-level `tsconfig.tsbuildinfo` combined with `deleteOutDir` produced empty builds.
