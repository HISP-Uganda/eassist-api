import { Router } from "express";
import providers from "./providers/router.js";
import otp from "./otp/router.js";
import channels from "./channels/router.js";
const r = Router();
r.use("/providers", providers);
r.use("/otp", otp);
// Channel management endpoints (activation/default handling per channel)
r.use("/channels", channels);
export default r;
