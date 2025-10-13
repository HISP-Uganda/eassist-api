import listEndpoints from "express-list-endpoints";

function expressToOpenApiPath(path) {
  return path.replace(/:(\w+)/g, "{$1}");
}

function extractPathParams(path) {
  const params = [];
  const re = /:([a-zA-Z0-9_]+)/g;
  let m;
  while ((m = re.exec(path))) {
    params.push(m[1]);
  }
  return params;
}

function tagFor(path) {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] !== "api") return "misc";
  const a = parts[1] || "misc";
  const b = parts[2] || "";
  return b ? `${a}/${b}` : a;
}

function opSummary(method, path) {
  const noun = method.toUpperCase();
  return `${noun} ${path}`;
}

// Small helpers for descriptions
function humanizeResource(parts) {
  // parts is array of path segments excluding empty
  const filtered = parts.filter((p) => p && !p.startsWith(":"));
  if (!filtered.length) return "resource";
  const last = filtered[filtered.length - 1];
  const singular = last.endsWith("s") ? last.slice(0, -1) : last;
  return { plural: last, singular };
}

function defaultDescription(method, rawPath) {
  const parts = rawPath.split("/").filter(Boolean);
  const res = humanizeResource(parts);
  const hasId = parts.some((p) => p.startsWith(":"));
  const methodL = method.toLowerCase();
  if (methodL === "get" && !hasId) return `List ${res.plural} with pagination and filtering.`;
  if (methodL === "get" && hasId) return `Get a ${res.singular} by ID.`;
  if (methodL === "post" && !hasId) return `Create a new ${res.singular}.`;
  if ((methodL === "put" || methodL === "patch") && hasId) return `Update an existing ${res.singular}.`;
  if (methodL === "delete" && hasId) return `Delete a ${res.singular}.`;
  return `Operation on ${res.plural}.`;
}

function authSecurity() {
  return [
    { bearerAuth: [] },
    { basicAuth: [] },
    { apiKeyAuth: [] },
    { cookieAuth: [] },
  ];
}

function isNoAuthPath(path, method = 'get') {
  const m = String(method || 'get').toLowerCase();
  if (path.startsWith("/api/public")) return true;
  if (path === "/api/info" || path === "/api/resources") return true;
  if (path === "/api/docs.json" || path.startsWith("/api/docs")) return true;
  // Lookups: only GET are public; writes require auth
  if (path.startsWith("/api/system/lookups")) return m === 'get';
  // Auth routes: explicitly list public ones; others require auth
  if (
    path === "/api/auth/login" ||
    path === "/api/auth/refresh" ||
    path === "/api/auth/logout" ||
    path === "/api/auth/request-password-reset" ||
    path === "/api/auth/reset-password"
  ) {
    return true;
  }
  if (path.startsWith("/api/auth/")) return false; // e.g., /api/auth/me, /api/auth/whoami
  return false;
}

function listQueryParams() {
  return [
    {
      name: "page",
      in: "query",
      required: false,
      schema: { type: "integer", minimum: 1 },
      description: "Page number (1-based)",
    },
    {
      name: "pageSize",
      in: "query",
      required: false,
      schema: { type: "integer", minimum: 1, maximum: 100 },
      description: "Items per page (max 100)",
    },
    {
      name: "q",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: "Search query string",
    },
  ];
}

function fieldsParam() {
  return {
    name: "fields",
    in: "query",
    required: false,
    schema: { type: "string" },
    description:
      "Comma-separated list of fields to include in the response. Supports dot paths into nested objects/arrays (e.g., 'ticket_key,title,reporter_user.email,attachments.file_name').",
  };
}

function expandParam() {
  return {
    name: "expand",
    in: "query",
    required: false,
    schema: { type: "string" },
    description:
      "Comma-separated list of nested relations to expand (e.g., 'roles,roles.permissions,assigned_agent')."
  };
}

// Utility: merge parameters arrays by unique key (name+in); prefer override entries
function mergeParams(base = [], override = []) {
  const key = (p) => `${p.in}:${p.name}`;
  const map = new Map();
  for (const p of base) map.set(key(p), p);
  for (const p of override) map.set(key(p), p); // override wins
  return Array.from(map.values());
}

// Manual overrides per path+method (add/merge params, requestBody)
const OVERRIDES = {
  // Tickets core list filters
  "/api/tickets": {
    get: {
      parameters: [
        { name: "ticket_key", in: "query", schema: { type: "string" }, description: "Exact ticket key (e.g., HD-2025-0001)" },
        { name: "status_code", in: "query", schema: { type: "string" }, description: "Filter by status code (open, pending, closed, …)" },
        { name: "priority_code", in: "query", schema: { type: "string" }, description: "Filter by priority code (low, medium, high, …)" },
        { name: "severity_code", in: "query", schema: { type: "string" }, description: "Filter by severity code (minor, major, …)" },
        { name: "system_id", in: "query", schema: { type: "string" }, description: "UUID of system" },
        { name: "module_id", in: "query", schema: { type: "string" }, description: "UUID of system module" },
        { name: "category_id", in: "query", schema: { type: "string" }, description: "UUID of issue category" },
        { name: "status_id", in: "query", schema: { type: "string" }, description: "UUID of status" },
        { name: "priority_id", in: "query", schema: { type: "string" }, description: "UUID of priority" },
        { name: "severity_id", in: "query", schema: { type: "string" }, description: "UUID of severity" },
        { name: "assigned_agent_id", in: "query", schema: { type: "string" }, description: "UUID of assigned agent" },
        { name: "group_id", in: "query", schema: { type: "integer" }, description: "Support group id" },
        { name: "tier_id", in: "query", schema: { type: "integer" }, description: "Tier id" },
        { name: "source_id", in: "query", schema: { type: "integer" }, description: "Source id" },
        { name: "unassigned", in: "query", schema: { type: "string", enum: ["true","false"] }, description: "Only tickets without assigned agent (true)" },
        { name: "reporter_email", in: "query", schema: { type: "string", format: "email" }, description: "Filter by reporter email" },
        { name: "created_from", in: "query", schema: { type: "string", format: "date-time" }, description: "Created at >= (ISO)" },
        { name: "created_to", in: "query", schema: { type: "string", format: "date-time" }, description: "Created at <= (ISO)" },
        { name: "sort", in: "query", schema: { type: "string", enum: ["created_at ASC","created_at DESC","updated_at ASC","updated_at DESC","ticket_key ASC","ticket_key DESC","priority_id ASC","priority_id DESC","severity_id ASC","severity_id DESC","status_id ASC","status_id DESC"] }, description: "Safe sort fields with direction" }
      ],
      description: "List tickets with advanced filters and pagination.",
      summary: "List tickets",
    },
    post: {
      summary: "Create ticket (with related objects)",
      description: "Create a ticket and optionally include related notes, attachments, and watchers in one request.",
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['title','description'],
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                email: { type: 'string', format: 'email', description: 'Alias for reporter_email' },
                reporter_email: { type: 'string', format: 'email' },
                full_name: { type: 'string' },
                phone_number: { type: 'string' },
                reporter_user_id: { type: 'string' },
                system_id: { type: 'string' },
                module_id: { type: 'string' },
                category_id: { type: 'string' },
                priority_id: { type: 'string' },
                severity_id: { type: 'string' },
                status_id: { type: 'string' },
                group_id: { type: 'integer' },
                tier_id: { type: 'integer' },
                source_id: { type: 'integer' },
                source_code: { type: 'string' },
                // Nested related objects
                notes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['body'],
                    properties: {
                      body: { type: 'string' },
                      is_internal: { type: 'boolean' },
                      user_id: { type: 'string', nullable: true }
                    }
                  },
                  description: 'Optional notes to add to the ticket.'
                },
                attachments: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['file_name','file_type','file_size_bytes','storage_path'],
                    properties: {
                      file_name: { type: 'string' },
                      file_type: { type: 'string' },
                      file_size_bytes: { type: 'integer' },
                      storage_path: { type: 'string' },
                      uploaded_by: { type: 'string', nullable: true }
                    }
                  },
                  description: 'Optional attachment records to add.'
                },
                watchers: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      user_id: { type: 'string', nullable: true },
                      email: { type: 'string', format: 'email', nullable: true },
                      notify: { type: 'boolean', default: true }
                    },
                    anyOf: [ { required: ['user_id'] }, { required: ['email'] } ]
                  },
                  description: 'Optional watchers to subscribe to updates.'
                }
              },
              additionalProperties: false
            },
            example: {
              title: 'Printer jam',
              description: 'Paper jam after 3 pages',
              reporter_email: 'user@domain.test',
              source_code: 'agent_reporting',
              notes: [ { body: 'Initial triage', is_internal: true } ],
              attachments: [ { file_name: 'error.jpg', file_type: 'image/jpeg', file_size_bytes: 12345, storage_path: '/store/x/y.jpg' } ],
              watchers: [ { email: 'watcher@domain.test' } ]
            }
          }
        }
      }
    }
  },
  // Ticket actions request bodies
  "/api/tickets/:id/assign": {
    post: {
      requestBody: {
        required: true,
        content: { "application/json": { schema: { type: "object", required: ["assigned_agent_id"], properties: { assigned_agent_id: { type: "string", description: "UUID of agent" } } } } }
      },
      description: "Assign a ticket to an agent by UUID.",
      summary: "Assign ticket",
    }
  },
  "/api/tickets/:id/status": {
    post: {
      requestBody: {
        required: true,
        content: { "application/json": { schema: { type: "object", properties: { status_id: { type: "string", nullable: true }, status_code: { type: "string", nullable: true } }, anyOf: [ { required: ["status_id"] }, { required: ["status_code"] } ] } } }
      },
      description: "Change the status of a ticket by id or code.",
      summary: "Set ticket status",
    }
  },
  "/api/tickets/:id/priority": {
    post: {
      requestBody: {
        required: true,
        content: { "application/json": { schema: { type: "object", properties: { priority_id: { type: "string", nullable: true }, priority_code: { type: "string", nullable: true } }, anyOf: [ { required: ["priority_id"] }, { required: ["priority_code"] } ] } } }
      },
      description: "Change the priority of a ticket by id or code.",
      summary: "Set ticket priority",
    }
  },
  "/api/tickets/:id/severity": {
    post: {
      requestBody: {
        required: true,
        content: { "application/json": { schema: { type: "object", properties: { severity_id: { type: "string", nullable: true }, severity_code: { type: "string", nullable: true } }, anyOf: [ { required: ["severity_id"] }, { required: ["severity_code"] } ] } } }
      },
      description: "Change the severity of a ticket by id or code.",
      summary: "Set ticket severity",
    }
  },
  // Ticket scoped lists include pagination/search filters
  "/api/tickets/:id/notes": {
    get: { parameters: [
      { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
      { name: "pageSize", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
      { name: "is_internal", in: "query", schema: { type: "string", enum: ["true","false"] }, description: "Filter internal vs public notes" },
      { name: "q", in: "query", schema: { type: "string" }, description: "Search body contains" }
    ], description: "List notes for a ticket.", summary: "List ticket notes" },
    post: {
      summary: "Add notes (array)",
      description: "Add one or more notes to the ticket. Body must be an array of note objects.",
      requestBody: { required: true, content: { "application/json": { schema: { type: "array", items: { type: "object", required: ["body"], properties: { body: { type: "string" }, is_internal: { type: "boolean" }, user_id: { type: "string", nullable: true } } } } , example: [ { body: "Initial triage", is_internal: true }, { body: "Customer updated" } ] } } }
    }
  },
  "/api/tickets/:id/attachments": {
    get: { parameters: [
      { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
      { name: "pageSize", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
      { name: "file_type", in: "query", schema: { type: "string" } },
      { name: "q", in: "query", schema: { type: "string" }, description: "Search file_name contains" }
    ], description: "List attachments for a ticket.", summary: "List ticket attachments" },
    post: {
      summary: "Add attachments (array)",
      description: "Add one or more attachments to the ticket. Body must be an array of attachment objects.",
      requestBody: { required: true, content: { "application/json": { schema: { type: "array", items: { type: "object", required: ["file_name","file_type","file_size_bytes","storage_path"], properties: { file_name: { type: "string" }, file_type: { type: "string" }, file_size_bytes: { type: "integer" }, storage_path: { type: "string" }, uploaded_by: { type: "string", nullable: true } } } } , example: [ { file_name: "log.txt", file_type: "text/plain", file_size_bytes: 1234, storage_path: "/store/log.txt" } ] } } }
    }
  },
  "/api/tickets/:id/watchers": {
    get: { parameters: [
      { name: "page", in: "query", schema: { type: "integer" } },
      { name: "pageSize", in: "query", schema: { type: "integer", maximum: 100 } },
      { name: "notify", in: "query", schema: { type: "string", enum: ["true","false"] } }
    ], description: "List ticket watchers for a ticket.", summary: "List ticket watchers" },
    post: {
      summary: "Add watchers (array)",
      description: "Add one or more watchers to the ticket. Body must be an array of watcher objects (each with user_id or email).",
      requestBody: { required: true, content: { "application/json": { schema: { type: "array", items: { type: "object", properties: { user_id: { type: "string", nullable: true }, email: { type: "string", format: "email", nullable: true }, notify: { type: "boolean", default: true } }, anyOf: [ { required: ["user_id"] }, { required: ["email"] } ] } } , example: [ { email: "watcher@domain.test", notify: true }, { user_id: "00000000-0000-0000-0000-000000000001" } ] } } }
    }
  },
  // Top-level tickets sub-resources filters
  "/api/tickets/notes": { get: { parameters: [
    { name: "page", in: "query", schema: { type: "integer" } },
    { name: "pageSize", in: "query", schema: { type: "integer" } },
    { name: "ticket_id", in: "query", schema: { type: "string" } },
    { name: "user_id", in: "query", schema: { type: "string" } },
    { name: "is_internal", in: "query", schema: { type: "string", enum: ["true","false"] } },
    { name: "q", in: "query", schema: { type: "string" } },
    { name: "created_from", in: "query", schema: { type: "string", format: "date-time" } },
    { name: "created_to", in: "query", schema: { type: "string", format: "date-time" } }
  ] , description: "List notes across tickets.", summary: "List notes" }, post: { summary: "Create notes (array)", description: "Create one or more notes across tickets. Body must be an array of note objects.", requestBody: { required: true, content: { "application/json": { schema: { type: "array", items: { type: "object", required: ["ticket_id","body"], properties: { ticket_id: { type: "string" }, user_id: { type: "string", nullable: true }, body: { type: "string" }, is_internal: { type: "boolean", default: false } } } } , example: [ { ticket_id: "00000000-0000-0000-0000-000000000123", body: "Note A" }, { ticket_id: "00000000-0000-0000-0000-000000000124", body: "Note B", is_internal: true } ] } } } } },
  "/api/tickets/attachments": { get: { parameters: [
    { name: "page", in: "query", schema: { type: "integer" } },
    { name: "pageSize", in: "query", schema: { type: "integer" } },
    { name: "ticket_id", in: "query", schema: { type: "string" } },
    { name: "uploaded_by", in: "query", schema: { type: "string" } },
    { name: "file_type", in: "query", schema: { type: "string" } },
    { name: "q", in: "query", schema: { type: "string" } },
    { name: "uploaded_from", in: "query", schema: { type: "string", format: "date-time" } },
    { name: "uploaded_to", in: "query", schema: { type: "string", format: "date-time" } }
  ] , description: "List attachments across tickets.", summary: "List attachments" }, post: { summary: "Create attachments (array)", description: "Create one or more attachments across tickets. Body must be an array of attachment objects.", requestBody: { required: true, content: { "application/json": { schema: { type: "array", items: { type: "object", required: ["ticket_id","file_name","file_type","file_size_bytes","storage_path"], properties: { ticket_id: { type: "string" }, file_name: { type: "string" }, file_type: { type: "string" }, file_size_bytes: { type: "integer" }, storage_path: { type: "string" }, uploaded_by: { type: "string", nullable: true } } } } , example: [ { ticket_id: "00000000-0000-0000-0000-000000000123", file_name: "a.txt", file_type: "text/plain", file_size_bytes: 100, storage_path: "/store/a.txt" } ] } } } } },
  "/api/tickets/watchers": { get: { parameters: [
    { name: "page", in: "query", schema: { type: "integer" } },
    { name: "pageSize", in: "query", schema: { type: "integer" } },
    { name: "ticket_id", in: "query", schema: { type: "string" } },
    { name: "user_id", in: "query", schema: { type: "string" } },
    { name: "email", in: "query", schema: { type: "string", format: "email" } },
    { name: "notify", in: "query", schema: { type: "string", enum: ["true","false"] } }
  ] , description: "List ticket watchers across system.", summary: "List ticket watchers" }, post: { summary: "Create watchers (array)", description: "Create one or more watchers across tickets. Body must be an array of watcher objects (each with ticket_id and either user_id or email).", requestBody: { required: true, content: { "application/json": { schema: { type: "array", items: { type: "object", properties: { ticket_id: { type: "string" }, user_id: { type: "string", nullable: true }, email: { type: "string", format: "email", nullable: true }, notify: { type: "boolean", default: true } , }, anyOf: [ { required: ["ticket_id","user_id"] }, { required: ["ticket_id","email"] } ] } } , example: [ { ticket_id: "00000000-0000-0000-0000-000000000123", email: "watch@domain.test" } ] } } } } },
  // New: ID endpoints for notes/attachments/watchers with PUT/DELETE specifics
  "/api/tickets/notes/:id": {
    put: {
      summary: "Update note",
      description: "Update a ticket note by ID.",
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TicketNote" } } } }
    },
    delete: {
      summary: "Delete note",
      description: "Delete a ticket note by ID."
    }
  },
  "/api/tickets/attachments/:id": {
    put: {
      summary: "Update attachment",
      description: "Update a ticket attachment by ID.",
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TicketAttachment" } } } }
    },
    delete: { summary: "Delete attachment", description: "Delete a ticket attachment by ID." }
  },
  "/api/tickets/watchers/:id": {
    put: {
      summary: "Update watcher",
      description: "Update a ticket watcher by ID.",
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TicketWatcher" } } } }
    },
    delete: { summary: "Remove watcher", description: "Remove a ticket watcher by ID." }
  },

  // Public endpoints filters and payloads
  "/api/public/faqs": { get: { parameters: [
    { name: "page", in: "query", schema: { type: "integer" } },
    { name: "pageSize", in: "query", schema: { type: "integer" } },
    { name: "q", in: "query", schema: { type: "string" } },
    { name: "system_category_id", in: "query", schema: { type: "string" } }
  ] , description: "List published FAQs.", summary: "List FAQs" } },
  "/api/public/kb/articles": { get: { parameters: [
    { name: "page", in: "query", schema: { type: "integer" } },
    { name: "pageSize", in: "query", schema: { type: "integer" } },
    { name: "q", in: "query", schema: { type: "string" } }
  ] , description: "List published knowledge base articles.", summary: "List public KB articles" } },
  "/api/public/videos": { get: { parameters: [
    { name: "page", in: "query", schema: { type: "integer" } },
    { name: "pageSize", in: "query", schema: { type: "integer" } },
    { name: "q", in: "query", schema: { type: "string" } },
    { name: "category_id", in: "query", schema: { type: "string" }, description: "UUID" },
    { name: "system_category_id", in: "query", schema: { type: "integer" } },
  ] , description: "List public videos.", summary: "List public videos" } },

  // System users: nested payloads (roles, tiers, support_groups)
  "/api/system/users": {
    post: {
      summary: "Create user (supports nested roles, single tier, support_groups)",
      description: "Create a user. If 'roles', 'tiers', or 'support_groups' arrays are provided, they will be reconciled atomically. Users can belong to only one support tier; if tiers/support_groups are provided but no roles, the Agent role will be added automatically when available.",
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email'],
              properties: {
                email: { type: 'string', format: 'email' },
                full_name: { type: 'string' },
                phone: { type: 'string' },
                password: { type: 'string', description: 'Plaintext password; hashed server-side' },
                is_active: { type: 'boolean' },
                roles: {
                  type: 'array',
                  description: "Roles to assign. Accepts role UUIDs, codes, names, or objects with id/code/name.",
                  items: { oneOf: [ { type: 'string' }, { type: 'object', properties: { id: { type: 'string' }, code: { type: 'string' }, name: { type: 'string' } } } ] }
                },
                tiers: {
                  type: 'array',
                  maxItems: 1,
                  description: "Single support tier to add. Accepts numeric IDs, names, or objects with id/name.",
                  items: { oneOf: [ { type: 'integer' }, { type: 'string' }, { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } } ] }
                },
                support_groups: {
                  type: 'array',
                  description: "Support groups to add. Accepts numeric IDs, names, or objects with id/name.",
                  items: { oneOf: [ { type: 'integer' }, { type: 'string' }, { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } } ] }
                }
              },
              additionalProperties: false
            },
            example: {
              email: 'new.agent@example.com',
              full_name: 'New Agent',
              is_active: true,
              roles: ['agent'],
              tiers: [ { name: 'Tier 1' } ],
              support_groups: [ { name: 'Service Desk' }, 2 ]
            }
          }
        }
      }
    }
  },
  "/api/system/users/:id": {
    put: {
      summary: "Update user (supports nested roles, single tier, support_groups)",
      description: "Update a user. If 'roles', 'tiers', or 'support_groups' arrays are provided, they will be reconciled (add/remove) atomically. Users can belong to only one support tier; if absent, the Agent role will be added automatically when available.",
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email' },
                full_name: { type: 'string' },
                phone: { type: 'string' },
                password: { type: 'string' },
                is_active: { type: 'boolean' },
                roles: {
                  type: 'array',
                  description: "Desired roles set. Accepts role UUIDs, codes, names, or objects with id/code/name.",
                  items: { oneOf: [ { type: 'string' }, { type: 'object', properties: { id: { type: 'string' }, code: { type: 'string' }, name: { type: 'string' } } } ] }
                },
                tiers: {
                  type: 'array',
                  maxItems: 1,
                  description: "Desired support tier (max 1). Accepts numeric IDs, names, or objects with id/name.",
                  items: { oneOf: [ { type: 'integer' }, { type: 'string' }, { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } } ] }
                },
                support_groups: {
                  type: 'array',
                  description: "Desired support groups set. Accepts numeric IDs, names, or objects with id/name.",
                  items: { oneOf: [ { type: 'integer' }, { type: 'string' }, { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } } ] }
                }
              },
              additionalProperties: false
            },
            example: {
              full_name: 'Agent Updated',
              roles: ['agent', 'kb_editor'],
              tiers: [1],
              support_groups: [1, { name: 'Escalations' }]
            }
          }
        }
      }
    }
  },
  // New: document array support for tiers/groups subresources on users
  "/api/system/users/:id/tiers": {
    post: {
      summary: "Set user tier (supports array)",
      description: "Set or replace the user's single support tier. Accepts either a single tier id/name or a 'tiers' array; when an array is provided, only the first element is used.",
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                tier_id: { type: 'integer', nullable: true },
                tier: { type: 'string', nullable: true },
                tier_name: { type: 'string', nullable: true },
                tiers: {
                  type: 'array', maxItems: 1,
                  items: { oneOf: [ { type: 'integer' }, { type: 'string' }, { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } } ] },
                  description: 'Array form; only the first item is used.'
                }
              },
              anyOf: [ { required: ['tier_id'] }, { required: ['tier'] }, { required: ['tier_name'] }, { required: ['tiers'] } ],
              additionalProperties: false
            },
            example: { tiers: [ { name: 'Tier 2' } ] }
          }
        }
      }
    }
  },
  "/api/system/users/:id/support-groups": {
    post: {
      summary: "Add user to support groups (supports array)",
      description: "Add the user to one or more support groups. Accepts a single group id/name or a 'support_groups' array.",
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                group_id: { type: 'integer', nullable: true },
                group: { type: 'string', nullable: true },
                group_name: { type: 'string', nullable: true },
                support_groups: {
                  type: 'array',
                  items: { oneOf: [ { type: 'integer' }, { type: 'string' }, { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } } ] },
                  description: 'Array of groups to add.'
                }
              },
              anyOf: [ { required: ['group_id'] }, { required: ['group'] }, { required: ['group_name'] }, { required: ['support_groups'] } ],
              additionalProperties: false
            },
            example: { support_groups: [ { name: 'Service Desk' }, 3 ] }
          }
        }
      }
    }
  },

  // System roles: nested permissions on create/update
  "/api/system/roles": {
    post: {
      summary: "Create role (supports nested permissions)",
      description: "Create a role. If a 'permissions' array of codes (or objects with code) is provided, permissions will be assigned atomically.",
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                code: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                permissions: {
                  type: 'array',
                  description: "Permission codes to grant. Items may be strings or objects with a 'code' property.",
                  items: { oneOf: [ { type: 'string' }, { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] } ] }
                }
              },
              additionalProperties: false
            }
          }
        }
      }
    }
  },
  "/api/system/roles/:id": {
    put: {
      summary: "Update role (supports nested permissions)",
      description: "Update a role. If a 'permissions' array is provided, the role's permissions will be reconciled (add/remove) atomically.",
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                permissions: {
                  type: 'array',
                  description: "Complete desired set of permission codes. Items may be strings or objects with 'code'.",
                  items: { oneOf: [ { type: 'string' }, { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] } ] }
                }
              },
              additionalProperties: false
            }
          }
        }
      }
    }
  },
};

// Merge override settings into an operation; supports parameters, requestBody, responses, summary, description, security
function mergeOverride(op, rawPath, method) {
  const entry = OVERRIDES[rawPath];
  if (!entry) return op;
  const o = entry[method];
  if (!o) return op;
  const next = { ...op };
  if (o.summary) next.summary = o.summary;
  if (o.description) next.description = o.description;
  if (o.security) next.security = o.security;
  if (Array.isArray(o.parameters)) {
    next.parameters = mergeParams(op.parameters || [], o.parameters);
  }
  if (o.requestBody) {
    next.requestBody = o.requestBody; // override wins entirely
  }
  if (o.responses) {
    next.responses = { ...(op.responses || {}), ...o.responses };
  }
  return next;
}

// Build example curl commands for success responses
function buildCurlExamples(path, method = "get", isPublic = false) {
  const url = `http://localhost:8080${path}`;
  const m = method.toUpperCase();
  const needsBody = ["POST", "PUT", "PATCH"].includes(m);
  // Smart example bodies for common user endpoints
  let bodyObj = null;
  if (needsBody) {
    if (path === '/api/system/users' && m === 'POST') {
      bodyObj = { email: 'agent1@example.com', full_name: 'Agent One', roles: ['agent'], tiers: [ { name: 'Tier 1' } ], support_groups: [ { name: 'Service Desk' } ] };
    } else if (path.match(/^\/api\/system\/users\/\{id\}$/) && m === 'PUT') {
      bodyObj = { full_name: 'Agent One Updated', roles: ['agent','kb_editor'], tiers: [1], support_groups: [1, { name: 'Escalations' }] };
    } else if (path.match(/^\/api\/system\/users\/\{id\}\/tiers$/) && m === 'POST') {
      bodyObj = { tiers: [ { name: 'Tier 2' } ] };
    } else if (path.match(/^\/api\/system\/users\/\{id\}\/support-groups$/) && m === 'POST') {
      bodyObj = { support_groups: [ { name: 'Service Desk' }, 3 ] };
    }
  }
  const data = needsBody ? ` -H 'Content-Type: application/json' -d '${JSON.stringify(bodyObj || {})}'` : "";
  const base = `curl -s -X ${m} '${url}'`;
  const bearerCurl = `${base} -H 'Authorization: Bearer $ACCESS_TOKEN'${data}`;
  const basicCurl = `${base} -u 'user@example.com:password'${data}`;
  const apiKeyCurl = `${base} -H 'X-API-Key: $API_KEY'${data}`;
  const publicCurl = `${base}${data}`;
  const examples = { bearerCurl: { value: bearerCurl }, apiKeyCurl: { value: apiKeyCurl }, basicCurl: { value: basicCurl } };
  if (isPublic) examples.publicCurl = { value: publicCurl };
  return examples;
}

// Inline error schema (extends ErrorResponseBase) tailored by path/method
function inlineErrorSchema(path, method) {
  const details = {
    type: "object",
    additionalProperties: true,
    properties: {},
  };
  if (path.includes("/tickets/lookup")) {
    details.properties.params = {
      type: "object",
      properties: {
        reference: { type: "string", description: "ticket reference/key" },
      },
    };
   } else if (path.includes("{id}")) {
    details.properties.id = { type: "string", description: "resource id" };
  } else if (method === "post" && path.endsWith("/tickets")) {
    details.properties.missing = {
      type: "array",
      items: { type: "string" },
      description: "Missing required fields",
    };
  }
  return {
    type: "object",
    allOf: [
      { $ref: "#/components/schemas/ErrorResponseBase" },
      { properties: { details } },
    ],
  };
}

function errorExamples(path, method) {
  // Provide concrete example payloads per common cases
  const base = (code, message, extras = {}) => ({
    value: {
      ok: false,
      error: { code, message },
      details: extras.details ?? null,
      request_id: "REQ-abc123",
      path,
      method: method.toUpperCase(),
      timestamp: "2025-09-23T12:00:00.000Z",
    },
  });

  if (path.includes("/tokens/api-keys") && path.match(/\{id}/)) {
    return {
      notFound: base("NOT_FOUND", "API key not found", {
        details: { id: "123" },
      }),
      unauthorized: base("UNAUTHORIZED", "Authentication required"),
    };
  }
  if (path.startsWith("/api/tickets/attachments") && path.match(/\{id}/)) {
    return {
      notFound: base("NOT_FOUND", "Attachment not found", {
        details: { id: "a1" },
      }),
    };
  }
  // New: specific not founds for notes and watchers
  if (path.startsWith("/api/tickets/notes") && path.match(/\{id}/)) {
    return {
      notFound: base("NOT_FOUND", "Note not found", { details: { id: "n1" } }),
    };
  }
  if (path.startsWith("/api/tickets/watchers") && path.match(/\{id}/)) {
    return {
      notFound: base("NOT_FOUND", "Watcher not found", { details: { id: "w1" } }),
    };
  }
  if (path.startsWith("/api/tickets") && path.match(/\{id}/)) {
    return {
      notFound: base("NOT_FOUND", "Ticket not found", {
        details: { id: "123" },
      }),
    };
  }
  if (path.includes("/tickets/lookup")) {
    return {
      missingReference: base("BAD_REQUEST", "reference is required", {
        details: { params: { reference: "ticket reference/key" } },
      }),
      notFound: base("NOT_FOUND", "Ticket not found"),
    };
  }
  if (path.match(/\{id}/)) {
    return {
      notFound: base("NOT_FOUND", "Resource not found", {
        details: { id: "123" },
      }),
    };
  }
  if (method === "post" && path.endsWith("/tickets")) {
    return {
      validation: base("BAD_REQUEST", "Validation failed", {
        details: { missing: ["title", "description"] },
      }),
    };
  }
  return {
    badRequest: base("BAD_REQUEST", "Bad request"),
    unauthorized: base("UNAUTHORIZED", "Authentication required"),
    forbidden: base("FORBIDDEN", "Insufficient permissions"),
    notFound: base("NOT_FOUND", "Not found"),
    unexpected: base("INTERNAL_ERROR", "Unexpected error"),
  };
}

// Choose examples appropriate to each status code to avoid repetition
function examplesForStatus(code, errExamples) {
  const pick = (keys) => {
    const out = {};
    for (const k of keys) {
      if (errExamples[k]) out[k] = errExamples[k];
    }
    return Object.keys(out).length ? out : undefined;
  };
  if (code === "400")
    return pick(["validation", "missingReference", "badRequest"]);
  if (code === "401") return pick(["unauthorized"]);
  if (code === "403") return pick(["forbidden"]);
  if (code === "404") return pick(["notFound"]);
  if (code === "500") return pick(["unexpected"]);
  return undefined;
}

export default function buildOpenApi(app) {
  const apiEndpoints = listEndpoints(app);
  const paths = {};
  const tagsSet = new Set();

  // Components
  const components = {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      basicAuth: { type: "http", scheme: "basic" },
      apiKeyAuth: { type: "apiKey", in: "header", name: "X-API-Key" },
      cookieAuth: { type: "apiKey", in: "cookie", name: "uid" },
    },
    schemas: {
      // Generic error envelope used across the API
      ErrorResponseBase: {
        type: "object",
        required: ["ok", "error", "request_id", "path", "method", "timestamp"],
        properties:
         {
          ok: { type: "boolean", example: false },
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string", example: "BAD_REQUEST" },
              message: { type: "string", example: "Validation failed" },
            },
          },
          details: { type: "object", nullable: true, additionalProperties: true },
          request_id: { type: "string", example: "REQ-abc123" },
          path: { type: "string", example: "/api/public/faqs" },
          method: { type: "string", example: "GET" },
          timestamp: { type: "string", format: "date-time" },
        },
      },

      // Common user representation
      User: {
        type: "object",
        required: ["id", "email"],
        properties: {
          id: { type: "string", description: "Internal user id" },
          email: { type: "string", format: "email" },
          full_name: { type: "string" },
          is_active: { type: "boolean" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time", nullable: true },
          roles: { type: "array", items: { $ref: "#/components/schemas/Role" }, description: "Assigned roles; include permissions when expanded via 'expand=roles.permissions'" },
          tiers: { type: "array", items: { $ref: "#/components/schemas/AgentTier" }, description: "User's support tier memberships (max 1)." },
          support_groups: { type: "array", items: { $ref: "#/components/schemas/AgentGroup" }, description: "User's support group memberships." },
        },
      },

      // Auth related schemas
      AuthLoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: { email: { type: "string", format: "email" }, password: { type: "string" } },
      },
      AuthLoginResponse: {
        type: "object",
        required: ["access_token", "refresh_token", "user"],
        properties: {
          access_token: { type: "string" },
          refresh_token: { type: "string" },
          user: { $ref: "#/components/schemas/User" },
        },
      },
      AuthAccessToken: { type: "object", required: ["access_token"], properties: { access_token: { type: "string" } } },

      // API keys
      ApiKeyPublic: {
        type: "object",
        required: ["id", "name", "scope", "is_active", "prefix"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          scope: { type: "string" },
          is_active: { type: "boolean" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time", nullable: true },
          created_by: { type: "string", nullable: true },
          expires_at: { type: "string", format: "date-time", nullable: true },
          prefix: { type: "string" },
        },
      },
      ApiKeyWithSecret: { allOf: [{ $ref: "#/components/schemas/ApiKeyPublic" }, { type: "object", required: ["api_key"], properties: { api_key: { type: "string" } } }] },

      // Knowledge base / FAQs
      KBArticle: {
        type: "object",
        required: ["id", "title"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
          is_published: { type: "boolean" },
          created_by: { type: "string", nullable: true },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time", nullable: true },
          tags: { type: "array", items: { type: "string" } },
        },
      },
      FAQ: { type: "object", required: ["id", "title"], properties: { id: { type: "string" }, title: { type: "string" }, body: { type: "string" }, is_published: { type: "boolean" }, system_category_id: { type: "string", nullable: true }, created_by: { type: "string", nullable: true }, created_at: { type: "string", format: "date-time" } } },

      // Videos
      Video: { type: "object", required: ["id", "title"], properties: { id: { type: "string" }, title: { type: "string" }, description: { type: "string" }, category_id: { type: "string" }, system_category_id: { type: "string" }, url: { type: "string", format: "uri" }, duration_seconds: { type: "integer" }, language: { type: "string" }, is_published: { type: "boolean" }, created_at: { type: "string", format: "date-time" } } },

      // Systems / modules / categories
      SystemCategory: { type: "object", properties: { id: { type: "string" }, name: { type: "string" } } },
      System: { type: "object", properties: { id: { type: "string" }, category_id: { type: "string" }, name: { type: "string" }, code: { type: "string" }, description: { type: "string" } } },
      SystemModule: { type: "object", properties: { id: { type: "string" }, system_id: { type: "string" }, name: { type: "string" }, code: { type: "string" } } },

      // Lookups
      Status: { type: "object", properties: { id: { type: "string" }, code: { type: "string" }, name: { type: "string" } } },
      Priority: { type: "object", properties: { id: { type: "string" }, code: { type: "string" }, name: { type: "string" } } },

      // RBAC
      Role: { type: "object", required: ["id","name"], properties: { id: { type: "string" }, name: { type: "string" }, description: { type: "string", nullable: true }, permissions: { type: "array", items: { type: "string" } } } },
      Permission: { type: "object", required: ["id","code"], properties: { id: { type: "string" }, code: { type: "string" }, name: { type: "string" }, description: { type: "string", nullable: true } } },

      // Settings and sessions
      SettingKV: { type: "object", properties: { key: { type: "string" }, value: { type: "string" } } },
      UserSession: { type: "object", properties: { id: { type: "string" }, user_id: { type: "string" }, user_agent: { type: "string" }, ip_address: { type: "string" }, created_at: { type: "string", format: "date-time" }, expires_at: { type: "string", format: "date-time" } } },

      // System events / inbox
      AuditEvent: { type: "object", properties: { id: { type: "string" }, actor_user_id: { type: "string" }, action: { type: "string" }, details: { type: "object", additionalProperties: true }, created_at: { type: "string", format: "date-time" } } },
      InboxEmail: { type: "object", properties: { id: { type: "string" }, from: { type: "string" }, subject: { type: "string" }, body: { type: "string" }, received_at: { type: "string", format: "date-time" } } },

      // Agent groups/tiers
      AgentGroup: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, members: { type: "array", items: { type: "string" } } } },
      AgentTier: { type: "object", properties: { id: { type: "string" }, name: { type: "string" } } },

      // Workflows
      WorkflowRule: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, enabled: { type: "boolean" }, trigger: { type: "string" }, actions: { type: "array", items: { type: "object", additionalProperties: true } } } },

      // Tickets composite/list schemas
      TicketNote: {
        type: "object",
        properties: { id: { type: "string" }, ticket_id: { type: "string" }, user_id: { type: "string" }, body: { type: "string" }, is_internal: { type: "boolean" }, created_at: { type: "string", format: "date-time" } }
      },
      TicketAttachment: {
        type: "object",
        properties: { id: { type: "string" }, ticket_id: { type: "string" }, file_name: { type: "string" }, file_type: { type: "string" }, file_size_bytes: { type: "integer" }, storage_path: { type: "string" }, uploaded_by: { type: "string" }, uploaded_at: { type: "string", format: "date-time" } }
      },
      TicketWatcher: {
        type: "object",
        properties: { id: { type: "string" }, ticket_id: { type: "string" }, user_id: { type: "string", nullable: true }, email: { type: "string", format: "email", nullable: true }, notify: { type: "boolean" } }
      },
      Ticket: {
        type: "object",
        properties: {
          id: { type: "string" },
          ticket_key: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          reporter_user_id: { type: "string", nullable: true },
          assigned_agent_id: { type: "string", nullable: true },
          status_id: { type: "string" },
          priority_id: { type: "string" },
          severity_id: { type: "string" },
          system_id: { type: "string" },
          module_id: { type: "string" },
          category_id: { type: "string" },
          group_id: { type: "string" },
          tier_id: { type: "string" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time", nullable: true },
          notes: { type: "array", items: { $ref: "#/components/schemas/TicketNote" } },
          attachments: { type: "array", items: { $ref: "#/components/schemas/TicketAttachment" } },
          // Example nested objects when using listDetailed/readDetailed
          reporter_user: { type: "object", nullable: true, additionalProperties: true },
          assigned_agent: { type: "object", nullable: true, additionalProperties: true },
          system: { type: "object", nullable: true, additionalProperties: true },
          module: { type: "object", nullable: true, additionalProperties: true },
          category: { type: "object", nullable: true, additionalProperties: true },
          status: { type: "object", nullable: true, additionalProperties: true },
          priority: { type: "object", nullable: true, additionalProperties: true },
          severity: { type: "object", nullable: true, additionalProperties: true },
          source: { type: "object", nullable: true, additionalProperties: true },
          group: { type: "object", nullable: true, additionalProperties: true },
          tier: { type: "object", nullable: true, additionalProperties: true }
        },
      },
      TicketList: {
        type: "object",
        properties: {
          items: { type: "array", items: { $ref: "#/components/schemas/Ticket" } },
          page: { type: "integer" },
          pageSize: { type: "integer" },
          total: { type: "integer" },
        },
      },
    },
  }; // close components

  // Heuristic to determine a sensible response schema for common endpoints.
  function guessResponseSchema(path, _method) {
    // Prefer specific resources when the path contains a resource id
    if (path.includes('{id}')) {
      // Specific sub-resources first
      if (path.includes('/tickets/attachments') || path.includes('/attachments')) return { $ref: '#/components/schemas/TicketAttachment' };
      if (path.includes('/tickets/notes') || path.includes('/notes')) return { $ref: '#/components/schemas/TicketNote' };
      if (path.includes('/tickets/watchers') || path.includes('/watchers')) return { $ref: '#/components/schemas/TicketWatcher' };
      if (path.includes('/kb') || path.includes('/kb-articles')) return { $ref: '#/components/schemas/KBArticle' };
      if (path.includes('/faqs')) return { $ref: '#/components/schemas/FAQ' };
      if (path.includes('/videos')) return { $ref: '#/components/schemas/Video' };
      if (path.includes('/tokens/api-keys')) return { $ref: '#/components/schemas/ApiKeyPublic' };
      if (path.includes('/users')) return { $ref: '#/components/schemas/User' };
      if (path.includes('/roles')) return { $ref: '#/components/schemas/Role' };
      if (path.includes('/settings')) return { $ref: '#/components/schemas/SettingKV' };
      if (path.includes('/sessions')) return { $ref: '#/components/schemas/UserSession' };
      if (path.includes('/audit')) return { $ref: '#/components/schemas/AuditEvent' };
      if (path.includes('/inbox')) return { $ref: '#/components/schemas/InboxEmail' };
      if (path.includes('/agents/groups')) return { $ref: '#/components/schemas/AgentGroup' };
      if (path.includes('/agents/tiers')) return { $ref: '#/components/schemas/AgentTier' };
      if (path.includes('/workflows')) return { $ref: '#/components/schemas/WorkflowRule' };
      if (path.includes('/tickets')) return { $ref: '#/components/schemas/Ticket' };
    }
    // Collection endpoints (order: specific sub-resources before generic /tickets)
    if (path.includes('/tickets/attachments') || path.includes('/attachments')) return { type: 'array', items: { $ref: '#/components/schemas/TicketAttachment' } };
    if (path.includes('/tickets/notes') || path.includes('/notes')) return { type: 'array', items: { $ref: '#/components/schemas/TicketNote' } };
    if (path.includes('/tickets/watchers') || path.includes('/watchers')) return { type: 'array', items: { $ref: '#/components/schemas/TicketWatcher' } };
    if (path.includes('/tickets')) return { $ref: '#/components/schemas/TicketList' };
    if (path.includes('/kb') || path.includes('/kb-articles')) return { type: 'array', items: { $ref: '#/components/schemas/KBArticle' } };
    if (path.includes('/faqs')) return { type: 'array', items: { $ref: '#/components/schemas/FAQ' } };
    if (path.includes('/videos')) return { type: 'array', items: { $ref: '#/components/schemas/Video' } };
    if (path.includes('/tokens/api-keys')) return { type: 'array', items: { $ref: '#/components/schemas/ApiKeyPublic' } };
    if (path.includes('/roles')) return { type: 'array', items: { $ref: '#/components/schemas/Role' } };
    if (path.includes('/settings')) return { type: 'array', items: { $ref: '#/components/schemas/SettingKV' } };
    if (path.includes('/sessions')) return { type: 'array', items: { $ref: '#/components/schemas/UserSession' } };
    if (path.includes('/audit')) return { type: 'array', items: { $ref: '#/components/schemas/AuditEvent' } };
    if (path.includes('/inbox')) return { type: 'array', items: { $ref: '#/components/schemas/InboxEmail' } };
    if (path.includes('/agents/groups')) return { type: 'array', items: { $ref: '#/components/schemas/AgentGroup' } };
    if (path.includes('/agents/tiers')) return { type: 'array', items: { $ref: '#/components/schemas/AgentTier' } };
    if (path.includes('/workflows')) return { type: 'array', items: { $ref: '#/components/schemas/WorkflowRule' } };
    // Default: generic object
    return { type: 'object' };
  }

  // Build paths using endpoints
  for (const e of apiEndpoints) {
    const oaPath = expressToOpenApiPath(e.path);
    if (!paths[oaPath]) paths[oaPath] = {};
    const pathParamNames = extractPathParams(e.path);
    const params = pathParamNames.map((name) => ({
      name,
      in: "path",
      required: true,
      schema: { type: "string" },
      description: `Path parameter: ${name}`,
    }));
    const tag = tagFor(e.path);
    tagsSet.add(tag);
    for (const m of e.methods || []) {
      const method = String(m || "").toLowerCase();
      if (!["get", "post", "put", "delete", "patch"].includes(method)) continue;
      // Inline tailored error schema and examples per operation
      const errSchema = inlineErrorSchema(oaPath, method);

      let op = {
        tags: [tag],
        summary: opSummary(method, e.path),
        description:
          defaultDescription(method, e.path),
        security: isNoAuthPath(e.path, method) ? [] : authSecurity(),
        parameters: [...params],
        responses: {
          200: {
            description: "Successful response",
            content: {
              "application/json": {
                schema: { type: "object" },
                examples: buildCurlExamples(e.path, method, isNoAuthPath(e.path, method)),
              },
            },
          },
          400: {
            description: "Bad Request",
            content: { "application/json": { schema: errSchema } },
          },
          401: {
            description: "Unauthorized",
            content: { "application/json": { schema: errSchema } },
          },
          403: {
            description: "Forbidden",
            content: { "application/json": { schema: errSchema } },
          },
          404: {
            description: "Not Found",
            content: { "application/json": { schema: errSchema } },
          },
          500: {
            description: "Internal Server Error",
            content: { "application/json": { schema: errSchema } },
          },
        },
      };

      // Query params for lists
      if (method === "get" && !e.path.match(/:\w+/)) {
        op.parameters = mergeParams(op.parameters, listQueryParams());
        // Also allow shaping controls
        op.parameters = mergeParams(op.parameters, [fieldsParam(), expandParam()]);
      } else {
        // shaping controls still allowed on single GETs
        if (method === 'get') op.parameters = mergeParams(op.parameters, [fieldsParam(), expandParam()]);
      }

      // Guess response schema for success
      op.responses[200].content["application/json"].schema = guessResponseSchema(oaPath, method);

      // Default request bodies for POST/PUT on common resources
      if (["post", "put", "patch"].includes(method)) {
        if (e.path.includes('/tokens/api-keys')) {
          op.requestBody = {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: { type: 'string' },
                    scope: { type: 'string' },
                    is_active: { type: 'boolean' },
                    expires_at: { type: 'string', format: 'date-time', nullable: true }
                  },
                  additionalProperties: false
                },
                example: { name: 'CI Key', scope: 'system', is_active: true }
              }
            }
          };
        }
        // Roles and permissions
        else if (e.path.includes('/system/roles') || e.path.includes('/roles')) {
          op.requestBody = {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Role' } } },
          };
        }
        // Users
        else if (e.path.includes('/system/users') || e.path.includes('/users')) {
          op.requestBody = {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          };
        }
        // KB articles / FAQs / Videos
        else if (e.path.includes('/kb') || e.path.includes('/kb-articles')) {
          op.requestBody = { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/KBArticle' } } } };
        }
        else if (e.path.includes('/faqs')) {
          op.requestBody = { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/FAQ' } } } };
        }
        else if (e.path.includes('/videos')) {
          op.requestBody = { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Video' } } } };
        }
        // Systems/modules/categories
        else if (e.path.includes('/system') || e.path.includes('/systems') || e.path.includes('/system-modules') || e.path.includes('/system-category')) {
          // Use System / SystemModule / SystemCategory where appropriate (best-effort)
          if (e.path.includes('/system-modules') || e.path.includes('/system/modules')) {
            op.requestBody = { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SystemModule' } } } };
          } else if (e.path.includes('/system-category') || e.path.includes('/system-categories')) {
            op.requestBody = { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SystemCategory' } } } };
          } else {
            op.requestBody = { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/System' } } } };
          }
        }
        // Settings
        else if (e.path.includes('/settings')) {
          op.requestBody = { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SettingKV' } } } };
        }
        // Attachments, notes, events, watchers
        else if (e.path.includes('/tickets/attachments') || e.path.includes('/attachments')) {
          op.requestBody = { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TicketAttachment' } } } };
        }
        else if (e.path.includes('/tickets/notes') || e.path.includes('/notes')) {
          op.requestBody = { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TicketNote' } } } };
        }
        else if (e.path.includes('/tickets/watchers') || e.path.includes('/watchers')) {
          op.requestBody = { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TicketWatcher' } } } };
        }
      }

      // Merge manual overrides (wins for requestBody, etc.)
      op = mergeOverride(op, oaPath, method);

      // Error examples tailored per path
      const errExamples = errorExamples(oaPath, method);
      for (const code of Object.keys(op.responses)) {
        if (code === '200') continue;
        const ex = examplesForStatus(code, errExamples);
        if (ex) {
          if (!op.responses[code].content) op.responses[code].content = {};
          op.responses[code].content['application/json'] = op.responses[code].content['application/json'] || {};
          op.responses[code].content['application/json'].examples = ex;
        }
      }

      paths[oaPath][method] = op;
    }
  }

  // Tags
  const tags = Array.from(tagsSet).map((t) => ({ name: t }));

  return {
    openapi: "3.0.3",
    info: {
      title: "EAssist API",
      version: "1.0.0",
      description:
        "Auto-generated OpenAPI specification from Express routes."
    },
    servers: [{ url: "http://localhost:8080" }],
    tags,
    paths,
    components,
  };
}
