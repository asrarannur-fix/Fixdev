import express from "express";
import { getTenantData } from "../controllers/tenant.controller.js";
import { createBranch, updateRbacMatrix, updateSettingsDomain, updateUserRbac, updateBranch, deleteBranch } from "../controllers/settings.controller.js";
import { requireJwt, requireRoles, requireSettingsDomain, requireTenantScope } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/data", requireJwt, requireTenantScope, getTenantData);
router.put("/settings/:domain", requireSettingsDomain(), updateSettingsDomain);
router.put("/rbac/matrix", requireRoles("OWNER", "ADMIN"), updateRbacMatrix);
router.put("/rbac/users/:userId", requireRoles("OWNER", "ADMIN"), updateUserRbac);
router.post("/branches", requireRoles("OWNER", "ADMIN"), createBranch);
router.put("/branches/:id", requireRoles("OWNER", "ADMIN"), updateBranch);
router.delete("/branches/:id", requireRoles("OWNER", "ADMIN"), deleteBranch);

export default router;
