// src/middleware/audit-logger.js
import { auditLog } from "../utils/logger.js";

const INCLUDE_BODY = String(process.env.AUDIT_LOG_INCLUDE_BODY || "false").toLowerCase() === "true";
const BODY_PREVIEW_LIMIT = Number(process.env.AUDIT_LOG_BODY_LIMIT || 2048);

function cloneAndRedact(obj) {
  try {
    const redactKeys = [/pass(word)?/i, /token/i, /secret/i, /authorization/i, /api[_-]?key/i];
    if (!obj || typeof obj !== "object") return obj;
    const out = Array.isArray(obj) ? [] : {};
    for (const [k, v] of Object.entries(obj)) {
      if (redactKeys.some((re) => re.test(k))) {
        out[k] = "<redacted>";
      } else if (v && typeof v === "object") {
        out[k] = cloneAndRedact(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  } catch {
    return undefined;
  }
}

export default function auditLogger(req, res, next) {
  const start = process.hrtime.bigint();
  const startedAt = new Date();

  const base = {
    type: "access",
    ts: startedAt.toISOString(),
    request_id: req.request_id,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress,
    ua: req.headers["user-agent"] || null,
    host: req.headers.host || null,
    referer: req.headers.referer || req.headers.referrer || null,
    content_length: Number(req.headers["content-length"] || 0) || 0,
  };

  const resolveUser = () => {
    const u = req.user || {};
    const sub = u.sub || null;
    const email = u.email || null;
    const roles = Array.isArray(u.roles) ? u.roles : null;
    const apiKey = u.api_key ? { id: u.api_key.id, name: u.api_key.name } : null;
    return { sub, email, roles, api_key: apiKey };
  };

  let bodyPreview = undefined;
  let bodyTruncated = false;
  let queryPreview = undefined;
  if (INCLUDE_BODY) {
    try {
      const red = cloneAndRedact(req.body);
      const txt = JSON.stringify(red);
      if (txt && txt !== "undefined") {
        if (txt.length > BODY_PREVIEW_LIMIT) {
          bodyPreview = txt.slice(0, BODY_PREVIEW_LIMIT);
          bodyTruncated = true;
        } else {
          bodyPreview = txt;
        }
      }
    } catch {}
    try {
      if (req.query && Object.keys(req.query).length) {
        queryPreview = JSON.stringify(cloneAndRedact(req.query));
      }
    } catch {}
  }

  const done = () => {
    // Calculate precise duration in ms
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    const status = res.statusCode || 0;
    const respLen = Number(res.getHeader("content-length") || 0) || 0;

    const entry = {
      ...base,
      user: resolveUser(),
      status,
      duration_ms: Math.round(durationMs),
      resp_content_length: respLen,
    };
    if (INCLUDE_BODY) {
      if (bodyPreview !== undefined) entry.request_body_preview = bodyPreview;
      if (queryPreview !== undefined) entry.query_preview = queryPreview;
      if (bodyTruncated) entry.request_body_truncated = true;
    }

    auditLog(entry);
  };

  res.on("finish", done);
  res.on("close", done);
  return next();
}
