import { Router } from "express";
import pool from "../../../../../db/pool.js";
import { BadRequest, NotFound } from "../../../../../utils/errors.js";

const r = Router();
const CHANNELS = new Set(["EMAIL","SMS","WHATSAPP","TELEGRAM"]);

function normalizeConfig(input){
  if (!input) return {};
  if (typeof input === 'object') return input;
  try { return JSON.parse(String(input)); } catch { return {}; }
}

r.get("/", async (req, res, next) => {
  try {
    const params = [];
    const where = [];
    if (req.query.channel) {
      const ch = String(req.query.channel).toUpperCase();
      if (!CHANNELS.has(ch)) return next(BadRequest("Invalid channel"));
      params.push(ch); where.push(`channel=$${params.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const q = await pool.query(`SELECT * FROM message_providers ${whereSql} ORDER BY channel ASC, name ASC`, params);
    res.json(q.rows || []);
  } catch (e) { next(e); }
});

r.post("/", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { name, channel, config, is_active = true, is_default = false, description = null } = req.body || {};
    const ch = String(channel || '').toUpperCase();
    if (!name) return next(BadRequest('name is required'));
    if (!CHANNELS.has(ch)) return next(BadRequest('channel must be one of EMAIL,SMS,WHATSAPP,TELEGRAM'));
    const cfg = normalizeConfig(config);
    await client.query('BEGIN');
    if (is_default) {
      await client.query(`UPDATE message_providers SET is_default=FALSE WHERE channel=$1`, [ch]);
    }
    const cols = ['name','channel','config','is_active','is_default','description'];
    const vals = [name, ch, cfg, !!is_active, !!is_default, description];
    const ph = cols.map((_,i)=>`$${i+1}`);
    const ins = await client.query(`INSERT INTO message_providers (${cols.join(',')}) VALUES (${ph.join(',')}) RETURNING *`, vals);
    await client.query('COMMIT');
    res.status(201).json(ins.rows[0]);
  } catch (e) {
    try { await pool.query('ROLLBACK'); } catch { /* ignore */ }
    next(e);
  } finally { client.release(); }
});

r.get("/:id", async (req, res, next) => {
  try {
    const q = await pool.query(`SELECT * FROM message_providers WHERE id=$1`, [req.params.id]);
    const row = q.rows[0];
    if (!row) return next(NotFound('Provider not found'));
    res.json(row);
  } catch (e) { next(e); }
});

r.put("/:id", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { name, channel, config, is_active, is_default, description } = req.body || {};
    const updates = [];
    const vals = [];
    if (name !== undefined) { updates.push(`name=$${updates.length+1}`); vals.push(name); }
    if (channel !== undefined) {
      const ch = String(channel || '').toUpperCase();
      if (!CHANNELS.has(ch)) return next(BadRequest('Invalid channel'));
      updates.push(`channel=$${updates.length+1}`); vals.push(ch);
    }
    if (config !== undefined) { updates.push(`config=$${updates.length+1}`); vals.push(normalizeConfig(config)); }
    if (is_active !== undefined) { updates.push(`is_active=$${updates.length+1}`); vals.push(!!is_active); }
    if (description !== undefined) { updates.push(`description=$${updates.length+1}`); vals.push(description); }
    if (!updates.length && is_default === undefined) return next(BadRequest('No updatable fields'));

    await client.query('BEGIN');
    // Set default handling (may also change channel)
    const chFinal = channel ? String(channel).toUpperCase() : null;
    if (is_default === true) {
      // Determine channel to clear defaults for
      let targetChannel = chFinal;
      if (!targetChannel) {
        const cur = await client.query(`SELECT channel FROM message_providers WHERE id=$1`, [req.params.id]);
        if (!cur.rows[0]) { await client.query('ROLLBACK'); return next(NotFound('Provider not found')); }
        targetChannel = cur.rows[0].channel;
      }
      await client.query(`UPDATE message_providers SET is_default=FALSE WHERE channel=$1`, [targetChannel]);
      updates.push(`is_default=$${updates.length+1}`); vals.push(true);
    } else if (is_default === false) {
      updates.push(`is_default=$${updates.length+1}`); vals.push(false);
    }

    vals.push(req.params.id);
    const upd = await client.query(`UPDATE message_providers SET ${updates.join(', ')}, updated_at=now() WHERE id=$${vals.length} RETURNING *`, vals);
    await client.query('COMMIT');
    if (!upd.rows[0]) return next(NotFound('Provider not found'));
    res.json(upd.rows[0]);
  } catch (e) {
    try { await pool.query('ROLLBACK'); } catch {}
    next(e);
  } finally { client.release(); }
});

r.delete("/:id", async (req, res, next) => {
  try {
    const del = await pool.query(`DELETE FROM message_providers WHERE id=$1`, [req.params.id]);
    res.json({ ok: true, deleted: del.rowCount || 0 });
  } catch (e) { next(e); }
});

r.post("/:id/default", async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cur = await client.query(`SELECT id, channel FROM message_providers WHERE id=$1`, [req.params.id]);
    const row = cur.rows[0];
    if (!row) { await client.query('ROLLBACK'); return next(NotFound('Provider not found')); }
    await client.query(`UPDATE message_providers SET is_default=FALSE WHERE channel=$1`, [row.channel]);
    const upd = await client.query(`UPDATE message_providers SET is_default=TRUE, updated_at=now() WHERE id=$1 RETURNING *`, [req.params.id]);
    await client.query('COMMIT');
    res.json(upd.rows[0]);
  } catch (e) {
    try { await pool.query('ROLLBACK'); } catch {}
    next(e);
  } finally { client.release(); }
});

export default r;

