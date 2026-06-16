# Deploying

The app deploys as a **single same-origin service**: one Docker container runs the
NestJS API, which serves the REST API under `/api` and the built React SPA for
everything else. Postgres is a separate managed database. Migrations run
automatically when the container starts.

## Option A — No credit card (recommended): Neon DB + Render free web service

Render's **Blueprint** asks for a card (it can provision paid infra). You can avoid that
entirely: use a free **Neon** Postgres (no card, doesn't expire) and create a Render free
**web service** by hand (no card). Same Docker image, same result.

Prerequisites: free accounts on [Neon](https://neon.tech) and [Render](https://render.com),
this repo on GitHub, and a free **Gemini API key** (https://aistudio.google.com/app/apikey).

1. **Create the database (Neon):** New Project → copy the **connection string** (the pooled
   one is fine). It looks like `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`.
2. **Push this repo to GitHub.**
3. **Create the web service (Render):** New → **Web Service** (not Blueprint) → connect the repo.
   - Runtime/Environment: **Docker** (Render auto-detects the `Dockerfile`).
   - Instance type: **Free**.
   - Health check path: `/api/health`.
4. **Set environment variables** on the service (Environment tab):
   - `DATABASE_URL` = the Neon string from step 1
   - `JWT_SECRET` = any long random string (e.g. `openssl rand -hex 32`)
   - `GEMINI_API_KEY` = your Gemini key
   - `GEMINI_MODEL` = `gemini-2.5-flash`
   - `NODE_ENV` = `production`
   - (Render injects `PORT` automatically.)
5. **Create / deploy.** The container builds, runs `prisma migrate deploy` against Neon, and
   starts. When `/api/health` passes, the app is live at `https://<name>.onrender.com` (HTTPS).

`render.yaml` is **not used** in this path — ignore it. Register an account in the app and you're in.

> Free Render web services **sleep after ~15 min idle** (≈1 min cold start on the next visit).
> Fine for a demo; upgrade the instance to remove it.

## Option B — Render Blueprint (one-click, but needs a card on file)

If you don't mind adding a card (you still won't be charged on free tiers):

1. **Push to a Git remote.**
2. Render: **New → Blueprint**, pick this repo. It reads [`render.yaml`](render.yaml) and proposes a
   web service + Postgres.
3. **Apply** — Render provisions Postgres, wires `DATABASE_URL`, auto-generates `JWT_SECRET`.
4. Set **`GEMINI_API_KEY`** on the service (Environment).
5. When `/api/health` passes, it's live over HTTPS.

### Environment variables

| Var | Source | Notes |
|---|---|---|
| `DATABASE_URL` | Neon string (Option A) / `tennis-db` (Option B) | Postgres connection |
| `JWT_SECRET` | you set it (A) / auto-generated (B) | any long random string |
| `GEMINI_API_KEY` | **you set it** | required for the AI Coach |
| `GEMINI_MODEL` | `gemini-2.5-flash` | override if desired |
| `PORT` | injected by Render | the server binds it on `0.0.0.0` |
| `NODE_ENV` | `production` | |

## Notes & gotchas

- **HTTPS is required** for the PWA service worker *and* camera capture (recording
  clips for the coach). Render serves HTTPS by default — nothing to do.
- **Gemini region:** Gemini's API isn't available from every region. The blueprint pins
  `region: oregon` (US, supported). If you move the service to an unsupported region the
  coach returns a clean `503` ("not available from this region"); the rest of the app keeps
  working. The alternative is switching the coaching call to Claude.
- **Free Postgres expires** (~30 days on Render's free tier) and the free web service sleeps
  when idle. Upgrade plans in `render.yaml` for anything beyond a demo.
- **Seeding (optional):** to load demo data, open the service **Shell** and run
  `cd apps/api && npm run db:seed`. Don't seed a real user-facing DB.
- **Custom domain:** add it under the service's **Settings → Custom Domains**; Render issues
  the cert. No code change needed (same-origin).

## Run the production image locally (parity check)

```bash
# Build
docker build -t tennis-app .

# Run against the local Docker Postgres (started via `npm run db:up`).
# host.docker.internal lets the container reach Postgres on your host.
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://tennis:tennis@host.docker.internal:5432/tennis?schema=public" \
  -e JWT_SECRET="local-prod-test" \
  -e GEMINI_API_KEY="<your-key>" \
  -e PORT=3000 \
  tennis-app
```

Then open http://localhost:3000 — the SPA, API, and coach all served from one origin.

## Other platforms

The same `Dockerfile` runs on Railway, Fly.io, Google Cloud Run, or any container host —
provide the same env vars and a Postgres `DATABASE_URL`. Only `render.yaml` is Render-specific.
