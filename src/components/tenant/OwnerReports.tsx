import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { Settings, Calendar, Printer, Search } from 'lucide-react';
import { ServiceStatus } from '../../types';
import { WidgetLayout, loadWidgetLayout, saveWidgetLayout } from '../dashboard/widgetTypes';
import { WIDGET_REGISTRY } from '../dashboard/widgetRegistry';
import { WidgetSettingsPanel } from '../dashboard/WidgetSettingsPanel';
import { KPICard } from './KPICard';
import { printJobAsync } from '../../utils/printJob';
import { usePrintConfig } from '../../hooks/usePrintConfig';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type DateRange = 'today' | 'week' | 'month' | 'custom';

const DATE_LABELS: Record<DateRange, string> = {
  today: 'Hari Ini',
  week: 'Minggu Ini',
  month: 'Bulan Ini',
  custom: 'Custom',
};
const DATE_TAILWINDS: Record<DateRange, string> = {
  today: 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md shadow-violet-200 dark:shadow-violet-900/30',
  week: 'bg-white/80 dark:bg-zinc-900/80 text-slate-600 dark:text-zinc-300 border border-slate-200/60 dark:border-zinc-700/60 hover:bg-white dark:hover:bg-zinc-800',
  month:
    'bg-white/80 dark:bg-zinc-900/80 text-slate-600 dark:text-zinc-300 border border-slate-200/60 dark:border-zinc-700/60 hover:bg-white dark:hover:bg-zinc-800',
  custom:
    'bg-white/80 dark:bg-zinc-900/80 text-slate-600 dark:text-zinc-300 border border-slate-200/60 dark:border-zinc-700/60 hover:bg-white dark:hover:bg-zinc-800',
};

function getDateRange(
  range: DateRange,
  customFrom?: string,
  customTo?: string
): { from: Date; to: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === 'today') return { from: start, to: now };
  if (range === 'week') {
    const d = start.getDay();
    const m = new Date(start);
    m.setDate(m.getDate() - (d === 0 ? 6 : d - 1));
    return { from: m, to: now };
  }
  if (range === 'month') return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  const from = customFrom ? new Date(customFrom) : start;
  const to = customTo ? new Date(customTo + 'T23:59:59') : now;
  return from <= to ? { from, to } : { from: to, to: from };
}
function inRange(d: string | number | null | undefined, from: Date, to: Date): boolean {
  if (!d) return false;
  const v = new Date(d);
  return v >= from && v <= to;
}

const SortableWidget: React.FC<{
  id: string;
  widgetComponent: React.FC<any>;
  metrics: any;
  accentColor: string;
  onSetTab?: (tab: string, subTab?: string) => void;
}> = ({ id, widgetComponent: WidgetComponent, metrics, accentColor, onSetTab }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 0,
  };
  return (
    <div
      ref={setNodeRef}
      id={`widget-${id}`}
      style={{ ...style, touchAction: 'none' }}
      className="animate-fadeIn relative group cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <div className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-xl px-2.5 py-1 text-[9px] font-bold text-slate-500 dark:text-zinc-400 shadow-sm border border-slate-200/60 dark:border-zinc-700/60 flex items-center gap-1.5">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>
          Geser
        </div>
      </div>
      <div className="bg-white/60 dark:bg-zinc-950/60 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-zinc-800/50 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden pointer-events-none">
        <WidgetComponent data={metrics} accentColor={accentColor} onSetTab={onSetTab} />
      </div>
    </div>
  );
};

export const OwnerReports: React.FC<{
  activeSubTab?: string;
  onSetTab?: (tab: string, subTab?: string) => void;
}> = ({ activeSubTab: _activeSubTab, onSetTab }) => {
  const {
    scopedServices: services,
    scopedTransactions: transactions,
    scopedProducts: products,
    scopedCustomers: customers,
    scopedEmployees: employees,
    scopedPayroll: payrollRecords,
    scopedCashTransactions: cashTransactions,
    scopedShifts: shifts,
    scopedFieldVisits: fieldVisits,
    currentBranchId,
    currentTenantId,
    warehouses,
    tenants,
  } = useSaaS();

  const activeTenant = tenants.find((t: any) => t.id === currentTenantId);
  const printConfig = usePrintConfig();
  const accentColor = (activeTenant as any)?.branding?.primaryColor || '#4f46e5';
  const [layout, setLayout] = useState<WidgetLayout>(() => loadWidgetLayout());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleWidgetDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = layout.order.indexOf(active.id as string);
    const newIndex = layout.order.indexOf(over.id as string);
    const newOrder = arrayMove(layout.order, oldIndex, newIndex);
    const next = { ...layout, order: newOrder };
    setLayout(next);
    saveWidgetLayout(next);
  }, [layout]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((p) => !p);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const { from: Df, to: Dt } = useMemo(
    () => getDateRange(dateRange, customFrom, customTo),
    [dateRange, customFrom, customTo]
  );
  const fTx = useMemo(
    () => (transactions || []).filter((t: any) => inRange(t.timestamp, Df, Dt)),
    [transactions, Df, Dt]
  );
  const fSv = useMemo(
    () => (services || []).filter((s: any) => inRange(s.createdAt, Df, Dt)),
    [services, Df, Dt]
  );
  const fCa = useMemo(
    () =>
      (cashTransactions || []).filter((c: any) =>
        inRange((c as any).createdAt || (c as any).timestamp, Df, Dt)
      ),
    [cashTransactions, Df, Dt]
  );

  const diff = Dt.getTime() - Df.getTime();
  const PP = useMemo(
    () => ({ from: new Date(Df.getTime() - diff), to: new Date(Df.getTime() - 1) }),
    [Df, Dt]
  );

  const metrics = useMemo(() => {
    const [tx, sv, pr, cu, em, ca] = [
      fTx,
      fSv,
      products || [],
      customers || [],
      employees || [],
      fCa,
    ];
    const [pTx, pSv] = [
      (transactions || []).filter((t: any) => inRange(t.timestamp, PP.from, PP.to)),
      (services || []).filter((s: any) => inRange(s.createdAt, PP.from, PP.to)),
    ];
    const posRev = tx.reduce((s: number, t: any) => s + (Number(t.grandTotal) || 0), 0);
    const pRev = pTx.reduce((s: number, t: any) => s + (Number(t.grandTotal) || 0), 0);
    const servRev = sv
      .filter((s: any) => s.status === ServiceStatus.SELESAI || s.status === ServiceStatus.DIAMBIL)
      .reduce((s: number, t: any) => s + (Number(t.estimatedCost) || 0), 0);
    const pSer = pSv
      .filter((s: any) => s.status === ServiceStatus.SELESAI || s.status === ServiceStatus.DIAMBIL)
      .reduce((s: number, t: any) => s + (Number(t.estimatedCost) || 0), 0);
    const productCostMap = new Map(pr.map((p: any) => [p.id, Number(p.purchaseCost) || 0]));
    const posCOGS = tx.reduce((s: number, t: any) => {
      return s + (t.items || []).reduce((is2: number, item: any) => {
        const cost = productCostMap.get(item.productId) || 0;
        return is2 + cost * (Number(item.quantity) || 0);
      }, 0);
    }, 0);
    const completed = sv.filter(
      (s: any) => s.status === ServiceStatus.SELESAI || s.status === ServiceStatus.DIAMBIL
    ).length;
    const active = sv.filter(
      (s: any) =>
        s.status !== ServiceStatus.SELESAI &&
        s.status !== ServiceStatus.DIAMBIL &&
        s.status !== ServiceStatus.DIBATALKAN
    ).length;
    const dead = pr.filter((p: any) => (p.stockQty || 0) === 0).length;
    const cIn = ca
      .filter((c: any) => c.type === 'CASH_IN')
      .reduce((s: number, c: any) => s + (Number(c.amount) || 0), 0);
    const cOut = ca
      .filter((c: any) => c.type === 'CASH_OUT')
      .reduce((s: number, c: any) => s + (Number(c.amount) || 0), 0);
    const payroll = (payrollRecords || [])
      .filter((p: any) => p.status === 'PAID')
      .reduce((s: number, p: any) => s + (Number(p.netSalary) || 0), 0);
    const billHist = (activeTenant as any)?.billingHistory || [];
    const bPaid = billHist
      .filter((i: any) => i.status === 'PAID')
      .reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
    const bUnpaid = billHist
      .filter((i: any) => i.status === 'UNPAID' || i.status === 'OVERDUE')
      .reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
    const whs = warehouses.filter((w: any) => w.tenantId === currentTenantId);
    const gBS = (p: any) => {
      if (!currentBranchId || !p.warehouseStock) return p.stockQty ?? 0;
      const ids = whs.filter((w: any) => w.branchId === currentBranchId).map((w: any) => w.id);
      if (!ids.length) return p.stockQty ?? 0;
      return ids.reduce((s: number, i: string) => s + (Number(p.warehouseStock[i]) || 0), 0);
    };
    const lSt = pr.filter((p: any) => p.category !== 'JASA' && gBS(p) <= (p.minStock ?? 5));
    const totalLoyaltyPoints = cu.reduce((s: number, c: any) => s + (Number(c.loyaltyPoints) || 0), 0);
    const fShifts = (shifts || []).filter((s: any) => s.tenantId === currentTenantId);
    const fFieldVisits = (fieldVisits || []).filter((v: any) => v.tenantId === currentTenantId);
    return {
      posRevenue: posRev,
      serviceRevenue: servRev,
      totalRevenue: posRev + servRev,
      grossProfit: posRev + servRev - posCOGS,
      profitMargin:
        posRev + servRev > 0
          ? (((posRev + servRev - posCOGS) / (posRev + servRev)) * 100).toFixed(1)
          : '0',
      completedServices: completed,
      activeTickets: active,
      totalTickets: sv.length,
      avgTicketValue: tx.length > 0 ? posRev / tx.length : 0,
      deadStock: dead,
      totalProducts: pr.length,
      totalCustomers: cu.length,
      totalCashIn: cIn,
      totalCashOut: cOut,
      cashFlow: cIn - cOut,
      totalPayroll: payroll,
      lowStockCount: lSt.length,
      lowStockItems: lSt,
      totalBillingPaid: bPaid,
      totalBillingUnpaid: bUnpaid,
      transactions: tx,
      services: sv,
      shifts: fShifts,
      fieldVisits: fFieldVisits,
      totalLoyaltyPoints,
      dateLabel: DATE_LABELS[dateRange],
      revenueDelta: pRev > 0 ? (((posRev - pRev) / pRev) * 100).toFixed(1) : null,
      serviceDelta: pSer > 0 ? (((servRev - pSer) / pSer) * 100).toFixed(1) : null,
    };
  }, [
    fTx,
    fSv,
    fCa,
    products,
    customers,
    employees,
    payrollRecords,
    shifts,
    fieldVisits,
    warehouses,
    currentTenantId,
    currentBranchId,
    activeTenant,
    PP,
    dateRange,
  ]);

  const visibleWidgets = layout.order.filter((id: string) => layout.visible[id] !== false);
  const widgetMap = new Map(WIDGET_REGISTRY.map((w) => [w.id, w]));
  const searchResults = WIDGET_REGISTRY.filter(
    (w) => !searchQuery.trim() || w.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      id="owner-reports"
      className="space-y-4 bg-gradient-to-br from-slate-50 via-violet-50/20 to-purple-50/20 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 min-h-screen p-4 sm:p-5 rounded-3xl"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-800 dark:text-zinc-100 tracking-tight">
            Dashboard {activeTenant?.name || 'Owner'}
          </h1>
          <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
            Ringkasan performa toko
          </p>
        </div>
        <div className="flex items-center gap-2">
          {metrics.activeTickets > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 px-2.5 py-1 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" /> {metrics.activeTickets} aktif
            </span>
          )}
          <button
            onClick={() => {
              const report = document.getElementById('owner-reports');
              if (report)
                void printJobAsync({
                  title: 'Laporan Owner',
                  html: report.innerHTML,
                  printConfig,
                  tenantId: currentTenantId,
                  branchId: currentBranchId,
                  documentType: 'owner_report',
                  documentId: `${Df.toISOString()}_${Dt.toISOString()}`,
                }).then((result) => {
                  if (!result.ok) window.alert(result.error || 'Cetak gagal.');
                });
            }}
            className="p-2 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-slate-200/60 dark:border-zinc-800/60 hover:shadow-md transition-all duration-200"
            title="Cetak"
          >
            <Printer className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
          </button>
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-slate-200/60 dark:border-zinc-800/60 hover:shadow-md transition-all duration-200"
            title="Cari (Cmd+K)"
          >
            <Search className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-slate-200/60 dark:border-zinc-800/60 hover:shadow-md transition-all duration-200"
            title="Atur Widget"
          >
            <Settings className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Date Filter */}
      <div className="flex flex-wrap items-center gap-2 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/30 dark:border-zinc-800/40 shadow-sm">
        <Calendar className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
        {(Object.keys(DATE_LABELS) as DateRange[]).map((r) => (
          <button
            key={r}
            onClick={() => setDateRange(r)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-200 ${
              dateRange === r ? DATE_TAILWINDS[r] : 'bg-white/80 dark:bg-zinc-900/80 text-slate-500 dark:text-zinc-400 border border-slate-200/60 dark:border-zinc-700/60 hover:bg-white dark:hover:bg-zinc-800'
            }`}
          >
            {DATE_LABELS[r]}
          </button>
        ))}
        {dateRange === 'custom' && (
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/80 text-[11px] text-slate-700 dark:text-zinc-200 focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700 outline-none"
            />
            <span className="text-[10px] text-slate-400 dark:text-zinc-500">s/d</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/80 text-[11px] text-slate-700 dark:text-zinc-200 focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700 outline-none"
            />
          </div>
        )}
        <span className="text-[10px] text-slate-400 dark:text-zinc-500 ml-1 font-medium">
          {metrics.dateLabel}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Omzet Hari Ini"
          value={`Rp ${(metrics.posRevenue + metrics.serviceRevenue).toLocaleString()}`}
          trend={metrics.revenueDelta ? `${metrics.revenueDelta}%` : '-'}
          trendPositive={Number(metrics.revenueDelta) === 0 ? null : Number(metrics.revenueDelta) > 0}
        />
        <KPICard
          label="Transaksi"
          value={fTx.length.toString()}
          trend={metrics.revenueDelta ? `${metrics.revenueDelta}%` : '-'}
          trendPositive={Number(metrics.revenueDelta) === 0 ? null : Number(metrics.revenueDelta) > 0}
        />
        <KPICard
          label="Tiket Service"
          value={`${metrics.completedServices} selesai, ${metrics.activeTickets} aktif`}
          trend={`${metrics.totalTickets > 0 ? ((metrics.completedServices / metrics.totalTickets) * 100).toFixed(0) : '0'}%`}
          trendPositive={metrics.totalTickets > 0 && (metrics.completedServices / metrics.totalTickets) > 0.5 ? true : metrics.totalTickets > 0 ? false : null}
        />
        <KPICard
          label="Stok Menipis"
          value={metrics.lowStockCount.toString()}
          trend={metrics.lowStockCount > 0 ? 'Perlu restock' : 'OK'}
          trendPositive={metrics.lowStockCount > 0 ? false : true}
        />
      </div>

      {/* Widget Search Panel */}
      {searchOpen && (
        <>
          <div
            className="fixed inset-0 bg-violet-900/30 dark:bg-black/60 backdrop-blur-md z-40"
            onClick={() => setSearchOpen(false)}
          />
          <div className="fixed top-20 left-1/2 -translate-x-1/2 w-96 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl rounded-3xl shadow-2xl z-50 border border-white/30 dark:border-zinc-800/40 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100/80 dark:border-zinc-800/80">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari widget..."
                className="flex-1 text-sm text-slate-700 dark:text-zinc-200 outline-none bg-transparent font-medium"
              />
              <kbd className="text-[9px] font-mono text-slate-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-lg">
                ESC
              </kbd>
            </div>
            <div className="max-h-60 overflow-y-auto p-2">
              {searchResults.length > 0 ? (
                searchResults.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => {
                      document
                        .getElementById(`widget-${w.id}`)
                        ?.scrollIntoView({ behavior: 'smooth' });
                      setSearchOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 rounded-2xl hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-all duration-200"
                  >
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-200">
                      {w.label}
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">Tidak ditemukan</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Widget Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleWidgetDragEnd}>
        <SortableContext items={visibleWidgets} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {visibleWidgets.map((id: string) => {
              const widget = widgetMap.get(id);
              if (!widget) return null;
              return (
                <SortableWidget
                  key={id}
                  id={id}
                  widgetComponent={widget.component}
                  metrics={metrics}
                  accentColor={accentColor}
                  onSetTab={onSetTab}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <WidgetSettingsPanel
        widgets={WIDGET_REGISTRY}
        layout={layout}
        onLayoutChange={setLayout}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};
