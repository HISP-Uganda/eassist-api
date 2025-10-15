# eAssist API — Production deployment

This section explains how to deploy the API on a single host using the unified controller script.

- bin/eassistctl.sh: unified deployment and service management (clone, deploy, start/stop/restart/status/logs, migrate/seed, optional systemd integration).

Defaults
- Branch/ref: origin/releases
- Install dir: /opt/eassist-api
- Port: 8080 (enforced)

Prerequisites
- Linux host with:
  - git, Node.js 18+ and npm
  - A running PostgreSQL or a DATABASE_URL that the host can reach
- A writable install directory (default /opt/eassist-api); if not, create it with sudo and chown to the deploy user.

Environment
- DATABASE_URL (required): PostgreSQL connection string used by the API (see src/db/pool.js).
- Optional build metadata set during deploy (auto-persisted to .env):
  - EASSIST_BUILD (string): build tag; if not provided, eassistctl generates deploy.<shortsha>.<timestamp>.
  - GIT_SHA (40-hex): full commit SHA used for git_sha in /api/info (auto-detected if not provided).
  - GITHUB_RUN_NUMBER (int): if present, /api/info.build becomes build.<run> unless EASSIST_BUILD is set.

Quick start (first-time install)
1) Create the target directory and grant ownership to your deploy user.
2) Run eassistctl to deploy from the releases ref, install dependencies, run migrations, and start on port 8080.

Examples
- Deploy (overlay mode, preserving/using an existing .env unless overridden):
  - ./bin/eassistctl.sh deploy --dir /opt/eassist-api --ref origin/releases --port 8080
  - To provide an env file: ./bin/eassistctl.sh deploy --dir /opt/eassist-api --env-file /path/to/.env
- Service control (nohup by default, or systemd if installed and configured):
  - ./bin/eassistctl.sh restart
  - ./bin/eassistctl.sh stop
  - ./bin/eassistctl.sh status
  - ./bin/eassistctl.sh logs
- Systemd (optional):
  - ./bin/eassistctl.sh systemd-install  # installs eassist-api.service and enables systemd management

What eassistctl deploy does
- Ensures .env exists (or uses --env-file) and upserts EASSIST_BUILD and GIT_SHA
- Checks out the requested ref (default origin/releases), overlaying code when no .git exists in DEST_DIR
- Installs dependencies (npm ci if package-lock.json exists; otherwise npm install)
- Runs migrations: migrate:prep (if present) then migrate/migrate:run
- Stops any user-owned processes on the configured port and enforces PORT in .env
- Starts the service via systemd if available (unless --nohup), else via nohup
- Waits for readiness (HTTP/TCP probe) and shows recent logs on failure

Health check
- After start, verify health and build info:
  - GET http://localhost:8080/api/info
  - Response includes build.version, build.git_sha, build.build, and ci_run_number.

Logs and troubleshooting
- Logs: ~/logs/eassist-api.log (or /tmp if $HOME/logs is not writable)
- Port in use: the controller ensures the port is free before starting; stop any conflicting services or change PORT
- DB issues: ensure DATABASE_URL in .env is correct and reachable; migrations run at deploy
- Rollback: deploy with a specific tag or commit ref to reset the working tree and restart

Security tips
- Use a dedicated non-root deploy user.
- Keep .env readable only by the deploy user.
- Use a reverse proxy (nginx) to expose 8080 and manage TLS.

---

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


## Bulk create (array request bodies)
Some endpoints accept either a single object or an array of objects. When you POST an array, the API creates all items in a single transaction and returns HTTP 201 with an array of created records.

Examples:

- Create multiple notes on a ticket:

```bash
curl -sS -X POST "http://localhost:8080/api/tickets/<ticket_id>/notes" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    { "body": "User called in; added more details.", "is_internal": false },
    { "body": "Escalated to Tier 2", "is_internal": true }
  ]'
```

- Add multiple attachments to a ticket:

```bash
curl -sS -X POST "http://localhost:8080/api/tickets/<ticket_id>/attachments" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    { "file_name": "error.png", "file_type": "image/png", "file_size_bytes": 102400, "storage_path": "/uploads/error.png" },
    { "file_name": "log.txt",   "file_type": "text/plain", "file_size_bytes": 2048,   "storage_path": "/uploads/log.txt" }
  ]'
```

- Add multiple watchers to a ticket:

```bash
curl -sS -X POST "http://localhost:8080/api/tickets/<ticket_id>/watchers" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    { "email": "user1@example.com", "notify": true },
    { "user_id": "<uuid-of-user>",   "notify": false }
  ]'
```

Notes:
- These endpoints also accept a single JSON object when you don’t need bulk.
- On validation errors, the API returns HTTP 400 with details; for bulk requests, all inserts occur within a transaction.

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
- [public/endpoints](#public-endpoints)
- [public/faqs](#public-faqs)
- [public/kb](#public-kb)
- [public/ping](#public-ping)
- [public/search](#public-search)
- [public/tickets](#public-tickets)
- [public/videos](#public-videos)
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
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/admin/me' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/admin/me` — PUT /api/admin/me
- Auth: Required
- Description: Operation on me.
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
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/admin/preferences' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/admin/preferences` — PUT /api/admin/preferences
- Auth: Required
- Description: Operation on preferences.
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
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/analytics/dashboards/by-category' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/analytics/dashboards/overview` — GET /api/analytics/dashboards/overview
- Auth: Required
- Description: List overview with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/auth/whoami' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

## public/endpoints

- `GET` `/api/public/endpoints` — GET /api/public/endpoints
- Auth: Public
- Description: List endpoints with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `page` in `query`: integer
  - `pageSize` in `query`: integer
  - `q` in `query`: string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `page` in `query`: integer
  - `pageSize` in `query`: integer
  - `q` in `query`: string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — KBArticle
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/public/kb/articles/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/public/kb/ratings/summary` — GET /api/public/kb/ratings/summary
- Auth: Public
- Description: List summary with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/public/ping' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

## public/search

- `GET` `/api/public/search` — GET /api/public/search
- Auth: Public
- Description: Unified public search across content.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — TicketList
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/public/tickets' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/public/tickets` — POST /api/public/tickets
- Auth: Public
- Description: Create a new ticket.
- Success: HTTP 200 — TicketList
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/public/tickets' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/public/tickets/lookup` — GET /api/public/tickets/lookup
- Auth: Public
- Description: List lookup with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — TicketList
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/public/tickets/lookup' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

## public/videos

- `GET` `/api/public/videos` — List public videos
- Auth: Public
- Description: List public videos.
- Parameters:
  - `page` in `query`: integer
  - `pageSize` in `query`: integer
  - `q` in `query`: string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
  - `category_id` in `query`: string — UUID
  - `system_category_id` in `query`: integer
- Success: HTTP 200 — array<Video>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/public/videos' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/public/videos/categories` — GET /api/public/videos/categories
- Auth: Public
- Description: List categories with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — array<Video>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/public/videos/categories' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

## system/audit

- `GET` `/api/system/audit` — GET /api/system/audit
- Auth: Required
- Description: List audit with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — AuditEvent
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/audit/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

## system/files

- `GET` `/api/system/files` — GET /api/system/files
- Auth: Required
- Description: List files with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
- Success: HTTP 200 — object
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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

- `GET` `/api/system/inbox/emails` — GET /api/system/inbox/emails
- Auth: Required
- Description: List emails with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
- Success: HTTP 200 — array<InboxEmail>
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
- Success: HTTP 200 — InboxEmail
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
- Success: HTTP 200 — InboxEmail
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
- Success: HTTP 200 — InboxEmail
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/inbox/emails/:id/retry' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## system/lookups

- `GET` `/api/system/lookups/issue-categories` — GET /api/system/lookups/issue-categories
- Auth: Public
- Description: List issue-categories with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/issue-categories' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/lookups/issue-categories` — POST /api/system/lookups/issue-categories
- Auth: Required
- Description: Create a new issue-categorie.
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
curl -s -X POST 'http://localhost:8080/api/system/lookups/issue-categories' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/lookups/issue-categories/{id}` — DELETE /api/system/lookups/issue-categories/:id
- Auth: Required
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/issue-categories/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/system/lookups/issue-categories/{id}` — PUT /api/system/lookups/issue-categories/:id
- Auth: Required
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
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/priorities' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/lookups/priorities` — POST /api/system/lookups/priorities
- Auth: Required
- Description: Create a new prioritie.
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
curl -s -X POST 'http://localhost:8080/api/system/lookups/priorities' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/lookups/priorities/{id}` — DELETE /api/system/lookups/priorities/:id
- Auth: Required
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/priorities/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/lookups/severities` — GET /api/system/lookups/severities
- Auth: Public
- Description: List severities with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/severities' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/lookups/severities` — POST /api/system/lookups/severities
- Auth: Required
- Description: Create a new severitie.
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
curl -s -X POST 'http://localhost:8080/api/system/lookups/severities' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/lookups/severities/{id}` — DELETE /api/system/lookups/severities/:id
- Auth: Required
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/severities/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/lookups/sources` — GET /api/system/lookups/sources
- Auth: Public
- Description: List sources with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/sources' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/lookups/sources` — POST /api/system/lookups/sources
- Auth: Required
- Description: Create a new source.
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
curl -s -X POST 'http://localhost:8080/api/system/lookups/sources' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/lookups/sources/{id}` — DELETE /api/system/lookups/sources/:id
- Auth: Required
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/sources/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/lookups/statuses` — GET /api/system/lookups/statuses
- Auth: Public
- Description: List statuses with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/statuses' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/lookups/statuses` — POST /api/system/lookups/statuses
- Auth: Required
- Description: Create a new statuse.
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
curl -s -X POST 'http://localhost:8080/api/system/lookups/statuses' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/lookups/statuses/{id}` — DELETE /api/system/lookups/statuses/:id
- Auth: Required
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/statuses/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/lookups/support-groups` — GET /api/system/lookups/support-groups
- Auth: Public
- Description: List support-groups with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/support-groups' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/lookups/support-groups` — POST /api/system/lookups/support-groups
- Auth: Required
- Description: Create a new support-group.
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
curl -s -X POST 'http://localhost:8080/api/system/lookups/support-groups' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/lookups/support-groups/{id}` — DELETE /api/system/lookups/support-groups/:id
- Auth: Required
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/support-groups/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/lookups/support-tiers` — GET /api/system/lookups/support-tiers
- Auth: Public
- Description: List support-tiers with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/support-tiers' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/lookups/support-tiers` — POST /api/system/lookups/support-tiers
- Auth: Required
- Description: Create a new support-tier.
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
curl -s -X POST 'http://localhost:8080/api/system/lookups/support-tiers' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/lookups/support-tiers/{id}` — DELETE /api/system/lookups/support-tiers/:id
- Auth: Required
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/support-tiers/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/lookups/system-category` — GET /api/system/lookups/system-category
- Auth: Public
- Description: List system-category with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/system-category' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/lookups/system-category` — POST /api/system/lookups/system-category
- Auth: Required
- Description: Create a new system-category.
- Request body: SystemCategory
  - Properties:
  - `id`: string
  - `name`: string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/lookups/system-category' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/lookups/system-category/{id}` — DELETE /api/system/lookups/system-category/:id
- Auth: Required
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/system-category/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/lookups/system-modules` — GET /api/system/lookups/system-modules
- Auth: Public
- Description: List system-modules with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/system-modules' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/lookups/system-modules` — POST /api/system/lookups/system-modules
- Auth: Required
- Description: Create a new system-module.
- Request body: SystemModule
  - Properties:
  - `id`: string
  - `system_id`: string
  - `name`: string
  - `code`: string
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/lookups/system-modules' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/lookups/system-modules/{id}` — DELETE /api/system/lookups/system-modules/:id
- Auth: Required
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/system-modules/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/lookups/systems` — GET /api/system/lookups/systems
- Auth: Public
- Description: List systems with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/systems' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/lookups/systems` — POST /api/system/lookups/systems
- Auth: Required
- Description: Create a new system.
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
curl -s -X POST 'http://localhost:8080/api/system/lookups/systems' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/lookups/systems/{id}` — DELETE /api/system/lookups/systems/:id
- Auth: Required
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/systems/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/lookups/video-categories` — GET /api/system/lookups/video-categories
- Auth: Public
- Description: List video-categories with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/video-categories' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/lookups/video-categories` — POST /api/system/lookups/video-categories
- Auth: Required
- Description: Create a new video-categorie.
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
curl -s -X POST 'http://localhost:8080/api/system/lookups/video-categories' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/system/lookups/video-categories/{id}` — DELETE /api/system/lookups/video-categories/:id
- Auth: Required
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/video-categories/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

