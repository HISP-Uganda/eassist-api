import { Router } from "express";
import pool from "../../../../db/pool.js";
const r = Router();
r.get("/", async (req, res, next) => {
  try {
    const q = await pool.query(
      "SELECT host, port, username, password, secure, from_email, from_name FROM smtp_settings WHERE id=TRUE"
    );
    res.json(q.rows[0] || {});
  } catch (e) {
    next(e);
  }
});
r.put("/", async (req, res, next) => {
  try {
    const values = [
      req.body.host,
      req.body.port,
      req.body.username,
      req.body.password,
      req.body.secure,
      req.body.from_email,
      req.body.from_name,
    ];
    const up = await pool.query(
      `INSERT INTO smtp_settings (id,host, port, username, password, secure, from_email, from_name) VALUES (TRUE,$1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO UPDATE SET host = EXCLUDED.host, port = EXCLUDED.port, username = EXCLUDED.username, password = EXCLUDED.password, secure = EXCLUDED.secure, from_email = EXCLUDED.from_email, from_name = EXCLUDED.from_name RETURNING *`,
      values
    );
    res.json(up.rows[0]);
  } catch (e) {
    next(e);
  }
});
export default r;
