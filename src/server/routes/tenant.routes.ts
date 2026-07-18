import express from "express";
import { getTenantData } from "../controllers/tenant.controller.js";
import { requireSupabaseJwt, requireTenantScope } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/data", requireSupabaseJwt, requireTenantScope, getTenantData);

export default router;
