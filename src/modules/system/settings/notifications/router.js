import { Router } from "express";
import pool from "../../../../db/pool.js";
const r = Router();
r.get("/", async (req, res, next) => {
  try {
    const q = await pool.query(
      "SELECT email_on_ticket_created, email_on_ticket_updated FROM notification_settings WHERE id=TRUE"
    );
    res.json(q.rows[0] || {});
  } catch (e) {
    next(e);
  }
});
r.put("/", async (req, res, next) => {
  try {
    const values = [
      req.body.email_on_ticket_created,
      req.body.email_on_ticket_updated,
    ];
    const up = await pool.query(
      `INSERT INTO notification_settings (id,email_on_ticket_created, email_on_ticket_updated) VALUES (TRUE,$1, $2) ON CONFLICT (id) DO UPDATE SET email_on_ticket_created = EXCLUDED.email_on_ticket_created, email_on_ticket_updated = EXCLUDED.email_on_ticket_updated RETURNING *`,
      values
    );
    res.json(up.rows[0]);
  } catch (e) {
    next(e);
  }
});
export default r;
