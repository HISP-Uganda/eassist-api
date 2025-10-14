import { Router } from "express";
import { requireAuth } from "../../../../middleware/auth.js";

const r = Router();

r.get("/", requireAuth, (_req, res) => {
  res.json({ ok: true, channel: "TELEGRAM" });
});

export default r;

