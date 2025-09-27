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
r.get("/me", async (req, res) => {
  res.json({ ok: true });
});

// GET /api/auth/whoami (protected)
r.get("/whoami", requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
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
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

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
