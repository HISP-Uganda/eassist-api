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
  // Knowledge: make FAQs, KB Articles, and Videos GET public
  if (
    m === 'get' && (
      path === '/api/knowledge/faqs' || path.startsWith('/api/knowledge/faqs/') ||
      path === '/api/knowledge/kb/articles' || path.startsWith('/api/knowledge/kb/articles/') ||
      path === '/api/knowledge/videos' || path.startsWith('/api/knowledge/videos/')
    )
  ) return true;
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

// Helper to deep-merge responses so OVERRIDES can add examples without losing curl examples
function mergeResponses(base = {}, override = {}) {
  const out = { ...base };
  for (const [code, addResp] of Object.entries(override)) {
    const existing = out[code] || {};
    const merged = { ...existing, ...addResp };
    // Deep merge content -> application/json -> schema/examples
    if (existing.content || addResp.content) {
      merged.content = { ...(existing.content || {}) };
      const exJson = existing.content?.['application/json'] || {};
      const addJson = addResp.content?.['application/json'] || {};
      const mergedJson = { ...exJson, ...addJson };
      if (exJson.examples || addJson.examples) {
        mergedJson.examples = { ...(exJson.examples || {}), ...(addJson.examples || {}) };
      }
      if (addJson.schema) {
        mergedJson.schema = addJson.schema; // allow override of schema
      } else if (exJson.schema) {
        mergedJson.schema = exJson.schema;
      }
      merged.content['application/json'] = mergedJson;
    }
    out[code] = merged;
  }
  return out;
}

// Manual overrides per path+method (add/merge params, requestBody)
const OVERRIDES = {
  // Knowledge public GET filters and POST bodies aligned with DB
  "/api/knowledge/faqs": {
    get: {
      summary: "List FAQs",
      description: "List FAQs with pagination and optional search/filter.",
      parameters: [
        { name: "system_category_id", in: "query", schema: { type: "integer" }, description: "Filter by system category id" },
        { name: "is_published", in: "query", schema: { type: "string", enum: ["true","false"] }, description: "Filter by publication state" },
      ],
      responses: {
        200: {
          description: "List of FAQs",
          content: { 'application/json': { examples: { payload: { value: [ { id: "00000000-0000-0000-0000-000000000001", title: "How to reset password?", body: "Use the reset link…", is_published: true, system_category_id: 1 } ] } } } }
        }
      }
    },
    post: {
      summary: "Create FAQ",
      description: "Create a new FAQ.",
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/FAQ' }, example: { title: 'How to reset password?', body: 'Use the reset link…', is_published: true, system_category_id: 1 } } } },
      responses: { '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/FAQ' } } } } }
    }
  },
  "/api/knowledge/faqs/{id}": {
    get: { summary: "Get FAQ", description: "Get FAQ by id." },
    put: { summary: "Update FAQ", description: "Update FAQ by id.", requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/FAQ' } } } } }
  },
  "/api/knowledge/kb/articles": {
    get: {
      summary: "List KB articles",
      description: "List knowledge base articles with pagination and search.",
      parameters: [
        { name: "is_published", in: "query", schema: { type: "string", enum: ["true","false"] }, description: "Filter by publication state" }
      ],
      responses: {
        200: {
          description: "List of KB articles",
          content: { 'application/json': { examples: { payload: { value: [ { id: "10000000-0000-0000-0000-000000000001", title: "Printer troubleshooting", body: "Steps…", is_published: true } ] } } } }
        }
      }
    },
    post: {
      summary: "Create KB article",
      description: "Create a new KB article.",
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/KBArticle' }, example: { title: 'Printer troubleshooting', body: 'Steps…', is_published: true, tags: ['hardware','printer'] } } } },
      responses: { '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/KBArticle' } } } } }
    }
  },
  "/api/knowledge/kb/articles/{id}": {
    get: { summary: "Get KB article", description: "Get KB article by id." },
    put: { summary: "Update KB article", description: "Update KB article by id.", requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/KBArticle' } } } } }
  },
  "/api/knowledge/videos": {
    get: {
      summary: "List videos",
      description: "List videos with pagination and filters.",
      parameters: [
        { name: "category_id", in: "query", schema: { type: "string", format: "uuid" }, description: "Filter by video category id (UUID)" },
        { name: "system_category_id", in: "query", schema: { type: "integer" }, description: "Filter by system category id" },
        { name: "language", in: "query", schema: { type: "string" }, description: "Filter by language" },
        { name: "is_published", in: "query", schema: { type: "string", enum: ["true","false"] }, description: "Filter by publication state" },
      ],
      responses: {
        200: {
          description: "List of videos",
          content: { 'application/json': { examples: { payload: { value: [ { id: "20000000-0000-0000-0000-000000000001", title: "How to file a ticket", url: "https://example.com/v/1", duration_seconds: 120, language: "en", is_published: true } ] } } } }
        }
      }
    },
    post: {
      summary: "Create video",
      description: "Create a new video.",
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Video' }, example: { title: 'How to file a ticket', url: 'https://example.com/v/1', duration_seconds: 120, language: 'en', is_published: true, system_category_id: 1 } } } },
      responses: { '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Video' } } } } }
    }
  },
  "/api/knowledge/videos/{id}": {
    get: { summary: "Get video", description: "Get video by id." },
    put: { summary: "Update video", description: "Update video by id.", requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Video' } } } } }
  },

  // Knowledge search (protected by default)
  "/api/knowledge/search": {
    get: {
      summary: "Search knowledge",
      description: "Search across FAQs, KB Articles, and Videos by title.",
      parameters: [ { name: "q", in: "query", required: true, schema: { type: "string" }, description: "Search term" } ],
      responses: {
        200: {
          description: "Search result buckets",
          content: { 'application/json': { schema: { $ref: '#/components/schemas/KnowledgeSearchResult' }, examples: { payload: { value: { faqs: [ { id: "00000000-0000-0000-0000-000000000001", title: "Password reset" } ], kb: [ { id: "10000000-0000-0000-0000-000000000001", title: "Printer troubleshooting" } ], videos: [ { id: "20000000-0000-0000-0000-000000000001", title: "Intro video" } ] } } } } }
        }
      }
    }
  },

  // KB Ratings
  "/api/knowledge/kb/ratings": {
    get: {
      summary: "List KB ratings",
      description: "List KB article ratings with optional filters.",
      parameters: [
        { name: "article_id", in: "query", schema: { type: "string", format: "uuid" }, description: "Filter by KB article id" },
        { name: "user_id", in: "query", schema: { type: "string", format: "uuid" }, description: "Filter by user id" }
      ]
    },
    post: {
      summary: "Create or update rating",
      description: "Create a rating; on conflict (article_id,user_id) updates rating.",
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/KBRating' }, example: { article_id: '10000000-0000-0000-0000-000000000001', user_id: '30000000-0000-0000-0000-000000000001', rating: 5 } } } },
      responses: { '201': { description: 'Created/Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/KBRating' } } } } }
    }
  },
  "/api/knowledge/kb/ratings/{id}": {
    get: { summary: "Get rating", description: "Get a KB rating by id." },
    put: { summary: "Update rating", description: "Update a KB rating.", requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/KBRating' } } } } },
    delete: { summary: "Delete rating", description: "Delete a KB rating." }
  },
  "/api/knowledge/kb/ratings/summary": {
    get: {
      summary: "Rating summary",
      description: "Return average rating and count for a KB article.",
      parameters: [ { name: "article_id", in: "query", required: true, schema: { type: "string", format: "uuid" } } ],
      responses: { 200: { description: 'Summary', content: { 'application/json': { schema: { $ref: '#/components/schemas/KBRatingSummary' }, examples: { payload: { value: { avg: 4.5, count: 10 } } } } } } }
    }
  },

  // KB Tags
  "/api/knowledge/kb/tags": {
    get: { summary: "List tags", description: "List KB tags.", parameters: [ { name: "q", in: "query", schema: { type: "string" }, description: "Filter by name contains" } ] },
    post: { summary: "Create tag", description: "Create a tag.", requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/KBTag' }, example: { name: 'howto' } } } } }
  },
  "/api/knowledge/kb/tags/{id}": {
    get: { summary: "Get tag", description: "Get a tag by id." },
    put: { summary: "Update tag", description: "Update tag name.", requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } } } } },
    delete: { summary: "Delete tag", description: "Delete a tag." }
  },

  // KB Tag map
  "/api/knowledge/kb/tag-map": {
    get: { summary: "List article-tag mappings", description: "List mappings between articles and tags.", parameters: [ { name: "article_id", in: "query", schema: { type: "string", format: "uuid" } }, { name: "tag_id", in: "query", schema: { type: "string", format: "uuid" } } ] },
    post: { summary: "Add mapping", description: "Map a tag to an article.", requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/KBArticleTag' }, example: { article_id: '10000000-0000-0000-0000-000000000001', tag_id: '40000000-0000-0000-0000-000000000001' } } } } },
    delete: { summary: "Remove mapping", description: "Remove a tag from an article.", requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/KBArticleTag' }, example: { article_id: '10000000-0000-0000-0000-000000000001', tag_id: '40000000-0000-0000-0000-000000000001' } } } } }
  },
  "/api/knowledge/kb/tag-map/article/{articleId}": {
    get: { summary: "List tags for article", description: "List tag_id and name for a given article.", parameters: [ { name: "articleId", in: "path", required: true, schema: { type: "string", format: "uuid" } } ], responses: { 200: { content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/KBArticleTagEntry' } }, examples: { payload: { value: [ { tag_id: '40000000-0000-0000-0000-000000000001', name: 'howto' } ] } } } } } } }
  }
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
    next.responses = mergeResponses(op.responses || {}, o.responses);
  }
  return next;
}

// Build example curl commands for success responses
function buildCurlExamples(path, method = "get", isPublic = false) {
  const url = `http://localhost:8080${path}`;
  const m = method.toUpperCase();
  const needsBody = ["POST", "PUT", "PATCH"].includes(m);
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
      notFound: base("NOT_FOUND", "API key not found", { details: { id: "123" } }),
      unauthorized: base("UNAUTHORIZED", "Authentication required"),
    };
  }
  if (path.startsWith("/api/tickets/attachments") && path.match(/\{id}/)) {
    return { notFound: base("NOT_FOUND", "Attachment not found", { details: { id: "a1" } }) };
  }
  if (path.startsWith("/api/tickets/notes") && path.match(/\{id}/)) {
    return { notFound: base("NOT_FOUND", "Note not found", { details: { id: "n1" } }) };
  }
  if (path.startsWith("/api/tickets/watchers") && path.match(/\{id}/)) {
    return { notFound: base("NOT_FOUND", "Watcher not found", { details: { id: "w1" } }) };
  }
  if (path.startsWith("/api/tickets") && path.match(/\{id}/)) {
    return { notFound: base("NOT_FOUND", "Ticket not found", { details: { id: "123" } }) };
  }
  if (path.includes("/tickets/lookup")) {
    return {
      missingReference: base("BAD_REQUEST", "reference is required", { details: { params: { reference: "ticket reference/key" } } }),
      notFound: base("NOT_FOUND", "Ticket not found"),
    };
  }
  if (path.match(/\{id}/)) {
    return { notFound: base("NOT_FOUND", "Resource not found", { details: { id: "123" } }) };
  }
  if (method === "post" && path.endsWith("/tickets")) {
    return { validation: base("BAD_REQUEST", "Validation failed", { details: { missing: ["title", "description"] } }) };
  }
  return {
    badRequest: base("BAD_REQUEST", "Bad request"),
    unauthorized: base("UNAUTHORIZED", "Authentication required"),
    forbidden: base("FORBIDDEN", "Insufficient permissions"),
    notFound: base("NOT_FOUND", "Not found"),
    unexpected: base("INTERNAL_ERROR", "Unexpected error"),
  };
}

function examplesForStatus(code, errExamples) {
  const pick = (keys) => {
    const out = {};
    for (const k of keys) {
      if (errExamples[k]) out[k] = errExamples[k];
    }
    return Object.keys(out).length ? out : undefined;
  };
  if (code === "400") return pick(["validation", "missingReference", "badRequest"]);
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
          id: { type: "string", description: "Internal user id", format: 'uuid' },
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
          id: { type: "string", format: 'uuid' },
          name: { type: "string" },
          scope: { type: "string" },
          is_active: { type: "boolean" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time", nullable: true },
          created_by: { type: "string", nullable: true, format: 'uuid' },
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
          id: { type: "string", format: 'uuid' },
          title: { type: "string" },
          body: { type: "string" },
          is_published: { type: "boolean" },
          created_by: { type: "string", nullable: true, format: 'uuid' },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time", nullable: true },
          tags: { type: "array", items: { type: "string" } },
        },
      },
      FAQ: { type: "object", required: ["id", "title"], properties: { id: { type: "string", format: 'uuid' }, title: { type: "string" }, body: { type: "string" }, is_published: { type: "boolean" }, system_category_id: { type: "integer", nullable: true }, created_by: { type: "string", nullable: true, format: 'uuid' }, created_at: { type: "string", format: "date-time" } } },

      // Videos
      Video: { type: "object", required: ["id", "title"], properties: { id: { type: "string", format: 'uuid' }, title: { type: "string" }, description: { type: "string" }, category_id: { type: "string", format: 'uuid' }, system_category_id: { type: "integer" }, url: { type: "string", format: "uri" }, duration_seconds: { type: "integer" }, language: { type: "string" }, is_published: { type: "boolean" }, created_at: { type: "string", format: "date-time" } } },

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

      // Knowledge extra schemas
      KBRating: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, article_id: { type: 'string', format: 'uuid' }, user_id: { type: 'string', format: 'uuid' }, rating: { type: 'integer', minimum: 1, maximum: 5 }, created_at: { type: 'string', format: 'date-time' } } },
      KBTag: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' }, created_at: { type: 'string', format: 'date-time', nullable: true } } },
      KBArticleTag: { type: 'object', properties: { article_id: { type: 'string', format: 'uuid' }, tag_id: { type: 'string', format: 'uuid' } }, required: ['article_id','tag_id'] },
      KBArticleTagEntry: { type: 'object', properties: { tag_id: { type: 'string', format: 'uuid' }, name: { type: 'string' } } },
      KnowledgeSearchResult: { type: 'object', properties: { faqs: { type: 'array', items: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, title: { type: 'string' } } } }, kb: { type: 'array', items: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, title: { type: 'string' } } } }, videos: { type: 'array', items: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, title: { type: 'string' } } } } } },
      KBRatingSummary: { type: 'object', properties: { avg: { type: 'number', nullable: true }, count: { type: 'integer' } } },
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
          201: {
            description: "Created",
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
      if (op.responses['201']) {
        op.responses['201'].content['application/json'].schema = guessResponseSchema(oaPath, method);
      }

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
