import { Router } from "express";
import { requireJwt, requireTenantScope, requireSuperAdmin, requireSuperAdminPermission } from "../../middleware/auth.middleware.js";
import { bootstrapHandler, platformBootstrapHandler } from "../controllers/bootstrap.controller.js";
import { moduleRecordsGetHandler, moduleRecordsPostHandler, dataSyncHandler } from "../controllers/data.controller.js";
import { qzPublicCertHandler, qzSignHandler } from "../controllers/qz.controller.js";
import { qzCertDownloadHandler, qzInstallerBatHandler } from "../controllers/qzinstaller.controller.js";
import { platformHealthHandler } from "../controllers/monitoring.controller.js";

const router = Router();

router.get("/bootstrap", requireJwt, requireTenantScope, bootstrapHandler);
router.get("/platform/bootstrap", requireJwt, requireSuperAdmin, requireSuperAdminPermission("platform:view_bootstrap"), platformBootstrapHandler);
router.get("/platform/health", requireJwt, requireSuperAdmin, platformHealthHandler);

router.get("/module-records", requireJwt, requireTenantScope, moduleRecordsGetHandler);
router.post("/module-records", requireJwt, requireTenantScope, moduleRecordsPostHandler);
router.post("/data/sync", requireJwt, requireTenantScope, dataSyncHandler);

router.get("/qz/certificate", qzPublicCertHandler);
router.get("/qz/certificate/download", qzCertDownloadHandler);
router.get("/qz/installer.bat", qzInstallerBatHandler);
router.post("/qz/sign", requireJwt, requireTenantScope, qzSignHandler);

export default router;
