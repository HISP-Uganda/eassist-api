import { Router } from "express";
import users from "./users/router.js";
import roles from "./roles/router.js";
import lookups from "./lookups/index.js";
import agents from "./agents/index.js";
import settings from "./settings/index.js";
import workflows from "./workflows/index.js";
import inbox from "./inbox/index.js";
import files from "./files/router.js";
import audit from "./audit/router.js";
import { requirePermissions } from "../../middleware/auth.js";
import { PERMISSIONS } from "../../constants/permissions.js";
const r = Router();
// Allow access based on granular route permissions within these routers
r.use("/users", users);
r.use("/roles", roles);
r.use("/lookups", lookups);
// Keep coarse guards for modules not yet migrated to granular per-route checks
r.use("/agents", requirePermissions(PERMISSIONS.SYSTEM_MANAGE), agents);
r.use("/settings", requirePermissions(PERMISSIONS.SETTINGS_MANAGE), settings);
r.use(
  "/workflows",
  requirePermissions(PERMISSIONS.WORKFLOWS_MANAGE),
  workflows
);
r.use("/inbox", requirePermissions(PERMISSIONS.INBOX_MANAGE), inbox);
// Files (read/list). For simplicity, grant via files.read
r.use("/files", requirePermissions(PERMISSIONS.FILES_READ), files);
// Audit logs (read-only)
r.use("/audit", requirePermissions(PERMISSIONS.AUDIT_READ), audit);
export default r;
