import { Router } from "express";
import { create, update, remove } from "../../../utils/crud.js";
import { listDetailed, readDetailed } from "../../../utils/relations.js";
import { requireAnyPermission } from "../../../middleware/auth.js";
import { PERMISSIONS } from "../../../constants/permissions.js";
import { BadRequest } from "../../../utils/errors.js";
const r = Router();
const t = "system_modules";

function isIntString(v) {
  return /^[0-9]+$/.test(String(v));
}

r.get(
  "/",
  requireAnyPermission(
    PERMISSIONS.SYS_LOOKUPS_SYSTEM_MODULES_LIST,
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
    PERMISSIONS.SYS_LOOKUPS_SYSTEM_MODULES_CREATE,
    PERMISSIONS.SYSTEM_MANAGE
  ),
  async (a, b, c) => {
    try {
      // Require and coerce system_id to integer to match DB NOT NULL constraint
      if (!("system_id" in a.body)) {
        return c(BadRequest("system_id is required"));
      }
      if (!isIntString(a.body.system_id)) {
        return c(BadRequest("system_id must be an integer"));
      }
      const payload = { ...a.body, system_id: parseInt(a.body.system_id, 10) };
      b.status(201).json(
        await create(t, payload, [
          "system_id",
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
r.get(
  "/:id",
  requireAnyPermission(
    PERMISSIONS.SYS_LOOKUPS_SYSTEM_MODULES_READ,
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
    PERMISSIONS.SYS_LOOKUPS_SYSTEM_MODULES_UPDATE,
    PERMISSIONS.SYSTEM_MANAGE
  ),
  async (a, b, c) => {
    try {
      const payload = { ...a.body };
      if ("system_id" in payload) {
        if (!isIntString(payload.system_id)) return c(BadRequest("system_id must be an integer"));
        payload.system_id = parseInt(payload.system_id, 10);
      }
      b.json(
        await update(t, "id", a.params.id, payload, [
          "system_id",
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
  requireAnyPermission(
    PERMISSIONS.SYS_LOOKUPS_SYSTEM_MODULES_DELETE,
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
