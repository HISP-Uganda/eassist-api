import { Router } from "express";
import {
  create,
  remove,
  read,
  update,
} from "../../../../../utils/crud.js";
import { listDetailed, readDetailed } from "../../../../../utils/relations.js";
import bcrypt from "bcryptjs";
import pool from "../../../../../db/pool.js";
const r = Router();
const table = "api_keys";

function randomKey(length = 48) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < length; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}
function toPrefix(raw) {
  return (raw || "").slice(0, 8);
}
function asPublic(row) {
  if (!row) return null;
  const { key_hash, ...rest } = row;
  return rest;
}

r.get("/", async (req, res, next) => {
  try {
    const rows = await listDetailed(table, req, "created_at DESC");
    res.json(rows.map(asPublic));
  } catch (e) {
    next(e);
  }
});

r.get("/:id", async (req, res, next) => {
  try {
    const enriched = await readDetailed(table, 'id', req.params.id, req);
    const row = enriched || await read(table, "id", req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(asPublic(row));
  } catch (e) {
    next(e);
  }
});

// Create returns a plaintext api_key once (never stored)
r.post("/", async (req, res, next) => {
  try {
    const { name, scope = "system", expires_at = null } = req.body;
    const raw = randomKey();
    const hash = await bcrypt.hash(raw, 10);
    const created_by =
      req.user &&
      typeof req.user.sub === "string" &&
      !req.user.sub.startsWith("api-key:")
        ? req.user.sub
        : null;
    const row = await create(
      table,
      {
        name,
        key_hash: hash,
        scope,
        is_active: true,
        created_at: new Date(),
        created_by,
        expires_at: expires_at ? new Date(expires_at) : null,
        prefix: toPrefix(raw),
      },
      [
        "name",
        "key_hash",
        "scope",
        "is_active",
        "created_at",
        "created_by",
        "expires_at",
        "prefix",
      ]
    );
    res
      .status(201)
      .json({
        id: row.id,
        name: row.name,
        scope: row.scope,
        is_active: row.is_active,
        created_at: row.created_at,
        created_by: row.created_by,
        expires_at: row.expires_at,
        prefix: row.prefix,
        api_key: raw,
      });
  } catch (e) {
    next(e);
  }
});

// Update metadata (not the secret)
r.put("/:id", async (req, res, next) => {
  try {
    const allowed = ["name", "scope", "is_active", "expires_at"];
    const data = {};
    for (const k of allowed) {
      if (k in req.body)
        data[k] =
          k === "expires_at" && req.body[k]
            ? new Date(req.body[k])
            : req.body[k];
    }
    const row = await update(table, "id", req.params.id, data, allowed);
    res.json(asPublic(row));
  } catch (e) {
    next(e);
  }
});

// Activate / Deactivate
r.post("/:id/activate", async (req, res, next) => {
  try {
    const row = await update(table, "id", req.params.id, { is_active: true }, [
      "is_active",
    ]);
    res.json(asPublic(row));
  } catch (e) {
    next(e);
  }
});
r.post("/:id/deactivate", async (req, res, next) => {
  try {
    const row = await update(table, "id", req.params.id, { is_active: false }, [
      "is_active",
    ]);
    res.json(asPublic(row));
  } catch (e) {
    next(e);
  }
});

// Rotate: replace key_hash with a new key, return plaintext once
r.post("/:id/rotate", async (req, res, next) => {
  try {
    const existing = await readDetailed(table, "id", req.params.id, req) || await read(table, "id", req.params.id);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const raw = randomKey();
    const hash = await bcrypt.hash(raw, 10);
    const { rows } = await pool.query(
      `UPDATE ${table} SET key_hash=$1, prefix=$2, updated_at=now() WHERE id=$3 RETURNING *`,
      [hash, toPrefix(raw), req.params.id]
    );
    const row = rows[0];
    res.json({
      id: row.id,
      name: row.name,
      scope: row.scope,
      is_active: row.is_active,
      updated_at: row.updated_at,
      prefix: row.prefix,
      api_key: raw,
    });
  } catch (e) {
    next(e);
  }
});

// Delete (revoke)
r.delete("/:id", async (req, res, next) => {
  try {
    res.json(await remove(table, "id", req.params.id));
  } catch (e) {
    next(e);
  }
});

export default r;
