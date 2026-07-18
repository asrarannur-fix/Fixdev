import express from "express";
import {
  aiDiagnose,
  aiChat,
  aiAnalyzeSales,
} from "../controllers/ai.controller.js";
import { requireSupabaseJwt, requireTenantScope } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/diagnose", requireSupabaseJwt, requireTenantScope, aiDiagnose);
router.post("/chat", requireSupabaseJwt, requireTenantScope, aiChat);
router.post("/analyze-sales", requireSupabaseJwt, requireTenantScope, aiAnalyzeSales);

export default router;
