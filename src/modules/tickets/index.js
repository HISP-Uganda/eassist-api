import { Router } from "express";
import core from "./tickets/router.js";
import notes from "./notes/router.js";
import attachments from "./attachments/router.js";
import watchers from "./watchers/router.js";
import events from "./events/router.js";
const r = Router();
// Mount sub-routes before the core router to prevent '/:id' conflicts
r.use("/notes", notes);
r.use("/attachments", attachments);
r.use("/watchers", watchers);
r.use("/events", events);
r.use("/", core);
export default r;
