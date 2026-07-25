import { Router } from 'express';
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

// Catalog routes
router.get('/catalog', listCatalog);
router.get('/catalog/:id', getCatalog);
router.post('/catalog', createCatalog);
router.patch('/catalog/:id', updateCatalog);
router.delete('/catalog/:id', deleteCatalog);

// Device routes
router.get('/devices', listDevices);
router.get('/devices/:id', getDevice);
router.post('/devices', createDevice);
router.patch('/devices/:id', updateDevice);
router.delete('/devices/:id', deleteDevice);

// Contract routes
router.get('/contracts', listContracts);
router.get('/contracts/overdue', getOverdueContracts);
router.get('/contracts/stats', getRentalStats);
router.get('/contracts/:id', getContract);
router.get('/contracts/:id/details', getContractWithEvents);
router.post('/contracts', createContract);
router.post('/contracts/:id/return', returnContract);
router.post('/contracts/:id/extend', extendContract);
router.post('/contracts/:id/cancel', cancelContract);

// Payment routes
router.get('/payments', listPayments);
router.post('/payments', createPayment);

// Inspection routes
router.get('/inspections', listInspections);
router.post('/inspections', createInspection);
router.patch('/inspections/:id', updateInspection);

export default router;
