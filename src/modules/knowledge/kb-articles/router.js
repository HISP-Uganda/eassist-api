import { Router } from "express";
import pool from "../../../db/pool.js";
import { parsePagination } from "../../../utils/pagination.js";
import { NotFound, BadRequest } from "../../../utils/errors.js";
import { pickFields } from "../../../utils/crud.js";
import { listDetailed } from "../../../utils/relations.js";
const r = Router();
const t = "kb_articles";

r.get("/", async (req, res, next) => {
  try {
    const { page, pageSize, offset, limit } = parsePagination(req.query);
    const params = [];
    const where = [];
    if (req.query.q) {
      params.push(`%${(req.query.q || "").toLowerCase()}%`);
      where.push(
        `(lower(title) LIKE $${params.length} OR lower(body) LIKE $${params.length})`
      );
    }
    const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
    const { rows: tot } = await pool.query(
      `SELECT count(*)::int c FROM ${t} ${whereSql}`,
      params
    );

    const items = await listDetailed(t, req, 'created_at DESC', { whereSql, params, limit, offset });

    res.json({ items, page, pageSize, total: tot[0]?.c || 0 });
  } catch (e) {
    next(e);
  }
});

r.post("/", async (req, res, next) => {
  try {
    const cols = ["title", "body", "is_published", "created_at"];
    const data = {};
    for (const c of cols) {
      if (c in req.body) data[c] = req.body[c];
    }
    if (!Object.keys(data).length)
      return next(BadRequest("No valid columns provided for insert"));
    const ph = Object.keys(data).map((_, i) => `$${i + 1}`);
    const { rows } = await pool.query(
      `INSERT INTO ${t} (${Object.keys(data).join(",")}) VALUES (${ph.join(
        ","
      )}) RETURNING *`,
      Object.values(data)
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
});

r.get("/:id", async (req, res, next) => {
  try {
    // Try centralized detailed reader first
    const enriched = await import("../../../utils/relations.js")
      .then((m) => m.readDetailed)
      .then((fn) => fn(t, "id", req.params.id, req))
      .catch(() => null);
    if (enriched) return res.json(req.query.fields ? pickFields(enriched, req.query.fields) : enriched);

    const { rows } = await pool.query(`SELECT * FROM ${t} WHERE id=$1`, [
      req.params.id,
    ]);
    if (!rows[0]) return next(NotFound("KB article not found"));
    const row = rows[0];
    res.json(req.query.fields ? pickFields(row, req.query.fields) : row);
  } catch (e) {
    next(e);
  }
});

r.put("/:id", async (req, res, next) => {
  try {
    const cols = ["title", "body", "is_published"];
    const set = [];
    const vals = [];
    cols.forEach((c) => {
      if (c in req.body) {
        set.push(`${c}=$${set.length + 1}`);
        vals.push(req.body[c]);
      }
    });
    if (!set.length)
      return next(BadRequest("No valid columns provided for update"));
    vals.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE ${t} SET ${set.join(", ")} WHERE id=$${vals.length} RETURNING *`,
      vals
    );
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
});

r.delete("/:id", async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM ${t} WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default r;
