import { Router } from "express";
import { create, update, remove } from "../../../utils/crud.js";
import { listDetailed, readDetailed } from "../../../utils/relations.js";
const r = Router();
const t = "video_categories";
r.get("/", async (a, b, c) => {
  try {
    b.json(await listDetailed(t, a, "name ASC"));
  } catch (e) {
    c(e);
  }
});
r.post("/", async (a, b, c) => {
  try {
    b.status(201).json(await create(t, a.body, ["name"]));
  } catch (e) {
    c(e);
  }
});
r.get("/:id", async (a, b, c) => {
  try {
    b.json(await readDetailed(t, "id", a.params.id, a));
  } catch (e) {
    c(e);
  }
});
r.put("/:id", async (a, b, c) => {
  try {
    b.json(await update(t, "id", a.params.id, a.body, ["name"]));
  } catch (e) {
    c(e);
  }
});
r.delete("/:id", async (a, b, c) => {
  try {
    b.json(await remove(t, "id", a.params.id));
  } catch (e) {
    c(e);
  }
});
export default r;
