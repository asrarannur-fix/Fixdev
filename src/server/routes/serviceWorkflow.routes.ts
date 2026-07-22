/**
 * Service Workflow Routes
 * Mounted at /api/services
 * Handles: reception → diagnosis → approval → work → QC → handover
 */
import express from "express";
import { requireJwt, requireTenantScope, requireRoles } from "../../middleware/auth.middleware.js";
import {
  listServiceTickets,
  getServiceTicket,
  transitionServiceTicket,
  diagnoseServiceTicket,
  approveServiceEstimate,
  completeServiceQc,
  createServicePartOrder,
  updateServicePartOrder,
  receiveServicePartOrder,
  cancelServicePartOrder,
  addApprovedAdditionalCost,
  requestServicePart,
  cancelServicePart,
  patchServiceWorkMetadata,
  handoverServiceTicket,
} from "../controllers/serviceWorkflow.controller.js";

const router = express.Router();

// All workflow routes require authentication + tenant scope
router.use(requireJwt, requireTenantScope);

// List & get
router.get("/", listServiceTickets);
router.get("/:id", getServiceTicket);

// Transitions
router.post("/:id/transition", requireRoles("OWNER", "ADMIN", "TEKNISI", "CS", "SUPER_ADMIN"), transitionServiceTicket);
router.post("/:id/diagnosis", requireRoles("OWNER", "ADMIN", "TEKNISI", "SUPER_ADMIN"), diagnoseServiceTicket);
router.post("/:id/approval", requireRoles("OWNER", "ADMIN", "CS", "SUPER_ADMIN"), approveServiceEstimate);
router.post("/:id/qc", requireRoles("OWNER", "ADMIN", "TEKNISI", "SUPER_ADMIN"), completeServiceQc);
router.post("/:id/handover", requireRoles("OWNER", "ADMIN", "CS", "SUPER_ADMIN"), handoverServiceTicket);

// Parts & additional costs
router.post("/:id/part-orders", requireRoles("OWNER", "ADMIN", "TEKNISI", "SUPER_ADMIN"), createServicePartOrder);
router.put("/:id/part-orders/:orderId", requireRoles("OWNER", "ADMIN", "TEKNISI", "SUPER_ADMIN"), updateServicePartOrder);
router.post("/:id/part-orders/:orderId/receive", requireRoles("OWNER", "ADMIN", "TEKNISI", "SUPER_ADMIN"), receiveServicePartOrder);
router.post("/:id/part-orders/:orderId/cancel", requireRoles("OWNER", "ADMIN", "SUPER_ADMIN"), cancelServicePartOrder);
router.post("/:id/additional-costs", requireRoles("OWNER", "ADMIN", "SUPER_ADMIN"), addApprovedAdditionalCost);
router.post("/:id/request-part", requireRoles("OWNER", "ADMIN", "TEKNISI", "SUPER_ADMIN"), requestServicePart);
router.post("/:id/parts", requireRoles("OWNER", "ADMIN", "TEKNISI", "SUPER_ADMIN"), requestServicePart);
router.post("/:id/cancel-part", requireRoles("OWNER", "ADMIN", "TEKNISI", "SUPER_ADMIN"), cancelServicePart);
router.delete("/:id/parts/:partId", requireRoles("OWNER", "ADMIN", "TEKNISI", "SUPER_ADMIN"), cancelServicePart);
router.patch("/:id/work-metadata", requireRoles("OWNER", "ADMIN", "TEKNISI", "SUPER_ADMIN"), patchServiceWorkMetadata);

export default router;
