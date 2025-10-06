// src/utils/logger.js
import fs from "fs";
import path from "path";

let fileStream = null;
const logPath = process.env.AUDIT_LOG_PATH || "";

if (logPath) {
  try {
    const dir = path.dirname(logPath);
    fs.mkdirSync(dir, { recursive: true });
    fileStream = fs.createWriteStream(logPath, { flags: "a" });
  } catch (e) {
    console.error("[logger] Failed to open audit log file:", e.message);
  }
}

function writeLine(line) {
  try {
    if (fileStream) fileStream.write(line + "\n");
  } catch {
    // ignore file write errors (avoid crashing)
  }
  // Always also log to console for visibility
  console.log(line);
}

function redact(obj) {
  // Shallow redaction of common sensitive fields
  const out = { ...obj };
  if (out.headers) {
    const h = { ...out.headers };
    if (h.authorization) h.authorization = "<redacted>";
    if (h.cookie) h.cookie = "<redacted>";
    out.headers = h;
  }
  return out;
}

export function auditLog(entry) {
  const payload = redact(entry || {});
  writeLine(JSON.stringify(payload));
}

export default { auditLog };

