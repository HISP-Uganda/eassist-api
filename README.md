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
- Audit logging
- Database and migrations
- Run the API
- Auth and security
- Public endpoints                                                                                                                
- Tickets domain (data model, nested payloads, attachments, notes, events)
- Field selection (fields=) and bracket select (select=...)
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
- AUDIT_LOG_PATH=/var/log/eassist-api/audit.log  # optional; enables JSONL access logs to file

Notes:
- `.env` is git-ignored; `.env.sample` is provided with safe defaults.
- Admin seed scripts look at ADMIN_EMAIL/ADMIN_PASSWORD; see `.env.sample`.

---

## Audit logging

The API emits structured JSON audit logs for every request, including:
- request_id, method, path, status, duration_ms
- ip, user-agent, host
- authenticated user snapshot (sub, email, roles, or api_key id/name if used)

By default, logs print to stdout. To also persist to a file, set `AUDIT_LOG_PATH`:

```bash
export AUDIT_LOG_PATH=/var/log/eassist-api/audit.log
npm start
```

Each line is a JSON object (JSONL). Sensitive headers (Authorization, Cookie) are redacted if included.

Tip: rotate logs with logrotate (Linux):

```bash
sudo tee /etc/logrotate.d/eassist-api <<'ROT'
/var/log/eassist-api/*.log {
  daily
  rotate 14
  missingok
  compress
  delaycompress
  notifempty
  copytruncate
}
ROT
```

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

### Bracket-based select syntax (preferred for nested shaping)

As a shorthand that also declares expansions, use `select=` with a bracketed structure:

- `GET /api/system/users?select=users[id,email,full_name,roles[id,name,permissions[code,name]]]`

This is equivalent to:
- `expand=roles,roles.permissions`
- `fields=id,email,full_name,roles.id,roles.name,roles.permissions.code,roles.permissions.name`

The top-level identifier (e.g., `users[...]`) is optional; `select=[id,email,roles[id]]` also works.

Examples replacing previous with_attrs_* usage:
- Videos:
  - `GET /api/knowledge/videos?select=items[id,title,category[id,name],system_category[id,name]]`
- Inbox emails:
  - `GET /api/system/inbox/emails?select=items[id,subject,created_ticket[id,title]]`
- KB tag map:
  - `GET /api/knowledge/kb/tag-map?select=items[id,article[id,title],tag[id,name]]`

Notes:
- Shaping of nested objects is now done via `select=` (or `fields=` + `expand=`); `with_attrs_*` query params are no longer supported.
- Sensitive fields like password hashes remain excluded by design.

### Nested expansion for users (roles and permissions)

The users endpoints support nested expansion of roles, and each role’s permissions:

- Expand user roles:
  - `GET /api/system/users?expand=roles`
- Expand roles and their permissions:
  - `GET /api/system/users?expand=roles,roles.permissions`
- Combine with field selection:
  - `GET /api/system/users?expand=roles,roles.permissions&fields=id,email,full_name,roles.id,roles.name,roles.permissions.code`

Also works on a single user:
- `GET /api/system/users/:id?expand=roles,roles.permissions&fields=id,email,roles.name,roles.permissions.code`

Notes:
- Sensitive fields like `password_hash` are always stripped.
- If `roles.permissions` is requested but a role has no permissions, `permissions` will be an empty array.

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

<!-- API_REFERENCE_START -->

# API Reference

Auto-generated API documentation. Most endpoints accept any of the following auth methods:

This section is generated from the OpenAPI spec (src/docs/openapi.json).

Tags index:
- [admin/me](#admin-me)
- [admin/notifications](#admin-notifications)
- [admin/preferences](#admin-preferences)
- [analytics/dashboards](#analytics-dashboards)
- [analytics/exports](#analytics-exports)
- [analytics/reports](#analytics-reports)
- [auth/login](#auth-login)
- [auth/logout](#auth-logout)
- [auth/me](#auth-me)
- [auth/refresh](#auth-refresh)
- [auth/request-password-reset](#auth-request-password-reset)
- [auth/reset-password](#auth-reset-password)
- [auth/whoami](#auth-whoami)
- [knowledge/faqs](#knowledge-faqs)
- [knowledge/kb](#knowledge-kb)
- [knowledge/search](#knowledge-search)
- [knowledge/videos](#knowledge-videos)
- [public/endpoints](#public-endpoints)
- [public/faqs](#public-faqs)
- [public/kb](#public-kb)
- [public/ping](#public-ping)
- [public/search](#public-search)
- [public/tickets](#public-tickets)
- [public/videos](#public-videos)
- [system/agents](#system-agents)
- [system/audit](#system-audit)
- [system/files](#system-files)
- [system/inbox](#system-inbox)
- [system/lookups](#system-lookups)
- [system/roles](#system-roles)
- [system/settings](#system-settings)
- [system/users](#system-users)
- [system/workflows](#system-workflows)
- [tickets](#tickets)
- [tickets/:id](#tickets-id)
- [tickets/attachments](#tickets-attachments)
- [tickets/events](#tickets-events)
- [tickets/notes](#tickets-notes)
- [tickets/watchers](#tickets-watchers)
- [tokens/api-keys](#tokens-api-keys)

## admin/me

- `GET` `/api/admin/me` — GET /api/admin/me
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/admin/me
```

- `PUT` `/api/admin/me` — PUT /api/admin/me
  - Auth: Required
  - Request body: object
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/admin/me
```

## admin/notifications

- `GET` `/api/admin/notifications` — GET /api/admin/notifications
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/admin/notifications
```

## admin/preferences

- `GET` `/api/admin/preferences` — GET /api/admin/preferences
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/admin/preferences
```

- `PUT` `/api/admin/preferences` — PUT /api/admin/preferences
  - Auth: Required
  - Request body: object
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/admin/preferences
```

## analytics/dashboards

- `GET` `/api/analytics/dashboards/by-category` — GET /api/analytics/dashboards/by-category
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/analytics/dashboards/by-category
```

- `GET` `/api/analytics/dashboards/overview` — GET /api/analytics/dashboards/overview
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/analytics/dashboards/overview
```

## analytics/exports

- `GET` `/api/analytics/exports/tickets.csv` — GET /api/analytics/exports/tickets.csv
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — TicketList
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/analytics/exports/tickets.csv
```

## analytics/reports

- `GET` `/api/analytics/reports` — GET /api/analytics/reports
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/analytics/reports
```

- `POST` `/api/analytics/reports` — POST /api/analytics/reports
  - Auth: Required
  - Request body: object
  - Success: HTTP 201 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/analytics/reports
```

- `DELETE` `/api/analytics/reports/{id}` — DELETE /api/analytics/reports/:id
  - Auth: Required
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/analytics/reports/:id
```

- `PUT` `/api/analytics/reports/{id}` — PUT /api/analytics/reports/:id
  - Auth: Required
  - Path params: `id`
  - Request body: object
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/analytics/reports/:id
```

## auth/login

- `POST` `/api/auth/login` — POST /api/auth/login
  - Auth: Public
  - Request body: AuthLoginRequest
  - Success: HTTP 201 — object
  - Example:

```bash
curl http://localhost:8080/api/auth/login
```

## auth/logout

- `POST` `/api/auth/logout` — POST /api/auth/logout
  - Auth: Public
  - Request body: object
  - Success: HTTP 201 — object
  - Example:

```bash
curl http://localhost:8080/api/auth/logout
```

## auth/me

- `GET` `/api/auth/me` — GET /api/auth/me
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/auth/me
```

## auth/refresh

- `POST` `/api/auth/refresh` — POST /api/auth/refresh
  - Auth: Public
  - Request body: object
  - Success: HTTP 201 — object
  - Example:

```bash
curl http://localhost:8080/api/auth/refresh
```

## auth/request-password-reset

- `POST` `/api/auth/request-password-reset` — POST /api/auth/request-password-reset
  - Auth: Public
  - Request body: object
  - Success: HTTP 201 — object
  - Example:

```bash
curl http://localhost:8080/api/auth/request-password-reset
```

## auth/reset-password

- `POST` `/api/auth/reset-password` — POST /api/auth/reset-password
  - Auth: Public
  - Request body: object
  - Success: HTTP 201 — object
  - Example:

```bash
curl http://localhost:8080/api/auth/reset-password
```

## auth/whoami

- `GET` `/api/auth/whoami` — GET /api/auth/whoami
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/auth/whoami
```

## knowledge/faqs

- `GET` `/api/knowledge/faqs` — GET /api/knowledge/faqs
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<FAQ>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/faqs
```

- `POST` `/api/knowledge/faqs` — POST /api/knowledge/faqs
  - Auth: Required
  - Request body: FAQ
  - Success: HTTP 201 — array<FAQ>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/faqs
```

- `DELETE` `/api/knowledge/faqs/{id}` — DELETE /api/knowledge/faqs/:id
  - Auth: Required
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — FAQ
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/faqs/:id
```

- `GET` `/api/knowledge/faqs/{id}` — GET /api/knowledge/faqs/:id
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — FAQ
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/faqs/:id
```

- `PUT` `/api/knowledge/faqs/{id}` — PUT /api/knowledge/faqs/:id
  - Auth: Required
  - Path params: `id`
  - Request body: FAQ
  - Success: HTTP 200 — FAQ
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/faqs/:id
```

- `GET` `/api/knowledge/faqs/origins` — GET /api/knowledge/faqs/origins
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<FAQ>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/faqs/origins
```

- `POST` `/api/knowledge/faqs/origins` — POST /api/knowledge/faqs/origins
  - Auth: Required
  - Request body: FAQ
  - Success: HTTP 201 — array<FAQ>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/faqs/origins
```

- `DELETE` `/api/knowledge/faqs/origins/{id}` — DELETE /api/knowledge/faqs/origins/:id
  - Auth: Required
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — FAQ
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/faqs/origins/:id
```

- `GET` `/api/knowledge/faqs/origins/{id}` — GET /api/knowledge/faqs/origins/:id
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — FAQ
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/faqs/origins/:id
```

- `PUT` `/api/knowledge/faqs/origins/{id}` — PUT /api/knowledge/faqs/origins/:id
  - Auth: Required
  - Path params: `id`
  - Request body: FAQ
  - Success: HTTP 200 — FAQ
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/faqs/origins/:id
```

## knowledge/kb

- `GET` `/api/knowledge/kb/articles` — GET /api/knowledge/kb/articles
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<KBArticle>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/kb/articles
```

- `POST` `/api/knowledge/kb/articles` — POST /api/knowledge/kb/articles
  - Auth: Required
  - Request body: KBArticle
  - Success: HTTP 201 — array<KBArticle>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/kb/articles
```

- `DELETE` `/api/knowledge/kb/articles/{id}` — DELETE /api/knowledge/kb/articles/:id
  - Auth: Required
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — KBArticle
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/kb/articles/:id
```

- `GET` `/api/knowledge/kb/articles/{id}` — GET /api/knowledge/kb/articles/:id
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — KBArticle
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/kb/articles/:id
```

- `PUT` `/api/knowledge/kb/articles/{id}` — PUT /api/knowledge/kb/articles/:id
  - Auth: Required
  - Path params: `id`
  - Request body: KBArticle
  - Success: HTTP 200 — KBArticle
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/kb/articles/:id
```

- `GET` `/api/knowledge/kb/ratings` — GET /api/knowledge/kb/ratings
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<KBArticle>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/kb/ratings
```

- `POST` `/api/knowledge/kb/ratings` — POST /api/knowledge/kb/ratings
  - Auth: Required
  - Request body: KBArticle
  - Success: HTTP 201 — array<KBArticle>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/kb/ratings
```

- `DELETE` `/api/knowledge/kb/ratings/{id}` — DELETE /api/knowledge/kb/ratings/:id
  - Auth: Required
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — KBArticle
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/kb/ratings/:id
```

- `GET` `/api/knowledge/kb/ratings/{id}` — GET /api/knowledge/kb/ratings/:id
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — KBArticle
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/kb/ratings/:id
```

- `PUT` `/api/knowledge/kb/ratings/{id}` — PUT /api/knowledge/kb/ratings/:id
  - Auth: Required
  - Path params: `id`
  - Request body: KBArticle
  - Success: HTTP 200 — KBArticle
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/kb/ratings/:id
```

- `GET` `/api/knowledge/kb/ratings/summary` — GET /api/knowledge/kb/ratings/summary
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<KBArticle>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/kb/ratings/summary
```

- `DELETE` `/api/knowledge/kb/tag-map` — DELETE /api/knowledge/kb/tag-map
  - Auth: Required
  - Request body: none
  - Success: HTTP 200 — array<KBArticle>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/kb/tag-map
```

- `GET` `/api/knowledge/kb/tag-map` — GET /api/knowledge/kb/tag-map
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<KBArticle>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/kb/tag-map
```

- `POST` `/api/knowledge/kb/tag-map` — POST /api/knowledge/kb/tag-map
  - Auth: Required
  - Request body: KBArticle
  - Success: HTTP 201 — array<KBArticle>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/kb/tag-map
```

- `GET` `/api/knowledge/kb/tag-map/article/{articleId}` — GET /api/knowledge/kb/tag-map/article/:articleId
  - Auth: Required
  - Path params: `articleId`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — array<KBArticle>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/kb/tag-map/article/:articleId
```

- `DELETE` `/api/knowledge/kb/tag-map/article/{articleId}/tag/{tagId}` — DELETE /api/knowledge/kb/tag-map/article/:articleId/tag/:tagId
  - Auth: Required
  - Path params: `articleId`, `tagId`
  - Request body: none
  - Success: HTTP 200 — array<KBArticle>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/kb/tag-map/article/:articleId/tag/:tagId
```

- `GET` `/api/knowledge/kb/tags` — GET /api/knowledge/kb/tags
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<KBArticle>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/kb/tags
```

- `POST` `/api/knowledge/kb/tags` — POST /api/knowledge/kb/tags
  - Auth: Required
  - Request body: KBArticle
  - Success: HTTP 201 — array<KBArticle>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/kb/tags
```

- `DELETE` `/api/knowledge/kb/tags/{id}` — DELETE /api/knowledge/kb/tags/:id
  - Auth: Required
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — KBArticle
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/kb/tags/:id
```

- `GET` `/api/knowledge/kb/tags/{id}` — GET /api/knowledge/kb/tags/:id
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — KBArticle
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/kb/tags/:id
```

- `PUT` `/api/knowledge/kb/tags/{id}` — PUT /api/knowledge/kb/tags/:id
  - Auth: Required
  - Path params: `id`
  - Request body: KBArticle
  - Success: HTTP 200 — KBArticle
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/kb/tags/:id
```

## knowledge/search

- `GET` `/api/knowledge/search` — GET /api/knowledge/search
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/search
```

## knowledge/videos

- `GET` `/api/knowledge/videos` — GET /api/knowledge/videos
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<Video>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/videos
```

- `POST` `/api/knowledge/videos` — POST /api/knowledge/videos
  - Auth: Required
  - Request body: Video
  - Success: HTTP 201 — array<Video>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/videos
```

- `DELETE` `/api/knowledge/videos/{id}` — DELETE /api/knowledge/videos/:id
  - Auth: Required
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — Video
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/videos/:id
```

- `GET` `/api/knowledge/videos/{id}` — GET /api/knowledge/videos/:id
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — Video
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/videos/:id
```

- `PUT` `/api/knowledge/videos/{id}` — PUT /api/knowledge/videos/:id
  - Auth: Required
  - Path params: `id`
  - Request body: Video
  - Success: HTTP 200 — Video
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/videos/:id
```

- `POST` `/api/knowledge/videos/{id}/publish` — POST /api/knowledge/videos/:id/publish
  - Auth: Required
  - Path params: `id`
  - Request body: Video
  - Success: HTTP 201 — Video
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/videos/:id/publish
```

- `POST` `/api/knowledge/videos/{id}/unpublish` — POST /api/knowledge/videos/:id/unpublish
  - Auth: Required
  - Path params: `id`
  - Request body: Video
  - Success: HTTP 201 — Video
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/videos/:id/unpublish
```

- `GET` `/api/knowledge/videos/categories` — GET /api/knowledge/videos/categories
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<Video>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/videos/categories
```

- `POST` `/api/knowledge/videos/categories` — POST /api/knowledge/videos/categories
  - Auth: Required
  - Request body: Video
  - Success: HTTP 201 — array<Video>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/videos/categories
```

- `DELETE` `/api/knowledge/videos/categories/{id}` — DELETE /api/knowledge/videos/categories/:id
  - Auth: Required
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — Video
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/videos/categories/:id
```

- `GET` `/api/knowledge/videos/categories/{id}` — GET /api/knowledge/videos/categories/:id
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — Video
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/videos/categories/:id
```

- `PUT` `/api/knowledge/videos/categories/{id}` — PUT /api/knowledge/videos/categories/:id
  - Auth: Required
  - Path params: `id`
  - Request body: Video
  - Success: HTTP 200 — Video
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/knowledge/videos/categories/:id
```

## public/endpoints

- `GET` `/api/public/endpoints` — GET /api/public/endpoints
  - Auth: Public
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/public/endpoints
```

## public/faqs

- `GET` `/api/public/faqs` — GET /api/public/faqs
  - Auth: Public
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<FAQ>
  - Example:

```bash
curl http://localhost:8080/api/public/faqs
```

- `GET` `/api/public/faqs/{id}` — GET /api/public/faqs/:id
  - Auth: Public
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — FAQ
  - Example:

```bash
curl http://localhost:8080/api/public/faqs/:id
```

## public/kb

- `GET` `/api/public/kb/articles` — GET /api/public/kb/articles
  - Auth: Public
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<KBArticle>
  - Example:

```bash
curl http://localhost:8080/api/public/kb/articles
```

- `GET` `/api/public/kb/articles/{id}` — GET /api/public/kb/articles/:id
  - Auth: Public
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — KBArticle
  - Example:

```bash
curl http://localhost:8080/api/public/kb/articles/:id
```

- `GET` `/api/public/kb/ratings/summary` — GET /api/public/kb/ratings/summary
  - Auth: Public
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<KBArticle>
  - Example:

```bash
curl http://localhost:8080/api/public/kb/ratings/summary
```

## public/ping

- `GET` `/api/public/ping` — GET /api/public/ping
  - Auth: Public
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/public/ping
```

## public/search

- `GET` `/api/public/search` — GET /api/public/search
  - Auth: Public
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/public/search
```

## public/tickets

- `GET` `/api/public/tickets` — GET /api/public/tickets
  - Auth: Public
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — TicketList
  - Example:

```bash
curl http://localhost:8080/api/public/tickets
```

- `POST` `/api/public/tickets` — POST /api/public/tickets
  - Auth: Public
  - Request body: object
  - Success: HTTP 201 — TicketList
  - Example:

```bash
curl http://localhost:8080/api/public/tickets
```

- `GET` `/api/public/tickets/lookup` — GET /api/public/tickets/lookup
  - Auth: Public
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — TicketList
  - Example:

```bash
curl http://localhost:8080/api/public/tickets/lookup
```

## public/videos

- `GET` `/api/public/videos` — GET /api/public/videos
  - Auth: Public
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<Video>
  - Example:

```bash
curl http://localhost:8080/api/public/videos
```

- `GET` `/api/public/videos/categories` — GET /api/public/videos/categories
  - Auth: Public
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<Video>
  - Example:

```bash
curl http://localhost:8080/api/public/videos/categories
```

## system/agents

- `GET` `/api/system/agents/group-members` — GET /api/system/agents/group-members
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/group-members
```

- `POST` `/api/system/agents/group-members` — POST /api/system/agents/group-members
  - Auth: Required
  - Request body: System
  - Success: HTTP 201 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/group-members
```

- `DELETE` `/api/system/agents/group-members/{id}` — DELETE /api/system/agents/group-members/:id
  - Auth: Required
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/group-members/:id
```

- `GET` `/api/system/agents/group-members/{id}` — GET /api/system/agents/group-members/:id
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/group-members/:id
```

- `PUT` `/api/system/agents/group-members/{id}` — PUT /api/system/agents/group-members/:id
  - Auth: Required
  - Path params: `id`
  - Request body: System
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/group-members/:id
```

- `GET` `/api/system/agents/groups` — GET /api/system/agents/groups
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<AgentGroup>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/groups
```

- `POST` `/api/system/agents/groups` — POST /api/system/agents/groups
  - Auth: Required
  - Request body: System
  - Success: HTTP 201 — array<AgentGroup>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/groups
```

- `DELETE` `/api/system/agents/groups/{id}` — DELETE /api/system/agents/groups/:id
  - Auth: Required
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — AgentGroup
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/groups/:id
```

- `GET` `/api/system/agents/groups/{id}` — GET /api/system/agents/groups/:id
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — AgentGroup
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/groups/:id
```

- `PUT` `/api/system/agents/groups/{id}` — PUT /api/system/agents/groups/:id
  - Auth: Required
  - Path params: `id`
  - Request body: System
  - Success: HTTP 200 — AgentGroup
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/groups/:id
```

- `GET` `/api/system/agents/support-group-members` — GET /api/system/agents/support-group-members
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/support-group-members
```

- `POST` `/api/system/agents/support-group-members` — POST /api/system/agents/support-group-members
  - Auth: Required
  - Request body: System
  - Success: HTTP 201 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/support-group-members
```

- `DELETE` `/api/system/agents/support-group-members/{id}` — DELETE /api/system/agents/support-group-members/:id
  - Auth: Required
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/support-group-members/:id
```

- `GET` `/api/system/agents/support-group-members/{id}` — GET /api/system/agents/support-group-members/:id
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/support-group-members/:id
```

- `PUT` `/api/system/agents/support-group-members/{id}` — PUT /api/system/agents/support-group-members/:id
  - Auth: Required
  - Path params: `id`
  - Request body: System
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/support-group-members/:id
```

- `GET` `/api/system/agents/support-groups` — GET /api/system/agents/support-groups
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/support-groups
```

- `POST` `/api/system/agents/support-groups` — POST /api/system/agents/support-groups
  - Auth: Required
  - Request body: System
  - Success: HTTP 201 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/support-groups
```

- `DELETE` `/api/system/agents/support-groups/{id}` — DELETE /api/system/agents/support-groups/:id
  - Auth: Required
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/support-groups/:id
```

- `GET` `/api/system/agents/support-groups/{id}` — GET /api/system/agents/support-groups/:id
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/support-groups/:id
```

- `PUT` `/api/system/agents/support-groups/{id}` — PUT /api/system/agents/support-groups/:id
  - Auth: Required
  - Path params: `id`
  - Request body: System
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/support-groups/:id
```

- `GET` `/api/system/agents/tier-members` — GET /api/system/agents/tier-members
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/tier-members
```

- `POST` `/api/system/agents/tier-members` — POST /api/system/agents/tier-members
  - Auth: Required
  - Request body: System
  - Success: HTTP 201 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/tier-members
```

- `DELETE` `/api/system/agents/tier-members/{id}` — DELETE /api/system/agents/tier-members/:id
  - Auth: Required
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/tier-members/:id
```

- `GET` `/api/system/agents/tier-members/{id}` — GET /api/system/agents/tier-members/:id
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/tier-members/:id
```

- `PUT` `/api/system/agents/tier-members/{id}` — PUT /api/system/agents/tier-members/:id
  - Auth: Required
  - Path params: `id`
  - Request body: System
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/tier-members/:id
```

- `GET` `/api/system/agents/tiers` — GET /api/system/agents/tiers
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<AgentTier>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/tiers
```

- `POST` `/api/system/agents/tiers` — POST /api/system/agents/tiers
  - Auth: Required
  - Request body: System
  - Success: HTTP 201 — array<AgentTier>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/tiers
```

- `DELETE` `/api/system/agents/tiers/{id}` — DELETE /api/system/agents/tiers/:id
  - Auth: Required
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — AgentTier
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/tiers/:id
```

- `GET` `/api/system/agents/tiers/{id}` — GET /api/system/agents/tiers/:id
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — AgentTier
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/tiers/:id
```

- `PUT` `/api/system/agents/tiers/{id}` — PUT /api/system/agents/tiers/:id
  - Auth: Required
  - Path params: `id`
  - Request body: System
  - Success: HTTP 200 — AgentTier
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/agents/tiers/:id
```

## system/audit

- `GET` `/api/system/audit` — GET /api/system/audit
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<AuditEvent>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/audit
```

- `GET` `/api/system/audit/{id}` — GET /api/system/audit/:id
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — AuditEvent
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/audit/:id
```

## system/files

- `GET` `/api/system/files` — GET /api/system/files
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/files
```

- `POST` `/api/system/files` — POST /api/system/files
  - Auth: Required
  - Request body: System
  - Success: HTTP 201 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/files
```

- `DELETE` `/api/system/files/{id}` — DELETE /api/system/files/:id
  - Auth: Required
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/files/:id
```

- `GET` `/api/system/files/{id}` — GET /api/system/files/:id
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/files/:id
```

- `PUT` `/api/system/files/{id}` — PUT /api/system/files/:id
  - Auth: Required
  - Path params: `id`
  - Request body: System
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/files/:id
```

## system/inbox

- `GET` `/api/system/inbox/emails` — GET /api/system/inbox/emails
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<InboxEmail>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/inbox/emails
```

- `POST` `/api/system/inbox/emails` — POST /api/system/inbox/emails
  - Auth: Required
  - Request body: System
  - Success: HTTP 201 — array<InboxEmail>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/inbox/emails
```

- `DELETE` `/api/system/inbox/emails/{id}` — DELETE /api/system/inbox/emails/:id
  - Auth: Required
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — InboxEmail
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/inbox/emails/:id
```

- `GET` `/api/system/inbox/emails/{id}` — GET /api/system/inbox/emails/:id
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — InboxEmail
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/inbox/emails/:id
```

- `PUT` `/api/system/inbox/emails/{id}` — PUT /api/system/inbox/emails/:id
  - Auth: Required
  - Path params: `id`
  - Request body: System
  - Success: HTTP 200 — InboxEmail
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/inbox/emails/:id
```

- `POST` `/api/system/inbox/emails/{id}/fail` — POST /api/system/inbox/emails/:id/fail
  - Auth: Required
  - Path params: `id`
  - Request body: System
  - Success: HTTP 201 — InboxEmail
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/inbox/emails/:id/fail
```

- `POST` `/api/system/inbox/emails/{id}/process` — POST /api/system/inbox/emails/:id/process
  - Auth: Required
  - Path params: `id`
  - Request body: System
  - Success: HTTP 201 — InboxEmail
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/inbox/emails/:id/process
```

- `POST` `/api/system/inbox/emails/{id}/retry` — POST /api/system/inbox/emails/:id/retry
  - Auth: Required
  - Path params: `id`
  - Request body: System
  - Success: HTTP 201 — InboxEmail
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/inbox/emails/:id/retry
```

## system/lookups

- `GET` `/api/system/lookups/issue-categories` — GET /api/system/lookups/issue-categories
  - Auth: Public
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/issue-categories
```

- `POST` `/api/system/lookups/issue-categories` — POST /api/system/lookups/issue-categories
  - Auth: Public
  - Request body: System
  - Success: HTTP 201 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/issue-categories
```

- `DELETE` `/api/system/lookups/issue-categories/{id}` — DELETE /api/system/lookups/issue-categories/:id
  - Auth: Public
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/issue-categories/:id
```

- `GET` `/api/system/lookups/issue-categories/{id}` — GET /api/system/lookups/issue-categories/:id
  - Auth: Public
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/issue-categories/:id
```

- `PUT` `/api/system/lookups/issue-categories/{id}` — PUT /api/system/lookups/issue-categories/:id
  - Auth: Public
  - Path params: `id`
  - Request body: System
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/issue-categories/:id
```

- `GET` `/api/system/lookups/priorities` — GET /api/system/lookups/priorities
  - Auth: Public
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/priorities
```

- `POST` `/api/system/lookups/priorities` — POST /api/system/lookups/priorities
  - Auth: Public
  - Request body: System
  - Success: HTTP 201 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/priorities
```

- `DELETE` `/api/system/lookups/priorities/{id}` — DELETE /api/system/lookups/priorities/:id
  - Auth: Public
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/priorities/:id
```

- `GET` `/api/system/lookups/priorities/{id}` — GET /api/system/lookups/priorities/:id
  - Auth: Public
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/priorities/:id
```

- `PUT` `/api/system/lookups/priorities/{id}` — PUT /api/system/lookups/priorities/:id
  - Auth: Public
  - Path params: `id`
  - Request body: System
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/priorities/:id
```

- `GET` `/api/system/lookups/severities` — GET /api/system/lookups/severities
  - Auth: Public
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/severities
```

- `POST` `/api/system/lookups/severities` — POST /api/system/lookups/severities
  - Auth: Public
  - Request body: System
  - Success: HTTP 201 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/severities
```

- `DELETE` `/api/system/lookups/severities/{id}` — DELETE /api/system/lookups/severities/:id
  - Auth: Public
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/severities/:id
```

- `GET` `/api/system/lookups/severities/{id}` — GET /api/system/lookups/severities/:id
  - Auth: Public
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/severities/:id
```

- `PUT` `/api/system/lookups/severities/{id}` — PUT /api/system/lookups/severities/:id
  - Auth: Public
  - Path params: `id`
  - Request body: System
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/severities/:id
```

- `GET` `/api/system/lookups/sources` — GET /api/system/lookups/sources
  - Auth: Public
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/sources
```

- `POST` `/api/system/lookups/sources` — POST /api/system/lookups/sources
  - Auth: Public
  - Request body: System
  - Success: HTTP 201 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/sources
```

- `DELETE` `/api/system/lookups/sources/{id}` — DELETE /api/system/lookups/sources/:id
  - Auth: Public
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/sources/:id
```

- `GET` `/api/system/lookups/sources/{id}` — GET /api/system/lookups/sources/:id
  - Auth: Public
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/sources/:id
```

- `PUT` `/api/system/lookups/sources/{id}` — PUT /api/system/lookups/sources/:id
  - Auth: Public
  - Path params: `id`
  - Request body: System
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/sources/:id
```

- `GET` `/api/system/lookups/statuses` — GET /api/system/lookups/statuses
  - Auth: Public
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/statuses
```

- `POST` `/api/system/lookups/statuses` — POST /api/system/lookups/statuses
  - Auth: Public
  - Request body: System
  - Success: HTTP 201 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/statuses
```

- `DELETE` `/api/system/lookups/statuses/{id}` — DELETE /api/system/lookups/statuses/:id
  - Auth: Public
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/statuses/:id
```

- `GET` `/api/system/lookups/statuses/{id}` — GET /api/system/lookups/statuses/:id
  - Auth: Public
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/statuses/:id
```

- `PUT` `/api/system/lookups/statuses/{id}` — PUT /api/system/lookups/statuses/:id
  - Auth: Public
  - Path params: `id`
  - Request body: System
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/statuses/:id
```

- `GET` `/api/system/lookups/support-groups` — GET /api/system/lookups/support-groups
  - Auth: Public
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/support-groups
```

- `POST` `/api/system/lookups/support-groups` — POST /api/system/lookups/support-groups
  - Auth: Public
  - Request body: System
  - Success: HTTP 201 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/support-groups
```

- `DELETE` `/api/system/lookups/support-groups/{id}` — DELETE /api/system/lookups/support-groups/:id
  - Auth: Public
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/support-groups/:id
```

- `GET` `/api/system/lookups/support-groups/{id}` — GET /api/system/lookups/support-groups/:id
  - Auth: Public
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/support-groups/:id
```

- `PUT` `/api/system/lookups/support-groups/{id}` — PUT /api/system/lookups/support-groups/:id
  - Auth: Public
  - Path params: `id`
  - Request body: System
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/support-groups/:id
```

- `GET` `/api/system/lookups/support-tiers` — GET /api/system/lookups/support-tiers
  - Auth: Public
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/support-tiers
```

- `POST` `/api/system/lookups/support-tiers` — POST /api/system/lookups/support-tiers
  - Auth: Public
  - Request body: System
  - Success: HTTP 201 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/support-tiers
```

- `DELETE` `/api/system/lookups/support-tiers/{id}` — DELETE /api/system/lookups/support-tiers/:id
  - Auth: Public
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/support-tiers/:id
```

- `GET` `/api/system/lookups/support-tiers/{id}` — GET /api/system/lookups/support-tiers/:id
  - Auth: Public
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/support-tiers/:id
```

- `PUT` `/api/system/lookups/support-tiers/{id}` — PUT /api/system/lookups/support-tiers/:id
  - Auth: Public
  - Path params: `id`
  - Request body: System
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/support-tiers/:id
```

- `GET` `/api/system/lookups/system-category` — GET /api/system/lookups/system-category
  - Auth: Public
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/system-category
```

- `POST` `/api/system/lookups/system-category` — POST /api/system/lookups/system-category
  - Auth: Public
  - Request body: SystemCategory
  - Success: HTTP 201 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/system-category
```

- `DELETE` `/api/system/lookups/system-category/{id}` — DELETE /api/system/lookups/system-category/:id
  - Auth: Public
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/system-category/:id
```

- `GET` `/api/system/lookups/system-category/{id}` — GET /api/system/lookups/system-category/:id
  - Auth: Public
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/system-category/:id
```

- `PUT` `/api/system/lookups/system-category/{id}` — PUT /api/system/lookups/system-category/:id
  - Auth: Public
  - Path params: `id`
  - Request body: SystemCategory
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/system-category/:id
```

- `GET` `/api/system/lookups/system-modules` — GET /api/system/lookups/system-modules
  - Auth: Public
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/system-modules
```

- `POST` `/api/system/lookups/system-modules` — POST /api/system/lookups/system-modules
  - Auth: Public
  - Request body: SystemModule
  - Success: HTTP 201 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/system-modules
```

- `DELETE` `/api/system/lookups/system-modules/{id}` — DELETE /api/system/lookups/system-modules/:id
  - Auth: Public
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/system-modules/:id
```

- `GET` `/api/system/lookups/system-modules/{id}` — GET /api/system/lookups/system-modules/:id
  - Auth: Public
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/system-modules/:id
```

- `PUT` `/api/system/lookups/system-modules/{id}` — PUT /api/system/lookups/system-modules/:id
  - Auth: Public
  - Path params: `id`
  - Request body: SystemModule
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/system-modules/:id
```

- `GET` `/api/system/lookups/systems` — GET /api/system/lookups/systems
  - Auth: Public
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/systems
```

- `POST` `/api/system/lookups/systems` — POST /api/system/lookups/systems
  - Auth: Public
  - Request body: System
  - Success: HTTP 201 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/systems
```

- `DELETE` `/api/system/lookups/systems/{id}` — DELETE /api/system/lookups/systems/:id
  - Auth: Public
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/systems/:id
```

- `GET` `/api/system/lookups/systems/{id}` — GET /api/system/lookups/systems/:id
  - Auth: Public
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/systems/:id
```

- `PUT` `/api/system/lookups/systems/{id}` — PUT /api/system/lookups/systems/:id
  - Auth: Public
  - Path params: `id`
  - Request body: System
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/systems/:id
```

- `GET` `/api/system/lookups/video-categories` — GET /api/system/lookups/video-categories
  - Auth: Public
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/video-categories
```

- `POST` `/api/system/lookups/video-categories` — POST /api/system/lookups/video-categories
  - Auth: Public
  - Request body: System
  - Success: HTTP 201 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/video-categories
```

- `DELETE` `/api/system/lookups/video-categories/{id}` — DELETE /api/system/lookups/video-categories/:id
  - Auth: Public
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/video-categories/:id
```

- `GET` `/api/system/lookups/video-categories/{id}` — GET /api/system/lookups/video-categories/:id
  - Auth: Public
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/video-categories/:id
```

- `PUT` `/api/system/lookups/video-categories/{id}` — PUT /api/system/lookups/video-categories/:id
  - Auth: Public
  - Path params: `id`
  - Request body: System
  - Success: HTTP 200 — object
  - Example:

```bash
curl http://localhost:8080/api/system/lookups/video-categories/:id
```

## system/roles

- `GET` `/api/system/roles` — GET /api/system/roles
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<Role>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/roles
```

- `POST` `/api/system/roles` — POST /api/system/roles
  - Auth: Required
  - Request body: Role
  - Success: HTTP 201 — array<Role>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/roles
```

- `DELETE` `/api/system/roles/{id}` — DELETE /api/system/roles/:id
  - Auth: Required
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — Role
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/roles/:id
```

- `GET` `/api/system/roles/{id}` — GET /api/system/roles/:id
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — Role
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/roles/:id
```

- `PUT` `/api/system/roles/{id}` — PUT /api/system/roles/:id
  - Auth: Required
  - Path params: `id`
  - Request body: Role
  - Success: HTTP 200 — Role
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/roles/:id
```

- `GET` `/api/system/roles/{id}/permissions` — GET /api/system/roles/:id/permissions
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — Role
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/roles/:id/permissions
```

- `POST` `/api/system/roles/{id}/permissions` — POST /api/system/roles/:id/permissions
  - Auth: Required
  - Path params: `id`
  - Request body: Role
  - Success: HTTP 201 — Role
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/roles/:id/permissions
```

- `DELETE` `/api/system/roles/{id}/permissions/{permission_name}` — DELETE /api/system/roles/:id/permissions/:permission_name
  - Auth: Required
  - Path params: `id`, `permission_name`
  - Request body: none
  - Success: HTTP 200 — Role
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/roles/:id/permissions/:permission_name
```

- `GET` `/api/system/roles/permissions/catalog` — GET /api/system/roles/permissions/catalog
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<Role>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/roles/permissions/catalog
```

## system/settings

- `GET` `/api/system/settings/auth-methods` — GET /api/system/settings/auth-methods
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<SettingKV>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/settings/auth-methods
```

- `PUT` `/api/system/settings/auth-methods` — PUT /api/system/settings/auth-methods
  - Auth: Required
  - Request body: System
  - Success: HTTP 200 — array<SettingKV>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/settings/auth-methods
```

- `GET` `/api/system/settings/branding` — GET /api/system/settings/branding
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<SettingKV>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/settings/branding
```

- `PUT` `/api/system/settings/branding` — PUT /api/system/settings/branding
  - Auth: Required
  - Request body: System
  - Success: HTTP 200 — array<SettingKV>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/settings/branding
```

- `GET` `/api/system/settings/email-templates` — GET /api/system/settings/email-templates
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<SettingKV>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/settings/email-templates
```

- `PUT` `/api/system/settings/email-templates` — PUT /api/system/settings/email-templates
  - Auth: Required
  - Request body: System
  - Success: HTTP 200 — array<SettingKV>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/settings/email-templates
```

- `GET` `/api/system/settings/general` — GET /api/system/settings/general
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<SettingKV>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/settings/general
```

- `PUT` `/api/system/settings/general` — PUT /api/system/settings/general
  - Auth: Required
  - Request body: System
  - Success: HTTP 200 — array<SettingKV>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/settings/general
```

- `GET` `/api/system/settings/notifications` — GET /api/system/settings/notifications
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<SettingKV>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/settings/notifications
```

- `PUT` `/api/system/settings/notifications` — PUT /api/system/settings/notifications
  - Auth: Required
  - Request body: System
  - Success: HTTP 200 — array<SettingKV>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/settings/notifications
```

- `GET` `/api/system/settings/security` — GET /api/system/settings/security
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<SettingKV>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/settings/security
```

- `PUT` `/api/system/settings/security` — PUT /api/system/settings/security
  - Auth: Required
  - Request body: System
  - Success: HTTP 200 — array<SettingKV>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/settings/security
```

- `GET` `/api/system/settings/security/api-keys` — GET /api/system/settings/security/api-keys
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<SettingKV>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/settings/security/api-keys
```

- `POST` `/api/system/settings/security/api-keys` — POST /api/system/settings/security/api-keys
  - Auth: Required
  - Request body: System
  - Success: HTTP 201 — array<SettingKV>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/settings/security/api-keys
```

- `DELETE` `/api/system/settings/security/api-keys/{id}` — DELETE /api/system/settings/security/api-keys/:id
  - Auth: Required
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — SettingKV
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/settings/security/api-keys/:id
```

- `GET` `/api/system/settings/security/api-keys/{id}` — GET /api/system/settings/security/api-keys/:id
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — SettingKV
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/settings/security/api-keys/:id
```

- `PUT` `/api/system/settings/security/api-keys/{id}` — PUT /api/system/settings/security/api-keys/:id
  - Auth: Required
  - Path params: `id`
  - Request body: System
  - Success: HTTP 200 — SettingKV
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/settings/security/api-keys/:id
```

- `POST` `/api/system/settings/security/api-keys/{id}/activate` — POST /api/system/settings/security/api-keys/:id/activate
  - Auth: Required
  - Path params: `id`
  - Request body: System
  - Success: HTTP 201 — SettingKV
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/settings/security/api-keys/:id/activate
```

- `POST` `/api/system/settings/security/api-keys/{id}/deactivate` — POST /api/system/settings/security/api-keys/:id/deactivate
  - Auth: Required
  - Path params: `id`
  - Request body: System
  - Success: HTTP 201 — SettingKV
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/settings/security/api-keys/:id/deactivate
```

- `POST` `/api/system/settings/security/api-keys/{id}/rotate` — POST /api/system/settings/security/api-keys/:id/rotate
  - Auth: Required
  - Path params: `id`
  - Request body: System
  - Success: HTTP 201 — SettingKV
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/settings/security/api-keys/:id/rotate
```

- `GET` `/api/system/settings/smtp` — GET /api/system/settings/smtp
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<SettingKV>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/settings/smtp
```

- `PUT` `/api/system/settings/smtp` — PUT /api/system/settings/smtp
  - Auth: Required
  - Request body: System
  - Success: HTTP 200 — array<SettingKV>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/settings/smtp
```

- `GET` `/api/system/settings/sso` — GET /api/system/settings/sso
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<SettingKV>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/settings/sso
```

- `PUT` `/api/system/settings/sso` — PUT /api/system/settings/sso
  - Auth: Required
  - Request body: System
  - Success: HTTP 200 — array<SettingKV>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/settings/sso
```

## system/users

- `GET` `/api/system/users` — GET /api/system/users
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/users
```

- `POST` `/api/system/users` — POST /api/system/users
  - Auth: Required
  - Request body: User
  - Success: HTTP 201 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/users
```

- `DELETE` `/api/system/users/{id}` — DELETE /api/system/users/:id
  - Auth: Required
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — User
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/users/:id
```

- `GET` `/api/system/users/{id}` — GET /api/system/users/:id
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — User
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/users/:id
```

- `PUT` `/api/system/users/{id}` — PUT /api/system/users/:id
  - Auth: Required
  - Path params: `id`
  - Request body: User
  - Success: HTTP 200 — User
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/users/:id
```

- `GET` `/api/system/users/{id}/permissions` — GET /api/system/users/:id/permissions
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — User
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/users/:id/permissions
```

- `GET` `/api/system/users/{id}/roles` — GET /api/system/users/:id/roles
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — User
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/users/:id/roles
```

- `POST` `/api/system/users/{id}/roles` — POST /api/system/users/:id/roles
  - Auth: Required
  - Path params: `id`
  - Request body: Role
  - Success: HTTP 201 — User
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/users/:id/roles
```

- `DELETE` `/api/system/users/{id}/roles/{roleId}` — DELETE /api/system/users/:id/roles/:roleId
  - Auth: Required
  - Path params: `id`, `roleId`
  - Request body: none
  - Success: HTTP 200 — User
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/users/:id/roles/:roleId
```

- `GET` `/api/system/users/{id}/support-groups` — GET /api/system/users/:id/support-groups
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — User
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/users/:id/support-groups
```

- `POST` `/api/system/users/{id}/support-groups` — POST /api/system/users/:id/support-groups
  - Auth: Required
  - Path params: `id`
  - Request body: User
  - Success: HTTP 201 — User
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/users/:id/support-groups
```

- `DELETE` `/api/system/users/{id}/support-groups/{groupId}` — DELETE /api/system/users/:id/support-groups/:groupId
  - Auth: Required
  - Path params: `id`, `groupId`
  - Request body: none
  - Success: HTTP 200 — User
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/users/:id/support-groups/:groupId
```

- `GET` `/api/system/users/{id}/tiers` — GET /api/system/users/:id/tiers
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — User
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/users/:id/tiers
```

- `POST` `/api/system/users/{id}/tiers` — POST /api/system/users/:id/tiers
  - Auth: Required
  - Path params: `id`
  - Request body: User
  - Success: HTTP 201 — User
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/users/:id/tiers
```

- `DELETE` `/api/system/users/{id}/tiers/{tierId}` — DELETE /api/system/users/:id/tiers/:tierId
  - Auth: Required
  - Path params: `id`, `tierId`
  - Request body: none
  - Success: HTTP 200 — User
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/users/:id/tiers/:tierId
```

- `GET` `/api/system/users/permissions` — GET /api/system/users/permissions
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — object
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/users/permissions
```

## system/workflows

- `GET` `/api/system/workflows/actions` — GET /api/system/workflows/actions
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<WorkflowRule>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/workflows/actions
```

- `GET` `/api/system/workflows/conditions` — GET /api/system/workflows/conditions
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<WorkflowRule>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/workflows/conditions
```

- `GET` `/api/system/workflows/rules` — GET /api/system/workflows/rules
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<WorkflowRule>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/workflows/rules
```

- `POST` `/api/system/workflows/rules` — POST /api/system/workflows/rules
  - Auth: Required
  - Request body: System
  - Success: HTTP 201 — array<WorkflowRule>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/workflows/rules
```

- `DELETE` `/api/system/workflows/rules/{id}` — DELETE /api/system/workflows/rules/:id
  - Auth: Required
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — WorkflowRule
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/workflows/rules/:id
```

- `GET` `/api/system/workflows/rules/{id}` — GET /api/system/workflows/rules/:id
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — WorkflowRule
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/workflows/rules/:id
```

- `PUT` `/api/system/workflows/rules/{id}` — PUT /api/system/workflows/rules/:id
  - Auth: Required
  - Path params: `id`
  - Request body: System
  - Success: HTTP 200 — WorkflowRule
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/workflows/rules/:id
```

- `POST` `/api/system/workflows/rules/{id}/disable` — POST /api/system/workflows/rules/:id/disable
  - Auth: Required
  - Path params: `id`
  - Request body: System
  - Success: HTTP 201 — WorkflowRule
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/workflows/rules/:id/disable
```

- `POST` `/api/system/workflows/rules/{id}/enable` — POST /api/system/workflows/rules/:id/enable
  - Auth: Required
  - Path params: `id`
  - Request body: System
  - Success: HTTP 201 — WorkflowRule
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/workflows/rules/:id/enable
```

- `POST` `/api/system/workflows/rules/{id}/test` — POST /api/system/workflows/rules/:id/test
  - Auth: Required
  - Path params: `id`
  - Request body: System
  - Success: HTTP 201 — WorkflowRule
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/system/workflows/rules/:id/test
```

## tickets

- `GET` `/api/tickets` — GET /api/tickets
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — TicketList
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tickets
```

- `POST` `/api/tickets` — POST /api/tickets
  - Auth: Required
  - Request body: object
  - Success: HTTP 201 — TicketList
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tickets
```

## tickets/:id

- `DELETE` `/api/tickets/{id}` — DELETE /api/tickets/:id
  - Auth: Required
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — Ticket
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tickets/:id
```

- `GET` `/api/tickets/{id}` — GET /api/tickets/:id
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — Ticket
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tickets/:id
```

- `PUT` `/api/tickets/{id}` — PUT /api/tickets/:id
  - Auth: Required
  - Path params: `id`
  - Request body: object
  - Success: HTTP 200 — Ticket
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tickets/:id
```

- `POST` `/api/tickets/{id}/assign` — POST /api/tickets/:id/assign
  - Auth: Required
  - Path params: `id`
  - Request body: object
  - Success: HTTP 201 — Ticket
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tickets/:id/assign
```

- `GET` `/api/tickets/{id}/attachments` — GET /api/tickets/:id/attachments
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — Ticket
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tickets/:id/attachments
```

- `POST` `/api/tickets/{id}/attachments` — POST /api/tickets/:id/attachments
  - Auth: Required
  - Path params: `id`
  - Request body: TicketAttachment
  - Success: HTTP 201 — Ticket
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tickets/:id/attachments
```

- `POST` `/api/tickets/{id}/claim` — POST /api/tickets/:id/claim
  - Auth: Required
  - Path params: `id`
  - Request body: object
  - Success: HTTP 201 — Ticket
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tickets/:id/claim
```

- `POST` `/api/tickets/{id}/close` — POST /api/tickets/:id/close
  - Auth: Required
  - Path params: `id`
  - Request body: object
  - Success: HTTP 201 — Ticket
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tickets/:id/close
```

- `GET` `/api/tickets/{id}/events` — GET /api/tickets/:id/events
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — Ticket
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tickets/:id/events
```

- `GET` `/api/tickets/{id}/notes` — GET /api/tickets/:id/notes
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — Ticket
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tickets/:id/notes
```

- `POST` `/api/tickets/{id}/notes` — POST /api/tickets/:id/notes
  - Auth: Required
  - Path params: `id`
  - Request body: TicketNote
  - Success: HTTP 201 — Ticket
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tickets/:id/notes
```

- `POST` `/api/tickets/{id}/priority` — POST /api/tickets/:id/priority
  - Auth: Required
  - Path params: `id`
  - Request body: object
  - Success: HTTP 201 — Ticket
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tickets/:id/priority
```

- `POST` `/api/tickets/{id}/release` — POST /api/tickets/:id/release
  - Auth: Required
  - Path params: `id`
  - Request body: object
  - Success: HTTP 201 — Ticket
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tickets/:id/release
```

- `POST` `/api/tickets/{id}/reopen` — POST /api/tickets/:id/reopen
  - Auth: Required
  - Path params: `id`
  - Request body: object
  - Success: HTTP 201 — Ticket
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tickets/:id/reopen
```

- `POST` `/api/tickets/{id}/severity` — POST /api/tickets/:id/severity
  - Auth: Required
  - Path params: `id`
  - Request body: object
  - Success: HTTP 201 — Ticket
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tickets/:id/severity
```

- `POST` `/api/tickets/{id}/status` — POST /api/tickets/:id/status
  - Auth: Required
  - Path params: `id`
  - Request body: object
  - Success: HTTP 201 — Ticket
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tickets/:id/status
```

- `POST` `/api/tickets/{id}/unclaim` — POST /api/tickets/:id/unclaim
  - Auth: Required
  - Path params: `id`
  - Request body: object
  - Success: HTTP 201 — Ticket
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tickets/:id/unclaim
```

- `GET` `/api/tickets/{id}/watchers` — GET /api/tickets/:id/watchers
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — Ticket
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tickets/:id/watchers
```

- `POST` `/api/tickets/{id}/watchers` — POST /api/tickets/:id/watchers
  - Auth: Required
  - Path params: `id`
  - Request body: object
  - Success: HTTP 201 — Ticket
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tickets/:id/watchers
```

- `DELETE` `/api/tickets/{id}/watchers/{wid}` — DELETE /api/tickets/:id/watchers/:wid
  - Auth: Required
  - Path params: `id`, `wid`
  - Request body: none
  - Success: HTTP 200 — Ticket
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tickets/:id/watchers/:wid
```


## tokens/api-keys

- `GET` `/api/tokens/api-keys` — GET /api/tokens/api-keys
  - Auth: Required
  - Query params: `fields`, `page`, `pageSize`, `q`
  - Request body: none
  - Success: HTTP 200 — array<ApiKeyPublic>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tokens/api-keys
```

- `POST` `/api/tokens/api-keys` — POST /api/tokens/api-keys
  - Auth: Required
  - Request body: object
  - Success: HTTP 201 — array<ApiKeyPublic>
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tokens/api-keys
```

- `DELETE` `/api/tokens/api-keys/{id}` — DELETE /api/tokens/api-keys/:id
  - Auth: Required
  - Path params: `id`
  - Request body: none
  - Success: HTTP 200 — ApiKeyPublic
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tokens/api-keys/:id
```

- `GET` `/api/tokens/api-keys/{id}` — GET /api/tokens/api-keys/:id
  - Auth: Required
  - Path params: `id`
  - Query params: `fields`
  - Request body: none
  - Success: HTTP 200 — ApiKeyPublic
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tokens/api-keys/:id
```

- `PUT` `/api/tokens/api-keys/{id}` — PUT /api/tokens/api-keys/:id
  - Auth: Required
  - Path params: `id`
  - Request body: object
  - Success: HTTP 200 — ApiKeyPublic
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tokens/api-keys/:id
```

- `POST` `/api/tokens/api-keys/{id}/activate` — POST /api/tokens/api-keys/:id/activate
  - Auth: Required
  - Path params: `id`
  - Request body: object
  - Success: HTTP 201 — ApiKeyPublic
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tokens/api-keys/:id/activate
```

- `POST` `/api/tokens/api-keys/{id}/deactivate` — POST /api/tokens/api-keys/:id/deactivate
  - Auth: Required
  - Path params: `id`
  - Request body: object
  - Success: HTTP 201 — ApiKeyPublic
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tokens/api-keys/:id/deactivate
```

- `POST` `/api/tokens/api-keys/{id}/rotate` — POST /api/tokens/api-keys/:id/rotate
  - Auth: Required
  - Path params: `id`
  - Request body: object
  - Success: HTTP 201 — ApiKeyPublic
  - Example:

```bash
curl -H 'Authorization: Bearer {TOKEN}' http://localhost:8080/api/tokens/api-keys/:id/rotate
```

<!-- API_REFERENCE_START -->

# API Reference

Auto-generated API documentation. Most endpoints accept any of the following auth methods:

This section is generated from the OpenAPI spec (src/docs/openapi.json).

Tags index:
- [admin/me](#admin-me)
- [admin/notifications](#admin-notifications)
- [admin/preferences](#admin-preferences)
- [analytics/dashboards](#analytics-dashboards)
- [analytics/exports](#analytics-exports)
- [analytics/reports](#analytics-reports)
- [auth/login](#auth-login)
- [auth/logout](#auth-logout)
- [auth/me](#auth-me)
- [auth/refresh](#auth-refresh)
- [auth/request-password-reset](#auth-request-password-reset)
- [auth/reset-password](#auth-reset-password)
- [auth/whoami](#auth-whoami)
- [knowledge/faqs](#knowledge-faqs)
- [knowledge/kb](#knowledge-kb)
- [knowledge/search](#knowledge-search)
- [knowledge/videos](#knowledge-videos)
- [public/endpoints](#public-endpoints)
- [public/faqs](#public-faqs)
- [public/kb](#public-kb)
- [public/ping](#public-ping)
- [public/search](#public-search)
- [public/tickets](#public-tickets)
- [public/videos](#public-videos)
- [system/agents](#system-agents)
- [system/audit](#system-audit)
- [system/files](#system-files)
- [system/inbox](#system-inbox)
- [system/lookups](#system-lookups)
- [system/roles](#system-roles)
- [system/settings](#system-settings)
- [system/users](#system-users)
- [system/workflows](#system-workflows)
- [tickets](#tickets)
- [tickets/:id](#tickets-id)
- [tickets/attachments](#tickets-attachments)
- [tickets/events](#tickets-events)
- [tickets/notes](#tickets-notes)
- [tickets/watchers](#tickets-watchers)
- [tokens/api-keys](#tokens-api-keys)

## admin/me

- `GET` `/api/admin/me` — GET /api/admin/me
- Auth: Required
- Description: List me with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/admin/me' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/admin/me` — PUT /api/admin/me
- Auth: Required
- Description: Operation on me.
- Request body: object
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/admin/me' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## admin/notifications

- `GET` `/api/admin/notifications` — GET /api/admin/notifications
- Auth: Required
- Description: List notifications with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/admin/notifications' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

## admin/preferences

- `GET` `/api/admin/preferences` — GET /api/admin/preferences
- Auth: Required
- Description: List preferences with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/admin/preferences' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/admin/preferences` — PUT /api/admin/preferences
- Auth: Required
- Description: Operation on preferences.
- Request body: object
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/admin/preferences' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## analytics/dashboards

- `GET` `/api/analytics/dashboards/by-category` — GET /api/analytics/dashboards/by-category
- Auth: Required
- Description: List by-category with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/analytics/dashboards/by-category' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/analytics/dashboards/overview` — GET /api/analytics/dashboards/overview
- Auth: Required
- Description: List overview with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/analytics/dashboards/overview' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

## analytics/exports

- `GET` `/api/analytics/exports/tickets.csv` — GET /api/analytics/exports/tickets.csv
- Auth: Required
- Description: List tickets.csv with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — TicketList
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/analytics/exports/tickets.csv' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

## analytics/reports

- `GET` `/api/analytics/reports` — GET /api/analytics/reports
- Auth: Required
- Description: List reports with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/analytics/reports' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/analytics/reports` — POST /api/analytics/reports
- Auth: Required
- Description: Create a new report.
- Request body: object
- Success: HTTP 201 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/analytics/reports' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/analytics/reports/{id}` — DELETE /api/analytics/reports/:id
- Auth: Required
- Description: Delete a report.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/analytics/reports/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/analytics/reports/{id}` — PUT /api/analytics/reports/:id
- Auth: Required
- Description: Update an existing report.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: object
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/analytics/reports/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## auth/login

- `POST` `/api/auth/login` — POST /api/auth/login
- Auth: Public
- Description: Create a new login.
- Request body: AuthLoginRequest
  - Required fields: `email`, `password`
  - Properties:
  - `email`: string (email) (required)
  - `password`: string (required)
- Success: HTTP 201 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/auth/login' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## auth/logout

- `POST` `/api/auth/logout` — POST /api/auth/logout
- Auth: Public
- Description: Create a new logout.
- Request body: object
- Success: HTTP 201 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/auth/logout' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## auth/me

- `GET` `/api/auth/me` — GET /api/auth/me
- Auth: Required
- Description: List me with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/auth/me' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

## auth/refresh

- `POST` `/api/auth/refresh` — POST /api/auth/refresh
- Auth: Public
- Description: Create a new refresh.
- Request body: object
- Success: HTTP 201 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/auth/refresh' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## auth/request-password-reset

- `POST` `/api/auth/request-password-reset` — POST /api/auth/request-password-reset
- Auth: Public
- Description: Create a new request-password-reset.
- Request body: object
- Success: HTTP 201 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/auth/request-password-reset' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## auth/reset-password

- `POST` `/api/auth/reset-password` — POST /api/auth/reset-password
- Auth: Public
- Description: Create a new reset-password.
- Request body: object
- Success: HTTP 201 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/auth/reset-password' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## auth/whoami

- `GET` `/api/auth/whoami` — GET /api/auth/whoami
- Auth: Required
- Description: List whoami with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/auth/whoami' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

## knowledge/faqs

- `GET` `/api/knowledge/faqs` — GET /api/knowledge/faqs
- Auth: Required
- Description: List faqs with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — array<FAQ>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/knowledge/faqs' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/knowledge/faqs` — POST /api/knowledge/faqs
- Auth: Required
- Description: Create a new faq.
- Request body: FAQ
  - Required fields: `id`, `title`
  - Properties:
  - `id`: string (required)
  - `title`: string (required)
  - `body`: string
  - `is_published`: boolean
  - `system_category_id`: string
  - `created_by`: string
  - `created_at`: string (date-time)
- Success: HTTP 201 — array<FAQ>
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/knowledge/faqs' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/knowledge/faqs/{id}` — DELETE /api/knowledge/faqs/:id
- Auth: Required
- Description: Delete a faq.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — FAQ
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/knowledge/faqs/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/knowledge/faqs/{id}` — GET /api/knowledge/faqs/:id
- Auth: Required
- Description: Get a faq by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — FAQ
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/knowledge/faqs/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/knowledge/faqs/{id}` — PUT /api/knowledge/faqs/:id
- Auth: Required
- Description: Update an existing faq.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: FAQ
  - Required fields: `id`, `title`
  - Properties:
  - `id`: string (required)
  - `title`: string (required)
  - `body`: string
  - `is_published`: boolean
  - `system_category_id`: string
  - `created_by`: string
  - `created_at`: string (date-time)
- Success: HTTP 200 — FAQ
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/knowledge/faqs/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/knowledge/faqs/origins` — GET /api/knowledge/faqs/origins
- Auth: Required
- Description: List origins with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — array<FAQ>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/knowledge/faqs/origins' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/knowledge/faqs/origins` — POST /api/knowledge/faqs/origins
- Auth: Required
- Description: Create a new origin.
- Request body: FAQ
  - Required fields: `id`, `title`
  - Properties:
  - `id`: string (required)
  - `title`: string (required)
  - `body`: string
  - `is_published`: boolean
  - `system_category_id`: string
  - `created_by`: string
  - `created_at`: string (date-time)
- Success: HTTP 201 — array<FAQ>
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/knowledge/faqs/origins' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/knowledge/faqs/origins/{id}` — DELETE /api/knowledge/faqs/origins/:id
- Auth: Required
- Description: Delete a origin.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — FAQ
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/knowledge/faqs/origins/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/knowledge/faqs/origins/{id}` — GET /api/knowledge/faqs/origins/:id
- Auth: Required
- Description: Get a origin by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — FAQ
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/knowledge/faqs/origins/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/knowledge/faqs/origins/{id}` — PUT /api/knowledge/faqs/origins/:id
- Auth: Required
- Description: Update an existing origin.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: FAQ
  - Required fields: `id`, `title`
  - Properties:
  - `id`: string (required)
  - `title`: string (required)
  - `body`: string
  - `is_published`: boolean
  - `system_category_id`: string
  - `created_by`: string
  - `created_at`: string (date-time)
- Success: HTTP 200 — FAQ
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/knowledge/faqs/origins/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## knowledge/kb

- `GET` `/api/knowledge/kb/articles` — GET /api/knowledge/kb/articles
- Auth: Required
- Description: List articles with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — array<KBArticle>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/knowledge/kb/articles' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/knowledge/kb/articles` — POST /api/knowledge/kb/articles
- Auth: Required
- Description: Create a new article.
- Request body: KBArticle
  - Required fields: `id`, `title`
  - Properties:
  - `id`: string (required)
  - `title`: string (required)
  - `body`: string
  - `is_published`: boolean
  - `created_by`: string
  - `created_at`: string (date-time)
  - `updated_at`: string (date-time)
  - `tags`: array<string>
- Success: HTTP 201 — array<KBArticle>
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/knowledge/kb/articles' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/knowledge/kb/articles/{id}` — DELETE /api/knowledge/kb/articles/:id
- Auth: Required
- Description: Delete a article.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — KBArticle
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/knowledge/kb/articles/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/knowledge/kb/articles/{id}` — GET /api/knowledge/kb/articles/:id
- Auth: Required
- Description: Get a article by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — KBArticle
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/knowledge/kb/articles/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/knowledge/kb/articles/{id}` — PUT /api/knowledge/kb/articles/:id
- Auth: Required
- Description: Update an existing article.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: KBArticle
  - Required fields: `id`, `title`
  - Properties:
  - `id`: string (required)
  - `title`: string (required)
  - `body`: string
  - `is_published`: boolean
  - `created_by`: string
  - `created_at`: string (date-time)
  - `updated_at`: string (date-time)
  - `tags`: array<string>
- Success: HTTP 200 — KBArticle
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/knowledge/kb/articles/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/knowledge/kb/ratings` — List KB ratings
- Auth: Required
- Description: List KB ratings.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `article_id` in `query`: string
  - `user_id` in `query`: string
- Success: HTTP 200 — array<KBArticle>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/knowledge/kb/ratings' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/knowledge/kb/ratings` — POST /api/knowledge/kb/ratings
- Auth: Required
- Description: Create a new rating.
- Request body: KBArticle
  - Required fields: `id`, `title`
  - Properties:
  - `id`: string (required)
  - `title`: string (required)
  - `body`: string
  - `is_published`: boolean
  - `created_by`: string
  - `created_at`: string (date-time)
  - `updated_at`: string (date-time)
  - `tags`: array<string>
- Success: HTTP 201 — array<KBArticle>
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/knowledge/kb/ratings' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/knowledge/kb/ratings/{id}` — DELETE /api/knowledge/kb/ratings/:id
- Auth: Required
- Description: Delete a rating.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — KBArticle
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/knowledge/kb/ratings/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/knowledge/kb/ratings/{id}` — GET /api/knowledge/kb/ratings/:id
- Auth: Required
- Description: Get a rating by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — KBArticle
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/knowledge/kb/ratings/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/knowledge/kb/ratings/{id}` — PUT /api/knowledge/kb/ratings/:id
- Auth: Required
- Description: Update an existing rating.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: KBArticle
  - Required fields: `id`, `title`
  - Properties:
  - `id`: string (required)
  - `title`: string (required)
  - `body`: string
  - `is_published`: boolean
  - `created_by`: string
  - `created_at`: string (date-time)
  - `updated_at`: string (date-time)
  - `tags`: array<string>
- Success: HTTP 200 — KBArticle
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/knowledge/kb/ratings/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/knowledge/kb/ratings/summary` — GET /api/knowledge/kb/ratings/summary
- Auth: Required
- Description: List summary with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — array<KBArticle>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/knowledge/kb/ratings/summary' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `DELETE` `/api/knowledge/kb/tag-map` — DELETE /api/knowledge/kb/tag-map
- Auth: Required
- Description: Operation on tag-map.
- Success: HTTP 200 — array<KBArticle>
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/knowledge/kb/tag-map' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/knowledge/kb/tag-map` — GET /api/knowledge/kb/tag-map
- Auth: Required
- Description: List tag-map with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — array<KBArticle>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/knowledge/kb/tag-map' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/knowledge/kb/tag-map` — POST /api/knowledge/kb/tag-map
- Auth: Required
- Description: Create a new tag-map.
- Request body: KBArticle
  - Required fields: `id`, `title`
  - Properties:
  - `id`: string (required)
  - `title`: string (required)
  - `body`: string
  - `is_published`: boolean
  - `created_by`: string
  - `created_at`: string (date-time)
  - `updated_at`: string (date-time)
  - `tags`: array<string>
- Success: HTTP 201 — array<KBArticle>
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/knowledge/kb/tag-map' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/knowledge/kb/tag-map/article/{articleId}` — GET /api/knowledge/kb/tag-map/article/:articleId
- Auth: Required
- Description: Get a article by ID.
- Parameters:
  - `articleId` in `path`: string (required) — Path parameter: articleId
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — array<KBArticle>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/knowledge/kb/tag-map/article/:articleId' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `DELETE` `/api/knowledge/kb/tag-map/article/{articleId}/tag/{tagId}` — DELETE /api/knowledge/kb/tag-map/article/:articleId/tag/:tagId
- Auth: Required
- Description: Delete a tag.
- Parameters:
  - `articleId` in `path`: string (required) — Path parameter: articleId
  - `tagId` in `path`: string (required) — Path parameter: tagId
- Success: HTTP 200 — array<KBArticle>
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/knowledge/kb/tag-map/article/:articleId/tag/:tagId' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/knowledge/kb/tags` — List KB tags
- Auth: Required
- Description: List KB tags.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string
- Success: HTTP 200 — array<KBArticle>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/knowledge/kb/tags' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/knowledge/kb/tags` — POST /api/knowledge/kb/tags
- Auth: Required
- Description: Create a new tag.
- Request body: KBArticle
  - Required fields: `id`, `title`
  - Properties:
  - `id`: string (required)
  - `title`: string (required)
  - `body`: string
  - `is_published`: boolean
  - `created_by`: string
  - `created_at`: string (date-time)
  - `updated_at`: string (date-time)
  - `tags`: array<string>
- Success: HTTP 201 — array<KBArticle>
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/knowledge/kb/tags' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/knowledge/kb/tags/{id}` — DELETE /api/knowledge/kb/tags/:id
- Auth: Required
- Description: Delete a tag.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — KBArticle
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/knowledge/kb/tags/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/knowledge/kb/tags/{id}` — GET /api/knowledge/kb/tags/:id
- Auth: Required
- Description: Get a tag by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — KBArticle
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/knowledge/kb/tags/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/knowledge/kb/tags/{id}` — PUT /api/knowledge/kb/tags/:id
- Auth: Required
- Description: Update an existing tag.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: KBArticle
  - Required fields: `id`, `title`
  - Properties:
  - `id`: string (required)
  - `title`: string (required)
  - `body`: string
  - `is_published`: boolean
  - `created_by`: string
  - `created_at`: string (date-time)
  - `updated_at`: string (date-time)
  - `tags`: array<string>
- Success: HTTP 200 — KBArticle
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/knowledge/kb/tags/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## knowledge/search

- `GET` `/api/knowledge/search` — GET /api/knowledge/search
- Auth: Required
- Description: List search with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/knowledge/search' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

## knowledge/videos

- `GET` `/api/knowledge/videos` — List videos
- Auth: Required
- Description: List videos.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search title/description
  - `category_id` in `query`: string
  - `system_category_id` in `query`: integer
  - `language` in `query`: string
  - `is_published` in `query`: string enum: true|false
- Success: HTTP 200 — array<Video>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/knowledge/videos' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/knowledge/videos` — POST /api/knowledge/videos
- Auth: Required
- Description: Create a new video.
- Request body: Video
  - Required fields: `id`, `title`
  - Properties:
  - `id`: string (required)
  - `title`: string (required)
  - `description`: string
  - `category_id`: string
  - `system_category_id`: string
  - `url`: string (uri)
  - `duration_seconds`: integer
  - `language`: string
  - `is_published`: boolean
  - `created_at`: string (date-time)
- Success: HTTP 201 — array<Video>
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/knowledge/videos' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/knowledge/videos/{id}` — DELETE /api/knowledge/videos/:id
- Auth: Required
- Description: Delete a video.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — Video
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/knowledge/videos/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/knowledge/videos/{id}` — GET /api/knowledge/videos/:id
- Auth: Required
- Description: Get a video by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — Video
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/knowledge/videos/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/knowledge/videos/{id}` — PUT /api/knowledge/videos/:id
- Auth: Required
- Description: Update an existing video.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: Video
  - Required fields: `id`, `title`
  - Properties:
  - `id`: string (required)
  - `title`: string (required)
  - `description`: string
  - `category_id`: string
  - `system_category_id`: string
  - `url`: string (uri)
  - `duration_seconds`: integer
  - `language`: string
  - `is_published`: boolean
  - `created_at`: string (date-time)
- Success: HTTP 200 — Video
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/knowledge/videos/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/knowledge/videos/{id}/publish` — POST /api/knowledge/videos/:id/publish
- Auth: Required
- Description: Operation on publish.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: Video
  - Required fields: `id`, `title`
  - Properties:
  - `id`: string (required)
  - `title`: string (required)
  - `description`: string
  - `category_id`: string
  - `system_category_id`: string
  - `url`: string (uri)
  - `duration_seconds`: integer
  - `language`: string
  - `is_published`: boolean
  - `created_at`: string (date-time)
- Success: HTTP 201 — Video
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/knowledge/videos/:id/publish' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/knowledge/videos/{id}/unpublish` — POST /api/knowledge/videos/:id/unpublish
- Auth: Required
- Description: Operation on unpublish.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: Video
  - Required fields: `id`, `title`
  - Properties:
  - `id`: string (required)
  - `title`: string (required)
  - `description`: string
  - `category_id`: string
  - `system_category_id`: string
  - `url`: string (uri)
  - `duration_seconds`: integer
  - `language`: string
  - `is_published`: boolean
  - `created_at`: string (date-time)
- Success: HTTP 201 — Video
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/knowledge/videos/:id/unpublish' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/knowledge/videos/categories` — GET /api/knowledge/videos/categories
- Auth: Required
- Description: List categories with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — array<Video>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/knowledge/videos/categories' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/knowledge/videos/categories` — POST /api/knowledge/videos/categories
- Auth: Required
- Description: Create a new categorie.
- Request body: Video
  - Required fields: `id`, `title`
  - Properties:
  - `id`: string (required)
  - `title`: string (required)
  - `description`: string
  - `category_id`: string
  - `system_category_id`: string
  - `url`: string (uri)
  - `duration_seconds`: integer
  - `language`: string
  - `is_published`: boolean
  - `created_at`: string (date-time)
- Success: HTTP 201 — array<Video>
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/knowledge/videos/categories' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/knowledge/videos/categories/{id}` — DELETE /api/knowledge/videos/categories/:id
- Auth: Required
- Description: Delete a categorie.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — Video
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/knowledge/videos/categories/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/knowledge/videos/categories/{id}` — GET /api/knowledge/videos/categories/:id
- Auth: Required
- Description: Get a categorie by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — Video
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/knowledge/videos/categories/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/knowledge/videos/categories/{id}` — PUT /api/knowledge/videos/categories/:id
- Auth: Required
- Description: Update an existing categorie.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: Video
  - Required fields: `id`, `title`
  - Properties:
  - `id`: string (required)
  - `title`: string (required)
  - `description`: string
  - `category_id`: string
  - `system_category_id`: string
  - `url`: string (uri)
  - `duration_seconds`: integer
  - `language`: string
  - `is_published`: boolean
  - `created_at`: string (date-time)
- Success: HTTP 200 — Video
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/knowledge/videos/categories/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## public/endpoints

- `GET` `/api/public/endpoints` — GET /api/public/endpoints
- Auth: Public
- Description: List endpoints with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/public/endpoints' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

## public/faqs

- `GET` `/api/public/faqs` — List FAQs
- Auth: Public
- Description: List published FAQs.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer
  - `pageSize` in `query`: integer
  - `q` in `query`: string
  - `system_category_id` in `query`: string
- Success: HTTP 200 — array<FAQ>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/public/faqs' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/public/faqs/{id}` — GET /api/public/faqs/:id
- Auth: Public
- Description: Get a faq by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — FAQ
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/public/faqs/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

## public/kb

- `GET` `/api/public/kb/articles` — List public KB articles
- Auth: Public
- Description: List published knowledge base articles.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer
  - `pageSize` in `query`: integer
  - `q` in `query`: string
- Success: HTTP 200 — array<KBArticle>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/public/kb/articles' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/public/kb/articles/{id}` — GET /api/public/kb/articles/:id
- Auth: Public
- Description: Get a article by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — KBArticle
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/public/kb/articles/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/public/kb/ratings/summary` — GET /api/public/kb/ratings/summary
- Auth: Public
- Description: List summary with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — array<KBArticle>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/public/kb/ratings/summary' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

## public/ping

- `GET` `/api/public/ping` — GET /api/public/ping
- Auth: Public
- Description: List ping with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/public/ping' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

## public/search

- `GET` `/api/public/search` — Public search
- Auth: Public
- Description: Unified public search across content.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/public/search' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

## public/tickets

- `GET` `/api/public/tickets` — GET /api/public/tickets
- Auth: Public
- Description: List tickets with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — TicketList
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/public/tickets' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/public/tickets` — POST /api/public/tickets
- Auth: Public
- Description: Create a new ticket.
- Request body: object
  - Required fields: `title`, `description`
  - Properties:
  - `title`: string (required)
  - `description`: string (required)
  - `email`: string (email) — Alias for reporter_email (public)
  - `reporter_email`: string (email)
  - `full_name`: string
  - `phone_number`: string
  - `reporter_user_id`: string — Authenticated user id (server may infer)
  - `system_id`: string
  - `module_id`: string
  - `category_id`: string
  - `priority_id`: string
  - `severity_id`: string
  - `source_code`: string — Explicit source code/name; defaults to Self Service (public) or Agent Reporting (authenticated). Common values: agent_reporting, phone_call, email, verbal, social_media, community_of_practice.
- Success: HTTP 201 — TicketList
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/public/tickets' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/public/tickets/lookup` — GET /api/public/tickets/lookup
- Auth: Public
- Description: List lookup with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — TicketList
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/public/tickets/lookup' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

## public/videos

- `GET` `/api/public/videos` — List public videos
- Auth: Public
- Description: List published training videos.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer
  - `pageSize` in `query`: integer
  - `q` in `query`: string
  - `category_id` in `query`: string — UUID
  - `system_category_id` in `query`: integer
  - `language` in `query`: string
- Success: HTTP 200 — array<Video>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/public/videos' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/public/videos/categories` — List public video categories
- Auth: Public
- Description: List public video categories.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer
  - `pageSize` in `query`: integer
  - `q` in `query`: string
- Success: HTTP 200 — array<Video>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/public/videos/categories' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

## system/agents

- `GET` `/api/system/agents/group-members` — GET /api/system/agents/group-members
- Auth: Required
- Description: List group-members with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/agents/group-members' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/agents/group-members` — POST /api/system/agents/group-members
- Auth: Required
- Description: Create a new group-member.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/agents/group-members' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/agents/group-members/{id}` — DELETE /api/system/agents/group-members/:id
- Auth: Required
- Description: Delete a group-member.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/agents/group-members/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/agents/group-members/{id}` — GET /api/system/agents/group-members/:id
- Auth: Required
- Description: Get a group-member by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/agents/group-members/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/agents/group-members/{id}` — PUT /api/system/agents/group-members/:id
- Auth: Required
- Description: Update an existing group-member.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/agents/group-members/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/agents/groups` — GET /api/system/agents/groups
- Auth: Required
- Description: List groups with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — array<AgentGroup>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/agents/groups' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/agents/groups` — POST /api/system/agents/groups
- Auth: Required
- Description: Create a new group.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — array<AgentGroup>
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/agents/groups' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/agents/groups/{id}` — DELETE /api/system/agents/groups/:id
- Auth: Required
- Description: Delete a group.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — AgentGroup
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/agents/groups/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/agents/groups/{id}` — GET /api/system/agents/groups/:id
- Auth: Required
- Description: Get a group by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — AgentGroup
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/agents/groups/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/agents/groups/{id}` — PUT /api/system/agents/groups/:id
- Auth: Required
- Description: Update an existing group.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — AgentGroup
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/agents/groups/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/agents/support-group-members` — GET /api/system/agents/support-group-members
- Auth: Required
- Description: List support-group-members with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/agents/support-group-members' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/agents/support-group-members` — POST /api/system/agents/support-group-members
- Auth: Required
- Description: Create a new support-group-member.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/agents/support-group-members' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/agents/support-group-members/{id}` — DELETE /api/system/agents/support-group-members/:id
- Auth: Required
- Description: Delete a support-group-member.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/agents/support-group-members/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/agents/support-group-members/{id}` — GET /api/system/agents/support-group-members/:id
- Auth: Required
- Description: Get a support-group-member by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/agents/support-group-members/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/agents/support-group-members/{id}` — PUT /api/system/agents/support-group-members/:id
- Auth: Required
- Description: Update an existing support-group-member.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/agents/support-group-members/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/agents/support-groups` — GET /api/system/agents/support-groups
- Auth: Required
- Description: List support-groups with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/agents/support-groups' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/agents/support-groups` — POST /api/system/agents/support-groups
- Auth: Required
- Description: Create a new support-group.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/agents/support-groups' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/agents/support-groups/{id}` — DELETE /api/system/agents/support-groups/:id
- Auth: Required
- Description: Delete a support-group.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/agents/support-groups/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/agents/support-groups/{id}` — GET /api/system/agents/support-groups/:id
- Auth: Required
- Description: Get a support-group by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/agents/support-groups/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/agents/support-groups/{id}` — PUT /api/system/agents/support-groups/:id
- Auth: Required
- Description: Update an existing support-group.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/agents/support-groups/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/agents/tier-members` — GET /api/system/agents/tier-members
- Auth: Required
- Description: List tier-members with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/agents/tier-members' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/agents/tier-members` — POST /api/system/agents/tier-members
- Auth: Required
- Description: Create a new tier-member.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/agents/tier-members' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/agents/tier-members/{id}` — DELETE /api/system/agents/tier-members/:id
- Auth: Required
- Description: Delete a tier-member.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/agents/tier-members/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/agents/tier-members/{id}` — GET /api/system/agents/tier-members/:id
- Auth: Required
- Description: Get a tier-member by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/agents/tier-members/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/agents/tier-members/{id}` — PUT /api/system/agents/tier-members/:id
- Auth: Required
- Description: Update an existing tier-member.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/agents/tier-members/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/agents/tiers` — GET /api/system/agents/tiers
- Auth: Required
- Description: List tiers with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — array<AgentTier>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/agents/tiers' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/agents/tiers` — POST /api/system/agents/tiers
- Auth: Required
- Description: Create a new tier.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — array<AgentTier>
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/agents/tiers' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/agents/tiers/{id}` — DELETE /api/system/agents/tiers/:id
- Auth: Required
- Description: Delete a tier.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — AgentTier
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/agents/tiers/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/agents/tiers/{id}` — GET /api/system/agents/tiers/:id
- Auth: Required
- Description: Get a tier by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — AgentTier
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/agents/tiers/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/agents/tiers/{id}` — PUT /api/system/agents/tiers/:id
- Auth: Required
- Description: Update an existing tier.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — AgentTier
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/agents/tiers/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## system/audit

- `GET` `/api/system/audit` — List audit events
- Auth: Required
- Description: List audit events.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer
  - `pageSize` in `query`: integer
  - `q` in `query`: string
  - `actor_user_id` in `query`: string
  - `entity` in `query`: string
  - `entity_id` in `query`: string
  - `action` in `query`: string
  - `from` in `query`: string (date-time)
  - `to` in `query`: string (date-time)
- Success: HTTP 200 — array<AuditEvent>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/audit' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/audit/{id}` — GET /api/system/audit/:id
- Auth: Required
- Description: Get a audit by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — AuditEvent
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/audit/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

## system/files

- `GET` `/api/system/files` — List files
- Auth: Required
- Description: List system files.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer
  - `pageSize` in `query`: integer
  - `q` in `query`: string — Search file_name contains
  - `ticket_id` in `query`: string
  - `file_type` in `query`: string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/files' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/files` — POST /api/system/files
- Auth: Required
- Description: Create a new file.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/files' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/files/{id}` — DELETE /api/system/files/:id
- Auth: Required
- Description: Delete a file.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/files/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/files/{id}` — GET /api/system/files/:id
- Auth: Required
- Description: Get a file by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/files/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/files/{id}` — PUT /api/system/files/:id
- Auth: Required
- Description: Update an existing file.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/files/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## system/inbox

- `GET` `/api/system/inbox/emails` — List inbox emails
- Auth: Required
- Description: List inbox emails ingested by the system.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer
  - `pageSize` in `query`: integer
  - `q` in `query`: string
  - `processing_status` in `query`: string
  - `from_email` in `query`: string (email)
  - `created_ticket_id` in `query`: string
  - `from` in `query`: string (date-time)
  - `to` in `query`: string (date-time)
- Success: HTTP 200 — array<InboxEmail>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/inbox/emails' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/inbox/emails` — POST /api/system/inbox/emails
- Auth: Required
- Description: Create a new email.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — array<InboxEmail>
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/inbox/emails' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/inbox/emails/{id}` — DELETE /api/system/inbox/emails/:id
- Auth: Required
- Description: Delete a email.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — InboxEmail
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/inbox/emails/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/inbox/emails/{id}` — GET /api/system/inbox/emails/:id
- Auth: Required
- Description: Get a email by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — InboxEmail
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/inbox/emails/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/inbox/emails/{id}` — PUT /api/system/inbox/emails/:id
- Auth: Required
- Description: Update an existing email.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — InboxEmail
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/inbox/emails/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/system/inbox/emails/{id}/fail` — POST /api/system/inbox/emails/:id/fail
- Auth: Required
- Description: Operation on fail.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — InboxEmail
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/inbox/emails/:id/fail' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/system/inbox/emails/{id}/process` — POST /api/system/inbox/emails/:id/process
- Auth: Required
- Description: Operation on process.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — InboxEmail
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/inbox/emails/:id/process' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/system/inbox/emails/{id}/retry` — POST /api/system/inbox/emails/:id/retry
- Auth: Required
- Description: Operation on retry.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — InboxEmail
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/inbox/emails/:id/retry' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## system/lookups

- `GET` `/api/system/lookups/issue-categories` — GET /api/system/lookups/issue-categories
- Auth: Public
- Description: List issue-categories with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/issue-categories' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/lookups/issue-categories` — POST /api/system/lookups/issue-categories
- Auth: Public
- Description: Create a new issue-categorie.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/lookups/issue-categories' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/lookups/issue-categories/{id}` — DELETE /api/system/lookups/issue-categories/:id
- Auth: Public
- Description: Delete a issue-categorie.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/lookups/issue-categories/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/lookups/issue-categories/{id}` — GET /api/system/lookups/issue-categories/:id
- Auth: Public
- Description: Get a issue-categorie by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/issue-categories/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/lookups/issue-categories/{id}` — PUT /api/system/lookups/issue-categories/:id
- Auth: Public
- Description: Update an existing issue-categorie.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/lookups/issue-categories/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/lookups/priorities` — GET /api/system/lookups/priorities
- Auth: Public
- Description: List priorities with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/priorities' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/lookups/priorities` — POST /api/system/lookups/priorities
- Auth: Public
- Description: Create a new prioritie.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/lookups/priorities' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/lookups/priorities/{id}` — DELETE /api/system/lookups/priorities/:id
- Auth: Public
- Description: Delete a prioritie.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/lookups/priorities/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/lookups/priorities/{id}` — GET /api/system/lookups/priorities/:id
- Auth: Public
- Description: Get a prioritie by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/priorities/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/lookups/priorities/{id}` — PUT /api/system/lookups/priorities/:id
- Auth: Public
- Description: Update an existing prioritie.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/lookups/priorities/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/lookups/severities` — GET /api/system/lookups/severities
- Auth: Public
- Description: List severities with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/severities' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/lookups/severities` — POST /api/system/lookups/severities
- Auth: Public
- Description: Create a new severitie.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/lookups/severities' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/lookups/severities/{id}` — DELETE /api/system/lookups/severities/:id
- Auth: Public
- Description: Delete a severitie.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/lookups/severities/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/lookups/severities/{id}` — GET /api/system/lookups/severities/:id
- Auth: Public
- Description: Get a severitie by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/severities/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/lookups/severities/{id}` — PUT /api/system/lookups/severities/:id
- Auth: Public
- Description: Update an existing severitie.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/lookups/severities/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/lookups/sources` — GET /api/system/lookups/sources
- Auth: Public
- Description: List sources with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/sources' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/lookups/sources` — POST /api/system/lookups/sources
- Auth: Public
- Description: Create a new source.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/lookups/sources' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/lookups/sources/{id}` — DELETE /api/system/lookups/sources/:id
- Auth: Public
- Description: Delete a source.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/lookups/sources/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/lookups/sources/{id}` — GET /api/system/lookups/sources/:id
- Auth: Public
- Description: Get a source by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/sources/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/lookups/sources/{id}` — PUT /api/system/lookups/sources/:id
- Auth: Public
- Description: Update an existing source.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/lookups/sources/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/lookups/statuses` — GET /api/system/lookups/statuses
- Auth: Public
- Description: List statuses with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/statuses' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/lookups/statuses` — POST /api/system/lookups/statuses
- Auth: Public
- Description: Create a new statuse.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/lookups/statuses' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/lookups/statuses/{id}` — DELETE /api/system/lookups/statuses/:id
- Auth: Public
- Description: Delete a statuse.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/lookups/statuses/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/lookups/statuses/{id}` — GET /api/system/lookups/statuses/:id
- Auth: Public
- Description: Get a statuse by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/statuses/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/lookups/statuses/{id}` — PUT /api/system/lookups/statuses/:id
- Auth: Public
- Description: Update an existing statuse.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/lookups/statuses/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/lookups/support-groups` — GET /api/system/lookups/support-groups
- Auth: Public
- Description: List support-groups with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/support-groups' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/lookups/support-groups` — POST /api/system/lookups/support-groups
- Auth: Public
- Description: Create a new support-group.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/lookups/support-groups' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/lookups/support-groups/{id}` — DELETE /api/system/lookups/support-groups/:id
- Auth: Public
- Description: Delete a support-group.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/lookups/support-groups/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/lookups/support-groups/{id}` — GET /api/system/lookups/support-groups/:id
- Auth: Public
- Description: Get a support-group by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/support-groups/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/lookups/support-groups/{id}` — PUT /api/system/lookups/support-groups/:id
- Auth: Public
- Description: Update an existing support-group.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/lookups/support-groups/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/lookups/support-tiers` — GET /api/system/lookups/support-tiers
- Auth: Public
- Description: List support-tiers with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/support-tiers' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/lookups/support-tiers` — POST /api/system/lookups/support-tiers
- Auth: Public
- Description: Create a new support-tier.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/lookups/support-tiers' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/lookups/support-tiers/{id}` — DELETE /api/system/lookups/support-tiers/:id
- Auth: Public
- Description: Delete a support-tier.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/lookups/support-tiers/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/lookups/support-tiers/{id}` — GET /api/system/lookups/support-tiers/:id
- Auth: Public
- Description: Get a support-tier by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/support-tiers/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/lookups/support-tiers/{id}` — PUT /api/system/lookups/support-tiers/:id
- Auth: Public
- Description: Update an existing support-tier.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/lookups/support-tiers/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/lookups/system-category` — GET /api/system/lookups/system-category
- Auth: Public
- Description: List system-category with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/system-category' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/lookups/system-category` — POST /api/system/lookups/system-category
- Auth: Public
- Description: Create a new system-category.
- Request body: SystemCategory
  - Properties:
  - `id`: string
  - `name`: string
- Success: HTTP 201 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/lookups/system-category' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/lookups/system-category/{id}` — DELETE /api/system/lookups/system-category/:id
- Auth: Public
- Description: Delete a system-category.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/lookups/system-category/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/lookups/system-category/{id}` — GET /api/system/lookups/system-category/:id
- Auth: Public
- Description: Get a system-category by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/system-category/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/lookups/system-category/{id}` — PUT /api/system/lookups/system-category/:id
- Auth: Public
- Description: Update an existing system-category.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: SystemCategory
  - Properties:
  - `id`: string
  - `name`: string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/lookups/system-category/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/lookups/system-modules` — GET /api/system/lookups/system-modules
- Auth: Public
- Description: List system-modules with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/system-modules' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/lookups/system-modules` — POST /api/system/lookups/system-modules
- Auth: Public
- Description: Create a new system-module.
- Request body: SystemModule
  - Properties:
  - `id`: string
  - `system_id`: string
  - `name`: string
  - `code`: string
- Success: HTTP 201 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/lookups/system-modules' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/lookups/system-modules/{id}` — DELETE /api/system/lookups/system-modules/:id
- Auth: Public
- Description: Delete a system-module.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/lookups/system-modules/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/lookups/system-modules/{id}` — GET /api/system/lookups/system-modules/:id
- Auth: Public
- Description: Get a system-module by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/system-modules/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/lookups/system-modules/{id}` — PUT /api/system/lookups/system-modules/:id
- Auth: Public
- Description: Update an existing system-module.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: SystemModule
  - Properties:
  - `id`: string
  - `system_id`: string
  - `name`: string
  - `code`: string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/lookups/system-modules/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/lookups/systems` — GET /api/system/lookups/systems
- Auth: Public
- Description: List systems with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/systems' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/lookups/systems` — POST /api/system/lookups/systems
- Auth: Public
- Description: Create a new system.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/lookups/systems' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/lookups/systems/{id}` — DELETE /api/system/lookups/systems/:id
- Auth: Public
- Description: Delete a system.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/lookups/systems/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/lookups/systems/{id}` — GET /api/system/lookups/systems/:id
- Auth: Public
- Description: Get a system by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/systems/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/lookups/systems/{id}` — PUT /api/system/lookups/systems/:id
- Auth: Public
- Description: Update an existing system.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/lookups/systems/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/lookups/video-categories` — GET /api/system/lookups/video-categories
- Auth: Public
- Description: List video-categories with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/video-categories' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/lookups/video-categories` — POST /api/system/lookups/video-categories
- Auth: Public
- Description: Create a new video-categorie.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/lookups/video-categories' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/lookups/video-categories/{id}` — DELETE /api/system/lookups/video-categories/:id
- Auth: Public
- Description: Delete a video-categorie.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/lookups/video-categories/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/lookups/video-categories/{id}` — GET /api/system/lookups/video-categories/:id
- Auth: Public
- Description: Get a video-categorie by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/video-categories/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/lookups/video-categories/{id}` — PUT /api/system/lookups/video-categories/:id
- Auth: Public
- Description: Update an existing video-categorie.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/lookups/video-categories/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## system/roles

- `GET` `/api/system/roles` — List roles
- Auth: Required
- Description: List roles.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search name/description
- Success: HTTP 200 — array<Role>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/roles' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/roles` — Create role
- Auth: Required
- Description: Create a role.
- Request body: Role
  - Required fields: `id`, `name`
  - Properties:
  - `id`: string (required)
  - `name`: string (required)
  - `description`: string
  - `permissions`: array<string>
- Success: HTTP 201 — array<Role>
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/roles' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/roles/{id}` — DELETE /api/system/roles/:id
- Auth: Required
- Description: Delete a role.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — Role
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/roles/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/roles/{id}` — GET /api/system/roles/:id
- Auth: Required
- Description: Get a role by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — Role
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/roles/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/roles/{id}` — PUT /api/system/roles/:id
- Auth: Required
- Description: Update an existing role.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: Role
  - Required fields: `id`, `name`
  - Properties:
  - `id`: string (required)
  - `name`: string (required)
  - `description`: string
  - `permissions`: array<string>
- Success: HTTP 200 — Role
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/roles/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/roles/{id}/permissions` — GET /api/system/roles/:id/permissions
- Auth: Required
- Description: Get a permission by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — Role
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/roles/:id/permissions' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/roles/{id}/permissions` — POST /api/system/roles/:id/permissions
- Auth: Required
- Description: Operation on permissions.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: Role
  - Required fields: `id`, `name`
  - Properties:
  - `id`: string (required)
  - `name`: string (required)
  - `description`: string
  - `permissions`: array<string>
- Success: HTTP 201 — Role
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/roles/:id/permissions' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/roles/{id}/permissions/{permission_name}` — DELETE /api/system/roles/:id/permissions/:permission_name
- Auth: Required
- Description: Delete a permission.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `permission_name` in `path`: string (required) — Path parameter: permission_name
- Success: HTTP 200 — Role
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/roles/:id/permissions/:permission_name' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/roles/permissions/catalog` — GET /api/system/roles/permissions/catalog
- Auth: Required
- Description: List catalog with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — array<Role>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/roles/permissions/catalog' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

## system/settings

- `GET` `/api/system/settings/auth-methods` — GET /api/system/settings/auth-methods
- Auth: Required
- Description: List auth-methods with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — array<SettingKV>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/settings/auth-methods' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/settings/auth-methods` — PUT /api/system/settings/auth-methods
- Auth: Required
- Description: Operation on auth-methods.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — array<SettingKV>
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/settings/auth-methods' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/settings/branding` — GET /api/system/settings/branding
- Auth: Required
- Description: List branding with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — array<SettingKV>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/settings/branding' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/settings/branding` — PUT /api/system/settings/branding
- Auth: Required
- Description: Operation on branding.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — array<SettingKV>
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/settings/branding' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/settings/email-templates` — GET /api/system/settings/email-templates
- Auth: Required
- Description: List email-templates with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — array<SettingKV>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/settings/email-templates' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/settings/email-templates` — PUT /api/system/settings/email-templates
- Auth: Required
- Description: Operation on email-templates.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — array<SettingKV>
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/settings/email-templates' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/settings/general` — GET /api/system/settings/general
- Auth: Required
- Description: List general with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — array<SettingKV>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/settings/general' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/settings/general` — PUT /api/system/settings/general
- Auth: Required
- Description: Operation on general.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — array<SettingKV>
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/settings/general' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/settings/notifications` — GET /api/system/settings/notifications
- Auth: Required
- Description: List notifications with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — array<SettingKV>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/settings/notifications' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/settings/notifications` — PUT /api/system/settings/notifications
- Auth: Required
- Description: Operation on notifications.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — array<SettingKV>
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/settings/notifications' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/settings/security` — GET /api/system/settings/security
- Auth: Required
- Description: List security with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — array<SettingKV>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/settings/security' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/settings/security` — PUT /api/system/settings/security
- Auth: Required
- Description: Operation on security.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — array<SettingKV>
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/settings/security' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/settings/security/api-keys` — GET /api/system/settings/security/api-keys
- Auth: Required
- Description: List api-keys with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — array<SettingKV>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/settings/security/api-keys' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/settings/security/api-keys` — POST /api/system/settings/security/api-keys
- Auth: Required
- Description: Create a new api-key.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — array<SettingKV>
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/settings/security/api-keys' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/settings/security/api-keys/{id}` — DELETE /api/system/settings/security/api-keys/:id
- Auth: Required
- Description: Delete a api-key.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — SettingKV
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/settings/security/api-keys/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/settings/security/api-keys/{id}` — GET /api/system/settings/security/api-keys/:id
- Auth: Required
- Description: Get a api-key by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — SettingKV
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/settings/security/api-keys/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/settings/security/api-keys/{id}` — PUT /api/system/settings/security/api-keys/:id
- Auth: Required
- Description: Update an existing api-key.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — SettingKV
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/settings/security/api-keys/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/system/settings/security/api-keys/{id}/activate` — POST /api/system/settings/security/api-keys/:id/activate
- Auth: Required
- Description: Operation on activate.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — SettingKV
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/settings/security/api-keys/:id/activate' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/system/settings/security/api-keys/{id}/deactivate` — POST /api/system/settings/security/api-keys/:id/deactivate
- Auth: Required
- Description: Operation on deactivate.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — SettingKV
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/settings/security/api-keys/:id/deactivate' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/system/settings/security/api-keys/{id}/rotate` — POST /api/system/settings/security/api-keys/:id/rotate
- Auth: Required
- Description: Operation on rotate.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — SettingKV
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/settings/security/api-keys/:id/rotate' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/settings/smtp` — GET /api/system/settings/smtp
- Auth: Required
- Description: List smtp with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — array<SettingKV>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/settings/smtp' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/settings/smtp` — PUT /api/system/settings/smtp
- Auth: Required
- Description: Operation on smtp.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — array<SettingKV>
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/settings/smtp' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/settings/sso` — GET /api/system/settings/sso
- Auth: Required
- Description: List sso with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — array<SettingKV>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/settings/sso' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/settings/sso` — PUT /api/system/settings/sso
- Auth: Required
- Description: Operation on sso.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — array<SettingKV>
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/settings/sso' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## system/users

- `GET` `/api/system/users` — List users
- Auth: Required
- Description: List users.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search email or full_name
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/users' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/users` — Create user
- Auth: Required
- Description: Create a user.
- Request body: User
  - Required fields: `id`, `email`
  - Properties:
  - `id`: string (required) — Internal user id
  - `email`: string (email) (required)
  - `full_name`: string
  - `is_active`: boolean
  - `created_at`: string (date-time)
  - `updated_at`: string (date-time)
  - `roles`: array<string>
- Success: HTTP 201 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/users' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/users/{id}` — DELETE /api/system/users/:id
- Auth: Required
- Description: Delete a user.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — User
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/users/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/users/{id}` — GET /api/system/users/:id
- Auth: Required
- Description: Get a user by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — User
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/users/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/users/{id}` — PUT /api/system/users/:id
- Auth: Required
- Description: Update an existing user.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: User
  - Required fields: `id`, `email`
  - Properties:
  - `id`: string (required) — Internal user id
  - `email`: string (email) (required)
  - `full_name`: string
  - `is_active`: boolean
  - `created_at`: string (date-time)
  - `updated_at`: string (date-time)
  - `roles`: array<string>
- Success: HTTP 200 — User
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/users/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/users/{id}/permissions` — GET /api/system/users/:id/permissions
- Auth: Required
- Description: Get a permission by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — User
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/users/:id/permissions' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/users/{id}/roles` — GET /api/system/users/:id/roles
- Auth: Required
- Description: Get a role by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — User
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/users/:id/roles' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/users/{id}/roles` — POST /api/system/users/:id/roles
- Auth: Required
- Description: Operation on roles.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: Role
  - Required fields: `id`, `name`
  - Properties:
  - `id`: string (required)
  - `name`: string (required)
  - `description`: string
  - `permissions`: array<string>
- Success: HTTP 201 — User
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/users/:id/roles' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/users/{id}/roles/{roleId}` — DELETE /api/system/users/:id/roles/:roleId
- Auth: Required
- Description: Delete a role.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `roleId` in `path`: string (required) — Path parameter: roleId
- Success: HTTP 200 — User
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/users/:id/roles/:roleId' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/users/{id}/support-groups` — GET /api/system/users/:id/support-groups
- Auth: Required
- Description: Get a support-group by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — User
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/users/:id/support-groups' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/users/{id}/support-groups` — POST /api/system/users/:id/support-groups
- Auth: Required
- Description: Operation on support-groups.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: User
  - Required fields: `id`, `email`
  - Properties:
  - `id`: string (required) — Internal user id
  - `email`: string (email) (required)
  - `full_name`: string
  - `is_active`: boolean
  - `created_at`: string (date-time)
  - `updated_at`: string (date-time)
  - `roles`: array<string>
- Success: HTTP 201 — User
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/users/:id/support-groups' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/users/{id}/support-groups/{groupId}` — DELETE /api/system/users/:id/support-groups/:groupId
- Auth: Required
- Description: Delete a support-group.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `groupId` in `path`: string (required) — Path parameter: groupId
- Success: HTTP 200 — User
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/users/:id/support-groups/:groupId' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/users/{id}/tiers` — GET /api/system/users/:id/tiers
- Auth: Required
- Description: Get a tier by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — User
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/users/:id/tiers' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/users/{id}/tiers` — POST /api/system/users/:id/tiers
- Auth: Required
- Description: Operation on tiers.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: User
  - Required fields: `id`, `email`
  - Properties:
  - `id`: string (required) — Internal user id
  - `email`: string (email) (required)
  - `full_name`: string
  - `is_active`: boolean
  - `created_at`: string (date-time)
  - `updated_at`: string (date-time)
  - `roles`: array<string>
- Success: HTTP 201 — User
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/users/:id/tiers' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/users/{id}/tiers/{tierId}` — DELETE /api/system/users/:id/tiers/:tierId
- Auth: Required
- Description: Delete a tier.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `tierId` in `path`: string (required) — Path parameter: tierId
- Success: HTTP 200 — User
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/users/:id/tiers/:tierId' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/users/permissions` — GET /api/system/users/permissions
- Auth: Required
- Description: List permissions with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/users/permissions' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

## system/workflows

- `GET` `/api/system/workflows/actions` — GET /api/system/workflows/actions
- Auth: Required
- Description: List actions with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — array<WorkflowRule>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/workflows/actions' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/workflows/conditions` — GET /api/system/workflows/conditions
- Auth: Required
- Description: List conditions with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — array<WorkflowRule>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/workflows/conditions' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/workflows/rules` — GET /api/system/workflows/rules
- Auth: Required
- Description: List rules with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — array<WorkflowRule>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/workflows/rules' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/workflows/rules` — POST /api/system/workflows/rules
- Auth: Required
- Description: Create a new rule.
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — array<WorkflowRule>
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/workflows/rules' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/workflows/rules/{id}` — DELETE /api/system/workflows/rules/:id
- Auth: Required
- Description: Delete a rule.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — WorkflowRule
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/workflows/rules/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/workflows/rules/{id}` — GET /api/system/workflows/rules/:id
- Auth: Required
- Description: Get a rule by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — WorkflowRule
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/workflows/rules/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/workflows/rules/{id}` — PUT /api/system/workflows/rules/:id
- Auth: Required
- Description: Update an existing rule.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 200 — WorkflowRule
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/workflows/rules/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/system/workflows/rules/{id}/disable` — POST /api/system/workflows/rules/:id/disable
- Auth: Required
- Description: Operation on disable.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — WorkflowRule
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/workflows/rules/:id/disable' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/system/workflows/rules/{id}/enable` — POST /api/system/workflows/rules/:id/enable
- Auth: Required
- Description: Operation on enable.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — WorkflowRule
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/workflows/rules/:id/enable' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/system/workflows/rules/{id}/test` — POST /api/system/workflows/rules/:id/test
- Auth: Required
- Description: Operation on test.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: System
  - Properties:
  - `id`: string
  - `category_id`: string
  - `name`: string
  - `code`: string
  - `description`: string
- Success: HTTP 201 — WorkflowRule
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/workflows/rules/:id/test' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## tickets

- `GET` `/api/tickets` — List tickets
- Auth: Required
- Description: List tickets with advanced filters and pagination.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `ticket_key` in `query`: string — Exact ticket key (e.g., HD-2025-0001)
  - `status_code` in `query`: string — Filter by status code (open, pending, closed, …)
  - `priority_code` in `query`: string — Filter by priority code (low, medium, high, …)
  - `severity_code` in `query`: string — Filter by severity code (minor, major, …)
  - `system_id` in `query`: string — UUID of system
  - `module_id` in `query`: string — UUID of system module
  - `category_id` in `query`: string — UUID of issue category
  - `assigned_agent_id` in `query`: string — UUID of assigned agent
  - `group_id` in `query`: integer — Support group id
  - `tier_id` in `query`: integer — Tier id
  - `unassigned` in `query`: string enum: true|false — Only tickets without assigned agent (true)
  - `reporter_email` in `query`: string (email) — Filter by reporter email
  - `created_from` in `query`: string (date-time) — Created at >= (ISO)
  - `created_to` in `query`: string (date-time) — Created at <= (ISO)
  - `sort` in `query`: string enum: created_at ASC|created_at DESC|updated_at ASC|updated_at DESC|ticket_key ASC|ticket_key DESC|priority_id ASC|priority_id DESC|severity_id ASC|severity_id DESC|status_id ASC|status_id DESC — Safe sort fields with direction
- Success: HTTP 200 — TicketList
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/tickets' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/tickets` — POST /api/tickets
- Auth: Required
- Description: Create a new ticket.
- Request body: object
  - Required fields: `title`, `description`
  - Properties:
  - `title`: string (required)
  - `description`: string (required)
  - `email`: string (email) — Alias for reporter_email (public)
  - `reporter_email`: string (email)
  - `full_name`: string
  - `phone_number`: string
  - `reporter_user_id`: string — Authenticated user id (server may infer)
  - `system_id`: string
  - `module_id`: string
  - `category_id`: string
  - `priority_id`: string
  - `severity_id`: string
  - `source_code`: string — Explicit source code/name; defaults to Self Service (public) or Agent Reporting (authenticated). Common values: agent_reporting, phone_call, email, verbal, social_media, community_of_practice.
- Success: HTTP 201 — TicketList
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## tickets/:id

- `DELETE` `/api/tickets/{id}` — DELETE /api/tickets/:id
- Auth: Required
- Description: Delete a ticket.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — Ticket
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/tickets/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/tickets/{id}` — GET /api/tickets/:id
- Auth: Required
- Description: Get a ticket by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — Ticket
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/tickets/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/tickets/{id}` — PUT /api/tickets/:id
- Auth: Required
- Description: Update an existing ticket.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: object
- Success: HTTP 200 — Ticket
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/tickets/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/tickets/{id}/assign` — Assign ticket
- Auth: Required
- Description: Assign a ticket to an agent by UUID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: object
  - Required fields: `assigned_agent_id`
  - Properties:
  - `assigned_agent_id`: string (required) — UUID of agent
- Success: HTTP 201 — Ticket
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/:id/assign' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/tickets/{id}/attachments` — List ticket attachments
- Auth: Required
- Description: List attachments for a ticket.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer
  - `pageSize` in `query`: integer
  - `file_type` in `query`: string
  - `q` in `query`: string — Search file_name contains
- Success: HTTP 200 — TicketAttachment
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/tickets/:id/attachments' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/tickets/{id}/attachments` — Create ticket attachment
- Auth: Required
- Description: Add an attachment record for a ticket.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: TicketAttachment
  - Required fields: `id`, `ticket_id`, `file_name`, `file_type`, `file_size_bytes`, `storage_path`
  - Properties:
  - `id`: string (required)
  - `ticket_id`: string (required)
  - `file_name`: string (required)
  - `file_type`: string (required)
  - `file_size_bytes`: integer (required)
  - `storage_path`: string (required)
  - `uploaded_by`: string
  - `uploaded_at`: string (date-time)
- Success: HTTP 201 — TicketAttachment
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/:id/attachments' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/tickets/{id}/attachments/{aid}` — DELETE /api/tickets/:id/attachments/:aid
- Auth: Required
- Description: Delete a attachment.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `aid` in `path`: string (required) — Path parameter: aid
- Success: HTTP 200 — TicketAttachment
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/tickets/:id/attachments/:aid' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/tickets/{id}/attachments/{aid}` — PUT /api/tickets/:id/attachments/:aid
- Auth: Required
- Description: Update an existing attachment.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `aid` in `path`: string (required) — Path parameter: aid
- Request body: TicketAttachment
  - Required fields: `id`, `ticket_id`, `file_name`, `file_type`, `file_size_bytes`, `storage_path`
  - Properties:
  - `id`: string (required)
  - `ticket_id`: string (required)
  - `file_name`: string (required)
  - `file_type`: string (required)
  - `file_size_bytes`: integer (required)
  - `storage_path`: string (required)
  - `uploaded_by`: string
  - `uploaded_at`: string (date-time)
- Success: HTTP 200 — TicketAttachment
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/tickets/:id/attachments/:aid' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/tickets/{id}/claim` — POST /api/tickets/:id/claim
- Auth: Required
- Description: Operation on claim.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: object
- Success: HTTP 201 — Ticket
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/:id/claim' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/tickets/{id}/close` — POST /api/tickets/:id/close
- Auth: Required
- Description: Operation on close.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: object
- Success: HTTP 201 — Ticket
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/:id/close' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/tickets/{id}/events` — List ticket events
- Auth: Required
- Description: List events for a ticket.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer
  - `pageSize` in `query`: integer
  - `event_type` in `query`: string
- Success: HTTP 200 — Ticket
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/tickets/:id/events' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/tickets/{id}/notes` — List ticket notes
- Auth: Required
- Description: List notes for a ticket.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer
  - `pageSize` in `query`: integer
  - `is_internal` in `query`: string enum: true|false — Filter internal vs public notes
  - `q` in `query`: string — Search body contains
- Success: HTTP 200 — TicketNote
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/tickets/:id/notes' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/tickets/{id}/notes` — Create ticket note
- Auth: Required
- Description: Add a note to a ticket.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: TicketNote
  - Required fields: `id`, `ticket_id`, `body`
  - Properties:
  - `id`: string (required)
  - `ticket_id`: string (required)
  - `user_id`: string
  - `body`: string (required)
  - `is_internal`: boolean
  - `created_at`: string (date-time)
- Success: HTTP 201 — TicketNote
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/:id/notes' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/tickets/{id}/notes/{nid}` — DELETE /api/tickets/:id/notes/:nid
- Auth: Required
- Description: Delete a note.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `nid` in `path`: string (required) — Path parameter: nid
- Success: HTTP 200 — TicketNote
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/tickets/:id/notes/:nid' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/tickets/{id}/notes/{nid}` — PUT /api/tickets/:id/notes/:nid
- Auth: Required
- Description: Update an existing note.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `nid` in `path`: string (required) — Path parameter: nid
- Request body: TicketNote
  - Required fields: `id`, `ticket_id`, `body`
  - Properties:
  - `id`: string (required)
  - `ticket_id`: string (required)
  - `user_id`: string
  - `body`: string (required)
  - `is_internal`: boolean
  - `created_at`: string (date-time)
- Success: HTTP 200 — TicketNote
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/tickets/:id/notes/:nid' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/tickets/{id}/priority` — Set ticket priority
- Auth: Required
- Description: Change the priority of a ticket by id or code.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: object
  - Properties:
  - `priority_id`: string
  - `priority_code`: string
- Success: HTTP 201 — Ticket
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/:id/priority' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/tickets/{id}/release` — POST /api/tickets/:id/release
- Auth: Required
- Description: Operation on release.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: object
- Success: HTTP 201 — Ticket
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/:id/release' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/tickets/{id}/reopen` — POST /api/tickets/:id/reopen
- Auth: Required
- Description: Operation on reopen.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: object
- Success: HTTP 201 — Ticket
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/:id/reopen' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/tickets/{id}/severity` — Set ticket severity
- Auth: Required
- Description: Change the severity of a ticket by id or code.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: object
  - Properties:
  - `severity_id`: string
  - `severity_code`: string
- Success: HTTP 201 — Ticket
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/:id/severity' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/tickets/{id}/status` — Set ticket status
- Auth: Required
- Description: Change the status of a ticket by id or code.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: object
  - Properties:
  - `status_id`: string
  - `status_code`: string
- Success: HTTP 201 — Ticket
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/:id/status' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/tickets/{id}/unclaim` — POST /api/tickets/:id/unclaim
- Auth: Required
- Description: Operation on unclaim.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: object
- Success: HTTP 201 — Ticket
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/:id/unclaim' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/tickets/{id}/watchers` — List ticket watchers
- Auth: Required
- Description: List ticket watchers for a ticket.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer
  - `pageSize` in `query`: integer
  - `notify` in `query`: string enum: true|false
- Success: HTTP 200 — TicketWatcher
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/tickets/:id/watchers' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/tickets/{id}/watchers` — Create ticket watcher
- Auth: Required
- Description: Add a watcher to a ticket.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: TicketWatcher
  - Required fields: `id`, `ticket_id`
  - Properties:
  - `id`: string (required)
  - `ticket_id`: string (required)
  - `user_id`: string
  - `email`: string (email)
  - `notify`: boolean
- Success: HTTP 201 — TicketWatcher
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/:id/watchers' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/tickets/{id}/watchers/{wid}` — DELETE /api/tickets/:id/watchers/:wid
- Auth: Required
- Description: Delete a watcher.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `wid` in `path`: string (required) — Path parameter: wid
- Success: HTTP 200 — TicketWatcher
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/tickets/:id/watchers/:wid' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/tickets/{id}/watchers/{wid}` — PUT /api/tickets/:id/watchers/:wid
- Auth: Required
- Description: Update an existing watcher.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `wid` in `path`: string (required) — Path parameter: wid
- Request body: TicketWatcher
  - Required fields: `id`, `ticket_id`
  - Properties:
  - `id`: string (required)
  - `ticket_id`: string (required)
  - `user_id`: string
  - `email`: string (email)
  - `notify`: boolean
- Success: HTTP 200 — TicketWatcher
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/tickets/:id/watchers/:wid' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## tickets/attachments

- `GET` `/api/tickets/attachments` — List attachments
- Auth: Required
- Description: List attachments across tickets.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer
  - `pageSize` in `query`: integer
  - `q` in `query`: string
  - `ticket_id` in `query`: string
  - `uploaded_by` in `query`: string
  - `file_type` in `query`: string
  - `uploaded_from` in `query`: string (date-time)
  - `uploaded_to` in `query`: string (date-time)
- Success: HTTP 200 — array<TicketAttachment>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/tickets/attachments' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/tickets/attachments` — POST /api/tickets/attachments
- Auth: Required
- Description: Create a new attachment.
- Request body: TicketAttachment
  - Required fields: `id`, `ticket_id`, `file_name`, `file_type`, `file_size_bytes`, `storage_path`
  - Properties:
  - `id`: string (required)
  - `ticket_id`: string (required)
  - `file_name`: string (required)
  - `file_type`: string (required)
  - `file_size_bytes`: integer (required)
  - `storage_path`: string (required)
  - `uploaded_by`: string
  - `uploaded_at`: string (date-time)
- Success: HTTP 201 — array<TicketAttachment>
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/attachments' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/tickets/attachments/{id}` — Delete attachment
- Auth: Required
- Description: Delete a ticket attachment by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — TicketAttachment
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/tickets/attachments/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/tickets/attachments/{id}` — GET /api/tickets/attachments/:id
- Auth: Required
- Description: Get a attachment by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — TicketAttachment
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/tickets/attachments/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/tickets/attachments/{id}` — Update attachment
- Auth: Required
- Description: Update a ticket attachment by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: TicketAttachment
  - Required fields: `id`, `ticket_id`, `file_name`, `file_type`, `file_size_bytes`, `storage_path`
  - Properties:
  - `id`: string (required)
  - `ticket_id`: string (required)
  - `file_name`: string (required)
  - `file_type`: string (required)
  - `file_size_bytes`: integer (required)
  - `storage_path`: string (required)
  - `uploaded_by`: string
  - `uploaded_at`: string (date-time)
- Success: HTTP 200 — TicketAttachment
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/tickets/attachments/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## tickets/events

- `GET` `/api/tickets/events` — List ticket events
- Auth: Required
- Description: List ticket events across system.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer
  - `pageSize` in `query`: integer
  - `q` in `query`: string
  - `ticket_id` in `query`: string
  - `event_type` in `query`: string
  - `actor_user_id` in `query`: string
  - `occurred_from` in `query`: string (date-time)
  - `occurred_to` in `query`: string (date-time)
- Success: HTTP 200 — TicketList
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/tickets/events' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/tickets/events` — POST /api/tickets/events
- Auth: Required
- Description: Create a new event.
- Request body: object
- Success: HTTP 201 — TicketList
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/events' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/tickets/events/{id}` — DELETE /api/tickets/events/:id
- Auth: Required
- Description: Delete a event.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — Ticket
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/tickets/events/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/tickets/events/{id}` — GET /api/tickets/events/:id
- Auth: Required
- Description: Get a event by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — Ticket
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/tickets/events/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/tickets/events/{id}` — PUT /api/tickets/events/:id
- Auth: Required
- Description: Update an existing event.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: object
- Success: HTTP 200 — Ticket
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/tickets/events/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## tickets/notes

- `GET` `/api/tickets/notes` — List notes
- Auth: Required
- Description: List notes across tickets.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer
  - `pageSize` in `query`: integer
  - `q` in `query`: string
  - `ticket_id` in `query`: string
  - `user_id` in `query`: string
  - `is_internal` in `query`: string enum: true|false
  - `created_from` in `query`: string (date-time)
  - `created_to` in `query`: string (date-time)
- Success: HTTP 200 — array<TicketNote>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/tickets/notes' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/tickets/notes` — Create note
- Auth: Required
- Description: Create a note for a ticket.
- Request body: TicketNote
  - Required fields: `id`, `ticket_id`, `body`
  - Properties:
  - `id`: string (required)
  - `ticket_id`: string (required)
  - `user_id`: string
  - `body`: string (required)
  - `is_internal`: boolean
  - `created_at`: string (date-time)
- Success: HTTP 201 — array<TicketNote>
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/notes' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/tickets/notes/{id}` — Delete note
- Auth: Required
- Description: Delete a ticket note by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — TicketNote
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/tickets/notes/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/tickets/notes/{id}` — GET /api/tickets/notes/:id
- Auth: Required
- Description: Get a note by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — TicketNote
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/tickets/notes/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/tickets/notes/{id}` — Update note
- Auth: Required
- Description: Update a ticket note by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: TicketNote
  - Required fields: `id`, `ticket_id`, `body`
  - Properties:
  - `id`: string (required)
  - `ticket_id`: string (required)
  - `user_id`: string
  - `body`: string (required)
  - `is_internal`: boolean
  - `created_at`: string (date-time)
- Success: HTTP 200 — TicketNote
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/tickets/notes/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## tickets/watchers

- `GET` `/api/tickets/watchers` — List ticket watchers
- Auth: Required
- Description: List ticket watchers across system.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer
  - `pageSize` in `query`: integer
  - `q` in `query`: string — Search query string
  - `ticket_id` in `query`: string
  - `user_id` in `query`: string
  - `email` in `query`: string (email)
  - `notify` in `query`: string enum: true|false
- Success: HTTP 200 — array<TicketWatcher>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/tickets/watchers' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/tickets/watchers` — POST /api/tickets/watchers
- Auth: Required
- Description: Create a new watcher.
- Request body: TicketWatcher
  - Required fields: `id`, `ticket_id`
  - Properties:
  - `id`: string (required)
  - `ticket_id`: string (required)
  - `user_id`: string
  - `email`: string (email)
  - `notify`: boolean
- Success: HTTP 201 — array<TicketWatcher>
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/watchers' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/tickets/watchers/{id}` — Remove watcher
- Auth: Required
- Description: Remove a ticket watcher by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — TicketWatcher
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/tickets/watchers/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/tickets/watchers/{id}` — GET /api/tickets/watchers/:id
- Auth: Required
- Description: Get a watcher by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — TicketWatcher
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/tickets/watchers/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/tickets/watchers/{id}` — Update watcher
- Auth: Required
- Description: Update a ticket watcher by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: TicketWatcher
  - Required fields: `id`, `ticket_id`
  - Properties:
  - `id`: string (required)
  - `ticket_id`: string (required)
  - `user_id`: string
  - `email`: string (email)
  - `notify`: boolean
- Success: HTTP 200 — TicketWatcher
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/tickets/watchers/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/tickets/watchers/ticket/{ticketId}/email` — POST /api/tickets/watchers/ticket/:ticketId/email
- Auth: Required
- Description: Operation on email.
- Parameters:
  - `ticketId` in `path`: string (required) — Path parameter: ticketId
- Request body: TicketWatcher
  - Required fields: `id`, `ticket_id`
  - Properties:
  - `id`: string (required)
  - `ticket_id`: string (required)
  - `user_id`: string
  - `email`: string (email)
  - `notify`: boolean
- Success: HTTP 201 — array<TicketWatcher>
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/watchers/ticket/:ticketId/email' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## tokens/api-keys

- `GET` `/api/tokens/api-keys` — GET /api/tokens/api-keys
- Auth: Required
- Description: List api-keys with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — array<ApiKeyPublic>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/tokens/api-keys' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/tokens/api-keys` — POST /api/tokens/api-keys
- Auth: Required
- Description: Create a new api-key.
- Request body: object
  - Required fields: `name`
  - Properties:
  - `name`: string (required)
  - `scope`: string
  - `is_active`: boolean
  - `expires_at`: string (date-time)
- Success: HTTP 201 — array<ApiKeyPublic>
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tokens/api-keys' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/tokens/api-keys/{id}` — DELETE /api/tokens/api-keys/:id
- Auth: Required
- Description: Delete a api-key.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — ApiKeyPublic
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/tokens/api-keys/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/tokens/api-keys/{id}` — GET /api/tokens/api-keys/:id
- Auth: Required
- Description: Get a api-key by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — ApiKeyPublic
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/tokens/api-keys/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/tokens/api-keys/{id}` — PUT /api/tokens/api-keys/:id
- Auth: Required
- Description: Update an existing api-key.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: object
  - Required fields: `name`
  - Properties:
  - `name`: string (required)
  - `scope`: string
  - `is_active`: boolean
  - `expires_at`: string (date-time)
- Success: HTTP 200 — ApiKeyPublic
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/tokens/api-keys/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/tokens/api-keys/{id}/activate` — POST /api/tokens/api-keys/:id/activate
- Auth: Required
- Description: Operation on activate.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: object
  - Required fields: `name`
  - Properties:
  - `name`: string (required)
  - `scope`: string
  - `is_active`: boolean
  - `expires_at`: string (date-time)
- Success: HTTP 201 — ApiKeyPublic
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tokens/api-keys/:id/activate' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/tokens/api-keys/{id}/deactivate` — POST /api/tokens/api-keys/:id/deactivate
- Auth: Required
- Description: Operation on deactivate.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: object
  - Required fields: `name`
  - Properties:
  - `name`: string (required)
  - `scope`: string
  - `is_active`: boolean
  - `expires_at`: string (date-time)
- Success: HTTP 201 — ApiKeyPublic
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tokens/api-keys/:id/deactivate' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/tokens/api-keys/{id}/rotate` — POST /api/tokens/api-keys/:id/rotate
- Auth: Required
- Description: Operation on rotate.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: object
  - Required fields: `name`
  - Properties:
  - `name`: string (required)
  - `scope`: string
  - `is_active`: boolean
  - `expires_at`: string (date-time)
- Success: HTTP 201 — ApiKeyPublic
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tokens/api-keys/:id/rotate' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```


<!-- API_REFERENCE_END -->
