import { Router } from "express";
import { create, update, remove } from "../../../utils/crud.js";
import { listDetailed, readDetailed } from "../../../utils/relations.js";
import { requireAnyPermission } from "../../../middleware/auth.js";
import { PERMISSIONS } from "../../../constants/permissions.js";
const r = Router();
const t = "video_categories";

// Public GET (list)
r.get("/", async (req, res, next) => {
  try {
    res.json(await listDetailed(t, req, "name ASC"));
  } catch (e) {
    next(e);
  }
});

// Create (protected)
r.post(
  "/",
  requireAnyPermission(PERMISSIONS.KNOW_VIDEO_CATEGORIES_CREATE, PERMISSIONS.SYSTEM_MANAGE),
  async (req, res, next) => {
    try {
      const row = await create(t, req.body, ["name"]);
      res.status(201).json(row);
    } catch (e) {
      next(e);
    }
  }
);

// Public GET by id
r.get("/:id", async (req, res, next) => {
  try {
    res.json(await readDetailed(t, "id", req.params.id, req));
  } catch (e) {
    next(e);
  }
});

// Update (protected)
r.put(
  "/:id",
  requireAnyPermission(PERMISSIONS.KNOW_VIDEO_CATEGORIES_UPDATE, PERMISSIONS.SYSTEM_MANAGE),
  async (req, res, next) => {
    try {
      res.json(await update(t, "id", req.params.id, req.body, ["name"]));
    } catch (e) {
      next(e);
    }
  }
);

// Delete (protected)
r.delete(
  "/:id",
  requireAnyPermission(PERMISSIONS.KNOW_VIDEO_CATEGORIES_DELETE, PERMISSIONS.SYSTEM_MANAGE),
  async (req, res, next) => {
    try {
      res.json(await remove(t, "id", req.params.id));
    } catch (e) {
      next(e);
    }
  }
);

export default r;
