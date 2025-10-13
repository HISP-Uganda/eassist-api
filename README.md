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
