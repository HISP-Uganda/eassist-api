import { Router } from "express";
import pool from "../../../db/pool.js";
import { parsePagination } from "../../../utils/pagination.js";
import { BadRequest, NotFound } from "../../../utils/errors.js";
import { pickFields } from "../../../utils/crud.js";
const r = Router();
const t = "kb_ratings";

// small validator to avoid passing non-UUIDs to PG and causing 22P02 errors
function isUuid(v) {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
  );
}

r.get("/", async (req, res, next) => {
  try {
    const { page, pageSize, offset, limit } = parsePagination(req.query);
    const params = [];
    const where = [];
    if (req.query.article_id) {
      // validate uuid format
      if (!isUuid(String(req.query.article_id)))
        return next(BadRequest("article_id must be a valid UUID"));
      params.push(req.query.article_id);
      where.push(`article_id=$${params.length}`);
    }
    if (req.query.user_id) {
      if (!isUuid(String(req.query.user_id)))
        return next(BadRequest("user_id must be a valid UUID"));
      params.push(req.query.user_id);
      where.push(`user_id=$${params.length}`);
    }
    const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
    const { rows: tot } = await pool.query(
      `SELECT count(*)::int c FROM ${t} ${whereSql}`,
      params
    );
    const { rows } = await pool.query(
      `SELECT * FROM ${t} ${whereSql} ORDER BY created_at DESC LIMIT $${
        params.length + 1
      } OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    res.json({ items: rows, page, pageSize, total: tot[0]?.c || 0 });
  } catch (e) {
    next(e);
  }
});

r.post("/", async (req, res, next) => {
  try {
    const cols = ["article_id", "user_id", "rating", "created_at"];
    const data = {};
    for (const c of cols) {
      if (c in req.body) data[c] = req.body[c];
    }
    // Validate UUIDs if present to avoid DB errors
    if (data.article_id && !isUuid(String(data.article_id)))
      return next(BadRequest("article_id must be a valid UUID"));
    if (data.user_id && !isUuid(String(data.user_id)))
      return next(BadRequest("user_id must be a valid UUID"));

    if (!Object.keys(data).length)
      return next(BadRequest("No valid columns provided for insert"));
    const vals = Object.values(data);
    const ph = vals.map((_, i) => `$${i + 1}`);
    const { rows } = await pool.query(
      `INSERT INTO ${t} (${Object.keys(data).join(",")}) VALUES (${ph.join(
        ","
      )}) ON CONFLICT (article_id, user_id) DO UPDATE SET rating=EXCLUDED.rating, created_at=EXCLUDED.created_at RETURNING *`,
      vals
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
});

r.get("/summary", async (req, res, next) => {
  try {
    if (!req.query.article_id) return next(BadRequest("article_id required"));
    if (!isUuid(String(req.query.article_id)))
      return next(BadRequest("article_id must be a valid UUID"));
    const { rows } = await pool.query(
      `SELECT avg(rating)::numeric(10,2) AS avg, count(*)::int AS count FROM ${t} WHERE article_id=$1`,
      [req.query.article_id]
    );
    res.json(rows[0] || { avg: null, count: 0 });
  } catch (e) {
    next(e);
  }
});

r.get("/:id", async (req, res, next) => {
  try {
    if (!isUuid(String(req.params.id)))
      return next(BadRequest("id must be a valid UUID"));

    // Try centralized detailed reader first
    const enriched = await import("../../../utils/relations.js")
      .then((m) => m.readDetailed)
      .then((fn) => fn(t, "id", req.params.id, req))
      .catch(() => null);
    if (enriched)
      return res.json(
        req.query.fields ? pickFields(enriched, req.query.fields) : enriched
      );

    const { rows } = await pool.query(`SELECT * FROM ${t} WHERE id=$1`, [
      req.params.id,
    ]);
    if (!rows[0]) return next(NotFound("KB rating not found"));
    res.json(
      req.query.fields ? pickFields(rows[0], req.query.fields) : rows[0]
    );
  } catch (e) {
    next(e);
  }
});

r.put("/:id", async (req, res, next) => {
  try {
    if (!isUuid(String(req.params.id)))
      return next(BadRequest("id must be a valid UUID"));
    const cols = ["article_id", "user_id", "rating", "created_at"];
    const set = [];
    const vals = [];
    cols.forEach((c) => {
      if (c in req.body) {
        if (
          (c === "article_id" || c === "user_id") &&
          !isUuid(String(req.body[c]))
        )
          return next(BadRequest(`${c} must be a valid UUID`));
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
    if (!isUuid(String(req.params.id)))
      return next(BadRequest("id must be a valid UUID"));
    await pool.query(`DELETE FROM ${t} WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default r;
