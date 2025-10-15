import { Router } from "express";
import { create, update, remove, read } from "../../../utils/crud.js";
import { requireAnyPermission } from "../../../middleware/auth.js";
import { PERMISSIONS } from "../../../constants/permissions.js";
import { listDetailed, readDetailed } from "../../../utils/relations.js";
import { pickFields } from "../../../utils/crud.js";
import { parsePagination } from "../../../utils/pagination.js";
import pool from "../../../db/pool.js";
import { queueMessage } from "../../../utils/messaging.js";
const r = Router();
const t = "ticket_notes";

// Simple per-note cap to avoid spammy mentions
const MAX_MENTIONS_PER_NOTE = parseInt(process.env.MENTIONS_MAX_PER_NOTE || '10', 10);
// Cache for username column existence
let hasUsersUsernameCol = null;
async function usersHasUsernameColumn() {
  if (hasUsersUsernameCol != null) return hasUsersUsernameCol;
  try {
    const { rows } = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='username' LIMIT 1`
    );
    hasUsersUsernameCol = rows && rows.length > 0;
  } catch {
    hasUsersUsernameCol = false;
  }
  return hasUsersUsernameCol;
}

r.get(
  "/",
  requireAnyPermission(
    PERMISSIONS.TICKETS_NOTES_READ,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      const { limit, offset } = parsePagination(req.query);
      const where = [];
      const params = [];
      if (req.query.ticket_id) { params.push(req.query.ticket_id); where.push(`t.ticket_id = $${params.length}`); }
      if (req.query.user_id) { params.push(req.query.user_id); where.push(`t.user_id = $${params.length}`); }
      if (req.query.is_internal != null) { params.push(req.query.is_internal === 'true'); where.push(`t.is_internal = $${params.length}`); }
      if (req.query.q) { params.push(`%${String(req.query.q).toLowerCase()}%`); where.push(`lower(t.body) LIKE $${params.length}`); }
      if (req.query.created_from) { params.push(req.query.created_from); where.push(`t.created_at >= $${params.length}`); }
      if (req.query.created_to) { params.push(req.query.created_to); where.push(`t.created_at <= $${params.length}`); }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const order = 'created_at DESC';

      const { rows: ct } = await pool.query(`SELECT count(*)::int AS c FROM ${t} t ${whereSql}`, params);
      res.set('X-Total-Count', String(ct[0]?.c || 0));

      const rows = await listDetailed(t, req, order, { whereSql, params, limit, offset });
      res.json(rows);
    } catch (e) {
      next(e);
    }
  }
);

r.post(
  "/",
  requireAnyPermission(
    PERMISSIONS.TICKETS_NOTES_ADD,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      const note = await create(t, req.body, ["ticket_id", "user_id", "body", "is_internal"]);
      // Best-effort @mention parsing and IN_APP notify
      try {
        const body = String(note?.body || '').trim();
        if (body) {
          const mentionEmails = new Set();
          const mentionUsernames = new Set();
          // 1) Extract @email mentions
          const emailRe = /(^|\s)@([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g;
          let m;
          while ((m = emailRe.exec(body)) !== null) {
            const email = (m[2] || '').toLowerCase();
            if (email) mentionEmails.add(email);
          }
          // 2) Optionally extract @username mentions if users.username exists
          if (await usersHasUsernameColumn()) {
            // Negative lookahead to avoid matching emails like @user@example.com (the next char after handle would be @)
            const userRe = /(^|\s)@([A-Za-z0-9_.-]{2,32})(?!@)\b/g;
            let um;
            while ((um = userRe.exec(body)) !== null) {
              const handle = (um[2] || '').toLowerCase();
              // If the same token also looks like an email (defensive), skip
              if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(handle)) continue;
              // Also skip if token appears to be part of an email mention captured above
              if (mentionEmails.has(handle)) continue;
              if (handle) mentionUsernames.add(handle);
            }
          }

          // Resolve emails -> users
          const byId = new Map();
          if (mentionEmails.size) {
            const emails = Array.from(mentionEmails);
            const placeholders = emails.map((_, i) => `$${i + 1}`).join(',');
            const q = await pool.query(`SELECT id, email FROM users WHERE lower(email) IN (${placeholders})`, emails);
            for (const u of q.rows || []) { if (u?.id) byId.set(String(u.id), u); }
          }
          // Resolve usernames -> users (if available)
          if (mentionUsernames.size) {
            const handles = Array.from(mentionUsernames);
            const placeholders = handles.map((_, i) => `$${i + 1}`).join(',');
            const q2 = await pool.query(`SELECT id, username FROM users WHERE lower(username) IN (${placeholders})`, handles);
            for (const u of q2.rows || []) { if (u?.id) byId.set(String(u.id), u); }
          }

          if (byId.size) {
            // Optional: fetch ticket for context
            let ticketCtx = null;
            try {
              const tq = await pool.query(`SELECT id, ticket_key, title FROM tickets WHERE id=$1`, [note.ticket_id]);
              ticketCtx = tq.rows[0] || null;
            } catch {}
            const actorName = (req.user?.full_name || req.user?.email || '').trim() || 'Someone';
            const subject = ticketCtx?.ticket_key
              ? `Mentioned on ${ticketCtx.ticket_key}`
              : 'You were mentioned on a ticket';
            const snippet = body.length > 200 ? `${body.slice(0, 200)}…` : body;
            const selfIds = new Set([note?.user_id, req.user?.sub].filter(Boolean).map(String));
            // Build recipients list, filter self, cap
            const recipients = Array.from(byId.keys())
              .filter(uid => !selfIds.has(String(uid)))
              .slice(0, Math.max(0, MAX_MENTIONS_PER_NOTE));
            if (recipients.length) {
              await Promise.all(
                recipients.map(uid => queueMessage({
                  channel: 'IN_APP',
                  to_user_id: uid,
                  template_code: 'TICKET_MENTION',
                  subject,
                  body: `${actorName} mentioned you in a note${ticketCtx?.ticket_key ? ` on ${ticketCtx.ticket_key}` : ''}${ticketCtx?.title ? `: ${ticketCtx.title}` : ''}.\n\n“${snippet}”`,
                  created_by: req.user?.sub || null,
                  correlation_key: `ticket_mention:${note.ticket_id}:${note.id}:${uid}`,
                }))
              );
            }
          }
        }
      } catch (_e) {
        // ignore notification errors
      }
      res.status(201).json(note);
    } catch (e) {
      next(e);
    }
  }
);
r.get(
  "/:id",
  requireAnyPermission(
    PERMISSIONS.TICKETS_NOTES_READ,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      // Prefer the enriched read (will include nested user when available)
      const enriched = await readDetailed(t, 'id', req.params.id, req);
      if (enriched) return res.json(req.query.fields ? pickFields(enriched, req.query.fields) : enriched);
      const row = await read(t, "id", req.params.id);
      if (!row) return next(new Error("Not found"));
      res.json(req.query.fields ? pickFields(row, req.query.fields) : row);
    } catch (e) {
      next(e);
    }
  }
);
r.put(
  "/:id",
  requireAnyPermission(PERMISSIONS.TICKETS_UPDATE, PERMISSIONS.TICKETS_MANAGE),
  async (a, b, c) => {
    try {
      b.json(
        await update(t, "id", a.params.id, a.body, [
          "ticket_id",
          "user_id",
          "body",
          "is_internal",
        ])
      );
    } catch (e) {
      c(e);
    }
  }
);
r.delete(
  "/:id",
  requireAnyPermission(PERMISSIONS.TICKETS_UPDATE, PERMISSIONS.TICKETS_MANAGE),
  async (a, b, c) => {
    try {
      b.json(await remove(t, "id", a.params.id));
    } catch (e) {
      c(e);
    }
  }
);
export default r;
