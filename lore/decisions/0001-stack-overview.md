# 0001 — Stack overview

- **Status:** Accepted
- **Date:** 2026-06-08

## Context

The user plays tennis and wants an app to track their activity. The MVP is scoped to core activity tracking (session logging, session types, partner/opponent tracking, subjective ratings, streaks & frequency). Requirements gathered in conversation:

- Built **web-first**, but intended to be usable on mobile.
- **Multi-user** ("me + friends") — needs accounts and a shared database.
- Intended to **go public** later as a real product, not just a personal tool.

## Decision

Build a **monorepo** (npm workspaces) with a decoupled API and SPA:

| Layer | Choice |
|---|---|
| Repo | Monorepo via npm workspaces |
| Backend | NestJS (TypeScript) |
| Database | PostgreSQL |
| ORM | Prisma (see [0002](0002-orm-prisma.md)) |
| Auth | JWT + Passport |
| Frontend | React + Vite SPA (see [0004](0004-frontend-react-vite.md)) |
| Mobile | PWA via vite-plugin-pwa (see [0003](0003-mobile-pwa-not-react-native.md)) |
| Styling | Tailwind CSS |
| Data fetching | TanStack Query + axios |
| Charts | Recharts |

A dedicated NestJS API was chosen over a backend-as-a-service (e.g. Supabase) or Next.js API routes because the goal is a public, owned product: NestJS gives structure (modules, DI, guards, DTO validation), scales well, and a decoupled API cleanly serves both the web app now and any future client.

## Consequences

- One repo, shared TypeScript types between API and web via `packages/shared`.
- A backend that requires running Postgres locally (Docker) — more setup than a BaaS, but full control and no third-party lock-in.
- The decoupled API is reusable by future clients without rework.
