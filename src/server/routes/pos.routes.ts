/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POS Routes — Dedicated endpoints for Point-of-Sale operations.
 */
import express from "express";
import { requireSupabaseJwt, requireTenantScope } from "../../middleware/auth.middleware.js";
import { sanctumAuthMiddleware, checkAbilities } from "../controllers/apiV1.controller.js";
import {
  openShiftSchema,
  closeShiftSchema,
  posSaleSchema,
  voidSaleSchema,
  validateBody,
  openShift,
  closeShift,
  getShiftSummary,
  getShifts,
  createSale,
  voidSale,
  getSales,
  getSaleById,
} from "../controllers/pos.controller.js";

const router = express.Router();

// ──────────────────────────────────────────
// A. SHIFT MANAGEMENT
// ──────────────────────────────────────────

// Open a new cashier shift
router.post(
  "/shifts/open",
  sanctumAuthMiddleware,
  requireSupabaseJwt,
  requireTenantScope,
  checkAbilities(["pos:write", "pos-shifts"]),
  validateBody(openShiftSchema),
  openShift,
);

// Close the active cashier shift (returns X/Z-report summary)
router.post(
  "/shifts/close",
  sanctumAuthMiddleware,
  requireSupabaseJwt,
  requireTenantScope,
  checkAbilities(["pos:write", "pos-shifts"]),
  validateBody(closeShiftSchema),
  closeShift,
);

// Get shift summary (X-report, read-only)
router.get(
  "/shifts/:id/summary",
  sanctumAuthMiddleware,
  requireSupabaseJwt,
  requireTenantScope,
  checkAbilities(["pos:read", "pos-shifts"]),
  getShiftSummary,
);

// List shifts
router.get(
  "/shifts",
  sanctumAuthMiddleware,
  requireSupabaseJwt,
  requireTenantScope,
  checkAbilities(["pos:read", "pos-shifts"]),
  getShifts,
);

// ──────────────────────────────────────────
// B. SALE TRANSACTIONS
// ──────────────────────────────────────────

// Create a new POS sale (checkout)
router.post(
  "/sales",
  sanctumAuthMiddleware,
  requireSupabaseJwt,
  requireTenantScope,
  checkAbilities(["pos:write", "pos-cashier"]),
  validateBody(posSaleSchema),
  createSale,
);

// Void a POS sale (with stock restoration + reversal journal)
router.post(
  "/sales/:id/void",
  sanctumAuthMiddleware,
  requireSupabaseJwt,
  requireTenantScope,
  checkAbilities(["pos:write", "action-pos-void-approve"]),
  validateBody(voidSaleSchema),
  voidSale,
);

// List POS sales
router.get(
  "/sales",
  sanctumAuthMiddleware,
  requireSupabaseJwt,
  requireTenantScope,
  checkAbilities(["pos:read", "pos-history"]),
  getSales,
);

// Get sale by ID
router.get(
  "/sales/:id",
  sanctumAuthMiddleware,
  requireSupabaseJwt,
  requireTenantScope,
  checkAbilities(["pos:read", "pos-history"]),
  getSaleById,
);

export default router;
