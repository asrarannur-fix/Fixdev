import { TenantBranding } from "../types";

interface BrandingExportFile {
  version: string;
  exportedAt: string;
  tenantName?: string;
  branding: TenantBranding;
}

export function exportBrandingAsJSON(branding: TenantBranding, tenantName: string): string {
  const payload: BrandingExportFile = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    tenantName,
    branding,
  };
  return JSON.stringify(payload, null, 2);
}

export function importBrandingFromJSON(
  jsonString: string,
): { branding: TenantBranding; tenantName?: string } | null {
  try {
    const parsed: unknown = JSON.parse(jsonString);

    if (typeof parsed !== "object" || parsed === null) return null;

    const obj = parsed as Record<string, unknown>;

    if (obj.version !== "1.0") return null;
    if (typeof obj.branding !== "object" || obj.branding === null) return null;

    const b = obj.branding as Record<string, unknown>;

    if (typeof b.primaryColor !== "string" || typeof b.accentColor !== "string") return null;
    if (typeof b.whiteLabelEnabled !== "boolean") return null;

    const branding: TenantBranding = {
      primaryColor: b.primaryColor as string,
      accentColor: b.accentColor as string,
      whiteLabelEnabled: b.whiteLabelEnabled as boolean,
      ...(typeof b.secondaryColor === "string" && { secondaryColor: b.secondaryColor }),
      ...(typeof b.logoUrl === "string" && { logoUrl: b.logoUrl }),
      ...(typeof b.slogan === "string" && { slogan: b.slogan }),
      ...(typeof b.fontFamily === "string" && { fontFamily: b.fontFamily }),
      ...(typeof b.portalHelpTitle === "string" && { portalHelpTitle: b.portalHelpTitle }),
      ...(typeof b.portalContactText === "string" && { portalContactText: b.portalContactText }),
      ...(typeof b.customDomain === "string" && { customDomain: b.customDomain }),
      ...(typeof b.logo === "string" && { logo: b.logo }),
    };

    return {
      branding,
      tenantName: typeof obj.tenantName === "string" ? obj.tenantName : undefined,
    };
  } catch {
    return null;
  }
}

export function downloadBrandingJSON(branding: TenantBranding, tenantName: string): void {
  const json = exportBrandingAsJSON(branding, tenantName);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `branding-${tenantName.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function loadBrandingFromUpload(file: File): Promise<TenantBranding | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = importBrandingFromJSON(reader.result as string);
      resolve(result?.branding ?? null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}
