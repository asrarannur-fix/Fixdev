export interface BrandingPreset {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
}

export const BRANDING_PRESETS: Record<string, BrandingPreset> = {
  blue: {
    name: "Modern Blue",
    primaryColor: "#3b82f6",
    secondaryColor: "#1e40af",
    fontFamily: "inter",
  },
  emerald: {
    name: "Nature Emerald",
    primaryColor: "#10b981",
    secondaryColor: "#065f46",
    fontFamily: "sans-serif",
  },
  violet: {
    name: "Cyber Violet",
    primaryColor: "#8b5cf6",
    secondaryColor: "#5b21b6",
    fontFamily: "poppins",
  },
  slate: {
    name: "Professional Slate",
    primaryColor: "#475569",
    secondaryColor: "#1e293b",
    fontFamily: "monospace",
  },
};
