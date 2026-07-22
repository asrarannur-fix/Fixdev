import React, { useMemo, useState, useEffect } from "react";
import { useSaaS } from "../../context/SaaSContext";
import { Settings,  Calendar, ChevronDown, Printer, Search } from "lucide-react";
import { ServiceStatus } from "../../types";
import { WidgetLayout, loadWidgetLayout } from "../dashboard/widgetTypes";
import { WIDGET_REGISTRY } from "../dashboard/widgetRegistry";
import { WidgetSettingsPanel } from "../dashboard/WidgetSettingsPanel";
import { printJobAsync } from "../../utils/printJob";
import { usePrintConfig } from "../../hooks/usePrintConfig";

type DateRange = "today" | "week" | "month" | "custom";

const DATE_LABELS: Record<DateRange, string> = { today: "Hari Ini", week: "Minggu Ini", month: "Bulan Ini", custom: "Custom" };
const DATE_TAILWINDS: Record<DateRange, string> = {
  today: "bg-accent dark:bg-indigo-500 text-white",
  week: "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700",
  month: "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700",
  custom: "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700",
};

function getDateRange(range: DateRange, customFrom?: string, customTo?: string): { from: Date; to: Date } {
  const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "today") return { from: start, to: now };
  if (range === "week") { const d = start.getDay(); const m = new Date(start); m.setDate(m.getDate() - (d === 0 ? 6 : d - 1)); return { from: m, to: now }; }
  if (range === "month") return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  return { from: customFrom ? new Date(customFrom) : start, to: customTo ? new Date(customTo + "T23:59:59") : now };
}
function inRange(d: string | number | null | undefined, from: Date, to: Date): boolean { if (!d) return false; const v = new Date(d); return v >= from && v <= to; }

const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800 rounded-xl ${className}`} />
);

export const OwnerReports: React.FC<{ activeSubTab?: string; onSetTab?: (tab: string, subTab?: string) => void }> = ({ activeSubTab, onSetTab }) => {
  const { scopedServices: services, scopedTransactions: transactions, scopedProducts: products, scopedCustomers: customers,
    scopedEmployees: employees, scopedCashTransactions: cashTransactions, currentBranchId, currentTenantId, warehouses, tenants } = useSaaS();

  const activeTenant = tenants.find((t: any) => t.id === currentTenantId);
  const printConfig = usePrintConfig();
  const accentColor = (activeTenant as any)?.branding?.primaryColor || "#4f46e5";
  const [layout, setLayout] = useState<WidgetLayout>(() => loadWidgetLayout());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { const t = setTimeout(() => setIsLoading(false), 800); return () => clearTimeout(t); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(p => !p); } if (e.key === "Escape") setSearchOpen(false); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);

  const { from: Df, to: Dt } = useMemo(() => getDateRange(dateRange, customFrom, customTo), [dateRange, customFrom, customTo]);
  const fTx = useMemo(() => (transactions || []).filter((t: any) => inRange(t.timestamp, Df, Dt)), [transactions, Df, Dt]);
  const fSv = useMemo(() => (services || []).filter((s: any) => inRange(s.createdAt, Df, Dt)), [services, Df, Dt]);
  const fCa = useMemo(() => (cashTransactions || []).filter((c: any) => inRange((c as any).createdAt || (c as any).timestamp, Df, Dt)), [cashTransactions, Df, Dt]);

  const diff = Dt.getTime() - Df.getTime();
  const PP = useMemo(() => ({ from: new Date(Df.getTime() - diff), to: new Date(Df.getTime() - 1) }), [Df, Dt]);

  const metrics = useMemo(() => {
    const [tx, sv, pr, cu, em, ca] = [fTx, fSv, products||[], customers||[], employees||[], fCa];
    const [pTx, pSv] = [(transactions||[]).filter((t: any) => inRange(t.timestamp, PP.from, PP.to)), (services||[]).filter((s: any) => inRange(s.createdAt, PP.from, PP.to))];
    const posRev = tx.reduce((s: number, t: any) => s + (Number(t.grandTotal) || 0), 0);
    const pRev = pTx.reduce((s: number, t: any) => s + (Number(t.grandTotal) || 0), 0);
    const servRev = sv.filter((s: any) => s.status === ServiceStatus.SELESAI || s.status === ServiceStatus.DIAMBIL).reduce((s: number, t: any) => s + (Number(t.estimatedCost) || 0), 0);
    const pSer = pSv.filter((s: any) => s.status === ServiceStatus.SELESAI || s.status === ServiceStatus.DIAMBIL).reduce((s: number, t: any) => s + (Number(t.estimatedCost) || 0), 0);
    const completed = sv.filter((s: any) => s.status === ServiceStatus.SELESAI || s.status === ServiceStatus.DIAMBIL).length;
    const active = sv.filter((s: any) => s.status !== ServiceStatus.SELESAI && s.status !== ServiceStatus.DIAMBIL && s.status !== ServiceStatus.DIBATALKAN).length;
    const dead = pr.filter((p: any) => (p.stockQty || 0) === 0).length;
    const cIn = ca.filter((c: any) => c.type === "CASH_IN").reduce((s: number, c: any) => s + (Number(c.amount) || 0), 0);
    const cOut = ca.filter((c: any) => c.type === "CASH_OUT").reduce((s: number, c: any) => s + (Number(c.amount) || 0), 0);
    const payroll = em.reduce((s: number, e: any) => s + (Number(e.salary) || 0), 0);
    const billHist = (activeTenant as any)?.billingHistory || [];
    const bPaid = billHist.filter((i: any) => i.status === "PAID").reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
    const bUnpaid = billHist.filter((i: any) => i.status === "UNPAID" || i.status === "OVERDUE").reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
    const whs = warehouses.filter((w: any) => w.tenantId === currentTenantId);
    const gBS = (p: any) => { if (!currentBranchId || !p.warehouseStock) return p.stockQty ?? 0; const ids = whs.filter((w: any) => w.branchId === currentBranchId).map((w: any) => w.id); if (!ids.length) return p.stockQty ?? 0; return ids.reduce((s: number, i: string) => s + (Number(p.warehouseStock[i]) || 0), 0); };
    const lSt = pr.filter((p: any) => p.category !== "JASA" && gBS(p) <= (p.minStock ?? 5));
    return {
      posRevenue: posRev, serviceRevenue: servRev, totalRevenue: posRev + servRev,
      grossProfit: posRev + servRev - posRev * 0.65, profitMargin: posRev + servRev > 0 ? (((posRev + servRev - posRev * 0.65) / (posRev + servRev)) * 100).toFixed(1) : "0",
      completedServices: completed, activeTickets: active, totalTickets: sv.length, avgTicketValue: tx.length > 0 ? posRev / tx.length : 0,
      deadStock: dead, totalProducts: pr.length, totalCustomers: cu.length, totalCashIn: cIn, totalCashOut: cOut, cashFlow: cIn - cOut,
      totalPayroll: payroll, lowStockCount: lSt.length, lowStockItems: lSt, totalBillingPaid: bPaid, totalBillingUnpaid: bUnpaid,
      activeSubscription: activeTenant?.status === "ACTIVE", subscriptionTier: activeTenant?.tier || "BASIC",
      transactions: tx, services: sv, dateLabel: DATE_LABELS[dateRange],
      revenueDelta: pRev > 0 ? ((posRev - pRev) / pRev * 100).toFixed(1) : null,
      serviceDelta: pSer > 0 ? ((servRev - pSer) / pSer * 100).toFixed(1) : null,
    };
  }, [fTx, fSv, fCa, products, customers, employees, warehouses, currentTenantId, currentBranchId, activeTenant, PP, dateRange]);

  const visibleWidgets = layout.order.filter((id: string) => layout.visible[id] !== false);
  const widgetMap = new Map(WIDGET_REGISTRY.map((w) => [w.id, w]));
  const searchResults = WIDGET_REGISTRY.filter((w) => !searchQuery.trim() || w.label.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-3 bg-gradient-to-br from-slate-50 via-pink-50/30 to-violet-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 min-h-screen p-3 sm:p-4 rounded-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-400 to-violet-500 dark:from-pink-600 dark:to-violet-600 flex items-center justify-center shadow-lg shadow-pink-200 dark:shadow-pink-900/30">
            <Printer className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 dark:text-zinc-100">Dashboard {activeTenant?.name || "Owner"}</h1>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium">Ringkasan performa toko</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {metrics.activeTickets > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 dark:bg-pink-950/30 text-pink-700 dark:text-pink-400 px-2.5 py-1 text-[10px] font-black">
              <span className="w-2 h-2 rounded-full bg-pink-500" /> {metrics.activeTickets} tiket aktif
            </span>
          )}
          <button onClick={() => void printJobAsync({ title: "Laporan Owner", html: document.getElementById("owner-reports")?.innerHTML || document.body.innerHTML, printConfig })} className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:shadow-md transition-all" title="Cetak"><Printer className="w-4 h-4 text-slate-500" /></button>
          <button onClick={() => setSearchOpen(true)} className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:shadow-md transition-all" title="Cari (Cmd+K)"><Search className="w-4 h-4 text-slate-500" /></button>
          <button onClick={() => setSettingsOpen(true)} className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:shadow-md transition-all" title="Atur Widget"><Settings className="w-4 h-4 text-slate-500" /></button>
        </div>
      </div>

      {/* Date Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Calendar className="w-4 h-4 text-slate-400" />
        {(Object.keys(DATE_LABELS) as DateRange[]).map(r => (
          <button key={r} onClick={() => setDateRange(r)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
              dateRange === r ? DATE_TAILWINDS[r] : DATE_TAILWINDS[r]
            }`}
          >{DATE_LABELS[r]}</button>
        ))}
        {dateRange === "custom" && <div className="flex items-center gap-1.5">
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-[11px] text-slate-700 dark:text-zinc-200" />
          <span className="text-[10px] text-slate-400">s/d</span>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-[11px] text-slate-700 dark:text-zinc-200" />
        </div>}
        <span className="text-[10px] text-slate-400 dark:text-zinc-500 ml-1">📊 {metrics.dateLabel}</span>
      </div>

      {/* Widget Search Panel */}
      {searchOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setSearchOpen(false)} />
          <div className="fixed top-20 left-1/2 -translate-x-1/2 w-96 bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl z-50 border border-slate-200 dark:border-zinc-800 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-zinc-800">
              <Search className="w-4 h-4 text-slate-400" />
              <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari widget..." className="flex-1 text-sm text-slate-700 dark:text-zinc-200 outline-none bg-transparent" />
              <kbd className="text-[9px] font-mono text-slate-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">ESC</kbd>
            </div>
            <div className="max-h-60 overflow-y-auto p-2">
              {searchResults.length > 0 ? searchResults.map(w => (
                <button key={w.id} onClick={() => { document.getElementById(`widget-${w.id}`)?.scrollIntoView({ behavior: "smooth" }); setSearchOpen(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-pink-50 dark:hover:bg-pink-950/20 transition-colors">
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-200">{w.label}</span>
                </button>
              )) : <p className="text-xs text-slate-400 text-center py-4">Tidak ditemukan</p>}
            </div>
          </div>
        </>
      )}

      {/* Widget Grid */}
      {isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : (
        visibleWidgets.map((id: string, idx: number) => {
          const widget = widgetMap.get(id);
          if (!widget) return null;
          const WidgetComponent = widget.component;
          return (
            <div key={id} id={`widget-${id}`} className="animate-fadeIn" style={{ animationDelay: `${idx * 50}ms` }}>
              <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <WidgetComponent data={metrics} accentColor={accentColor} onSetTab={onSetTab} />
              </div>
            </div>
          );
        })
      )}

      <WidgetSettingsPanel widgets={WIDGET_REGISTRY} layout={layout} onLayoutChange={setLayout} isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};
