import { Router } from "express";
import providers from "./providers/router.js";
import otp from "./otp/router.js";
const r = Router();
r.use("/providers", providers);
r.use("/otp", otp);
export default r;

