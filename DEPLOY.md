# Deploying

The app deploys as a **single same-origin service**: one Docker container runs the
NestJS API, which serves the REST API under `/api` and the built React SPA for
everything else. Postgres is a separate managed database. Migrations run
automatically when the container starts.

## Deploy to Render (Blueprint)

Prerequisites: a [Render](https://render.com) account, this repo on GitHub/GitLab,
and a free **Gemini API key** (https://aistudio.google.com/app/apikey).

1. **Push to a Git remote** (Render deploys from a connected repo).
2. In Render: **New → Blueprint**, pick this repo. Render reads [`render.yaml`](render.yaml)
   and proposes a web service (`tennis-app`) + a Postgres database (`tennis-db`).
3. **Apply**. Render provisions Postgres, wires `DATABASE_URL`, and auto-generates `JWT_SECRET`.
4. Set the one secret it can't generate: on the `tennis-app` service → **Environment** →
   set **`GEMINI_API_KEY`** to your key. (Save triggers a redeploy.)
5. First deploy builds the image, runs `prisma migrate deploy`, and starts the server.
   When the **health check** at `/api/health` passes, your app is live at
   `https://tennis-app.onrender.com` (HTTPS provided automatically).

That's it — register an account in the app and you're in.

### Environment variables

| Var | Source | Notes |
|---|---|---|
| `DATABASE_URL` | from `tennis-db` | wired by the blueprint |
| `JWT_SECRET` | auto-generated | strong, per-environment |
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
