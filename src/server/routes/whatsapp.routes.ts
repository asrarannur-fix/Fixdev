import { Router } from "express";
import { requireJwt, requireTenantScope } from "../../middleware/auth.middleware.js";
import { whatsappGetLogsHandler, whatsappPostLogsHandler, whatsappGetQueueHandler, whatsappPostQueueHandler } from "../controllers/whatsapp.controller.js";

const router = Router();

router.get("/logs", requireJwt, requireTenantScope, whatsappGetLogsHandler);
router.post("/logs", requireJwt, requireTenantScope, whatsappPostLogsHandler);
router.get("/queue", requireJwt, requireTenantScope, whatsappGetQueueHandler);
router.post("/queue", requireJwt, requireTenantScope, whatsappPostQueueHandler);

export default router;
