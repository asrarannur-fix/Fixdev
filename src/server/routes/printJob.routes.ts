import express from 'express';
import {
  createPrintJob,
  listPrintJobs,
  recordPrintResult,
  reprintPrintJob,
} from '../controllers/printJob.controller.js';
import { printJobLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.get('/', listPrintJobs);
router.post('/', printJobLimiter, createPrintJob);
router.post('/:id/result', recordPrintResult);
router.post('/:id/reprint', printJobLimiter, reprintPrintJob);

export default router;
