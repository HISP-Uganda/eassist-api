import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import pool from "../../db/pool.js";
import {
  signAccessToken,
  signRefreshToken,
  getUserRoles,
} from "../../middleware/auth.js";
import { requireAuth } from "../../middleware/auth.js";
import { BadRequest, Unauthorized } from "../../utils/errors.js";
import { queueMessage } from "../../utils/messaging.js";

const r = Router();

function cookieOpts(days) {
  const secure = process.env.NODE_ENV === "production";
  const maxAge = days * 24 * 60 * 60 * 1000;
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    maxAge,
    path: "/",
  };
}

// POST /api/auth/login  {email, password}
r.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const q = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    const user = q.rows[0];
    if (!user) return next(Unauthorized("Invalid credentials"));
    const ok = await bcrypt.compare(password || "", user.password_hash || "");
    if (!ok) return next(Unauthorized("Invalid credentials"));
    const roles = await getUserRoles(user.id);
    const access = signAccessToken({ sub: user.id, email: user.email, roles });
    const refresh = signRefreshToken({ sub: user.id });
    // persist refresh (hashed)
    const hash = await bcrypt.hash(refresh, 10);
    const days = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || "7", 10);
    await pool.query(
      "INSERT INTO user_sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at) VALUES ($1,$2,$3,$4, now() + make_interval(days => $5))",
      [user.id, hash, req.headers["user-agent"] || null, req.ip, days]
    );
    // set cookies for browser requests
    res.cookie(
      "access_token",
      access,
      cookieOpts(
        parseInt(process.env.ACCESS_TOKEN_TTL_MIN || "30", 10) / (60 * 24)
      )
    );
    res.cookie("refresh_token", refresh, cookieOpts(days));
    res.json({
      access_token: access,
      refresh_token: refresh,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        roles,
      },
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/auth/refresh  {refresh_token?}
r.post("/refresh", async (req, res, next) => {
  try {
    const provided =
      req.body?.refresh_token || req.cookies?.refresh_token || null;
    if (!provided) return next(BadRequest("Missing token"));
    let decoded;
    try {
      decoded = jwt.verify(provided, process.env.JWT_REFRESH_SECRET);
    } catch (e) {
      return next(Unauthorized("Invalid token"));
    }
    const sess = await pool.query(
      "SELECT * FROM user_sessions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50",
      [decoded.sub]
    );
    let match = null;
    for (const row of sess.rows) {
      const ok = await bcrypt.compare(provided, row.refresh_token_hash);
      if (ok && row.expires_at > new Date()) {
        match = row;
        break;
      }
    }
    if (!match) return next(Unauthorized("Session expired"));
    const roles = await getUserRoles(decoded.sub);
    const access = signAccessToken({ sub: decoded.sub, roles });
    // refresh access cookie
    res.cookie(
      "access_token",
      access,
      cookieOpts(
        parseInt(process.env.ACCESS_TOKEN_TTL_MIN || "30", 10) / (60 * 24)
      )
    );
    res.json({ access_token: access });
  } catch (e) {
    next(e);
  }
});

// POST /api/auth/logout  {refresh_token?}
r.post("/logout", async (req, res, next) => {
  try {
    const provided =
      req.body?.refresh_token || req.cookies?.refresh_token || null;
    if (provided) {
      const all = await pool.query(
        "SELECT id, refresh_token_hash FROM user_sessions"
      );
      for (const row of all.rows) {
        if (await bcrypt.compare(provided, row.refresh_token_hash)) {
          await pool.query("DELETE FROM user_sessions WHERE id=$1", [row.id]);
        }
      }
    }
    // clear cookies
    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/" });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// GET /api/auth/me
r.get("/me", requireAuth, async (req, res, next) => {
  try {
    const sub = String(req.user?.sub || "");
    // If caller is an API key, return limited principal info
    if (sub.startsWith("api-key:")) {
      return res.json({
        ok: true,
        user: null,
        api_key: req.user.api_key || null,
        roles: req.user.roles || ["ApiKey"],
      });
    }
    const userId = sub;
    const q = await pool.query(
      "SELECT id, email, full_name FROM users WHERE id=$1",
      [userId]
    );
    const u = q.rows[0] || null;
    const roles =
      Array.isArray(req.user?.roles) && req.user.roles.length
        ? req.user.roles
        : await getUserRoles(userId);
    if (!u)
      return res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "User not found" },
      });
    res.json({
      ok: true,
      user: { id: u.id, email: u.email, full_name: u.full_name, roles },
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/auth/whoami (protected)
r.get("/whoami", requireAuth, async (req, res, next) => {
  try {
    const sub = String(req.user?.sub || "");
    if (sub.startsWith("api-key:")) {
      return res.json({
        ok: true,
        user: null,
        api_key: req.user.api_key || null,
        roles: req.user.roles || ["ApiKey"],
      });
    }
    const userId = sub;
    const q = await pool.query(
      "SELECT id, email, full_name FROM users WHERE id=$1",
      [userId]
    );
    const u = q.rows[0] || null;
    const roles =
      Array.isArray(req.user?.roles) && req.user.roles.length
        ? req.user.roles
        : await getUserRoles(userId);
    if (!u)
      return res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "User not found" },
      });
    res.json({
      ok: true,
      user: { id: u.id, email: u.email, full_name: u.full_name, roles },
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/auth/request-password-reset {email}
r.post("/request-password-reset", async (req, res, next) => {
  try {
    const { email } = req.body;
    const q = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    const u = q.rows[0];
    if (!u) return res.json({ ok: true }); // do not reveal
    const raw = cryptoRandom(48);
    const hash = await bcrypt.hash(raw, 10);
    await pool.query(
      "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1,$2, now() + make_interval(days => 1))",
      [u.id, hash]
    );

    // Best-effort: queue reset email
    try {
      const linkBase = process.env.APP_PUBLIC_URL || "https://example.com";
      const resetUrl = `${linkBase}/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(raw)}`;
      await queueMessage({
        channel: "EMAIL",
        to_email: email,
        template_code: "PASSWORD_RESET_LINK",
        subject: "Password reset request",
        body: `Use this link to reset your password: ${resetUrl}`,
      });
    } catch {}

    res.json({ ok: true, token_preview: raw.slice(0, 8) + "…" });
  } catch (e) {
    next(e);
  }
});

// POST /api/auth/reset-password {token, email, new_password}
r.post("/reset-password", async (req, res, next) => {
  try {
    const { token, email, new_password } = req.body;
    const q = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    const u = q.rows[0];
    if (!u) return next(BadRequest("Invalid"));
    const toks = await pool.query(
      "SELECT * FROM password_reset_tokens WHERE user_id=$1 AND used=false AND expires_at > now() ORDER BY created_at DESC LIMIT 20",
      [u.id]
    );
    let matched = null;
    for (const row of toks.rows) {
      if (await bcrypt.compare(token, row.token_hash)) {
        matched = row;
        break;
      }
    }
    if (!matched) return next(BadRequest("Invalid or expired"));
    const hash = await bcrypt.hash(new_password, 10);
    await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [
      hash,
      u.id,
    ]);
    await pool.query("UPDATE password_reset_tokens SET used=true WHERE id=$1", [
      matched.id,
    ]);

    // Best-effort: security alert to user
    try {
      await queueMessage({
        channel: "EMAIL",
        to_email: email,
        template_code: "SECURITY_ALERT_PASSWORD_CHANGED",
        subject: "Your password was changed",
        body: "If this wasn\'t you, please contact support immediately.",
      });
      await queueMessage({
        channel: "IN_APP",
        to_user_id: u.id,
        template_code: "SECURITY_ALERT_PASSWORD_CHANGED",
        subject: "Password changed",
        body: "Your password was updated.",
      });
    } catch {}

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Request OTP code for login or sensitive action
// body: { email?, phone?, purpose? }
r.post("/otp/request", async (req, res, next) => {
  try {
    const settings = await readOtpSettings();
    if (!settings.enabled) return next(BadRequest('OTP is disabled'));

    const email = req.body?.email || null;
    const phone = req.body?.phone || null;
    const purpose = String(req.body?.purpose || 'login');
    if (!email && !phone) return next(BadRequest('email or phone required'));

    const code = genOtp();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + settings.code_ttl_sec * 1000);

    await pool.query(
      `INSERT INTO otp_codes (email, phone, purpose, code_hash, max_attempts, expires_at) VALUES ($1,$2,$3,$4,$5,$6)`,
      [email ? String(email).toLowerCase() : null, phone || null, purpose, codeHash, settings.max_attempts, expiresAt]
    );

    // Send on configured channels when possible
    try {
      if (settings.channels.includes('EMAIL') && email) {
        await queueMessage({ channel: 'EMAIL', to_email: email, template_code: 'OTP_CODE_EMAIL', subject: 'Your verification code', body: `Your verification code is ${code}.` });
      }
      if (settings.channels.includes('SMS') && phone) {
        await queueMessage({ channel: 'SMS', to_phone: phone, template_code: 'OTP_CODE_SMS', body: `Your code is ${code}` });
      }
      // IN_APP fallback if a logged-in user is requesting for a sensitive action
      if ((!email && !phone) && req.user?.sub) {
        await queueMessage({ channel: 'IN_APP', to_user_id: req.user.sub, template_code: 'OTP_CODE_IN_APP', subject: 'Verification code', body: `Your code is ${code}` });
      }
    } catch {}

    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Verify OTP code
// body: { email?, phone?, purpose?, code }
r.post("/otp/verify", async (req, res, next) => {
  try {
    const email = req.body?.email ? String(req.body.email).toLowerCase() : null;
    const phone = req.body?.phone || null;
    const purpose = String(req.body?.purpose || 'login');
    const code = String(req.body?.code || '').trim();
    if (!code) return next(BadRequest('code is required'));
    if (!email && !phone) return next(BadRequest('email or phone required'));

    const { rows } = await pool.query(
      `SELECT * FROM otp_codes WHERE used=false AND expires_at > now() AND (lower(email)=COALESCE($1, lower(email)) OR ($1 IS NULL AND email IS NULL)) AND (phone=COALESCE($2, phone) OR ($2 IS NULL AND phone IS NULL)) AND purpose=$3 ORDER BY created_at DESC LIMIT 10`,
      [email, phone, purpose]
    );
    let match = null;
    for (const row of rows) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await bcrypt.compare(code, row.code_hash);
      if (ok) { match = row; break; }
    }
    if (!match) return next(BadRequest('Invalid or expired code'));

    // Increment attempts and validate
    const attempts = Number(match.attempts || 0) + 1;
    if (attempts > Number(match.max_attempts || 5)) return next(BadRequest('Too many attempts'));

    await pool.query(`UPDATE otp_codes SET attempts=$1, used=true WHERE id=$2`, [attempts, match.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

async function readOtpSettings(){
  const q = await pool.query(`SELECT enabled, channels, code_ttl_sec, max_attempts FROM otp_settings WHERE id=TRUE`);
  const row = q.rows[0] || { enabled: false, channels: [], code_ttl_sec: 300, max_attempts: 5 };
  const channels = Array.isArray(row.channels) ? row.channels : (row.channels ? JSON.parse(row.channels) : []);
  return { enabled: !!row.enabled, channels, code_ttl_sec: Number(row.code_ttl_sec||300), max_attempts: Number(row.max_attempts||5) };
}
function genOtp(){ return String(Math.floor(100000 + Math.random() * 900000)); }

function cryptoRandom(len) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < len; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

export default r;
