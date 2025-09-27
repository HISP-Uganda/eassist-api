import { Router } from "express";
import { create, update, remove, read } from "../../../utils/crud.js";
import { requireAnyPermission } from "../../../middleware/auth.js";
import { PERMISSIONS } from "../../../constants/permissions.js";
import { listDetailed, readDetailed } from "../../../utils/relations.js";
import { pickFields } from "../../../utils/crud.js";
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
      // Use central helper to produce enriched event rows
      const rows = await listDetailed(t, req, 'occurred_at DESC');
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
