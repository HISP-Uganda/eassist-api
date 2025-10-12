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

function isNoAuthPath(path) {
  if (path.startsWith("/api/public")) return true;
  if (path === "/api/info" || path === "/api/resources") return true;
  if (path === "/api/docs.json" || path.startsWith("/api/docs")) return true;
  // Lookups are public for GET
  if (path.startsWith("/api/system/lookups")) return true;
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
        { name: "assigned_agent_id", in: "query", schema: { type: "string" }, description: "UUID of assigned agent" },
        { name: "group_id", in: "query", schema: { type: "integer" }, description: "Support group id" },
        { name: "tier_id", in: "query", schema: { type: "integer" }, description: "Tier id" },
        { name: "unassigned", in: "query", schema: { type: "string", enum: ["true","false"] }, description: "Only tickets without assigned agent (true)" },
        { name: "reporter_email", in: "query", schema: { type: "string", format: "email" }, description: "Filter by reporter email" },
        { name: "created_from", in: "query", schema: { type: "string", format: "date-time" }, description: "Created at >= (ISO)" },
        { name: "created_to", in: "query", schema: { type: "string", format: "date-time" }, description: "Created at <= (ISO)" },
        { name: "sort", in: "query", schema: { type: "string", enum: ["created_at ASC","created_at DESC","updated_at ASC","updated_at DESC","ticket_key ASC","ticket_key DESC","priority_id ASC","priority_id DESC","severity_id ASC","severity_id DESC","status_id ASC","status_id DESC"] }, description: "Safe sort fields with direction" }
      ],
      description: "List tickets with advanced filters and pagination.",
      summary: "List tickets",
    },
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
    post: { requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["body"], properties: { body: { type: "string" }, is_internal: { type: "boolean", default: false } } } } } }, description: "Add a note to a ticket.", summary: "Create ticket note" }
  },
  "/api/tickets/:id/attachments": {
    get: { parameters: [
      { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
      { name: "pageSize", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
      { name: "file_type", in: "query", schema: { type: "string" } },
      { name: "q", in: "query", schema: { type: "string" }, description: "Search file_name contains" }
    ], description: "List attachments for a ticket.", summary: "List ticket attachments" },
    post: { requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["file_name","file_type","file_size_bytes","storage_path"], properties: { file_name: { type: "string" }, file_type: { type: "string" }, file_size_bytes: { type: "integer" }, storage_path: { type: "string" } } } } } }, description: "Add an attachment record for a ticket.", summary: "Create ticket attachment" }
  },
  "/api/tickets/:id/events": {
    get: { parameters: [
      { name: "page", in: "query", schema: { type: "integer" } },
      { name: "pageSize", in: "query", schema: { type: "integer", maximum: 100 } },
      { name: "event_type", in: "query", schema: { type: "string" } }
    ], description: "List events for a ticket.", summary: "List ticket events" }
  },
  "/api/tickets/:id/watchers": {
    get: { parameters: [
      { name: "page", in: "query", schema: { type: "integer" } },
      { name: "pageSize", in: "query", schema: { type: "integer", maximum: 100 } },
      { name: "notify", in: "query", schema: { type: "string", enum: ["true","false"] } }
    ], description: "List watchers for a ticket.", summary: "List ticket watchers" },
    post: { requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { user_id: { type: "string", nullable: true }, email: { type: "string", format: "email", nullable: true }, notify: { type: "boolean", default: true } }, anyOf: [ { required: ["user_id"] }, { required: ["email"] } ] } } } }, description: "Add a watcher to a ticket.", summary: "Create ticket watcher" }
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
  ] , description: "List notes across tickets.", summary: "List notes" }, post: { requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["ticket_id","body"], properties: { ticket_id: { type: "string" }, user_id: { type: "string", nullable: true }, body: { type: "string" }, is_internal: { type: "boolean", default: false } } } } } }, description: "Create a note for a ticket.", summary: "Create note" } },
  "/api/tickets/attachments": { get: { parameters: [
    { name: "page", in: "query", schema: { type: "integer" } },
    { name: "pageSize", in: "query", schema: { type: "integer" } },
    { name: "ticket_id", in: "query", schema: { type: "string" } },
    { name: "uploaded_by", in: "query", schema: { type: "string" } },
    { name: "file_type", in: "query", schema: { type: "string" } },
    { name: "q", in: "query", schema: { type: "string" } },
    { name: "uploaded_from", in: "query", schema: { type: "string", format: "date-time" } },
    { name: "uploaded_to", in: "query", schema: { type: "string", format: "date-time" } }
  ] , description: "List attachments across tickets.", summary: "List attachments" } },
  "/api/tickets/events": { get: { parameters: [
    { name: "page", in: "query", schema: { type: "integer" } },
    { name: "pageSize", in: "query", schema: { type: "integer" } },
    { name: "ticket_id", in: "query", schema: { type: "string" } },
    { name: "event_type", in: "query", schema: { type: "string" } },
    { name: "actor_user_id", in: "query", schema: { type: "string" } },
    { name: "q", in: "query", schema: { type: "string" } },
    { name: "occurred_from", in: "query", schema: { type: "string", format: "date-time" } },
    { name: "occurred_to", in: "query", schema: { type: "string", format: "date-time" } }
  ] , description: "List ticket events across system.", summary: "List ticket events" } },
  "/api/tickets/watchers": { get: { parameters: [
    { name: "page", in: "query", schema: { type: "integer" } },
    { name: "pageSize", in: "query", schema: { type: "integer" } },
    { name: "ticket_id", in: "query", schema: { type: "string" } },
    { name: "user_id", in: "query", schema: { type: "string" } },
    { name: "email", in: "query", schema: { type: "string", format: "email" } },
    { name: "notify", in: "query", schema: { type: "string", enum: ["true","false"] } }
  ] , description: "List ticket watchers across system.", summary: "List ticket watchers" } },

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
    { name: "language", in: "query", schema: { type: "string" } }
  ] , description: "List published training videos.", summary: "List public videos" } },
  "/api/public/videos/categories": { get: { parameters: [
    { name: "page", in: "query", schema: { type: "integer" } },
    { name: "pageSize", in: "query", schema: { type: "integer" } },
    { name: "q", in: "query", schema: { type: "string" } }
  ] , description: "List public video categories.", summary: "List public video categories" } },
  "/api/public/search": { get: { parameters: [ { name: "q", in: "query", schema: { type: "string" } } ], description: "Unified public search across content.", summary: "Public search" } },

  // System modules filters
  "/api/system/files": { get: { parameters: [
    { name: "page", in: "query", schema: { type: "integer" } },
    { name: "pageSize", in: "query", schema: { type: "integer" } },
    { name: "ticket_id", in: "query", schema: { type: "string" } },
    { name: "file_type", in: "query", schema: { type: "string" } },
    { name: "q", in: "query", schema: { type: "string" }, description: "Search file_name contains" }
  ] , description: "List system files.", summary: "List files" } },
  "/api/system/audit": { get: { parameters: [
    { name: "page", in: "query", schema: { type: "integer" } },
    { name: "pageSize", in: "query", schema: { type: "integer" } },
    { name: "actor_user_id", in: "query", schema: { type: "string" } },
    { name: "entity", in: "query", schema: { type: "string" } },
    { name: "entity_id", in: "query", schema: { type: "string" } },
    { name: "action", in: "query", schema: { type: "string" } },
    { name: "q", in: "query", schema: { type: "string" } },
    { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
    { name: "to", in: "query", schema: { type: "string", format: "date-time" } }
  ] , description: "List audit events.", summary: "List audit events" } },
  "/api/system/inbox/emails": { get: { parameters: [
    { name: "page", in: "query", schema: { type: "integer" } },
    { name: "pageSize", in: "query", schema: { type: "integer" } },
    { name: "processing_status", in: "query", schema: { type: "string" } },
    { name: "from_email", in: "query", schema: { type: "string", format: "email" } },
    { name: "created_ticket_id", in: "query", schema: { type: "string" } },
    { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
    { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
    { name: "q", in: "query", schema: { type: "string" } }
  ] , description: "List inbox emails ingested by the system.", summary: "List inbox emails" } },
  "/api/system/users": {
    get: { parameters: [ { name: "q", in: "query", schema: { type: "string" }, description: "Search email or full_name" } ], description: "List users.", summary: "List users" },
    post: { requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["email"], properties: { email: { type: "string", format: "email" }, full_name: { type: "string" }, password: { type: "string", description: "Plaintext; server hashes" }, phone: { type: "string" }, is_active: { type: "boolean" }, created_at: { type: "string", format: "date-time" }, roles: { type: "array", items: { oneOf: [ { type: "string" }, { type: "object", additionalProperties: true } ] }, description: "Array of role ids/codes/names" }, tiers: { type: "array", items: { oneOf: [ { type: "integer" }, { type: "object", additionalProperties: true } ] } }, support_groups: { type: "array", items: { oneOf: [ { type: "integer" }, { type: "object", additionalProperties: true } ] } } } } } } }, description: "Create a user.", summary: "Create user" }
  },
  "/api/system/roles": { get: { parameters: [ { name: "q", in: "query", schema: { type: "string" }, description: "Search name/description" } ], description: "List roles.", summary: "List roles" }, post: { requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string" }, code: { type: "string", nullable: true }, description: { type: "string", nullable: true } } } } } }, description: "Create a role.", summary: "Create role" } },

  // Knowledge filters
  "/api/knowledge/kb-articles": { get: { parameters: [ { name: "q", in: "query", schema: { type: "string" } } ] , description: "List KB articles.", summary: "List KB articles" } },
  "/api/knowledge/kb/tags": { get: { parameters: [ { name: "q", in: "query", schema: { type: "string" } } ] , description: "List KB tags.", summary: "List KB tags" } },
  "/api/knowledge/kb/ratings": { get: { parameters: [ { name: "article_id", in: "query", schema: { type: "string" } }, { name: "user_id", in: "query", schema: { type: "string" } } ] , description: "List KB ratings.", summary: "List KB ratings" } },
  "/api/knowledge/videos": { get: { parameters: [ { name: "q", in: "query", schema: { type: "string" } , description: "Search title/description" }, { name: "category_id", in: "query", schema: { type: "string" } }, { name: "system_category_id", in: "query", schema: { type: "integer" } }, { name: "language", in: "query", schema: { type: "string" } }, { name: "is_published", in: "query", schema: { type: "string", enum: ["true","false"] } } ] , description: "List videos.", summary: "List videos" } },
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
  const data = needsBody ? " -H 'Content-Type: application/json' -d '{}'" : "";
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
  return pick(["unexpected"]);
}

export default function buildOpenApi(app) {
  const endpoints = listEndpoints(app) || [];
  const apiEndpoints = endpoints.filter(
    (e) => e.path && e.path.startsWith("/api")
  );
  const paths = {};
  const tagsSet = new Set();
  const components = {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      basicAuth: { type: "http", scheme: "basic" },
      apiKeyAuth: { type: "apiKey", in: "header", name: "X-API-Key" },
      cookieAuth: { type: "apiKey", in: "cookie", name: "access_token" },
    },
    schemas: {
      // Generic error envelope used across the API
      ErrorResponseBase: {
        type: "object",
        required: ["ok", "error", "request_id", "path", "method", "timestamp"],
        properties: {
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
          roles: { type: "array", items: { type: "string" } },
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

      // Tickets and attachments schemas with audit fields
      TicketAttachment: {
        type: "object",
        required: ["id", "ticket_id", "file_name", "file_type", "file_size_bytes", "storage_path"],
        properties: {
          id: { type: "string" },
          ticket_id: { type: "string" },
          file_name: { type: "string" },
          file_type: { type: "string" },
          file_size_bytes: { type: "integer" },
          storage_path: { type: "string" },
          uploaded_by: { type: "string", nullable: true },
          uploaded_at: { type: "string", format: "date-time" },
        },
      },
      TicketNote: {
        type: "object",
        required: ["id", "ticket_id", "body"],
        properties: {
          id: { type: "string" },
          ticket_id: { type: "string" },
          user_id: { type: "string", nullable: true },
          body: { type: "string" },
          is_internal: { type: "boolean" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      TicketEvent: {
        type: "object",
        required: ["id", "ticket_id", "event_type"],
        properties: {
          id: { type: "string" },
          ticket_id: { type: "string" },
          event_type: { type: "string" },
          actor_user_id: { type: "string", nullable: true },
          details: { type: "object", additionalProperties: true, nullable: true },
          occurred_at: { type: "string", format: "date-time" }
        }
      },
      TicketWatcher: {
        type: "object",
        required: ["id", "ticket_id"],
        properties: {
          id: { type: "string" },
          ticket_id: { type: "string" },
          user_id: { type: "string", nullable: true },
          email: { type: "string", format: "email", nullable: true },
          notify: { type: "boolean" }
        }
      },
      Ticket: {
        type: "object",
        required: ["id", "ticket_key", "title"],
        properties: {
          id: { type: "string" },
          ticket_key: { type: "string" },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          reporter_user_id: { type: "string", nullable: true },
          reporter_email: { type: "string", format: "email", nullable: true },
          full_name: { type: "string", nullable: true },
          phone_number: { type: "string", nullable: true },
          system_id: { type: "integer", nullable: true },
          module_id: { type: "integer", nullable: true },
          category_id: { type: "integer", nullable: true },
          status_id: { type: "integer", nullable: true },
          priority_id: { type: "integer", nullable: true },
          severity_id: { type: "integer", nullable: true },
          source_id: { type: "integer", nullable: true },
          assigned_agent_id: { type: "string", nullable: true },
          group_id: { type: "integer", nullable: true },
          tier_id: { type: "integer", nullable: true },
          claimed_by: { type: "string", nullable: true },
          claimed_at: { type: "string", format: "date-time", nullable: true },
          reopen_count: { type: "integer", nullable: true },
          last_public_update_at: { type: "string", format: "date-time", nullable: true },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time", nullable: true },
          attachments_count: { type: "integer", nullable: true },
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
      if (path.includes('/tickets')) return { $ref: '#/components/schemas/Ticket' };
      if (path.includes('/attachments') || path.includes('/tickets/attachments')) return { $ref: '#/components/schemas/TicketAttachment' };
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
    }
    // Collection endpoints
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
        security: isNoAuthPath(e.path) ? [] : authSecurity(),
        parameters: [...params],
        responses: {
          200: {
            description: "Successful response",
            content: {
              "application/json": {
                schema: { type: "object" },
                examples: buildCurlExamples(e.path, method, isNoAuthPath(e.path)),
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
          default: {
            description: "Unexpected Error",
            content: { "application/json": { schema: errSchema } },
          },
        }
      };

      if (method === "get") {
        // Always include fields param for GET
        op.parameters = [...op.parameters, fieldsParam()];
        // Include pagination/search only for collection-like endpoints (no path params)
        if (pathParamNames.length === 0) {
          op.parameters = mergeParams(op.parameters, listQueryParams());
        }
      }
      if (["post", "put", "patch"].includes(method)) {
        op.requestBody = op.requestBody || {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", additionalProperties: true },
              example: { sample: "value" },
            },
          },
        };
      }
      // Apply overrides
      op = mergeOverride(op, e.path, method);

      // Ensure every operation explicitly documents whether a request payload is expected
      if (!op.requestBody) {
        op.requestBody = { required: false };
      }

      // Attach a guessed concrete 200/201 response schema where possible (improves developer usability)
      try {
        const guessed = guessResponseSchema(oaPath, method);
        // prefer 200, then 201, then any 2xx response
        const successCodes = ["200", "201", ...Object.keys(op.responses || {}).filter((c) => /^2\d\d$/.test(c))];
        let targetCode = successCodes.find((c) => op.responses && op.responses[c] && op.responses[c].content && op.responses[c].content['application/json']);
        if (!targetCode) {
          // fallback: find first 2xx with content
          targetCode = Object.keys(op.responses || {}).find((c) => /^2\d\d$/.test(c));
        }
        if (targetCode && op.responses && op.responses[targetCode] && op.responses[targetCode].content && op.responses[targetCode].content['application/json']) {
          op.responses[targetCode].content['application/json'].schema = guessed;
        }
      } catch (err) {
        // ignore guessing failures and leave generic schema
      }

      // Heuristics to provide requestBody schemas for common operations
      if (["post", "put", "patch"].includes(method)) {
        // Auth login
        if (e.path === '/api/auth/login') {
          op.requestBody = {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthLoginRequest' } } },
          };
        }
        // Create ticket (public or authenticated)
        else if (e.path.startsWith('/api/public/tickets') || e.path === '/api/tickets') {
          op.requestBody = {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title','description'],
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    reporter_user_id: { type: 'string' },
                    system_id: { type: 'string' },
                    module_id: { type: 'string' },
                    category_id: { type: 'string' },
                    priority_id: { type: 'string' },
                    severity_id: { type: 'string' }
                  },
                  additionalProperties: false
                },
                example: { title: 'Printer jam', description: 'Paper jam after 3 pages', email: 'user@domain.test' }
              }
            }
          };
        }
        // Rotate or create API keys
        else if (e.path.startsWith('/api/tokens/api-keys')) {
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
        // Attachments, notes, events
        else if (e.path.includes('/tickets/attachments') || e.path.includes('/attachments')) {
          op.requestBody = { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TicketAttachment' } } } };
        }
        else if (e.path.includes('/tickets/notes') || e.path.includes('/notes')) {
          op.requestBody = { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TicketNote' } } } };
        }
        else if (e.path.includes('/tickets/events') || e.path.includes('/events')) {
          op.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } } };
        }
        // Workflows and agents
        else if (e.path.includes('/workflows')) {
          op.requestBody = { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/WorkflowRule' } } } };
        }
        else if (e.path.includes('/agents')) {
          op.requestBody = { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentGroup' } } } };
        }
      }

      // If this is a POST and no explicit 201 response was provided, promote a generic 200 -> 201 (Created)
      if (method === 'post') {
        if (op.responses && op.responses['200'] && !op.responses['201']) {
          op.responses['201'] = { ...op.responses['200'], description: op.responses['200'].description || 'Created' };
          delete op.responses['200'];
        } else if (!op.responses || (!op.responses['200'] && !op.responses['201'])) {
          op.responses = op.responses || {};
          op.responses['201'] = { description: 'Created', content: { 'application/json': { schema: { type: 'object' } } } };
        }
      }

      // After overrides, attach tailored examples per status
      const codes = ["400", "401", "403", "404", "default"];
      const ex = errorExamples(expressToOpenApiPath(e.path), method);
      for (const code of codes) {
        const res = op.responses[code];
        if (!res || !res.content || !res.content["application/json"]) continue;
        const picked = examplesForStatus(
          code === "default" ? "default" : code,
          ex
        );
        if (picked) {
          res.content["application/json"].examples = picked;
        }
      }
      paths[oaPath][method] = op;
    }
  }

  const tags = Array.from(tagsSet)
    .sort()
    .map((name) => ({ name }));

  return {
    openapi: "3.0.3",
    info: {
      title: "eAssist API",
      version: "10.0.0",
      description: [
        "Auto-generated API documentation. Most endpoints accept any of the following auth methods:",
        "",
        "- Bearer JWT: Authorization: Bearer <access_token>",
        "- Basic auth: Authorization: Basic base64(email:password)",
        "- API key: X-API-Key: <raw>",
        "- Cookie (browser): access_token, refresh_token (HttpOnly)",
        "",
        "Public endpoints under /api/public and /api/system/lookups do not require authentication.",
        "Use /api/auth/login to obtain tokens, /api/resources to list endpoints, and /api/info for diagnostics.",
        "",
        "Errors are documented inline per operation, extending ErrorResponseBase with endpoint-appropriate details and example messages.",
        "",
        "Developed and maintained by HISP Uganda.",
      ].join("\n"),
    },
    servers: [
      { url: "http://localhost:8080", description: "Local server" },
      { url: "/", description: "Relative" },
    ],
    tags,
    components,
    security: [
      { bearerAuth: [] },
      { basicAuth: [] },
      { apiKeyAuth: [] },
      { cookieAuth: [] },
    ],
    paths,
  };
}
