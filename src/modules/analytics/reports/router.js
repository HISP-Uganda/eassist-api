import { Router } from "express";
const r = Router();
r.get("/", (req, res) => res.json([]));
r.post("/", (req, res) => res.status(201).json(req.body));
r.put("/:id", (req, res) => res.json(req.body));
r.delete("/:id", (req, res) => res.json({ ok: true }));
export default r;
