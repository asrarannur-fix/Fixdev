import express from "express";
import {
  enforceSuperAdminWriteMode,
  requireSuperAdminConsoleSession,
  requireSuperAdmin,
  requireSuperAdminPermission,
  requireSupabaseJwt,
} from "../../middleware/auth.middleware.js";
import {
  changeTenantStatus,
  createBackupJob,
  startConsoleSession,
  endConsoleSession,
  createTenantInvitation,
  endImpersonation,
  getOverview,
  getAlertSettings,
  listIncidents,
  createIncident,
  updateIncident,
  getTenantDetail,
  listAudit,
  listBackupJobs,
  listInvitations,
  listNotifications,
  listOutbox,
  listRolePermissions,
  listSuperAdminUsers,
  assignSuperAdminRole,
  listTenants,
  collectStorageUsage,
  markNotificationRead,
  registerTenant,
  checkTenantAvailability,
  retryNotification,
  revokeInvitation,
  startImpersonation,
  updateAlertSettings,
  updateRolePermissions,
} from "../controllers/superadmin.controller.js";

const router = express.Router();
router.use(requireSupabaseJwt, requireSuperAdmin, enforceSuperAdminWriteMode);

router.post("/sessions", startConsoleSession);
router.post("/sessions/:id/end", endConsoleSession);
router.use(requireSuperAdminConsoleSession);

router.get("/overview", requireSuperAdminPermission("overview:view"), getOverview);
router.get("/tenants", requireSuperAdminPermission("tenants:view"), listTenants);
router.post("/storage/collect", requireSuperAdminPermission("operations:view"), collectStorageUsage);
router.get("/tenants/availability", requireSuperAdminPermission("tenants:manage"), checkTenantAvailability);
router.post("/tenants", requireSuperAdminPermission("tenants:manage"), registerTenant);
router.get("/tenants/:id", requireSuperAdminPermission("tenants:view"), getTenantDetail);
router.get("/tenants/:id/invitations", requireSuperAdminPermission("tenants:view"), listInvitations);
router.delete("/tenants/:id/invitations/:invitationId", requireSuperAdminPermission("tenants:manage"), revokeInvitation);
router.post("/tenants/:id/status", requireSuperAdminPermission("tenants:manage"), changeTenantStatus);
router.post("/tenants/:id/invitations", requireSuperAdminPermission("tenants:manage"), createTenantInvitation);
router.post("/tenants/:id/impersonation", requireSuperAdminPermission("impersonation:read_only"), startImpersonation);
router.post("/impersonation/:id/end", requireSuperAdminPermission("impersonation:read_only"), endImpersonation);
router.get("/audit", requireSuperAdminPermission("audit:view"), listAudit);
router.get("/backups", requireSuperAdminPermission("operations:view"), listBackupJobs);
router.post("/backups", requireSuperAdminPermission("backup:manage"), createBackupJob);
router.get("/notifications", requireSuperAdminPermission("overview:view"), listNotifications);
router.post("/notifications/:id/read", requireSuperAdminPermission("overview:view"), markNotificationRead);
router.get("/outbox", requireSuperAdminPermission("operations:view"), listOutbox);
router.post("/outbox/:id/retry", requireSuperAdminPermission("operations:view"), retryNotification);
router.get("/alert-settings", requireSuperAdminPermission("operations:view"), getAlertSettings);
router.put("/alert-settings", requireSuperAdminPermission("operations:view"), updateAlertSettings);
router.get("/incidents", requireSuperAdminPermission("operations:view"), listIncidents);
router.post("/incidents", requireSuperAdminPermission("incidents:manage"), createIncident);
router.post("/incidents/:id/actions", requireSuperAdminPermission("incidents:manage"), updateIncident);
router.get("/roles", requireSuperAdminPermission("permissions:manage"), listRolePermissions);
router.put("/roles/:role", requireSuperAdminPermission("permissions:manage"), updateRolePermissions);
router.get("/users", requireSuperAdminPermission("users:assign_role"), listSuperAdminUsers);
router.put("/users/:userId/role", requireSuperAdminPermission("users:assign_role"), assignSuperAdminRole);

export default router;
