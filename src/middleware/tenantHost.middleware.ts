import type { NextFunction, Request, Response } from "express";
import { extractTenantHost, getHostTenantId, normalizeHostname, type HostTenant } from "../server/lib/tenantHost.js";
import { logger } from "../lib/logger.js";

declare global {
  namespace Express {
    interface Request {
      hostTenant?: HostTenant;
    }
  }
}

export const tenantHostResolver = async (req: Request, res: Response, next: NextFunction) => {
  if (req.path === "/api/health" || ["/api/qz/", "/api/admin/", "/api/platform/"].some((path) => req.path.startsWith(path))) return next();
  const rootDomain = process.env.TENANT_ROOT_DOMAIN || "fixdev.web.id";
  const hostname = normalizeHostname(req.hostname);
  if (!hostname || hostname === normalizeHostname(rootDomain) || ["localhost", "127.0.0.1", "::1"].includes(hostname)) return next();
  try {
    const tenant = await getHostTenantId(hostname, rootDomain);
    if (tenant) req.hostTenant = tenant;
    else if (extractTenantHost(hostname, rootDomain)) return res.status(404).json({ error: "Not found." });
    next();
  } catch (error: any) {
    logger.error({ err: error.message, hostname }, "Could not resolve tenant host");
    return res.status(503).json({ error: "Tenant service is unavailable." });
  }
};
