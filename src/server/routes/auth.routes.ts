import { Router } from "express";
import { requireAdminToken, requireJwt, requireTenantScope, requireRoles } from "../../middleware/auth.middleware.js";
import { loginHandler, authProfileHandler, authPasswordUpdateHandler, adminResetPasswordHandler, onboardingRegisterHandler, upgradeTrialHandler, extendTrialHandler } from "../controllers/auth.controller.js";
import { acceptInvitation, validateInvitation } from "../controllers/invitation.controller.js";
import rateLimit from "express-rate-limit";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX || 15),
  message: { error: "Too many login attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

const onboardingLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: Number(process.env.ONBOARDING_RATE_LIMIT_MAX || 10),
  message: { error: "Terlalu banyak percobaan pendaftaran. Silakan coba lagi nanti." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

router.post("/login", loginLimiter, loginHandler);
router.get("/profile", requireJwt, authProfileHandler);
router.post("/profile/password", requireJwt, authPasswordUpdateHandler);
router.post("/admin/auth/reset-password", requireAdminToken, adminResetPasswordHandler);
router.post("/onboarding/register", onboardingLimiter, onboardingRegisterHandler);
router.post("/onboarding/upgrade-trial", requireJwt, requireTenantScope, requireRoles("OWNER", "ADMIN"), upgradeTrialHandler);
router.post("/onboarding/extend-trial", requireJwt, requireTenantScope, requireRoles("OWNER", "ADMIN"), extendTrialHandler);

router.get("/invitations/validate", validateInvitation);
router.post("/invitations/accept", acceptInvitation);

export default router;
