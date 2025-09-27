import { Router } from "express";
import pool from "../../../../db/pool.js";
const r = Router();
r.get("/", async (req, res, next) => {
  try {
    const q = await pool.query(
      "SELECT logo_url, primary_color, accent_color FROM branding_settings WHERE id=TRUE"
    );
    res.json(q.rows[0] || {});
  } catch (e) {
    next(e);
  }
});
r.put("/", async (req, res, next) => {
  try {
    const values = [
      req.body.logo_url,
      req.body.primary_color,
      req.body.accent_color,
    ];
    const up = await pool.query(
      `INSERT INTO branding_settings (id,logo_url, primary_color, accent_color) VALUES (TRUE,$1, $2, $3) ON CONFLICT (id) DO UPDATE SET logo_url = EXCLUDED.logo_url, primary_color = EXCLUDED.primary_color, accent_color = EXCLUDED.accent_color RETURNING *`,
      values
    );
    res.json(up.rows[0]);
  } catch (e) {
    next(e);
  }
});
export default r;
