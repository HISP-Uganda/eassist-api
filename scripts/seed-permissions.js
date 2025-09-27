#!/usr/bin/env node
// seeds permissions from src/constants/permissions.js

import "dotenv/config"; // if you use a custom env filename, see NOTE below
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// NOTE: if your env file is NOT ".env", use:
//   import dotenv from 'dotenv';
//   import path from 'node:path';
//   import { fileURLToPath } from 'node:url';
//   const __filename = fileURLToPath(import.meta.url);
//   const __dirname  = path.dirname(__filename);
//   dotenv.config({ path: path.join(__dirname, '../.env') });

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`${name} is required`);
  return String(v).trim();
}

// Human label from a code like "knowledge.kb.articles.update"
const humanize = (code) =>
  code
    .replace(/[._-]+/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

async function loadPermissionCodes() {
  const mod = await import(
    path.join(__dirname, "../src/constants/permissions.js")
  );
  // we rely on the fixed, final exports you just added
  const ALL_PERMISSIONS = mod.ALL_PERMISSIONS;
  if (!Array.isArray(ALL_PERMISSIONS)) {
    throw new Error(
      "Expected ALL_PERMISSIONS array export from src/constants/permissions.js"
    );
  }
  return ALL_PERMISSIONS;
}

async function main() {
  const dbUrl = requireEnv("DATABASE_URL");

  const client = new Client({ connectionString: dbUrl });
  await client.connect(); // node-postgres connection URI is standard. See docs.
  // https://node-postgres.com/features/connecting :contentReference[oaicite:0]{index=0}

  // Safety net: extension & table (idempotent). gen_random_uuid() documented here:
  // https://www.postgresql.org/docs/current/functions-uuid.html :contentReference[oaicite:1]{index=1}
  await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.permissions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text UNIQUE NOT NULL,
      name text NOT NULL,
      description text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  const codes = await loadPermissionCodes();

  for (const raw of codes) {
    const code = String(raw || "").trim();
    if (!code) continue;
    const name = humanize(code);
    // Postgres upsert with ON CONFLICT:
    // https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT :contentReference[oaicite:2]{index=2}
    await client.query(
      `
      INSERT INTO public.permissions (code, name)
      VALUES ($1, $2)
      ON CONFLICT (code) DO UPDATE
        SET name = EXCLUDED.name,
            updated_at = now();
      `,
      [code, name]
    );
    process.stdout.write(`✔ ${code}\n`);
  }

  await client.end();
  console.log("✅ Permissions seeded from src/constants/permissions.js");
}

main().catch((err) => {
  console.error("❌ Seed permissions failed:", err);
  process.exit(1);
});
