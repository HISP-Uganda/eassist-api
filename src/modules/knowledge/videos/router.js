import { Router } from "express";
import pool from "../../../db/pool.js";
import { parsePagination } from "../../../utils/pagination.js";
import { NotFound, BadRequest } from "../../../utils/errors.js";
import { pickFields } from "../../../utils/crud.js";
import { listDetailed, readDetailed } from "../../../utils/relations.js";
const r = Router();
const t = "videos";

// helpers
function isUuid(v) {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
function isIntString(v) {
  return /^[0-9]+$/.test(String(v));
}
function stripFkIdsVideo(row){
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  if (Object.prototype.hasOwnProperty.call(out,'category') && Object.prototype.hasOwnProperty.call(out,'category_id')) delete out.category_id;
  if (Object.prototype.hasOwnProperty.call(out,'system_category') && Object.prototype.hasOwnProperty.call(out,'system_category_id')) delete out.system_category_id;
  return out;
}

r.get("/", async (req, res, next) => {
  try {
    const { page, pageSize, offset, limit } = parsePagination(req.query);
    const params = [];
    const where = [];
    if (req.query.q) {
      params.push(`%${(req.query.q || "").toLowerCase()}%`);
      where.push(
        `(lower(title) LIKE $${params.length} OR lower(description) LIKE $${params.length})`
      );
    }
    if (req.query.category_id) {
      if (!isUuid(String(req.query.category_id)))
        return next(BadRequest("category_id must be a valid UUID"));
      params.push(req.query.category_id);
      where.push(`category_id=$${params.length}`);
    }
    if (req.query.system_category_id) {
      // system_category_id is an integer in the DB
      if (!isIntString(req.query.system_category_id))
        return next(BadRequest("system_category_id must be an integer"));
      params.push(parseInt(req.query.system_category_id, 10));
      where.push(`system_category_id=$${params.length}`);
    }
    if (req.query.language) {
      params.push(req.query.language);
      where.push(`language=$${params.length}`);
    }
    if (req.query.is_published != null) {
      const v = String(req.query.is_published).toLowerCase() === "true";
      params.push(v);
      where.push(`is_published=$${params.length}`);
    }
    const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
    const { rows: tot } = await pool.query(
      `SELECT count(*)::int c FROM ${t} ${whereSql}`,
      params
    );

    const itemsRaw = await listDetailed(t, req, 'created_at DESC', { whereSql, params, limit, offset });
    const items = itemsRaw.map(stripFkIdsVideo);

    res.json({ items, page, pageSize, total: tot[0]?.c || 0 });
  } catch (e) {
    next(e);
  }
});

r.post("/", async (req, res, next) => {
  try {
    const cols = [
      "title",
      "description",
      "category_id",
      "system_category_id",
      "url",
      "duration_seconds",
      "language",
      "is_published",
      "created_at",
    ];
    const data = {};
    for (const c of cols) {
      if (c in req.body) data[c] = req.body[c];
    }

    // DEBUG: log incoming data to help diagnose invalid UUID being sent to PG
    console.error('VIDEOS POST incoming data:', JSON.stringify(data));

    // Validate provided fields to avoid DB type errors
    if (data.category_id && !isUuid(String(data.category_id)))
      return next(BadRequest("category_id must be a valid UUID"));
    if (
      data.system_category_id != null &&
      !isIntString(data.system_category_id)
    )
      return next(BadRequest("system_category_id must be an integer"));
    if (
      data.duration_seconds != null &&
      !isIntString(data.duration_seconds)
    )
      return next(BadRequest("duration_seconds must be an integer"));
    if (Object.keys(data).length === 0)
      return next(BadRequest("No valid columns provided for insert"));

    // Normalize integer fields
    if (data.system_category_id != null)
      data.system_category_id = parseInt(data.system_category_id, 10);
    if (data.duration_seconds != null)
      data.duration_seconds = parseInt(data.duration_seconds, 10);

    const ph = Object.keys(data).map((_, i) => `$${i + 1}`);
    const { rows } = await pool.query(
      `INSERT INTO ${t} (${Object.keys(data).join(",")}) VALUES (${ph.join(",")}) RETURNING *`,
      Object.values(data)
    );

    // Re-read enriched object with relations/collections and optional projection
    const base = rows[0];
    let enriched = null;
    try {
      enriched = await readDetailed(t, 'id', base.id, req);
    } catch (_) {}
    const out = stripFkIdsVideo(enriched || base);
    return res.status(201).json(req.query.fields ? pickFields(out, req.query.fields) : out);
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
    if (enriched) return res.json(req.query.fields ? pickFields(stripFkIdsVideo(enriched), req.query.fields) : stripFkIdsVideo(enriched));

    const { rows } = await pool.query(`SELECT * FROM ${t} WHERE id=$1`, [
      req.params.id,
    ]);
    if (!rows[0]) return next(NotFound("Video not found"));
    res.json(req.query.fields ? pickFields(rows[0], req.query.fields) : rows[0]);
  } catch (e) {
    next(e);
  }
});

r.put("/:id", async (req, res, next) => {
  try {
    if (!isUuid(String(req.params.id)))
      return next(BadRequest("id must be a valid UUID"));
    const cols = [
      "title",
      "description",
      "category_id",
      "system_category_id",
      "url",
      "duration_seconds",
      "language",
      "is_published",
      "created_at",
    ];
    const set = [];
    const vals = [];
    cols.forEach((c) => {
      if (c in req.body) {
        // validate per-type
        if (c === "category_id" && !isUuid(String(req.body[c])))
          return next(BadRequest("category_id must be a valid UUID"));
        if (c === "system_category_id" && !isIntString(req.body[c]))
          return next(BadRequest("system_category_id must be an integer"));
        if (c === "duration_seconds" && !isIntString(req.body[c]))
          return next(BadRequest("duration_seconds must be an integer"));
        set.push(`${c}=$${set.length + 1}`);
        vals.push(
          c === "system_category_id" || c === "duration_seconds"
            ? parseInt(req.body[c], 10)
            : req.body[c]
        );
      }
    });
    // If no updatable fields were provided, treat as a bad request.
    if (!set.length) return next(BadRequest("No updatable fields provided"));
    vals.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE ${t} SET ${set.join(", ")} WHERE id=$${
        vals.length
      } RETURNING *`,
      vals
    );

    const base = rows[0];
    // Re-read enriched object with relations/collections and optional projection
    let enriched = null;
    try {
      enriched = await readDetailed(t, 'id', base.id, req);
    } catch (_) {}
    const out = stripFkIdsVideo(enriched || base);
    return res.json(req.query.fields ? pickFields(out, req.query.fields) : out);
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

r.post("/:id/publish", async (req, res, next) => {
  try {
    if (!isUuid(String(req.params.id)))
      return next(BadRequest("id must be a valid UUID"));
    const { rows } = await pool.query(
      `UPDATE ${t} SET is_published=true WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
});
r.post("/:id/unpublish", async (req, res, next) => {
  try {
    if (!isUuid(String(req.params.id)))
      return next(BadRequest("id must be a valid UUID"));
    const { rows } = await pool.query(
      `UPDATE ${t} SET is_published=false WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
});

export default r;
