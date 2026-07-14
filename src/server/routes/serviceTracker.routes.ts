import express from "express";
import {
  getPublicTicketByToken,
  getPublicTicketStatus,
  verifyWarrantyQr,
} from "../controllers/serviceTracker.controller";

const router = express.Router();

router.get("/status/:ticketNo", getPublicTicketStatus);
router.get("/token/:token", getPublicTicketByToken);
router.post("/verify-warranty", verifyWarrantyQr);

export default router;
