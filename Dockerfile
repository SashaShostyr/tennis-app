# syntax=docker/dockerfile:1

# ---- Builder: install deps, generate Prisma client, build API + web ----
FROM node:20-slim AS builder
WORKDIR /app

# Prisma needs OpenSSL present to generate/run its engines on slim images.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Install with the lockfile first (better layer caching). All workspace
# manifests must be present for `npm ci` to resolve the workspaces.
COPY package.json package-lock.json .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

# Copy the rest of the source and build.
COPY . .
RUN npx prisma generate --schema apps/api/prisma/schema.prisma
RUN npm run build

# ---- Runtime: only what's needed to run the server + migrate ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Dependencies (incl. generated Prisma client) and build artifacts.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/web/dist ./apps/web/dist

EXPOSE 3000

# Apply migrations, then start. The server serves /api and the SPA (apps/web/dist).
CMD ["sh", "-c", "cd apps/api && npx prisma migrate deploy && node dist/main.js"]
