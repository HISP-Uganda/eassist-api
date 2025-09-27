import { Router } from "express";
import { create, update, remove } from "../../../utils/crud.js";
import { listDetailed, readDetailed } from "../../../utils/relations.js";
const r = Router();
const table = "workflow_rules";
r.get("/rules", async (a, b, c) => {
  try {
    b.json(await listDetailed(table, a));
  } catch (e) {
    c(e);
  }
});
r.post("/rules", async (a, b, c) => {
  try {
    b.status(201).json(
      await create(table, a.body, [
        "name",
        "description",
        "is_enabled",
        "definition",
      ])
    );
  } catch (e) {
    c(e);
  }
});
r.get("/rules/:id", async (a, b, c) => {
  try {
    b.json(await readDetailed(table, "id", a.params.id, a));
  } catch (e) {
    c(e);
  }
});
r.put("/rules/:id", async (a, b, c) => {
  try {
    b.json(
      await update(table, "id", a.params.id, a.body, [
        "name",
        "description",
        "is_enabled",
        "definition",
      ])
    );
  } catch (e) {
    c(e);
  }
});
r.delete("/rules/:id", async (a, b, c) => {
  try {
    b.json(await remove(table, "id", a.params.id));
  } catch (e) {
    c(e);
  }
});
r.post("/rules/:id/enable", (a, b) => b.json({ ok: true }));
r.post("/rules/:id/disable", (a, b) => b.json({ ok: true }));
r.post("/rules/:id/test", (a, b) => b.json({ matched: true }));
r.get("/conditions", (a, b) => b.json([]));
r.get("/actions", (a, b) => b.json([]));
export default r;
