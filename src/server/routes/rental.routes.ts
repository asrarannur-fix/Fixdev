import { Router } from 'express';
import { requireFeature } from '../../middleware/feature.middleware.js';
import { requireRoles } from '../../middleware/auth.middleware.js';
import {
  // Catalog
  listCatalog,
  getCatalog,
  createCatalog,
  updateCatalog,
  deleteCatalog,
  // Devices
  listDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  // Contracts
  listContracts,
  getContract,
  getContractWithEvents,
  createContract,
  returnContract,
  extendContract,
  cancelContract,
  // Payments
  listPayments,
  createPayment,
  // Inspections
  listInspections,
  createInspection,
  updateInspection,
  // Stats
  getRentalStats,
  getOverdueContracts,
} from '../controllers/rental.controller.js';

const router = Router();
router.use(requireFeature('RENTAL'));

// Catalog routes
router.get('/catalog', listCatalog);
router.get('/catalog/:id', getCatalog);
router.post('/catalog', requireRoles('OWNER', 'ADMIN', 'MANAGER'), createCatalog);
router.patch('/catalog/:id', requireRoles('OWNER', 'ADMIN', 'MANAGER'), updateCatalog);
router.delete('/catalog/:id', requireRoles('OWNER', 'ADMIN', 'MANAGER'), deleteCatalog);

// Device routes
router.get('/devices', listDevices);
router.get('/devices/:id', getDevice);
router.post('/devices', requireRoles('OWNER', 'ADMIN', 'MANAGER'), createDevice);
router.patch('/devices/:id', requireRoles('OWNER', 'ADMIN', 'MANAGER'), updateDevice);
router.delete('/devices/:id', requireRoles('OWNER', 'ADMIN', 'MANAGER'), deleteDevice);

// Contract routes
router.get('/contracts', listContracts);
router.get('/contracts/overdue', getOverdueContracts);
router.get('/contracts/stats', getRentalStats);
router.get('/contracts/:id', getContract);
router.get('/contracts/:id/details', getContractWithEvents);
router.post('/contracts', requireRoles('OWNER', 'ADMIN', 'MANAGER'), createContract);
router.post('/contracts/:id/return', requireRoles('OWNER', 'ADMIN', 'MANAGER'), returnContract);
router.post('/contracts/:id/extend', requireRoles('OWNER', 'ADMIN', 'MANAGER'), extendContract);
router.post('/contracts/:id/cancel', requireRoles('OWNER', 'ADMIN', 'MANAGER'), cancelContract);

// Payment routes
router.get('/payments', listPayments);
router.post('/payments', requireRoles('OWNER', 'ADMIN', 'MANAGER', 'KASIR'), createPayment);

// Inspection routes
router.get('/inspections', listInspections);
router.post('/inspections', requireRoles('OWNER', 'ADMIN', 'MANAGER', 'TEKNISI'), createInspection);
router.patch(
  '/inspections/:id',
  requireRoles('OWNER', 'ADMIN', 'MANAGER', 'TEKNISI'),
  updateInspection
);

export default router;
