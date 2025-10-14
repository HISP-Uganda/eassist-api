import { Router } from "express";
import pool from "../../db/pool.js";
import { parsePagination } from "../../utils/pagination.js";
import { requireAuth } from "../../middleware/auth.js";
import { listDetailed } from "../../utils/relations.js";
const r = Router();

r.get("/me", (a, b) => b.json({ id: "me", email: "me@example.com" }));
r.put("/me", (a, b) => b.json({ ok: true, ...a.body }));
r.get("/preferences", (a, b) => b.json({ theme: "light" }));
r.put("/preferences", (a, b) => b.json({ ok: true }));

// Notifications powered by IN_APP messages
r.get("/notifications", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.sub;
    const { page, pageSize, offset, limit } = parsePagination(req.query);
    const params = [userId, 'IN_APP'];
    const where = ["to_user_id=$1", "channel=$2"];
    if (req.query.unread === 'true') where.push("(read_at IS NULL AND status <> 'read')");
    const whereSql = `WHERE ${where.join(' AND ')}`;
    const { rows: tot } = await pool.query(`SELECT count(*)::int c FROM messages ${whereSql}`, params);
    const items = await listDetailed('messages', req, 'created_at DESC', { whereSql, params, limit, offset });
    res.json({ items, page, pageSize, total: tot[0]?.c || 0 });
  } catch (e) { next(e); }
});

export default r;
