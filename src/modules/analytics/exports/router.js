import { Router } from "express";
import pool from "../../../db/pool.js";
const r = Router();
r.get("/tickets.csv", async (req, res, next) => {
  try {
    const q = await pool.query(
      `SELECT ticket_key,title,created_at FROM tickets ORDER BY created_at DESC LIMIT 500`
    );
    res.json(q.rows);
  } catch (e) {
    next(e);
  }
});
export default r;
