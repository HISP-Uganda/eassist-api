import { Router } from "express";
import { create, update, remove, read } from "../../../utils/crud.js";
import { requireAnyPermission } from "../../../middleware/auth.js";
import { PERMISSIONS } from "../../../constants/permissions.js";
import { listDetailed, readDetailed } from "../../../utils/relations.js";
import { pickFields } from "../../../utils/crud.js";
import { parsePagination } from "../../../utils/pagination.js";
import pool from "../../../db/pool.js";
const r = Router();
const t = "ticket_notes";

r.get(
  "/",
  requireAnyPermission(
    PERMISSIONS.TICKETS_NOTES_READ,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      const { limit, offset } = parsePagination(req.query);
      const where = [];
      const params = [];
      if (req.query.ticket_id) { params.push(req.query.ticket_id); where.push(`t.ticket_id = $${params.length}`); }
      if (req.query.user_id) { params.push(req.query.user_id); where.push(`t.user_id = $${params.length}`); }
      if (req.query.is_internal != null) { params.push(req.query.is_internal === 'true'); where.push(`t.is_internal = $${params.length}`); }
      if (req.query.q) { params.push(`%${String(req.query.q).toLowerCase()}%`); where.push(`lower(t.body) LIKE $${params.length}`); }
      if (req.query.created_from) { params.push(req.query.created_from); where.push(`t.created_at >= $${params.length}`); }
      if (req.query.created_to) { params.push(req.query.created_to); where.push(`t.created_at <= $${params.length}`); }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const order = 'created_at DESC';

      const { rows: ct } = await pool.query(`SELECT count(*)::int AS c FROM ${t} t ${whereSql}`, params);
      res.set('X-Total-Count', String(ct[0]?.c || 0));

      const rows = await listDetailed(t, req, order, { whereSql, params, limit, offset });
      res.json(rows);
    } catch (e) {
      next(e);
    }
  }
);

r.post(
  "/",
  requireAnyPermission(
    PERMISSIONS.TICKETS_NOTES_ADD,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (a, b, c) => {
    try {
      b.status(201).json(
        await create(t, a.body, ["ticket_id", "user_id", "body", "is_internal"])
      );
    } catch (e) {
      c(e);
    }
  }
);
r.get(
  "/:id",
  requireAnyPermission(
    PERMISSIONS.TICKETS_NOTES_READ,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      // Prefer the enriched read (will include nested user when available)
      const enriched = await readDetailed(t, 'id', req.params.id, req);
      if (enriched) return res.json(req.query.fields ? pickFields(enriched, req.query.fields) : enriched);
      const row = await read(t, "id", req.params.id);
      if (!row) return next(new Error("Not found"));
      res.json(req.query.fields ? pickFields(row, req.query.fields) : row);
    } catch (e) {
      next(e);
    }
  }
);
r.put(
  "/:id",
  requireAnyPermission(PERMISSIONS.TICKETS_UPDATE, PERMISSIONS.TICKETS_MANAGE),
  async (a, b, c) => {
    try {
      b.json(
        await update(t, "id", a.params.id, a.body, [
          "ticket_id",
          "user_id",
          "body",
          "is_internal",
        ])
      );
    } catch (e) {
      c(e);
    }
  }
);
r.delete(
  "/:id",
  requireAnyPermission(PERMISSIONS.TICKETS_UPDATE, PERMISSIONS.TICKETS_MANAGE),
  async (a, b, c) => {
    try {
      b.json(await remove(t, "id", a.params.id));
    } catch (e) {
      c(e);
    }
  }
);
export default r;
