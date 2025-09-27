import pool from "../db/pool.js";
import { BadRequest, Conflict } from "./errors.js";
const hasColumnCache = new Map();
async function hasColumn(table, column) {
  const key = `${table}.${column}`;
  if (hasColumnCache.has(key)) return hasColumnCache.get(key);
  try {
    const tbl = String(table).replace(/^.*\./, '').toLowerCase();
    const { rows } = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2 LIMIT 1`,
      [tbl, column]
    );
    const ok = rows.length > 0;
    hasColumnCache.set(key, ok);
    return ok;
  } catch (e) {
    // conservatively assume false on error
    hasColumnCache.set(key, false);
    return false;
  }
}

export async function list(table, order = "1 DESC") {
  const { rows } = await pool.query(`SELECT * FROM ${table} ORDER BY ${order}`);
  return rows;
}
export async function read(table, idCol, id) {
  const { rows } = await pool.query(
    `SELECT * FROM ${table} WHERE ${idCol}=$1`,
    [id]
  );
  return rows[0];
}
export async function create(table, data, allow) {
  const cols = Object.keys(data).filter((k) => allow.includes(k));
  if (!cols.length) {
    throw BadRequest("No valid columns provided for insert");
  }
  // Quote identifiers to be safe (assumes valid column names from allow list)
  const colNames = cols.map((c) => `"${c}"`);
  const vals = cols.map((_, i) => `$${i + 1}`);
  try {
    const { rows } = await pool.query(
      `INSERT INTO ${table} (${colNames.join(",")}) VALUES (${vals.join(",")}) RETURNING *`,
      cols.map((c) => data[c])
    );
    return rows[0];
  } catch (e) {
    // translate unique constraint errors
    if (e && e.code === "23505") {
      throw Conflict(e.detail || "Duplicate key");
    }
    throw e;
  }
}
export async function update(table, idCol, id, data, allow) {
  const cols = Object.keys(data).filter((k) => allow.includes(k));
  if (!cols.length) {
    throw BadRequest("No valid columns provided for update");
  }
  const sets = cols.map((c, i) => `"${c}"=$${i + 1}`);
  try {
    // determine whether to append updated_at=now()
    const addUpdated = await hasColumn(table, 'updated_at');
    // If client already supplied updated_at column in cols, do not append to avoid duplicate assignment
    const alreadyHasUpdated = cols.includes('updated_at');
    const updateSql = `UPDATE ${table} SET ${sets.join(", ")}${addUpdated && !alreadyHasUpdated ? ", updated_at=now()" : ""} WHERE ${idCol}=$${cols.length + 1} RETURNING *`;
     const { rows } = await pool.query(
       updateSql,
       [...cols.map((c) => data[c]), id]
     );
     return rows[0];
   } catch (e) {
     if (e && e.code === "23505") {
       throw Conflict(e.detail || "Duplicate key");
     }
     throw e;
   }
 }
 export async function remove(table, idCol, id) {
   await pool.query(`DELETE FROM ${table} WHERE ${idCol}=$1`, [id]);
   return { ok: true };
 }
async function buildSelectColumns(table, req, defaults = null) {
  // returns a string to use in SELECT: either '*' or '"col1","col2"'
  // defaults: if provided, use defaults when no fields requested; if null, default to '*'
  const raw = (req?.query?.fields || null);
  if (!raw) {
    if (Array.isArray(defaults) && defaults.length) {
      return defaults.map(c => `"${c}"`).join(',');
    }
    return '*';
  }
  const parts = String(raw).split(',').map(s=>s.trim()).filter(Boolean);
  if (!parts.length) return '*';
  const valid = [];
  for (const p of parts) {
    // only allow simple column names (no quotes, no dots)
    if (!/^[a-zA-Z0-9_]+$/.test(p)) continue;
    // check column exists
    // hasColumn lowercases table name within itself
    // eslint-disable-next-line no-await-in-loop
    if (await hasColumn(table, p)) valid.push(p);
  }
  if (!valid.length) return '*';
  return valid.map(c => `"${c}"`).join(',');
}

function pickFields(obj, fields) {
  if (!obj || !fields) return obj;
  const parts = String(fields).split(',').map(s=>s.trim()).filter(Boolean);
  if (!parts.length) return obj;
  const out = {};
  for (const p of parts) {
    if (p in obj) out[p] = obj[p];
  }
  return out;
}

export { buildSelectColumns, pickFields };
