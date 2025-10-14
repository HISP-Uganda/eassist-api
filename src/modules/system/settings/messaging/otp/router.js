import { Router } from "express";
import pool from "../../../../../db/pool.js";
import { BadRequest } from "../../../../../utils/errors.js";

const r = Router();

const CHANNELS = new Set(["SMS","EMAIL"]);

async function hasDefaultSmsProvider(){
  const q = await pool.query(`SELECT 1 FROM message_providers WHERE channel='SMS' AND is_active=TRUE AND is_default=TRUE LIMIT 1`);
  return q.rows.length > 0;
}
async function hasEmailCapability(){
  // Either SMTP configured or a default EMAIL provider
  const smtp = await pool.query(`SELECT host FROM smtp_settings WHERE id=TRUE`);
  const smtpOk = !!(smtp.rows[0] && smtp.rows[0].host);
  if (smtpOk) return true;
  const prov = await pool.query(`SELECT 1 FROM message_providers WHERE channel='EMAIL' AND is_active=TRUE AND is_default=TRUE LIMIT 1`);
  return prov.rows.length > 0;
}

r.get('/', async (req, res, next) => {
  try {
    const q = await pool.query(`SELECT enabled, channels, code_ttl_sec, max_attempts FROM otp_settings WHERE id=TRUE`);
    res.json(q.rows[0] || { enabled: false, channels: [], code_ttl_sec: 300, max_attempts: 5 });
  } catch (e) { next(e); }
});

r.put('/', async (req, res, next) => {
  try {
    const { enabled, channels, code_ttl_sec, max_attempts } = req.body || {};
    const useEnabled = !!enabled;
    let chs = Array.isArray(channels) ? channels.map(c=>String(c).toUpperCase()) : [];
    if (chs.some(c=>!CHANNELS.has(c))) return next(BadRequest('channels must be subset of [SMS, EMAIL]'));

    if (useEnabled) {
      if (chs.includes('SMS')){
        const okSms = await hasDefaultSmsProvider();
        if (!okSms) return next(BadRequest('Cannot enable OTP via SMS without a default SMS provider'));
      }
      if (chs.includes('EMAIL')){
        const okEmail = await hasEmailCapability();
        if (!okEmail) return next(BadRequest('Cannot enable OTP via EMAIL without SMTP or a default EMAIL provider'));
      }
    }

    const values = [ useEnabled, JSON.stringify(chs), Number(code_ttl_sec ?? 300), Number(max_attempts ?? 5) ];
    const up = await pool.query(
      `INSERT INTO otp_settings (id, enabled, channels, code_ttl_sec, max_attempts) VALUES (TRUE,$1,$2::jsonb,$3,$4)
       ON CONFLICT (id) DO UPDATE SET enabled=EXCLUDED.enabled, channels=EXCLUDED.channels, code_ttl_sec=EXCLUDED.code_ttl_sec, max_attempts=EXCLUDED.max_attempts, updated_at=now()
       RETURNING enabled, channels, code_ttl_sec, max_attempts`,
      values
    );
    res.json(up.rows[0]);
  } catch (e) { next(e); }
});

export default r;

