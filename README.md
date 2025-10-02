# eAssist API (v10)

Production-grade Express + PostgreSQL API for the eAssist Helpdesk platform.

- Node.js + Express, PostgreSQL (pg)
- Modular routes under `/api/*`
- JWT auth (Bearer), Basic auth, API keys, and cookie-based
- RBAC via roles/permissions
- OpenAPI 3 docs available at `/api/docs`

---

## Contents
- Quick start
- Requirements
- Environment (.env)
- Database and migrations
- Run the API
- Auth and security
- Public endpoints
- Tickets domain (data model, nested payloads, attachments, notes, events)
- Field selection (fields=, with_attrs_*)
- OpenAPI docs
- Scripts (maintenance and dev)
- Troubleshooting
- Attribution
- License

---

## Quick start

```bash
# 1) Install dependencies
npm install

# 2) Configure local database and env
cp .env.sample .env
# edit .env to match your local PostgreSQL

# 3) Create DB and run migrations
node scripts/db-create.js
node scripts/run-migrations.js

# 4) Seed minimal data (optional but recommended)
node scripts/seed-permissions-and-superuser.js
node scripts/seed-initial.js

# 5) Start the API (fixed :8080 for local testing)
npm start
# or live reload
npm run dev
```

Once up, visit:
- Health and info: http://localhost:8080/api/info
- Resources listing: http://localhost:8080/api/resources
- OpenAPI/Swagger: http://localhost:8080/api/docs

---

## Requirements
- Node.js 18+ (ESM modules enabled)
- PostgreSQL 13+
- macOS/Linux/Windows

---

## Environment (.env)

Copy `.env.sample` to `.env`. Key variables:

- PORT=8080
- DATABASE_URL=postgres://user:pass@localhost:5432/eassist
- JWT_SECRET=changeme
- JWT_REFRESH_SECRET=changeme-refresh
- ACCESS_TOKEN_TTL_MIN=30
- REFRESH_TOKEN_TTL_DAYS=7
- CORS_ORIGINS=http://localhost:3000

Notes:
- `.env` is git-ignored; `.env.sample` is provided with safe defaults.
- Admin seed scripts look at ADMIN_EMAIL/ADMIN_PASSWORD; see `.env.sample`.

---

## Database and migrations

All core DDL lives under `scripts/migrations/`.
- `20250926_full_schema_core.sql` – core schema (users, tickets, lookups, settings, etc.)
- `20251002_alter_tickets_submitter_fields.sql` – adds `tickets.phone_number`, `tickets.full_name`; makes `severity_id` and `reporter_user_id` optional; adds an index for attachments ordering.

Commands:

```bash
# Create DB if missing
node scripts/db-create.js

# Run all migrations (idempotent)
node scripts/run-migrations.js

# Seed superuser and permissions
node scripts/seed-permissions-and-superuser.js

# Seed initial lookups/settings
node scripts/seed-initial.js
```

---

## Run the API

```bash
# Development (auto-reload) — binds to :8080
npm run dev

# Production-like — binds to :8080
npm start

# Port helper commands (macOS):
# kill any process bound to :8080, then start
npm run stop:8080
npm run restart:8080
```

- Base API path: `/api`
- Diagnostics: `/api/info` and `/api/resources`

---

## Auth and security

Supported:
- Bearer JWT: `Authorization: Bearer <access_token>`
- Basic auth: `Authorization: Basic base64(email:password)`
- API key: header `X-API-Key: <raw>` (or `Authorization: ApiKey <raw>`)
- Cookies: `access_token`, `refresh_token` (HttpOnly)

RBAC is enforced by route-level permission checks. See `src/constants/permissions.js` and the modules under `src/modules/**`.

---

## Public endpoints

Lookups are public for GET (no authentication required). Writes remain protected by permissions.

- `/api/system/lookups/statuses`
- `/api/system/lookups/priorities`
- `/api/system/lookups/severities`
- `/api/system/lookups/sources`
- `/api/system/lookups/systems`
- `/api/system/lookups/system-modules`
- `/api/system/lookups/issue-categories`
- `/api/system/lookups/system-category`
- `/api/system/lookups/support-tiers` (alias of agent tiers)
- `/api/system/lookups/support-groups` (alias of agent groups)
- `/api/system/lookups/video-categories`

Public tickets helpers (optional):
- `/api/public/tickets` (create)
- `/api/public/tickets/lookup?reference=<HD-YYYY-####>`

---

## Tickets domain

Table: `tickets`
- Core cols: `id`, `ticket_key`, `title`, `description`
- Submitter: `reporter_user_id` (optional), `reporter_email`, `full_name`, `phone_number`
- Routing: `system_id`, `module_id`, `category_id`, `group_id`, `tier_id`
- State: `status_id`, `priority_id`, `severity_id` (optional), `source_id`
- Assignment: `assigned_agent_id`, `claimed_by`, `claimed_at`
- Audit: `reopen_count`, `last_public_update_at`, `created_at`, `updated_at`

Related tables:
- `ticket_attachments` (FK: `ticket_id`) – metadata only, with `uploaded_by`, `uploaded_at`
- `ticket_notes` (public/internal), `ticket_events`, `ticket_watchers`

Endpoints:
- `GET /api/tickets` – list with nested relations and `attachments_count`
- `GET /api/tickets/:id` – single ticket with nested relations and `attachments` array
- `POST /api/tickets` – accepts submitter fields (`reporter_email`, `full_name`, `phone_number`); `severity_id` optional
- Additional actions: `/status`, `/priority`, `/severity`, `/assign`, `/release`, `/claim`, `/unclaim`, `/close`, `/reopen`
- Notes: `/:id/notes`
- Attachments: `/:id/attachments`
- Events: `/:id/events`

Example (single ticket):
```json
{
  "id": "…",
  "ticket_key": "HD-2025-0001",
  "title": "VPN down",
  "reporter_user": { "id": "…", "email": "user@…", "full_name": "…" },
  "system": { "id": 1, "name": "DHIS2", "code": "dhis2" },
  "status": { "id": 1, "name": "Open", "code": "open" },
  "priority": { "id": 2, "name": "Medium", "code": "medium" },
  "severity": { "id": 1, "name": "Minor", "code": "minor" },
  "attachments_count": 2,
  "attachments": [
    { "id": "a1", "file_name": "log.txt", "uploaded_at": "…" },
    { "id": "a2", "file_name": "screenshot.png", "uploaded_at": "…" }
  ],
  "created_at": "…",
  "updated_at": "…"
}
```

---

## Field selection (keep payloads lean)

All GET endpoints accept a `fields` query parameter for deep projection. Dot paths are supported and work for nested objects and arrays.

Examples:
- Only key, title, and reporter’s email:
  - `GET /api/tickets?fields=ticket_key,title,reporter_user.email`
- Only nested relation shells:
  - `GET /api/tickets?fields=ticket_key,system,status`
- Single ticket with selected nested fields and attachments’ names:
  - `GET /api/tickets/:id?fields=ticket_key,status.code,priority.code,severity.code,attachments.file_name`

You can also control attributes included in each nested relation via `with_attrs_<relation>=…`:
- `with_attrs_reporter_user=id,email`
- `with_attrs_system=id,name`
- `with_attrs_status=id,code`

Combine both for optimal performance:
```
GET /api/tickets?fields=ticket_key,reporter_user,system&with_attrs_reporter_user=id,email&with_attrs_system=id,name
```

---

## OpenAPI docs

The API publishes rich OpenAPI 3 docs:
- JSON: `/api/docs.json`
- Swagger UI: `/api/docs`

Regenerate locally:
```bash
node scripts/generate-openapi.js
```
Output is written to `src/docs/openapi.json`.

---

## Scripts

- `scripts/db-create.js` – create database if missing
- `scripts/run-migrations.js` – run SQL migrations idempotently
- `scripts/seed-permissions-and-superuser.js` – seed base permissions and a superuser
- `scripts/seed-initial.js` – seed lookups and base settings
- `scripts/generate-openapi.js` – generate `src/docs/openapi.json`
- `scripts/smoke-test.js` – simple end-to-end checks

---

## Troubleshooting

- “Cannot find package 'express' …” when generating docs:
  - Run `npm install` inside `eassist-api` to install local dependencies.
- 401/403 errors on non-public routes:
  - Ensure you send valid auth (Bearer token, Basic auth, or API key) and that the user has the required permissions for that route.
- Migration errors:
  - Check the DB URL in `.env` and confirm your DB user has privileges to run DDL.
- Port already in use:
  - Use `npm run stop:8080` then `npm start` to restart on port 8080.

---

## Attribution

This eAssist API is developed and maintained by HISP Uganda.

---

## License

Copyright © Ministry of Health, Uganda.
