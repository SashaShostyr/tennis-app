# 0003 — Mobile via PWA, not React Native

- **Status:** Accepted
- **Date:** 2026-06-08

## Context

The app must be usable on mobile (courtside logging). Two paths were considered: a separate **React Native** mobile app sharing logic with the web app, or a **Progressive Web App (PWA)** — the existing web app made installable and offline-capable via a service worker. The user explicitly stated they do **not** want React Native and prefer a web app installable on mobile.

## Decision

Ship a single web app and make it a **PWA** using `vite-plugin-pwa`. Users "Add to Home Screen" and run it like a native app.

For the MVP: the PWA is **installable** and **precaches the app shell** (so it opens instantly). Full **offline write + background sync** is explicitly deferred — see Consequences.

## Consequences

- One codebase, no app stores, no separate mobile project to maintain.
- Some native capabilities (deep OS integration, certain background tasks) are unavailable — acceptable for an activity tracker.
- Offline *logging* (write while disconnected, sync later) is a future enhancement; the MVP requires connectivity to save. The API stays the same when it's added.
- The chosen `vite-plugin-pwa` reinforces the React + Vite frontend decision ([0004](0004-frontend-react-vite.md)), where service-worker tooling is near-zero-config.
