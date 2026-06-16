# 0002 — ORM: Prisma

- **Status:** Accepted
- **Date:** 2026-06-08

## Context

The NestJS backend needs an ORM for PostgreSQL. Candidates considered: **Prisma**, **TypeORM**, **Sequelize**. The project is a brand-new TypeScript codebase with no existing ORM familiarity constraints. The user explicitly weighed Sequelize before settling.

## Decision

Use **Prisma**.

Rationale:
- **Best TypeScript story** — fully generated, type-safe client; no hand-maintained types/interfaces alongside models.
- **Auto-generated migrations** from a single `schema.prisma` file (`prisma migrate`).
- **Clean, autocompleted query API** — good developer experience for a small team.
- Very common and well-supported with NestJS.

Sequelize was rejected for this fresh project because its TypeScript support is bolted on (`sequelize-typescript`) and migrations are more manual. TypeORM was rejected as less ergonomic than Prisma for type safety and migrations, despite its tight Nest integration. Sequelize/TypeORM remain valid if a contributor already had deep expertise — not the case here.

## Consequences

- Schema lives in `apps/api/prisma/schema.prisma`; the generated client is the single source of truth for DB types.
- Complex/raw queries (e.g. some stats) may use `$queryRaw` where the query builder is awkward — acceptable for this app's scope.
