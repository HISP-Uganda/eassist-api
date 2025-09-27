import { Router } from "express";
import pool from "../../../../db/pool.js";
const r = Router();
r.get("/", async (req, res, next) => {
  try {
    const q = await pool.query(
      "SELECT local_enabled, google_oauth_enabled, microsoft_oauth_enabled, saml_enabled FROM auth_methods_settings WHERE id=TRUE"
    );
    res.json(q.rows[0] || {});
  } catch (e) {
    next(e);
  }
});
r.put("/", async (req, res, next) => {
  try {
    const values = [
      req.body.local_enabled,
      req.body.google_oauth_enabled,
      req.body.microsoft_oauth_enabled,
      req.body.saml_enabled,
    ];
    const up = await pool.query(
      `INSERT INTO auth_methods_settings (id,local_enabled, google_oauth_enabled, microsoft_oauth_enabled, saml_enabled) VALUES (TRUE,$1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET local_enabled = EXCLUDED.local_enabled, google_oauth_enabled = EXCLUDED.google_oauth_enabled, microsoft_oauth_enabled = EXCLUDED.microsoft_oauth_enabled, saml_enabled = EXCLUDED.saml_enabled RETURNING *`,
      values
    );
    res.json(up.rows[0]);
  } catch (e) {
    next(e);
  }
});
export default r;
