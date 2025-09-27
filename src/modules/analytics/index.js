import { Router } from "express";
import dashboards from "./dashboards/router.js";
import reports from "./reports/router.js";
import exportsR from "./exports/router.js";
const r = Router();
r.use("/dashboards", dashboards);
r.use("/reports", reports);
r.use("/exports", exportsR);
export default r;
