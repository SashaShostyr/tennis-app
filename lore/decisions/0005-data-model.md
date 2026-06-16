# 0005 — Data model

- **Status:** Accepted
- **Date:** 2026-06-08

## Context

The MVP tracks tennis activity: sessions with type/surface/duration/location, the people played with (partners/opponents), subjective ratings, and derived streaks/frequency. The app is multi-user, so all data is scoped to a user.

## Decision

Four entities (Prisma), all user-scoped:

- **User** — account: email, bcrypt password hash, name.
- **Contact** — the user's personal address book of people they play with (free-text `name` + optional `notes`). Owned by one user.
- **Session** — one activity: `date`, `durationMin`, `location`, `surface`, `indoor`, `type`, optional `feelRating`/`energyRating`/`funRating` (1–5), `notes`.
- **SessionParticipant** — join between Session and Contact, with a `role` (PARTNER | OPPONENT).

Enums:
- `Surface` = HARD, CLAY, GRASS, CARPET
- `SessionType` = MATCH, PRACTICE, DRILLS, LESSON, WALL, CARDIO
- `ParticipantRole` = PARTNER, OPPONENT

Streaks & frequency are **computed on demand** from Session rows (no stored aggregates).

## Consequences

- **`Contact` is free-text, not a link to a registered `User`.** This keeps the MVP simple — you can log anyone, including non-users. Linking contacts to real users (for shared history / social features) is a deliberate future enhancement and will be a new ADR.
- Deleting a User cascades to their Contacts and Sessions; deleting a Session/Contact cascades to its SessionParticipants.
- Ratings are nullable — logging a session doesn't force a rating.
- Stats have no caching; fine at MVP data volumes, revisit if it gets slow.
