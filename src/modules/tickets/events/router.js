import { Router } from "express";
import { create, update, remove, read } from "../../../utils/crud.js";
import { requireAnyPermission } from "../../../middleware/auth.js";
import { PERMISSIONS } from "../../../constants/permissions.js";
import { listDetailed, readDetailed } from "../../../utils/relations.js";
import { pickFields } from "../../../utils/crud.js";
import { parsePagination } from "../../../utils/pagination.js";
import pool from "../../../db/pool.js";
const r = Router();
const t = "ticket_events";

r.get(
  "/",
  requireAnyPermission(
    PERMISSIONS.TICKETS_EVENTS_READ,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      const { limit, offset } = parsePagination(req.query);
      const where = [];
      const params = [];
      if (req.query.ticket_id) { params.push(req.query.ticket_id); where.push(`t.ticket_id = $${params.length}`); }
      if (req.query.event_type) { params.push(req.query.event_type); where.push(`t.event_type = $${params.length}`); }
      if (req.query.actor_user_id) { params.push(req.query.actor_user_id); where.push(`t.actor_user_id = $${params.length}`); }
      if (req.query.q) { params.push(`%${String(req.query.q).toLowerCase()}%`); where.push(`lower(t.details::text) LIKE $${params.length}`); }
      if (req.query.occurred_from) { params.push(req.query.occurred_from); where.push(`t.occurred_at >= $${params.length}`); }
      if (req.query.occurred_to) { params.push(req.query.occurred_to); where.push(`t.occurred_at <= $${params.length}`); }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const order = 'occurred_at DESC';

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
  requireAnyPermission(PERMISSIONS.TICKETS_UPDATE, PERMISSIONS.TICKETS_MANAGE),
  async (a, b, c) => {
    try {
      b.status(201).json(
        await create(t, a.body, [
          "ticket_id",
          "event_type",
          "actor_user_id",
          "details",
          "occurred_at",
        ])
      );
    } catch (e) {
      c(e);
    }
  }
);

r.get(
  "/:id",
  requireAnyPermission(
    PERMISSIONS.TICKETS_EVENTS_READ,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      const enriched = await readDetailed(t, 'id', req.params.id, req);
      if (enriched) return res.json(req.query.fields ? pickFields(enriched, req.query.fields) : enriched);
      const row = await read(t, "id", req.params.id);
      if (!row) return next(new Error('Not found'));
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
          "event_type",
          "actor_user_id",
          "details",
          "occurred_at",
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
