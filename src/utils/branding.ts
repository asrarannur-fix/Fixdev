export const PLATFORM_NAME = "FixDev ERP";
export const PLATFORM_FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%236366f1'/%3E%3Ctext x='16' y='22' text-anchor='middle' fill='white' font-family='system-ui' font-weight='900' font-size='16'%3EFD%3C/text%3E%3C/svg%3E";
const DEFAULT_PRIMARY = "#4f46e5";
const HEX_COLOR = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;
const FONT_FAMILIES: Record<string, string> = {
  inter: "Inter, system-ui, sans-serif",
  grotesk: "'Space Grotesk', system-ui, sans-serif",
  outfit: "Outfit, system-ui, sans-serif",
  serif: "Georgia, serif",
  monospace: "ui-monospace, monospace",
  "sans-serif": "system-ui, sans-serif",
};

export function getSafeBrandImageUrl(source?: string): string {
  const value = source?.trim();
  if (!value || value.length > 2048) return "";
  try {
    const url = new URL(value, window.location.origin);
    if (url.protocol !== "https:" && url.origin !== window.location.origin) return "";
    if (url.username || url.password || /\.svg(?:$|[?#])/i.test(url.pathname)) return "";
    return url.href;
  } catch {
    return "";
  }
}

function validColor(color?: string): color is string {
  return typeof color === "string" && HEX_COLOR.test(color.trim());
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const expanded = h.length === 3
    ? h.split("").map(c => c + c).join("")
    : h;
  return {
    r: parseInt(expanded.substring(0, 2), 16),
    g: parseInt(expanded.substring(2, 4), 16),
    b: parseInt(expanded.substring(4, 6), 16),
  };
}

function normalizeHex(hex: string): string {
  const h = hex.replace("#", "");
  const expanded = h.length === 3
    ? h.split("").map(c => c + c).join("")
    : h;
  return `#${expanded}`;
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function blendColor(hex: string, target: "white" | "black", pct: number) {
  const { r, g, b } = hexToRgb(hex);
  const t = target === "white" ? 255 : 0;
  return rgbToHex(
    Math.round(r + (t - r) * (pct / 100)),
    Math.round(g + (t - g) * (pct / 100)),
    Math.round(b + (t - b) * (pct / 100)),
  );
}

export function applyTenantBranding(
  branding: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    whiteLabelEnabled?: boolean;
    customDomain?: string;
    logoUrl?: string;
  },
  tenantName?: string
) {
  const root = document.documentElement;
  const isDark = root.classList.contains("dark");
  const primary = validColor(branding.primaryColor) ? normalizeHex(branding.primaryColor!) : DEFAULT_PRIMARY;
  const secondary = validColor(branding.secondaryColor) ? normalizeHex(branding.secondaryColor!) : undefined;

  root.style.setProperty("--accent", primary);
  root.style.setProperty("--accent-hover", secondary || blendColor(primary, isDark ? "white" : "black", 15));
  root.style.setProperty("--accent-light", isDark ? blendColor(primary, "white", 18) : blendColor(primary, "white", 92));
  root.style.setProperty("--accent-lighter", isDark ? blendColor(primary, "white", 10) : blendColor(primary, "white", 96));

  const fontFamily = FONT_FAMILIES[branding.fontFamily?.trim().toLowerCase() || ""];
  if (fontFamily) root.style.setProperty("--font-sans", fontFamily);
  else root.style.removeProperty("--font-sans");

  const faviconEl = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (faviconEl) faviconEl.href = getSafeBrandImageUrl(branding.logoUrl) || PLATFORM_FAVICON;

  document.title = tenantName?.trim() || PLATFORM_NAME;
}
