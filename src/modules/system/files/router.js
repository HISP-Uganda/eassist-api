import { Router } from "express";
import { create, update, remove, read, pickFields } from "../../../utils/crud.js";
import pool from "../../../db/pool.js";
import { parsePagination } from "../../../utils/pagination.js";
import { listDetailed, readDetailed } from "../../../utils/relations.js";
const r = Router();
const t = "files";

r.get("/", async (req, res, next) => {
  try {
    const { page, pageSize, offset, limit } = parsePagination(req.query);
    const params = [];
    const where = [];
    if (req.query.ticket_id) {
      params.push(req.query.ticket_id);
      where.push(`ticket_id=$${params.length}`);
    }
    if (req.query.file_type) {
      params.push(req.query.file_type);
      where.push(`file_type=$${params.length}`);
    }
    if (req.query.q) {
      params.push(`%${(req.query.q || "").toLowerCase()}%`);
      where.push(`(lower(file_name) LIKE $${params.length})`);
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

r.post("/", async (a, b, c) => {
  try {
    b.status(201).json(
      await create(t, a.body, [
        "ticket_id",
        "file_name",
        "file_type",
        "file_size_bytes",
        "storage_path",
        "created_at",
      ])
    );
  } catch (e) {
    c(e);
  }
});
r.get("/:id", async (a, b, c) => {
  try {
    // try enriched read first, fallback to raw read
    const enriched = await readDetailed(t, 'id', a.params.id, a);
    if (enriched) return b.json(a.query.fields ? pickFields(enriched, a.query.fields) : enriched);
    const row = await read(t, "id", a.params.id);
    return b.json(a.query.fields ? pickFields(row, a.query.fields) : row);
  } catch (e) {
    c(e);
  }
});
r.put("/:id", async (a, b, c) => {
  try {
    b.json(
      await update(t, "id", a.params.id, a.body, [
        "ticket_id",
        "file_name",
        "file_type",
        "file_size_bytes",
        "storage_path",
        "created_at",
      ])
    );
  } catch (e) {
    c(e);
  }
});
r.delete("/:id", async (a, b, c) => {
  try {
    b.json(await remove(t, "id", a.params.id));
  } catch (e) {
    c(e);
  }
});
export default r;
