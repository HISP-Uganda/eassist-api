import { Router } from "express";
import { create, update, remove } from "../../../utils/crud.js";
import { listDetailed, readDetailed } from "../../../utils/relations.js";
import { requirePermissions } from "../../../middleware/auth.js";
import { PERMISSIONS } from "../../../constants/permissions.js";
const r = Router();
const t = "issue_categories";

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
  requirePermissions(PERMISSIONS.SYS_LOOKUPS_ISSUE_CATEGORIES_CREATE),
  async (a, b, c) => {
    try {
      b.status(201).json(
        await create(t, a.body, [
          "system_id",
          "parent_id",
          "name",
          "code",
          "description",
          "is_active",
        ])
      );
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
  requirePermissions(PERMISSIONS.SYS_LOOKUPS_ISSUE_CATEGORIES_UPDATE),
  async (a, b, c) => {
    try {
      b.json(
        await update(t, "id", a.params.id, a.body, [
          "system_id",
          "parent_id",
          "name",
          "code",
          "description",
          "is_active",
        ])
      );
    } catch (e) {
      c(e);
    }
  }
);

r.delete(
  "/:id",
  requirePermissions(PERMISSIONS.SYS_LOOKUPS_ISSUE_CATEGORIES_DELETE),
  async (a, b, c) => {
    try {
      b.json(await remove(t, "id", a.params.id));
    } catch (e) {
      c(e);
    }
  }
);
export default r;
