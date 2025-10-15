import { Router } from "express";
import pool from "../../../db/pool.js";
import { parsePagination } from "../../../utils/pagination.js";
import { BadRequest } from "../../../utils/errors.js";
import { create, update, remove } from "../../../utils/crud.js";
import { listDetailed, readDetailed } from "../../../utils/relations.js";
import { queueMessage } from "../../../utils/messaging.js";
const r = Router();
const t = "faqs";
function isIntString(v) {
  return /^[0-9]+$/.test(String(v));
}
r.get("/", async (req, res, next) => {
  try {
    const { page, pageSize, offset, limit } = parsePagination(req.query);
    const params = [];
    const where = [];
    if (req.query.q) {
      params.push(`%${(req.query.q || "").toLowerCase()}%`);
      where.push(
        `(lower(title) LIKE $${params.length} OR lower(body) LIKE $${params.length})`
      );
    }
    if (req.query.system_category_id != null) {
      if (!isIntString(req.query.system_category_id))
        return next(BadRequest("system_category_id must be an integer"));
      params.push(parseInt(req.query.system_category_id, 10));
      where.push(`system_category_id=$${params.length}`);
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
    const items = await listDetailed(t, req, "created_at DESC", {
      whereSql,
      params,
      limit,
      offset,
    });
    res.json({ items, page, pageSize, total: tot[0]?.c || 0 });
  } catch (e) {
    next(e);
  }
});
r.post("/", async (a, b, c) => {
  try {
    const row = await create(t, a.body, [
      "title",
      "body",
      "system_category_id",
      "is_published",
      "created_by",
      "created_at",
    ]);

    // Best-effort: notify on publish
    try {
      if (row.is_published) {
        const toUser = row.created_by || a.user?.sub || null;
        if (toUser) {
          await queueMessage({
            channel: "IN_APP",
            to_user_id: toUser,
            template_code: "CONTENT_PUBLISHED_FAQ",
            subject: "FAQ published",
            body: String(row.title || "").slice(0, 200),
          });
        }
      }
    } catch {}

    b.status(201).json(row);
  } catch (e) {
    c(e);
  }
});
r.get("/:id", async (a, b, c) => {
  try {
    b.json(await readDetailed(t, "id", a.params.id, a));
  } catch (e) {
    c(e);
  }
});
r.put("/:id", async (a, b, c) => {
  try {
    const beforeQ = await pool.query(
      `SELECT is_published, created_by, title FROM ${t} WHERE id=$1`,
      [a.params.id]
    );
    const before = beforeQ.rows[0] || {};
    const row = await update(t, "id", a.params.id, a.body, [
      "title",
      "body",
      "system_category_id",
      "is_published",
      "created_by",
      "created_at",
    ]);

    // Notify on publish/unpublish change
    try {
      if (
        Object.prototype.hasOwnProperty.call(a.body, "is_published") &&
        before.is_published !== row.is_published
      ) {
        const toUser = row.created_by || a.user?.sub || null;
        const code = row.is_published
          ? "CONTENT_PUBLISHED_FAQ"
          : "CONTENT_UNPUBLISHED_FAQ";
        if (toUser) {
          await queueMessage({
            channel: "IN_APP",
            to_user_id: toUser,
            template_code: code,
            subject: row.is_published ? "FAQ published" : "FAQ unpublished",
            body: String(row.title || "").slice(0, 200),
          });
        }
      }
    } catch {}

    b.json(row);
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
