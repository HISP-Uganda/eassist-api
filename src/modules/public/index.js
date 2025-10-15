import { Router } from "express";
import pool from "../../db/pool.js";
import { parsePagination } from "../../utils/pagination.js";
import listEndpoints from "express-list-endpoints";
import { BadRequest, NotFound } from "../../utils/errors.js";
import { create } from "../../utils/crud.js";
import jwt from "jsonwebtoken";
import { queueMessage } from "../../utils/messaging.js";
const r = Router();

// Simple health probe
r.get("/ping", (req, res) =>
  res.json({ ok: true, service: "public", time: new Date().toISOString() })
);

// List all API endpoints that are available without authentication/authorization
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

r.get("/endpoints", (req, res) => {
  const app = req.app;
  const all = listEndpoints(app) || [];
  const apiOnly = all.filter((e) => e.path && e.path.startsWith("/api"));
  const publicOnly = apiOnly.filter((e) => isNoAuthPath(e.path));
  // Deduplicate identical paths and merge methods
  const seen = new Map();
  for (const e of publicOnly) {
    const key = e.path;
    if (!seen.has(key)) seen.set(key, new Set());
    for (const m of e.methods || []) {
      seen.get(key).add(String(m).toUpperCase());
    }
  }
  const resources = Array.from(seen.entries())
    .map(([path, methodsSet]) => ({
      path,
      methods: Array.from(methodsSet).sort(),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
  res.json({ ok: true, count: resources.length, resources });
});

// Ticket public helper: list available operations
r.get("/tickets", (req, res) => {
  res.json({
    ok: true,
    description: "Public ticket endpoints",
    resources: [
      {
        method: "POST",
        path: "/api/public/tickets",
        summary: "Submit a new ticket (public)",
        body: {
          title: "string",
          description: "string",
          email: "string (optional)",
          source_code: "string (optional; defaults to Self Service)",
          system_id: "uuid (optional)",
        },
        example:
          'curl -X POST -H \'Content-Type: application/json\' -d \'{"title":"Printer jam","description":"Keeps jamming","email":"user@example.com"}\' http://localhost:8080/api/public/tickets',
      },
      {
        method: "GET",
        path: "/api/public/tickets/lookup",
        summary: "Track ticket status using reference",
        params: { reference: "ticket reference/key (e.g., HD-2025-0002)" },
        example:
          "curl 'http://localhost:8080/api/public/tickets/lookup?reference=HD-2025-0002'",
      },
    ],
  });
});

// Helper: resolve a source_id by explicit code/name or by candidate defaults
async function resolveSourceId({ explicitCode, defaultCandidates = [], defaultNames = [] }) {
  // Try explicit first if provided
  try {
    if (explicitCode && String(explicitCode).trim()) {
      const code = String(explicitCode).trim().toLowerCase();
      const q = await pool.query(
        `SELECT id FROM sources WHERE lower(code)=$1 OR lower(name)=$1 LIMIT 1`,
        [code]
      );
      if (q.rows[0]?.id != null) return q.rows[0].id;
    }
  } catch (_) {}
  // Try defaults list
  try {
    if ((defaultCandidates?.length || 0) + (defaultNames?.length || 0)) {
      const q = await pool.query(
        `SELECT id FROM sources WHERE lower(code)=ANY($1) OR lower(name)=ANY($2) LIMIT 1`,
        [
          (defaultCandidates || []).map((s) => String(s).toLowerCase()),
          (defaultNames || []).map((s) => String(s).toLowerCase()),
        ]
      );
      if (q.rows[0]?.id != null) return q.rows[0].id;
    }
  } catch (_) {}
  return undefined;
}

// Submit a ticket publicly
r.post("/tickets", async (req, res, next) => {
  try {
    const body = req.body || {};
    const title = body.title && String(body.title).trim();
    const description = body.description && String(body.description).trim();
    if (!title || !description) {
      return next(BadRequest("title and description are required"));
    }
    // Normalize aliases
    const data = {
      title,
      description,
      reporter_email: body.reporter_email || body.email || null,
      full_name: body.full_name || body.name || null,
      phone_number: body.phone_number || body.phone || body.phoneNumber || null,
      system_id: body.system_id ?? null,
      module_id: body.module_id ?? null,
      category_id: body.category_id ?? null,
    };
    // Coerce integer foreign keys if provided as strings
    for (const f of ["system_id", "module_id", "category_id"]) {
      if (data[f] !== undefined && data[f] !== null && data[f] !== "") {
        const n = Number(data[f]);
        if (Number.isFinite(n)) data[f] = Math.trunc(n);
      } else {
        data[f] = null;
      }
    }

    // Resolve source_id: explicit source_code if provided; else default to Self Service for public submissions with safe fallbacks
    try {
      const explicit = body.source_code || body.source || null;
      const source_id = await resolveSourceId({
        explicitCode: explicit,
        defaultCandidates: ["self_service", "self-service", "self", "public", "portal", "web"],
        defaultNames: ["self service", "public", "portal", "web"],
      });
      if (source_id != null) data.source_id = source_id;
    } catch (_) { /* ignore, data.source_id remains unset */ }

    // Allow list for public creation
    const allow = [
      "title",
      "description",
      "reporter_email",
      "full_name",
      "phone_number",
      "system_id",
      "module_id",
      "category_id",
      "source_id",
    ];

    const created = await create("tickets", data, allow);

    // Queue public receipt notifications (best-effort)
    try {
      const reporterEmail = created?.reporter_email || null;
      const reporterPhone = created?.phone_number || null;
      if (reporterEmail) {
        await queueMessage({
          channel: "EMAIL",
          to_email: reporterEmail,
          subject: "We received your request",
          template_code: "TICKET_PUBLIC_RECEIPT",
          body: `Thank you. We've received your ticket${created?.ticket_key ? ` (${created.ticket_key})` : ""}.`,
        });
      }
      if (reporterPhone) {
        await queueMessage({
          channel: "SMS",
          to_phone: reporterPhone,
          body: created?.ticket_key
            ? `Your ticket ${created.ticket_key} was received.`
            : `Your ticket was received.`,
          template_code: "TICKET_PUBLIC_RECEIPT",
        });
      }
    } catch {}

    res.status(201).json(created);
  } catch (e) {
    // Translate FK errors to a 400 for a clearer message
    if (e && e.code === "23503") {
      return next(BadRequest("Invalid foreign key value", { detail: e.detail }));
    }
    next(e);
  }
});

// Lookup ticket by reference (public, minimal status payload)
r.get("/tickets/lookup", async (req, res, next) => {
  try {
    const reference = (
      req.query.reference ||
      req.query.ref ||
      req.query.key ||
      ""
    )
      .toString()
      .trim();
    if (!reference) {
      return next(
        BadRequest("reference is required", {
          params: { reference: "ticket reference/key" },
        })
      );
    }
    const q = await pool.query(
      `
      SELECT 
        t.ticket_key AS reference,
        t.title,
        t.created_at,
        t.updated_at,
        s.code AS status_code,
        s.name AS status_name,
        COALESCE(p.code,'') AS priority_code,
        COALESCE(v.code,'') AS severity_code
      FROM tickets t
      LEFT JOIN statuses s ON s.id=t.status_id
      LEFT JOIN priorities p ON p.id=t.priority_id
      LEFT JOIN severities v ON v.id=t.severity_id
      WHERE t.ticket_key=$1
      LIMIT 1
    `,
      [reference]
    );
    const row = q.rows[0];
    if (!row) return next(NotFound("Ticket not found"));
    // Minimal public payload for tracking
    res.json({
      reference: row.reference,
      title: row.title,
      status: { code: row.status_code, name: row.status_name },
      priority: row.priority_code || null,
      severity: row.severity_code || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  } catch (e) {
    next(e);
  }
});

// Public FAQs (published only)
r.get("/faqs", async (req, res, next) => {
  try {
    const { page, pageSize, offset, limit } = parsePagination(req.query);
    const params = [];
    const where = [`is_published=true`];
    if (req.query.q) {
      params.push(`%${String(req.query.q || "").toLowerCase()}%`);
      where.push(
        `(lower(title) LIKE $${params.length} OR lower(body) LIKE $${params.length})`
      );
    }
    if (req.query.system_category_id) {
      params.push(req.query.system_category_id);
      where.push(`system_category_id=$${params.length}`);
    }
    const whereSql = "WHERE " + where.join(" AND ");
    const tot = await pool.query(
      `SELECT count(*)::int c FROM faqs ${whereSql}`,
      params
    );
    const rows = await pool.query(
      `SELECT id,title,body,system_category_id,created_at FROM faqs ${whereSql} ORDER BY created_at DESC LIMIT $${
        params.length + 1
      } OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    res.json({ items: rows.rows, page, pageSize, total: tot.rows[0]?.c || 0 });
  } catch (e) {
    next(e);
  }
});

r.get("/faqs/:id", async (req, res, next) => {
  try {
    // Try centralized detailed reader first and enforce published
    const enriched = await import("../../utils/relations.js")
      .then((m) => m.readDetailed)
      .then((fn) => fn('faqs', 'id', req.params.id, req))
      .catch(() => null);
    if (enriched) {
      if (enriched.is_published) {
        // return the minimal public shape
        const { id, title, body, system_category_id, created_at } = enriched;
        return res.json({ id, title, body, system_category_id, created_at });
      }
      return next(NotFound("FAQ not found"));
    }

    const q = await pool.query(
      `SELECT id,title,body,system_category_id,created_at FROM faqs WHERE id=$1 AND is_published=true`,
      [req.params.id]
    );
    if (!q.rows[0]) return next(NotFound("FAQ not found"));
    res.json(q.rows[0]);
  } catch (e) {
    next(e);
  }
});

// Public KB Articles (published only)
r.get("/kb/articles", async (req, res, next) => {
  try {
    const { page, pageSize, offset, limit } = parsePagination(req.query);
    const params = [];
    const where = [`is_published=true`];
    if (req.query.q) {
      params.push(`%${String(req.query.q || "").toLowerCase()}%`);
      where.push(
        `(lower(title) LIKE $${params.length} OR lower(body) LIKE $${params.length})`
      );
    }
    const whereSql = "WHERE " + where.join(" AND ");
    const tot = await pool.query(
      `SELECT count(*)::int c FROM kb_articles ${whereSql}`,
      params
    );
    const rows = await pool.query(
      `SELECT id,title,body,created_at FROM kb_articles ${whereSql} ORDER BY created_at DESC LIMIT $${
        params.length + 1
      } OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    res.json({ items: rows.rows, page, pageSize, total: tot.rows[0]?.c || 0 });
  } catch (e) {
    next(e);
  }
});

r.get("/kb/articles/:id", async (req, res, next) => {
  try {
    // Try centralized detailed reader first and enforce published
    const enriched = await import("../../utils/relations.js")
      .then((m) => m.readDetailed)
      .then((fn) => fn('kb_articles', 'id', req.params.id, req))
      .catch(() => null);
    if (enriched) {
      if (enriched.is_published) {
        const { id, title, body, created_at } = enriched;
        return res.json({ id, title, body, created_at });
      }
      return next(NotFound("KB article not found"));
    }

    const q = await pool.query(
      `SELECT id,title,body,created_at FROM kb_articles WHERE id=$1 AND is_published=true`,
      [req.params.id]
    );
    if (!q.rows[0]) return next(NotFound("KB article not found"));
    res.json(q.rows[0]);
  } catch (e) {
    next(e);
  }
});

// KB ratings summary (public)
r.get("/kb/ratings/summary", async (req, res, next) => {
  try {
    const article_id = req.query.article_id;
    if (!article_id) return next(BadRequest("article_id required"));
    const { rows } = await pool.query(
      `SELECT avg(rating)::numeric(10,2) AS avg, count(*)::int AS count FROM kb_ratings WHERE article_id=$1`,
      [article_id]
    );
    res.json(rows[0] || { avg: null, count: 0 });
  } catch (e) {
    next(e);
  }
});

// Public videos (published only)
r.get("/videos", async (req, res, next) => {
  try {
    const { page, pageSize, offset, limit } = parsePagination(req.query);
    const params = [];
    const where = [`is_published=true`];
    if (req.query.q) {
      params.push(`%${String(req.query.q || "").toLowerCase()}%`);
      where.push(
        `(lower(title) LIKE $${params.length} OR lower(description) LIKE $${params.length})`
      );
    }
    if (req.query.category_id) {
      params.push(req.query.category_id);
      where.push(`category_id=$${params.length}`);
    }
    if (req.query.system_category_id) {
      params.push(req.query.system_category_id);
      where.push(`system_category_id=$${params.length}`);
    }
    if (req.query.language) {
      params.push(req.query.language);
      where.push(`language=$${params.length}`);
    }
    const whereSql = "WHERE " + where.join(" AND ");
    const tot = await pool.query(
      `SELECT count(*)::int c FROM videos ${whereSql}`,
      params
    );
    const rows = await pool.query(
      `SELECT id,title,description,category_id,system_category_id,url,duration_seconds,language,created_at FROM videos ${whereSql} ORDER BY created_at DESC LIMIT $${
        params.length + 1
      } OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    res.json({ items: rows.rows, page, pageSize, total: tot.rows[0]?.c || 0 });
  } catch (e) {
    next(e);
  }
});

r.get("/videos/categories", async (req, res, next) => {
  try {
    const { page, pageSize, offset, limit } = parsePagination(req.query);
    const params = [];
    const where = [];
    if (req.query.q) {
      params.push(`%${String(req.query.q || "").toLowerCase()}%`);
      where.push(`lower(name) LIKE $${params.length}`);
    }
    const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
    const tot = await pool.query(
      `SELECT count(*)::int c FROM video_categories ${whereSql}`,
      params
    );
    const rows = await pool.query(
      `SELECT id,name FROM video_categories ${whereSql} ORDER BY name ASC LIMIT $${
        params.length + 1
      } OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    res.json({ items: rows.rows, page, pageSize, total: tot.rows[0]?.c || 0 });
  } catch (e) {
    next(e);
  }
});

// Public search (published only)
r.get("/search", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").toLowerCase();
    const faqs = await pool.query(
      `SELECT id,title FROM faqs WHERE is_published=true AND lower(title) LIKE '%'||$1||'%' LIMIT 10`,
      [q]
    );
    const kb = await pool.query(
      `SELECT id,title FROM kb_articles WHERE is_published=true AND lower(title) LIKE '%'||$1||'%' LIMIT 10`,
      [q]
    );
    const videos = await pool.query(
      `SELECT id,title FROM videos WHERE is_published=true AND lower(title) LIKE '%'||$1||'%' LIMIT 10`,
      [q]
    );
    res.json({ faqs: faqs.rows, kb: kb.rows, videos: videos.rows });
  } catch (e) {
    next(e);
  }
});

// Optional bearer decode (non-fatal)
function tryAuth(req){
  if (req.user) return; // already set elsewhere
  const h = req.headers.authorization || "";
  if (/^bearer\s+/i.test(h)) {
    const token = h.split(/\s+/)[1];
    try { req.user = jwt.verify(token, process.env.JWT_SECRET || 'testsecret'); } catch (_) { /* ignore */ }
  }
}

// Public rating endpoints (FAQs, KB Articles, Videos)
function validateRating(val){
  const n = Number(val);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

async function upsertRating(table, col, id, userId, rating){
  const q = await pool.query(
    `INSERT INTO ${table} (${col}, user_id, rating) VALUES ($1,$2,$3)
     ON CONFLICT (${col}, user_id) DO UPDATE SET rating=EXCLUDED.rating, created_at=now()
     RETURNING *`,
    [id, userId, rating]
  );
  return q.rows[0];
}
async function summary(table, col, id){
  const q = await pool.query(
    `SELECT avg(rating)::numeric(10,2) AS avg, count(*)::int AS count FROM ${table} WHERE ${col}=$1`,
    [id]
  );
  return q.rows[0] || { avg: null, count: 0 };
}

r.post('/faqs/:id/rate', async (req,res,next)=>{
  try {
    tryAuth(req);
    const rating = validateRating(req.body?.rating);
    if (!rating) return next(BadRequest('rating must be integer 1..5'));
    const faqId = req.params.id;
    const userId = req.user?.sub || null;
    const row = await upsertRating('faq_ratings','faq_id',faqId,userId,rating);
    const sum = await summary('faq_ratings','faq_id',faqId);

    // Best-effort thank-you notification
    if (userId) {
      try { await queueMessage({ channel: 'IN_APP', to_user_id: userId, template_code: 'RATING_THANK_YOU', subject: 'Thanks for rating', body: 'We appreciate your feedback on this FAQ.' }); } catch {}
    }

    res.status(201).json({ rating: row, summary: sum });
  } catch (e){ next(e); }
});

r.get('/faqs/:id/ratings/summary', async (req,res,next)=>{
  try { const sum = await summary('faq_ratings','faq_id',req.params.id); res.json(sum); } catch (e){ next(e); }
});

r.post('/kb/articles/:id/rate', async (req,res,next)=>{
  try {
    tryAuth(req);
    const rating = validateRating(req.body?.rating);
    if (!rating) return next(BadRequest('rating must be integer 1..5'));
    const id = req.params.id;
    const userId = req.user?.sub || null;
    const row = await upsertRating('kb_ratings','article_id',id,userId,rating);
    const sum = await summary('kb_ratings','article_id',id);

    if (userId) {
      try { await queueMessage({ channel: 'IN_APP', to_user_id: userId, template_code: 'RATING_THANK_YOU', subject: 'Thanks for rating', body: 'Thanks for your feedback on this article.' }); } catch {}
    }

    res.status(201).json({ rating: row, summary: sum });
  } catch (e){ next(e); }
});

r.get('/kb/articles/:id/ratings/summary', async (req,res,next)=>{
  try { const sum = await summary('kb_ratings','article_id',req.params.id); res.json(sum); } catch (e){ next(e); }
});

r.post('/videos/:id/rate', async (req,res,next)=>{
  try {
    tryAuth(req);
    const rating = validateRating(req.body?.rating);
    if (!rating) return next(BadRequest('rating must be integer 1..5'));
    const id = req.params.id;
    const userId = req.user?.sub || null;
    const row = await upsertRating('video_ratings','video_id',id,userId,rating);
    const sum = await summary('video_ratings','video_id',id);

    if (userId) {
      try { await queueMessage({ channel: 'IN_APP', to_user_id: userId, template_code: 'RATING_THANK_YOU', subject: 'Thanks for rating', body: 'Thanks for your feedback on this video.' }); } catch {}
    }

    res.status(201).json({ rating: row, summary: sum });
  } catch (e){ next(e); }
});

r.get('/videos/:id/ratings/summary', async (req,res,next)=>{
  try { const sum = await summary('video_ratings','video_id',req.params.id); res.json(sum); } catch (e){ next(e); }
});

export default r;
