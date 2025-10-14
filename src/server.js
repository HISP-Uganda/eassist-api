import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import dotenv from "dotenv";
import api from "./webapi.js";
import pool from "./db/pool.js";
import listEndpoints from "express-list-endpoints";
import cookieParser from "cookie-parser";
import buildOpenApi from "./docs/openapi.js";
import swaggerUi from "swagger-ui-express";
import { NotFound, Internal } from "./utils/errors.js";
import auditLogger from "./middleware/audit-logger.js";
import { auditLog } from "./utils/logger.js";
import { getVersionInfo } from "./utils/version.js";
dotenv.config();
const app = express();
app.set("trust proxy", true); // or app.set('trust proxy', 1);

// Request ID middleware
app.use((req, res, next) => {
  const rid = (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 8)
  ).toUpperCase();
  req.request_id = rid;
  res.locals.request_id = rid;
  res.setHeader("X-Request-Id", rid);
  next();
});

// Build CORS options from env
const origins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const corsOptions = origins.length
  ? {
      origin: function (origin, cb) {
        if (!origin) return cb(null, true);
        if (origins.includes(origin)) return cb(null, true);
        return cb(new Error("Not allowed by CORS"));
      },
      credentials: true,
    }
  : { origin: true, credentials: true };
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
// Structured audit logger (JSON lines to console and optional file)
app.use(auditLogger);
app.use(morgan("dev"));
app.use("/api", api);
// OpenAPI JSON
app.get("/api/docs.json", (req, res, next) => {
  try {
    res.json(buildOpenApi(app));
  } catch (e) {
    next(Internal(e.message));
  }
});
// Swagger UI (loads the JSON from /api/docs.json)
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(null, {
    swaggerOptions: { url: "/api/docs.json" },
    customSiteTitle: "eAssist API Docs",
  })
);
app.get("/api/info", async (req, res) => {
  const startTime = new Date(Date.now() - Math.round(process.uptime() * 1000));
  const routes = listEndpoints(app) || [];
  const apiRoutes = routes.filter((r) => r.path.startsWith("/api"));
  const methodCounts = apiRoutes.reduce((acc, r) => {
    for (const m of r.methods) {
      acc[m] = (acc[m] || 0) + 1;
    }
    return acc;
  }, {});
  const buildInfo = getVersionInfo();
  const result = {
    ok: true,
    version: buildInfo.version,
    name: "eAssist API",
    env: process.env.NODE_ENV || "development",
    build: buildInfo,
    start_time: startTime.toISOString(),
    uptime_seconds: Math.round(process.uptime()),
    now: new Date().toISOString(),
    process: {
      node: process.version,
      pid: process.pid,
      platform: process.platform,
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    },
    config: {
      port: Number(process.env.PORT || 8080),
      cors_origins: process.env.CORS_ORIGINS || "*",
      access_token_ttl_min: Number(process.env.ACCESS_TOKEN_TTL_MIN || 30),
      refresh_token_ttl_days: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7),
    },
    routes: {
      count: apiRoutes.length,
      by_method: methodCounts,
    },
    request_id: req.request_id,
  };
  try {
    const [
      dbMetaQ,
      dbVerQ,
      dbExtQ,
      usersQ,
      ticketsQ,
      openTicketsQ,
      kbQ,
      faqsQ,
      sessionsQ,
      activeUsersQ,
      recentUsersQ,
      orgQ,
      authMethodsQ,
      apiKeysQ,
      activeSessionsQ,
    ] = await Promise.all([
      pool.query(
        "SELECT current_database() as database, now() as now, pg_database_size(current_database()) as size_bytes"
      ),
      pool.query("SELECT version()"),
      pool.query("SELECT extname FROM pg_extension ORDER BY extname"),
      pool.query("SELECT count(*)::int AS c FROM users"),
      pool.query("SELECT count(*)::int AS c FROM tickets"),
      pool.query(
        "SELECT count(*)::int AS c FROM tickets t JOIN statuses s ON t.status_id=s.id WHERE s.code NOT IN ('resolved','closed')"
      ),
      pool.query("SELECT count(*)::int AS c FROM kb_articles"),
      pool.query("SELECT count(*)::int AS c FROM faqs"),
      pool.query(
        "SELECT count(*)::int AS c FROM user_sessions WHERE expires_at > now()"
      ),
      pool.query(
        "SELECT count(*)::int AS c FROM (SELECT DISTINCT user_id FROM user_sessions WHERE expires_at > now()) x"
      ),
      pool.query(
        "SELECT u.id, u.email, max(us.created_at) AS last_login FROM user_sessions us JOIN users u ON u.id=us.user_id WHERE us.expires_at > now() GROUP BY u.id,u.email ORDER BY last_login DESC LIMIT 5"
      ),
      pool.query(
        "SELECT org_name, timezone, locale FROM general_settings WHERE id=TRUE"
      ),
      pool.query(
        "SELECT local_enabled, google_oauth_enabled, microsoft_oauth_enabled, saml_enabled FROM auth_methods_settings WHERE id=TRUE"
      ),
      pool.query(
        "SELECT count(*)::int AS c FROM api_keys WHERE is_active = TRUE"
      ),
      pool.query(
        "SELECT us.id, us.user_id, u.email, us.user_agent, us.ip_address, us.expires_at FROM user_sessions us JOIN users u ON u.id=us.user_id WHERE us.expires_at > now() ORDER BY us.created_at DESC LIMIT 10"
      ),
    ]);
    const dbMeta = dbMetaQ.rows[0] || {};
    result.db = {
      ok: true,
      database: dbMeta.database,
      now: dbMeta.now,
      size_bytes: Number(dbMeta.size_bytes || 0),
      version: dbVerQ.rows[0]?.version,
      extensions: dbExtQ.rows.map((r) => r.extname),
    };
    result.stats = {
      users_total: usersQ.rows[0]?.c || 0,
      tickets_total: ticketsQ.rows[0]?.c || 0,
      tickets_open: openTicketsQ.rows[0]?.c || 0,
      kb_articles_total: kbQ.rows[0]?.c || 0,
      faqs_total: faqsQ.rows[0]?.c || 0,
      sessions_active: sessionsQ.rows[0]?.c || 0,
      active_users: activeUsersQ.rows[0]?.c || 0,
      recent_active_users: recentUsersQ.rows.map((r) => ({
        id: r.id,
        email: r.email,
        last_login: r.last_login,
      })),
    };
    result.settings = {
      org: orgQ.rows[0] || {},
      auth_methods: authMethodsQ.rows[0] || {},
      api_keys_active: apiKeysQ.rows[0]?.c || 0,
    };
    result.active_sessions = activeSessionsQ.rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      email: r.email,
      user_agent: r.user_agent,
      ip: r.ip_address,
      expires_at: r.expires_at,
    }));
  } catch (e) {
    result.db = { ok: false, error: e.message };
  }
  res.json(result);
});
app.get("/api/resources", (req, res) => {
  // Enumerate all endpoints and methods under /api
  const all = listEndpoints(app) || [];
  const items = all
    .filter((r) => r.path.startsWith("/api"))
    .map((r) => ({ path: r.path, methods: r.methods.sort() }));
  // Deduplicate identical entries
  const seen = new Map();
  for (const it of items) {
    const key = it.path;
    if (!seen.has(key)) {
      seen.set(key, new Set(it.methods));
    } else {
      it.methods.forEach((m) => seen.get(key).add(m));
    }
  }
  const list = Array.from(seen.entries())
    .map(([path, methodsSet]) => ({
      path,
      methods: Array.from(methodsSet).sort(),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
  res.json({
    ok: true,
    count: list.length,
    resources: list,
    request_id: req.request_id,
  });
});

// Helper to suggest close endpoints for 404s
function suggestEndpoints(app, givenPath) {
  try {
    const clean = String(givenPath || "").split("?")[0];
    const segs = clean.split("/").filter(Boolean);
    const prefixes = new Set();
    if (segs.length >= 2) prefixes.add("/" + segs.slice(0, 2).join("/"));
    if (segs.length >= 3) prefixes.add("/" + segs.slice(0, 3).join("/"));
    if (!prefixes.size) prefixes.add("/api");
    const all = listEndpoints(app) || [];
    const apiOnly = all.filter((e) => e.path && e.path.startsWith("/api"));
    const seen = new Map();
    for (const e of apiOnly) {
      for (const p of prefixes) {
        if (e.path.startsWith(p)) {
          if (!seen.has(e.path)) seen.set(e.path, new Set());
          for (const m of e.methods || []) {
            seen.get(e.path).add(m);
          }
        }
      }
    }
    return Array.from(seen.entries())
      .map(([path, methodsSet]) => ({
        path,
        methods: Array.from(methodsSet).sort(),
      }))
      .sort((a, b) => a.path.localeCompare(b.path));
  } catch {
    return [];
  }
}

// Catch-all 404 for API
app.use("/api", (req, res, next) => {
  const suggestions = suggestEndpoints(app, req.originalUrl);
  return next(NotFound("Resource not found", { suggestions }));
});

// Global error handler (last)
app.use((err, req, res, _next) => {
  const status = Number(err?.status || 500);
  const code = err?.code || (status >= 500 ? "INTERNAL_ERROR" : "ERROR");
  const message = err?.message || "Internal Server Error";
  const payload = {
    ok: false,
    error: { code, message },
    details: err?.details || null,
    request_id: req.request_id,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  };
  // Emit structured error audit log (redacted minimal details)
  const user = (() => {
    const u = req.user || {};
    const apiKey = u.api_key ? { id: u.api_key.id, name: u.api_key.name } : null;
    return { sub: u.sub || null, email: u.email || null, roles: u.roles || null, api_key: apiKey };
  })();
  try {
    auditLog({
      type: "error",
      ts: payload.timestamp,
      request_id: payload.request_id,
      method: payload.method,
      path: payload.path,
      status,
      code,
      message,
      user,
      has_details: Boolean(payload.details),
    });
  } catch {}
  // Hide stack unless in development
  if (
    (process.env.NODE_ENV || "").toLowerCase() === "development" &&
    err?.stack
  ) {
    payload.stack = String(err.stack).split("\n");
  }
  res.status(status).json(payload);
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("eAssist API v10 on :" + port));
