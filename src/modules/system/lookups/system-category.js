import { Router } from "express";
import { create, update, remove } from "../../../utils/crud.js";
import { listDetailed, readDetailed } from "../../../utils/relations.js";
import { requirePermissions } from "../../../middleware/auth.js";
import { PERMISSIONS } from "../../../constants/permissions.js";
const r = Router();
const t = "system_category";

// Public GET
r.get("/", async (a, b, c) => {
  try {
    b.json(await listDetailed(t, a));
  } catch (e) {
    c(e);
  }
});
r.post(
  "/",
  requirePermissions(PERMISSIONS.SYS_LOOKUPS_SYSTEM_CATEGORY_CREATE),
  async (a, b, c) => {
    try {
      b.status(201).json(await create(t, a.body, ["name"]));
    } catch (e) {
      c(e);
    }
  }
);

// Public GET by id
r.get("/:id", async (a, b, c) => {
  try {
    b.json(await readDetailed(t, "id", a.params.id, a));
  } catch (e) {
    c(e);
  }
});
r.put(
  "/:id",
  requirePermissions(PERMISSIONS.SYS_LOOKUPS_SYSTEM_CATEGORY_UPDATE),
  async (a, b, c) => {
    try {
      b.json(await update(t, "id", a.params.id, a.body, ["name"]));
    } catch (e) {
      c(e);
    }
  }
);
r.delete(
  "/:id",
  requirePermissions(PERMISSIONS.SYS_LOOKUPS_SYSTEM_CATEGORY_DELETE),
  async (a, b, c) => {
    try {
      b.json(await remove(t, "id", a.params.id));
    } catch (e) {
      c(e);
    }
  }
);
export default r;
