import express from "express";
import {
  aiDiagnose,
  aiChat,
  aiAnalyzeSales,
} from "../controllers/ai.controller.js";
import { requireJwt, requireTenantScope } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/diagnose", requireJwt, requireTenantScope, aiDiagnose);
router.post("/chat", requireJwt, requireTenantScope, aiChat);
router.post("/analyze-sales", requireJwt, requireTenantScope, aiAnalyzeSales);

export default router;
