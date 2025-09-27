import { Router } from "express";
import pool from "../../../../db/pool.js";
const r = Router();
r.get("/", async (req, res, next) => {
  try {
    const q = await pool.query(
      "SELECT ticket_created_subject, ticket_created_body, ticket_updated_subject, ticket_updated_body FROM email_templates_settings WHERE id=TRUE"
    );
    res.json(q.rows[0] || {});
  } catch (e) {
    next(e);
  }
});
r.put("/", async (req, res, next) => {
  try {
    const values = [
      req.body.ticket_created_subject,
      req.body.ticket_created_body,
      req.body.ticket_updated_subject,
      req.body.ticket_updated_body,
    ];
    const up = await pool.query(
      `INSERT INTO email_templates_settings (id,ticket_created_subject, ticket_created_body, ticket_updated_subject, ticket_updated_body) VALUES (TRUE,$1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET ticket_created_subject = EXCLUDED.ticket_created_subject, ticket_created_body = EXCLUDED.ticket_created_body, ticket_updated_subject = EXCLUDED.ticket_updated_subject, ticket_updated_body = EXCLUDED.ticket_updated_body RETURNING *`,
      values
    );
    res.json(up.rows[0]);
  } catch (e) {
    next(e);
  }
});
export default r;
