import { Router } from "express";
import pool from "../../../db/pool.js";
const r = Router();
r.get("/overview", async (req, res, next) => {
  try {
    const c24 = await pool.query(
      `SELECT count(*) FROM tickets WHERE created_at > now()-interval '24 hours'`
    );
    const uns = await pool.query(
      `SELECT count(*) FROM tickets t JOIN statuses s ON t.status_id=s.id WHERE s.code NOT IN ('resolved','closed')`
    );
    res.json({
      created24: Number(c24.rows[0].count),
      unsolved: Number(uns.rows[0].count),
    });
  } catch (e) {
    next(e);
  }
});
r.get("/by-category", async (req, res, next) => {
  try {
    const q = await pool.query(
      `SELECT COALESCE(ic.name,'Uncategorized') category, count(*)::int count FROM tickets t LEFT JOIN issue_categories ic ON t.category_id=ic.id GROUP BY category ORDER BY count DESC LIMIT 20`
    );
    res.json(q.rows);
  } catch (e) {
    next(e);
  }
});
export default r;
