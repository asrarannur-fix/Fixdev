// Centralized design tokens for RepairHub ERP.
// These mirror the CSS custom properties declared in src/index.css so that
// JS-driven styles (charts, portals, inline styles) stay consistent with the
// Tailwind/utility layer. Edit values in ONE place (index.css :root/.dark).

export const tokens = {
  color: {
    bg: "var(--bg)",
    surface: "var(--surface)",
    card: "var(--card)",
    ink: "var(--ink)",
    inkMuted: "var(--ink-muted)",
    border: "var(--border)",
    modalBg: "var(--bg-modal)",
    dropdownBg: "var(--bg-dropdown)",
    modalBorder: "var(--border-modal)",
    dropdownBorder: "var(--border-dropdown)",
    contrast: {
      950: "var(--text-contrast-950)",
      900: "var(--text-contrast-900)",
      800: "var(--text-contrast-800)",
      700: "var(--text-contrast-700)",
      600: "var(--text-contrast-600)",
      500: "var(--text-contrast-500)",
      400: "var(--text-contrast-400)",
    },
    // Semantic tokens — the single source for the UI Kit component variants.
    accent: "var(--c-accent)",
    accentHover: "var(--c-accent-hover)",
    accentContrast: "var(--c-accent-contrast)",
    danger: "var(--c-danger)",
    dangerHover: "var(--c-danger-hover)",
    success: "var(--c-success)",
    successHover: "var(--c-success-hover)",
    warning: "var(--c-warning)",
    info: "var(--c-info)",
    accentSoft: "var(--c-accent-soft)",
    dangerSoft: "var(--c-danger-soft)",
    successSoft: "var(--c-success-soft)",
    warningSoft: "var(--c-warning-soft)",
    infoSoft: "var(--c-info-soft)",
  },
  font: {
    sans: "var(--font-sans)",
    mono: "var(--font-mono)",
    display: "var(--font-syne)",
  },
  radius: {
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "2rem",
  },
  shadow: {
    premium:
      "0 1px 3px 0 rgba(15,23,42,0.03), 0 4px 6px -1px rgba(15,23,42,0.01)",
    card: "0 12px 20px -3px rgba(15,23,42,0.04), 0 4px 6px -2px rgba(15,23,42,0.02)",
  },
  z: {
    topbar: 30,
    sidebar: 50,
    backdrop: 60,
    modal: 9999,
  },
  transition: "250ms cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

export type Tokens = typeof tokens;
