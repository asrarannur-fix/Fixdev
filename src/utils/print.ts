import type { TenantSettings } from "../types";

export type PrintConfig = NonNullable<TenantSettings["printConfig"]>;

export const getPrintPageSize = (pc?: PrintConfig): string => {
  const size = pc?.paperSize || "thermal_80";
  if (size === "a4") return "A4";
  if (size === "thermal_58") return "58mm auto";
  return "80mm auto";
};

export const getPrintFontSizePx = (pc?: PrintConfig): number => {
  if (pc?.printFontSize === "small") return 10;
  if (pc?.printFontSize === "large") return 13;
  return 11;
};

export const getPrintMargin = (pc?: PrintConfig): number => {
  const m = Number(pc?.printMargin);
  return Number.isFinite(m) ? m : 12;
};

export const getPaperWidthStyle = (pc?: PrintConfig): string => {
  const size = pc?.paperSize || "thermal_80";
  if (size === "a4") return "180mm";
  if (size === "thermal_58") return "54mm";
  return "76mm";
};

export const escapeHtml = (value: string = ""): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const getPrintBaseCss = (pc?: PrintConfig): string => {
  const fontSize = getPrintFontSizePx(pc);
  const margin = getPrintMargin(pc);
  const pageSize = getPrintPageSize(pc);
  return `
    @page { size: ${pageSize}; margin: ${margin}mm; }
    body { font-family: 'Courier New', Courier, monospace; color: #000; padding: 0; font-size: ${fontSize}px; line-height: 1.3; }
    @media print { body { padding: 0; } }
  `;
};

export const getPrintHeaderHtml = (
  pc: PrintConfig | undefined,
  opts: { businessName: string; subtitle?: string },
): string => {
  const title =
    (pc?.customHeaderTitle || "").trim() ||
    escapeHtml((opts.businessName || "").toUpperCase());
  const logo = pc?.printHeaderLogo
    ? `<div style="text-align:center;margin-bottom:6px;"><img src="/logo.png" alt="logo" style="height:34px;"/></div>`
    : "";
  const subtitle = opts.subtitle
    ? `<div style="font-size:9px;color:#64748b;margin-top:2px;font-family:'JetBrains Mono',monospace;">${escapeHtml(opts.subtitle)}</div>`
    : "";
  return `
    <div style="text-align:center;border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:12px;">
      ${logo}
      <div style="font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#1e293b;">${title}</div>
      ${subtitle}
    </div>
  `;
};

export const getPrintFooterHtml = (
  pc: PrintConfig | undefined,
  fallback: string,
): string => {
  const text = (pc?.customFooterText || "").trim() || fallback;
  return `
    <div style="border-top:1px dashed #cbd5e1;margin-top:12px;padding-top:8px;font-size:9px;color:#64748b;text-align:center;line-height:1.4;">
      ${escapeHtml(text).replace(/\n/g, "<br/>")}
    </div>
  `;
};

export const getPrintTermsHtml = (
  pc: PrintConfig | undefined,
  type: "sales" | "rental" | "general" = "general",
): string => {
  if (!pc?.printTermsAndConditions) return "";
  const raw =
    type === "sales"
      ? pc.termsSalesText
      : type === "rental"
        ? pc.termsRentalText
        : pc.termsAndConditionsText;
  const text = (raw || "").trim();
  if (!text) return "";
  return `
    <div style="border-top:1px dashed #cbd5e1;margin-top:12px;padding-top:8px;font-size:9px;color:#475569;text-align:left;line-height:1.4;white-space:pre-wrap;">
      ${escapeHtml(text).replace(/\n/g, "<br/>")}
    </div>
  `;
};
