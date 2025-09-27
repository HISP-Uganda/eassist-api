import { Router } from "express";
import pool from "../../../../db/pool.js";
const r = Router();
r.get("/", async (req, res, next) => {
  try {
    const q = await pool.query(
      "SELECT issuer, entity_id, sso_url, certificate FROM sso_settings WHERE id=TRUE"
    );
    res.json(q.rows[0] || {});
  } catch (e) {
    next(e);
  }
});
r.put("/", async (req, res, next) => {
  try {
    const values = [
      req.body.issuer,
      req.body.entity_id,
      req.body.sso_url,
      req.body.certificate,
    ];
    const up = await pool.query(
      `INSERT INTO sso_settings (id,issuer, entity_id, sso_url, certificate) VALUES (TRUE,$1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET issuer = EXCLUDED.issuer, entity_id = EXCLUDED.entity_id, sso_url = EXCLUDED.sso_url, certificate = EXCLUDED.certificate RETURNING *`,
      values
    );
    res.json(up.rows[0]);
  } catch (e) {
    next(e);
  }
});
export default r;
