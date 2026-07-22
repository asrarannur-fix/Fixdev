import express from "express";
import { getTenantData } from "../controllers/tenant.controller.js";
import { requireJwt, requireTenantScope } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/data", requireJwt, requireTenantScope, getTenantData);

export default router;
