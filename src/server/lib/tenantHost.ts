import { dbQuery } from "../../lib/db.js";

export interface HostTenant {
  id: string;
  name: string;
  subdomain: string;
  publicBaseUrl: string;
  branding?: any;
}

export function normalizeHostname(host: string): string | null {
  let value = String(host || "").trim().toLowerCase();
  if (/^\[[0-9a-f:]+\](?::\d+)?$/i.test(value)) value = value.slice(1, value.indexOf("]"));
  else value = value.replace(/:\d+$/, "");
  if (value.endsWith(".")) value = value.slice(0, -1);
  if (!value || value.length > 253 || (!value.includes(":") && !value.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)))) return null;
  return value;
}

export function extractTenantHost(hostname: string, rootDomain: string): string | null {
  const host = normalizeHostname(hostname);
  const root = normalizeHostname(rootDomain);
  if (!host || !root || host === root || !host.endsWith(`.${root}`)) return null;
  const subdomain = host.slice(0, -(root.length + 1));
  return subdomain && !subdomain.includes(".") ? subdomain : null;
}

export function buildPublicBaseUrl(subdomain: string, rootDomain: string, customDomain?: string): string {
  const custom = customDomain ? normalizeHostname(customDomain) : null;
  return `https://${custom || `${subdomain}.${normalizeHostname(rootDomain) || rootDomain}`}`;
}

export async function getHostTenantId(hostname: string, rootDomain: string): Promise<HostTenant | null> {
  const host = normalizeHostname(hostname);
  const subdomain = extractTenantHost(hostname, rootDomain);
  if (!host) return null;
  const result = await dbQuery(
    `SELECT id,name,subdomain,branding,custom_domain,custom_domain_verified_at FROM tenants
     WHERE ($1::text IS NOT NULL AND lower(subdomain)=lower($1))
        OR (custom_domain_verified_at IS NOT NULL AND lower(custom_domain)=lower($2))
     LIMIT 1`,
    [subdomain, host],
  );
  const tenant = result.rows[0];
  if (!tenant) return null;
  return {
    id: tenant.id,
    name: tenant.name,
    subdomain: tenant.subdomain,
    publicBaseUrl: buildPublicBaseUrl(tenant.subdomain, rootDomain, tenant.custom_domain_verified_at ? tenant.custom_domain : undefined),
    branding: tenant.branding || {},
  };
}
