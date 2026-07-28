import { WidgetConfig } from "./widgetTypes";
import { KPIRevenueWidget } from "./widgets/KPIRevenueWidget";
import { KPIOperationsWidget } from "./widgets/KPIOperationsWidget";
import { KPIBillingWidget } from "./widgets/KPIBillingWidget";
import { StockAlertsWidget } from "./widgets/StockAlertsWidget";
import { CashFlowWidget } from "./widgets/CashFlowWidget";
import { AnalyticsWidget } from "./widgets/AnalyticsWidget";
import { OperationsOverviewWidget } from "./widgets/OperationsOverviewWidget";

export const WIDGET_REGISTRY: WidgetConfig[] = [
  {
    id: "kpi-revenue",
    label: "Revenue & Profit",
    icon: "Banknote",
    defaultVisible: true,
    defaultOrder: 1,
    component: KPIRevenueWidget,
  },
  {
    id: "kpi-operations",
    label: "Operasional",
    icon: "BarChart3",
    defaultVisible: true,
    defaultOrder: 2,
    component: KPIOperationsWidget,
  },
  {
    id: "kpi-billing",
    label: "Billing & Langganan",
    icon: "Banknote",
    defaultVisible: true,
    defaultOrder: 3,
    component: KPIBillingWidget,
  },
  {
    id: "stock-alerts",
    label: "Stok & Produk",
    icon: "Package",
    defaultVisible: true,
    defaultOrder: 4,
    component: StockAlertsWidget,
  },
  {
    id: "cash-flow",
    label: "Arus Kas",
    icon: "Banknote",
    defaultVisible: true,
    defaultOrder: 5,
    component: CashFlowWidget,
  },
  {
    id: "ops-overview",
    label: "Operasional Hari Ini",
    icon: "Clock",
    defaultVisible: true,
    defaultOrder: 6,
    component: OperationsOverviewWidget,
  },
  {
    id: "analytics",
    label: "Analitik Transaksi",
    icon: "Activity",
    defaultVisible: true,
    defaultOrder: 7,
    component: AnalyticsWidget,
  },
];
