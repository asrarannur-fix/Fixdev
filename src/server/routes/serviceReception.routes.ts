import express from "express";
import { requireSupabaseJwt, requireTenantScope, requireRoles } from "../../middleware/auth.middleware.js";
import { createServiceReception } from "../controllers/serviceReception.controller.js";
import { listServiceTickets, getServiceTicket } from "../controllers/serviceWorkflow.controller.js";

const router = express.Router();

router.use(requireSupabaseJwt, requireTenantScope);
router.get("/", listServiceTickets);
router.post("/", requireRoles("OWNER", "ADMIN", "CS", "TEKNISI", "SUPER_ADMIN"), createServiceReception);
router.get("/:id", getServiceTicket);

export default router;
