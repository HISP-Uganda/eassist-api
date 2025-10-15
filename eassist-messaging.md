# eAssist Messaging

## Ticket note @mentions

Ticket notes support basic @mention parsing to notify users via IN_APP messages when they are mentioned in a note body.

- Supported patterns:
  - @email (always supported), e.g. `@user@example.com`
  - @username (optional): only if the `users.username` column exists; matched by `@handle` where handle is 2–32 chars `[A-Za-z0-9_.-]` and not part of an email
- Self-filter: the note author will not be notified. We check both `note.user_id` and `req.user.sub` to avoid self-mentions even if `note.user_id` is null.
- De-duplication: if the same user is referenced by both email and username, they’re only notified once.
- Context: the notification subject/body includes the ticket key/title when available and a short snippet of the note.
- Dedupe/idempotency: queued messages include a `correlation_key` of the form `ticket_mention:<ticket_id>:<note_id>:<user_id>` to avoid duplicates.
- Per-note cap (anti-spam): set `MENTIONS_MAX_PER_NOTE` (default `10`) to cap how many recipients a single note can notify.

Environment variables:

- `MENTIONS_MAX_PER_NOTE` — maximum number of mention notifications per note (default: `10`).
