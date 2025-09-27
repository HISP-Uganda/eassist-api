import { Router } from "express";
import { create, update, remove } from "../../../utils/crud.js";
import { listDetailed, readDetailed } from "../../../utils/relations.js";
import { requireAnyPermission } from "../../../middleware/auth.js";
import { PERMISSIONS } from "../../../constants/permissions.js";
const r = Router();
const t = "priorities";
r.get(
  "/",
  requireAnyPermission(
    PERMISSIONS.SYS_LOOKUPS_PRIORITIES_LIST,
    PERMISSIONS.SYSTEM_MANAGE
  ),
  async (a, b, c) => {
    try {
      b.json(await listDetailed(t, a));
    } catch (e) {
      c(e);
    }
  }
);
r.post(
  "/",
  requireAnyPermission(
    PERMISSIONS.SYS_LOOKUPS_PRIORITIES_CREATE,
    PERMISSIONS.SYSTEM_MANAGE
  ),
  async (a, b, c) => {
    try {
      b.status(201).json(await create(t, a.body, ["code", "name", "sort_order"]));
    } catch (e) {
      c(e);
    }
  }
);
r.get(
  "/:id",
  requireAnyPermission(
    PERMISSIONS.SYS_LOOKUPS_PRIORITIES_LIST,
    PERMISSIONS.SYSTEM_MANAGE
  ),
  async (a, b, c) => {
    try {
      b.json(await readDetailed(t, "id", a.params.id, a));
    } catch (e) {
      c(e);
    }
  }
);
r.put(
  "/:id",
  requireAnyPermission(
    PERMISSIONS.SYS_LOOKUPS_PRIORITIES_UPDATE,
    PERMISSIONS.SYSTEM_MANAGE
  ),
  async (a, b, c) => {
    try {
      b.json(await update(t, "id", a.params.id, a.body, ["code", "name", "sort_order"]));
    } catch (e) {
      c(e);
    }
  }
);
r.delete(
  "/:id",
  requireAnyPermission(
    PERMISSIONS.SYS_LOOKUPS_PRIORITIES_DELETE,
    PERMISSIONS.SYSTEM_MANAGE
  ),
  async (a, b, c) => {
    try {
      b.json(await remove(t, "id", a.params.id));
    } catch (e) {
      c(e);
    }
  }
);
export default r;
