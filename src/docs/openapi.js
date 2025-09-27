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
  if (path.startsWith("/api/auth/")) {
    // whoami remains protected
    return !path.startsWith("/api/auth/whoami");
  }
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

// Manual overrides per path+method (add/merge params, requestBody)
const OVERRIDES = {
  "/api/public/tickets/lookup": {
    get: {
      parameters: [
        {
          name: "reference",
          in: "query",
          required: true,
          schema: { type: "string" },
          description:
            "Ticket reference/key (e.g., HD-2025-0002). Aliases: ref, key",
        },
      ],
      responses: {
        200: {
          description: "Minimal ticket status payload",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  reference: { type: "string" },
                  title: { type: "string" },
                  status: {
                    type: "object",
                    properties: {
                      code: { type: "string" },
                      name: { type: "string" },
                    },
                  },
                  priority: { type: "string", nullable: true },
                  severity: { type: "string", nullable: true },
                  created_at: { type: "string", format: "date-time" },
                  updated_at: { type: "string", format: "date-time" },
                },
              },
              examples: {
                sample: {
                  value: {
                    reference: "HD-2025-0002",
                    title: "Printer jam",
                    status: { code: "open", name: "Open" },
                    priority: "medium",
                    severity: "minor",
                    created_at: "2025-09-23T09:00:00Z",
                    updated_at: "2025-09-23T10:15:00Z",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/public/tickets": {
    post: {
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["title", "description"],
              additionalProperties: true,
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                email: { type: "string", format: "email" },
                system_id: { type: "string", format: "uuid" },
              },
            },
            example: {
              title: "Printer jam",
              description: "Keeps jamming after 3 pages",
              email: "user@example.com",
            },
          },
        },
      },
      responses: {
        201: {
          description: "Ticket created",
          content: {
            "application/json": {
              schema: { type: "object" },
              examples: {
                sample: {
                  value: {
                    id: "100",
                    ticket_key: "HD-2025-0003",
                    title: "Printer jam",
                    description: "Keeps jamming",
                    status_id: 1,
                    priority_id: 2,
                    severity_id: 1,
                    created_at: "2025-09-23T09:30:00Z",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/tickets": {
    get: {
      responses: {
        200: {
          description: "Paginated tickets list",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  items: { type: "array", items: { type: "object" } },
                  page: { type: "integer" },
                  pageSize: { type: "integer" },
                  total: { type: "integer" },
                },
              },
              examples: {
                sample: {
                  value: {
                    items: [
                      {
                        id: "100",
                        ticket_key: "HD-2025-0001",
                        title: "VPN down",
                        status_id: 1,
                      },
                      {
                        id: "101",
                        ticket_key: "HD-2025-0002",
                        title: "Printer jam",
                        status_id: 2,
                      },
                    ],
                    page: 1,
                    pageSize: 25,
                    total: 2,
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/tickets/:id": {
    get: {
      responses: {
        200: {
          description: "Ticket by id",
          content: {
            "application/json": {
              schema: { type: "object" },
              examples: {
                sample: {
                  value: {
                    id: "100",
                    ticket_key: "HD-2025-0001",
                    title: "VPN down",
                    description: "Cannot connect",
                    status_id: 1,
                    priority_id: 2,
                    severity_id: 1,
                  },
                },
              },
            },
          },
        },
        404: {
          description: "Ticket not found",
        },
      },
    },
  },
  "/api/auth/login": {
    post: {
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "password"],
              additionalProperties: false,
              properties: {
                email: { type: "string", format: "email" },
                password: { type: "string" },
              },
            },
            example: { email: "admin@eassist.local", password: "••••••" },
          },
        },
      },
      responses: {
        200: {
          description: "Login successful",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthLoginResponse" },
              examples: {
                sample: {
                  value: {
                    access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    user: {
                      id: "u_1",
                      email: "admin@eassist.local",
                      full_name: "Admin",
                      roles: ["admin"],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/auth/refresh": {
    post: {
      responses: {
        200: {
          description: "New access token",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthAccessToken" },
              examples: {
                sample: {
                  value: {
                    access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/auth/logout": {
    post: {
      responses: {
        200: {
          description: "Logged out",
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["ok"],
                properties: { ok: { type: "boolean", example: true } },
              },
              examples: { sample: { value: { ok: true } } },
            },
          },
        },
      },
    },
  },
  "/api/tokens/api-keys/:id/rotate": {
    post: {
      responses: {
        200: {
          description: "API key rotated (plaintext returned once)",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiKeyWithSecret" },
              examples: {
                rotated: {
                  value: {
                    id: "2",
                    name: "Zapier",
                    scope: "integrations",
                    is_active: true,
                    updated_at: "2025-09-23T10:10:00Z",
                    prefix: "NewPrefx",
                    api_key: "sk_live_newsecret",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  // Tickets attachments
  "/api/tickets/attachments": {
    get: {
      responses: {
        200: {
          description: "List ticket attachments",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/TicketAttachment" },
              },
              examples: {
                sample: {
                  value: [
                    {
                      id: "a1",
                      ticket_id: "100",
                      file_name: "log.txt",
                      file_type: "text/plain",
                      file_size_bytes: 1234,
                      storage_path: "/files/100/a1.log",
                      uploaded_by: "u_1",
                      uploaded_at: "2025-09-23T09:00:00Z",
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
    post: {
      responses: {
        201: {
          description: "Attachment created",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TicketAttachment" },
              examples: {
                sample: {
                  value: {
                    id: "a2",
                    ticket_id: "100",
                    file_name: "screenshot.png",
                    file_type: "image/png",
                    file_size_bytes: 204800,
                    storage_path: "/files/100/a2.png",
                    uploaded_by: "u_1",
                    uploaded_at: "2025-09-23T10:00:00Z",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/tickets/attachments/:id": {
    get: {
      responses: {
        200: {
          description: "Attachment by id",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TicketAttachment" },
            },
          },
        },
        404: { description: "Attachment not found" },
      },
    },
    put: {
      responses: {
        200: {
          description: "Attachment updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TicketAttachment" },
            },
          },
        },
      },
    },
    delete: {
      responses: {
        200: {
          description: "Attachment deleted",
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["ok"],
                properties: { ok: { type: "boolean", example: true } },
              },
            },
          },
        },
      },
    },
  },
};

function mergeOverride(op, path, method) {
  const byPath = OVERRIDES[path];
  if (!byPath) return op;
  const add = byPath[method];
  if (!add) return op;
  const merged = { ...op };
  if (add.parameters) {
    merged.parameters = [...(op.parameters || []), ...add.parameters];
  }
  if (add.requestBody) {
    merged.requestBody = add.requestBody;
  }
  if (add.responses) {
    merged.responses = { ...(op.responses || {}), ...add.responses };
  }
  return merged;
}

function buildCurlExamples(path, isPublic) {
  const base = path.replace(/\?.*$/, "");
  if (isPublic) {
    return {
      publicCurl: {
        summary: "cURL (no auth required)",
        value: `curl http://localhost:8080${base}`,
      },
    };
  }
  return {
    bearerCurl: {
      summary: "cURL with Bearer JWT",
      value: `curl -H 'Authorization: Bearer ${"{TOKEN}"}' http://localhost:8080${base}`,
    },
    basicCurl: {
      summary: "cURL with Basic auth",
      value: `curl -u 'user@example.com:password' http://localhost:8080${base}`,
    },
    apiKeyCurl: {
      summary: "cURL with API key",
      value: `curl -H 'X-API-Key: ${"{RAW_API_KEY}"}' http://localhost:8080${base}`,
    },
  };
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
          "Auto-generated endpoint. See examples for common params. Errors include endpoint-specific details and messages inline.",
        security: isNoAuthPath(e.path) ? [] : authSecurity(),
        parameters: [...params],
        responses: {
          200: {
            description: "Successful response",
            content: {
              "application/json": {
                schema: { type: "object" },
                examples: buildCurlExamples(e.path, isNoAuthPath(e.path)),
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

      if (method === "get" && pathParamNames.length === 0) {
        op.parameters = [...op.parameters, ...listQueryParams()];
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
      // Write operations already get a requestBody above; for others provide an explicit
      // non-required placeholder so the OpenAPI output always shows payload: required = true/false
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
        "Public endpoints under /api/public do not require authentication.",
        "Use /api/auth/login to obtain tokens, /api/resources to list endpoints, and /api/info for diagnostics.",
        "",
        "Errors are documented inline per operation, extending ErrorResponseBase with endpoint-appropriate details and example messages.",
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
