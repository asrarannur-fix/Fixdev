import express from 'express';
import {
  requireRoles,
  requireSuperAdminPermission,
  requireTenantOrSuperAdminPermission,
  requireJwt,
} from '../../middleware/auth.middleware.js';
import {
  getSettingsDomain,
  getSettingsTabs,
  updateBranding,
  getBranding,
  updateSubscription,
  getSubscriptionStatus,
} from '../controllers/settings.controller.js';

const router = express.Router();

// All routes require JWT authentication
router.use(requireJwt);

// Settings domain - works for both tenant and superadmin
router.get(
  '/domain',
  getSettingsDomain
);

// Settings tabs - superadmin can see all tabs, tenant/owner limited
router.get(
  '/tabs',
  requireRoles('SUPER_ADMIN', 'OWNER', 'ADMIN'),
  getSettingsTabs
);

// Branding settings - tenant/owner only
router.get(
  '/branding',
  requireRoles('OWNER', 'ADMIN', 'SUPER_ADMIN'),
  getBranding
);
router.put(
  '/branding',
  requireRoles('OWNER', 'ADMIN'),
  updateBranding
);

// Subscription settings - tenant/owner only
router.get(
  '/subscription',
  requireRoles('OWNER', 'ADMIN', 'SUPER_ADMIN'),
  getSubscriptionStatus
);
router.put(
  '/subscription',
  requireRoles('OWNER', 'ADMIN'),
  updateSubscription
);

export default router;