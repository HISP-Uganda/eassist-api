import { Router } from "express";
import pool from "../../../../../db/pool.js";
import { BadRequest, NotFound } from "../../../../../utils/errors.js";
import { requireAnyPermission, requireAuth } from "../../../../../middleware/auth.js";
import { PERMISSIONS } from "../../../../../constants/permissions.js";
import { CHANNEL_OPTIONS, isValidProviderType, validateConfigForType, getChannelOptions } from "./options.js";

const r = Router();
// Enforce authentication within this router to allow direct mounting in tests and ensure JWT is decoded
r.use(requireAuth);
const CHANNELS = new Set(["EMAIL", "SMS", "WHATSAPP", "TELEGRAM"]);

function normChannel(c) {
  const ch = String(c || "").toUpperCase();
  if (!CHANNELS.has(ch)) throw BadRequest("Invalid channel; must be one of EMAIL,SMS,WHATSAPP,TELEGRAM");
  return ch;
}

async function channelSummary(channel) {
  const ch = normChannel(channel);
  const { rows } = await pool.query(
    `SELECT
       COUNT(*)::int as total,
       COUNT(*) FILTER (WHERE is_active) ::int as active
     FROM message_providers WHERE channel=$1`,
    [ch]
  );
  const total = rows[0]?.total || 0;
  const active = rows[0]?.active || 0;
  const def = await pool.query(
    `SELECT id, name, is_active, is_default FROM message_providers WHERE channel=$1 AND is_default=TRUE LIMIT 1`,
    [ch]
  );
  return {
    channel: ch,
    providers_total: total,
    providers_active: active,
    is_available: total > 0,
    is_active: active > 0,
    default_provider: def.rows[0] || null,
  };
}

// Permissions guard: allow either global settings.manage or granular messaging settings permissions
const canRead = requireAnyPermission(
  PERMISSIONS.SETTINGS_MANAGE,
  PERMISSIONS.SYS_SETTINGS_MESSAGING_READ
);
const canUpdate = requireAnyPermission(
  PERMISSIONS.SETTINGS_MANAGE,
  PERMISSIONS.SYS_SETTINGS_MESSAGING_UPDATE
);

r.get("/", canRead, async (_req, res, next) => {
  try {
    const out = [];
    for (const ch of CHANNELS) {
      // eslint-disable-next-line no-await-in-loop
      out.push(await channelSummary(ch));
    }
    res.json(out);
  } catch (e) { next(e); }
});

r.get("/:channel", canRead, async (req, res, next) => {
  try { res.json(await channelSummary(req.params.channel)); }
  catch (e) { next(e); }
});

// Options catalog
r.get("/options/all", canRead, async (_req, res) => {
  res.json(CHANNEL_OPTIONS);
});

r.get("/:channel/options", canRead, async (req, res, next) => {
  try {
    const ch = String(req.params.channel || "").toUpperCase();
    if (ch === 'IN_APP') return res.json(getChannelOptions(ch));
    return res.json(getChannelOptions(normChannel(ch)));
  } catch (e) { next(e); }
});

// Activate a channel by ensuring at least one active provider (optionally set a specific provider)
r.put("/:channel/activate", canUpdate, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const ch = normChannel(req.params.channel);
    const { provider_id } = req.body || {};
    await client.query("BEGIN");
    if (provider_id) {
      const cur = await client.query(`SELECT id, channel FROM message_providers WHERE id=$1`, [provider_id]);
      const row = cur.rows[0];
      if (!row || row.channel !== ch) { await client.query("ROLLBACK"); return next(NotFound("Provider not found for channel")); }
      await client.query(`UPDATE message_providers SET is_active=TRUE WHERE id=$1`, [provider_id]);
      // Make it default if no default exists
      const hasDef = await client.query(`SELECT 1 FROM message_providers WHERE channel=$1 AND is_default=TRUE LIMIT 1`, [ch]);
      if (!hasDef.rows[0]) {
        await client.query(`UPDATE message_providers SET is_default=FALSE WHERE channel=$1`, [ch]);
        await client.query(`UPDATE message_providers SET is_default=TRUE WHERE id=$1`, [provider_id]);
      }
    } else {
      const any = await client.query(`SELECT id FROM message_providers WHERE channel=$1 ORDER BY is_default DESC, name ASC LIMIT 1`, [ch]);
      const row = any.rows[0];
      if (!row) { await client.query("ROLLBACK"); return next(BadRequest("No providers configured for channel")); }
      await client.query(`UPDATE message_providers SET is_active=TRUE WHERE id=$1`, [row.id]);
      // Ensure there is a default; set this one if none
      const hasDef = await client.query(`SELECT 1 FROM message_providers WHERE channel=$1 AND is_default=TRUE LIMIT 1`, [ch]);
      if (!hasDef.rows[0]) {
        await client.query(`UPDATE message_providers SET is_default=FALSE WHERE channel=$1`, [ch]);
        await client.query(`UPDATE message_providers SET is_default=TRUE WHERE id=$1`, [row.id]);
      }
    }
    await client.query("COMMIT");
    res.json(await channelSummary(ch));
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    next(e);
  } finally { client.release(); }
});

// Deactivate a channel by disabling all providers
r.put("/:channel/deactivate", canUpdate, async (req, res, next) => {
  try {
    const ch = normChannel(req.params.channel);
    await pool.query(`UPDATE message_providers SET is_active=FALSE WHERE channel=$1`, [ch]);
    res.json(await channelSummary(ch));
  } catch (e) { next(e); }
});

// Set default provider for a channel
r.put("/:channel/default/:id", canUpdate, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const ch = normChannel(req.params.channel);
    await client.query("BEGIN");
    const cur = await client.query(`SELECT id, channel FROM message_providers WHERE id=$1`, [req.params.id]);
    const row = cur.rows[0];
    if (!row || row.channel !== ch) { await client.query("ROLLBACK"); return next(NotFound("Provider not found for channel")); }
    await client.query(`UPDATE message_providers SET is_default=FALSE WHERE channel=$1`, [ch]);
    const upd = await client.query(`UPDATE message_providers SET is_default=TRUE, updated_at=now() WHERE id=$1 RETURNING *`, [req.params.id]);
    await client.query("COMMIT");
    res.json({ ...(await channelSummary(ch)), default_provider: { id: upd.rows[0].id, name: upd.rows[0].name, is_active: upd.rows[0].is_active, is_default: upd.rows[0].is_default } });
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    next(e);
  } finally { client.release(); }
});

// Convenience: create a provider for a channel
r.post("/:channel/providers", canUpdate, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const ch = normChannel(req.params.channel);
    const { name, provider_type, config = {}, is_active = true, is_default = false, description = null } = req.body || {};
    if (!name) return next(BadRequest("name is required"));
    if (!isValidProviderType(ch, provider_type)) return next(BadRequest(`Invalid provider_type for ${ch}`));
    const cfg = typeof config === 'object' ? { ...config } : {};
    cfg.type = provider_type; // persist type in config
    const valErr = validateConfigForType(ch, provider_type, cfg);
    if (valErr) return next(BadRequest(valErr));
    await client.query("BEGIN");
    if (is_default) {
      await client.query(`UPDATE message_providers SET is_default=FALSE WHERE channel=$1`, [ch]);
    }
    const cols = ["name","channel","config","is_active","is_default","description"];
    const vals = [name, ch, cfg, !!is_active, !!is_default, description];
    const ph = cols.map((_, i) => `$${i+1}`);
    const ins = await client.query(`INSERT INTO message_providers (${cols.join(',')}) VALUES (${ph.join(',')}) RETURNING *`, vals);
    await client.query("COMMIT");
    res.status(201).json(ins.rows[0]);
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    next(e);
  } finally { client.release(); }
});

export default r;
