import * as React from 'react';
import { ServiceModals } from './ServiceModals';
import { ServiceDetailModal } from './ServiceDetailModal';
import { ServiceStatus, UserRole } from '../../types';
import { NEXT_STEP, SERVICE_STATUS_META, SERVICE_TERMINAL_STATUSES } from '../../domain/serviceWorkflow';
import { Pagination } from './services/Pagination';
import { bulkDeleteServiceTickets, exportServiceTickets, getServiceTickets, ServiceTicketList } from '../../lib/api/services';
import {
  PlusCircle,
  FileText,
  ChevronRight,
  Trash2,
  Search,
  X,
} from 'lucide-react';

const GradientCard: React.FC<{
  children: React.ReactNode;
  gradient: string;
  className?: string;
}> = ({ children, gradient, className = '' }) => (
  <div className={`relative overflow-hidden rounded-xl border border-white/20 dark:border-zinc-800/40 shadow-md shadow-slate-200/30 dark:shadow-zinc-900/30 hover:shadow-lg transition-all duration-300 ${className}`}>
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
    <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-white/10" />
    <div className="absolute -top-6 -right-6 w-16 h-16 bg-white/10 rounded-full blur-xl" />
    <div className="relative p-3">{children}</div>
  </div>
);

export const ServiceList: React.FC<any> = (props) => {
  const {
    activeTenantId,
    additionalCostAmount,
    additionalCostApprovedBy,
    additionalCostDescription,
    additionalCostMethod,
    additionalCostNote,
    additionalCostProof,
    additionalCostTicket,
    aiLoading,
    aiResult,
    approveServiceEstimate,
    cameraActive,
    completeServiceQC,
    currentUserPermissions,
    customWaMessageText,
    filteredMicroComponents,
    handleApplyAiRecommendation,
    handlePrintReceptionReceipt,
    handoverChecklist,
    handoverPaymentMethod,
    handoverProofName,
    handoverRefNo,
    handoverServiceDevice,
    handoverTempoDays,
    internalCommentText,
    isSubTabAllowed,
    justCreatedTicket,
    liveTimerSeconds,
    manualDiagCost,
    manualDiagNotes,
    microChargeable,
    microNote,
    microQty,
    microSearch,
    microTicket,
    microUnitPrice,
    openManualEstimateWhatsApp,
    openMicroComponentModal,
    partOrderCost,
    partOrderCostApproved,
    partOrderEta,
    partOrderName,
    partOrderNote,
    partOrderQty,
    partOrderReason,
    partOrderSupplier,
    partOrderTicket,
    previewReceptionTicket,
    publicBaseUrl,
    qcNotes,
    qcView,
    renderTenantWaTemplate,
    requestPartMode,
    requestedPartId,
     requestedPartQty,
     selectedPartWarehouseId,
     setSelectedPartWarehouseId,
     warehouses,
     savingAdditionalCost,
    savingMicroUsage,
    savingPartOrder,
    selectedMicro,
    selectedMicroId,
    selectedServiceId,
    selectedServiceIds,
    selectedSparepartId,
    setActiveSubTab,
    setActiveWaModal,
    setAdditionalCostAmount,
    setAdditionalCostApprovedBy,
    setAdditionalCostDescription,
    setAdditionalCostMethod,
    setAdditionalCostNote,
    setAdditionalCostProof,
    setAdditionalCostTicket,
    setAiResult,
    setCustomWaMessageText,
    setHandoverChecklist,
    setHandoverPaymentMethod,
    setHandoverProofName,
    setHandoverRefNo,
    setHandoverTempoDays,
    setInternalCommentText,
    setJustCreatedTicket,
    setManualDiagCost,
    setManualDiagNotes,
    setMicroChargeable,
    setMicroNote,
    setMicroQty,
    setMicroSearch,
    setMicroTicket,
    setMicroUnitPrice,
    setPartOrderCost,
    setPartOrderCostApproved,
    setPartOrderEta,
    setPartOrderName,
    setPartOrderNote,
    setPartOrderQty,
    setPartOrderReason,
    setPartOrderSupplier,
    setPartOrderTicket,
    setPreviewReceptionTicket,
    setQcNotes,
    setRequestPartMode,
    setRequestedPartId,
    setRequestedPartQty,
    setSavingAdditionalCost,
    setSavingMicroUsage,
    setSavingPartOrder,
    setSelectedMicroId,
    setSelectedServiceId,
    setSelectedServiceIds,
    setSelectedSparepartId,
    setShowInvoicePrintout,
    setShowProvisionalQuote,
    setShowSpkPrintout,
    setShowWarrantyPrintout,
    setSparepartQty,
    setSparepartSN,
    setSrvSearchQuery,
    setSrvSort,
    setStatusFilter,
    setViewingServiceTicketId,
    showInvoicePrintout,
    showProvisionalQuote,
    showSpkPrintout,
    showWarrantyPrintout,
    sparepartQty,
    sparepartSN,
    srvSearchQuery,
    srvSort,
    startCamera,
    statusFilter,
    stopCamera,
    tenantObj,
    tenantServices,
    updateServiceStatus,
    videoRef,
    viewingServiceTicketId,
    currentUser,
    showConfirm,
    updateServiceTicket,
    showToast,
    customers,
    employees,
    products,
    currentTenantId,
    microComponentsLoading,
    microComponentsError,
    loadMicroComponents,
    consumeMicroComponentForService,
    addServiceDiagnostic,
    requestServicePart,
    cancelServicePart,
    patchServiceWork,
    createServicePartOrder,
     addApprovedAdditionalCost,
     apiFetch,
  } = props;

  const filterStorageKey = `fixdev_service_list_filters_${currentUser?.id || activeTenantId || 'default'}`;
  const readFilters = () => {
    const params = new URLSearchParams(window.location.search);
    const saved = !params.has('tech') && !params.has('range') && !params.has('sla')
      ? JSON.parse(localStorage.getItem(filterStorageKey) || '{}')
      : {};
    return {
      group: params.get('group') || 'ALL',
      tech: params.get('tech') || saved.tech || 'ALL',
      range: params.get('range') || saved.range || 'all',
      sla: params.get('sla') || saved.sla || 'all',
    };
  };
  const [page, setPage] = React.useState(1);
  const [servicePage, setServicePage] = React.useState<ServiceTicketList | null>(null);
  const [operationalFilter, setOperationalFilter] = React.useState(() => readFilters().group);
  const [technicianFilter, setTechnicianFilter] = React.useState(() => readFilters().tech);
  const [dateRangeFilter, setDateRangeFilter] = React.useState(() => readFilters().range);
  const [slaFilter, setSlaFilter] = React.useState(() => readFilters().sla);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const active = tenantServices.filter((s) => !SERVICE_TERMINAL_STATUSES.has(s.status));
  const baruHariIni = tenantServices.filter((s) => {
    const d = s.createdAt ? new Date(s.createdAt) : null;
    return d && d >= todayStart;
  }).length;
  const menungguDiagnosa = tenantServices.filter(
    (s) => s.status === ServiceStatus.DITERIMA || s.status === ServiceStatus.ANTRIAN
  ).length;
  const menungguApproval = tenantServices.filter(
    (s) =>
      s.status === ServiceStatus.MENUGGU_APPROVAL ||
      s.status === ServiceStatus.ESTIMATE_PENDING
  ).length;
  const dikerjakan = tenantServices.filter(
    (s) => s.status === ServiceStatus.SEDANG_DIKERJAKAN
  ).length;
  const qc = tenantServices.filter((s) => s.status === ServiceStatus.QC).length;
  const selesai = tenantServices.filter((s) => s.status === ServiceStatus.SELESAI).length;
  const siapDiambil = tenantServices.filter(
    (s) => s.status === ServiceStatus.SIAP_DIAMBIL
  ).length;
  const diambil = tenantServices.filter(
    (s) => s.status === ServiceStatus.DIAMBIL
  ).length;
  const terlambat = tenantServices.filter((s) => {
    const est = s.estimatedCompletionDate ? new Date(s.estimatedCompletionDate) : null;
    return est && est < now && !SERVICE_TERMINAL_STATUSES.has(s.status);
  }).length;
  const totalEstimasiBulanIni = Math.round(
    tenantServices
      .filter((s) => {
        const d = s.createdAt ? new Date(s.createdAt) : null;
        return d && d >= monthStart;
      })
      .reduce((n, t) => n + (Number(t.estimatedCost) || 0), 0)
  );

  const operationalGroups: Record<string, ServiceStatus[]> = {
    diagnosis: [ServiceStatus.DITERIMA, ServiceStatus.ANTRIAN],
    approval: [ServiceStatus.ESTIMATE_PENDING, ServiceStatus.MENUGGU_APPROVAL],
    repair: [ServiceStatus.SEDANG_DIKERJAKAN, ServiceStatus.REWORK],
    qc: [ServiceStatus.QC],
    pickup: [ServiceStatus.SIAP_DIAMBIL],
  };
  const kpiItems = [
    { key: 'diagnosis', label: 'Diagnosis', value: menungguDiagnosa, gradient: 'from-amber-400 via-orange-400 to-red-400' },
    { key: 'approval', label: 'Approval', value: menungguApproval, gradient: 'from-orange-400 via-red-400 to-pink-400' },
    { key: 'repair', label: 'Repair', value: dikerjakan + tenantServices.filter((s) => s.status === ServiceStatus.REWORK).length, gradient: 'from-blue-400 via-cyan-400 to-teal-400' },
    { key: 'qc', label: 'QC', value: qc, gradient: 'from-teal-400 via-cyan-400 to-sky-500' },
    { key: 'pickup', label: 'Ready Pickup', value: siapDiambil, gradient: 'from-emerald-400 via-green-400 to-teal-500' },
  ];

  const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  React.useEffect(() => setPage(1), [operationalFilter, technicianFilter, dateRangeFilter, slaFilter, qcView, srvSearchQuery, srvSort, statusFilter]);
  React.useEffect(() => {
    let cancelled = false;
    setServicePage(null);
    const timeout = window.setTimeout(() => getServiceTickets(apiFetch, {
      q: srvSearchQuery.trim() || undefined,
      status: qcView ? ServiceStatus.QC : statusFilter === 'ALL' ? undefined : statusFilter,
      group: operationalFilter === 'ALL' ? undefined : operationalFilter,
      technician: technicianFilter === 'ALL' ? undefined : technicianFilter,
      sla: slaFilter === 'all' ? undefined : slaFilter,
to: dateRangeFilter === 'all' ? undefined : localDate(new Date()),
       from: dateRangeFilter === 'all' ? undefined : localDate(new Date(todayStart.getTime() - ((dateRangeFilter === 'today' ? 1 : Number(dateRangeFilter.replace('d', ''))) - 1) * 86400_000)),
      sort: srvSort, limit: 15, offset: (page - 1) * 15,
    }).then((result) => { if (!cancelled) setServicePage(result); }).catch((error) => { if (!cancelled) showToast(error.message, 'error'); }), srvSearchQuery ? 250 : 0);
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [apiFetch, page, operationalFilter, technicianFilter, dateRangeFilter, slaFilter, qcView, srvSearchQuery, srvSort, statusFilter, showToast]);
  React.useEffect(() => {
    const readQuery = () => {
      const filters = readFilters();
      setOperationalFilter(filters.group);
      setTechnicianFilter(filters.tech);
      setDateRangeFilter(filters.range);
      setSlaFilter(filters.sla);
    };
    window.addEventListener('popstate', readQuery);
    return () => window.removeEventListener('popstate', readQuery);
  }, [filterStorageKey]);
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filters = { group: operationalFilter, tech: technicianFilter, range: dateRangeFilter, sla: slaFilter };
    Object.entries(filters).forEach(([key, value]) => value === 'ALL' || value === 'all' ? params.delete(key) : params.set(key, value));
    localStorage.setItem(filterStorageKey, JSON.stringify({ tech: technicianFilter, range: dateRangeFilter, sla: slaFilter }));
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
  }, [operationalFilter, technicianFilter, dateRangeFilter, slaFilter, filterStorageKey]);

  const filteredServices = tenantServices
    .filter((s) => {
      const q = srvSearchQuery.toLowerCase();
      const matchesQuery =
        String(s.ticketNo || '').toLowerCase().includes(q) ||
        String(s.deviceName || '').toLowerCase().includes(q) ||
        String(s.deviceBrandModel || '').toLowerCase().includes(q) ||
        (customers.find((c) => c.id === s.customerId)?.name || '').toLowerCase().includes(q);
      const effectiveStatusFilter = qcView ? ServiceStatus.QC : statusFilter;
      const matchesStatus = effectiveStatusFilter === 'ALL' || s.status === effectiveStatusFilter;
      const matchesGroup = operationalFilter === 'ALL' || operationalGroups[operationalFilter]?.includes(s.status);
      const matchesTechnician = technicianFilter === 'ALL' || (technicianFilter === 'unassigned' ? !s.assignedTechId : s.assignedTechId === technicianFilter);
      const createdAt = s.createdAt ? new Date(s.createdAt) : null;
      const rangeDays = dateRangeFilter === 'today' ? 1 : Number(dateRangeFilter.replace('d', ''));
      const rangeStart = dateRangeFilter === 'all' ? null : new Date(todayStart.getTime() - (rangeDays - 1) * 86400_000);
      const matchesDate = !rangeStart || (createdAt && createdAt >= rangeStart);
      const slaHours = tenantObj?.settings?.serviceSettings?.slaHours || 48;
      const overdue = Boolean(createdAt && !SERVICE_TERMINAL_STATUSES.has(s.status) && now.getTime() - createdAt.getTime() > slaHours * 3600_000);
      const matchesSla = slaFilter === 'all' || (slaFilter === 'overdue' ? overdue : !overdue);
      return matchesQuery && matchesStatus && matchesGroup && matchesTechnician && matchesDate && matchesSla;
    })
    .sort((a, b) => {
      if (srvSort === 'urgent') {
        const urgency = (ticket) => {
          const estimate = ticket.estimatedCompletionDate ? new Date(ticket.estimatedCompletionDate).getTime() : Infinity;
          return estimate < now.getTime() && !SERVICE_TERMINAL_STATUSES.has(ticket.status) ? estimate : Infinity;
        };
        const overdueDiff = urgency(a) - urgency(b);
        if (overdueDiff) return overdueDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (srvSort === 'cost_desc') return Number(b.estimatedCost || 0) - Number(a.estimatedCost || 0);
      if (srvSort === 'cost_asc') return Number(a.estimatedCost || 0) - Number(b.estimatedCost || 0);
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return srvSort === 'oldest' ? diff : -diff;
    });
  const totalPages = servicePage ? Math.ceil(servicePage.total / servicePage.limit) : Math.ceil(filteredServices.length / 15);
  const paginatedServices = servicePage?.data || filteredServices.slice((page - 1) * 15, page * 15);
  const downloadCsv = async () => {
    const blob = await exportServiceTickets(apiFetch, { q: srvSearchQuery.trim() || undefined, status: qcView ? ServiceStatus.QC : statusFilter === 'ALL' ? undefined : statusFilter, group: operationalFilter === 'ALL' ? undefined : operationalFilter, technician: technicianFilter === 'ALL' ? undefined : technicianFilter, sla: slaFilter === 'all' ? undefined : slaFilter, from: dateRangeFilter === 'all' ? undefined : localDate(new Date(todayStart.getTime() - ((dateRangeFilter === 'today' ? 1 : Number(dateRangeFilter.replace('d', ''))) - 1) * 86400_000)), to: dateRangeFilter === 'all' ? undefined : localDate(new Date()), sort: srvSort });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'daftar_servis_saas.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 rounded-2xl p-4 space-y-4">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {kpiItems.map((item) => (
          <button key={item.key} onClick={() => setOperationalFilter(item.key)} className="text-left">
            <GradientCard gradient={item.gradient} className={operationalFilter === item.key ? 'ring-2 ring-indigo-400' : ''}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/70">{item.label}</p>
            <p className="text-lg font-black text-white drop-shadow-sm tracking-tight">{item.value}</p>
            </GradientCard>
          </button>
         ))}
      </div>

      {/* Row KPI Info */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 dark:text-zinc-400">
        {(() => {
           const slaHours = tenantObj?.settings?.serviceSettings?.slaHours || 48;
          const slaBreaches = active.filter(
            (s) =>
              s.createdAt &&
              now.getTime() - new Date(s.createdAt).getTime() > slaHours * 3600_000
          ).length;
           const techCount = active.reduce((acc, s) => {
            const k = s.assignedTechId || 'unassigned';
            acc.add(k);
            return acc;
          }, new Set<string>());
          return (
            <>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 font-bold">
                SLA: {servicePage?.kpi?.overdue ?? slaBreaches}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 font-bold">
                Aktif: {servicePage?.kpi?.active ?? active.length}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 font-bold">
                Teknisi: {techCount.size}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold">
                Estimasi: Rp{totalEstimasiBulanIni.toLocaleString('id-ID')}
              </span>
            </>
          );
        })()}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button onClick={() => setOperationalFilter('ALL')} className={`rounded-lg px-3 py-2 text-[10px] font-bold ${operationalFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300'}`}>Semua Operasional</button>
        {kpiItems.map((item) => <button key={item.key} onClick={() => setOperationalFilter(item.key)} className={`rounded-lg px-3 py-2 text-[10px] font-bold ${operationalFilter === item.key ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300'}`}>{item.label}</button>)}
        <select aria-label="Filter semua status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="ml-auto px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl">
          <option value="ALL">Semua status</option>
          {Object.entries(SERVICE_STATUS_META).map(([status, meta]) => <option key={status} value={status}>{meta.label}</option>)}
        </select>
        <select aria-label="Filter teknisi" value={technicianFilter} onChange={(e) => setTechnicianFilter(e.target.value)} className="px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl">
          <option value="ALL">Semua teknisi</option>
          <option value="unassigned">Belum ditugaskan</option>
          {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
        </select>
        <select aria-label="Filter rentang tanggal" value={dateRangeFilter} onChange={(e) => setDateRangeFilter(e.target.value)} className="px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl">
          <option value="all">Semua tanggal</option>
          <option value="today">Hari ini</option>
          <option value="7d">7 hari</option>
          <option value="30d">30 hari</option>
        </select>
        <select aria-label="Filter SLA" value={slaFilter} onChange={(e) => setSlaFilter(e.target.value)} className="px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl">
          <option value="all">Semua SLA</option>
          <option value="overdue">Terlambat</option>
          <option value="on-track">Sesuai SLA</option>
        </select>
      </div>

      {/* Search & Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            aria-label="Cari tiket servis"
            placeholder="Cari tiket, nama, perangkat..."
            value={srvSearchQuery}
            onChange={(e) => setSrvSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-400/20 transition-all shadow-sm"
          />
          {srvSearchQuery && (
            <button
               onClick={() => setSrvSearchQuery('')}
               aria-label="Hapus pencarian"
               className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>
        <select
          value={srvSort}
          aria-label="Urutkan tiket servis"
          onChange={(e) => setSrvSort(e.target.value as any)}
          className="px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all shadow-sm cursor-pointer"
        >
           <option value="urgent">Urgent: overdue dulu</option>
           <option value="newest">Terbaru</option>
          <option value="oldest">Terlama</option>
          <option value="cost_desc">Biaya Tinggi</option>
          <option value="cost_asc">Biaya Rendah</option>
        </select>
        <div className="flex items-center gap-1.5">
          {selectedServiceIds.length > 0 &&
            (currentUser?.role === UserRole.OWNER ||
              currentUserPermissions.includes('action-services-delete-ticket')) && (
              <button
                onClick={async () => {
                  if (
                    await showConfirm({
                      title: 'Hapus Tiket Massal',
                      message: `Apakah Anda yakin ingin menghapus ${selectedServiceIds.length} tiket terpilih secara permanen?`,
                      confirmLabel: 'Ya, Hapus Permanen',
                      type: 'danger',
                    })
                  ) {
                    const count = selectedServiceIds.length;
                     await bulkDeleteServiceTickets(apiFetch, selectedServiceIds);
                    setSelectedServiceIds([]);
                    showToast(`${count} tiket berhasil dihapus.`, 'success');
                  }
                }}
                className="px-3 py-2 text-[10px] font-bold bg-gradient-to-r from-rose-500 to-red-500 text-white rounded-xl hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus
              </button>
            )}
          <button
            onClick={downloadCsv}
            className="px-3 py-2 text-[10px] font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            onClick={() => setActiveSubTab('new-ticket')}
            className={`bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 hover:shadow-lg text-white font-extrabold text-[10px] px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all hover:scale-105 ${isSubTabAllowed('services', 'new-ticket') ? '' : 'hidden'}`}
          >
            <PlusCircle className="w-3.5 h-3.5" /> Terima Unit Baru
          </button>
        </div>
      </div>

      {/* Service List */}
      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="max-h-[650px] overflow-y-auto">
           {paginatedServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-zinc-500">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center mb-4">
                <Search className="w-7 h-7 text-slate-300 dark:text-zinc-600" />
              </div>
              <p className="text-sm font-bold">Tidak ada tiket ditemukan</p>
              <p className="text-[11px] mt-1 opacity-60">Coba ubah filter atau kata kunci pencarian</p>
            </div>
           ) : (
             <>
             <table className="hidden md:table w-full text-left">
               <thead className="bg-slate-50 dark:bg-zinc-800/60 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="p-3">Pilih</th><th className="p-3">Tiket</th><th className="p-3">Status</th><th className="p-3">Tindakan berikut</th><th className="p-3">Estimasi</th></tr></thead>
               <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">{paginatedServices.map((s) => {
                 const customer = customers.find((c) => c.id === s.customerId);
                 const overdue = s.estimatedCompletionDate && new Date(s.estimatedCompletionDate) < now && !SERVICE_TERMINAL_STATUSES.has(s.status);
                 return <tr key={s.id} tabIndex={0} onClick={() => { setViewingServiceTicketId(s.id); setManualDiagNotes(s.techDiagnosis || ''); setManualDiagCost(String(Number(s.estimatedCost) || 0)); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setViewingServiceTicketId(s.id); } }} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/50 focus:outline-none focus:bg-indigo-50 dark:focus:bg-indigo-950/20"><td className="p-3" onClick={(e) => e.stopPropagation()}><input aria-label={`Pilih tiket ${s.ticketNo}`} type="checkbox" checked={selectedServiceIds.includes(s.id)} onChange={() => setSelectedServiceIds(selectedServiceIds.includes(s.id) ? selectedServiceIds.filter((id) => id !== s.id) : [...selectedServiceIds, s.id])} /></td><td className="p-3">{s.publicTrackingToken ? <a href={`${publicBaseUrl}/?tracking=${encodeURIComponent(s.publicTrackingToken)}`} target="_blank" rel="noreferrer" className="font-mono font-bold text-indigo-600 hover:underline" onClick={(event) => event.stopPropagation()} aria-label={`Buka tracking publik tiket ${s.ticketNo}`}>#{s.ticketNo}</a> : <span className="font-mono font-bold text-slate-500" aria-label={`Tracking publik tiket ${s.ticketNo} belum tersedia`}>#{s.ticketNo}</span>}<p className="text-xs font-semibold">{customer?.name || 'Umum'} · {s.deviceName}</p></td><td className="p-3 text-xs">{SERVICE_STATUS_META[s.status]?.label || s.status}</td><td className="p-3 text-xs font-semibold text-slate-600 dark:text-zinc-300">{NEXT_STEP[s.status]?.label || 'Tidak ada tindakan'}</td><td className={`p-3 text-xs ${overdue ? 'font-bold text-rose-600' : ''}`}>{s.estimatedCompletionDate ? new Date(s.estimatedCompletionDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '—'}</td></tr>;
               })}</tbody>
             </table>
             <div className="divide-y divide-slate-100 dark:divide-zinc-800 md:hidden">
               {paginatedServices.map((s) => {
                const customer = customers.find((c) => c.id === s.customerId);
                const technician = employees.find((e) => e.id === s.assignedTechId);
                const initials = (customer?.name || 'U').charAt(0).toUpperCase();

                const statusRail =
                  s.status === ServiceStatus.SELESAI ||
                  s.status === ServiceStatus.SIAP_DIAMBIL ||
                  s.status === ServiceStatus.DIAMBIL
                    ? 'from-emerald-500 to-teal-500'
                    : s.status === ServiceStatus.REWORK
                      ? 'from-orange-500 to-red-500'
                      : s.status === ServiceStatus.DIAGNOSA
                        ? 'from-amber-500 to-orange-500'
                        : s.status === ServiceStatus.QC
                          ? 'from-teal-500 to-cyan-500'
                          : 'from-indigo-500 to-violet-500';

                const tone = SERVICE_STATUS_META[s.status]?.tone || 'slate';
                const badgeStyles: Record<string, string> = {
                  slate: 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300',
                  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400',
                  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
                  cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400',
                  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
                  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
                  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',
                  fuchsia: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-400',
                  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400',
                  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
                  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400',
                  pink: 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400',
                  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
                  red: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
                  green: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
                  lime: 'bg-lime-100 text-lime-700 dark:bg-lime-950/40 dark:text-lime-400',
                };

                return (
                  <div
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setViewingServiceTicketId(s.id);
                      setManualDiagNotes(s.techDiagnosis || '');
                      setManualDiagCost(String(Number(s.estimatedCost) || 0));
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setViewingServiceTicketId(s.id);
                        setManualDiagNotes(s.techDiagnosis || '');
                        setManualDiagCost(String(Number(s.estimatedCost) || 0));
                      }
                    }}
                    className={`group relative flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-all duration-200 cursor-pointer select-none ${
                      viewingServiceTicketId === s.id ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                    }`}
                  >
                    {/* Status Rail */}
                    <div className={`w-1 h-10 rounded-full bg-gradient-to-b ${statusRail} shrink-0`} />

                    {/* Checkbox */}
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                         aria-label={`Pilih tiket ${s.ticketNo}`}
                         checked={selectedServiceIds.includes(s.id)}
                        onChange={() => {
                          if (selectedServiceIds.includes(s.id)) {
                            setSelectedServiceIds(selectedServiceIds.filter((id) => id !== s.id));
                          } else {
                            setSelectedServiceIds([...selectedServiceIds, s.id]);
                          }
                        }}
                        className="w-3.5 h-3.5 rounded border-slate-300 dark:border-zinc-600"
                      />
                    </div>

                    {/* Avatar */}
                    <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-xs font-black font-mono bg-gradient-to-br ${statusRail} text-white shadow-sm`}>
                      {initials}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
{s.publicTrackingToken ? <a
                            href={`${publicBaseUrl}/?tracking=${encodeURIComponent(s.publicTrackingToken)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono font-extrabold text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`Buka tracking publik tiket ${s.ticketNo}`}
                          >
                            #{s.ticketNo}
                          </a> : <span className="font-mono font-extrabold text-[11px] text-slate-500" aria-label={`Tracking publik tiket ${s.ticketNo} belum tersedia`}>#{s.ticketNo}</span>}
                        <span className="text-[11px] font-bold text-slate-800 dark:text-zinc-100 truncate">
                          {customer?.name || 'Umum'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">{s.deviceName}</span>
                        {s.deviceBrandModel && (
                          <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono">
                            {s.deviceBrandModel}
                          </span>
                        )}
                      </div>
                       <p className="mt-1 text-[9px] font-semibold text-indigo-500 dark:text-indigo-400 truncate">{NEXT_STEP[s.status]?.label || 'Tidak ada tindakan'}</p>
                       <div className="flex items-center gap-2 mt-1 text-[8.5px] text-slate-400 dark:text-zinc-500 font-mono">
                        {customer?.phone && <span>{customer.phone}</span>}
                        {technician && (
                          <span className="text-indigo-400 dark:text-indigo-300">
                            {technician.name}
                          </span>
                        )}
                        <span className="ml-auto">
                          {new Date(s.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Status + Price */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded-lg uppercase font-mono tracking-wide ${badgeStyles[tone] || badgeStyles.slate}`}>
                        {SERVICE_STATUS_META[s.status]?.label || s.status}
                      </span>
                      <span className="font-black font-mono text-[11px] text-slate-700 dark:text-zinc-300 tabular-nums">
                        Rp{Number(s.estimatedCost || 0).toLocaleString('id-ID')}
                      </span>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-zinc-600 shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                );
               })}
             </div>
             </>
           )}
         </div>
         <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} itemsPerPage={15} />
      </div>

      {/* Floating bulk action bar */}
      {selectedServiceIds.length > 0 && (
        <div className="sticky bottom-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm border border-slate-200 dark:border-zinc-800 rounded-2xl p-3 flex items-center justify-between shadow-xl">
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
            {selectedServiceIds.length} terpilih
          </span>
          <div className="flex items-center gap-2">
            {(currentUser?.role === UserRole.OWNER ||
              currentUserPermissions.includes('action-services-delete-ticket')) && (
              <button
                onClick={async () => {
                  if (
                    await showConfirm({
                      title: 'Hapus Tiket Massal',
                      message: `Yakin hapus ${selectedServiceIds.length} tiket?`,
                      confirmLabel: 'Ya',
                      type: 'danger',
                    })
                  ) {
                    const count = selectedServiceIds.length;
                     await bulkDeleteServiceTickets(apiFetch, selectedServiceIds);
                    setSelectedServiceIds([]);
                    showToast(`${count} tiket dihapus.`, 'success');
                  }
                }}
                className="px-3 py-1.5 text-[10px] font-bold bg-gradient-to-r from-rose-500 to-red-500 text-white rounded-lg hover:shadow-lg transition-all"
              >
                Hapus
              </button>
            )}
            <button
              onClick={() => setSelectedServiceIds([])}
              className="px-3 py-1.5 text-[10px] font-bold text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all"
            >
              Batal
            </button>
          </div>
        </div>
      )}

       <ServiceDetailModal {...props} />
      <ServiceModals {...props} />
    </div>
  );
};
