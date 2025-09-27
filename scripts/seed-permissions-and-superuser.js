#!/usr/bin/env node
// Unified seeding: permissions + superuser
// Combines scripts/seed-permissions.js and scripts/seed-superuser.js behavior

import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import bcrypt from "bcryptjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`${name} is required`);
  return String(v).trim();
}

const humanize = (code) =>
  code
    .replace(/[._-]+/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

async function loadBlueprint() {
  const mod = await import(
    path.join(__dirname, "../src/constants/permissions.js")
  );
  const ALL_PERMISSIONS = mod.ALL_PERMISSIONS;
  const PERMISSIONS = mod.PERMISSIONS || ALL_PERMISSIONS;
  const DEFAULT_ROLES = mod.DEFAULT_ROLES || {};
  if (!Array.isArray(ALL_PERMISSIONS))
    throw new Error(
      "Expected ALL_PERMISSIONS array export from src/constants/permissions.js"
    );
  return { ALL_PERMISSIONS, PERMISSIONS, DEFAULT_ROLES };
}

async function main() {
  const dbUrl = requireEnv("DATABASE_URL");
  const ADMIN_EMAIL = requireEnv("ADMIN_EMAIL");
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const ADMIN_FULL_NAME = process.env.ADMIN_FULL_NAME || "System Administrator";

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  // safety: ensure extension + core tables exist (idempotent)
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
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.roles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text,
      name text NOT NULL,
      description text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.role_permissions (
      role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
      permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    );
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.user_roles (
      user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, role_id)
    );
  `);
  await client.query(`
    ALTER TABLE IF EXISTS public.users
      ADD COLUMN IF NOT EXISTS is_superuser boolean NOT NULL DEFAULT false;
  `);

  // ensure index for role code uniqueness (case-insensitive)
  await client.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS roles_code_key ON public.roles ((lower(code)));`
  );

  const { ALL_PERMISSIONS, DEFAULT_ROLES } = await loadBlueprint();

  // DROP restrictive roles_name_allowed_chk if present to allow seeding special roles
  await client.query(
    `ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_name_allowed_chk;`
  );

  // seed permissions
  for (const raw of ALL_PERMISSIONS) {
    const code = String(raw || "").trim();
    if (!code) continue;
    const name = humanize(code);
    await client.query(
      `INSERT INTO public.permissions (code, name) VALUES ($1, $2) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();`,
      [code, name]
    );
    process.stdout.write(`✔ perm ${code}\n`);
  }

  // ensure superuser role exists
  const SUPER = DEFAULT_ROLES?.SUPERUSER || {
    code: "superuser",
    name: "Superuser",
    description: "Full access",
  };
  const roleCode = String(
    SUPER.code || SUPER.name || "superuser"
  ).toLowerCase();

  const roleRes = await client.query(
    `INSERT INTO public.roles (id, code, name, description) VALUES (gen_random_uuid(), $1, $2, $3) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = COALESCE(EXCLUDED.description, public.roles.description), updated_at = now() RETURNING id;`,
    [roleCode, SUPER.name || "Superuser", SUPER.description || null]
  );
  const roleId = roleRes.rows[0].id;

  // grant all permissions to superuser role
  await client.query(
    `INSERT INTO public.role_permissions (role_id, permission_id) SELECT $1, p.id FROM public.permissions p ON CONFLICT DO NOTHING;`,
    [roleId]
  );

  // After seeding, attempt to re-add the roles_name_allowed_chk constraint only if all names are valid
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM public.roles WHERE name NOT IN ('Admin','HelpDeskManager','Agent','EndUser')) THEN
        ALTER TABLE public.roles ADD CONSTRAINT roles_name_allowed_chk CHECK (name IN ('Admin','HelpDeskManager','Agent','EndUser'));
      END IF;
    END$$;
  `);

  // upsert admin user
  let userId;
  const u = await client.query(
    `SELECT id FROM public.users WHERE lower(email) = lower($1) LIMIT 1`,
    [ADMIN_EMAIL]
  );
  if (u.rowCount) {
    userId = u.rows[0].id;
    if (ADMIN_PASSWORD) {
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await client.query(
        `UPDATE public.users SET password_hash = $2, is_superuser = true, full_name = $3, updated_at = now() WHERE id = $1`,
        [userId, hash, ADMIN_FULL_NAME]
      );
    } else {
      await client.query(
        `UPDATE public.users SET is_superuser = true, full_name = $2, updated_at = now() WHERE id = $1`,
        [userId, ADMIN_FULL_NAME]
      );
    }
  } else {
    if (!ADMIN_PASSWORD) {
      throw new Error(
        "ADMIN_PASSWORD is required for first-time admin creation."
      );
    }
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const ins = await client.query(
      `INSERT INTO public.users (id, email, password_hash, is_active, is_superuser, full_name, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, true, true, $3, now(), now()) RETURNING id;`,
      [ADMIN_EMAIL, hash, ADMIN_FULL_NAME]
    );
    userId = ins.rows[0].id;
  }

  // bind role
  await client.query(
    `INSERT INTO public.user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [userId, roleId]
  );

  await client.end();
  console.log("\n✅ Permissions + Superuser seeded successfully");
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
