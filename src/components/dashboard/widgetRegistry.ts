import { WidgetConfig } from "./widgetTypes";
import { KPIRevenueWidget } from "./widgets/KPIRevenueWidget";
import { OperationsOverviewWidget } from "./widgets/OperationsOverviewWidget";
import { CashFlowWidget } from "./widgets/CashFlowWidget";
import { AnalyticsWidget } from "./widgets/AnalyticsWidget";

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
    id: "cash-flow",
    label: "Arus Kas",
    icon: "Banknote",
    defaultVisible: true,
    defaultOrder: 2,
    component: CashFlowWidget,
  },
  {
    id: "ops-overview",
    label: "Operasional Harian",
    icon: "ClipboardList",
    defaultVisible: true,
    defaultOrder: 3,
    component: OperationsOverviewWidget,
  },
  {
    id: "analytics",
    label: "Analitik Transaksi",
    icon: "Activity",
    defaultVisible: true,
    defaultOrder: 4,
    component: AnalyticsWidget,
  },
];
