import { Router } from "express";
import { create, update, remove, read } from "../../../utils/crud.js";
import pool from "../../../db/pool.js";
import { listDetailed, readDetailed } from "../../../utils/relations.js";
import { requireAnyPermission } from "../../../middleware/auth.js";
import { PERMISSIONS } from "../../../constants/permissions.js";
import { parsePagination } from "../../../utils/pagination.js";
const r = Router();
const table = "ticket_watchers";
const allow = ["ticket_id", "user_id", "email", "notify"];

r.get(
  "/",
  requireAnyPermission(
    PERMISSIONS.TICKETS_WATCHERS_READ,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      const { limit, offset } = parsePagination(req.query);
      const where = [];
      const params = [];
      if (req.query.ticket_id) { params.push(req.query.ticket_id); where.push(`t.ticket_id = $${params.length}`); }
      if (req.query.user_id) { params.push(req.query.user_id); where.push(`t.user_id = $${params.length}`); }
      if (req.query.email) { params.push(req.query.email.toLowerCase()); where.push(`lower(t.email) = $${params.length}`); }
      if (req.query.notify != null) { params.push(req.query.notify === 'true'); where.push(`t.notify = $${params.length}`); }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const order = 'id DESC';

      const { rows: ct } = await pool.query(`SELECT count(*)::int AS c FROM ${table} t ${whereSql}`, params);
      res.set('X-Total-Count', String(ct[0]?.c || 0));

      const rows = await listDetailed(table, req, order, { whereSql, params, limit, offset });
      res.json(rows);
    } catch (e) {
      next(e);
    }
  }
);
r.post(
  "/",
  requireAnyPermission(
    PERMISSIONS.TICKETS_WATCHERS_ADD,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      res.status(201).json(await create(table, req.body, allow));
    } catch (e) {
      next(e);
    }
  }
);
r.post(
  "/ticket/:ticketId/email",
  requireAnyPermission(
    PERMISSIONS.TICKETS_WATCHERS_ADD,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      const { ticketId } = req.params;
      const { email } = req.body;
      const { rows } = await pool.query(
        `INSERT INTO ticket_watchers (ticket_id,email) VALUES ($1,$2) RETURNING *`,
        [ticketId, email]
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      next(e);
    }
  }
);
r.get(
  "/:id",
  requireAnyPermission(
    PERMISSIONS.TICKETS_WATCHERS_READ,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      const enriched = await readDetailed(table, 'id', req.params.id, req);
      if (enriched) return res.json(enriched);
      res.json(await read(table, "id", req.params.id));
    } catch (e) {
      next(e);
    }
  }
);
r.put(
  "/:id",
  requireAnyPermission(
    PERMISSIONS.TICKETS_WATCHERS_ADD,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      res.json(await update(table, "id", req.params.id, req.body, allow));
    } catch (e) {
      next(e);
    }
  }
);
r.delete(
  "/:id",
  requireAnyPermission(
    PERMISSIONS.TICKETS_WATCHERS_REMOVE,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      res.json(await remove(table, "id", req.params.id));
    } catch (e) {
      next(e);
    }
  }
);
export default r;
