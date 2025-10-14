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

  // User-facing Messages
  "/api/messages/inbox": {
    get: {
      summary: "My inbox",
      description: "List IN_APP messages for the authenticated user.",
      parameters: [
        { name: "unread", in: "query", schema: { type: "string", enum: ["true","false"] }, description: "Filter only unread messages when true" }
      ],
      responses: {
        200: {
          description: "Inbox list",
          content: { 'application/json': { examples: { payload: { value: { items: [ { id: "00000000-0000-0000-0000-000000000001", channel: "IN_APP", subject: "Welcome", body: "Thanks for joining", to_user_id: "30000000-0000-0000-0000-000000000001" } ], page: 1, pageSize: 20, total: 1 } } } } }
        }
      }
    }
  },
  "/api/messages/inbox/{id}": {
    get: { summary: "Get inbox message", description: "Get a single IN_APP message in your inbox by id." }
  },
  "/api/messages/inbox/{id}/read": {
    post: { summary: "Mark read", description: "Mark a specific IN_APP inbox message as read." }
  },
  "/api/messages/stream": {
    get: {
      summary: "Message stream (SSE)",
      description: "Server-Sent Events stream for real-time in-app message notifications for the authenticated user.",
      responses: {
        200: {
          description: "SSE stream",
          content: {
            'text/event-stream': {
              schema: { type: 'string', description: 'Event stream' },
              examples: { hello: { value: `: connected\n\n` } }
            }
          }
        }
      }
    }
  },
  "/api/messages/send": {
    post: {
      summary: "Send in-app message",
      description: "Send an IN_APP message to a user.",
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['to_user_id'],
              properties: {
                to_user_id: { type: 'string', format: 'uuid' },
                subject: { type: 'string' },
                body: { type: 'string' },
                body_html: { type: 'string' },
                template_code: { type: 'string' },
                attachments: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['file_url'],
                    properties: {
                      file_url: { type: 'string' },
                      file_name: { type: 'string' },
                      content_type: { type: 'string' },
                      size_bytes: { type: 'integer' }
                    }
                  }
                }
              }
            },
            examples: { basic: { value: { to_user_id: '30000000-0000-0000-0000-000000000001', subject: 'Hello', body: 'Welcome to eAssist', attachments: [ { file_url: 'https://files.example.com/welcome.pdf', file_name: 'welcome.pdf' } ] } } }
          }
        }
      },
      responses: { '201': { description: 'Queued IN_APP message' } },
      // Clarify permission requirement
      "x-permissions-any": ["system.messages.send"]
    }
  },
  "/api/messages/sms/send": {
    post: {
      summary: "Send SMS message",
      description: "Queue an SMS message. Requires system.messages.send permission.",
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['to_phone','body'],
              properties: {
                to_phone: { type: 'string' },
                body: { type: 'string' }
              }
            },
            examples: { sms: { value: { to_phone: '+15551234567', body: 'Your OTP is 123456' } } }
          }
        }
      },
      responses: { '201': { description: 'Queued SMS', content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } } } },
      "x-permissions-any": ["system.messages.send"]
    }
  },
  "/api/messages/email/send": {
    post: {
      summary: "Send EMAIL message",
      description: "Queue an EMAIL message. Requires system.messages.send permission.",
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['to_email'],
              properties: {
                to_email: { type: 'string' },
                subject: { type: 'string' },
                body: { type: 'string' }
              }
            },
            examples: { email: { value: { to_email: 'user@example.com', subject: 'Hello', body: 'Welcome!' } } }
          }
        }
      },
      responses: { '201': { description: 'Queued EMAIL', content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } } } },
      "x-permissions-any": ["system.messages.send"]
    }
  },

  // System: Messages
  "/api/system/messages": {
    get: {
      summary: "List messages",
      description: "List messages across channels with pagination and filtering.",
      parameters: [
        { name: "channel", in: "query", schema: { type: "string", enum: ["EMAIL","SMS","IN_APP","WHATSAPP","TELEGRAM"] }, description: "Filter by channel" },
        { name: "status", in: "query", schema: { type: "string", enum: ["queued","sent","failed","read"] }, description: "Filter by status" },
        { name: "to_user_id", in: "query", schema: { type: "string", format: "uuid" }, description: "Filter by recipient user id" },
        { name: "to_email", in: "query", schema: { type: "string" }, description: "Filter by recipient email" },
        { name: "to_phone", in: "query", schema: { type: "string" }, description: "Filter by recipient phone" },
      ],
      responses: {
        200: { description: "List of messages", content: { 'application/json': { schema: { type: 'object', properties: { items: { type: 'array', items: { $ref: '#/components/schemas/Message' } }, page: { type: 'integer' }, pageSize: { type: 'integer' }, total: { type: 'integer' } } } } } }
      }
    },
    post: {
      summary: "Queue a message",
      description: "Queue a message to be sent via EMAIL, SMS, IN_APP, WHATSAPP, or TELEGRAM.",
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/MessageCreate' },
            examples: {
              email: { value: { channel: 'EMAIL', to_user_id: '30000000-0000-0000-0000-000000000001', subject: 'Hello', body: 'Welcome!' } },
              sms: { value: { channel: 'SMS', to_phone: '+256700000000', body: 'Your code is 1234' } },
              inapp: { value: { channel: 'IN_APP', to_user_id: '30000000-0000-0000-0000-000000000001', body: 'New ticket assigned' } }
            }
          }
        }
      },
      responses: { '201': { description: 'Queued message', content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } } } }
    }
  },
  "/api/system/messages/{id}": {
    get: { summary: "Get message", description: "Get a message by id." },
    put: {
      summary: "Update message status",
      description: "Update status, timestamps, or provider metadata for a message.",
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageUpdate' } } } },
      responses: { '200': { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } } } }
    }
  },
  "/api/system/messages/{id}/send": {
    post: { summary: "Re-queue message", description: "Re-queue a message for sending; sets status=queued and scheduled_at if not set." }
  },
  "/api/system/messages/inbox": {
    get: {
      summary: "My inbox",
      description: "List IN_APP messages for the authenticated user.",
      parameters: [ { name: "unread", in: "query", schema: { type: "string", enum: ["true","false"] }, description: "Filter only unread messages when true" } ],
      responses: { 200: { description: 'Inbox', content: { 'application/json': { schema: { type: 'object', properties: { items: { type: 'array', items: { $ref: '#/components/schemas/Message' } }, page: { type: 'integer' }, pageSize: { type: 'integer' }, total: { type: 'integer' } } } } } } }
    }
  },
  "/api/system/messages/inbox/{id}/read": {
    post: { summary: "Mark read", description: "Mark a specific IN_APP message as read." }
  },

  // System: Settings - Messaging providers
  "/api/system/settings/messaging/providers": {
    get: {
      summary: "List message providers",
      description: "List configured messaging providers. Filter by channel with ?channel=EMAIL|SMS|WHATSAPP|TELEGRAM.",
      parameters: [ { name: "channel", in: "query", schema: { type: "string", enum: ["EMAIL","SMS","WHATSAPP","TELEGRAM"] } } ],
      responses: { 200: { description: "Providers", content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/MessageProvider' } } } } } }
    },
    post: {
      summary: "Create provider",
      description: "Create a messaging provider with optional is_default (enforces single default per channel).",
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageProviderCreate' }, examples: { sms: { value: { name: 'Twilio', channel: 'SMS', is_active: true, is_default: true, config: { account_sid: 'AC..', auth_token: '***', from: '+15551234567' } } } } } } },
      responses: { 201: { description: "Created", content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageProvider' } } } } }
    }
  },
  "/api/system/settings/messaging/providers/{id}": {
    get: { summary: "Get provider", description: "Get a messaging provider by id." },
    put: { summary: "Update provider", description: "Update provider fields; setting is_default=true makes it the default for its channel.", requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageProviderUpdate' } } } } },
    delete: { summary: "Delete provider", description: "Delete a messaging provider." }
  },
  "/api/system/settings/messaging/providers/{id}/default": {
    post: { summary: "Set default provider", description: "Mark provider as default for its channel (clears others)." }
  },

  // System: Settings - OTP
  "/api/system/settings/messaging/otp": {
    get: { summary: "Get OTP settings", description: "Get OTP enablement and channel configuration." },
    put: {
      summary: "Update OTP settings",
      description: "Enable/disable OTP and select channels. Enabling requires SMTP or EMAIL provider for EMAIL, and default SMS provider for SMS.",
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/OtpSettings' }, examples: { enableSms: { value: { enabled: true, channels: ["SMS"], code_ttl_sec: 300, max_attempts: 5 } } } } } },
      responses: { 200: { description: "Saved", content: { 'application/json': { schema: { $ref: '#/components/schemas/OtpSettings' } } } } }
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

function buildOperation(method, rawPath, isPublic) {
  const m = method.toLowerCase();
  const params = extractPathParams(rawPath).map((name) => ({
    name,
    in: "path",
    required: true,
    schema: { type: "string" },
  }));
  const op = {
    summary: opSummary(method, rawPath),
    description: defaultDescription(method, rawPath),
    tags: [tagFor(rawPath)],
    parameters: params,
    responses: {},
  };
  // Default success response per method
  const successCode = m === "post" ? "201" : m === "delete" ? "204" : "200";
  const curl = buildCurlExamples(rawPath, method, !!isPublic);
  op.responses[successCode] = {
    description: m === "post" ? "Created" : m === "delete" ? "No Content" : "OK",
    content: {
      "application/json": {
        schema: { type: "object", additionalProperties: true },
        examples: curl,
      },
    },
  };
  // Standard error responses
  const errs = errorExamples(rawPath, m);
  for (const code of ["400", "401", "403", "404", "500"]) {
    const ex = examplesForStatus(code, errs);
    op.responses[code] = {
      description:
        code === "400"
          ? "Bad Request"
          : code === "401"
          ? "Unauthorized"
          : code === "403"
          ? "Forbidden"
          : code === "404"
          ? "Not Found"
          : "Internal Server Error",
      content: {
        "application/json": {
          schema: inlineErrorSchema(rawPath, m),
          ...(ex ? { examples: ex } : {}),
        },
      },
    };
  }
  return op;
}

export default function buildOpenApi(app) {
  const { version, build, git_sha } = getVersionInfo();
  const endpoints = listEndpoints(app);
  const paths = {};

  for (const ep of endpoints) {
    const rawPath = ep.path;
    const oaPath = expressToOpenApiPath(rawPath);
    const methods = (ep.methods || []).map((m) => m.toLowerCase());
    if (!paths[oaPath]) paths[oaPath] = {};
    for (const m of methods) {
      // Skip HEAD/OPTIONS
      if (["head", "options"].includes(m)) continue;
      const isPublic = isNoAuthPath(rawPath, m);
      let op = buildOperation(m, rawPath, isPublic);
      // Security for protected endpoints
      if (!isPublic) op.security = authSecurity();
      // Allow manual overrides
      op = mergeOverride(op, rawPath, m);
      paths[oaPath][m] = op;
    }
  }

  // Components (security + minimal schemas used by overrides)
  const doc = {
    openapi: "3.0.3",
    info: {
      title: "eAssist API",
      description:
        "Auto-generated OpenAPI from Express routes with manual overrides for schemas and examples.",
      version,
      ...(build ? { 'x-build': build } : {}),
      ...(git_sha ? { 'x-git-sha': git_sha } : {}),
    },
    servers: [{ url: "http://localhost:8080", description: "Local" }],
    tags: [],
    paths,
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
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
              },
            },
            details: { type: "object", additionalProperties: true },
            request_id: { type: "string" },
            path: { type: "string" },
            method: { type: "string" },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        MessageProvider: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            channel: { type: "string", enum: ["EMAIL", "SMS", "WHATSAPP", "TELEGRAM"] },
            config: { type: "object", additionalProperties: true },
            is_active: { type: "boolean" },
            is_default: { type: "boolean" },
            description: { type: "string", nullable: true },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        MessageProviderCreate: {
          type: "object",
          required: ["name", "channel"],
          properties: {
            name: { type: "string" },
            channel: { type: "string", enum: ["EMAIL", "SMS", "WHATSAPP", "TELEGRAM"] },
            config: { type: "object", additionalProperties: true },
            is_active: { type: "boolean" },
            is_default: { type: "boolean" },
            description: { type: "string" },
          },
        },
        MessageProviderUpdate: {
          type: "object",
          properties: {
            name: { type: "string" },
            channel: { type: "string", enum: ["EMAIL", "SMS", "WHATSAPP", "TELEGRAM"] },
            config: { type: "object", additionalProperties: true },
            is_active: { type: "boolean" },
            is_default: { type: "boolean" },
            description: { type: "string" },
          },
        },
        OtpSettings: {
          type: "object",
          properties: {
            enabled: { type: "boolean" },
            channels: { type: "array", items: { type: "string", enum: ["SMS", "EMAIL"] } },
            code_ttl_sec: { type: "integer", minimum: 30 },
            max_attempts: { type: "integer", minimum: 1 },
          },
        },
        Message: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            channel: { type: "string", enum: ["EMAIL", "SMS", "IN_APP", "WHATSAPP", "TELEGRAM"] },
            to_user_id: { type: "string", format: "uuid" },
            to_email: { type: "string" },
            to_phone: { type: "string" },
            subject: { type: "string" },
            body: { type: "string" },
            body_html: { type: "string" },
            template_code: { type: "string" },
            status: { type: "string" },
            scheduled_at: { type: "string", format: "date-time" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        MessageCreate: {
          type: "object",
          properties: {
            channel: { type: "string", enum: ["EMAIL", "SMS", "IN_APP", "WHATSAPP", "TELEGRAM"] },
            to_user_id: { type: "string", format: "uuid" },
            to_email: { type: "string" },
            to_phone: { type: "string" },
            subject: { type: "string" },
            body: { type: "string" },
            body_html: { type: "string" },
            template_code: { type: "string" },
            attachments: { type: "array", items: { type: "object" } },
          },
        },
        MessageUpdate: {
          type: "object",
          properties: {
            status: { type: "string" },
            sent_at: { type: "string", format: "date-time" },
            read_at: { type: "string", format: "date-time" },
            provider_message_id: { type: "string" },
            provider_response: { type: "object" },
          },
        },
        // Knowledge-related minimal schemas (placeholders)
        FAQ: { type: "object", properties: { id: { type: "string", format: "uuid" }, title: { type: "string" }, body: { type: "string" }, is_published: { type: "boolean" } } },
        KBArticle: { type: "object", properties: { id: { type: "string", format: "uuid" }, title: { type: "string" }, body: { type: "string" }, is_published: { type: "boolean" } } },
        Video: { type: "object", properties: { id: { type: "string", format: "uuid" }, title: { type: "string" }, url: { type: "string" }, duration_seconds: { type: "integer" } } },
        KBRating: { type: "object", properties: { id: { type: "string", format: "uuid" }, article_id: { type: "string", format: "uuid" }, user_id: { type: "string", format: "uuid" }, rating: { type: "integer", minimum: 1, maximum: 5 } } },
        KBRatingSummary: { type: "object", properties: { avg: { type: "number" }, count: { type: "integer" } } },
        KBTag: { type: "object", properties: { id: { type: "string", format: "uuid" }, name: { type: "string" } } },
        KBArticleTag: { type: "object", properties: { article_id: { type: "string", format: "uuid" }, tag_id: { type: "string", format: "uuid" } } },
        KBArticleTagEntry: { type: "object", properties: { tag_id: { type: "string", format: "uuid" }, name: { type: "string" } } },
        KnowledgeSearchResult: { type: "object", properties: { faqs: { type: "array", items: { $ref: "#/components/schemas/FAQ" } }, kb: { type: "array", items: { $ref: "#/components/schemas/KBArticle" } }, videos: { type: "array", items: { $ref: "#/components/schemas/Video" } } } },
      },
    },
  };

  // Collect unique tags from paths
  const tagSet = new Set();
  for (const [p, methods] of Object.entries(paths)) {
    for (const [m, op] of Object.entries(methods)) {
      if (Array.isArray(op.tags)) for (const t of op.tags) tagSet.add(t);
    }
  }
  doc.tags = Array.from(tagSet).sort().map((name) => ({ name }));

  return doc;
}
