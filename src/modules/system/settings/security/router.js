import { Router } from "express";
import pool from "../../../../db/pool.js";
const r = Router();
r.get("/", async (req, res, next) => {
  try {
    const q = await pool.query(
      "SELECT session_timeout_minutes, password_policy FROM security_settings WHERE id=TRUE"
    );
    res.json(q.rows[0] || {});
  } catch (e) {
    next(e);
  }
});
r.put("/", async (req, res, next) => {
  try {
    const values = [req.body.session_timeout_minutes, req.body.password_policy];
    const up = await pool.query(
      `INSERT INTO security_settings (id,session_timeout_minutes, password_policy) VALUES (TRUE,$1, $2) ON CONFLICT (id) DO UPDATE SET session_timeout_minutes = EXCLUDED.session_timeout_minutes, password_policy = EXCLUDED.password_policy RETURNING *`,
      values
    );
    res.json(up.rows[0]);
  } catch (e) {
    next(e);
  }
});
export default r;
