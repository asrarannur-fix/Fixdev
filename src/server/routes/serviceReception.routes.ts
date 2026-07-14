import express from "express";
import { requireSupabaseJwt, requireTenantScope } from "../../middleware/auth.middleware.js";
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
router.post("/", createServiceReception);
router.get("/:id", getServiceTicket);
router.post("/:id/transition", transitionServiceTicket);
router.post("/:id/diagnosis", diagnoseServiceTicket);
router.post("/:id/approval", approveServiceEstimate);
router.post("/:id/additional-costs", addApprovedAdditionalCost);
router.post("/:id/qc", completeServiceQc);
router.post("/:id/parts", requestServicePart);
router.delete("/:id/parts/:partId", cancelServicePart);
router.post("/:id/part-orders", createServicePartOrder);
router.patch("/:id/part-orders/:orderId", updateServicePartOrder);
router.post("/:id/part-orders/:orderId/arrive", receiveServicePartOrder);
router.post("/:id/part-orders/:orderId/cancel", cancelServicePartOrder);
router.patch("/:id/work", patchServiceWorkMetadata);
router.post("/:id/handover", handoverServiceTicket);

export default router;
