import type { Request, Response } from "express";

export function publicTenantContextHandler(req: Request, res: Response) {
  const tenant = req.hostTenant;
  if (!tenant) return res.json({ tenant: null, publicBaseUrl: process.env.APP_URL || `${req.protocol}://${req.get("host")}` });
  const branding = tenant.branding || {};
  return res.json({
    tenant: {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      branding: {
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        fontFamily: branding.fontFamily,
        logoUrl: branding.logoUrl,
        whiteLabelEnabled: branding.whiteLabelEnabled,
        portalHelpTitle: branding.portalHelpTitle,
        portalContactText: branding.portalContactText,
      },
      publicBaseUrl: tenant.publicBaseUrl,
    },
  });
}
