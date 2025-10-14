import { Router } from "express";
import pool from "../../../db/pool.js";
import { parsePagination } from "../../../utils/pagination.js";
import { BadRequest, NotFound, Forbidden } from "../../../utils/errors.js";
import { listDetailed, readDetailed } from "../../../utils/relations.js";
import { requireAnyPermission, requireAuth } from "../../../middleware/auth.js";
import { PERMISSIONS } from "../../../constants/permissions.js";

const r = Router();
const t = "messages";

const CHANNELS = new Set(["EMAIL","SMS","IN_APP","WHATSAPP","TELEGRAM"]);
const STATUSES = new Set(["queued","sent","failed","read"]);

async function resolveUserContact(userId){
  if (!userId) return { email: null, phone: null };
  const q = await pool.query(`SELECT email, phone FROM users WHERE id=$1`, [userId]);
  const u = q.rows[0] || {};
  return { email: u.email || null, phone: u.phone || null };
}

async function resolveDefaultProviderName(channel){
  const ch = String(channel||'').toUpperCase();
  if (!CHANNELS.has(ch)) return null;
  // For IN_APP we do not need a provider
  if (ch === 'IN_APP') return null;
  const q = await pool.query(`SELECT name FROM message_providers WHERE channel=$1 AND is_active=TRUE AND is_default=TRUE LIMIT 1`, [ch]);
  return q.rows[0]?.name || null;
}

function requirePerms(...p){
  return requireAnyPermission(...p);
}

r.get(
  "/",
  requirePerms(PERMISSIONS.SYS_MESSAGES_LIST, PERMISSIONS.SYS_MESSAGES_READ),
  async (req, res, next) => {
    try {
      const { page, pageSize, offset, limit } = parsePagination(req.query);
      const params = [];
      const where = [];
      if (req.query.channel) {
        const ch = String(req.query.channel).toUpperCase();
        if (!CHANNELS.has(ch)) return next(BadRequest("Invalid channel"));
        params.push(ch); where.push(`channel=$${params.length}`);
      }
      if (req.query.status) {
        const st = String(req.query.status).toLowerCase();
        if (!STATUSES.has(st)) return next(BadRequest("Invalid status"));
        params.push(st); where.push(`status=$${params.length}`);
      }
      if (req.query.to_user_id) {
        params.push(req.query.to_user_id); where.push(`to_user_id=$${params.length}`);
      }
      if (req.query.to_email) {
        params.push(req.query.to_email); where.push(`to_email=$${params.length}`);
      }
      if (req.query.to_phone) {
        params.push(req.query.to_phone); where.push(`to_phone=$${params.length}`);
      }
      if (req.query.q) {
        params.push(`%${String(req.query.q).toLowerCase()}%`);
        where.push(`(lower(subject) LIKE $${params.length} OR lower(body) LIKE $${params.length})`);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const { rows: tot } = await pool.query(`SELECT count(*)::int c FROM ${t} ${whereSql}`, params);
      const items = await listDetailed(t, req, 'created_at DESC', { whereSql, params, limit, offset });
      res.json({ items, page, pageSize, total: tot[0]?.c || 0 });
    } catch (e) { next(e); }
  }
);

r.get(
  "/:id",
  requirePerms(PERMISSIONS.SYS_MESSAGES_READ, PERMISSIONS.SYS_MESSAGES_LIST),
  async (req, res, next) => {
    try {
      const row = await readDetailed(t, 'id', req.params.id, req);
      if (!row) return next(NotFound('Message not found'));
      res.json(row);
    } catch (e) { next(e); }
  }
);

r.post(
  "/",
  requirePerms(PERMISSIONS.SYS_MESSAGES_SEND),
  async (req, res, next) => {
    try {
      const { channel, to_user_id, to_email, to_phone, to_handle, subject, body, body_html, template_code, scheduled_at } = req.body || {};
      const ch = String(channel || '').toUpperCase();
      if (!CHANNELS.has(ch)) return next(BadRequest('channel must be one of EMAIL, SMS, IN_APP, WHATSAPP, TELEGRAM'));
      // Resolve recipient contact if to_user_id provided
      let email = to_email || null;
      let phone = to_phone || null;
      if (to_user_id) {
        const c = await resolveUserContact(to_user_id);
        email = email || c.email;
        phone = phone || c.phone;
      }
      // Channel-specific validations
      if (ch === 'EMAIL') {
        if (!email) return next(BadRequest('to_email or to_user_id with email required for EMAIL'));
        if (!subject) return next(BadRequest('subject is required for EMAIL'));
      } else if (ch === 'SMS') {
        if (!phone) return next(BadRequest('to_phone or to_user_id with phone required for SMS'));
      } else if (ch === 'IN_APP') {
        if (!to_user_id) return next(BadRequest('to_user_id required for IN_APP'));
      } else if (ch === 'WHATSAPP') {
        if (!phone && !to_handle) return next(BadRequest('to_phone or to_handle required for WHATSAPP'));
      } else if (ch === 'TELEGRAM') {
        if (!to_handle) return next(BadRequest('to_handle (username/chat id) required for TELEGRAM'));
      }
      // Determine provider (if applicable)
      const providerName = await resolveDefaultProviderName(ch);
      const cols = [
        'channel','to_user_id','to_email','to_phone','to_handle','subject','body','body_html','template_code','status','scheduled_at','created_by','provider'
      ];
      const vals = [ ch, to_user_id || null, email, phone, to_handle || null, subject || null, body || null, body_html || null, template_code || null, 'queued', scheduled_at ? new Date(scheduled_at) : null, req.user?.sub || null, providerName ];
      const ph = cols.map((_,i)=>`$${i+1}`);
      const ins = await pool.query(`INSERT INTO ${t} (${cols.join(',')}) VALUES (${ph.join(',')}) RETURNING *`, vals);
      // read enriched
      const enriched = await readDetailed(t, 'id', ins.rows[0].id, req);
      res.status(201).json(enriched || ins.rows[0]);
    } catch (e) { next(e); }
  }
);

r.put(
  "/:id",
  requirePerms(PERMISSIONS.SYS_MESSAGES_UPDATE, PERMISSIONS.SYS_MESSAGES_SEND),
  async (req, res, next) => {
    try {
      const allowed = ['status','error_message','scheduled_at','provider','provider_message_id','read_at','sent_at','delivered_at'];
      const cols = [];
      const vals = [];
      for (const k of allowed){
        if (k in req.body){
          if (k === 'status' && !STATUSES.has(String(req.body[k]).toLowerCase())) return next(BadRequest('Invalid status'));
          cols.push(`${k}=$${cols.length+1}`);
          vals.push(k.endsWith('_at') ? (req.body[k] ? new Date(req.body[k]) : null) : req.body[k]);
        }
      }
      if (!cols.length) return next(BadRequest('No updatable fields provided'));
      vals.push(req.params.id);
      const upd = await pool.query(`UPDATE ${t} SET ${cols.join(', ')}, updated_at=now() WHERE id=$${vals.length} RETURNING *`, vals);
      if (!upd.rows[0]) return next(NotFound('Message not found'));
      const enriched = await readDetailed(t, 'id', req.params.id, req);
      res.json(enriched || upd.rows[0]);
    } catch (e) { next(e); }
  }
);

r.post(
  "/:id/send",
  requirePerms(PERMISSIONS.SYS_MESSAGES_SEND),
  async (req, res, next) => {
    try {
      // ensure provider set if missing
      const cur = await pool.query(`SELECT channel, provider FROM ${t} WHERE id=$1`, [req.params.id]);
      const row = cur.rows[0];
      if (!row) return next(NotFound('Message not found'));
      let providerName = row.provider;
      if (!providerName) providerName = await resolveDefaultProviderName(row.channel);
      const { rows } = await pool.query(`UPDATE ${t} SET status='queued', provider=$2, scheduled_at=COALESCE(scheduled_at, now()), updated_at=now() WHERE id=$1 RETURNING *`, [req.params.id, providerName || null]);
      const enriched = await readDetailed(t, 'id', req.params.id, req);
      res.json(enriched || rows[0]);
    } catch (e) { next(e); }
  }
);

// Inbox endpoints for the current authenticated user
r.get(
  "/inbox",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      if (!userId) return next(Forbidden('Unauthorized'));
      const { page, pageSize, offset, limit } = parsePagination(req.query);
      const params = [userId];
      const where = [`to_user_id=$1`];
      if (req.query.channel) {
        const ch = String(req.query.channel).toUpperCase();
        if (!CHANNELS.has(ch)) return next(BadRequest('Invalid channel'));
        params.push(ch); where.push(`channel=$${params.length}`);
      }
      if (req.query.unread === 'true') {
        where.push(`(read_at IS NULL AND status <> 'read')`);
      }
      const whereSql = `WHERE ${where.join(' AND ')}`;
      const { rows: tot } = await pool.query(`SELECT count(*)::int c FROM ${t} ${whereSql}`,[...params]);
      const items = await listDetailed(t, req, 'created_at DESC', { whereSql, params, limit, offset });
      res.json({ items, page, pageSize, total: tot[0]?.c || 0 });
    } catch (e) { next(e); }
  }
);

r.post(
  "/inbox/:id/read",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      const q = await pool.query(`SELECT id, to_user_id FROM ${t} WHERE id=$1`, [req.params.id]);
      const m = q.rows[0];
      if (!m) return next(NotFound('Message not found'));
      if (String(m.to_user_id) !== String(userId)) return next(Forbidden('Cannot modify another user\'s message'));
      const { rows } = await pool.query(`UPDATE ${t} SET status='read', read_at=now(), updated_at=now() WHERE id=$1 RETURNING *`, [req.params.id]);
      const enriched = await readDetailed(t, 'id', req.params.id, req);
      res.json(enriched || rows[0]);
    } catch (e) { next(e); }
  }
);

export default r;

