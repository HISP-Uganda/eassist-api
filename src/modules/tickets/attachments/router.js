import { Router } from "express";
import { create, update, remove, read, pickFields } from "../../../utils/crud.js";
import { requireAnyPermission } from "../../../middleware/auth.js";
import { PERMISSIONS } from "../../../constants/permissions.js";
import { NotFound } from "../../../utils/errors.js";
import { listDetailed, readDetailed } from "../../../utils/relations.js";
const r = Router();
const t = "ticket_attachments";

r.get(
  "/",
  requireAnyPermission(
    PERMISSIONS.TICKETS_ATTACHMENTS_READ,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      // Use central helper which will include user nested object when available
      const rows = await listDetailed(t, req, 'uploaded_at DESC');
      res.json(rows);
    } catch (e) {
      next(e);
    }
  }
);

r.post(
  "/",
  requireAnyPermission(
    PERMISSIONS.TICKETS_ATTACHMENTS_ADD,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (a, b, c) => {
    try {
      b.status(201).json(
        await create(t, a.body, [
          "ticket_id",
          "file_name",
          "file_type",
          "file_size_bytes",
          "storage_path",
          "uploaded_by",
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
    PERMISSIONS.TICKETS_ATTACHMENTS_READ,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (req, res, next) => {
    try {
      // Prefer enriched read
      const enriched = await readDetailed(t, 'id', req.params.id, req);
      if (enriched) return res.json(req.query.fields ? pickFields(enriched, req.query.fields) : enriched);
      const row = await read(t, 'id', req.params.id);
      if (!row) return next(NotFound('Attachment not found', { id: req.params.id }));
      res.json(req.query.fields ? pickFields(row, req.query.fields) : row);
    } catch (e) {
      next(e);
    }
  }
);

r.put(
  "/:id",
  requireAnyPermission(
    PERMISSIONS.TICKETS_ATTACHMENTS_ADD,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (a, b, c) => {
    try {
      b.json(
        await update(t, 'id', a.params.id, a.body, [
          'ticket_id', 'file_name', 'file_type', 'file_size_bytes', 'storage_path', 'uploaded_by'
        ])
      );
    } catch (e) {
      c(e);
    }
  }
);

r.delete(
  "/:id",
  requireAnyPermission(
    PERMISSIONS.TICKETS_ATTACHMENTS_ADD,
    PERMISSIONS.TICKETS_MANAGE
  ),
  async (a, b, c) => {
    try {
      b.json(await remove(t, 'id', a.params.id));
    } catch (e) {
      c(e);
    }
  }
);
export default r;
