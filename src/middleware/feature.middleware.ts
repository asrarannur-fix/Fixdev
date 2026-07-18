import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js"; // Assume logger is defined in lib/logger.js

export const requireFeature = (featureName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authActor) {
      logger.warn(
        { path: req.path, authHeader: req.headers?.authorization },
        "Access denied: Authentication required for feature check."
      );
      return res.status(401).json({ error: "Authentication required." });
    }

    // Super Admin and impersonation bypass feature checks as they have full platform access
    // This is for tenant-level feature gating, not RBAC.
    if (req.authActor.role === "SUPER_ADMIN" || req.impersonationSession) {
      return next();
    }

    if (!req.authActor.features || !req.authActor.features.includes(featureName)) {
      logger.warn(
        { userId: req.authActor.userId, tenantId: req.authActor.tenantId, requestedFeature: featureName, userFeatures: req.authActor.features },
        "Access denied: Feature not available for tenant."
      );
      return res.status(403).json({
        error: `Feature '${featureName}' not available for your subscription tier. Please upgrade.`,
        code: "FEATURE_LOCKED"
      });
    }

    next();
  };
};
