#!/usr/bin/env node
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SOURCES = [
  { code: 'agent_reporting', name: 'Agent Reporting' },
  { code: 'phone_call', name: 'Phone Call' },
  { code: 'email', name: 'Email' },
  { code: 'verbal', name: 'Verbal' },
  { code: 'social_media', name: 'Social Media' },
  { code: 'community_of_practice', name: 'Community of Practice' },
];

async function upsertSource({ code, name }) {
  const codeL = code.toLowerCase();
  const nameL = name.toLowerCase();
  // try to find by code or name (case-insensitive)
  const found = await pool.query(
    `SELECT id FROM sources WHERE lower(code)=$1 OR lower(name)=$2 LIMIT 1`,
    [codeL, nameL]
  );
  if (found.rowCount) {
    const id = found.rows[0].id;
    await pool.query(`UPDATE sources SET code=$1, name=$2 WHERE id=$3`, [code, name, id]);
    return { id, action: 'updated' };
  }
  const ins = await pool.query(
    `INSERT INTO sources (code,name) VALUES ($1,$2) RETURNING id`,
    [code, name]
  );
  return { id: ins.rows[0].id, action: 'inserted' };
}

async function main() {
  const results = [];
  for (const s of SOURCES) {
    // ensure table exists (best-effort)
    results.push(await upsertSource(s));
  }
  console.log('Seeded sources:', results);
}

main()
  .then(() => pool.end().then(() => process.exit(0)))
  .catch((err) => {
    console.error('Failed to seed sources:', err.message || err);
    pool.end().then(() => process.exit(1));
  });

