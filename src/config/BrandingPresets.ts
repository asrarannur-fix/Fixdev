export interface BrandingPreset {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  description: string;
}

export const BRANDING_PRESETS: Record<string, BrandingPreset> = {
  indigo: {
    name: "Indigo",
    primaryColor: "#4f46e5",
    secondaryColor: "#3730a3",
    fontFamily: "inter",
    description: "Default preset with a calm and professional indigo tone",
  },
  blue: {
    name: "Blue",
    primaryColor: "#3b82f6",
    secondaryColor: "#1e40af",
    fontFamily: "inter",
    description: "Modern and trustworthy blue palette",
  },
  emerald: {
    name: "Emerald",
    primaryColor: "#10b981",
    secondaryColor: "#065f46",
    fontFamily: "sans-serif",
    description: "Fresh and natural emerald green",
  },
  rose: {
    name: "Rose",
    primaryColor: "#f43f5e",
    secondaryColor: "#be123c",
    fontFamily: "inter",
    description: "Bold and vibrant rose red",
  },
  amber: {
    name: "Amber",
    primaryColor: "#f59e0b",
    secondaryColor: "#b45309",
    fontFamily: "sans-serif",
    description: "Warm and energetic amber yellow",
  },
  violet: {
    name: "Violet",
    primaryColor: "#8b5cf6",
    secondaryColor: "#5b21b6",
    fontFamily: "poppins",
    description: "Creative and modern violet",
  },
  teal: {
    name: "Teal",
    primaryColor: "#14b8a6",
    secondaryColor: "#0f766e",
    fontFamily: "sans-serif",
    description: "Balanced and soothing teal",
  },
  cyan: {
    name: "Cyan",
    primaryColor: "#06b6d4",
    secondaryColor: "#0e7490",
    fontFamily: "inter",
    description: "Crisp and refreshing cyan blue",
  },
  slate: {
    name: "Slate",
    primaryColor: "#475569",
    secondaryColor: "#1e293b",
    fontFamily: "monospace",
    description: "Neutral and professional slate gray",
  },
  orange: {
    name: "Orange",
    primaryColor: "#f97316",
    secondaryColor: "#c2410c",
    fontFamily: "sans-serif",
    description: "Friendly and dynamic orange",
  },
  pink: {
    name: "Pink",
    primaryColor: "#ec4899",
    secondaryColor: "#be185d",
    fontFamily: "inter",
    description: "Playful and eye-catching pink",
  },
  lime: {
    name: "Lime",
    primaryColor: "#84cc16",
    secondaryColor: "#4d7c0f",
    fontFamily: "sans-serif",
    description: "Lively and youthful lime green",
  },
};

export function getPresetByPrimaryColor(color: string): BrandingPreset | undefined {
  return Object.values(BRANDING_PRESETS).find(p => p.primaryColor === color);
}
