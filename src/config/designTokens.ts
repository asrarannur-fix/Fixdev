/**
 * Design Tokens - FixDev ERP Design System
 * 
 * Standarisasi warna, spacing, typography, dan komponen.
 * Semua komponen HARUS pakai token ini, jangan hardcode Tailwind classes.
 */

/* ── Color Palette ──────────────────────────────────── */

export const COLORS = {
  // Brand
  brand: {
    primary: "indigo",
    hover: "indigo-600",
    light: "indigo-50",
    dark: "indigo-950",
  },

  // Status
  status: {
    success: { bg: "emerald-50", text: "emerald-600", border: "emerald-200" },
    warning: { bg: "amber-50", text: "amber-600", border: "amber-200" },
    danger: { bg: "rose-50", text: "rose-600", border: "rose-200" },
    info: { bg: "sky-50", text: "sky-600", border: "sky-200" },
  },

  // Module colors (for sidebar, icons, badges)
  modules: {
    services: { icon: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200" },
    pos: { icon: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200" },
    inventory: { icon: "text-amber-500", bg: "bg-amber-50", border: "border-amber-200" },
    accounting: { icon: "text-rose-500", bg: "bg-rose-50", border: "border-rose-200" },
    hr: { icon: "text-sky-500", bg: "bg-sky-50", border: "border-sky-200" },
    crm: { icon: "text-purple-500", bg: "bg-purple-50", border: "border-purple-200" },
    fraud: { icon: "text-indigo-500", bg: "bg-indigo-50", border: "border-indigo-200" },
  },
} as const;

/* ── Spacing Tokens ─────────────────────────────────── */

export const SPACING = {
  // Component padding
  card: "p-4",          // Card internal padding
  section: "p-5",       // Section padding
  modal: "p-6",         // Modal padding
  compact: "p-3",       // Compact padding (mobile)

  // Gaps
  gap: {
    xs: "gap-1",
    sm: "gap-2",
    md: "gap-3",
    lg: "gap-4",
    xl: "gap-6",
  },

  // Grid gaps
  gridGap: {
    tight: "gap-2",
    normal: "gap-3",
    relaxed: "gap-4",
    loose: "gap-6",
  },
} as const;

/* ── Border Radius Tokens ───────────────────────────── */

export const RADIUS = {
  // Standard rounded values (use ONLY these)
  button: "rounded-xl",      // 12px - buttons, inputs
  card: "rounded-2xl",       // 16px - cards, panels
  badge: "rounded-full",     // 9999px - badges, pills
  modal: "rounded-3xl",      // 24px - modals, dialogs
  icon: "rounded-lg",        // 8px - icon containers
  avatar: "rounded-full",    // 9999px - avatars
} as const;

/* ── Typography Tokens ──────────────────────────────── */

export const TYPOGRAPHY = {
  // Headings
  h1: "text-xl font-black tracking-tight",
  h2: "text-sm font-extrabold uppercase tracking-wider",
  h3: "text-xs font-black tracking-wide",
  h4: "text-xs font-bold",

  // Body
  body: "text-xs",
  bodySmall: "text-[11px]",
  bodyTiny: "text-[10px]",
  bodyMicro: "text-[9px]",

  // Labels
  label: "text-[10px] font-bold uppercase tracking-wider",
  labelText: "text-[10px] font-bold text-slate-500",
  labelTextDark: "text-[10px] font-bold text-slate-400 dark:text-zinc-500",

  // Values
  value: "text-lg font-black",
  valueSmall: "text-sm font-bold",

  // Mono
  mono: "font-mono text-[10px]",
} as const;

/* ── Shadow Tokens ──────────────────────────────────── */

export const SHADOW = {
  none: "",
  xs: "shadow-xs",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  card: "shadow-sm",
  cardHover: "shadow-md",
  modal: "shadow-2xl",
} as const;

/* ── Transition Tokens ──────────────────────────────── */

export const TRANSITION = {
  fast: "transition-all duration-150",
  normal: "transition-all duration-200",
  slow: "transition-all duration-300",
  color: "transition-colors duration-200",
  shadow: "transition-shadow duration-200",
} as const;

/* ── Component Tokens ───────────────────────────────── */

export const COMPONENTS = {
  // Card styles
  card: {
    base: "bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm",
    hover: "hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700",
    padding: "p-4",
    paddingLg: "p-5",
    paddingCompact: "p-3",
  },

  // Button styles
  button: {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold",
    secondary: "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800",
    danger: "bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100",
    ghost: "text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-xs font-bold",
    icon: "p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors",
  },

  // Input styles
  input: {
    base: "w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-bold text-slate-700 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500",
    select: "w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-bold text-slate-700 dark:text-zinc-200",
  },

  // Badge styles
  badge: {
    success: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/30 rounded-full px-2 py-0.5 text-[10px] font-black",
    warning: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30 rounded-full px-2 py-0.5 text-[10px] font-black",
    danger: "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/30 rounded-full px-2 py-0.5 text-[10px] font-black",
    info: "bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/30 rounded-full px-2 py-0.5 text-[10px] font-black",
    neutral: "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 rounded-full px-2 py-0.5 text-[10px] font-black",
  },

  // Status dot
  statusDot: {
    success: "h-2.5 w-2.5 rounded-full bg-emerald-500",
    warning: "h-2.5 w-2.5 rounded-full bg-amber-500",
    danger: "h-2.5 w-2.5 rounded-full bg-rose-500",
    info: "h-2.5 w-2.5 rounded-full bg-sky-500",
    neutral: "h-2.5 w-2.5 rounded-full bg-slate-400",
  },
} as const;

/* ── Responsive Breakpoints (for reference) ─────────── */

export const BREAKPOINTS = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
} as const;
