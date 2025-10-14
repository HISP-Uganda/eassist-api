import listEndpoints from "express-list-endpoints";
import { getVersionInfo } from "../utils/version.js";

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
  // Removed /api/info from public endpoints; it now requires authentication
  if (path === "/api/resources") return true;
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

function selectParam() {
  return {
    name: "select",
    in: "query",
    required: false,
    schema: { type: "string" },
    description:
      "Bracket projection to shape nested data and expansions in one param. Example: users[id,full_name,roles[id,name,permissions[code]]]. Overrides 'fields' and 'expand'. Use fields='*' to bypass projection.",
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
  },

  // Public ratings endpoints
  "/api/public/faqs/{id}/rate": {
    post: {
      summary: "Rate a FAQ",
      description: "Submit a rating (1..5) for a published FAQ. Authenticated users upsert by user_id; anonymous may include fingerprint.",
      parameters: [ { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } } ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object', required: ['rating'], properties: { rating: { type: 'integer', minimum: 1, maximum: 5 }, fingerprint: { type: 'string' } } },
            examples: { payload: { value: { rating: 5, fingerprint: "anon-device-123" } } }
          }
        }
      },
      responses: { 201: { description: 'Created/Updated', content: { 'application/json': { schema: { type: 'object', properties: { rating: { type: 'object' }, summary: { $ref: '#/components/schemas/KBRatingSummary' } } } } } } }
    }
  },
  "/api/public/kb/articles/{id}/rate": {
    post: {
      summary: "Rate a KB article",
      description: "Submit a rating (1..5) for a published KB article. Authenticated users upsert by user_id; anonymous may include fingerprint.",
      parameters: [ { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } } ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object', required: ['rating'], properties: { rating: { type: 'integer', minimum: 1, maximum: 5 }, fingerprint: { type: 'string' } } },
            examples: { payload: { value: { rating: 4 } } }
          }
        }
      },
      responses: { 201: { description: 'Created/Updated', content: { 'application/json': { schema: { type: 'object', properties: { rating: { type: 'object' }, summary: { $ref: '#/components/schemas/KBRatingSummary' } } } } } } }
    }
  },
  "/api/public/videos/{id}/rate": {
    post: {
      summary: "Rate a video",
      description: "Submit a rating (1..5) for a published video. Authenticated users upsert by user_id; anonymous may include fingerprint.",
      parameters: [ { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } } ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object', required: ['rating'], properties: { rating: { type: 'integer', minimum: 1, maximum: 5 }, fingerprint: { type: 'string' } } },
            examples: { payload: { value: { rating: 3, fingerprint: "device-abc" } } }
          }
        }
      },
      responses: { 201: { description: 'Created/Updated', content: { 'application/json': { schema: { type: 'object', properties: { rating: { type: 'object' }, summary: { $ref: '#/components/schemas/KBRatingSummary' } } } } } } }
    }
  },

  // Public rating summary endpoints
  "/api/public/faqs/{id}/ratings/summary": {
    get: {
      summary: "FAQ rating summary",
      description: "Return average rating and total ratings (count) for a published FAQ.",
      parameters: [ { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } } ],
      responses: {
        200: {
          description: "Summary",
          content: { 'application/json': { schema: { $ref: '#/components/schemas/KBRatingSummary' }, examples: { payload: { value: { avg: 4.7, count: 12 } } } } }
        }
      }
    }
  },
  "/api/public/kb/articles/{id}/ratings/summary": {
    get: {
      summary: "KB article rating summary",
      description: "Return average rating and total ratings (count) for a published KB article.",
      parameters: [ { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } } ],
      responses: {
        200: {
          description: "Summary",
          content: { 'application/json': { schema: { $ref: '#/components/schemas/KBRatingSummary' }, examples: { payload: { value: { avg: 4.2, count: 34 } } } } }
        }
      }
    }
  },
  "/api/public/videos/{id}/ratings/summary": {
    get: {
      summary: "Video rating summary",
      description: "Return average rating and total ratings (count) for a published video.",
      parameters: [ { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } } ],
      responses: {
        200: {
          description: "Summary",
          content: { 'application/json': { schema: { $ref: '#/components/schemas/KBRatingSummary' }, examples: { payload: { value: { avg: 3.9, count: 18 } } } } }
        }
      }
    }
  },

  // Server info must be protected; document role requirement
  "/api/info": {
    get: {
      summary: "Server info",
      description: "Service health and environment details. Authentication required; available to Admin or Superuser.",
      // Custom extension to clarify required roles
      "x-roles-any": ["Admin", "Superuser"]
    }
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
  // Merge custom extensions (keys starting with x-)
  for (const [k, v] of Object.entries(o)) {
    if (k.startsWith('x-')) next[k] = v;
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
  if (!errExamples) return undefined;
  if (code === "400") return pick(["validation", "missingReference", "badRequest"]);
  if (code === "401") return pick(["unauthorized"]);
  if (code === "403") return pick(["forbidden"]);
  if (code === "404") return pick(["notFound"]);
  if (code === "500") return pick(["unexpected"]);
  return undefined;
}

function buildPaths(app) {
  const endpoints = listEndpoints(app) || [];
  // Filter to API routes only
  const apiOnly = endpoints.filter((e) => e.path && e.path.startsWith("/api"));
  const paths = {};
  for (const e of apiOnly) {
    const rawPath = e.path; // express-style path
    const oaPath = expressToOpenApiPath(rawPath);
    const methods = (e.methods || []).map((m) => String(m).toLowerCase());
    if (!paths[oaPath]) paths[oaPath] = {};
    for (const method of methods) {
      const hasId = /\{[a-zA-Z0-9_]+\}/.test(oaPath);
      const op = {
        tags: [tagFor(rawPath)],
        summary: opSummary(method, rawPath),
        description: defaultDescription(method, rawPath),
        parameters: [],
        responses: {
          200: {
            description: "OK",
            content: { "application/json": { schema: { type: "object" } } },
          },
        },
        security: isNoAuthPath(rawPath, method) ? [] : authSecurity(),
      };
      // Add projection query params for response shaping
      if (["get","post","put","patch"].includes(method)) {
        op.parameters.push(selectParam());
        op.parameters.push(fieldsParam());
        op.parameters.push(expandParam());
      }
      // List-like endpoints (no {id}) get pagination and q for GET
      if (method === "get" && !hasId) {
        for (const p of listQueryParams()) op.parameters.push(p);
      }
      // Merge overrides
      const merged = mergeOverride(op, rawPath, method);
      // Add minimal error responses with examples where available
      const errs = errorExamples(rawPath, method);
      const statusCodes = ["400", "401", "403", "404", "500"];
      merged.responses = merged.responses || {};
      for (const sc of statusCodes) {
        const ex = examplesForStatus(sc, errs);
        if (!ex) continue;
        merged.responses[sc] = {
          description: sc === "400" ? "Bad Request" : sc === "401" ? "Unauthorized" : sc === "403" ? "Forbidden" : sc === "404" ? "Not Found" : "Internal Server Error",
          content: { "application/json": { examples: ex } },
        };
      }
      paths[oaPath][method] = merged;
    }
  }
  // Ensure OVERRIDES-only endpoints are included (e.g., /api/info)
  for (const [rawPath, methods] of Object.entries(OVERRIDES)) {
    const oaPath = expressToOpenApiPath(rawPath);
    if (!paths[oaPath]) paths[oaPath] = {};
    for (const method of Object.keys(methods)) {
      if (paths[oaPath][method]) continue; // already defined via express
      const hasId = /\{[a-zA-Z0-9_]+\}/.test(oaPath);
      const baseOp = {
        tags: [tagFor(rawPath)],
        summary: opSummary(method, rawPath),
        description: defaultDescription(method, rawPath),
        parameters: [],
        responses: {
          200: { description: "OK", content: { "application/json": { schema: { type: "object" } } } },
        },
        security: isNoAuthPath(rawPath, method) ? [] : authSecurity(),
      };
      if (["get","post","put","patch"].includes(method)) {
        baseOp.parameters.push(selectParam());
        baseOp.parameters.push(fieldsParam());
        baseOp.parameters.push(expandParam());
        if (method === "get" && !hasId) {
          for (const p of listQueryParams()) baseOp.parameters.push(p);
        }
      }
      const merged = mergeOverride(baseOp, rawPath, method);
      const errs = errorExamples(rawPath, method);
      const statusCodes = ["400", "401", "403", "404", "500"];
      merged.responses = merged.responses || {};
      for (const sc of statusCodes) {
        const ex = examplesForStatus(sc, errs);
        if (!ex) continue;
        merged.responses[sc] = {
          description: sc === "400" ? "Bad Request" : sc === "401" ? "Unauthorized" : sc === "403" ? "Forbidden" : sc === "404" ? "Not Found" : "Internal Server Error",
          content: { "application/json": { examples: ex } },
        };
      }
      paths[oaPath][method] = merged;
    }
  }
  return paths;
}

export default function buildOpenApi(app) {
  const vi = getVersionInfo();
  const longDesc = [
    "Automatically generated OpenAPI spec based on Express routes, with manual overrides for selected endpoints.",
    "\n\nProjection:",
    "- Use select for bracket projection to choose nested fields and expansions in one param: select=users[id,email,roles[id,name,permissions[code]]]",
    "- Or use fields (comma list) and expand (comma list) separately. If both are provided, select takes precedence.",
    "- Special case: fields='*' returns full objects (bypass projection).",
  ].join("\n");
  const doc = {
    openapi: "3.0.3",
    info: {
      title: "eAssist API",
      version: vi?.version || "0.0.0",
      description: longDesc,
      "x-build": vi?.build || null,
      "x-git-sha": vi?.git_sha || null,
    },
    servers: [ { url: "http://localhost:8080" } ],
    paths: buildPaths(app),
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        basicAuth: { type: "http", scheme: "basic" },
        apiKeyAuth: { type: "apiKey", in: "header", name: "X-API-Key" },
        cookieAuth: { type: "apiKey", in: "cookie", name: "access_token" },
      },
      schemas: {
        ErrorResponseBase: {
          type: "object",
          properties: {
            ok: { type: "boolean", example: false },
            error: { type: "object", properties: { code: { type: "string" }, message: { type: "string" } } },
            details: { type: "object", additionalProperties: true },
            request_id: { type: "string" },
            path: { type: "string" },
            method: { type: "string" },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        KBRatingSummary: {
          type: "object",
          properties: { avg: { type: "number" }, count: { type: "integer" } },
        },
        KBArticleTag: {
          type: "object",
          required: ["article_id", "tag_id"],
          properties: { article_id: { type: "string", format: "uuid" }, tag_id: { type: "string", format: "uuid" } },
        },
        KBArticleTagEntry: {
          type: "object",
          properties: { tag_id: { type: "string", format: "uuid" }, name: { type: "string" } },
        },
        KBTag: { type: "object", required: ["name"], properties: { id: { type: "string", format: "uuid" }, name: { type: "string" } } },
        KBArticle: { type: "object", required: ["title"], properties: { id: { type: "string", format: "uuid" }, title: { type: "string" }, body: { type: "string" }, is_published: { type: "boolean" }, created_at: { type: "string", format: "date-time" } } },
        FAQ: { type: "object", required: ["title"], properties: { id: { type: "string", format: "uuid" }, title: { type: "string" }, body: { type: "string" }, is_published: { type: "boolean" }, system_category_id: { type: "integer", nullable: true }, created_at: { type: "string", format: "date-time" } } },
        Video: { type: "object", required: ["title"], properties: { id: { type: "string", format: "uuid" }, title: { type: "string" }, description: { type: "string" }, category_id: { type: "string", format: "uuid" }, system_category_id: { type: "integer" }, url: { type: "string" }, duration_seconds: { type: "integer" }, language: { type: "string" }, is_published: { type: "boolean" }, created_at: { type: "string", format: "date-time" } } },
        KBRating: { type: "object", required: ["article_id", "rating"], properties: { id: { type: "string", format: "uuid" }, article_id: { type: "string", format: "uuid" }, user_id: { type: "string", format: "uuid" }, rating: { type: "integer", minimum: 1, maximum: 5 }, created_at: { type: "string", format: "date-time" } } },
        KnowledgeSearchResult: {
          type: "object",
          properties: {
            faqs: { type: "array", items: { type: "object", properties: { id: { type: "string", format: "uuid" }, title: { type: "string" } } } },
            kb: { type: "array", items: { type: "object", properties: { id: { type: "string", format: "uuid" }, title: { type: "string" } } } },
            videos: { type: "array", items: { type: "object", properties: { id: { type: "string", format: "uuid" }, title: { type: "string" } } } },
          },
        },
      },
    },
  };
  return doc;
}
