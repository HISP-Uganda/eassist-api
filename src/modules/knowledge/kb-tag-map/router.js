import { Router } from "express";
import pool from "../../../db/pool.js";
import { parsePagination } from "../../../utils/pagination.js";
import { BadRequest } from "../../../utils/errors.js";
import { listDetailed } from "../../../utils/relations.js";
const r = Router();
const table = "kb_article_tags";

r.get("/", async (req, res, next) => {
  try {
    const { page, pageSize, offset, limit } = parsePagination(req.query);
    const params = [];
    const where = [];
    if (req.query.article_id) {
      params.push(req.query.article_id);
      where.push(`article_id=$${params.length}`);
    }
    if (req.query.tag_id) {
      params.push(req.query.tag_id);
      where.push(`tag_id=$${params.length}`);
    }
    const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
    const { rows: tot } = await pool.query(
      `SELECT count(*)::int c FROM ${table} ${whereSql}`,
      params
    );

    const items = await listDetailed(table, req, 'article_id ASC', { whereSql, params, limit, offset });

    res.json({ items, page, pageSize, total: tot[0]?.c || 0 });
  } catch (e) {
    next(e);
  }
});

r.get("/article/:articleId", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT kat.tag_id, kt.name FROM kb_article_tags kat JOIN kb_tags kt ON kt.id=kat.tag_id WHERE kat.article_id=$1 ORDER BY kt.name`,
      [req.params.articleId]
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

r.post("/", async (req, res, next) => {
  try {
    const { article_id, tag_id } = req.body || {};
    if (!article_id || !tag_id) return next(BadRequest("article_id and tag_id are required"));
    const { rows } = await pool.query(
      `INSERT INTO ${table}(article_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING *`,
      [article_id, tag_id]
    );
    res.status(201).json(rows[0] || { ok: true });
  } catch (e) {
    next(e);
  }
});

r.delete("/", async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM ${table} WHERE article_id=$1 AND tag_id=$2`, [
      req.body.article_id,
      req.body.tag_id,
    ]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

r.delete("/article/:articleId/tag/:tagId", async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM ${table} WHERE article_id=$1 AND tag_id=$2`, [
      req.params.articleId,
      req.params.tagId,
    ]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default r;
