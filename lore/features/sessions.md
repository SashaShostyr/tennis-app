# Feature: Sessions

A **session** is one tennis activity the user logs.

## Fields

| Field | Type | Notes |
|---|---|---|
| `date` | datetime | When the session happened |
| `durationMin` | int | Length in minutes |
| `location` | string? | Court / venue name |
| `surface` | enum | HARD, CLAY, GRASS, CARPET |
| `indoor` | bool | Indoor vs outdoor |
| `type` | enum | MATCH, PRACTICE, DRILLS, LESSON, WALL, CARDIO |
| `feelRating` | int? | 1–5, how the user felt |
| `energyRating` | int? | 1–5, energy level |
| `funRating` | int? | 1–5, how fun it was |
| `notes` | string? | Free text |
| `participants` | SessionParticipant[] | Partners/opponents (Contacts) with a role |

## API (all under JWT, scoped to the authenticated user)

- `GET /sessions` — list, newest first; supports filtering (type, date range).
- `POST /sessions` — create, with nested participants.
- `GET /sessions/:id` — detail.
- `PATCH /sessions/:id` — update.
- `DELETE /sessions/:id` — delete.

## Status

Implemented (API + web). Create/edit via the shared `SessionForm`; list with type filter; detail/edit page supports delete. Offline write/sync still deferred.
