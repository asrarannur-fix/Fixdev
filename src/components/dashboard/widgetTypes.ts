import React from "react";

/* ── Widget Types ────────────────────────────────────── */

export interface WidgetConfig {
  id: string;
  label: string;
  icon: string; // lucide icon name
  defaultVisible: boolean;
  defaultOrder: number;
  component: React.FC<WidgetProps>;
}

export interface WidgetProps {
  /** All data passed from OwnerReports — widgets are pure renderers */
  data: any;
  /** Tenant accent color */
  accentColor: string;
  /** Callback to navigate to a module */
  onSetTab?: (tab: string, subTab?: string) => void;
}

export interface WidgetLayout {
  order: string[];
  visible: Record<string, boolean>;
}

/* ── Default Layout ──────────────────────────────────── */

export const DEFAULT_LAYOUT: WidgetLayout = {
  order: [
    "quick-actions",
    "kpi-revenue",
    "kpi-operations",
    "kpi-billing",
    "stock-alerts",
    "cash-flow",
    "analytics",
  ],
  visible: {
    "quick-actions": true,
    "kpi-revenue": true,
    "kpi-operations": true,
    "kpi-billing": true,
    "stock-alerts": true,
    "cash-flow": true,
    "analytics": true,
  },
};

/* ── localStorage persistence ────────────────────────── */

const STORAGE_KEY = "dashboard-widget-layout";

export function loadWidgetLayout(): WidgetLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_LAYOUT };
    const parsed = JSON.parse(raw);
    // Merge with defaults so new widgets appear automatically
    return {
      order: parsed.order || DEFAULT_LAYOUT.order,
      visible: { ...DEFAULT_LAYOUT.visible, ...parsed.visible },
    };
  } catch {
    return { ...DEFAULT_LAYOUT };
  }
}

export function saveWidgetLayout(layout: WidgetLayout): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // silently fail
  }
}

export function resetWidgetLayout(): WidgetLayout {
  const fresh = { ...DEFAULT_LAYOUT, visible: { ...DEFAULT_LAYOUT.visible } };
  saveWidgetLayout(fresh);
  return fresh;
}
