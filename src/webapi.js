import { Router } from "express";
import analytics from "./modules/analytics/index.js";
import tickets from "./modules/tickets/index.js";
import knowledge from "./modules/knowledge/index.js";
import system from "./modules/system/index.js";
import admin from "./modules/admin/index.js";
import pub from "./modules/public/index.js";
import auth from "./modules/auth/index.js";
import { requireAuth, requirePermissions } from "./middleware/auth.js";
import apiKeysRouter from "./modules/system/settings/security/api-keys/router.js";
import { PERMISSIONS } from "./constants/permissions.js";
import lookups from "./modules/system/lookups/index.js";
const r = Router();
r.use("/auth", auth);
// Publicly expose lookups read endpoints without auth (writes remain protected in the routers)
r.use("/system/lookups", lookups);
// Use permission-based guards for modules
r.use(
  "/analytics",
  requireAuth,
  requirePermissions(PERMISSIONS.ANALYTICS_VIEW),
  analytics
);
// Tickets now rely on granular per-route permission checks
r.use("/tickets", requireAuth, tickets);
r.use(
  "/knowledge",
  requireAuth,
  requirePermissions(PERMISSIONS.KNOWLEDGE_MANAGE),
  knowledge
);
// Keep the rest of /system protected
r.use("/system", requireAuth, system);
r.use("/admin", requireAuth, admin);
r.use("/public", pub);
// Token management alias (permission: apiKeys.manage)
r.use(
  "/tokens/api-keys",
  requireAuth,
  requirePermissions(PERMISSIONS.API_KEYS_MANAGE),
  apiKeysRouter
);
export default r;
