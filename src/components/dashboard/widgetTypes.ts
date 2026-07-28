import React from "react";

/* ── Widget Types ────────────────────────────────────── */

export interface DashboardMetrics {
  posRevenue: number;
  serviceRevenue: number;
  totalRevenue: number;
  grossProfit: number;
  profitMargin: string | number;
  completedServices: number;
  activeTickets: number;
  totalTickets: number;
  avgTicketValue: number;
  deadStock: number;
  totalProducts: number;
  totalCustomers: number;
  totalCashIn: number;
  totalCashOut: number;
  cashFlow: number;
  totalPayroll: number;
  lowStockCount: number;
  lowStockItems: any[];
  totalBillingPaid: number;
  totalBillingUnpaid: number;
  transactions: any[];
  services: any[];
  shifts?: any[];
  fieldVisits?: any[];
  totalLoyaltyPoints?: number;
  dateLabel: string;
  revenueDelta: string | null;
  serviceDelta: string | null;
}

export interface WidgetConfig {
  id: string;
  label: string;
  icon: string;
  defaultVisible: boolean;
  defaultOrder: number;
  component: React.FC<WidgetProps>;
}

export interface DashboardMetrics {
  posRevenue: number;
  serviceRevenue: number;
  totalRevenue: number;
  grossProfit: number;
  profitMargin: string;
  completedServices: number;
  activeTickets: number;
  totalTickets: number;
  avgTicketValue: number;
  deadStock: number;
  totalProducts: number;
  totalCustomers: number;
  totalCashIn: number;
  totalCashOut: number;
  cashFlow: number;
  totalPayroll: number;
  lowStockCount: number;
  lowStockItems: any[];
  totalBillingPaid: number;
  totalBillingUnpaid: number;
  activeSubscription: boolean;
  subscriptionTier: string;
  transactions: any[];
  services: any[];
  dateLabel: string;
  revenueDelta: string | null;
  serviceDelta: string | null;
  totalLoyaltyPoints: number;
  activeShifts: number;
  todayShifts: number;
  fieldVisitsToday: number;
  stockMovementsToday: number;
}

export interface WidgetProps {
  data: DashboardMetrics;
  accentColor: string;
  onSetTab?: (tab: string, subTab?: string) => void;
}

export interface WidgetLayout {
  order: string[];
  visible: Record<string, boolean>;
}

/* ── Default Layout ──────────────────────────────────── */

export const DEFAULT_LAYOUT: WidgetLayout = {
  order: [
    "kpi-revenue",
    "kpi-operations",
    "kpi-billing",
    "stock-alerts",
    "ops-overview",
    "cash-flow",
    "ops-overview",
    "analytics",
  ],
  visible: {
    "kpi-revenue": true,
    "kpi-operations": true,
    "kpi-billing": true,
    "stock-alerts": true,
    "ops-overview": true,
    "cash-flow": true,
    "ops-overview": true,
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
