import { Router } from "express";
import pool from "../../../db/pool.js";
import { parsePagination } from "../../../utils/pagination.js";
import { NotFound, BadRequest } from "../../../utils/errors.js";
import { listDetailed } from "../../../utils/relations.js";
const r = Router();
const t = "faq_origins";

r.get("/", async (req, res, next) => {
  try {
    const { page, pageSize, offset, limit } = parsePagination(req.query);
    const params = [];
    const where = [];
    if (req.query.faq_id) {
      params.push(req.query.faq_id);
      where.push(`faq_id=$${params.length}`);
    }
    if (req.query.ticket_id) {
      params.push(req.query.ticket_id);
      where.push(`ticket_id=$${params.length}`);
    }
    if (req.query.from) {
      params.push(req.query.from);
      where.push(`created_at >= $${params.length}`);
    }
    if (req.query.to) {
      params.push(req.query.to);
      where.push(`created_at <= $${params.length}`);
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
    const cols = ["faq_id", "ticket_id", "created_at"];
    const data = {};
    for (const c of cols) {
      if (c in req.body) data[c] = req.body[c];
    }
    if (!Object.keys(data).length)
      return next(BadRequest("No valid columns provided for insert"));
    const vals = Object.values(data);
    const ph = vals.map((_, i) => `$${i + 1}`);
    const { rows } = await pool.query(
      `INSERT INTO ${t} (${Object.keys(data).join(",")}) VALUES (${ph.join(
        ","
      )}) RETURNING *`,
      vals
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
});

r.get("/:id", async (req, res, next) => {
  try {
    // Prefer centralized detailed reader when available
    const enriched = await import("../../../utils/relations.js")
      .then((m) => m.readDetailed)
      .then((fn) => fn(t, "id", req.params.id, req))
      .catch(() => null);
    if (enriched) return res.json(enriched);

    const { rows } = await pool.query(`SELECT * FROM ${t} WHERE id=$1`, [
      req.params.id,
    ]);
    if (!rows[0]) return next(NotFound("FAQ origin not found"));
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
});

r.put("/:id", async (req, res, next) => {
  try {
    const cols = ["faq_id", "ticket_id", "created_at"];
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
