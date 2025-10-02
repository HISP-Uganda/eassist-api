import { Router } from "express";
import groups from "./groups.js";
import tiers from "./tiers.js";
import groupMembers from "./group-members.js";
import tierMembers from "./tier-members.js";
const r = Router();
r.use("/groups", groups);
r.use("/tiers", tiers);
r.use("/group-members", groupMembers);
r.use("/tier-members", tierMembers);
// Aliases: treat agent groups as support groups
r.use("/support-groups", groups);
r.use("/support-group-members", groupMembers);
export default r;
