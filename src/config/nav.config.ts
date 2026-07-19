import {
  LayoutDashboard,
  Wrench,
  ShoppingBag,
  Package,
  BookOpen,
  UserCheck,
  Megaphone,
  ShieldCheck,
  Smartphone,
  Globe,
  MessageSquare,
  Bell,
  GitBranch,
  Key,
  Sliders,
  Printer,
  Code,
  CreditCard,
  PlusCircle,
  Truck,
  History,
  ArrowRightLeft,
  MapPin,
  Sparkles,
  Search,
  Layers,
  FileSpreadsheet,
  TrendingUp,
  DollarSign,
  Users,
  AlertTriangle,
  CheckSquare,
  Send,
  Gift,
  ClipboardCheck,
  QrCode,
  Database,
} from "lucide-react";

export interface NavSubTab {
  id: string;
  label: string;
  icon: any;
}

export interface NavModule {
  id: string;
  label: string;
  desc?: string;
  icon: any;
  iconColor: string;
  activeBg?: string;
  color?: string;
  activeColor?: string;
  subtabs: NavSubTab[];
}

// Operational modules (appear in sidebar & horizontal navbar)
export const OPERATIONAL_MODULES: NavModule[] = [
  {
    id: "overview",
    label: "Dashboard",
    desc: "Live KPI & Status",
    icon: LayoutDashboard,
    iconColor: "text-blue-500",
    activeBg: "bg-blue-50 text-blue-600 border-blue-100",
    subtabs: [],
  },
  {
    id: "services",
    label: "Servis",
    desc: "Penerimaan & Perbaikan",
    icon: Wrench,
    iconColor: "text-blue-500 dark:text-blue-400",
    activeBg: "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30",
    subtabs: [
      { id: "new-ticket", label: "Penerimaan", icon: PlusCircle },
      { id: "list", label: "Daftar Servis", icon: Wrench },
      { id: "qc-scoring", label: "QC", icon: CheckSquare },
      { id: "warranty-claims", label: "Garansi", icon: ShieldCheck },
      { id: "field-service", label: "Field Service", icon: Truck },
      { id: "rental", label: "Penyewaan", icon: Smartphone },
      { id: "qr-tracker", label: "QR Tracker", icon: QrCode },
      { id: "knowledge-base", label: "Panduan", icon: BookOpen },
      { id: "cost-calculator", label: "Penawaran", icon: Sliders },
    ],
  },
  {
    id: "pos",
    label: "POS",
    desc: "Terminal & Shift",
    icon: ShoppingBag,
    iconColor: "text-emerald-500",
    activeBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
    subtabs: [
      { id: "cashier", label: "Kasir", icon: ShoppingBag },
      { id: "shifts", label: "Shift", icon: CheckSquare },
      { id: "history", label: "Riwayat", icon: History },
      { id: "marketplace-hub", label: "Marketplace", icon: Globe },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    desc: "Stok & Gudang",
    icon: Package,
    iconColor: "text-amber-500",
    activeBg: "bg-amber-50 text-amber-700 border-amber-100",
    subtabs: [
      { id: "stock", label: "Stok", icon: Package },
      { id: "stock-transfer", label: "Transfer", icon: ArrowRightLeft },
      { id: "storage-locations", label: "Lokasi", icon: MapPin },
      { id: "trade-in", label: "Tukar Tambah", icon: ArrowRightLeft },
      { id: "cannibal", label: "Kanibal", icon: Sparkles },
      { id: "small-parts", label: "Komponen", icon: Search },
      { id: "asset-manager", label: "Aset Tetap", icon: Layers },
      { id: "consignment", label: "Konsinyasi", icon: Truck },
      { id: "purchase-order", label: "PO", icon: FileSpreadsheet },
    ],
  },
  {
    id: "accounting",
    label: "Keuangan",
    desc: "Buku Besar & Laporan",
    icon: BookOpen,
    iconColor: "text-rose-500",
    activeBg: "bg-rose-50 text-rose-600 border-rose-100",
    subtabs: [
      { id: "coa", label: "COA", icon: BookOpen },
      { id: "ledger", label: "Ledger", icon: FileSpreadsheet },
      { id: "statements", label: "Laporan", icon: TrendingUp },
    ],
  },
  {
    id: "hr",
    label: "HR",
    desc: "Staff & Payroll",
    icon: UserCheck,
    iconColor: "text-sky-500",
    activeBg: "bg-sky-50 text-sky-600 border-sky-100",
    subtabs: [
      { id: "attendance", label: "Presensi", icon: UserCheck },
      { id: "payroll", label: "Payroll", icon: CreditCard },
      { id: "commission", label: "Komisi", icon: DollarSign },
      { id: "kasbon", label: "Kasbon", icon: CreditCard },
    ],
  },
  {
    id: "crm",
    label: "CRM",
    desc: "Pelanggan & Promo",
    icon: Megaphone,
    iconColor: "text-purple-500",
    activeBg: "bg-purple-50 text-purple-600 border-purple-100",
    subtabs: [
      { id: "pipeline", label: "Pipeline", icon: Sliders },
      { id: "customers", label: "Pelanggan", icon: Users },
      { id: "marketing", label: "Broadcast", icon: Megaphone },
    ],
  },
  {
    id: "fraud",
    label: "Keamanan",
    desc: "Audit & Proteksi",
    icon: ShieldCheck,
    iconColor: "text-indigo-500",
    activeBg: "bg-indigo-50 text-indigo-600 border-indigo-100",
    subtabs: [
      { id: "audit-log", label: "Audit", icon: ShieldCheck },
      { id: "fraud-alert", label: "Proteksi", icon: AlertTriangle },
    ],
  },
];

// Settings modules (only in profile dropdown)
export const SETTINGS_MODULES: { id: string; label: string; icon: any; iconColor: string }[] = [
  { id: "branding", label: "White-Label Branding", icon: Smartphone, iconColor: "text-violet-600" },
  { id: "branches", label: "Multi-Cabang & Lokasi Usaha", icon: Globe, iconColor: "text-sky-600" },
  { id: "whatsapp", label: "WhatsApp Connector", icon: MessageSquare, iconColor: "text-green-600" },
  { id: "telegram", label: "Bot Telegram Alert", icon: Send, iconColor: "text-sky-600" },
  { id: "notifications", label: "Integrasi & Notifikasi", icon: Bell, iconColor: "text-blue-600" },
  { id: "workflows", label: "Workflow Builder (Automasi)", icon: GitBranch, iconColor: "text-purple-600" },
  { id: "rbac", label: "Hak Akses & Staff", icon: Key, iconColor: "text-orange-600" },
  { id: "modules-config", label: "Parameter & Modul", icon: Sliders, iconColor: "text-gray-600" },
  { id: "printer-terms", label: "Printer & Ketentuan Nota", icon: Printer, iconColor: "text-red-600" },
  { id: "developer-api", label: "Developer REST API & Sanctum", icon: Code, iconColor: "text-cyan-600" },
  { id: "subscription", label: "SaaS Subscription Billing", icon: CreditCard, iconColor: "text-emerald-600" },
  { id: "import-export", label: "Impor / Ekspor Data Massal", icon: FileSpreadsheet, iconColor: "text-cyan-600" },
  { id: "loyalty", label: "Voucher & Poin Loyalitas", icon: Gift, iconColor: "text-rose-600" },
  { id: "maintenance-contract", label: "Kontrak Maintenance Berkala", icon: ClipboardCheck, iconColor: "text-orange-600" },
  { id: "storage", label: "Cloud Storage", icon: Database, iconColor: "text-indigo-600" },
  { id: "operational-config", label: "Operasional ERP", icon: Wrench, iconColor: "text-amber-600" },
  { id: "app-config", label: "Aplikasi & Tampilan", icon: Sliders, iconColor: "text-violet-600" },
  { id: "security", label: "Keamanan & Login", icon: ShieldCheck, iconColor: "text-red-600" },
  { id: "backup", label: "Backup & Audit", icon: Database, iconColor: "text-slate-600" },
];

export function getModuleById(id: string): NavModule | undefined {
  return OPERATIONAL_MODULES.find((m) => m.id === id);
}

export function getAvailableModules(
  tenantFeatures: string[],
  userPermissions: string[],
): string[] {
  const moduleMap: Record<string, string[]> = {
    overview: [],
    pos: ["pos:access", "pos-cashier", "pos-shifts", "pos-history"],
    services: ["services:access", "services-list", "services-new-ticket", "services-field-service"],
    inventory: ["inventory:access", "inventory-stock", "inventory-tradein"],
    accounting: ["accounting:access", "accounting-coa", "accounting-ledger"],
    hr: ["hr:access", "hr-attendance", "hr-payroll"],
    crm: ["crm:access", "crm-customers", "crm-pipeline"],
    fraud: ["fraud:access", "settings-audit", "settings-fraud"],
  };

  return OPERATIONAL_MODULES.filter((mod) => {
    const requiredPerms = moduleMap[mod.id] || [];
    return requiredPerms.length === 0 || requiredPerms.some((p) => userPermissions.includes(p));
  }).map((mod) => mod.id);
}
