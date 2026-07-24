/**
 * Authentication & authorization middleware.
 *
 * requireJwt            — validates local JWT from Authorization header.
 *                        Attaches req.authActor and req.tenantId.
 * requireAdminToken    — validates x-admin-token header (server-to-server ops).
 * requireSuperAdmin    — checks authActor has superadmin role in DB.
 */
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { dbQuery } from "../lib/db.js";
import { getEffectiveFeatures } from "../lib/featureUtils.js";
import { logger } from "../lib/logger.js";
import { timingSafeEqual as cryptoTimingSafeEqual } from "crypto";

function timingSafeEqual(expected: string, provided: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && cryptoTimingSafeEqual(expectedBuffer, providedBuffer);
}

// ---------------------------------------------------------------------------
// 1. Local JWT validation
// ---------------------------------------------------------------------------

export interface AuthActor {
  authId: string;
  userId: string;
  email?: string;
  role: string;
  tenantId?: string;
  permissions: string[];
  features: string[];
  superadminRole?: string;
}

declare global {
  namespace Express {
    interface Request {
      authActor?: AuthActor;
      tenantId?: string;
      branchId?: string;
      dbTenantId?: string; // UUID from tenants table
      impersonationSession?: {
        id: string;
        tenantId: string;
        accessMode: "READ_ONLY" | "FULL";
        expiresAt: string;
      };
      superAdminConsoleSession?: {
        id: string;
        mode: "READ_ONLY" | "EDIT";
        expiresAt: string;
      };
    }
  }
}

/**
 * Express authentication middleware.
 * Validates Bearer JWT issued by our local auth system.
 * On success, attaches req.authActor with user profile from DB.
 */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const requireJwt = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header." });
  }

  const token = authHeader.split(" ")[1];
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(503).json({ error: "Authentication is not configured." });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Invalid or expired token." });
    }

    // Resolve the application profile. A valid JWT without a local
    // profile is not authorized to use protected application APIs.
    try {
      const result = await dbQuery(
        `SELECT u.tenant_id, u.id, u.role, u.email, u.permissions, u.superadmin_role, t.tier, t.status AS tenant_status, t.trial_ends_at FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id WHERE u.id = $1 LIMIT 1`,
        [decoded.userId],
      );
      if (result.rows.length === 0) {
        return res.status(403).json({ error: "Authenticated user has no application profile." });
      }

      const profile = result.rows[0];
      req.dbTenantId = profile.tenant_id || undefined;
      req.tenantId = profile.tenant_id || undefined;
      req.authActor = {
        authId: decoded.userId,
        userId: profile.id,
        email: profile.email || decoded.email,
        role: profile.role,
        tenantId: profile.tenant_id,
        permissions: profile.permissions || [],
        features: getEffectiveFeatures({
          tier: profile.tier || "BASIC",
          status: profile.tenant_status || "ACTIVE",
          trialEndsAt: profile.trial_ends_at,
        }),
        superadminRole: profile.superadmin_role || undefined,
      };
      if (req.hostTenant && req.authActor.role !== "SUPER_ADMIN" && profile.tenant_id !== req.hostTenant.id) {
        return res.status(403).json({ error: "Access to this tenant is forbidden." });
      }
      if (req.hostTenant && req.authActor.role === "SUPER_ADMIN") {
        logger.info({ userId: req.authActor.userId, hostTenantId: req.hostTenant.id }, "Super Admin accessing tenant host");
      }
    } catch (dbErr: any) {
      logger.error({ err: dbErr.message }, "Could not resolve authenticated user profile");
      return res.status(503).json({ error: "User profile service is unavailable." });
    }

    next();
  } catch (err: any) {
    logger.warn({ err: err.message }, "JWT validation error");
    return res.status(401).json({ error: "Invalid or expired token." });
  }
};

// ---------------------------------------------------------------------------
// 2. Admin token (server-to-server)
// ---------------------------------------------------------------------------

/**
 * Validates x-admin-token header.
 * Used for /api/database/*, /api/admin/audit-trail/clear, billing gateway config.
 */
export const requireAdminToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    logger.error("ADMIN_TOKEN is not configured");
    return res.status(503).json({ error: "Admin operations are not configured." });
  }
  const provided = (req.headers["x-admin-token"] as string) || "";
  if (!provided || !timingSafeEqual(expected, provided)) {
    logger.warn({ ip: req.ip, path: req.path }, "Unauthorized admin token attempt");
    return res.status(401).json({ error: "Unauthorized." });
  }
  next();
};

// ---------------------------------------------------------------------------
// 3. Tenant scope enforcement
// ---------------------------------------------------------------------------

/**
 * Ensures the authenticated user can only access their own tenant's data.
 * Must be used AFTER requireJwt.
 */
export const requireTenantScope = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const requestedTenant =
    (req.headers["x-tenant-id"] as string) ||
    (req.query.tenantId as string) ||
    req.authActor?.tenantId;

  if (!requestedTenant) {
    return res.status(400).json({ error: "tenantId is required." });
  }

  if (req.authActor?.role === "SUPER_ADMIN") {
    const sessionId = String(headerValue(req, "x-impersonation-session-id") || "").trim();
    if (!sessionId) {
      return res.status(403).json({ error: "Sesi impersonasi diperlukan untuk mengakses data tenant.", code: "IMPERSONATION_REQUIRED" });
    }
    try {
      const sessionResult = await dbQuery(
        `SELECT id,tenant_id,access_mode,expires_at FROM impersonation_sessions
         WHERE id=$1 AND actor_user_id=$2 AND ended_at IS NULL AND expires_at>now() LIMIT 1`,
        [sessionId, req.authActor.userId],
      );
      const session = sessionResult.rows[0];
      if (!session) return res.status(401).json({ error: "Sesi impersonasi tidak valid atau telah berakhir.", code: "IMPERSONATION_EXPIRED" });
      if (requestedTenant !== session.tenant_id) return res.status(403).json({ error: "Tenant tidak sesuai dengan sesi impersonasi." });
      if (!SAFE_METHODS.has(req.method) && session.access_mode !== "FULL") {
        return res.status(423).json({ error: "Sesi impersonasi hanya-baca. Aksi perubahan diblokir.", code: "IMPERSONATION_READ_ONLY" });
      }
      req.impersonationSession = { id: session.id, tenantId: session.tenant_id, accessMode: session.access_mode, expiresAt: session.expires_at };
      req.tenantId = session.tenant_id;
      req.dbTenantId = session.tenant_id;
      return next();
    } catch (dbErr: any) {
      logger.error({ err: dbErr.message }, "Could not validate impersonation tenant scope");
      return res.status(503).json({ error: "Layanan impersonasi tidak tersedia." });
    }
  }

  if (!req.authActor?.tenantId || requestedTenant !== req.authActor.tenantId) {
    logger.warn(
      { authTenant: req.authActor?.tenantId, requestedTenant, userId: req.authActor?.userId },
      "Cross-tenant access attempt blocked",
    );
    return res.status(403).json({ error: "Access to this tenant is forbidden." });
  }

  req.tenantId = req.authActor.tenantId;
  req.branchId = (req.headers["x-branch-id"] as string) || (req.query.branchId as string) || undefined;
  next();
};

export const requireRoles = (...roles: string[]) => (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.authActor) {
    return res.status(401).json({ error: "Authentication is required." });
  }
  if (!roles.includes(req.authActor.role)) {
    logger.warn(
      { userId: req.authActor.userId, role: req.authActor.role, path: req.path },
      "Role authorization denied",
    );
    return res.status(403).json({ error: "You do not have permission for this action." });
  }
  next();
};

export const requireSuperAdmin = requireRoles("SUPER_ADMIN");

export const requireSettingsDomain = (domainParam = "domain") => (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const actor = req.authActor;
  if (!actor) return res.status(401).json({ error: "Authentication is required." });
  if (["OWNER", "ADMIN"].includes(actor.role)) return next();
  const domain = String(req.params[domainParam] || "").trim();
  if (actor.permissions.includes("*") || actor.permissions.includes("settings") || actor.permissions.includes(`settings:${domain}`)) return next();
  logger.warn({ userId: actor.userId, role: actor.role, domain, path: req.path }, "Settings domain authorization denied");
  return res.status(403).json({ error: "You do not have permission for this settings domain." });
};

/**
 * Resolves an explicit tenant for control-plane operations. Unlike tenant
 * impersonation, this is only for dedicated Super Admin endpoints that already
 * require a granular permission (for example platform billing management).
 */
export const requireTenantOrSuperAdminPermission = (permission: string, allowPlatformScope = false) => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const actor = req.authActor;
  if (!actor) return res.status(401).json({ error: "Authentication is required." });
  if (actor.role !== "SUPER_ADMIN") {
    const hasPermission = actor.permissions.includes("*") || actor.permissions.includes(permission);
    if (!hasPermission && !["OWNER", "ADMIN"].includes(actor.role)) {
      return res.status(403).json({ error: "You do not have permission for this operation." });
    }
    return requireTenantScope(req, res, next);
  }

  const requestedTenant = String(
    req.headers["x-tenant-id"] ||
    req.query.tenantId || req.query.tenant_id || "",
  ).trim();
  if (!requestedTenant && !allowPlatformScope) return res.status(400).json({ error: "tenantId is required." });

  let permissions = req.authActor.permissions;
  if (req.authActor.superadminRole) {
    try {
      const permissionRows = await dbQuery(
        `SELECT permission FROM superadmin_role_permissions WHERE role=$1`,
        [req.authActor.superadminRole],
      );
      permissions = permissionRows.rows.map((row) => row.permission);
    } catch (err: any) {
      logger.error({ err: err.message }, "Could not resolve Super Admin tenant permission");
      return res.status(503).json({ error: "Layanan izin Super Admin tidak tersedia." });
    }
  }
  if (!permissions.includes("*") && !permissions.includes(permission)) {
    return res.status(403).json({ error: "Izin Super Admin tidak mencukupi." });
  }
  if (!requestedTenant && allowPlatformScope) return next();
  try {
    const tenant = await dbQuery(`SELECT id FROM tenants WHERE id=$1 LIMIT 1`, [requestedTenant]);
    if (!tenant.rows[0]) return res.status(404).json({ error: "Tenant tidak ditemukan." });
    req.tenantId = requestedTenant;
    req.dbTenantId = requestedTenant;
    next();
  } catch (err: any) {
    logger.error({ err: err.message }, "Could not resolve Super Admin target tenant");
    return res.status(503).json({ error: "Layanan tenant tidak tersedia." });
  }
};

function headerValue(req: Request, name: string) {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Validates an authoritative console session for every Super Admin mutation.
 * Read-only is the safe default: callers cannot enable writes by omitting a header.
 */
export const requireSuperAdminConsoleSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.authActor?.role !== "SUPER_ADMIN" || SAFE_METHODS.has(req.method)) return next();
  const sessionId = String(headerValue(req, "x-superadmin-session-id") || "").trim();
  if (!sessionId) {
    return res.status(423).json({
      error: "Sesi konsol edit diperlukan untuk melakukan perubahan.",
      code: "SUPERADMIN_SESSION_REQUIRED",
    });
  }
  try {
    const result = await dbQuery(
      `SELECT id,mode,expires_at FROM superadmin_console_sessions
       WHERE id=$1 AND actor_user_id=$2 AND ended_at IS NULL AND expires_at>now() LIMIT 1`,
      [sessionId, req.authActor.userId],
    );
    const session = result.rows[0];
    if (!session) return res.status(401).json({ error: "Sesi konsol tidak valid atau telah berakhir.", code: "SUPERADMIN_SESSION_EXPIRED" });
    req.superAdminConsoleSession = { id: session.id, mode: session.mode, expiresAt: session.expires_at };
    if (session.mode !== "EDIT") {
      return res.status(423).json({ error: "Sesi konsol hanya-baca. Aksi perubahan diblokir.", code: "SUPERADMIN_READ_ONLY" });
    }
    next();
  } catch (err: any) {
    logger.error({ err: err.message }, "Could not validate Super Admin console session");
    return res.status(503).json({ error: "Layanan sesi Super Admin tidak tersedia." });
  }
};

/**
 * Validates a server-issued impersonation session whenever a Super Admin enters
 * tenant scope. The tenant and access mode come from the session, not the client.
 */
export const requireImpersonationSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.authActor?.role !== "SUPER_ADMIN") return next();
  const sessionId = String(headerValue(req, "x-impersonation-session-id") || "").trim();
  if (!sessionId) return res.status(403).json({ error: "Sesi impersonasi diperlukan untuk mengakses data tenant.", code: "IMPERSONATION_REQUIRED" });
  try {
    const result = await dbQuery(
      `SELECT id,tenant_id,access_mode,expires_at FROM impersonation_sessions
       WHERE id=$1 AND actor_user_id=$2 AND ended_at IS NULL AND expires_at>now() LIMIT 1`,
      [sessionId, req.authActor.userId],
    );
    const session = result.rows[0];
    if (!session) return res.status(401).json({ error: "Sesi impersonasi tidak valid atau telah berakhir.", code: "IMPERSONATION_EXPIRED" });
    const requestedTenant = String(headerValue(req, "x-tenant-id") || req.query.tenantId || req.query.tenant_id || req.body?.tenantId || req.body?.tenant_id || "");
    if (requestedTenant && requestedTenant !== session.tenant_id) return res.status(403).json({ error: "Tenant tidak sesuai dengan sesi impersonasi." });
    if (!SAFE_METHODS.has(req.method) && session.access_mode !== "FULL") {
      return res.status(423).json({ error: "Sesi impersonasi hanya-baca. Aksi perubahan diblokir.", code: "IMPERSONATION_READ_ONLY" });
    }
    req.impersonationSession = { id: session.id, tenantId: session.tenant_id, accessMode: session.access_mode, expiresAt: session.expires_at };
    req.tenantId = session.tenant_id;
    req.dbTenantId = session.tenant_id;
    next();
  } catch (err: any) {
    logger.error({ err: err.message }, "Could not validate impersonation session");
    return res.status(503).json({ error: "Layanan impersonasi tidak tersedia." });
  }
};

/**
 * Legacy compatibility guard. Security enforcement is performed by
 * requireSuperAdminConsoleSession and requireImpersonationSession.
 */
export const enforceSuperAdminWriteMode = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (
    req.authActor?.role === "SUPER_ADMIN" &&
    !SAFE_METHODS.has(req.method) &&
    String(req.headers["x-superadmin-mode"] || "").toLowerCase() === "read-only"
  ) {
    return res.status(423).json({
      error: "Mode hanya-baca aktif. Aksi perubahan diblokir oleh server.",
      code: "SUPERADMIN_READ_ONLY",
    });
  }
  next();
};

export const requireSuperAdminPermission = (permission: string) => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.authActor?.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Akses Super Admin diperlukan." });
  }

  let permissions = req.authActor.permissions;
  if (req.authActor.superadminRole) {
    try {
      const result = await dbQuery(`SELECT permission FROM superadmin_role_permissions WHERE role=$1`, [req.authActor.superadminRole]);
      permissions = result.rows.map((row) => row.permission);
    } catch (err: any) {
      logger.error({ err: err.message, role: req.authActor.superadminRole }, "Could not resolve Super Admin permissions");
      return res.status(503).json({ error: "Layanan izin Super Admin tidak tersedia." });
    }
  }
  if (permissions.length === 0 || (!permissions.includes("*") && !permissions.includes(permission))) {
    return res.status(403).json({ error: "Izin Super Admin tidak mencukupi." });
  }
  next();
};

/**
 * Feature/tier guard. Requires requireTenantScope to run first (sets req.tenantId).
 * Loads the tenant, computes effective features via featureUtils, and rejects
 * with 403 when `feature` is not granted. This closes the gap where the UI hides
 * premium modules but the API could still be called directly.
 */
export const requireFeature = (feature: string) => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const tenantId = req.tenantId || req.authActor?.tenantId;
  if (!tenantId) {
    return res.status(400).json({ error: "tenantId is required." });
  }
  try {
    const result = await dbQuery(
      `SELECT status, tier, trial_ends_at AS "trialEndsAt" FROM tenants WHERE id=$1 LIMIT 1`,
      [tenantId],
    );
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: "Tenant tidak ditemukan." });
    const features = getEffectiveFeatures(row);
    if (!features.includes(feature)) {
      return res.status(403).json({
        error: "Fitur ini memerlukan paket langganan yang lebih tinggi.",
        code: "FEATURE_LOCKED",
        requiredFeature: feature,
      });
    }
    next();
  } catch (err: any) {
    logger.error({ err: err.message, tenantId, feature }, "Feature guard failed");
    return res.status(503).json({ error: "Layanan otorisasi fitur tidak tersedia." });
  }
};
