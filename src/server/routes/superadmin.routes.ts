import express from "express";
import {
  requireSuperAdmin,
  requireSuperAdminPermission,
  requireJwt,
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
  updateTenantConfig,
} from "../controllers/superadmin.controller.js";

const router = express.Router();
router.use(requireJwt, requireSuperAdmin);

router.get("/overview", requireSuperAdminPermission("overview:view"), getOverview);
router.get("/tenants", requireSuperAdminPermission("tenants:view_all"), listTenants);
router.post("/storage/collect", requireSuperAdminPermission("platform:manage_storage"), collectStorageUsage);
router.get("/tenants/availability", requireSuperAdminPermission("tenants:manage_registration"), checkTenantAvailability);
router.post("/tenants", requireSuperAdminPermission("tenants:manage_registration"), registerTenant);
router.get("/tenants/:id", requireSuperAdminPermission("tenants:view_detail"), getTenantDetail);
router.get("/tenants/:id/invitations", requireSuperAdminPermission("tenants:view_invitations"), listInvitations);
router.delete("/tenants/:id/invitations/:invitationId", requireSuperAdminPermission("tenants:manage_invitations"), revokeInvitation);
router.post("/tenants/:id/status", requireSuperAdminPermission("tenants:manage_lifecycle"), changeTenantStatus);
router.put("/tenants/:id/config", requireSuperAdminPermission("tenants:manage_config"), updateTenantConfig);
router.post("/tenants/:id/invitations", requireSuperAdminPermission("tenants:manage_invitations"), createTenantInvitation);
router.post("/tenants/:id/impersonation", requireSuperAdminPermission("impersonation:create_session"), startImpersonation);
router.post("/impersonation/:id/end", requireSuperAdminPermission("impersonation:end_session"), endImpersonation);
router.get("/audit", requireSuperAdminPermission("audit:view_all"), listAudit);
router.get("/backups", requireSuperAdminPermission("platform:view_backups"), listBackupJobs);
router.post("/backups", requireSuperAdminPermission("platform:manage_backups"), createBackupJob);
router.get("/notifications", requireSuperAdminPermission("platform:view_notifications"), listNotifications);
router.post("/notifications/:id/read", requireSuperAdminPermission("platform:manage_notifications"), markNotificationRead);
router.get("/outbox", requireSuperAdminPermission("platform:view_outbox"), listOutbox);
router.post("/outbox/:id/retry", requireSuperAdminPermission("platform:manage_notifications"), retryNotification);
router.get("/alert-settings", requireSuperAdminPermission("platform:view_alerts"), getAlertSettings);
router.put("/alert-settings", requireSuperAdminPermission("platform:manage_alerts"), updateAlertSettings);
router.get("/incidents", requireSuperAdminPermission("incidents:view_all"), listIncidents);
router.post("/incidents", requireSuperAdminPermission("incidents:manage_incidents"), createIncident);
router.post("/incidents/:id/actions", requireSuperAdminPermission("incidents:manage_incidents"), updateIncident);
router.get("/roles", requireSuperAdminPermission("permissions:view_roles"), listRolePermissions);
router.put("/roles/:role", requireSuperAdminPermission("permissions:manage_roles"), updateRolePermissions);
router.get("/users", requireSuperAdminPermission("users:view_superadmin_users"), listSuperAdminUsers);
router.put("/users/:userId/role", requireSuperAdminPermission("users:assign_role"), assignSuperAdminRole);

export default router;
