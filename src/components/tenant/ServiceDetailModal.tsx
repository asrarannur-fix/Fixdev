import * as React from 'react';
import { createPortal } from 'react-dom';
import { Badge } from '../ui/Badge';
import { DocumentPrintouts } from './services/DocumentPrintouts';
import { ServiceTicketHeader } from './services/ServiceTicketHeader';
import { ServiceTicketCamera } from './services/ServiceTicketCamera';
import { ServiceInternalDiscussion } from './services/ServiceInternalDiscussion';
import { ServiceIntakeChecklist } from './services/ServiceIntakeChecklist';
import { ServiceTimeline } from './services/ServiceTimeline';
import { ServiceTicketSummary } from './services/ServiceTicketSummary';
import { ServiceWhatsAppHub } from './services/ServiceWhatsAppHub';
import { ServiceNextStepBanner } from './services/ServiceNextStepBanner';
import { ServicePartsLedger } from './services/ServicePartsLedger';
import { ServiceTicketActions } from './services/ServiceTicketActions';
import { getStorageLocations } from './StorageLocationManager';
import { buildServiceReceptionPreview, normalizeIndonesianPhone } from '../../utils/serviceReceptionUtils';
import { ServiceStatus, UserRole, CustomerSegment, PaymentMethod } from '../../types';
import { useSaaS } from '../../context/SaaSContext';
import { patchServiceTicketScope, uploadServicePhoto } from '../../lib/api/services';
import {
  Building2,
  Sliders,
  Receipt,
  Lock,
  Zap,
  FileText,
  ChevronRight,
  HelpCircle,
  Save,
  PlusCircle,
  CheckCircle2,
  Copy,
  AlertTriangle,
  Monitor,
  ExternalLink,
  Brush,
  Ticket,
  X,
  Paintbrush,
  Fingerprint,
  MapPin,
  Search,
  CheckSquare,
  Activity,
  Maximize,
  MessageCircle,
  Check,
  Calendar,
  Printer,
  AlertCircle,
  RefreshCw,
  Wrench,
  Upload,
  Minus,
  Eye,
  Edit,
  MoreVertical,
  SearchIcon,
  CheckCircle,
  Package,
  Send,
  Filter,
  ChevronLeft,
  QrCode,
  Share2,
  Barcode,
  ShieldCheck,
  Timer,
  PackagePlus,
  ListChecks,
} from 'lucide-react';

const INTAKE_STATUSES: ServiceStatus[] = [
  ServiceStatus.DITERIMA,
  ServiceStatus.ANTRIAN,
];
const DIAGNOSIS_STATUSES: ServiceStatus[] = [
  ServiceStatus.DITERIMA,
  ServiceStatus.ANTRIAN,
  ServiceStatus.DIAGNOSA,
];
const WORK_STATUSES: ServiceStatus[] = [ServiceStatus.SEDANG_DIKERJAKAN, ServiceStatus.REWORK];
const PART_STATUSES: ServiceStatus[] = [
  ServiceStatus.SEDANG_DIKERJAKAN,
  ServiceStatus.MENUGGU_SPAREPART,
  ServiceStatus.REWORK,
];
const LOCKED_STATUSES: ServiceStatus[] = [
  ServiceStatus.SELESAI,
  ServiceStatus.MENUGGU_PEMBAYARAN,
  ServiceStatus.SIAP_DIAMBIL,
  ServiceStatus.DIAMBIL,
  ServiceStatus.DIBATALKAN,
  ServiceStatus.TIDAK_BISA_DIPERBAIKI,
  ServiceStatus.CUSTOMER_TIDAK_MERESPON,
  ServiceStatus.BARANG_TIDAK_DIAMBIL,
  ServiceStatus.RUSAK,
];

const hasAnyPermission = (permissions: string[], keys: string[]) =>
  keys.some((key) => permissions.includes(key));

export const ServiceDetailModal: React.FC<any> = (props) => {
  const { publicBaseUrl, apiFetch, listServiceReceivables, settleServiceReceivable } = useSaaS();
  const {
    activeTenantId,
    addServiceDiagnostic,
    approveServiceEstimate,
    cameraActive,
    cancelServicePart,
    completeServiceQC,
    currentTenantId,
    currentUser,
    customWaMessageText,
    customers,
    employees,
    handoverChecklist,
    handoverServiceDevice,
    handoverPaymentMethod,
    handoverProofName,
    handoverRefNo,
    handoverTempoDays,
    internalCommentText,
    liveTimerSeconds,
    manualDiagCost,
    manualDiagNotes,
    openManualEstimateWhatsApp,
    openMicroComponentModal,
    products,
    qcNotes,
    renderTenantWaTemplate,
    requestPartMode,
    requestServicePart,
    requestedPartId,
    requestedPartQty,
    selectedPartWarehouseId,
    setSelectedPartWarehouseId,
    warehouses,
    selectedSparepartId,
    setAdditionalCostApprovedBy,
    setAdditionalCostTicket,
    setCustomWaMessageText,
    setHandoverChecklist,
    setHandoverPaymentMethod,
    setHandoverProofName,
    setHandoverRefNo,
    setHandoverTempoDays,
    setInternalCommentText,
    setManualDiagCost,
    setManualDiagNotes,
    setPartOrderTicket,
    setQcNotes,
    setRequestPartMode,
    setRequestedPartId,
    setRequestedPartQty,
    setSelectedSparepartId,
    setShowInvoicePrintout,
    setShowProvisionalQuote,
    setShowSpkPrintout,
    setShowWarrantyPrintout,
    setSparepartQty,
    setSparepartSN,
    setViewingServiceTicketId,
    showToast,
    sparepartQty,
    sparepartSN,
    startCamera,
    stopCamera,
    tenantObj,
    tenantServices,
    updateServiceStatus,
    videoRef,
     viewingServiceTicketId,
      storageLocations,
      detailLoading,
      detailError,
      onDetailUpdated,
    } = props;
  const [pendingAction, setPendingAction] = React.useState<string | null>(null);
  const [receivables, setReceivables] = React.useState<Array<{ id: string; status: string; amount: number; paidAmount: number; remaining: number; dueAt?: string }>>([]);
  const [receivableMethod, setReceivableMethod] = React.useState<'CASH' | 'BANK_TRANSFER' | 'QRIS' | 'EDC' | 'E_WALLET'>('CASH');
  const [receivableReference, setReceivableReference] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('summary');
  React.useEffect(() => {
    setActiveTab('summary');
  }, [viewingServiceTicketId]);
  const servicePhotoUrl = (value: unknown) => {
    const photo = typeof value === 'string' ? value : '';
    if (!photo || photo.startsWith('blob:') || photo.startsWith('data:') || photo.startsWith('http') || photo.startsWith('/')) return photo;
    return `/api/services/${encodeURIComponent(viewingServiceTicketId || '')}/photos/${encodeURIComponent(photo.split('/').pop() || '')}`;
  };
  const [assigningTechId, setAssigningTechId] = React.useState<string | null>(null);
  const assignmentRequestRef = React.useRef(0);
  const dialogRef = React.useRef<HTMLDivElement>(null);
   const restoreFocusRef = React.useRef<HTMLElement | null>(null);
   const closeDetail = () => {
     stopCamera();
     setViewingServiceTicketId(null);
     setInternalCommentText('');
     setManualDiagNotes('');
     setManualDiagCost('');
     setQcNotes('');
     setHandoverChecklist({ accessoriesReturned: false, customerChecked: false, invoiceReady: false, warrantyReady: false });
     setHandoverPaymentMethod(PaymentMethod.CASH);
     setHandoverProofName('');
     setHandoverRefNo('');
     setHandoverTempoDays('30');
     setSelectedSparepartId('');
     setSparepartQty(1);
     setSparepartSN('');
   };
   React.useEffect(() => {
    if (!viewingServiceTicketId) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
   }, [viewingServiceTicketId]);
   React.useEffect(() => {
    if (!viewingServiceTicketId) return;
    restoreFocusRef.current = document.activeElement as HTMLElement;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
         closeDetail();
         return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((element) => !element.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
       document.removeEventListener('keydown', onKeyDown);
       stopCamera();
        if (restoreFocusRef.current?.isConnected) restoreFocusRef.current.focus();
        restoreFocusRef.current = null;
    };
  }, [viewingServiceTicketId, setViewingServiceTicketId]);
  React.useEffect(() => {
    let cancelled = false;
    if (!viewingServiceTicketId) {
      setReceivables([]);
      return;
    }
    void listServiceReceivables(viewingServiceTicketId)
      .then((rows) => {
        if (!cancelled) setReceivables(rows);
      })
      .catch(() => {
        if (!cancelled) setReceivables([]);
      });
    return () => {
      cancelled = true;
    };
  }, [viewingServiceTicketId]);
  const runAction = async (action: string, callback: () => Promise<void> | void) => {
    if (pendingAction) return;
    setPendingAction(action);
    try {
      await callback();
    } catch (error: any) {
      showToast(error?.message || 'Aksi gagal diproses.', 'error');
    } finally {
      setPendingAction(null);
    }
  };
  if (!viewingServiceTicketId) return null;
  const ticket = tenantServices.find((s) => s.id === viewingServiceTicketId);
    if (detailLoading || detailError || !ticket) {
      return createPortal(
        <div role="dialog" aria-modal="true" aria-labelledby="service-detail-state-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
         <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-zinc-900">
            <h2 id="service-detail-state-title" className="text-sm font-black text-slate-900 dark:text-white">{detailLoading ? 'Memuat tiket…' : 'Tiket tidak ditemukan'}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400" role={detailError ? 'alert' : undefined}>{detailError || (detailLoading ? 'Mengambil detail tiket terbaru.' : 'Data tiket sudah berubah atau tidak tersedia pada cabang aktif.')}</p>
           <button type="button" onClick={closeDetail} className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">Kembali ke daftar</button>
         </div>
       </div>,
       document.body
     );
   }
  const currentUserPermissions: string[] = Array.isArray(props.currentUserPermissions)
    ? props.currentUserPermissions
    : Array.isArray(currentUser?.permissions)
      ? currentUser.permissions
      : [];
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
  const canDiagnose =
    isSuperAdmin ||
    ['OWNER', 'ADMIN', 'TEKNISI'].includes(currentUser?.role || '') ||
    hasAnyPermission(currentUserPermissions, ['service', 'service_diagnose', 'service_repair']);
  const canRepair =
    isSuperAdmin ||
    ['OWNER', 'ADMIN', 'TEKNISI'].includes(currentUser?.role || '') ||
    hasAnyPermission(currentUserPermissions, ['service', 'service_repair']);
  const canApprove =
    isSuperAdmin ||
    ['OWNER', 'ADMIN'].includes(currentUser?.role || '') ||
    hasAnyPermission(currentUserPermissions, ['service_approve']);
  const canQc =
    isSuperAdmin ||
    ['OWNER', 'ADMIN', 'TEKNISI'].includes(currentUser?.role || '') ||
    hasAnyPermission(currentUserPermissions, ['service_qc']);
  const isTicketLocked = LOCKED_STATUSES.includes(ticket.status);
  const editableIntake = INTAKE_STATUSES.includes(ticket.status) && canDiagnose;
  const editableDiagnosis = DIAGNOSIS_STATUSES.includes(ticket.status) && canDiagnose;
  const canRequestParts = PART_STATUSES.includes(ticket.status) && canRepair;
  const canHandover =
    isSuperAdmin ||
    ['OWNER', 'ADMIN', 'CS'].includes(currentUser?.role || '') ||
    hasAnyPermission(currentUserPermissions, ['service_handover']);
  const isWorkPhase = WORK_STATUSES.includes(ticket.status);
  const isQcPhase = ticket.status === ServiceStatus.QC;
  const customer = customers.find((c) => c.id === ticket.customerId);
  const technician = employees.find((e) => e.id === ticket.assignedTechId);

  // Filter products that are spare parts / accessories
  const effectiveTenantId = activeTenantId || currentTenantId;
  const tenantProducts = (products || []).filter((p: any) => p.tenantId === effectiveTenantId);
  const sparepartsList = tenantProducts.filter(
    (p: any) => {
      const name = String(p.name || '').toLowerCase();
      return (p.category &&
        ['SPAREPART', 'SUKU CADANG', 'AKSESORIS'].includes(p.category.toUpperCase())) ||
        name.includes('spare') ||
        name.includes('ic ') ||
        name.includes('layar') ||
        name.includes('baterai') ||
        name.includes('flex') ||
        name.includes('connector');
    }
  );

  // Photo capture handlers (extracted for ServiceTicketCamera component)
  const handleCapturePhoto = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx || !videoRef.current) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const file = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!file) throw new Error('Gagal menyiapkan foto.');
    const updated = await uploadServicePhoto(apiFetch, ticket.id, file);
    onDetailUpdated?.(updated);
    showToast('Foto berhasil diunggah.', 'success');
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-0 sm:p-4"
       onClick={(event) => { if (event.target === event.currentTarget) closeDetail(); }}
       role="dialog"
      aria-modal="true"
      aria-labelledby="service-detail-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl dark:bg-zinc-950 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <ServiceTicketHeader
          ticket={ticket}
          customer={customer}
          currentUserPermissions={currentUserPermissions}
          currentUserRole={currentUser?.role || UserRole.OWNER}
          onPrintSpk={() => setShowSpkPrintout(ticket.id)}
          onPrintInvoice={() => setShowInvoicePrintout(ticket.id)}
          onPrintWarranty={() => setShowWarrantyPrintout(ticket.id)}
           onClose={closeDetail}
        />

         <div className="shrink-0 border-b border-slate-200 bg-white px-3 dark:border-zinc-800 dark:bg-zinc-950 sm:px-5">
           <nav className="flex gap-1 overflow-x-auto" aria-label="Navigasi detail servis" role="tablist">
            {[
              ['summary', 'Ringkasan'],
              ['intake', 'Intake'],
              ['work', 'Pekerjaan'],
              ['parts', 'Part & Biaya'],
              ['qc', 'QC'],
              ['communication', 'Komunikasi'],
              ['history', 'Riwayat'],
             ].map(([id, label]) => (
               <button
                 key={id}
                 id={`service-tab-${id}`}
                 type="button"
                 role="tab"
                 aria-selected={activeTab === id}
                 aria-controls={`service-panel-${id}`}
                 tabIndex={activeTab === id ? 0 : -1}
                 onClick={() => setActiveTab(id)}
                 className={`shrink-0 border-b-2 px-3 py-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${activeTab === id ? 'border-accent text-accent' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white'}`}
               >
                {label}
              </button>
            ))}
          </nav>
        </div>
         {activeTab === 'summary' && <ServiceNextStepBanner status={ticket.status} />}

          <div id={`service-panel-${activeTab}`} role="tabpanel" aria-labelledby={`service-tab-${activeTab}`} className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain [&_button]:min-h-10 [&_input]:min-h-10 [&_select]:min-h-10">
           {/* LEFT PANEL: Ticket Meta Info, Checklist & Logs */}
          <div className={`space-y-3 border-slate-100 bg-gradient-to-b from-slate-50/80 to-zinc-100/50 px-3 py-3 dark:border-zinc-800 dark:from-zinc-900/80 dark:to-zinc-950/50 sm:px-5 ${['summary', 'intake', 'communication', 'history'].includes(activeTab) ? '' : 'hidden'}`}>
             {activeTab === 'summary' && <ServiceTicketSummary ticket={ticket} customer={customer} />}
             {activeTab === 'summary' && receivables.some((item) => item.status !== 'PAID' && item.remaining > 0) && (
               <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                 <h3 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">Pelunasan Piutang Servis</h3>
                 <div className="mt-3 space-y-3">
                   {receivables.filter((item) => item.status !== 'PAID' && item.remaining > 0).map((item) => (
                     <div key={item.id} className="rounded-xl border border-amber-200 bg-white p-3 dark:border-amber-900/50 dark:bg-zinc-900">
                       <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                         <span className="font-bold text-slate-700 dark:text-zinc-200">Sisa Rp {item.remaining.toLocaleString('id-ID')}</span>
                         <span className="text-slate-500">Jatuh tempo: {item.dueAt ? new Date(item.dueAt).toLocaleDateString('id-ID') : '-'}</span>
                       </div>
                       <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                         <select value={receivableMethod} onChange={(event) => setReceivableMethod(event.target.value as typeof receivableMethod)} className="rounded-lg border border-slate-200 bg-white px-3 text-xs dark:border-zinc-700 dark:bg-zinc-950">
                           <option value="CASH">Tunai</option>
                           <option value="BANK_TRANSFER">Transfer Bank</option>
                           <option value="QRIS">QRIS</option>
                           <option value="EDC">EDC</option>
                           <option value="E_WALLET">E-Wallet</option>
                         </select>
                         <input value={receivableReference} onChange={(event) => setReceivableReference(event.target.value)} placeholder="Nomor referensi (non-tunai)" className="rounded-lg border border-slate-200 px-3 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
                         <button type="button" disabled={!!pendingAction || (receivableMethod !== 'CASH' && !receivableReference.trim())} onClick={() => void runAction(`receivable-${item.id}`, async () => {
                           await settleServiceReceivable(item.id, {
                             amount: item.remaining,
                             method: receivableMethod,
                             referenceNo: receivableReference.trim() || undefined,
                             idempotencyKey: `service-receivable-${item.id}-${Date.now()}`,
                           });
                           setReceivables(await listServiceReceivables(ticket.id));
                           setReceivableReference('');
                           showToast('Piutang servis berhasil dilunasi.', 'success');
                         })} className="rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">Lunasi</button>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             )}

             <div className="relative overflow-hidden rounded-2xl border border-white/40 p-3 shadow-md dark:border-zinc-800/40">

                {/* Interactive Technician Assign / Change Dropdown */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase font-mono tracking-wider">
                    Teknisi Penanggung Jawab
                  </label>
                  <select
                    value={ticket.assignedTechId || ''}
                     disabled={!!assigningTechId || !canRepair || (
                        [
                        ServiceStatus.SELESAI,
                        ServiceStatus.SIAP_DIAMBIL,
                        ServiceStatus.DIAMBIL,
                      ] as ServiceStatus[]
                    ).includes(ticket.status)}
                    title={
                      (
                        [
                          ServiceStatus.SELESAI,
                          ServiceStatus.SIAP_DIAMBIL,
                          ServiceStatus.DIAMBIL,
                        ] as ServiceStatus[]
                      ).includes(ticket.status)
                        ? 'Teknisi dikunci setelah tiket selesai atau diserahkan'
                        : undefined
                    }
                    onChange={(e) => {
                      const selectedId = e.target.value;
                       const techName =
                         employees.find((emp) => emp.id === selectedId)?.name || 'Antrian Bebas';
                       const requestId = ++assignmentRequestRef.current;
                       setAssigningTechId(selectedId);

                       void props.patchServiceWork(ticket.id, {
                         assignedTechId: selectedId || null,
                         internalDiscussion: {
                           text: `Teknisi penanggung jawab diubah ke: ${techName}`,
                         },
                       }).then((updated: any) => {
                         if (requestId === assignmentRequestRef.current && updated) onDetailUpdated?.(updated);
                       }).catch((error: any) => {
                         if (requestId === assignmentRequestRef.current) showToast(error?.message || 'Gagal mengubah teknisi.', 'error');
                       }).finally(() => {
                         if (requestId === assignmentRequestRef.current) setAssigningTechId(null);
                       });
                    }}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-accent font-semibold cursor-pointer text-slate-700"
                  >
                    <option value="">-- Antrian Bebas (Belum Ditugaskan) --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.position})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Storage Location Selector */}
                {(() => {
                  const storageLocs = (storageLocations || getStorageLocations(activeTenantId || '')).filter(
                    (l) => l.type === 'UNIT_SERVICE'
                  );
                  return storageLocs.length > 0 ? (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase font-mono tracking-wider">
                        Lokasi Rak Penyimpanan
                      </label>
                      <select
                        value={ticket.storageLocationId || ''}
                         disabled={!canRepair || (
                           [
                            ServiceStatus.SELESAI,
                            ServiceStatus.SIAP_DIAMBIL,
                            ServiceStatus.DIAMBIL,
                          ] as ServiceStatus[]
                        ).includes(ticket.status)}
                        title={
                          (
                            [
                              ServiceStatus.SELESAI,
                              ServiceStatus.SIAP_DIAMBIL,
                              ServiceStatus.DIAMBIL,
                            ] as ServiceStatus[]
                          ).includes(ticket.status)
                            ? 'Lokasi penyimpanan dikunci setelah tiket selesai atau diserahkan'
                            : undefined
                        }
                        onChange={async (e) => {
                          try {
                            const updated = await props.patchServiceWork(ticket.id, {
                              storageLocationId: e.target.value || null,
                            });
                            if (updated) onDetailUpdated?.(updated);
                            showToast('Lokasi penyimpanan diperbarui.', 'success');
                          } catch (error: any) {
                            showToast(
                              error?.message || 'Gagal memperbarui lokasi penyimpanan.',
                              'error'
                            );
                          }
                        }}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-accent font-semibold cursor-pointer text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">— Belum Ditentukan —</option>
                        {storageLocs.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            📍 {loc.code} — {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null;
                })()}
            </div>

            {/* Section: Photos (initial photos) */}
            {ticket.initialPhotos && ticket.initialPhotos.length > 0 && (
                <div className="relative overflow-hidden p-3.5 border border-white/40 dark:border-zinc-800/40 rounded-2xl space-y-2 shadow-md">
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-rose-500/5 to-red-500/5" />
                  <h4 className="relative font-bold text-xs text-pink-600 dark:text-pink-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500" />
                    Foto Masuk
                  </h4>
                  <div className="relative grid grid-cols-2 gap-2 rounded-xl overflow-hidden border border-white/30 shadow-sm">
                    {ticket.initialPhotos.map((photo, index) => (
                      <img
                        key={`${photo}-${index}`}
                        src={servicePhotoUrl(photo)}
                        alt={`Kondisi awal ${ticket.deviceName} ${index + 1}`}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-32 object-cover"
                      />
                    ))}
                  </div>
                </div>
              )}

            {canRepair && !isTicketLocked && (
              <ServiceTicketCamera
                ticket={ticket}
                cameraActive={cameraActive}
                startCamera={startCamera}
                stopCamera={stopCamera}
                videoRef={videoRef}
                onCapture={handleCapturePhoto}

              />
            )}

             {activeTab === 'intake' && <ServiceIntakeChecklist
               items={ticket.initialChecklist}
               editable={editableIntake}
                 onSave={async (checklist) => {
                 try {
                   const updated = await patchServiceTicketScope(apiFetch, ticket.id, 'intake-checklist', { checklist });
                   onDetailUpdated?.(updated);
                   showToast('Checklist masuk berhasil disimpan.', 'success');
                 } catch (error: any) {
                   showToast(error?.message || 'Gagal menyimpan checklist masuk.', 'error');
                   throw error;
                 }
               }}
             />}

             {activeTab === 'history' && <ServiceTimeline entries={ticket.timeline} />}

               {activeTab === 'communication' && <ServiceInternalDiscussion
                ticket={ticket}
               currentUser={currentUser}
               patchServiceWork={props.patchServiceWork}
              value={internalCommentText}
              onChange={setInternalCommentText}
               canComment={canRepair && !isTicketLocked}
                onUpdated={onDetailUpdated}
              />}
           </div>

          {/* RIGHT PANEL: Interactive Workstation */}
          <div className={`flex flex-col justify-between space-y-4 px-3 py-3 sm:px-5 lg:space-y-5 ${['work', 'parts', 'qc', 'communication'].includes(activeTab) ? '' : 'hidden'}`}>
            <div className="space-y-6">
              {/* Visual Repair Workflow Stepper */}
              {activeTab === 'work' && <ServiceTicketActions
                 ticket={ticket}
                 canRequestParts={canRequestParts}
                 canAddCost={isSuperAdmin || ['OWNER', 'ADMIN'].includes(currentUser?.role || '')}
                 onPartOrder={() => setPartOrderTicket(ticket)}
                 onAdditionalCost={() => {
                   setAdditionalCostTicket(ticket);
                   setAdditionalCostApprovedBy(customer?.name || '');
                 }}
               />}

              {/* Technician Tools Center */}
              {activeTab === 'work' && canRepair && (
                <div className="relative overflow-hidden border border-white/20 dark:border-zinc-800/40 rounded-2xl p-5 shadow-lg shadow-slate-200/30 dark:shadow-zinc-900/30 space-y-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-rose-400 via-pink-400 to-orange-400 dark:from-rose-600 dark:via-pink-600 dark:to-orange-600" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-white/10" />
                  <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                  <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-white/20 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl text-white">
                        <Timer className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-black text-xs uppercase text-white tracking-widest">
                          Pusat Kendali Teknisi
                        </h4>
                        <p className="text-xs text-white/70">
                          SLA Timer, Catatan & Permintaan Suku Cadang
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Timer Controls */}
                      {(() => {
                        const slaHours = tenantObj?.settings?.serviceSettings?.slaHours || 48;
                        const slaSeconds = slaHours * 3600;
                        const isBreached =
                          liveTimerSeconds > slaSeconds &&
                          ticket.repairStartTime &&
                          !ticket.repairEndTime;
                        return (
                          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                            <span
                              className={`text-xs font-mono font-bold ${isBreached ? 'text-rose-600' : 'text-slate-700'}`}
                            >
                              {Math.floor(liveTimerSeconds / 3600)
                                .toString()
                                .padStart(2, '0')}
                              :
                              {Math.floor((liveTimerSeconds % 3600) / 60)
                                .toString()
                                .padStart(2, '0')}
                              :{(liveTimerSeconds % 60).toString().padStart(2, '0')}
                            </span>
                            {isBreached && (
                              <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full animate-pulse">
                                SLA BREACH
                              </span>
                            )}
                            {!(
                              [
                                ServiceStatus.SEDANG_DIKERJAKAN,
                                ServiceStatus.REWORK,
                              ] as ServiceStatus[]
                            ).includes(ticket.status) ? (
                              <span
                                className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded"
                                title="Timer hanya tersedia saat pengerjaan atau rework"
                              >
                                Belum Tahap Pengerjaan
                              </span>
                            ) : !ticket.repairStartTime ? (
                              <button
                                onClick={() =>
                                   void runAction('repair-start', async () => {
                                     const updated = await props.patchServiceWork(ticket.id, {
                                       repairStartTime: new Date().toISOString(),
                                     });
                                     if (updated) onDetailUpdated?.(updated);
                                   })
                                }
                                 disabled={!!pendingAction}
                                 className="text-xs font-bold bg-emerald-600 text-white px-2 py-1 rounded shadow-xs cursor-pointer hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Mulai Servis
                              </button>
                            ) : !ticket.repairEndTime ? (
                              <button
                                onClick={() =>
                                   void runAction('repair-end', async () => {
                                     const updated = await props.patchServiceWork(ticket.id, {
                                       repairEndTime: new Date().toISOString(),
                                     });
                                     if (updated) onDetailUpdated?.(updated);
                                   })
                                }
                                 disabled={!!pendingAction}
                                 className="text-xs font-bold bg-rose-600 text-white px-2 py-1 rounded shadow-xs cursor-pointer hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Hentikan Waktu
                              </button>
                            ) : (
                              <span className="text-xs font-bold text-slate-400 bg-slate-200 px-2 py-1 rounded">
                                Selesai
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {/* Catatan Internal Teknisi */}
                    <div className="space-y-2">
                      <label className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase">
                        <span>Catatan Teknis (Internal)</span>
                        <span className="text-accent bg-accent-lighter px-1.5 py-0.5 rounded">
                          Admin/Teknisi Saja
                        </span>
                      </label>
                      <textarea
                        key={ticket.id}
                        defaultValue={ticket.technicianNotes || ''}
                        onBlur={async (event) => {
                          try {
                            await props.patchServiceWork(ticket.id, {
                              technicianNotes: event.target.value,
                            });
                          } catch (error: any) {
                            showToast(
                              error?.message || 'Gagal menyimpan catatan teknisi.',
                              'error'
                            );
                          }
                        }}
                        placeholder="Tulis kendala teknis atau catatan skema di sini..."
                        className="w-full h-24 p-3 text-xs border border-slate-200 rounded-xl focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-none"
                      />
                    </div>

                    {/* Permintaan Sparepart & Skema */}
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openMicroComponentModal(ticket)}
                          disabled={
                            !(
                              [
                                ServiceStatus.DIAGNOSA,
                                ServiceStatus.SEDANG_DIKERJAKAN,
                                ServiceStatus.REWORK,
                              ] as ServiceStatus[]
                            ).includes(ticket.status)
                          }
                          title={
                            !(
                              [
                                ServiceStatus.DIAGNOSA,
                                ServiceStatus.SEDANG_DIKERJAKAN,
                                ServiceStatus.REWORK,
                              ] as ServiceStatus[]
                            ).includes(ticket.status)
                              ? 'Komponen hanya dapat dipakai saat diagnosis atau pengerjaan'
                              : undefined
                          }
                          className="flex-1 flex flex-col items-center justify-center p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer group disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Search className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform mb-1" />
                          <span className="text-xs font-bold text-slate-700">
                            Cari Komponen
                          </span>
                          <span className="text-xs text-slate-400">
                            Pencarian Kompatibilitas
                          </span>
                        </button>
                        <button
                              onClick={() => setRequestPartMode(!requestPartMode)}
                              disabled={
                                !(
                                  [
                                    ServiceStatus.SEDANG_DIKERJAKAN,
                                    ServiceStatus.MENUGGU_SPAREPART,
                                    ServiceStatus.REWORK,
                                  ] as ServiceStatus[]
                                ).includes(ticket.status)
                              }
                          title={
                            !(
                              [
                                ServiceStatus.SEDANG_DIKERJAKAN,
                                ServiceStatus.MENUGGU_SPAREPART,
                                ServiceStatus.REWORK,
                              ] as ServiceStatus[]
                            ).includes(ticket.status)
                              ? 'Sparepart hanya dapat diminta saat pengerjaan'
                              : undefined
                          }
                          className="flex-1 flex flex-col items-center justify-center p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer group disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <PackagePlus className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform mb-1" />
                          <span className="text-xs font-bold text-slate-700">
                            Request Sparepart
                          </span>
                          <span className="text-xs text-slate-400">Dari Gudang</span>
                        </button>
                      </div>

                      {requestPartMode && (
                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2 animate-fadeIn">
                          <select
                            aria-label="Pilih sparepart"
                            value={requestedPartId}
                            onChange={(e) => setRequestedPartId(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-slate-200"
                          >
                            <option value="">-- Pilih Sparepart --</option>
                            {sparepartsList.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (Stok: {p.stockQty ?? p.stock ?? 0})
                              </option>
                            ))}
                          </select>
                           <select
                             aria-label="Gudang spare part"
                             value={selectedPartWarehouseId}
                             onChange={(e) => setSelectedPartWarehouseId(e.target.value)}
                             className="w-full text-xs p-2 rounded-lg border border-slate-200"
                           >
                             <option value="">-- Pilih Gudang --</option>
                             {warehouses.filter((warehouse) => warehouse.tenantId === effectiveTenantId && warehouse.branchId === (ticket.branchId || props.currentBranchId)).map((warehouse) => (
                               <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                             ))}
                           </select>
                           <div className="flex gap-2">
                              <input
                               aria-label="Jumlah sparepart"
                               type="number"
                              min="1"
                              value={requestedPartQty}
                              onChange={(e) => setRequestedPartQty(parseInt(e.target.value) || 1)}
                              className="w-20 text-xs p-2 rounded-lg border border-slate-200"
                            />
                            <button
                              onClick={() => void runAction('request-part', async () => {
                                const part = sparepartsList.find(
                                  (item) => item.id === requestedPartId
                                );
                                 const warehouseId = selectedPartWarehouseId;
                                 if (!part || !warehouseId || requestedPartQty <= 0) {
                                  showToast('Pilih spare part dan gudang yang valid.', 'error');
                                  return;
                                }
                                 try {
                                   const updated = await requestServicePart(ticket.id, {
                                     productId: part.id,
                                     warehouseId,
                                     quantity: requestedPartQty,
                                   });
                                   if (updated) onDetailUpdated?.(updated);
                                   setRequestedPartId('');
                                  setRequestPartMode(false);
                                  showToast(
                                    'Spare part berhasil direservasi dari gudang.',
                                    'success'
                                  );
                                } catch (error: any) {
                                  showToast(
                                    error?.message || 'Gagal mereservasi spare part.',
                                    'error'
                                  );
                                }
                              })}
                              disabled={!!pendingAction || !canRequestParts}
                              className="flex-1 bg-emerald-600 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-emerald-700"
                            >
                              Kirim Permintaan
                            </button>
                          </div>
                        </div>
                      )}

                      {ticket.microComponentUsages && ticket.microComponentUsages.length > 0 && (
                        <div className="rounded-xl border border-indigo-100 bg-accent-lighter/40 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-indigo-800 uppercase">
                              Komponen Mikro Terpakai
                            </span>
                            <span className="text-xs text-indigo-500">
                              {ticket.microComponentUsages.length} item
                            </span>
                          </div>
                          {ticket.microComponentUsages.map((usage) => (
                            <div
                              key={usage.id}
                              className="flex items-start justify-between gap-3 rounded-lg bg-white border border-indigo-100 px-2.5 py-2"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-700">
                                  {usage.name} × {usage.quantity}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {usage.chargeable
                                    ? `Ditagihkan Rp ${usage.chargeTotal.toLocaleString('id-ID')}`
                                    : 'Pemakaian internal'}
                                </p>
                              </div>
                              <span className="text-xs font-semibold text-slate-500">
                                HPP Rp {usage.hppTotal.toLocaleString('id-ID')}
                              </span>
                            </div>
                          ))}
                          <div className="pt-1 border-t border-indigo-100 grid grid-cols-2 gap-2 text-xs">
                            <span>
                              Total HPP:{' '}
                              <strong>
                                Rp{' '}
                                {ticket.microComponentUsages
                                  .reduce((sum, item) => sum + item.hppTotal, 0)
                                  .toLocaleString('id-ID')}
                              </strong>
                            </span>
                            <span className="text-right">
                              Ditagihkan:{' '}
                              <strong className="text-accent">
                                Rp{' '}
                                {ticket.microComponentUsages
                                  .reduce(
                                    (sum, item) => sum + (item.chargeable ? item.chargeTotal : 0),
                                    0
                                  )
                                  .toLocaleString('id-ID')}
                              </strong>
                            </span>
                          </div>
                        </div>
                      )}

                      {/* List of active requests */}
                      {ticket.partsRequested && ticket.partsRequested.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-500">
                            Status Permintaan Part:
                          </span>
                          <div className="space-y-1">
                            {ticket.partsRequested.map((req) => {
                              const pName =
                                sparepartsList.find((x) => x.id === req.sparepartId)?.name ||
                                'Unknown Part';
                              return (
                                <div
                                  key={req.id}
                                  className="flex items-center justify-between bg-slate-50 border border-slate-100 p-1.5 rounded-md text-xs"
                                >
                                  <span className="truncate pr-2 font-medium">
                                    {pName} (x{req.qty})
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded font-bold ${
                                      req.status === 'PENDING'
                                        ? 'bg-amber-100 text-amber-700'
                                        : req.status === 'APPROVED'
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : 'bg-rose-100 text-rose-700'
                                    }`}
                                  >
                                    {req.status}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Interactive Testing & Checklist Center (Pre-Service & Post-Service QC) */}
                  {activeTab === 'qc' && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="rounded-xl bg-slate-100 p-2 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-zinc-100">
                        Pengujian & Checklist
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        Verifikasi kelayakan
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold font-mono text-slate-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                    {technician?.name || 'Belum Ditugaskan'}
                  </span>
                </div>

                  <div className="grid grid-cols-1 gap-6">
                   {/* QC is available only after the repair enters QC or returns for rework. */}
                  {ticket.status === 'QC' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <span className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                          Post-Service (Pengujian QC)
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          {ticket.qcChecklist
                            ? ticket.qcChecklist.filter((x) => x.passed).length
                            : 0}{' '}
                          / {ticket.qcChecklist ? ticket.qcChecklist.length : 10} Passed
                        </span>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                        {(() => {
                          // Get or auto-initialize qcChecklist
                          const currentQcList =
                            ticket.qcChecklist && ticket.qcChecklist.length > 0
                              ? ticket.qcChecklist
                              : [
                                  {
                                    criteria: 'Pengujian Pengisian Daya (Charging Test)',
                                    passed: false,
                                  },
                                  {
                                    criteria: 'Uji Ketahanan Baterai (Battery Burn Test)',
                                    passed: false,
                                  },
                                  {
                                    criteria: 'Kalibrasi Layar / Warna (Display Quality)',
                                    passed: false,
                                  },
                                  {
                                    criteria: 'Uji Sensitivitas Sentuh (Touch Response)',
                                    passed: false,
                                  },
                                  {
                                    criteria: 'Uji Suara & Mikrofon (Audio & Mic Test)',
                                    passed: false,
                                  },
                                  {
                                    criteria: 'Uji Suhu & Kipas (Thermal Stress Test)',
                                    passed: false,
                                  },
                                  {
                                    criteria: 'Uji Sinyal Wi-Fi / Seluler',
                                    passed: false,
                                  },
                                  {
                                    criteria: 'Pengecekan Baut & Casing Rapat',
                                    passed: false,
                                  },
                                  {
                                    criteria: 'Sistem Bersih dari Debu',
                                    passed: false,
                                  },
                                  {
                                    criteria: 'Uji Port Input/Output (I/O Ports)',
                                    passed: false,
                                  },
                                ];

                          return (
                            <div className="space-y-1.5">
                              {currentQcList.map((item, idx) => {
                                return (
                                  <label
                                    key={idx}
                                    className={`flex items-center justify-between text-xs p-2 rounded-lg border cursor-pointer select-none transition-all duration-200 ${
                                      item.passed
                                        ? 'bg-emerald-50/40 border-emerald-100 text-emerald-800 font-medium'
                                        : 'bg-rose-50/30 border-rose-200 text-rose-800'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <input
                                        type="checkbox"
                                         checked={item.passed}
                                         disabled={!!pendingAction}
                                         onChange={() => {
                                          const updatedList = currentQcList.map((c, i) =>
                                            i === idx
                                              ? {
                                                  ...c,
                                                  passed: !c.passed,
                                                }
                                              : c
                                          );

                                           void runAction('qc-draft', async () => {
                                             const updated = await patchServiceTicketScope(apiFetch, ticket.id, 'qc-draft', {
                                               checklist: updatedList,
                                             });
                                             onDetailUpdated?.(updated);
                                           });
                                        }}
                                        className="accent-emerald-600 h-3.5 w-3.5 rounded"
                                      />
                                      <span className="truncate">{item.criteria}</span>
                                    </div>
                                    <span
                                      className={`text-xs font-mono font-bold uppercase px-1.5 py-0.5 rounded-full ${
                                        item.passed
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-rose-100 text-rose-800'
                                      }`}
                                    >
                                      {item.passed ? 'LULUS' : 'BELUM DIUJI'}
                                    </span>
                                  </label>
                                );
                              })}

                              {/* Sync button to restore qcChecklist if requested */}
                              {(!ticket.qcChecklist || ticket.qcChecklist.length === 0) && (
                                <div className="pt-2 text-center">
                                  <button
                                    type="button"
                                      onClick={() => void runAction('qc-draft', async () => {
                                        const updated = await patchServiceTicketScope(apiFetch, ticket.id, 'qc-draft', {
                                          checklist: currentQcList,
                                        });
                                        onDetailUpdated?.(updated);
                                      })}
                                     disabled={!!pendingAction}
                                    className="w-full bg-accent-lighter border border-indigo-100 text-accent rounded-lg py-1.5 text-xs font-bold hover:bg-indigo-100/50 cursor-pointer transition-all"
                                  >
                                    Simpan Checklist QC Standar (10 Pengujian)
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>}

              {/* QC Inline Form — inside ticket detail modal */}
              {activeTab === 'qc' && ticket.status === 'QC' && (
                <div className="relative overflow-hidden border border-white/20 dark:border-zinc-800/40 rounded-2xl p-4 shadow-lg shadow-slate-200/30 dark:shadow-zinc-900/30 space-y-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-400 via-cyan-400 to-sky-400 dark:from-teal-600 dark:via-cyan-600 dark:to-sky-600" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-white/10" />
                  <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                  <div className="relative flex items-center justify-between border-b border-white/20 pb-2">
                    <h4 className="font-black text-xs text-white uppercase tracking-widest flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Quality Control (QC)
                    </h4>
                    <span className="text-xs font-mono font-bold text-white/70 uppercase">
                      #{ticket.ticketNo}
                    </span>
                  </div>
                   <div>
                     <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                       Catatan Pemeriksaan
                     </label>
                     <textarea
                       rows={3}
                       placeholder="cth: Keyboard normal, speaker jernih, suhu idle 45 C pasca repasting."
                       value={qcNotes}
                       onChange={(e) => setQcNotes(e.target.value)}
                       className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-accent"
                     />
                   </div>
                  <div className="flex gap-2">
                    <button
                       onClick={() => void runAction('qc-rework', async () => {
                         const updated = await completeServiceQC(ticket.id, qcNotes, ticket.qcChecklist);
                         if (updated) onDetailUpdated?.(updated);
                       })}
                       disabled={
                         !!pendingAction ||
                         !canQc ||
                         qcNotes.trim().length < 2 ||
                         !ticket.qcChecklist?.length ||
                         ticket.qcChecklist.every((item) => item.passed)
                       }
                       title={
                         ticket.qcChecklist?.length && ticket.qcChecklist.every((item) => item.passed)
                           ? 'Tandai minimal satu pemeriksaan gagal untuk mengirim tiket ke rework.'
                           : undefined
                       }
                       className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs py-2 rounded-lg cursor-pointer border border-rose-200"
                    >
                      Rework (Gagal QC)
                    </button>
                    <button
                      disabled={
                         !!pendingAction ||
                         !canQc ||
                         qcNotes.trim().length < 2 ||
                        !ticket.qcChecklist?.length ||
                        ticket.qcChecklist.some((item) => !item.passed)
                      }
                      title={
                        qcNotes.trim().length < 2
                          ? 'Catatan pemeriksaan wajib diisi.'
                          : !ticket.qcChecklist?.length
                            ? 'Simpan checklist QC terlebih dahulu.'
                            : ticket.qcChecklist.some((item) => !item.passed)
                              ? 'Semua pemeriksaan QC harus lulus.'
                              : ''
                      }
                         onClick={() => void runAction('qc-pass', async () => {
                           const updated = await completeServiceQC(ticket.id, qcNotes, ticket.qcChecklist);
                           if (updated) onDetailUpdated?.(updated);
                         })}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-xs py-2 rounded-lg cursor-pointer"
                    >
                      Lolos QC (Selesai)
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'work' && editableDiagnosis && (
                <div className="relative overflow-hidden border border-slate-200 p-4 rounded-2xl space-y-4 shadow-sm dark:border-zinc-800">
                    <div className="absolute inset-0 bg-slate-50 dark:bg-zinc-900" />
                    <h4 className="relative font-black text-xs text-slate-700 dark:text-zinc-200 uppercase font-mono tracking-wider flex items-center gap-1.5 border-b border-slate-200/50 dark:border-zinc-700/50 pb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-slate-500 to-zinc-500" />
                      Analisa Kerusakan Teknis
                    </h4>

                    <div>
                      <label className="block text-xs font-mono text-slate-400 uppercase mb-0.5">
                        Diagnosa Masalah Perangkat
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Masukkan hasil diagnosa teknisi secara detail..."
                        value={manualDiagNotes}
                        onChange={(e) => setManualDiagNotes(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-accent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-mono text-slate-400 uppercase mb-0.5">
                          Estimasi Biaya Jasa Servis
                        </label>
                        <input
                          type="number"
                          placeholder="Rp..."
                          value={manualDiagCost}
                          onChange={(e) => setManualDiagCost(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-accent"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                              onClick={() => void runAction('diagnosis', async () => {
                                const estCost = Number(manualDiagCost || 0);
                            if (!manualDiagNotes.trim()) {
                              showToast('Catatan diagnosis wajib diisi.', 'error');
                              return;
                            }
                               if (!Number.isFinite(estCost) || estCost < 0) {
                                 showToast('Estimasi biaya harus berupa angka tidak negatif.', 'error');
                                 return;
                               }
                               const updated = await addServiceDiagnostic(
                                 ticket.id,
                                 manualDiagNotes,
                                 estCost,
                                 ticket.partsRequested || ticket.partsUsed || []
                               );
                               if (updated) onDetailUpdated?.(updated);
                              showToast(
                                'Diagnosa teknis berhasil disimpan dan penawaran siap dikirim.',
                                'success'
                              );
                              const sendingMethod =
                                tenantObj?.settings?.waConfig?.sendingMethod || 'MANUAL';
                              if (sendingMethod === 'MANUAL') {
                                openManualEstimateWhatsApp(
                                  ticket,
                                  manualDiagNotes,
                                  estCost,
                                  ticket.partsRequested || ticket.partsUsed || []
                                );
                              } else {
                                showToast('Penawaran dimasukkan ke antrean WhatsApp API.', 'info');
                              }
                          })}
                          disabled={!!pendingAction}
                          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 rounded-lg cursor-pointer text-center transition-all shadow-xs"
                        >
                          Simpan Diagnosa & Kirim Penawaran
                        </button>
                      </div>
                    </div>
                  </div>
              )}

                {activeTab === 'parts' && <ServicePartsLedger
                  ticket={ticket}
                 canCancel={canRepair && !isTicketLocked}
                 onCancelPart={async (part) => {
                  const reservationId = part.reservationId || part.requestId || part.id;
                  if (!reservationId) {
                    showToast('ID reservasi spare part tidak tersedia.', 'error');
                    return;
                  }
                  try {
                    const updated = await cancelServicePart(ticket.id, reservationId);
                    if (updated) onDetailUpdated?.(updated);
                    showToast(`Reservasi ${part.name} dibatalkan.`, 'success');
                  } catch (error: any) {
                    showToast(error?.message || 'Gagal membatalkan spare part.', 'error');
                  }
                }}
              />}

              {/* Section 3: Manual Status & Workflow Controller */}
              {activeTab === 'work' && <div className="relative overflow-hidden border border-white/20 dark:border-zinc-800/40 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-md">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5" />
                <div className="relative space-y-3">
                  <h4 className="font-black text-xs text-indigo-700 dark:text-indigo-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                    Aksi Utama Alur Servis
                  </h4>

                </div>

                {/* Status action buttons depending on flow */}
                <div className="flex flex-col justify-end space-y-2">
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-mono">
                    Tindakan Alur Kerja Cepat:
                  </p>

                  {ticket.status === ServiceStatus.DIAGNOSA && (
                    <div className="space-y-2">
                      <button
                         disabled={!!pendingAction || !canRepair}
                           onClick={() =>
                            void runAction('submit-estimate', async () => {
                              const updated = await updateServiceStatus(
                             ticket.id,
                             ServiceStatus.MENUGGU_APPROVAL,
                              'Teknisi merumuskan estimasi biaya dan menunggu persetujuan pelanggan.'
                              );
                              if (updated) onDetailUpdated?.(updated);
                            })
                         }
                         className="w-full bg-accent hover:bg-accent-hover text-white font-bold text-xs py-2 rounded-lg cursor-pointer text-center disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Ajukan Estimasi Biaya ke Pelanggan
                      </button>
                      <button
                        onClick={() => setShowProvisionalQuote(ticket.id)}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <FileText className="w-4 h-4" /> Terbitkan Quote Estimasi
                      </button>
                    </div>
                  )}

                  {(ticket.status === ServiceStatus.ESTIMATE_PENDING ||
                    ticket.status === ServiceStatus.MENUGGU_APPROVAL) && (
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          const phone = normalizeIndonesianPhone(customer?.phone || '');
                          const est = Number(ticket.estimatedCost) || 0;
                          const approvalLink = `${publicBaseUrl}/?tab=service&sub=approve-quote&ticket=${encodeURIComponent(ticket.ticketNo)}`;
                          const msg =
                            `Halo *${customer?.name || 'Pelanggan'}*, unit *${ticket.deviceName}* ` +
                            `(Tiket *${ticket.ticketNo}*) memerlukan perbaikan ` +
                            `dengan estimasi biaya *Rp ${est.toLocaleString('id-ID')}*. ` +
                            `Silakan tinjau dan setujui estimasi melalui portal resmi kami:\n${approvalLink}\n\n` +
                            `Terima kasih.`;
                          window.open(
                            `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
                            '_blank',
                          );
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-lg cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <MessageCircle className="w-4 h-4" /> Kirim Estimasi via WhatsApp
                      </button>
                      <button
                        onClick={() => setShowProvisionalQuote(ticket.id)}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2.5 rounded-lg cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <FileText className="w-4 h-4" /> 📄 Pratinjau Surat Penawaran (Provisional
                        Quote)
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                           onClick={() => void runAction('approve-estimate', async () => {
                             const updated = await approveServiceEstimate(ticket.id, true);
                             if (updated) onDetailUpdated?.(updated);
                           })}
                          disabled={!!pendingAction}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer text-center"
                        >
                          Catat Disetujui Pelanggan
                        </button>
                        <button
                           onClick={() => void runAction('reject-estimate', async () => {
                             const updated = await approveServiceEstimate(ticket.id, false);
                             if (updated) onDetailUpdated?.(updated);
                           })}
                          disabled={!!pendingAction}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer text-center"
                        >
                          Catat Ditolak Pelanggan
                        </button>
                      </div>
                    </div>
                  )}

                  {ticket.status === ServiceStatus.SEDANG_DIKERJAKAN && (
                    <button
                         onClick={() => void runAction('enter-qc', async () => {
                          const updated = await updateServiceStatus(
                           ticket.id,
                           ServiceStatus.QC,
                            'Unit masuk pemeriksaan quality control.'
                          );
                          if (updated) onDetailUpdated?.(updated);
                          setQcNotes(updated?.qcNotes ?? ticket.qcNotes ?? '');
                       })}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer text-center flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" /> Buka Panel Quality Control (QC)
                    </button>
                  )}

                  {['SELESAI', 'MENUGGU_PEMBAYARAN', 'SIAP_DIAMBIL'].includes(ticket.status) &&
                    (() => {
                      const isRefOrProofRequired =
                        handoverPaymentMethod !== PaymentMethod.CASH &&
                        handoverPaymentMethod !== PaymentMethod.TEMPO;
                       const isHandoverValid = !isRefOrProofRequired || handoverRefNo.trim() !== '' || handoverProofName.trim() !== '';

                      const estCost = Number(ticket.estimatedCost) || 0;
                      const taxSettings = tenantObj?.settings?.taxSettings;
                      const tenantTaxRate = taxSettings?.taxEnabled
                        ? Math.max(0, Number(taxSettings.taxRate) || 0)
                        : 0;
                      const taxAmt = Math.round(
                        taxSettings?.taxInclusive && tenantTaxRate > 0
                          ? estCost - estCost / (1 + tenantTaxRate / 100)
                          : estCost * (tenantTaxRate / 100)
                      );
                      const totalAmt = taxSettings?.taxInclusive ? estCost : estCost + taxAmt;
                      const downPayment = Number(ticket.downPayment) || 0;
                      const amountDue = Math.max(0, totalAmt - downPayment);
                      const targetAccountLabel =
                        handoverPaymentMethod === PaymentMethod.TEMPO
                          ? '10300 - Piutang Usaha'
                          : handoverPaymentMethod === PaymentMethod.CASH
                            ? '10100 - Kas Utama'
                            : '10200 - Bank / Payment Gateway';
                      const warrantyEndsPreview = new Date(
                        Date.now() + (ticket.warrantyMonths || 0) * 30 * 24 * 60 * 60 * 1000
                      )
                        .toISOString()
                        .split('T')[0];
                      const partsImpact = ticket.partsUsed || [];
                      const isChecklistComplete = Object.values(handoverChecklist).every(Boolean);

                      return (
                        <div id="service-handover" className="space-y-3.5 border border-slate-200/85 p-4 rounded-xl bg-slate-50/70 w-full text-left shadow-sm">
                          <div className="flex justify-between items-center bg-accent-lighter/50 border border-indigo-100/60 p-3 rounded-lg text-xs font-semibold text-slate-700">
                            <span className="text-slate-600">
                              Sisa Pelunasan setelah DP (PPN {tenantTaxRate}%):
                            </span>
                            <span className="text-accent font-mono text-sm font-bold">
                              Rp {amountDue.toLocaleString()}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                              Metode Pembayaran Pelunasan
                            </label>
                            <select
                              value={handoverPaymentMethod}
                              onChange={(e) => {
                                setHandoverPaymentMethod(e.target.value as PaymentMethod);
                                // Reset other states on method change
                                setHandoverRefNo('');
                                setHandoverProofName('');
                              }}
                              className="block w-full text-xs px-2.5 py-2 border border-slate-200 bg-white rounded-lg outline-none focus:border-accent font-medium text-slate-700 shadow-xs"
                            >
                              <option value={PaymentMethod.CASH}>
                                💵 CASH / TUNAI (Kas Utama)
                              </option>
                              <option value={PaymentMethod.BANK_TRANSFER}>
                                🏦 TRANSFER BANK (Bank Mandiri)
                              </option>
                              <option value={PaymentMethod.QRIS}>📱 QRIS (Bank Mandiri)</option>
                              <option value={PaymentMethod.EDC}>
                                💳 DEBIT / EDC (Bank Mandiri)
                              </option>
                              <option value={PaymentMethod.E_WALLET}>
                                👛 E-WALLET (Bank Mandiri)
                              </option>
                              <option value={PaymentMethod.TEMPO}>
                                ⏳ TEMPO / BAYAR NANTI (Piutang Usaha)
                              </option>
                            </select>
                          </div>

                          {handoverPaymentMethod === PaymentMethod.TEMPO && (
                            <div className="space-y-2.5 animate-fadeIn">
                              <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                                  Termin Jatuh Tempo (Hari)
                                </label>
                                <select
                                  value={handoverTempoDays}
                                  onChange={(e) => setHandoverTempoDays(e.target.value)}
                                  className="block w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-accent font-medium text-slate-700 shadow-xs"
                                >
                                  <option value="15">15 Hari</option>
                                  <option value="30">30 Hari (Default)</option>
                                  <option value="45">45 Hari</option>
                                  <option value="60">60 Hari</option>
                                </select>
                              </div>
                              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-800 leading-relaxed shadow-3xs">
                                📌 <strong>Informasi Piutang & Pinjaman</strong>: Penyerahan dengan
                                status tempo akan mencatat piutang customer sebesar{' '}
                                <strong>Rp {amountDue.toLocaleString()}</strong> ke akun{' '}
                                <strong>10300 - Piutang Usaha B2B</strong>. Transaksi kas tidak
                                bertambah sampai pembayaran piutang dilunasi oleh pelanggan di modul
                                keuangan.
                              </div>
                            </div>
                          )}

                          {isRefOrProofRequired && (
                            <div className="space-y-3 border-t border-slate-200/80 pt-3 animate-fadeIn">
                              <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                                  Nomor Referensi Transaksi{' '}
                                  <span className="text-rose-500 font-bold">*</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder="Contoh: TRX-1029302 atau No. Rek / Slip"
                                  value={handoverRefNo}
                                  onChange={(e) => setHandoverRefNo(e.target.value)}
                                  className="block w-full text-xs px-2.5 py-2 border border-slate-200 bg-white rounded-lg outline-none focus:border-accent font-medium text-slate-700 shadow-xs"
                                />
                              </div>

                              {!isHandoverValid && (
                                <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-600 font-medium leading-relaxed">
                                  ⚠️ <strong>Validasi Gagal</strong>: Harap masukkan Nomor Referensi
                                   sebagai prasyarat status 'Unit Diambil'.
                                </div>
                              )}
                            </div>
                          )}

                          <div className="border border-amber-200 bg-amber-50/80 rounded-xl p-3 space-y-2">
                            <p className="text-xs font-black text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                              <ListChecks className="w-3.5 h-3.5" /> Checklist Serah Terima Unit
                            </p>
                            <p className="text-xs text-amber-700 leading-relaxed">
                              Pastikan semua item berikut terpenuhi sebelum klik tombol handover.
                            </p>
                            {[
                              {
                                key: 'accessoriesReturned',
                                label: 'Charger / adaptor dan aksesoris dikembalikan',
                              },
                              { key: 'customerChecked', label: 'Customer sudah cek kondisi unit' },
                              { key: 'invoiceReady', label: 'Invoice pembayaran sudah dicetak' },
                              { key: 'warrantyReady', label: 'Kartu garansi sudah dicetak' },
                            ].map(({ key, label }) => (
                              <label
                                key={key}
                                className="flex items-start gap-2 cursor-pointer group"
                              >
                                <input
                                  type="checkbox"
                                  checked={(handoverChecklist as any)[key]}
                                  onChange={(e) =>
                                    setHandoverChecklist((prev) => ({
                                      ...prev,
                                      [key]: e.target.checked,
                                    }))
                                  }
                                  className="mt-0.5 w-3.5 h-3.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                />
                                <span className="text-xs font-medium text-slate-600 group-hover:text-amber-800 transition-colors leading-tight">
                                  {label}
                                </span>
                              </label>
                            ))}
                            {Object.values(handoverChecklist).some((v) => !v) && (
                              <div className="p-1.5 bg-amber-100/80 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
                                ⚠️ Centang semua item sebelum menyelesaikan handover.
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-slate-200/80 pt-3">
                            <div className="bg-white border border-indigo-100 rounded-xl p-3 shadow-xs">
                              <p className="text-xs font-black text-accent uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Receipt className="w-3.5 h-3.5" /> Preview Jurnal Otomatis
                              </p>
                              <div className="space-y-1.5 text-xs font-mono text-slate-600">
                                <div className="flex justify-between gap-3">
                                  <span>Debit {targetAccountLabel}</span>
                                  <strong>Rp {amountDue.toLocaleString()}</strong>
                                </div>
                                <div className="flex justify-between gap-3">
                                  <span>Kredit Pendapatan Servis</span>
                                  <strong>Rp {amountDue.toLocaleString()}</strong>
                                </div>
                                <div className="flex justify-between gap-3 text-slate-400">
                                  <span>Termasuk PPN {tenantTaxRate}%</span>
                                  <strong>Rp {taxAmt.toLocaleString()}</strong>
                                </div>
                              </div>
                            </div>
                            <div className="bg-white border border-emerald-100 rounded-xl p-3 shadow-xs">
                              <p className="text-xs font-black text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5" /> Preview Garansi & Status
                              </p>
                              <div className="space-y-1.5 text-xs font-mono text-slate-600">
                                <div className="flex justify-between gap-3">
                                  <span>Status Tiket</span>
                                  <strong>DIAMBIL</strong>
                                </div>
                                <div className="flex justify-between gap-3">
                                  <span>Garansi Aktif Sampai</span>
                                  <strong>{warrantyEndsPreview}</strong>
                                </div>
                                <div className="flex justify-between gap-3">
                                  <span>Kartu Garansi</span>
                                  <strong>Terkirim</strong>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white border border-amber-100 rounded-xl p-3 shadow-xs">
                            <p className="text-xs font-black text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5" /> Preview Stok Sparepart Keluar
                            </p>
                            {partsImpact.length > 0 ? (
                              <div className="space-y-1.5">
                                {partsImpact.map((part: any, idx: number) => (
                                  <div
                                    key={`${part.productId || part.name}-${idx}`}
                                    className="flex justify-between gap-3 text-xs font-mono text-slate-600"
                                  >
                                    <span className="truncate">
                                      {part.name || part.productName || part.productId}
                                    </span>
                                    <strong>-{part.quantity || part.qty || 0} pcs</strong>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500">
                                Tidak ada sparepart tercatat. Handover hanya membuat jurnal
                                pendapatan, pembayaran, dan garansi.
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => void runAction('handover', async () => {
                              if (isRefOrProofRequired && !isHandoverValid) {
                                showToast(
                                  'Gagal memproses: Nomor referensi transaksi diperlukan!',
                                  'error'
                                );
                                return;
                              }
                              const detailsObj = {
                                refNo: handoverRefNo.trim() || undefined,
                                proofName: handoverProofName.trim() || undefined,
                                tempoDays:
                                  handoverPaymentMethod === PaymentMethod.TEMPO
                                    ? parseInt(handoverTempoDays, 10)
                                    : undefined,
                                checklist: handoverChecklist,
                                taxRate: tenantTaxRate,
};

                               const updated = await handoverServiceDevice(
                                   ticket.id,
                                   handoverPaymentMethod,
                                   detailsObj
                                 );
                               if (updated) onDetailUpdated?.(updated);
                                // Only reset form after the API succeeds.
                                setHandoverRefNo('');
                                setHandoverProofName('');
                                setHandoverTempoDays('30');
                                setHandoverChecklist({
                                  accessoriesReturned: false,
                                  customerChecked: false,
                                  invoiceReady: false,
                                  warrantyReady: false,
                                });
                             })}
                             disabled={
                               !!pendingAction || !canHandover ||
                               (isRefOrProofRequired && !isHandoverValid) || !isChecklistComplete
                             }
                            className={`w-full font-bold text-xs py-2.5 rounded-lg text-center transition-all duration-200 ${
                              (isRefOrProofRequired && !isHandoverValid) || !isChecklistComplete
                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                : 'bg-accent hover:bg-accent-hover text-white cursor-pointer'
                            }`}
                          >
                            Konfirmasi Handover & Sinkronkan Accounting
                          </button>
                        </div>
                      );
                    })()}

                  {ticket.status === 'DIAMBIL' && (
                    <div className="w-full border border-emerald-200 bg-emerald-50/80 rounded-xl p-3 space-y-3 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5" /> Dokumen Siap Dicetak
                          </p>
                          <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                            Unit sudah handover. Invoice pembayaran dan kartu garansi siap diberikan
                            ke customer.
                          </p>
                        </div>
                        <span className="text-xs font-mono font-bold bg-white text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                          DIAMBIL
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          onClick={() => setShowInvoicePrintout(ticket.id)}
                          className="px-3 py-2 bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                        >
                          <FileText className="w-3.5 h-3.5" /> Cetak Invoice Pembayaran
                        </button>
                        <button
                          onClick={() => setShowWarrantyPrintout(ticket.id)}
                          className="px-3 py-2 bg-white border border-indigo-200 hover:bg-indigo-100 text-accent rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> Cetak Kartu Garansi
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-slate-400 italic">
                    Gunakan tombol cetak SPK di pojok kanan atas untuk memprint tanda terima unit.
                  </p>
                </div>
              </div>}

              {activeTab === 'communication' && <ServiceWhatsAppHub
                 ticket={ticket}
                customer={customer}
                publicBaseUrl={publicBaseUrl}
                customWaMessageText={customWaMessageText}
                renderTenantWaTemplate={renderTenantWaTemplate}
                setCustomWaMessageText={setCustomWaMessageText}
                showToast={showToast}
               />}
            </div>

            {/* Footer Info inside Modal */}
            <div className="border-t border-slate-200/50 dark:border-zinc-700/50 pt-3 flex items-center justify-between text-xs text-slate-400 dark:text-zinc-500">
              <p>
                Operator:{' '}
                <strong className="text-slate-600 dark:text-zinc-300">
                  {currentUser?.name} ({currentUser?.role})
                </strong>
              </p>
              <p className="font-mono">
                Created at: {new Date(ticket.createdAt || '').toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
