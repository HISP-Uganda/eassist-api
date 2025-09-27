import { Router } from "express";
import pool from "../../../../db/pool.js";
const r = Router();
r.get("/", async (req, res, next) => {
  try {
    const q = await pool.query(
      "SELECT org_name, timezone, locale FROM general_settings WHERE id=TRUE"
    );
    res.json(q.rows[0] || {});
  } catch (e) {
    next(e);
  }
});
r.put("/", async (req, res, next) => {
  try {
    const values = [req.body.org_name, req.body.timezone, req.body.locale];
    const up = await pool.query(
      `INSERT INTO general_settings (id,org_name, timezone, locale) VALUES (TRUE,$1, $2, $3) ON CONFLICT (id) DO UPDATE SET org_name = EXCLUDED.org_name, timezone = EXCLUDED.timezone, locale = EXCLUDED.locale RETURNING *`,
      values
    );
    res.json(up.rows[0]);
  } catch (e) {
    next(e);
  }
});
export default r;
