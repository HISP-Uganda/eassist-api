#!/usr/bin/env node
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
  if (!v || !String(v).trim())
    throw new Error(`${name} is required (set it in your env)`);
  return String(v).trim();
}

const humanize = (code) =>
  code.replace(/[._-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

async function loadBlueprint() {
  const mod = await import(
    path.join(__dirname, "../src/constants/permissions.js")
  );
  const PERMISSIONS = mod.PERMISSIONS ?? mod.default ?? mod.permissions;
  const ALL_PERMISSIONS = mod.ALL_PERMISSIONS;
  const DEFAULT_ROLES = mod.DEFAULT_ROLES;

  if (
    !PERMISSIONS ||
    !Array.isArray(ALL_PERMISSIONS) ||
    !DEFAULT_ROLES?.SUPERUSER
  ) {
    throw new Error(
      "permissions.js must export PERMISSIONS, ALL_PERMISSIONS, and DEFAULT_ROLES.SUPERUSER"
    );
  }
  return { ALL_PERMISSIONS, DEFAULT_ROLES };
}

async function main() {
  const dbUrl = requireEnv("DATABASE_URL");
  const ADMIN_EMAIL = requireEnv("ADMIN_EMAIL"); // e.g., admin@example.com
  const ADMIN_NAME = process.env.ADMIN_NAME || "System Administrator";
  const rawPassword = process.env.ADMIN_PASSWORD; // provide via env/secret
  const passwordHash = rawPassword ? await bcrypt.hash(rawPassword, 12) : null;

  const client = new Client({ connectionString: dbUrl }); // node-postgres Client supports URI. See docs.
  await client.connect();

  // --- safety nets: extensions & tables (idempotent)
  await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`); // gen_random_uuid()
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
      code text,         -- may exist already; make unique via index (lower(code))
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

  // Ensure index that matches our chosen ON CONFLICT ((lower(code))) target
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS roles_code_key ON public.roles ((lower(code)));
  `);

  // --- load blueprint
  const { ALL_PERMISSIONS, DEFAULT_ROLES } = await loadBlueprint();
  const superRole = DEFAULT_ROLES.SUPERUSER;

  // Normalize to lowercase so it matches the unique index on lower(code)
  const roleCode = String(superRole.code || "").toLowerCase();

  // 1) Upsert Superuser role (conflict target matches the unique index expression)
  const roleRes = await client.query(
    `
    INSERT INTO public.roles (id, code, name, description)
    VALUES (gen_random_uuid(), $1, $2, $3)
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          description = COALESCE(EXCLUDED.description, public.roles.description),
          updated_at = now()
    RETURNING id;
    `,
    [roleCode, superRole.name, superRole.description]
  );
  const roleId = roleRes.rows[0].id;

  // 2) Ensure all permissions exist; upsert (code->name)
  for (const code of ALL_PERMISSIONS) {
    const name = humanize(code);
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
  }

  // 3) Map every permission to Superuser (idempotent)
  await client.query(
    `
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT $1, p.id
    FROM public.permissions p
    ON CONFLICT DO NOTHING
    `,
    [roleId]
  );

  // 4) Upsert admin user & bind role
  let userId;
  const u = await client.query(
    `SELECT id FROM public.users WHERE lower(email) = lower($1)`,
    [ADMIN_EMAIL]
  );

  if (u.rowCount) {
    userId = u.rows[0].id;
    if (passwordHash) {
      await client.query(
        `UPDATE public.users SET password_hash = $2, is_superuser = true, updated_at = now() WHERE id = $1`,
        [userId, passwordHash]
      );
    } else {
      await client.query(
        `UPDATE public.users SET is_superuser = true, updated_at = now() WHERE id = $1`,
        [userId]
      );
    }
  } else {
    if (!passwordHash) {
      throw new Error(
        "ADMIN_PASSWORD is required for first-time admin creation."
      );
    }
    const ins = await client.query(
      `
      INSERT INTO public.users (id, email, password_hash, is_active, is_superuser, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, true, true, now(), now())
      RETURNING id
      `,
      [ADMIN_EMAIL, passwordHash]
    );
    userId = ins.rows[0].id;
  }

  await client.query(
    `INSERT INTO public.user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [userId, roleId]
  );

  await client.end();
  console.log(`✅ Superuser ensured and admin bound: ${ADMIN_EMAIL}`);
}

main().catch((err) => {
  console.error("❌ Seed superuser failed:", err);
  process.exit(1);
});
