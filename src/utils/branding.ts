function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  // Expand 3-char hex (#FFF → #FFFFFF)
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

export function applyTenantBranding(branding: {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  whiteLabelEnabled?: boolean;
  customDomain?: string;
  logoUrl?: string;
}, tenantName?: string) {
  const root = document.documentElement;
  const isDark = root.classList.contains("dark");
  const primary = normalizeHex(branding.primaryColor || "#4f46e5");
  const secondary = branding.secondaryColor;

  root.style.setProperty("--accent", primary);
  root.style.setProperty("--accent-hover", secondary || blendColor(primary, isDark ? "white" : "black", 15));
  root.style.setProperty("--accent-light", isDark ? blendColor(primary, "white", 18) : blendColor(primary, "white", 92));
  root.style.setProperty("--accent-lighter", isDark ? blendColor(primary, "white", 10) : blendColor(primary, "white", 96));

  if (branding.fontFamily) {
    root.style.setProperty("--font-sans", branding.fontFamily);
  }

  const faviconEl = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (faviconEl && branding.logoUrl) {
    faviconEl.href = branding.logoUrl;
  }

  if (branding.whiteLabelEnabled && branding.customDomain) {
    document.title = branding.customDomain;
  } else {
    document.title = tenantName ? `${tenantName} - ERP` : "KM ERP";
  }
}
