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
  - `q` in `query`: string
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
- `GET` `/api/public/search` — GET /api/public/search

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
- `GET` `/api/system/agents/groups` — GET /api/system/agents/groups

- Description: List groups with pagination and filtering.
- Auth: Required
- Description: Update an existing categorie.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: Video
- Success: HTTP 200 — array<AgentGroup>
  - Properties:
  - `id`: string (required)
  - `title`: string (required)
curl -s -X GET 'http://localhost:8080/api/system/agents/groups' -H 'Authorization: Bearer $ACCESS_TOKEN'
  - `category_id`: string
  - `system_category_id`: string
- `POST` `/api/system/agents/groups` — POST /api/system/agents/groups
  - `duration_seconds`: integer
- Description: Create a new group.
  - `is_published`: boolean
  - `created_at`: string (date-time)
- Success: HTTP 200 — Video
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/system/agents/groups/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
- Success: HTTP 201 — array<AgentGroup>

## public/endpoints

curl -s -X POST 'http://localhost:8080/api/system/agents/groups' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
- Auth: Public
- Description: List endpoints with pagination and filtering.
- `DELETE` `/api/system/agents/groups/{id}` — DELETE /api/system/agents/groups/:id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Description: Delete a group.
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — AgentGroup
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/agents/groups/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/agents/groups/{id}` — GET /api/system/agents/groups/:id

- Description: Get a group by ID.
- Auth: Public
- Description: List published FAQs.
- Parameters:
- Success: HTTP 200 — AgentGroup

```bash
curl -s -X GET 'http://localhost:8080/api/public/faqs/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
curl -s -X GET 'http://localhost:8080/api/system/agents/groups/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
- Success: HTTP 200 — array<FAQ>
- Example:
- `PUT` `/api/system/agents/groups/{id}` — PUT /api/system/agents/groups/:id
```bash
- Description: Update an existing group.
```

- `GET` `/api/public/faqs/{id}` — GET /api/public/faqs/:id
- Auth: Public
- Description: Get a faq by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — FAQ
- Success: HTTP 200 — AgentGroup

```bash
curl -s -X GET 'http://localhost:8080/api/public/faqs/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
curl -s -X PUT 'http://localhost:8080/api/system/agents/groups/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'

## public/kb
- `GET` `/api/system/agents/support-group-members` — GET /api/system/agents/support-group-members
- `GET` `/api/public/kb/articles` — List public KB articles
- Description: List support-group-members with pagination and filtering.
- Description: List published knowledge base articles.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer
  - `pageSize` in `query`: integer
  - `q` in `query`: string
- Success: HTTP 200 — array<KBArticle>
- Example:

curl -s -X GET 'http://localhost:8080/api/system/agents/support-group-members' -H 'Authorization: Bearer $ACCESS_TOKEN'
curl -s -X GET 'http://localhost:8080/api/public/kb/articles' -H 'Authorization: Bearer $ACCESS_TOKEN'
```
- `POST` `/api/system/agents/support-group-members` — POST /api/system/agents/support-group-members
- `GET` `/api/public/kb/articles/{id}` — GET /api/public/kb/articles/:id
- Description: Create a new support-group-member.
- Description: Get a article by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — KBArticle
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/public/kb/articles/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

curl -s -X POST 'http://localhost:8080/api/system/agents/support-group-members' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
- Auth: Public
- Description: List summary with pagination and filtering.
- `DELETE` `/api/system/agents/support-group-members/{id}` — DELETE /api/system/agents/support-group-members/:id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Description: Delete a support-group-member.
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — array<KBArticle>
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/agents/support-group-members/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/agents/support-group-members/{id}` — GET /api/system/agents/support-group-members/:id

- Description: Get a support-group-member by ID.
- Auth: Public
- Description: List ping with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
curl -s -X GET 'http://localhost:8080/api/system/agents/support-group-members/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
- Example:

- `PUT` `/api/system/agents/support-group-members/{id}` — PUT /api/system/agents/support-group-members/:id
curl -s -X GET 'http://localhost:8080/api/public/ping' -H 'Authorization: Bearer $ACCESS_TOKEN'
- Description: Update an existing support-group-member.

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
curl -s -X GET 'http://localhost:8080/api/public/search' -H 'Authorization: Bearer $ACCESS_TOKEN'
```bash
curl -s -X GET 'http://localhost:8080/api/system/agents/groups' -H 'Authorization: Bearer $ACCESS_TOKEN'
- `POST` `/api/system/agents/groups` — POST /api/system/agents/groups
- Auth: Required
- Description: Create a new group.
- Auth: Public
- Description: Delete a statuse.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — object
- Example:

- Success: HTTP 201 — array<AgentGroup>
```bash
curl -s -X GET 'http://localhost:8080/api/system/lookups/support-groups' -H 'Authorization: Bearer $ACCESS_TOKEN'
```
curl -s -X POST 'http://localhost:8080/api/system/agents/groups' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
- `POST` `/api/system/lookups/support-groups` — POST /api/system/lookups/support-groups
- Auth: Public
- `DELETE` `/api/system/agents/groups/{id}` — DELETE /api/system/agents/groups/:id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Description: Delete a group.
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — AgentGroup
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/agents/groups/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/agents/groups/{id}` — GET /api/system/agents/groups/:id

- Description: Get a group by ID.
- Auth: Public
- Description: List published FAQs.
- Parameters:
- Success: HTTP 200 — AgentGroup

```bash
curl -s -X GET 'http://localhost:8080/api/public/faqs/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
curl -s -X GET 'http://localhost:8080/api/system/agents/groups/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
- Success: HTTP 200 — array<FAQ>
- Example:
- `PUT` `/api/system/agents/groups/{id}` — PUT /api/system/agents/groups/:id
```bash
- Description: Update an existing group.
```

- `GET` `/api/public/faqs/{id}` — GET /api/public/faqs/:id
- Auth: Public
- Description: Get a faq by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — FAQ
- Success: HTTP 200 — AgentGroup

```bash
curl -s -X GET 'http://localhost:8080/api/public/faqs/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
curl -s -X PUT 'http://localhost:8080/api/system/agents/groups/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'

## public/kb
- `GET` `/api/system/agents/support-group-members` — GET /api/system/agents/support-group-members
- `GET` `/api/public/kb/articles` — List public KB articles
- Description: List support-group-members with pagination and filtering.
- Description: List published knowledge base articles.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer
  - `pageSize` in `query`: integer
  - `q` in `query`: string
- Success: HTTP 200 — array<KBArticle>
- Example:

curl -s -X GET 'http://localhost:8080/api/system/agents/support-group-members' -H 'Authorization: Bearer $ACCESS_TOKEN'
curl -s -X GET 'http://localhost:8080/api/public/kb/articles' -H 'Authorization: Bearer $ACCESS_TOKEN'
```
- `POST` `/api/system/agents/support-group-members` — POST /api/system/agents/support-group-members
- `GET` `/api/public/kb/articles/{id}` — GET /api/public/kb/articles/:id
- Description: Create a new support-group-member.
- Description: Get a article by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Success: HTTP 200 — KBArticle
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/public/kb/articles/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

curl -s -X POST 'http://localhost:8080/api/system/agents/support-group-members' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
- Auth: Public
- Description: List summary with pagination and filtering.
- `DELETE` `/api/system/agents/support-group-members/{id}` — DELETE /api/system/agents/support-group-members/:id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
- Description: Delete a support-group-member.
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
- Success: HTTP 200 — array<KBArticle>
- Example:

```bash
curl -s -X DELETE 'http://localhost:8080/api/system/agents/support-group-members/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/agents/support-group-members/{id}` — GET /api/system/agents/support-group-members/:id

- Description: Get a support-group-member by ID.
- Auth: Public
- Description: List ping with pagination and filtering.
- Parameters:
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
curl -s -X GET 'http://localhost:8080/api/system/agents/support-group-members/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
- Example:

- `PUT` `/api/system/agents/support-group-members/{id}` — PUT /api/system/agents/support-group-members/:id
curl -s -X GET 'http://localhost:8080/api/public/ping' -H 'Authorization: Bearer $ACCESS_TOKEN'
- Description: Update an existing support-group-member.

<!-- API_REFERENCE_START -->

# API Reference

Auto-generated OpenAPI specification from Express routes.

This section is generated from the OpenAPI spec (src/docs/openapi.json).

## Usage notes

- All GET endpoints return enriched, nested objects by default (related resources are joined for you).
- Shape the response with optional query params:
  - `fields`: comma-separated list of fields to include. Supports dot paths, e.g., `fields=ticket_key,title,reporter_user.email,status.name`.
  - `expand`: comma-separated nested relations to expand, e.g., `expand=assigned_agent,reporter_user,roles,roles.permissions`.
  - `select`: bracket syntax for advanced shaping, e.g., `select=tickets[id,title,reporter_user[id,email],assigned_agent[id,full_name],attachments[id,file_name]]`.
- Pagination params (where applicable): `page`, `pageSize`. Search filter: `q`.
- Write endpoints (POST/PUT) support nested bodies where documented (e.g., tickets.notes/attachments, users.roles/tier/support_groups, roles.permissions).

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
- Success: HTTP 200 — object
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
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/analytics/reports/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## auth/login

- `POST` `/api/auth/login` — POST /api/auth/login
- Auth: Public
- Description: Create a new login.
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/auth/login' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## auth/logout

- `POST` `/api/auth/logout` — POST /api/auth/logout
- Auth: Public
- Description: Create a new logout.
- Success: HTTP 200 — object
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
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/auth/refresh' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## auth/request-password-reset

- `POST` `/api/auth/request-password-reset` — POST /api/auth/request-password-reset
- Auth: Public
- Description: Create a new request-password-reset.
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/auth/request-password-reset' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## auth/reset-password

- `POST` `/api/auth/reset-password` — POST /api/auth/reset-password
- Auth: Public
- Description: Create a new reset-password.
- Success: HTTP 200 — object
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
- Description: List search with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
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

- `PUT` `/api/system/lookups/priorities/{id}` — PUT /api/system/lookups/priorities/:id
- Auth: Required
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

- `PUT` `/api/system/lookups/severities/{id}` — PUT /api/system/lookups/severities/:id
- Auth: Required
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

- `PUT` `/api/system/lookups/sources/{id}` — PUT /api/system/lookups/sources/:id
- Auth: Required
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

- `PUT` `/api/system/lookups/statuses/{id}` — PUT /api/system/lookups/statuses/:id
- Auth: Required
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

- `PUT` `/api/system/lookups/support-groups/{id}` — PUT /api/system/lookups/support-groups/:id
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
curl -s -X PUT 'http://localhost:8080/api/system/lookups/support-groups/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
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

- `PUT` `/api/system/lookups/support-tiers/{id}` — PUT /api/system/lookups/support-tiers/:id
- Auth: Required
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

- `PUT` `/api/system/lookups/system-category/{id}` — PUT /api/system/lookups/system-category/:id
- Auth: Required
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

- `PUT` `/api/system/lookups/system-modules/{id}` — PUT /api/system/lookups/system-modules/:id
- Auth: Required
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

- `PUT` `/api/system/lookups/systems/{id}` — PUT /api/system/lookups/systems/:id
- Auth: Required
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

- `PUT` `/api/system/lookups/video-categories/{id}` — PUT /api/system/lookups/video-categories/:id
- Auth: Required
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

- `GET` `/api/system/roles` — GET /api/system/roles
- Auth: Required
- Description: List roles with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — array<Role>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/roles' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/roles` — Create role (supports nested permissions)
- Auth: Required
- Description: Create a role. If a 'permissions' array of codes (or objects with code) is provided, permissions will be assigned atomically.
- Request body: object
  - Required fields: `name`
  - Properties:
  - `code`: string
  - `name`: string (required)
  - `description`: string
  - `permissions`: array<object> — Permission codes to grant. Items may be strings or objects with a 'code' property.
- Success: HTTP 200 — array<Role>
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
- Success: HTTP 200 — Role
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
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
- Success: HTTP 200 — array<SettingKV>
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
- Success: HTTP 200 — SettingKV
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
- Success: HTTP 200 — SettingKV
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
- Success: HTTP 200 — SettingKV
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/settings/security/api-keys/:id/rotate' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/system/settings/smtp` — GET /api/system/settings/smtp
- Auth: Required
- Description: List smtp with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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

- `GET` `/api/system/users` — GET /api/system/users
- Auth: Required
- Description: List users with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/users' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/system/users` — Create user (supports nested roles, single tier, support_groups)
- Auth: Required
- Description: Create a user. If 'roles', 'tiers', or 'support_groups' arrays are provided, they will be reconciled atomically. Users can belong to only one support tier; if tiers/support_groups are provided but no roles, the Agent role will be added automatically when available.
- Request body: object
  - Required fields: `email`
  - Properties:
  - `email`: string (email) (required)
  - `full_name`: string
  - `phone`: string
  - `password`: string — Plaintext password; hashed server-side
  - `is_active`: boolean
  - `roles`: array<object> — Roles to assign. Accepts role UUIDs, codes, names, or objects with id/code/name.
  - `tiers`: array<object> — Single support tier to add. Accepts numeric IDs, names, or objects with id/name.
  - `support_groups`: array<object> — Support groups to add. Accepts numeric IDs, names, or objects with id/name.
- Success: HTTP 200 — object
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/users' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{"email":"agent1@example.com","full_name":"Agent One","roles":["agent"],"tiers":[{"name":"Tier 1"}],"support_groups":[{"name":"Service Desk"}]}'
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `id`: string (uuid) (required) — Internal user id
  - `email`: string (email) (required)
  - `full_name`: string
  - `is_active`: boolean
  - `created_at`: string (date-time)
  - `updated_at`: string (date-time)
  - `roles`: array<Role> — Assigned roles; include permissions when expanded via 'expand=roles.permissions'
  - `tiers`: array<AgentTier> — User's support tier memberships (max 1).
  - `support_groups`: array<AgentGroup> — User's support group memberships.
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
- Success: HTTP 200 — User
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `id`: string (uuid) (required) — Internal user id
  - `email`: string (email) (required)
  - `full_name`: string
  - `is_active`: boolean
  - `created_at`: string (date-time)
  - `updated_at`: string (date-time)
  - `roles`: array<Role> — Assigned roles; include permissions when expanded via 'expand=roles.permissions'
  - `tiers`: array<AgentTier> — User's support tier memberships (max 1).
  - `support_groups`: array<AgentGroup> — User's support group memberships.
- Success: HTTP 200 — User
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `id`: string (uuid) (required) — Internal user id
  - `email`: string (email) (required)
  - `full_name`: string
  - `is_active`: boolean
  - `created_at`: string (date-time)
  - `updated_at`: string (date-time)
  - `roles`: array<Role> — Assigned roles; include permissions when expanded via 'expand=roles.permissions'
  - `tiers`: array<AgentTier> — User's support tier memberships (max 1).
  - `support_groups`: array<AgentGroup> — User's support group memberships.
- Success: HTTP 200 — User
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
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — array<WorkflowRule>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/workflows/actions' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/workflows/conditions` — GET /api/system/workflows/conditions
- Auth: Required
- Description: List conditions with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — array<WorkflowRule>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/system/workflows/conditions' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/system/workflows/rules` — GET /api/system/workflows/rules
- Auth: Required
- Description: List rules with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
- Success: HTTP 200 — array<WorkflowRule>
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
- Success: HTTP 200 — WorkflowRule
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
- Success: HTTP 200 — WorkflowRule
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
- Success: HTTP 200 — WorkflowRule
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/system/workflows/rules/:id/test' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## tickets

- `GET` `/api/tickets` — List tickets
- Auth: Required
- Description: List tickets with advanced filters and pagination.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
  - `ticket_key` in `query`: string — Exact ticket key (e.g., HD-2025-0001)
  - `status_code` in `query`: string — Filter by status code (open, pending, closed, …)
  - `priority_code` in `query`: string — Filter by priority code (low, medium, high, …)
  - `severity_code` in `query`: string — Filter by severity code (minor, major, …)
  - `system_id` in `query`: string — UUID of system
  - `module_id` in `query`: string — UUID of system module
  - `category_id` in `query`: string — UUID of issue category
  - `status_id` in `query`: string — UUID of status
  - `priority_id` in `query`: string — UUID of priority
  - `severity_id` in `query`: string — UUID of severity
  - `assigned_agent_id` in `query`: string — UUID of assigned agent
  - `group_id` in `query`: integer — Support group id
  - `tier_id` in `query`: integer — Tier id
  - `source_id` in `query`: integer — Source id
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

- `POST` `/api/tickets` — Create ticket (with related objects)
- Auth: Required
- Description: Create a ticket and optionally include related notes, attachments, and watchers in one request.
- Request body: object
  - Required fields: `title`, `description`
  - Properties:
  - `title`: string (required)
  - `description`: string (required)
  - `email`: string (email) — Alias for reporter_email
  - `reporter_email`: string (email)
  - `full_name`: string
  - `phone_number`: string
  - `reporter_user_id`: string
  - `system_id`: string
  - `module_id`: string
  - `category_id`: string
  - `priority_id`: string
  - `severity_id`: string
  - `status_id`: string
  - `group_id`: integer
  - `tier_id`: integer
  - `source_id`: integer
  - `source_code`: string
  - `notes`: array<object> — Optional notes to add to the ticket.
  - `attachments`: array<object> — Optional attachment records to add.
  - `watchers`: array<object> — Optional watchers to subscribe to updates.
- Success: HTTP 200 — TicketList
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
- Success: HTTP 200 — Ticket
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/tickets/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/tickets/{id}/assign` — POST /api/tickets/:id/assign
- Auth: Required
- Description: Operation on assign.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — Ticket
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/:id/assign' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/tickets/{id}/attachments` — GET /api/tickets/:id/attachments
- Auth: Required
- Description: Get a attachment by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — TicketAttachment
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/tickets/:id/attachments' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/tickets/{id}/attachments` — POST /api/tickets/:id/attachments
- Auth: Required
- Description: Operation on attachments.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: TicketAttachment
  - Properties:
  - `id`: string
  - `ticket_id`: string
  - `file_name`: string
  - `file_type`: string
  - `file_size_bytes`: integer
  - `storage_path`: string
  - `uploaded_by`: string
  - `uploaded_at`: string (date-time)
- Success: HTTP 200 — TicketAttachment
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
  - Properties:
  - `id`: string
  - `ticket_id`: string
  - `file_name`: string
  - `file_type`: string
  - `file_size_bytes`: integer
  - `storage_path`: string
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
- Success: HTTP 200 — Ticket
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/:id/claim' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/tickets/{id}/close` — POST /api/tickets/:id/close
- Auth: Required
- Description: Operation on close.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — Ticket
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/:id/close' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/tickets/{id}/events` — GET /api/tickets/:id/events
- Auth: Required
- Description: Get a event by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — Ticket
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/tickets/:id/events' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `GET` `/api/tickets/{id}/notes` — GET /api/tickets/:id/notes
- Auth: Required
- Description: Get a note by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — TicketNote
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/tickets/:id/notes' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/tickets/{id}/notes` — POST /api/tickets/:id/notes
- Auth: Required
- Description: Operation on notes.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: TicketNote
  - Properties:
  - `id`: string
  - `ticket_id`: string
  - `user_id`: string
  - `body`: string
  - `is_internal`: boolean
  - `created_at`: string (date-time)
- Success: HTTP 200 — TicketNote
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
  - Properties:
  - `id`: string
  - `ticket_id`: string
  - `user_id`: string
  - `body`: string
  - `is_internal`: boolean
  - `created_at`: string (date-time)
- Success: HTTP 200 — TicketNote
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/tickets/:id/notes/:nid' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/tickets/{id}/priority` — POST /api/tickets/:id/priority
- Auth: Required
- Description: Operation on priority.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — Ticket
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/:id/priority' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/tickets/{id}/release` — POST /api/tickets/:id/release
- Auth: Required
- Description: Operation on release.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — Ticket
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/:id/release' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/tickets/{id}/reopen` — POST /api/tickets/:id/reopen
- Auth: Required
- Description: Operation on reopen.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — Ticket
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/:id/reopen' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/tickets/{id}/severity` — POST /api/tickets/:id/severity
- Auth: Required
- Description: Operation on severity.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — Ticket
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/:id/severity' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/tickets/{id}/status` — POST /api/tickets/:id/status
- Auth: Required
- Description: Operation on status.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — Ticket
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/:id/status' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `POST` `/api/tickets/{id}/unclaim` — POST /api/tickets/:id/unclaim
- Auth: Required
- Description: Operation on unclaim.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Success: HTTP 200 — Ticket
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/:id/unclaim' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `GET` `/api/tickets/{id}/watchers` — GET /api/tickets/:id/watchers
- Auth: Required
- Description: Get a watcher by ID.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — TicketWatcher
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/tickets/:id/watchers' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/tickets/{id}/watchers` — POST /api/tickets/:id/watchers
- Auth: Required
- Description: Operation on watchers.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: TicketWatcher
  - Properties:
  - `id`: string
  - `ticket_id`: string
  - `user_id`: string
  - `email`: string (email)
  - `notify`: boolean
- Success: HTTP 200 — TicketWatcher
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/:id/watchers' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `PUT` `/api/tickets/{id}/watchers/{wid}` — PUT /api/tickets/:id/watchers/:wid
- Auth: Required
- Description: Update an existing watcher.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
  - `wid` in `path`: string (required) — Path parameter: wid
- Request body: TicketWatcher
  - Properties:
  - `id`: string
  - `ticket_id`: string
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
  - `page` in `query`: integer
  - `pageSize` in `query`: integer
  - `q` in `query`: string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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

- `POST` `/api/tickets/attachments` — Create attachments (array)
- Auth: Required
- Description: Create one or more attachments across tickets. Body must be an array of attachment objects.
- Request body: array<object>
  - Properties:
  - items: object
    - `ticket_id`: string (required)
    - `file_name`: string (required)
    - `file_type`: string (required)
    - `file_size_bytes`: integer (required)
    - `storage_path`: string (required)
    - `uploaded_by`: string
- Success: HTTP 200 — array<TicketAttachment>
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/attachments' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/tickets/attachments/{id}` — DELETE /api/tickets/attachments/:id
- Auth: Required
- Description: Delete a attachment.
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — TicketAttachment
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/tickets/attachments/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/tickets/attachments/{id}` — PUT /api/tickets/attachments/:id
- Auth: Required
- Description: Update an existing attachment.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: TicketAttachment
  - Properties:
  - `id`: string
  - `ticket_id`: string
  - `file_name`: string
  - `file_type`: string
  - `file_size_bytes`: integer
  - `storage_path`: string
  - `uploaded_by`: string
  - `uploaded_at`: string (date-time)
- Success: HTTP 200 — TicketAttachment
- Example:

```bash
curl -s -X PUT 'http://localhost:8080/api/tickets/attachments/:id' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## tickets/events

- `GET` `/api/tickets/events` — GET /api/tickets/events
- Auth: Required
- Description: List events with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — TicketList
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/tickets/events' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/tickets/events` — POST /api/tickets/events
- Auth: Required
- Description: Create a new event.
- Success: HTTP 200 — TicketList
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
  - `page` in `query`: integer
  - `pageSize` in `query`: integer
  - `q` in `query`: string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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

- `POST` `/api/tickets/notes` — Create notes (array)
- Auth: Required
- Description: Create one or more notes across tickets. Body must be an array of note objects.
- Request body: array<object>
  - Properties:
  - items: object
    - `ticket_id`: string (required)
    - `user_id`: string
    - `body`: string (required)
    - `is_internal`: boolean
- Success: HTTP 200 — array<TicketNote>
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/notes' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/tickets/notes/{id}` — DELETE /api/tickets/notes/:id
- Auth: Required
- Description: Delete a note.
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — TicketNote
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/tickets/notes/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/tickets/notes/{id}` — PUT /api/tickets/notes/:id
- Auth: Required
- Description: Update an existing note.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: TicketNote
  - Properties:
  - `id`: string
  - `ticket_id`: string
  - `user_id`: string
  - `body`: string
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
  - `page` in `query`: integer
  - `pageSize` in `query`: integer
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
  - `ticket_id` in `query`: string
  - `user_id` in `query`: string
  - `email` in `query`: string (email)
  - `notify` in `query`: string enum: true|false
- Success: HTTP 200 — array<TicketWatcher>
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/tickets/watchers' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `POST` `/api/tickets/watchers` — Create watchers (array)
- Auth: Required
- Description: Create one or more watchers across tickets. Body must be an array of watcher objects (each with ticket_id and either user_id or email).
- Request body: array<object>
  - Properties:
  - items: object
    - `ticket_id`: string
    - `user_id`: string
    - `email`: string (email)
    - `notify`: boolean
- Success: HTTP 200 — array<TicketWatcher>
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/watchers' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

- `DELETE` `/api/tickets/watchers/{id}` — DELETE /api/tickets/watchers/:id
- Auth: Required
- Description: Delete a watcher.
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
- Success: HTTP 200 — TicketWatcher
- Example:

```bash
curl -s -X GET 'http://localhost:8080/api/tickets/watchers/:id' -H 'Authorization: Bearer $ACCESS_TOKEN'
```

- `PUT` `/api/tickets/watchers/{id}` — PUT /api/tickets/watchers/:id
- Auth: Required
- Description: Update an existing watcher.
- Parameters:
  - `id` in `path`: string (required) — Path parameter: id
- Request body: TicketWatcher
  - Properties:
  - `id`: string
  - `ticket_id`: string
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
  - Properties:
  - `id`: string
  - `ticket_id`: string
  - `user_id`: string
  - `email`: string (email)
  - `notify`: boolean
- Success: HTTP 200 — array<TicketWatcher>
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tickets/watchers/ticket/:ticketId/email' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```

## tokens/api-keys

- `GET` `/api/tokens/api-keys` — GET /api/tokens/api-keys
- Auth: Required
- Description: List api-keys with pagination and filtering.
- Parameters:
  - `page` in `query`: integer — Page number (1-based)
  - `pageSize` in `query`: integer — Items per page (max 100)
  - `q` in `query`: string — Search query string
  - `fields` in `query`: string — Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
- Success: HTTP 200 — array<ApiKeyPublic>
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
  - `expand` in `query`: string — Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent').
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
- Success: HTTP 200 — ApiKeyPublic
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
- Success: HTTP 200 — ApiKeyPublic
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
- Success: HTTP 200 — ApiKeyPublic
- Example:

```bash
curl -s -X POST 'http://localhost:8080/api/tokens/api-keys/:id/rotate' -H 'Authorization: Bearer $ACCESS_TOKEN' -H 'Content-Type: application/json' -d '{}'
```


<!-- API_REFERENCE_END -->
