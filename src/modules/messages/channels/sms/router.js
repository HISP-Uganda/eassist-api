import { Router } from "express";
import pool from "../../../../db/pool.js";
import { BadRequest } from "../../../../utils/errors.js";
import { requireAuth, requireAnyPermission } from "../../../../middleware/auth.js";
import { PERMISSIONS } from "../../../../constants/permissions.js";

const r = Router();

// Simple ping
r.get("/", requireAuth, (_req, res) => {
  res.json({ ok: true, channel: "SMS" });
});

// POST /messages/sms/send - queue an SMS message
r.post("/send", requireAuth, requireAnyPermission(PERMISSIONS.SYS_MESSAGES_SEND), async (req, res, next) => {
  try {
    const fromUserId = req.user?.sub || null;
    const { to_phone, body } = req.body || {};
    if (!to_phone) return next(BadRequest("to_phone is required"));
    if (!body) return next(BadRequest("body is required"));
    const cols = ["channel", "to_phone", "body", "status", "scheduled_at", "created_by"];
    const vals = ["SMS", to_phone, body, "queued", new Date(), fromUserId];
    const ph = cols.map((_, i) => `$${i + 1}`);
    const ins = await pool.query(`INSERT INTO messages (${cols.join(",")}) VALUES (${ph.join(",")}) RETURNING *`, vals);
    res.status(201).json(ins.rows[0]);
  } catch (e) { next(e); }
});

export default r;
