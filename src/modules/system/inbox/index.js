import { Router } from "express";
import { create, update, remove, read } from "../../../utils/crud.js";
import pool from "../../../db/pool.js";
import { parsePagination } from "../../../utils/pagination.js";
import { listDetailed } from "../../../utils/relations.js";
const r = Router();
const table = "inbox_emails";

r.get("/emails", async (req, res, next) => {
  try {
    const { page, pageSize, offset, limit } = parsePagination(req.query);
    const params = [];
    const where = [];
    if (req.query.processing_status) {
      params.push(req.query.processing_status);
      where.push(`processing_status=$${params.length}`);
    }
    if (req.query.from_email) {
      params.push(req.query.from_email);
      where.push(`from_email=$${params.length}`);
    }
    if (req.query.created_ticket_id) {
      params.push(req.query.created_ticket_id);
      where.push(`created_ticket_id=$${params.length}`);
    }
    if (req.query.from) {
      params.push(req.query.from);
      where.push(`created_at >= $${params.length}`);
    }
    if (req.query.to) {
      params.push(req.query.to);
      where.push(`created_at <= $${params.length}`);
    }
    if (req.query.q) {
      params.push(`%${(req.query.q || "").toLowerCase()}%`);
      where.push(
        `(lower(subject) LIKE $${params.length} OR lower(body) LIKE $${params.length})`
      );
    }
    const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
    const { rows: tot } = await pool.query(
      `SELECT count(*)::int c FROM ${table} ${whereSql}`,
      params
    );

    const items = await listDetailed(table, req, 'created_at DESC', { whereSql, params, limit, offset });

    res.json({ items, page, pageSize, total: tot[0]?.c || 0 });
  } catch (e) {
    next(e);
  }
});

r.post("/emails", async (a, b, c) => {
  try {
    b.status(201).json(
      await create(table, a.body, [
        "subject",
        "from_email",
        "from_name",
        "body",
        "processing_status",
        "created_ticket_id",
        "error_message",
      ])
    );
  } catch (e) {
    c(e);
  }
});
r.get("/emails/:id", async (req, res, next) => {
  try {
    // Try centralized detailed reader first
    const enriched = await import("../../../utils/relations.js")
      .then(m => m.readDetailed)
      .then(fn => fn(table, 'id', req.params.id, req))
      .catch(() => null);
    if (enriched) return res.json(enriched);

    // Fallback to simple read
    res.json(await read(table, "id", req.params.id));
  } catch (e) {
    next(e);
  }
});
r.put("/emails/:id", async (a, b, c) => {
  try {
    b.json(
      await update(table, "id", a.params.id, a.body, [
        "subject",
        "from_email",
        "from_name",
        "body",
        "processing_status",
        "created_ticket_id",
        "error_message",
      ])
    );
  } catch (e) {
    c(e);
  }
});
r.delete("/emails/:id", async (a, b, c) => {
  try {
    b.json(await remove(table, "id", a.params.id));
  } catch (e) {
    c(e);
  }
});
r.post("/emails/:id/process", (a, b) => b.json({ ok: true }));
r.post("/emails/:id/retry", (a, b) => b.json({ ok: true }));
r.post("/emails/:id/fail", (a, b) => b.json({ ok: true }));
export default r;
