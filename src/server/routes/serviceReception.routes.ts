import express from "express";
import { requireSupabaseJwt, requireTenantScope, requireRoles } from "../../middleware/auth.middleware.js";
import { createServiceReception } from "../controllers/serviceReception.controller.js";
import {
  approveServiceEstimate,
  addApprovedAdditionalCost,
  completeServiceQc,
  diagnoseServiceTicket,
  getServiceTicket,
  handoverServiceTicket,
  listServiceTickets,
  patchServiceWorkMetadata,
  requestServicePart,
  cancelServicePart,
  cancelServicePartOrder,
  createServicePartOrder,
  receiveServicePartOrder,
  updateServicePartOrder,
  transitionServiceTicket,
} from "../controllers/serviceWorkflow.controller.js";

const router = express.Router();

router.use(requireSupabaseJwt, requireTenantScope);
router.get("/", listServiceTickets);
router.post("/", requireRoles("OWNER", "ADMIN", "CS", "TEKNISI", "SUPER_ADMIN"), createServiceReception);
router.get("/:id", getServiceTicket);
router.post("/:id/transition", requireRoles("OWNER", "ADMIN", "TEKNISI", "CS", "SUPER_ADMIN"), transitionServiceTicket);
router.post("/:id/diagnosis", requireRoles("OWNER", "ADMIN", "TEKNISI", "SUPER_ADMIN"), diagnoseServiceTicket);
router.post("/:id/approval", requireRoles("OWNER", "ADMIN", "CS", "SUPER_ADMIN"), approveServiceEstimate);
router.post("/:id/additional-costs", requireRoles("OWNER", "ADMIN", "SUPER_ADMIN"), addApprovedAdditionalCost);
router.post("/:id/qc", requireRoles("OWNER", "ADMIN", "TEKNISI", "SUPER_ADMIN"), completeServiceQc);
router.post("/:id/parts", requireRoles("OWNER", "ADMIN", "TEKNISI", "SUPER_ADMIN"), requestServicePart);
router.delete("/:id/parts/:partId", requireRoles("OWNER", "ADMIN", "TEKNISI", "SUPER_ADMIN"), cancelServicePart);
router.post("/:id/part-orders", requireRoles("OWNER", "ADMIN", "TEKNISI", "SUPER_ADMIN"), createServicePartOrder);
router.patch("/:id/part-orders/:orderId", requireRoles("OWNER", "ADMIN", "TEKNISI", "SUPER_ADMIN"), updateServicePartOrder);
router.post("/:id/part-orders/:orderId/receive", requireRoles("OWNER", "ADMIN", "TEKNISI", "SUPER_ADMIN"), receiveServicePartOrder);
router.post("/:id/part-orders/:orderId/cancel", requireRoles("OWNER", "ADMIN", "SUPER_ADMIN"), cancelServicePartOrder);
router.patch("/:id/work", requireRoles("OWNER", "ADMIN", "TEKNISI", "SUPER_ADMIN"), patchServiceWorkMetadata);
router.post("/:id/handover", requireRoles("OWNER", "ADMIN", "CS", "SUPER_ADMIN"), handoverServiceTicket);

export default router;
