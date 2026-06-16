# Feature: Stats

Derived analytics computed on demand from the user's sessions (no stored aggregates; see [ADR 0005](../decisions/0005-data-model.md)).

## Metrics

- **Current streak** & **longest streak** — consecutive active periods (e.g. weeks with ≥1 session).
- **Frequency** — sessions per week over the last 4 and 12 weeks (powers the "3×/week for a month" banner).
- **Totals** — total session count and total hours played.
- **Breakdowns** — counts by `surface` and by `type`.

## API (under JWT, scoped to the authenticated user)

- `GET /stats` — returns all of the above in one payload for the dashboard.

## Status

Implemented (API + web dashboard). **Streaks are week-based** (ISO week, Monday start). The *current* streak counts consecutive active weeks ending now, with a grace allowance for the in-progress current week (if this week has no session yet but last week did, the streak continues from last week). The *longest* streak is the longest run of consecutive active weeks across all history. Frequency is rendered as a 12-week bar chart; the streak banner uses the 4-week average.
