/**
 * Service Workflow Routes
 * Mounted at /api/services
 * Handles: reception → diagnosis → approval → work → QC → handover
 */
import express from 'express';
import { requireJwt, requireTenantScope, requireRoles } from '../../middleware/auth.middleware.js';
import {
  listServiceTickets,
  getServiceTicket,
  transitionServiceTicket,
  diagnoseService,
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
  settleServiceReceivable,
  addStatusEvent,
  getStatusEvents,
} from '../controllers/serviceWorkflow.controller.js';
import { requireValidTenant, requireServiceTicketTenant } from '../middleware/tenant.middleware.js';

const router = express.Router();

// All workflow routes require authentication + tenant scope + valid tenant
router.use(requireJwt, requireTenantScope, requireValidTenant);

// List & get
router.get('/', listServiceTickets);
router.get('/tickets', listServiceTickets);
router.get('/list', listServiceTickets);
router.get('/:id', requireServiceTicketTenant, getServiceTicket);

// Transitions
router.post(
  '/:id/transition',
  requireServiceTicketTenant,
  requireRoles('OWNER', 'ADMIN', 'TEKNISI', 'CS', 'SUPER_ADMIN'),
  transitionServiceTicket
);
router.post(
  '/:id/diagnosis',
  requireServiceTicketTenant,
  requireRoles('OWNER', 'ADMIN', 'TEKNISI', 'SUPER_ADMIN'),
  diagnoseService
);

// Approval & QC
router.post(
  '/:id/approval',
  requireServiceTicketTenant,
  requireRoles('OWNER', 'ADMIN', 'CS', 'SUPER_ADMIN'),
  approveServiceEstimate
);
router.post('/:id/qc', requireServiceTicketTenant, requireRoles('OWNER', 'ADMIN', 'TEKNISI', 'SUPER_ADMIN'), completeServiceQc);

// Settlements
router.post(
  '/receivables/:receivableId/settlements',
  requireRoles('OWNER', 'ADMIN', 'CS', 'SUPER_ADMIN'),
  settleServiceReceivable
);

// Handover
router.post(
  '/:id/handover',
  requireServiceTicketTenant,
  requireRoles('OWNER', 'ADMIN', 'CS', 'SUPER_ADMIN'),
  handoverServiceTicket
);

// Status events
router.post('/:id/status-events', requireServiceTicketTenant, addStatusEvent);
router.get('/:id/status-events', requireServiceTicketTenant, getStatusEvents);

// Parts & additional costs
router.post(
  '/:id/part-orders',
  requireServiceTicketTenant,
  requireRoles('OWNER', 'ADMIN', 'TEKNISI', 'SUPER_ADMIN'),
  createServicePartOrder
);
router.put(
  '/:id/part-orders/:orderId',
  requireServiceTicketTenant,
  requireRoles('OWNER', 'ADMIN', 'TEKNISI', 'SUPER_ADMIN'),
  updateServicePartOrder
);
router.post(
  '/:id/part-orders/:orderId/receive',
  requireServiceTicketTenant,
  requireRoles('OWNER', 'ADMIN', 'TEKNISI', 'SUPER_ADMIN'),
  receiveServicePartOrder
);
router.post(
  '/:id/part-orders/:orderId/cancel',
  requireServiceTicketTenant,
  requireRoles('OWNER', 'ADMIN', 'SUPER_ADMIN'),
  cancelServicePartOrder
);
router.post(
  '/:id/additional-costs',
  requireServiceTicketTenant,
  requireRoles('OWNER', 'ADMIN', 'SUPER_ADMIN'),
  addApprovedAdditionalCost
);
router.post(
  '/:id/request-part',
  requireServiceTicketTenant,
  requireRoles('OWNER', 'ADMIN', 'TEKNISI', 'SUPER_ADMIN'),
  requestServicePart
);
router.post(
  '/:id/parts',
  requireServiceTicketTenant,
  requireRoles('OWNER', 'ADMIN', 'TEKNISI', 'SUPER_ADMIN'),
  requestServicePart
);
router.post(
  '/:id/cancel-part',
  requireServiceTicketTenant,
  requireRoles('OWNER', 'ADMIN', 'TEKNISI', 'SUPER_ADMIN'),
  cancelServicePart
);
router.delete(
  '/:id/parts/:partId',
  requireServiceTicketTenant,
  requireRoles('OWNER', 'ADMIN', 'TEKNISI', 'SUPER_ADMIN'),
  cancelServicePart
);
router.patch(
  '/:id/work-metadata',
  requireServiceTicketTenant,
  requireRoles('OWNER', 'ADMIN', 'TEKNISI', 'SUPER_ADMIN'),
  patchServiceWorkMetadata
);

export default router;
