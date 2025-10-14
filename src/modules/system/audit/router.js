import { Router } from "express";
import pool from "../../../db/pool.js";
import { parsePagination } from "../../../utils/pagination.js";
import { read } from "../../../utils/crud.js";
import { listDetailed } from "../../../utils/relations.js";
const r = Router();
const t = "audit_events";

r.get("/", async (req, res, next) => {
  try {
    const { page, pageSize, offset, limit } = parsePagination(req.query);
    const params = [];
    const where = [];
    if (req.query.actor_user_id) {
      params.push(req.query.actor_user_id);
      where.push(`actor_user_id=$${params.length}`);
    }
    if (req.query.entity) {
      params.push(req.query.entity);
      where.push(`entity=$${params.length}`);
    }
    if (req.query.entity_id) {
      params.push(req.query.entity_id);
      where.push(`entity_id=$${params.length}`);
    }
    if (req.query.action) {
      params.push(req.query.action);
      where.push(`action=$${params.length}`);
    }
    if (req.query.q) {
      params.push(`%${(req.query.q || "").toLowerCase()}%`);
      where.push(
        `(lower(action) LIKE $${params.length} OR lower(details::text) LIKE $${params.length})`
      );
    }
    if (req.query.from) {
      params.push(req.query.from);
      where.push(`occurred_at >= $${params.length}`);
    }
    if (req.query.to) {
      params.push(req.query.to);
      where.push(`occurred_at <= $${params.length}`);
    }
    const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
    const { rows: tot } = await pool.query(
      `SELECT count(*)::int c FROM ${t} ${whereSql}`,
      params
    );

    const items = await listDetailed(t, req, 'occurred_at DESC', { whereSql, params, limit, offset });

    res.json({ items, page, pageSize, total: tot[0]?.c || 0 });
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
    if (enriched) return res.json(enriched);

    // Fallback to simple read
    res.json(await read(t, "id", req.params.id));
  } catch (e) {
    next(e);
  }
});
export default r;
