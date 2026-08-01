import * as React from 'react';
import { ServiceModals } from './ServiceModals';
import { ServiceDetailModal } from './ServiceDetailModal';
import { ServiceStatus, UserRole } from '../../types';
import { NEXT_STEP, SERVICE_STATUS_META, SERVICE_TERMINAL_STATUSES } from '../../domain/serviceWorkflow';
import { Pagination } from './services/Pagination';
import { bulkDeleteServiceTickets, exportServiceTickets, getServiceTickets, ServiceTicketList } from '../../lib/api/services';
import { AlertCircle, FileText, PlusCircle, RefreshCw, Search, Trash2, X } from 'lucide-react';

export const ServiceList: React.FC<any> = (props) => {
  const {
    activeTenantId, apiFetch, currentBranchId, currentTenantId, currentUser, currentUserPermissions,
    customers, employees, isSubTabAllowed, publicBaseUrl, qcView, setActiveSubTab,
    setManualDiagCost, setManualDiagNotes, setSelectedServiceIds, setSrvSearchQuery, setSrvSort,
    setViewingServiceTicketId, showConfirm, showToast, srvSearchQuery, srvSort, statusFilter, setStatusFilter,
    tenantObj, tenantServices, viewingServiceTicketId, selectedServiceIds,
  } = props;
  const [page, setPage] = React.useState(1);
  const [servicePage, setServicePage] = React.useState<ServiceTicketList | null>(null);
  const [serviceListError, setServiceListError] = React.useState<string | null>(null);
  const [serviceListLoading, setServiceListLoading] = React.useState(true);
  const [workflow, setWorkflow] = React.useState('ALL');
  const [reloadKey, setReloadKey] = React.useState(0);
  const [deleting, setDeleting] = React.useState(false);
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [slaFilter, setSlaFilter] = React.useState('ALL');
  const [assignedTech, setAssignedTech] = React.useState('ALL');
  const [filtersHydrated, setFiltersHydrated] = React.useState(false);
  const filterStorageKey = 'fixdev_srv_filters';

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let saved: Record<string, string> = {};
    try { saved = JSON.parse(localStorage.getItem(filterStorageKey) || '{}'); } catch (error) { localStorage.removeItem(filterStorageKey); }
    const value = (key: string) => params.get(key) ?? saved[key];
    const nextWorkflow = value('workflow'); if (nextWorkflow !== undefined) setWorkflow(nextWorkflow);
    const from = value('dateFrom'); if (from !== undefined) setDateFrom(from);
    const to = value('dateTo'); if (to !== undefined) setDateTo(to);
    const sla = value('sla'); if (sla !== undefined) setSlaFilter(sla);
    const tech = value('tech'); if (tech !== undefined) setAssignedTech(tech);
    const frame = requestAnimationFrame(() => setFiltersHydrated(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  React.useEffect(() => {
    if (!filtersHydrated) return;
    const query = new URLSearchParams(window.location.search);
    if (query.get('q') && !srvSearchQuery) return;
    ['workflow', 'dateFrom', 'dateTo', 'sla', 'tech'].forEach((key) => query.delete(key));
    if (workflow !== 'ALL') query.set('workflow', workflow);
    if (dateFrom) query.set('dateFrom', dateFrom);
    if (dateTo) query.set('dateTo', dateTo);
    if (slaFilter !== 'ALL') query.set('sla', slaFilter);
    if (assignedTech !== 'ALL') query.set('tech', assignedTech);
    const nextUrl = `${window.location.pathname}${query.toString() ? `?${query.toString()}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', nextUrl);
    localStorage.setItem(filterStorageKey, JSON.stringify({
      q: srvSearchQuery, sort: srvSort, status: statusFilter, workflow, dateFrom, dateTo, sla: slaFilter, tech: assignedTech
    }));
  }, [filtersHydrated, srvSearchQuery, srvSort, statusFilter, workflow, dateFrom, dateTo, slaFilter, assignedTech]);

  const now = new Date();
  const groups: Record<string, ServiceStatus[]> = {
    diagnosis: [ServiceStatus.DITERIMA, ServiceStatus.ANTRIAN],
    approval: [ServiceStatus.ESTIMATE_PENDING, ServiceStatus.MENUGGU_APPROVAL],
    repair: [ServiceStatus.SEDANG_DIKERJAKAN, ServiceStatus.REWORK],
    qc: [ServiceStatus.QC],
    pickup: [ServiceStatus.SIAP_DIAMBIL],
  };
  const fallbackServices = tenantServices.filter((ticket) => {
    const query = srvSearchQuery.toLowerCase();
    const customer = customers.find((item) => item.id === ticket.customerId);
    return (!query || [ticket.ticketNo, ticket.deviceName, ticket.deviceBrandModel, customer?.name].some((value) => String(value || '').toLowerCase().includes(query))) &&
      (workflow === 'ALL' || groups[workflow]?.includes(ticket.status));
  });
  const services = servicePage?.data ?? fallbackServices.slice((page - 1) * 15, page * 15);
  const sourceServices = servicePage?.data ?? tenantServices;
  const active = sourceServices.filter((ticket) => !SERVICE_TERMINAL_STATUSES.has(ticket.status));
  const slaHours = tenantObj?.settings?.serviceSettings?.slaHours || 48;
  const overdue = active.filter((ticket) => ticket.createdAt && now.getTime() - new Date(ticket.createdAt).getTime() > slaHours * 3600_000).length;
  const kpis = [
    ['diagnosis', 'Diagnosis', sourceServices.filter((ticket) => groups.diagnosis.includes(ticket.status)).length],
    ['approval', 'Approval', sourceServices.filter((ticket) => groups.approval.includes(ticket.status)).length],
    ['repair', 'Perbaikan', sourceServices.filter((ticket) => groups.repair.includes(ticket.status)).length],
    ['qc', 'QC', sourceServices.filter((ticket) => groups.qc.includes(ticket.status)).length],
    ['pickup', 'Siap diambil', sourceServices.filter((ticket) => groups.pickup.includes(ticket.status)).length],
  ];

  React.useEffect(() => setPage(1), [workflow, srvSearchQuery, srvSort, statusFilter, qcView, dateFrom, dateTo, slaFilter, assignedTech]);
  React.useEffect(() => {
    const reload = () => setReloadKey((key) => key + 1);
    window.addEventListener('service-ticket-updated', reload);
    return () => window.removeEventListener('service-ticket-updated', reload);
  }, []);
  React.useEffect(() => {
    let cancelled = false;
    setServicePage(null);
    setServiceListLoading(true);
    setServiceListError(null);
    const timeout = window.setTimeout(() => getServiceTickets(apiFetch, {
      q: srvSearchQuery.trim() || undefined,
      status: qcView ? ServiceStatus.QC : statusFilter === 'ALL' ? undefined : statusFilter,
      group: workflow === 'ALL' ? undefined : workflow,
      tenantId: currentTenantId || activeTenantId || undefined,
      branchId: currentBranchId || tenantObj?.branchId || tenantObj?.currentBranchId || undefined,
      sort: srvSort, limit: 15, offset: (page - 1) * 15,
      from: dateFrom || undefined,
      to: dateTo || undefined,
      sla: slaFilter === 'ALL' ? undefined : slaFilter,
      technician: assignedTech === 'ALL' ? undefined : assignedTech,
    }).then((result) => {
      if (!cancelled) { setServicePage(result); setServiceListLoading(false); }
    }).catch((error) => {
      if (!cancelled) { setServiceListError(error.message); setServiceListLoading(false); }
    }), srvSearchQuery ? 250 : 0);
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [currentTenantId, activeTenantId, currentBranchId, tenantObj?.branchId, tenantObj?.currentBranchId, apiFetch, page, qcView, reloadKey, srvSearchQuery, srvSort, statusFilter, workflow, dateFrom, dateTo, slaFilter, assignedTech]);

  const openTicket = (ticket: any) => {
    setViewingServiceTicketId(ticket.id);
    setManualDiagNotes(ticket.techDiagnosis || '');
    setManualDiagCost(String(Number(ticket.estimatedCost) || 0));
  };
  const toggleTicket = (id: string) => setSelectedServiceIds(selectedServiceIds.includes(id) ? selectedServiceIds.filter((item) => item !== id) : [...selectedServiceIds, id]);
  const resetFilters = () => { setWorkflow('ALL'); setSrvSearchQuery(''); setSrvSort('urgent'); if (setStatusFilter) { setStatusFilter('ALL'); } setDateFrom(''); setDateTo(''); setSlaFilter('ALL'); setAssignedTech('ALL'); };
  const downloadCsv = async () => {
    try {
      const blob = await exportServiceTickets(apiFetch, { q: srvSearchQuery.trim() || undefined, group: workflow === 'ALL' ? undefined : workflow, tenantId: currentTenantId || activeTenantId || undefined, branchId: currentBranchId || tenantObj?.branchId || tenantObj?.currentBranchId || undefined, sort: srvSort, status: qcView ? ServiceStatus.QC : statusFilter === 'ALL' ? undefined : statusFilter, from: dateFrom || undefined, to: dateTo || undefined, sla: slaFilter === 'ALL' ? undefined : slaFilter, technician: assignedTech === 'ALL' ? undefined : assignedTech });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob); link.download = 'daftar_servis_saas.csv'; link.click();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch (error: any) { showToast(error?.message || 'Gagal mengekspor tiket.', 'error'); }
  };
  const deleteSelected = async () => {
    if (deleting || !await showConfirm({ title: 'Hapus Tiket Massal', message: `Apakah Anda yakin ingin menghapus ${selectedServiceIds.length} tiket terpilih secara permanen?`, confirmLabel: 'Ya, Hapus Permanen', type: 'danger' })) return;
    setDeleting(true);
    try {
      const deletedIds = await bulkDeleteServiceTickets(apiFetch, selectedServiceIds);
      if (deletedIds.length !== selectedServiceIds.length) throw new Error('Sebagian tiket gagal dihapus. Muat ulang daftar.');
      setSelectedServiceIds([]); setReloadKey((key) => key + 1); showToast(`${deletedIds.length} tiket berhasil dihapus.`, 'success');
    } catch (error: any) { showToast(error?.message || 'Gagal menghapus tiket.', 'error'); } finally { setDeleting(false); }
  };
  const canDelete = currentUser?.role === UserRole.OWNER || currentUserPermissions.includes('action-services-delete-ticket');
  const totalPages = servicePage ? Math.max(1, Math.ceil(servicePage.total / servicePage.limit)) : Math.max(1, Math.ceil(fallbackServices.length / 15));
  const allPageSelected = services.length > 0 && services.every((ticket) => selectedServiceIds.includes(ticket.id));
  const activeFilterCount = [srvSearchQuery, workflow !== 'ALL', statusFilter !== 'ALL', assignedTech !== 'ALL', slaFilter !== 'ALL', dateFrom, dateTo].filter(Boolean).length;

  return <div className="mx-auto w-full max-w-screen-2xl space-y-4 rounded-xl bg-slate-50 px-3 py-3 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-5 sm:py-4">
    <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-zinc-400">Operasional servis</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Daftar Servis <span className="text-slate-500 dark:text-zinc-400">{servicePage?.total ?? tenantServices.length}</span></h1></div>
      <div className="flex gap-2"><button onClick={downloadCsv} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-semibold dark:border-zinc-700"><FileText className="size-4" />CSV</button><button onClick={() => setActiveSubTab('new-ticket')} className={`inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white ${isSubTabAllowed('services', 'new-ticket') ? '' : 'hidden'}`}><PlusCircle className="size-4" />Terima unit</button></div>
    </header>
    <section aria-label="Ringkasan operasional" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {kpis.map(([key, label, value]) => <button key={key} onClick={() => setWorkflow(workflow === key ? 'ALL' : String(key))} aria-pressed={workflow === key} className={`rounded-lg border p-3 text-left ${workflow === key ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30' : 'border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'}`}><p className="text-xs font-medium text-slate-500 dark:text-zinc-400">{label}</p><p className="mt-1 text-xl font-bold tabular-nums">{value}</p></button>)}
    </section>
    <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">SLA lewat: {servicePage?.kpi?.overdue ?? overdue}</span><span className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold dark:border-zinc-800 dark:bg-zinc-900">Aktif: {servicePage?.kpi?.active ?? active.length}</span><span className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold dark:border-zinc-800 dark:bg-zinc-900">Estimasi: Rp{Number(servicePage?.kpi?.estimated ?? sourceServices.reduce((sum, ticket) => sum + (Number(ticket.estimatedCost) || 0), 0)).toLocaleString('id-ID')}</span></div>
    <section className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4" aria-label="Pencarian dan filter">
      <div className="relative flex-1"><Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" /><input value={srvSearchQuery} onChange={(event) => setSrvSearchQuery(event.target.value)} aria-label="Cari tiket servis" placeholder="Cari tiket, pelanggan, atau perangkat" className="min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-9 text-xs outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-900" />{srvSearchQuery && <button onClick={() => setSrvSearchQuery('')} aria-label="Hapus pencarian" className="absolute right-3 top-1/2 -translate-y-1/2"><X className="size-4" /></button>}</div>
      <select value={srvSort} aria-label="Urutkan tiket servis" onChange={(event) => setSrvSort(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs dark:border-zinc-700 dark:bg-zinc-900"><option value="urgent">Urgent</option><option value="newest">Terbaru</option><option value="oldest">Terlama</option><option value="cost_desc">Biaya tertinggi</option><option value="cost_asc">Biaya terendah</option></select>
      <select value={workflow} aria-label="Filter workflow" onChange={(event) => setWorkflow(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs dark:border-zinc-700 dark:bg-zinc-900"><option value="ALL">Tahap alur kerja</option>{[['diagnosis', 'Diagnosis'], ['approval', 'Persetujuan'], ['repair', 'Perbaikan'], ['qc', 'QC'], ['pickup', 'Siap diambil']].map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
      <select value={statusFilter} aria-label="Filter status" onChange={(event) => setStatusFilter?.(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs dark:border-zinc-700 dark:bg-zinc-900"><option value="ALL">Status</option>{Object.values(ServiceStatus).map((status) => <option key={status} value={status}>{SERVICE_STATUS_META[status]?.label || status}</option>)}</select>
      <select value={assignedTech} aria-label="Filter teknisi" onChange={(event) => setAssignedTech(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs dark:border-zinc-700 dark:bg-zinc-900"><option value="ALL">Teknisi</option><option value="unassigned">Belum ditugaskan</option>{employees.map((employee: any) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select>
      <select value={slaFilter} aria-label="Filter SLA" onChange={(event) => setSlaFilter(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs dark:border-zinc-700 dark:bg-zinc-900"><option value="ALL">SLA</option><option value="overdue">SLA overdue</option><option value="on-track">SLA aman</option></select>
      <input type="date" aria-label="Tanggal mulai" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs dark:border-zinc-700 dark:bg-zinc-900" />
      <input type="date" aria-label="Tanggal akhir" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs dark:border-zinc-700 dark:bg-zinc-900" />
      {activeFilterCount > 0 && <button onClick={resetFilters} className="min-h-11 rounded-lg border border-slate-300 px-3 text-xs font-semibold dark:border-zinc-700">Reset {activeFilterCount} filter</button>}
    </section>
    <section className="relative overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" aria-busy={serviceListLoading}>
      {serviceListLoading && <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 border-b border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300"><RefreshCw className="size-4 animate-spin" />Memuat data terbaru…</div>}
      {serviceListError ? <div className="flex min-h-80 flex-col items-center justify-center p-6 text-center"><AlertCircle className="mb-3 size-8 text-rose-600" /><p className="text-sm font-semibold">{serviceListError}</p><button onClick={() => setReloadKey((key) => key + 1)} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-zinc-900">Coba lagi</button></div> : services.length === 0 && !serviceListLoading ? <div className="flex min-h-80 flex-col items-center justify-center p-6 text-center"><Search className="mb-3 size-8 text-slate-400" /><p className="text-sm font-semibold">Tidak ada tiket ditemukan</p><p className="mt-1 text-xs text-slate-500">Ubah pencarian atau filter, atau terima unit baru.</p><div className="mt-4 flex gap-2"><button onClick={resetFilters} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold dark:border-zinc-700">Reset filter</button><button onClick={() => setActiveSubTab('new-ticket')} className={`rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white ${isSubTabAllowed('services', 'new-ticket') ? '' : 'hidden'}`}>Terima unit</button></div></div> : <>
        <div className="hidden overflow-x-auto md:block"><table className="min-w-[980px] w-full text-left text-xs"><thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"><tr><th className="w-12 p-3"><input type="checkbox" aria-label="Pilih semua tiket halaman ini" checked={allPageSelected} onChange={() => setSelectedServiceIds(allPageSelected ? selectedServiceIds.filter((id) => !services.some((ticket) => ticket.id === id)) : Array.from(new Set([...selectedServiceIds, ...services.map((ticket) => ticket.id)])))} /></th><th className="p-3">Customer / device</th><th className="p-3">Status</th><th className="p-3">Teknisi</th><th className="p-3">SLA / umur</th><th className="p-3">Estimasi selesai</th><th className="p-3 text-right">Biaya</th><th className="p-3">Next action</th></tr></thead><tbody>{services.map((ticket) => { const customer = customers.find((item) => item.id === ticket.customerId); const technician = employees.find((item) => item.id === ticket.assignedTechId); const isOverdue = ticket.estimatedCompletionDate && new Date(ticket.estimatedCompletionDate) < now && !SERVICE_TERMINAL_STATUSES.has(ticket.status); return <tr key={ticket.id} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openTicket(ticket); } }} onClick={() => openTicket(ticket)} className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-800"><td className="p-3" onClick={(event) => event.stopPropagation()}><input type="checkbox" aria-label={`Pilih tiket ${ticket.ticketNo}`} checked={selectedServiceIds.includes(ticket.id)} onChange={() => toggleTicket(ticket.id)} /></td><td className="p-3"><p className="font-semibold">{customer?.name || 'Umum'} <a href={`${publicBaseUrl}/?tab=service&track=${encodeURIComponent(ticket.ticketNo)}`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} className="font-mono text-indigo-600 hover:underline dark:text-indigo-400">#{ticket.ticketNo}</a></p><p className="mt-1 text-slate-500">{ticket.deviceName}{ticket.deviceBrandModel ? ` · ${ticket.deviceBrandModel}` : ''}</p></td><td className="p-3"><span className="rounded-md bg-slate-100 px-2 py-1 font-medium dark:bg-zinc-800">{SERVICE_STATUS_META[ticket.status]?.label || ticket.status}</span></td><td className="p-3">{technician?.name || 'Belum ditugaskan'}</td><td className={`p-3 ${isOverdue ? 'font-semibold text-rose-600' : ''}`}>{ticket.createdAt ? `${Math.max(0, Math.floor((now.getTime() - new Date(ticket.createdAt).getTime()) / 86400000))} hari` : '—'}</td><td className={`p-3 ${isOverdue ? 'font-semibold text-rose-600' : ''}`}>{ticket.estimatedCompletionDate ? new Date(ticket.estimatedCompletionDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '—'}</td><td className="p-3 text-right font-semibold tabular-nums">Rp{Number(ticket.estimatedCost || 0).toLocaleString('id-ID')}</td><td className="p-3 font-medium">{NEXT_STEP[ticket.status]?.label || 'Tidak ada tindakan'}</td></tr>; })}</tbody></table></div>
        <div className="divide-y divide-slate-200 md:hidden dark:divide-zinc-800">{services.map((ticket) => { const customer = customers.find((item) => item.id === ticket.customerId); const technician = employees.find((item) => item.id === ticket.assignedTechId); return <article key={ticket.id} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openTicket(ticket); } }} onClick={() => openTicket(ticket)} className="cursor-pointer p-4 hover:bg-slate-50 dark:hover:bg-zinc-800"><div className="flex gap-3"><input type="checkbox" aria-label={`Pilih tiket ${ticket.ticketNo}`} checked={selectedServiceIds.includes(ticket.id)} onClick={(event) => event.stopPropagation()} onChange={() => toggleTicket(ticket.id)} /><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><p className="font-semibold">{customer?.name || 'Umum'}</p><a href={`${publicBaseUrl}/?tab=service&track=${encodeURIComponent(ticket.ticketNo)}`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} className="font-mono text-indigo-600 hover:underline dark:text-indigo-400">#{ticket.ticketNo}</a></div><p className="mt-1 text-xs text-slate-500">{ticket.deviceName}{ticket.deviceBrandModel ? ` · ${ticket.deviceBrandModel}` : ''}</p><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><span><b>Status:</b> {SERVICE_STATUS_META[ticket.status]?.label || ticket.status}</span><span><b>Teknisi:</b> {technician?.name || 'Belum ditugaskan'}</span><span><b>Selesai:</b> {ticket.estimatedCompletionDate ? new Date(ticket.estimatedCompletionDate).toLocaleDateString('id-ID') : '—'}</span><span><b>Biaya:</b> Rp{Number(ticket.estimatedCost || 0).toLocaleString('id-ID')}</span></div><p className="mt-3 text-xs font-semibold text-indigo-700 dark:text-indigo-300">{NEXT_STEP[ticket.status]?.label || 'Tidak ada tindakan'}</p></div></div></article>; })}</div>
      </>}
      {!serviceListError && services.length > 0 && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} itemsPerPage={15} />}
    </section>
    {selectedServiceIds.length > 0 && <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg dark:border-zinc-700 dark:bg-zinc-900"><span className="text-xs font-semibold">{selectedServiceIds.length} tiket dipilih</span><div className="flex gap-2"><button onClick={() => setSelectedServiceIds([])} className="rounded-lg px-3 py-2 text-xs font-semibold">Batal</button>{canDelete && <button onClick={deleteSelected} disabled={deleting} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Trash2 className="size-4" />{deleting ? 'Menghapus…' : 'Hapus'}</button>}</div></div>}
    <ServiceDetailModal {...props} />
    <ServiceModals {...props} />
  </div>;
};
