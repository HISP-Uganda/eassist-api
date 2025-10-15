// filepath: /Users/stephocay/projects/eassist/eassist-api/src/utils/messaging.js
import pool from "../db/pool.js";

const CHANNELS = new Set(["EMAIL", "SMS", "IN_APP", "WHATSAPP", "TELEGRAM"]);
const FALLBACK_EMAIL_TO_IN_APP = String(process.env.MESSAGING_EMAIL_FALLBACK_TO_IN_APP || 'true').toLowerCase() === 'true';
const FALLBACK_SMS_TO_IN_APP = String(process.env.MESSAGING_SMS_FALLBACK_TO_IN_APP || 'true').toLowerCase() === 'true';

async function resolveUserContact(userId) {
  if (!userId) return { email: null, phone: null };
  try {
    const q = await pool.query(`SELECT email, phone FROM users WHERE id=$1`, [userId]);
    const u = q.rows[0] || {};
    return { email: u.email || null, phone: u.phone || null };
  } catch {
    return { email: null, phone: null };
  }
}

async function resolveDefaultProviderName(channel) {
  const ch = String(channel || "").toUpperCase();
  if (!CHANNELS.has(ch)) return null;
  if (ch === "IN_APP") return null;
  try {
    const q = await pool.query(
      `SELECT name FROM message_providers WHERE channel=$1 AND is_active=TRUE AND is_default=TRUE LIMIT 1`,
      [ch]
    );
    return q.rows[0]?.name || null;
  } catch {
    return null;
  }
}

// queueMessage: insert a message row for the desired channel and recipient.
// opts: { channel, to_user_id, to_email, to_phone, to_handle, subject, body, body_html, template_code, scheduled_at, created_by, correlation_key }
export async function queueMessage(opts = {}) {
  try {
    const {
      channel = "IN_APP",
      to_user_id = null,
      to_email = null,
      to_phone = null,
      to_handle = null,
      subject = null,
      body = null,
      body_html = null,
      template_code = null,
      scheduled_at = null,
      created_by = null,
      correlation_key = null,
    } = opts || {};

    let ch = String(channel || "").toUpperCase();
    if (!CHANNELS.has(ch)) ch = "IN_APP"; // force safe default

    // Resolve contacts from user if needed
    let email = to_email || null;
    let phone = to_phone || null;
    if (to_user_id) {
      const c = await resolveUserContact(to_user_id);
      email = email || c.email;
      phone = phone || c.phone;
    }

    // Determine provider (if applicable) before validation for fallback purposes
    let providerName = await resolveDefaultProviderName(ch);

    // Auto-fallback rules to IN_APP when info missing or provider unavailable
    if (ch === "EMAIL" && (!email || !providerName) && FALLBACK_EMAIL_TO_IN_APP && to_user_id) {
      ch = "IN_APP";
    }
    if (ch === "SMS" && (!phone || !providerName) && FALLBACK_SMS_TO_IN_APP && to_user_id) {
      ch = "IN_APP";
    }
    // Recompute provider if channel changed
    if (ch !== channel) providerName = await resolveDefaultProviderName(ch);

    // Channel validations (best-effort; drop if invalid)
    if (ch === "EMAIL" && !email) return null;
    if (ch === "SMS" && !phone) return null;
    if (ch === "IN_APP" && !to_user_id) return null;
    if (ch === "WHATSAPP" && !phone && !to_handle) return null;
    if (ch === "TELEGRAM" && !to_handle) return null;

    const cols = [
      "channel",
      "to_user_id",
      "to_email",
      "to_phone",
      "to_handle",
      "subject",
      "body",
      "body_html",
      "template_code",
      "status",
      "scheduled_at",
      "created_by",
      "provider",
    ];
    const vals = [
      ch,
      to_user_id,
      email,
      phone,
      to_handle,
      subject,
      body,
      body_html,
      template_code,
      "queued",
      scheduled_at ? new Date(scheduled_at) : new Date(),
      created_by,
      providerName,
    ];

    let sql = `INSERT INTO messages (${cols.join(",")}`;
    let placeholders = cols.map((_, i) => `$${i + 1}`);

    // Optional idempotency via correlation key
    if (correlation_key) {
      sql = `INSERT INTO messages (${cols.join(",")},correlation_key) VALUES (${placeholders.join(",")},$${placeholders.length + 1}) ON CONFLICT (correlation_key) DO NOTHING RETURNING *`;
    } else {
      sql = `INSERT INTO messages (${cols.join(",")}) VALUES (${placeholders.join(",")}) RETURNING *`;
    }

    const ins = await pool.query(sql, correlation_key ? [...vals, correlation_key] : vals);
    if (ins.rows[0]) return ins.rows[0];

    // If we used correlation_key and nothing inserted due to conflict, fetch existing
    if (correlation_key) {
      const { rows } = await pool.query(`SELECT * FROM messages WHERE correlation_key=$1 LIMIT 1`, [correlation_key]);
      return rows[0] || null;
    }

    return null;
  } catch (_e) {
    // Best-effort: ignore message queue errors
    return null;
  }
}

export default { queueMessage };
