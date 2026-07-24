import express from "express";
import {
  requireSuperAdmin,
  requireSuperAdminConsoleSession,
  requireSuperAdminPermission,
  requireJwt,
} from "../../middleware/auth.middleware.js";
import {
  changeTenantStatus,
  createBackupJob,
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
  permanentDeleteTenant,
  registerTenant,
  checkTenantAvailability,
  retryNotification,
  revokeInvitation,
  startImpersonation,
  updateAlertSettings,
  updateRolePermissions,
  updateTenantConfig,
  terminateSubscription,
  extendSubscription,
  startConsoleSession,
  endConsoleSession,
} from "../controllers/superadmin.controller.js";

const router = express.Router();
router.use(requireJwt, requireSuperAdmin);

// GET routes are read-only and safe; console-session guard auto-skips them.
router.get("/overview", requireSuperAdminPermission("overview:view"), getOverview);
router.get("/tenants", requireSuperAdminPermission("tenants:view_all"), listTenants);
router.get("/tenants/availability", requireSuperAdminPermission("tenants:manage_registration"), checkTenantAvailability);
router.get("/tenants/:id", requireSuperAdminPermission("tenants:view_detail"), getTenantDetail);
router.get("/tenants/:id/invitations", requireSuperAdminPermission("tenants:view_invitations"), listInvitations);
router.get("/audit", requireSuperAdminPermission("audit:view_all"), listAudit);
router.get("/backups", requireSuperAdminPermission("platform:view_backups"), listBackupJobs);
router.get("/notifications", requireSuperAdminPermission("platform:view_notifications"), listNotifications);
router.get("/outbox", requireSuperAdminPermission("platform:view_outbox"), listOutbox);
router.get("/alert-settings", requireSuperAdminPermission("platform:view_alerts"), getAlertSettings);
router.get("/incidents", requireSuperAdminPermission("incidents:view_all"), listIncidents);
router.get("/roles", requireSuperAdminPermission("permissions:view_roles"), listRolePermissions);
router.get("/users", requireSuperAdminPermission("users:view_superadmin_users"), listSuperAdminUsers);

// Mutation routes require an active EDIT console session (consistent with billing.routes).
router.post(
  "/storage/collect",
  requireSuperAdminPermission("platform:manage_storage"),
  requireSuperAdminConsoleSession,
  collectStorageUsage,
);
router.post(
  "/tenants",
  requireSuperAdminPermission("tenants:manage_registration"),
  requireSuperAdminConsoleSession,
  registerTenant,
);
router.delete(
  "/tenants/:id/invitations/:invitationId",
  requireSuperAdminPermission("tenants:manage_invitations"),
  requireSuperAdminConsoleSession,
  revokeInvitation,
);
router.post(
  "/tenants/:id/status",
  requireSuperAdminPermission("tenants:manage_lifecycle"),
  requireSuperAdminConsoleSession,
  changeTenantStatus,
);
router.post(
  "/tenants/:id/terminate-subscription",
  requireSuperAdminPermission("tenants:manage_lifecycle"),
  requireSuperAdminConsoleSession,
  terminateSubscription,
);
router.post(
  "/tenants/:id/extend-subscription",
  requireSuperAdminPermission("tenants:manage_lifecycle"),
  requireSuperAdminConsoleSession,
  extendSubscription,
);
router.delete(
  "/tenants/:id/permanent",
  requireSuperAdminPermission("tenants:manage_lifecycle"),
  requireSuperAdminConsoleSession,
  permanentDeleteTenant,
);
router.put(
  "/tenants/:id/config",
  requireSuperAdminPermission("tenants:manage_config"),
  requireSuperAdminConsoleSession,
  updateTenantConfig,
);
router.post(
  "/tenants/:id/invitations",
  requireSuperAdminPermission("tenants:manage_invitations"),
  requireSuperAdminConsoleSession,
  createTenantInvitation,
);
router.post(
  "/tenants/:id/impersonation",
  requireSuperAdminPermission("impersonation:create_session"),
  requireSuperAdminConsoleSession,
  startImpersonation,
);
router.post(
  "/impersonation/:id/end",
  requireSuperAdminPermission("impersonation:end_session"),
  requireSuperAdminConsoleSession,
  endImpersonation,
);
router.post(
  "/backups",
  requireSuperAdminPermission("platform:manage_backups"),
  requireSuperAdminConsoleSession,
  createBackupJob,
);
router.post(
  "/notifications/:id/read",
  requireSuperAdminPermission("platform:manage_notifications"),
  requireSuperAdminConsoleSession,
  markNotificationRead,
);
router.post(
  "/outbox/:id/retry",
  requireSuperAdminPermission("platform:manage_notifications"),
  requireSuperAdminConsoleSession,
  retryNotification,
);
router.put(
  "/alert-settings",
  requireSuperAdminPermission("platform:manage_alerts"),
  requireSuperAdminConsoleSession,
  updateAlertSettings,
);
router.post(
  "/incidents",
  requireSuperAdminPermission("incidents:manage_incidents"),
  requireSuperAdminConsoleSession,
  createIncident,
);
router.post(
  "/incidents/:id/actions",
  requireSuperAdminPermission("incidents:manage_incidents"),
  requireSuperAdminConsoleSession,
  updateIncident,
);
router.put(
  "/roles/:role",
  requireSuperAdminPermission("permissions:manage_roles"),
  requireSuperAdminConsoleSession,
  updateRolePermissions,
);
router.get("/users", requireSuperAdminPermission("users:view_superadmin_users"), listSuperAdminUsers);
router.put(
  "/users/:userId/role",
  requireSuperAdminPermission("users:assign_role"),
  requireSuperAdminConsoleSession,
  assignSuperAdminRole,
);

// Console-session lifecycle (start/end) must NOT require an active edit session itself.
router.post("/console-session/start", requireSuperAdminPermission("platform:manage_console_session"), startConsoleSession);
router.post("/console-session/:id/end", requireSuperAdminPermission("platform:manage_console_session"), endConsoleSession);

export default router;
