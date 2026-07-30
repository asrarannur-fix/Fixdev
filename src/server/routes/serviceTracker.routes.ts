import express from "express";
import { servicePortalLimiter } from '../middleware/rateLimiter.js';
import {
  getPublicTicketByToken,
  getPublicTicketByNumber,
  verifyWarrantyQr,
  getPortalTicketDetail,
  approvePortalTicket,
} from "../controllers/serviceTracker.controller.js";

const router = express.Router();

router.get("/token/:token", servicePortalLimiter, getPublicTicketByToken);
router.post("/ticket", servicePortalLimiter, getPublicTicketByNumber);
router.post("/verify-warranty", servicePortalLimiter, verifyWarrantyQr);

router.post("/portal-detail", servicePortalLimiter, getPortalTicketDetail);
router.post("/portal-approve", servicePortalLimiter, approvePortalTicket);

export default router;
