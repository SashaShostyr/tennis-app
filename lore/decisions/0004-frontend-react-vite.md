# 0004 — Frontend: React + Vite

- **Status:** Accepted
- **Date:** 2026-06-08

## Context

The web frontend needed a framework. Candidates: **React + Vite** (SPA) vs **Next.js**. Context: the core app is a login-gated activity tracker (a dashboard), the mobile strategy is a PWA ([0003](0003-mobile-pwa-not-react-native.md)), and the backend is a separate NestJS API ([0001](0001-stack-overview.md)).

## Decision

Use **React + Vite** as a single-page app talking to the NestJS API, with `vite-plugin-pwa` for installability/offline.

Rationale:
- The app lives mostly **behind login**, so Next.js's main edge (SSR for SEO of public pages) brings little value to the core product.
- Vite gives a **lean, fast** dev experience and `vite-plugin-pwa` makes the service worker near-zero-config — directly serving the PWA decision.
- A pure client-side SPA is the simplest mental model against a decoupled API.

Next.js was rejected for the MVP. If public marketing/landing pages that need SEO are wanted later, they can be a small separate site without changing this app.

## Consequences

- Client-side routing (React Router), client-side auth/session handling.
- API calls go cross-origin to the NestJS server → CORS must be configured on the API.
- Stack: React + TypeScript + Tailwind + TanStack Query + axios + Recharts.
