import { Router } from "express";
import pool from "../../../db/pool.js";
const r = Router();
r.get("/", async (req, res, next) => {
  try {
    const q = (req.query.q || "").toLowerCase();
    const faqs = await pool.query(
      `SELECT id,title FROM faqs WHERE lower(title) LIKE '%'||$1||'%' LIMIT 10`,
      [q]
    );
    const kb = await pool.query(
      `SELECT id,title FROM kb_articles WHERE lower(title) LIKE '%'||$1||'%' LIMIT 10`,
      [q]
    );
    const videos = await pool.query(
      `SELECT id,title FROM videos WHERE lower(title) LIKE '%'||$1||'%' LIMIT 10`,
      [q]
    );
    res.json({ faqs: faqs.rows, kb: kb.rows, videos: videos.rows });
  } catch (e) {
    next(e);
  }
});
export default r;
