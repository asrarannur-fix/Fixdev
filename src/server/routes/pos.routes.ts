import express from 'express';
import { requireRoles, requireJwt, requireTenantScope } from '../../middleware/auth.middleware.js';
import {
  openShiftSchema,
  closeShiftSchema,
  posSaleSchema,
  voidSaleSchema,
  partialRefundSchema,
  holdCartSchema,
  applyVoucherSchema,
  receiptPrintSchema,
  validateBody,
  openShift,
  closeShift,
  getShiftSummary,
  getShifts,
  createSale,
  voidSale,
  getSales,
  getSaleById,
  partialRefund,
  holdCart,
  recallHold,
  deleteHold,
  applyVoucher,
  reprintReceipt,
  posAnalytics,
} from '../controllers/pos.controller.js';

const router = express.Router();
const posUser = requireRoles('OWNER', 'ADMIN', 'MANAGER', 'KASIR');
const posManager = requireRoles('OWNER', 'ADMIN', 'MANAGER');
const authenticated = [requireJwt, requireTenantScope, posUser];

router.post('/shifts/open', ...authenticated, validateBody(openShiftSchema), openShift);
router.post('/shifts/close', ...authenticated, validateBody(closeShiftSchema), closeShift);
router.post('/shifts/:id/close', ...authenticated, validateBody(closeShiftSchema), closeShift);
router.get('/shifts/:id/summary', ...authenticated, getShiftSummary);
router.get('/shifts', ...authenticated, getShifts);
router.post('/sales', ...authenticated, validateBody(posSaleSchema), createSale);
router.post('/transactions', ...authenticated, validateBody(posSaleSchema), createSale);
router.post(
  '/sales/:id/partial-refund',
  requireJwt,
  requireTenantScope,
  posManager,
  validateBody(partialRefundSchema),
  partialRefund
);
router.post('/sales/:id/hold', ...authenticated, validateBody(holdCartSchema), holdCart);
router.post(
  '/sales/:id/recall',
  requireJwt,
  requireTenantScope,
  posManager,
  validateBody(holdCartSchema),
  recallHold
);
router.delete('/sales/:id/hold', requireJwt, requireTenantScope, posManager, deleteHold);
router.post(
  '/sales/:id/apply-voucher',
  ...authenticated,
  validateBody(applyVoucherSchema),
  applyVoucher
);
router.get('/sales/:id/receipt', ...authenticated, reprintReceipt);
router.post(
  '/sales/:id/void',
  requireJwt,
  requireTenantScope,
  posManager,
  validateBody(voidSaleSchema),
  voidSale
);
router.get('/sales', ...authenticated, getSales);
router.get('/sales/:id', ...authenticated, getSaleById);
router.get('/analytics', requireJwt, requireTenantScope, posManager, posAnalytics);

export default router;
