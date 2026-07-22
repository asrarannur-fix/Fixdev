import express from "express";
import { getAuditTrail, clearAuditTrail } from "../controllers/audit.controller.js";
import { requireAdminToken, requireJwt } from "../../middleware/auth.middleware.js";

const router = express.Router();

// Read audit trail — requires valid JWT
router.get("/audit-trail", requireJwt, getAuditTrail);

// Clear audit trail — requires server-to-server admin token (not just any user)
router.post("/audit-trail/clear", requireAdminToken, clearAuditTrail);

export default router;
