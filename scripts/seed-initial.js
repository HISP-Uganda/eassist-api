import { Pool } from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function upsertRole(name, description = "") {
  const q = await pool.query("SELECT id FROM roles WHERE name=$1", [name]);
  if (q.rowCount) {
    return q.rows[0].id;
  }
  const ins = await pool.query(
    "INSERT INTO roles (name, description) VALUES ($1,$2) RETURNING id",
    [name, description]
  );
  return ins.rows[0].id;
}

async function upsertUser(email, full_name, password) {
  const q = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
  const hash = await bcrypt.hash(password, 10);
  if (q.rowCount) {
    const id = q.rows[0].id;
    await pool.query("UPDATE users SET full_name=$1 WHERE id=$2", [
      full_name,
      id,
    ]);
    if (password) {
      await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [
        hash,
        id,
      ]);
    }
    return id;
  } else {
    const ins = await pool.query(
      "INSERT INTO users (email, full_name, password_hash, is_active) VALUES ($1,$2,$3,true) RETURNING id",
      [email, full_name, hash]
    );
    return ins.rows[0].id;
  }
}

async function ensureUserRole(user_id, role_id) {
  await pool.query(
    "INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
    [user_id, role_id]
  );
}

async function main() {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@eassist.local";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe!2025";
  const ADMIN_FULL_NAME = process.env.ADMIN_FULL_NAME || "System Administrator";

  // Standard application roles
  const roles = [
    ["Admin", "Full administrative access"],
    ["HelpDeskManager", "Manage agents, queues, workflows, and reports"],
    ["Agent", "Handle tickets and knowledge content"],
    ["EndUser", "Submit and track tickets"],
  ];
  const roleIds = {};
  for (const [name, desc] of roles) {
    roleIds[name] = await upsertRole(name, desc);
  }

  // Admin user
  const adminId = await upsertUser(
    ADMIN_EMAIL,
    ADMIN_FULL_NAME,
    ADMIN_PASSWORD
  );
  await ensureUserRole(adminId, roleIds["Admin"]);

  console.log("Seed complete.");
  console.log("Admin user:", ADMIN_EMAIL);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
