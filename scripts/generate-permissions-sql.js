#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PERMS_MODULE_PATH = path.join(
  __dirname,
  "../src/constants/permissions.js"
);
const OUTPUT_SQL_PATH = path.join(
  __dirname,
  "./migrations/20250923_permissions_seed.sql"
);

// --- load PERMISSIONS object ---
const mod = await import(PERMS_MODULE_PATH);
const PERMISSIONS_OBJ = mod.PERMISSIONS ?? mod.default ?? mod.permissions;
if (
  !PERMISSIONS_OBJ ||
  typeof PERMISSIONS_OBJ !== "object" ||
  Array.isArray(PERMISSIONS_OBJ)
) {
  throw new Error(
    "Expected PERMISSIONS to be an object export with string values."
  );
}

// helpers
const esc = (s) => s.replace(/'/g, "''");
const humanize = (code) =>
  code
    .replace(/[._-]+/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

// derive code from CONSTANT_NAME
const deriveFromKey = (key) =>
  key
    .toLowerCase()
    .trim()
    .replace(/__+/g, ".") // double underscores -> dot
    .replace(/_/g, ".") // underscores -> dot
    .replace(/\.+/g, "."); // collapse multiple dots

// generate random fallback (short uuid)
const randomCode = () => `auto.${crypto.randomUUID()}`;

// Build normalized rows from entries, with guards and de-dupe
const seen = new Set();
const rows = [];

for (const [KEY, VAL] of Object.entries(PERMISSIONS_OBJ)) {
  // 1) prefer provided code value
  let code = typeof VAL === "string" ? VAL.trim() : "";

  // 2) if missing, derive from constant name
  if (!code) code = deriveFromKey(KEY);

  // 3) final safety: if still empty, random
  if (!code) code = randomCode();

  // normalize code (avoid accidental spaces)
  code = code.replace(/\s+/g, "").replace(/\.+/g, ".");

  // skip duplicates
  if (seen.has(code)) continue;
  seen.add(code);

  const name = humanize(code);
  const description = null; // keep null or wire your own mapping here

  // push one clean row object
  rows.push({ code, name, description });
}

if (rows.length === 0) {
  throw new Error("No permissions produced from PERMISSIONS constants.");
}

// compose SQL
const valuesSql = rows
  .map(
    (r) =>
      `('${esc(r.code)}', '${esc(r.name)}', ${
        r.description === null ? "NULL" : `'${esc(r.description)}'`
      })`
  )
  .join(",\n  ");

const sql = `-- AUTO-GENERATED: do not edit by hand
-- Source: ${path.relative(path.join(__dirname, ".."), PERMS_MODULE_PATH)}

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,
  name        text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.permissions
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

INSERT INTO public.permissions (code, name, description)
VALUES
  ${valuesSql}
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      description = COALESCE(EXCLUDED.description, public.permissions.description),
      updated_at = now();
`;

fs.writeFileSync(OUTPUT_SQL_PATH, sql);
console.log(
  `✅ Wrote ${path.relative(
    process.cwd(),
    OUTPUT_SQL_PATH
  )} from src/constants/permissions.js (${rows.length} permissions)`
);
