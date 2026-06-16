# Lore

This folder is the project's memory. It records **why** things are the way they are and a **history of how the project changed** — context that source code and git history alone don't preserve.

## Structure

- **`decisions/`** — Architecture Decision Records (ADRs). One decision per file, numbered. Each follows a short template: **Context / Decision / Consequences**. ADRs are *append-only*: once accepted, a decision is not edited. To change it, add a new ADR that references and supersedes the old one.
- **`changelog/CHANGELOG.md`** — Chronological log of notable changes, one dated entry per build step or significant change. Describes *what* changed and *why*.
- **`features/`** — Living documentation per feature area (sessions, contacts, stats). Unlike ADRs, these are updated in place to reflect current behavior.

## Index

### Decisions
- [0001 — Stack overview](decisions/0001-stack-overview.md)
- [0002 — ORM: Prisma](decisions/0002-orm-prisma.md)
- [0003 — Mobile via PWA, not React Native](decisions/0003-mobile-pwa-not-react-native.md)
- [0004 — Frontend: React + Vite](decisions/0004-frontend-react-vite.md)
- [0005 — Data model](decisions/0005-data-model.md)
- [0006 — AI Coach integration](decisions/0006-coach-integration.md)
- [0007 — Coach data model](decisions/0007-coach-data-model.md)
- [0008 — Deployment (Render, same-origin)](decisions/0008-deployment.md)

### Features
- [Sessions](features/sessions.md)
- [Contacts](features/contacts.md)
- [Stats](features/stats.md)
- [AI Coach](features/coach.md)

### History
- [Changelog](changelog/CHANGELOG.md)
