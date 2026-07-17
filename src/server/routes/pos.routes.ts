import express from "express";
import { requireRoles, requireSupabaseJwt, requireTenantScope } from "../../middleware/auth.middleware.js";
import {
  openShiftSchema, closeShiftSchema, posSaleSchema, voidSaleSchema, validateBody,
  openShift, closeShift, getShiftSummary, getShifts, createSale, voidSale, getSales, getSaleById,
} from "../controllers/pos.controller.js";

const router = express.Router();
const posUser = requireRoles("OWNER", "ADMIN", "MANAGER", "KASIR");
const posManager = requireRoles("OWNER", "ADMIN", "MANAGER");
const authenticated = [requireSupabaseJwt, requireTenantScope, posUser];

router.post("/shifts/open", ...authenticated, validateBody(openShiftSchema), openShift);
router.post("/shifts/close", ...authenticated, validateBody(closeShiftSchema), closeShift);
router.get("/shifts/:id/summary", ...authenticated, getShiftSummary);
router.get("/shifts", ...authenticated, getShifts);
router.post("/sales", ...authenticated, validateBody(posSaleSchema), createSale);
router.post("/sales/:id/void", requireSupabaseJwt, requireTenantScope, posManager, validateBody(voidSaleSchema), voidSale);
router.get("/sales", ...authenticated, getSales);
router.get("/sales/:id", ...authenticated, getSaleById);

export default router;
