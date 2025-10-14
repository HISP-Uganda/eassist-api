import { Router } from "express";
import pool from "../../db/pool.js";
import { parsePagination } from "../../utils/pagination.js";
import { BadRequest, NotFound, Forbidden } from "../../utils/errors.js";
import { listDetailed, readDetailed } from "../../utils/relations.js";
import { requireAuth, requireRoles, requireAnyPermission } from "../../middleware/auth.js";
import { EventEmitter } from "events";
import smsRouter from "./channels/sms/router.js";
import emailRouter from "./channels/email/router.js";
import whatsappRouter from "./channels/whatsapp/router.js";
import telegramRouter from "./channels/telegram/router.js";
import { PERMISSIONS } from "../../constants/permissions.js";

const r = Router();
const t = "messages";

// For end-user messaging module, we only allow IN_APP channel for send operations
const INBOX_ALLOWED_CHANNELS = new Set(["IN_APP"]);

// --- Simple in-memory rate limiter per user for send operations ---
const RATE_LIMITS = Object.freeze({
  perMinute: parseInt(process.env.MESSAGES_SEND_PER_MIN || "20", 10),
  perDay: parseInt(process.env.MESSAGES_SEND_PER_DAY || "200", 10),
});
const sendCounters = new Map(); // key: userId -> { minute:{windowStart,cnt}, day:{windowStart,cnt} }
function rateLimitSend(req, _res, next) {
  try {
    const uid = String(req.user?.sub || "");
    if (!uid) return next(Forbidden("Unauthorized"));
    const now = Date.now();
    const minuteWindow = Math.floor(now / 60000);
    const dayWindow = Math.floor(now / 86400000);
    const cur = sendCounters.get(uid) || { minute: { window: 0, cnt: 0 }, day: { window: 0, cnt: 0 } };
    if (cur.minute.window !== minuteWindow) { cur.minute.window = minuteWindow; cur.minute.cnt = 0; }
    if (cur.day.window !== dayWindow) { cur.day.window = dayWindow; cur.day.cnt = 0; }
    if (cur.minute.cnt >= RATE_LIMITS.perMinute) {
      const err = BadRequest(`Rate limit exceeded: ${RATE_LIMITS.perMinute}/minute`);
      err.status = 429; // Too Many Requests
      return next(err);
    }
    if (cur.day.cnt >= RATE_LIMITS.perDay) {
      const err = BadRequest(`Daily rate limit exceeded: ${RATE_LIMITS.perDay}/day`);
      err.status = 429;
      return next(err);
    }
    // increment for this attempt; roll back on error not necessary for simplicity
    cur.minute.cnt += 1; cur.day.cnt += 1;
    sendCounters.set(uid, cur);
    return next();
  } catch (e) { return next(e); }
}

// --- SSE support for new message push notifications ---
const notifier = new EventEmitter();
notifier.setMaxListeners(0); // no limit
const sseClients = new Map(); // userId -> Set(res)
function sendSse(res, data, event = "message") {
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch {}
}
function addSseClient(userId, res) {
  if (!sseClients.has(userId)) sseClients.set(userId, new Set());
  sseClients.get(userId).add(res);
  res.on("close", () => {
    try { sseClients.get(userId)?.delete(res); } catch {}
  });
}
// Broadcast helper for a target user
async function notifyUser(userId, payload) {
  const set = sseClients.get(String(userId));
  if (!set || !set.size) return;
  for (const res of Array.from(set)) sendSse(res, payload, "message");
}
// When a new message is created, emit to the recipient
notifier.on("message:new", async (msg) => {
  if (msg && msg.to_user_id) await notifyUser(msg.to_user_id, { type: "message:new", message: msg });
});

// GET /messages/inbox - list current user's in-app messages
r.get("/inbox", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return next(Forbidden("Unauthorized"));
    const { page, pageSize, offset, limit } = parsePagination(req.query);
    const params = [userId];
    const where = ["to_user_id=$1"]; // User's inbox only
    // Optional channel filter but limit to IN_APP for this module
    const chRaw = req.query.channel ? String(req.query.channel).toUpperCase() : "IN_APP";
    if (chRaw) {
      if (!INBOX_ALLOWED_CHANNELS.has(chRaw)) return next(BadRequest("Invalid or unsupported channel for inbox"));
      params.push(chRaw);
      where.push(`channel=$${params.length}`);
    }
    if (req.query.unread === "true") {
      where.push("(read_at IS NULL AND status <> 'read')");
    }
    const whereSql = `WHERE ${where.join(" AND ")}`;
    const { rows: tot } = await pool.query(`SELECT count(*)::int c FROM ${t} ${whereSql}`, params);
    const items = await listDetailed(t, req, "created_at DESC", { whereSql, params, limit, offset });
    res.json({ items, page, pageSize, total: tot[0]?.c || 0 });
  } catch (e) {
    next(e);
  }
});

// GET /messages/inbox/:id - read a single message if it belongs to the user
r.get("/inbox/:id", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.sub;
    const row = await readDetailed(t, "id", req.params.id, req);
    if (!row) return next(NotFound("Message not found"));
    if (String(row.to_user_id) !== String(userId)) return next(Forbidden("Cannot view another user's message"));
    // Ensure it's an IN_APP message for this module context
    if (!INBOX_ALLOWED_CHANNELS.has(String(row.channel || "").toUpperCase())) return next(Forbidden("Unsupported channel"));
    res.json(row);
  } catch (e) {
    next(e);
  }
});

// POST /messages/inbox/:id/read - mark current user's message as read
r.post("/inbox/:id/read", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.sub;
    const q = await pool.query(`SELECT id, to_user_id, channel FROM ${t} WHERE id=$1`, [req.params.id]);
    const m = q.rows[0];
    if (!m) return next(NotFound("Message not found"));
    if (String(m.to_user_id) !== String(userId)) return next(Forbidden("Cannot modify another user's message"));
    if (!INBOX_ALLOWED_CHANNELS.has(String(m.channel || "").toUpperCase())) return next(Forbidden("Unsupported channel"));
    const { rows } = await pool.query(
      `UPDATE ${t} SET status='read', read_at=now(), updated_at=now() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    const enriched = await readDetailed(t, "id", req.params.id, req);
    res.json(enriched || rows[0]);
  } catch (e) {
    next(e);
  }
});

// SSE stream for current user's message notifications
r.get("/stream", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return next(Forbidden("Unauthorized"));
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    // Initial comment/hello
    res.write(": connected\n\n");
    addSseClient(String(userId), res);
    // keepalive
    const iv = setInterval(() => {
      try { res.write(": keepalive\n\n"); } catch {}
    }, 15000);
    req.on("close", () => clearInterval(iv));
  } catch (e) { next(e); }
});

// POST /messages/send - send an IN_APP message to another user
// Restrict via permission instead of roles
r.post(
  "/send",
  requireAuth,
  requireAnyPermission(PERMISSIONS.SYS_MESSAGES_SEND),
  rateLimitSend,
  async (req, res, next) => {
    try {
      const fromUserId = req.user?.sub || null;
      const { to_user_id, subject, body, template_code, body_html, attachments } = req.body || {};
      if (!to_user_id) return next(BadRequest("to_user_id is required"));
      if (!body && !subject && !body_html && !template_code) return next(BadRequest("Provide subject/body or template_code/body_html"));
      const cols = [
        "channel",
        "to_user_id",
        "subject",
        "body",
        "body_html",
        "template_code",
        "status",
        "scheduled_at",
        "created_by",
      ];
      const vals = [
        "IN_APP",
        to_user_id,
        subject || null,
        body || null,
        body_html || null,
        template_code || null,
        "queued",
        new Date(),
        fromUserId,
      ];
      const ph = cols.map((_, i) => `$${i + 1}`);
      const ins = await pool.query(
        `INSERT INTO ${t} (${cols.join(",")}) VALUES (${ph.join(",")}) RETURNING *`,
        vals
      );
      let result = ins.rows[0];
      // Optional attachments
      if (Array.isArray(attachments) && attachments.length) {
        const attCols = ["message_id","file_url","file_name","content_type","size_bytes","uploaded_by"];
        for (const a of attachments) {
          if (!a || !a.file_url) continue;
          const attVals = [
            result.id,
            a.file_url,
            a.file_name || null,
            a.content_type || null,
            typeof a.size_bytes === 'number' ? a.size_bytes : null,
            fromUserId,
          ];
          const attPh = attCols.map((_, i) => `$${i + 1}`);
          // eslint-disable-next-line no-await-in-loop
          await pool.query(`INSERT INTO message_attachments (${attCols.join(',')}) VALUES (${attPh.join(',')})`, attVals);
        }
      }
      // Enrich unless running tests
      if ((process.env.NODE_ENV || '').toLowerCase() !== 'test') {
        try {
          const enriched = await readDetailed(t, "id", result.id, req);
          if (enriched) result = enriched;
        } catch {}
      }
      // Emit SSE notification to recipient
      try { notifier.emit("message:new", result); } catch {}
      res.status(201).json(result);
    } catch (e) { next(e); }
  }
);

// Mount channel sub-routers
r.use("/sms", smsRouter);
r.use("/email", emailRouter);
r.use("/whatsapp", whatsappRouter);
r.use("/telegram", telegramRouter);

export default r;
