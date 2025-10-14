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
import messages from "./modules/messages/index.js";
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
// Knowledge: only allow public GET for specific resources (faqs, kb/articles, videos)
const isPublicKnowledgeGet = (req) => {
  if (req.method !== "GET") return false;
  const p = req.path || "";
  return (
    p === "/faqs" ||
    p.startsWith("/faqs/") ||
    p === "/kb/articles" ||
    p.startsWith("/kb/articles/") ||
    p === "/videos" ||
    p.startsWith("/videos/")
  );
};
r.use("/knowledge", (req, res, next) => {
  if (isPublicKnowledgeGet(req)) {
    return knowledge(req, res, next);
  }
  return requireAuth(req, res, (err) => {
    if (err) return next(err);
    const guard = requirePermissions(PERMISSIONS.KNOWLEDGE_MANAGE);
    return guard(req, res, (err2) => (err2 ? next(err2) : knowledge(req, res, next)));
  });
});
// Keep the rest of /system protected
r.use("/system", requireAuth, system);
// New user-facing messaging module (auth enforced inside the router)
r.use("/messages", messages);
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
