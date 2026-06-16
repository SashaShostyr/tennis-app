# Feature: Contacts

A **contact** is a person the user plays with — their personal address book of partners and opponents. Free-text for the MVP (not linked to a registered user account; see [ADR 0005](../decisions/0005-data-model.md)).

## Fields

| Field | Type | Notes |
|---|---|---|
| `name` | string | Display name |
| `notes` | string? | Free text (e.g. "lefty, strong serve") |

A contact is attached to sessions via `SessionParticipant`, which carries a `role` of PARTNER or OPPONENT.

## API (all under JWT, scoped to the authenticated user)

- `GET /contacts` — list.
- `POST /contacts` — create.
- `PATCH /contacts/:id` — update.
- `DELETE /contacts/:id` — delete (cascades to its session participations).

## Status

Implemented (API + web). Inline create/edit/delete on the Contacts page; selectable as participants when logging a session.
