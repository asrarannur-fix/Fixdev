import express from 'express';
import { requireJwt, requireTenantScope, requireRoles } from '../../middleware/auth.middleware.js';
import { createServiceReception } from '../controllers/serviceReception.controller.js';
import { listServiceTickets, getServiceTicket, addStatusEvent, getStatusEvents } from '../controllers/serviceWorkflow.controller.js';
import { requireValidTenant, requireServiceTicketTenant } from '../middleware/tenant.middleware.js';

const router = express.Router();

router.use(requireJwt, requireTenantScope, requireValidTenant);

router.get('/', listServiceTickets);
router.get('/tickets', listServiceTickets);
router.get('/list', listServiceTickets);
router.post(
  '/',
  requireRoles('OWNER', 'ADMIN', 'CS', 'TEKNISI', 'SUPER_ADMIN'),
  createServiceReception
);
router.get('/:id', requireServiceTicketTenant, getServiceTicket);

// Endpoint untuk status-events
router.post('/:id/status-events', requireServiceTicketTenant, addStatusEvent);
router.get('/:id/status-events', requireServiceTicketTenant, getStatusEvents);

export default router;
