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

export const SUGGESTED_PRESETS = [
  { key: "indigo", name: "Indigo Cyber", primaryColor: "#4f46e5", accentColor: "#818cf8", secondaryColor: "#6366f1", fontFamily: "Inter, sans-serif", slogan: "Layanan sempurna, pusat kendali digital" },
  { key: "emerald", name: "Emerald Tech", primaryColor: "#059669", accentColor: "#10b981", secondaryColor: "#34d399", fontFamily: "Inter, sans-serif", slogan: "Pelayanan andal, generasi digital cerdas" },
  { key: "crimson", name: "Crimson Flame", primaryColor: "#dc2626", accentColor: "#ef4444", secondaryColor: "#f87171", fontFamily: "Inter, sans-serif", slogan: "Solusi instan untuk masalah teknis Anda" },
  { key: "sunset", name: "Sunset Gold", primaryColor: "#d97706", accentColor: "#fbbf24", secondaryColor: "#fb923c", fontFamily: "Inter, sans-serif", slogan: "Layanan cepat dengan sentuhan personal" },
  { key: "ocean", name: "Deep Ocean", primaryColor: "#0284c7", accentColor: "#38bdf8", secondaryColor: "#60a5fa", fontFamily: "Inter, sans-serif", slogan: "Layanan berkualitas tinggi tanpa batas" },
  { key: "purple", name: "Grape Purple", primaryColor: "#7c3aed", accentColor: "#a78bfa", secondaryColor: "#c084fc", fontFamily: "Inter, sans-serif", slogan: "Solusi canggih untuk bisnis modern" },
];

export const getSuggestedSlogan = (tenantName: string): string => {
  return `Welcome to ${tenantName}`;
}
