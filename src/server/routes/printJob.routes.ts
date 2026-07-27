import express from 'express';
import {
  createPrintJob,
  listPrintJobs,
  recordPrintResult,
  reprintPrintJob,
} from '../controllers/printJob.controller.js';

const router = express.Router();

router.get('/', listPrintJobs);
router.post('/', createPrintJob);
router.post('/:id/result', recordPrintResult);
router.post('/:id/reprint', reprintPrintJob);

export default router;
