// src/middleware/auth.js
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import pool from "../db/pool.js";
import { Unauthorized, Forbidden } from "../utils/errors.js";

const ACCESS_TTL_MIN = parseInt(process.env.ACCESS_TOKEN_TTL_MIN || "30", 10);
const REFRESH_TTL_DAYS = parseInt(
  process.env.REFRESH_TOKEN_TTL_DAYS || "7",
  10
);

export function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: `${ACCESS_TTL_MIN}m`,
  });
}
export function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: `${REFRESH_TTL_DAYS}d`,
  });
}

// ---- token & credential helpers ------------------------------------------------

function extractBearerToken(req) {
  const h = req.headers.authorization || "";
  const lower = h.toLowerCase();
  if (lower.startsWith("bearer ")) return h.slice(7).trim();
  if (lower.startsWith("token ")) return h.slice(6).trim();
  if (lower.startsWith("jwt ")) return h.slice(4).trim();
  if (req.cookies && req.cookies.access_token) return req.cookies.access_token;
  if (req.query && (req.query.access_token || req.query.token)) {
    return String(req.query.access_token || req.query.token);
  }
  return null;
}

function extractBasicCredentials(req) {
  // RFC 7617: Authorization: Basic base64(user:pass)
  const h = req.headers.authorization || "";
  if (!/^basic\s/i.test(h)) return null;
  try {
    const b64 = h.split(" ")[1] || "";
    const txt = Buffer.from(b64, "base64").toString("utf8");
    const idx = txt.indexOf(":");
    if (idx === -1) return null;
    const email = txt.slice(0, idx);
    const password = txt.slice(idx + 1);
    return { email, password };
  } catch {
    return null;
  }
}

// API key via X-API-Key (or Authorization: ApiKey <key>)
async function verifyApiKey(req) {
  const fromHeader = req.headers["x-api-key"] || null; // common convention
  let fromAuth = null;
  const h = req.headers.authorization || "";
  if (/^apikey\s/i.test(h)) fromAuth = h.split(" ")[1]?.trim();
  const raw = (fromHeader || fromAuth || "").toString();
  if (!raw) return null;

  // Compare to active keys with bcrypt’ed hashes
  const { rows } = await pool.query(
    `SELECT id, name, key_hash, scope
     FROM public.api_keys
     WHERE is_active = TRUE
       AND (expires_at IS NULL OR expires_at > now())`
  );
  for (const row of rows) {
    if (await bcrypt.compare(raw, row.key_hash)) {
      await pool.query(
        `UPDATE public.api_keys SET last_used_at = now() WHERE id = $1`,
        [row.id]
      );
      return { id: row.id, name: row.name, scope: row.scope };
    }
  }
  return null;
}

// ---- middleware: authentication & authorization --------------------------------

export async function requireAuth(req, res, next) {
  // 1) Bearer / JWT
  try {
    const token = extractBearerToken(req);
    if (token) {
      // jwt.verify throws on invalid/expired token (per docs)
      const decoded = jwt.verify(token, process.env.JWT_SECRET); // synchronous verify
      req.user = decoded;
      return next();
    }
  } catch (e) {
    // fall through to Basic / API key
  }

  // 2) HTTP Basic (email:password)
  try {
    const creds = extractBasicCredentials(req);
    if (creds) {
      const q = await pool.query(
        `SELECT id, email, password_hash, full_name
         FROM public.users
         WHERE lower(email) = lower($1)`,
        [creds.email]
      );
      const u = q.rows[0];
      if (
        u &&
        (await bcrypt.compare(creds.password || "", u.password_hash || ""))
      ) {
        const roles = await getUserRoles(u.id);
        req.user = { sub: u.id, email: u.email, full_name: u.full_name, roles };
        return next();
      }
      return next(Unauthorized("Invalid credentials"));
    }
  } catch (e) {
    // try API key
  }

  // 3) API Key
  try {
    const key = await verifyApiKey(req);
    if (key) {
      req.user = {
        sub: `api-key:${key.id}`,
        roles: ["ApiKey"],
        api_key: { id: key.id, name: key.name, scope: key.scope },
      };
      return next();
    }
  } catch (e) {
    // ignore
  }

  return next(
    Unauthorized("Authentication required", {
      expected: ["Bearer JWT", "Basic auth", "X-API-Key", "Cookies"],
    })
  );
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(Unauthorized("Unauthorized"));
    const userRoles = req.user.roles || [];
    const ok = roles.some((r) => userRoles.includes(r));
    if (!ok) return next(Forbidden("Forbidden"));
    next();
  };
}

// ---- utilities: roles & permissions --------------------------------------------

// Keeps behavior: returns role NAMES (you can switch to role codes later if needed)
export async function getUserRoles(userId) {
  const q = await pool.query(
    `
    SELECT r.name
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = $1
  `,
    [userId]
  );
  return q.rows.map((r) => r.name);
}

// Return permission CODES for the user (via roles)
// FIX: join permissions by permission_id instead of referencing rp.permission_name
export async function getUserPermissions(userId) {
  const q = await pool.query(
    `
    SELECT DISTINCT p.code
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.permissions p       ON p.id      = rp.permission_id
    WHERE ur.user_id = $1
  `,
    [userId]
  );
  return q.rows.map((r) => r.code);
}

// Require ALL of the listed permissions (codes)
export function requirePermissions(...perms) {
  return async (req, res, next) => {
    try {
      if (!req.user)
        return next(
          Unauthorized("Authentication required", {
            expected: ["Bearer JWT", "Basic auth", "X-API-Key", "Cookies"],
          })
        );

      let userPerms = req.user.perms;
      if (!userPerms) {
        // Do not authorize API keys for these checks unless you add explicit mapping
        if (String(req.user.sub || "").startsWith("api-key:")) {
          return next(Forbidden("API keys are not authorized for this action"));
        }
        const userId =
          typeof req.user.sub === "string"
            ? req.user.sub.replace(/^api-key:/, "")
            : req.user.sub;
        userPerms = await getUserPermissions(userId);
        req.user.perms = userPerms;
      }

      const hasAll = perms.every((p) => userPerms.includes(p));
      if (!hasAll)
        return next(
          Forbidden("Missing required permission(s)", {
            required: perms,
            user_permissions: userPerms,
          })
        );

      next();
    } catch (e) {
      next(e);
    }
  };
}

// Require ANY of the listed permissions (codes)
export function requireAnyPermission(...perms) {
  return async (req, res, next) => {
    try {
      if (!req.user)
        return next(
          Unauthorized("Authentication required", {
            expected: ["Bearer JWT", "Basic auth", "X-API-Key", "Cookies"],
          })
        );

      let userPerms = req.user.perms;
      if (!userPerms) {
        if (String(req.user.sub || "").startsWith("api-key:")) {
          return next(Forbidden("API keys are not authorized for this action"));
        }
        const userId =
          typeof req.user.sub === "string"
            ? req.user.sub.replace(/^api-key:/, "")
            : req.user.sub;
        userPerms = await getUserPermissions(userId);
        req.user.perms = userPerms;
      }

      const ok = perms.some((p) => userPerms.includes(p));
      if (!ok)
        return next(
          Forbidden("Missing one of required permission(s)", {
            any_of: perms,
            user_permissions: userPerms,
          })
        );

      next();
    } catch (e) {
      next(e);
    }
  };
}

// ---- password helpers -----------------------------------------------------------

export async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}
export async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash || "");
}
