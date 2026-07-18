import express from "express";
import {
  getPublicTicketByToken,
  getPublicTicketStatus,
  verifyWarrantyQr,
} from "../controllers/serviceTracker.controller.js";

const router = express.Router();

router.get("/status/*", (req: any, res) => {
  const params = req.params || {};
  const wild = String(params[0] || "").trim();
  if (!wild) {
    return getPublicTicketStatus(req, res);
  }
  // Wildcard captures everything after /status/, including slashes
  req.params.ticketNo = wild;
  return getPublicTicketStatus(req, res);
});
router.get("/token/:token", getPublicTicketByToken);
router.post("/verify-warranty", verifyWarrantyQr);

export default router;
