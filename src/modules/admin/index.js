import { Router } from "express";
const r = Router();
r.get("/me", (a, b) => b.json({ id: "me", email: "me@example.com" }));
r.put("/me", (a, b) => b.json({ ok: true, ...a.body }));
r.get("/preferences", (a, b) => b.json({ theme: "light" }));
r.put("/preferences", (a, b) => b.json({ ok: true }));
r.get("/notifications", (a, b) => b.json([{ id: 1, message: "Welcome" }]));
export default r;
