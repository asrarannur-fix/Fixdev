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
import {
  ServiceTicketActions,
  SERVICE_TRANSITIONS,
  canTransition,
} from './services/ServiceTicketActions';
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
  ServiceStatus.DIAGNOSA,
];
const WORK_STATUSES: ServiceStatus[] = [ServiceStatus.SEDANG_DIKERJAKAN, ServiceStatus.REWORK];
const PART_STATUSES: ServiceStatus[] = [
  ServiceStatus.DIAGNOSA,
  ServiceStatus.MENUGGU_APPROVAL,
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
  const { publicBaseUrl, apiFetch } = useSaaS();
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
    qcScore,
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
    setQcScore,
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
     detailLoading,
      detailError,
      onDetailUpdated,
    } = props;
  const [pendingAction, setPendingAction] = React.useState<string | null>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const restoreFocusRef = React.useRef<HTMLElement | null>(null);
  React.useEffect(() => {
    if (!viewingServiceTicketId) return;
    restoreFocusRef.current = document.activeElement as HTMLElement;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setViewingServiceTicketId(null);
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
      restoreFocusRef.current?.focus();
    };
  }, [viewingServiceTicketId, setViewingServiceTicketId]);
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
  if (!ticket) {
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-zinc-900">
           <h2 className="text-sm font-black text-slate-900 dark:text-white">{detailLoading ? 'Memuat tiket…' : 'Tiket tidak ditemukan'}</h2>
           <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400" role={detailError ? 'alert' : undefined}>{detailError || (detailLoading ? 'Mengambil detail tiket terbaru.' : 'Data tiket sudah berubah atau tidak tersedia pada cabang aktif.')}</p>
          <button type="button" onClick={() => props.setViewingServiceTicketId(null)} className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">Kembali ke daftar</button>
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
  const isTicketLocked = LOCKED_STATUSES.includes(ticket.status);
  const editableIntake = INTAKE_STATUSES.includes(ticket.status) && canDiagnose;
  const canRequestParts = PART_STATUSES.includes(ticket.status) && canRepair;
  const canHandover =
    isSuperAdmin ||
    ['OWNER', 'ADMIN'].includes(currentUser?.role || '') ||
    hasAnyPermission(currentUserPermissions, ['service_handover']);
  const isWorkPhase = WORK_STATUSES.includes(ticket.status);
  const isQcPhase = ticket.status === ServiceStatus.QC;
  const customer = customers.find((c) => c.id === ticket.customerId);
  const technician = employees.find((e) => e.id === ticket.assignedTechId);

  // Filter products that are spare parts / accessories
  const tenantProducts = products.filter((p) => p.tenantId === currentTenantId);
  const sparepartsList = tenantProducts.filter(
    (p) =>
      (p.category &&
        ['SPAREPART', 'SUKU CADANG', 'AKSESORIS'].includes(p.category.toUpperCase())) ||
      p.name.toLowerCase().includes('spare') ||
      p.name.toLowerCase().includes('ic ') ||
      p.name.toLowerCase().includes('layar') ||
      p.name.toLowerCase().includes('baterai') ||
      p.name.toLowerCase().includes('flex') ||
      p.name.toLowerCase().includes('connector')
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
      className="fixed inset-0 z-50 flex bg-slate-900/40"
      onClick={() => setViewingServiceTicketId(null)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-detail-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="flex h-[100dvh] w-full flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-zinc-100 shadow-2xl dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950"
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
          onClose={() => {
            setViewingServiceTicketId(null);
            setInternalCommentText('');
            setManualDiagNotes('');
            setManualDiagCost('');
            setQcScore(0);
            setQcNotes('');
            setHandoverChecklist([]);
            setHandoverPaymentMethod(PaymentMethod.CASH);
            setHandoverProofName('');
            setHandoverRefNo('');
            setHandoverTempoDays(30);
            setSelectedSparepartId('');
            setSparepartSN('');
          }}
        />

        {/* Next-step guidance so the workflow is never "missed" */}
        <ServiceNextStepBanner status={ticket.status} />

        <div className="flex-1 flex flex-col xl:flex-row overflow-y-auto xl:overflow-hidden">
          {/* LEFT PANEL: Ticket Meta Info, Checklist & Logs */}
          <div className="order-2 xl:order-1 xl:w-[30%] 2xl:w-[28%] border-r border-slate-100 dark:border-zinc-800 bg-gradient-to-b from-slate-50/80 to-zinc-100/50 dark:from-zinc-900/80 dark:to-zinc-950/50 p-3 lg:p-4 overflow-y-auto space-y-3">
            <ServiceTicketSummary ticket={ticket} customer={customer} />

            <div className="relative overflow-hidden rounded-2xl border border-white/40 p-3 shadow-md dark:border-zinc-800/40">

                {/* Interactive Technician Assign / Change Dropdown */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">
                    Teknisi Penanggung Jawab
                  </label>
                  <select
                    value={ticket.assignedTechId || ''}
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
                        ? 'Teknisi dikunci setelah tiket selesai atau diserahkan'
                        : undefined
                    }
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const techName =
                        employees.find((emp) => emp.id === selectedId)?.name || 'Antrian Bebas';

                      void props.patchServiceWork(ticket.id, {
                        assignedTechId: selectedId || null,
                        internalDiscussion: {
                          id: crypto.randomUUID(),
                          text: `Teknisi penanggung jawab diubah ke: ${techName}`,
                          operator: '',
                          timestamp: new Date().toISOString(),
                        },
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
                  const storageLocs = getStorageLocations(activeTenantId || '').filter(
                    (l) => l.type === 'UNIT_SERVICE'
                  );
                  return storageLocs.length > 0 ? (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">
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
                            await props.patchServiceWork(ticket.id, {
                              storageLocationId: e.target.value || null,
                            });
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
                  <h4 className="relative font-bold text-[10px] text-pink-600 dark:text-pink-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500" />
                    Foto Masuk
                  </h4>
                  <div className="relative rounded-xl overflow-hidden border border-white/30 shadow-sm">
                    <img
                       src={ticket.initialPhotos[0]}
                       alt={`Kondisi awal ${ticket.deviceName}`}
                       loading="lazy"
                       decoding="async"
                       className="w-full h-32 object-cover"
                    />
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

            <ServiceIntakeChecklist items={ticket.initialChecklist} />

            <ServiceTimeline entries={ticket.timeline} />

               <ServiceInternalDiscussion
               ticket={ticket}
               currentUser={currentUser}
               patchServiceWork={props.patchServiceWork}
              value={internalCommentText}
              onChange={setInternalCommentText}
               canComment={canRepair && !isTicketLocked}
            />
          </div>

          {/* RIGHT PANEL: Interactive Workstation */}
          <div className="order-1 xl:order-2 xl:w-[70%] 2xl:w-[72%] p-3 lg:p-5 overflow-y-auto space-y-4 lg:space-y-5 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Visual Repair Workflow Stepper */}
              <ServiceTicketActions
                ticket={ticket}
                canChangeStatus={canRepair}
                canRequestParts={canRequestParts}
                canAddCost={isSuperAdmin || ['OWNER', 'ADMIN'].includes(currentUser?.role || '')}
                canHandover={canHandover}
                liveTimerSeconds={liveTimerSeconds}
                repairStartTime={ticket.repairStartTime}
                onStatusChange={(status, note) => updateServiceStatus(ticket.id, status, note)}
                onPartOrder={() => setPartOrderTicket(ticket)}
                onAdditionalCost={() => {
                  setAdditionalCostTicket(ticket);
                  setAdditionalCostApprovedBy(customer?.name || '');
                }}
                onHandover={() => document.getElementById('service-handover')?.scrollIntoView({ behavior: 'smooth' })}
              />

              {/* Technician Tools Center */}
              {canRepair && (
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
                        <p className="text-[10px] text-white/70">
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
                              <span className="text-[8px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full animate-pulse">
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
                                className="text-[9px] font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded"
                                title="Timer hanya tersedia saat pengerjaan atau rework"
                              >
                                Belum Tahap Pengerjaan
                              </span>
                            ) : !ticket.repairStartTime ? (
                              <button
                                onClick={() =>
                                  void props.patchServiceWork(ticket.id, {
                                    repairStartTime: new Date().toISOString(),
                                  })
                                }
                                className="text-[9px] font-bold bg-emerald-600 text-white px-2 py-1 rounded shadow-xs cursor-pointer hover:bg-emerald-700"
                              >
                                Mulai Servis
                              </button>
                            ) : !ticket.repairEndTime ? (
                              <button
                                onClick={() =>
                                  void props.patchServiceWork(ticket.id, {
                                    repairEndTime: new Date().toISOString(),
                                  })
                                }
                                className="text-[9px] font-bold bg-rose-600 text-white px-2 py-1 rounded shadow-xs cursor-pointer hover:bg-rose-700"
                              >
                                Hentikan Waktu
                              </button>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-400 bg-slate-200 px-2 py-1 rounded">
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
                      <label className="flex items-center justify-between text-[10px] font-bold text-slate-600 uppercase">
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
                        placeholder="Tulis kendala teknis, PIN, atau catatan skema di sini..."
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
                          <span className="text-[10px] font-bold text-slate-700">
                            Cari Komponen
                          </span>
                          <span className="text-[9px] text-slate-400">
                            Pencarian Kompatibilitas
                          </span>
                        </button>
                        <button
                          onClick={() => setRequestPartMode(!requestPartMode)}
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
                              ? 'Sparepart hanya dapat diminta saat diagnosis atau pengerjaan'
                              : undefined
                          }
                          className="flex-1 flex flex-col items-center justify-center p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer group disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <PackagePlus className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform mb-1" />
                          <span className="text-[10px] font-bold text-slate-700">
                            Request Sparepart
                          </span>
                          <span className="text-[9px] text-slate-400">Dari Gudang</span>
                        </button>
                      </div>

                      {requestPartMode && (
                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2 animate-fadeIn">
                          <select
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
                             {warehouses.filter((warehouse) => warehouse.tenantId === currentTenantId && warehouse.branchId === ticket.branchId).map((warehouse) => (
                               <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                             ))}
                           </select>
                           <div className="flex gap-2">
                             <input
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
                                  await requestServicePart(ticket.id, {
                                    productId: part.id,
                                    warehouseId,
                                    quantity: requestedPartQty,
                                  });
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
                            <span className="text-[10px] font-extrabold text-indigo-800 uppercase">
                              Komponen Mikro Terpakai
                            </span>
                            <span className="text-[9px] text-indigo-500">
                              {ticket.microComponentUsages.length} item
                            </span>
                          </div>
                          {ticket.microComponentUsages.map((usage) => (
                            <div
                              key={usage.id}
                              className="flex items-start justify-between gap-3 rounded-lg bg-white border border-indigo-100 px-2.5 py-2"
                            >
                              <div>
                                <p className="text-[10px] font-bold text-slate-700">
                                  {usage.name} × {usage.quantity}
                                </p>
                                <p className="text-[9px] text-slate-400">
                                  {usage.chargeable
                                    ? `Ditagihkan Rp ${usage.chargeTotal.toLocaleString('id-ID')}`
                                    : 'Pemakaian internal'}
                                </p>
                              </div>
                              <span className="text-[9px] font-semibold text-slate-500">
                                HPP Rp {usage.hppTotal.toLocaleString('id-ID')}
                              </span>
                            </div>
                          ))}
                          <div className="pt-1 border-t border-indigo-100 grid grid-cols-2 gap-2 text-[9px]">
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
                          <span className="text-[9px] font-bold text-slate-500">
                            Status Permintaan Part:
                          </span>
                          <div className="max-h-24 overflow-y-auto space-y-1">
                            {ticket.partsRequested.map((req) => {
                              const pName =
                                sparepartsList.find((x) => x.id === req.sparepartId)?.name ||
                                'Unknown Part';
                              return (
                                <div
                                  key={req.id}
                                  className="flex items-center justify-between bg-slate-50 border border-slate-100 p-1.5 rounded-md text-[10px]"
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
              <div className="relative overflow-hidden border border-white/20 dark:border-zinc-800/40 rounded-2xl p-5 shadow-lg shadow-slate-200/30 dark:shadow-zinc-900/30 space-y-4">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 dark:from-emerald-600 dark:via-teal-600 dark:to-cyan-600" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-white/10" />
                <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                <div className="relative flex items-center justify-between border-b border-white/20 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl text-white">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-xs uppercase text-white tracking-widest">
                        Pusat Pengujian & Checklist
                      </h4>
                      <p className="text-[10px] text-white/70">
                        Verifikasi kelayakan hardware & software
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono bg-white/20 backdrop-blur-sm text-white px-2.5 py-1 rounded-full font-bold border border-white/20">
                    {technician?.name || 'Belum Ditugaskan'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* COLUMN 1: PRE-SERVICE INTAKE CHECKLIST */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <span className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                        Pre-Service (Kondisi Masuk)
                      </div>
                      <span className="text-[10px] font-mono font-bold text-accent bg-accent-lighter px-2 py-0.5 rounded">
                        {ticket.initialChecklist
                          ? ticket.initialChecklist.filter((x) => x.checked).length
                          : 0}{' '}
                        / {ticket.initialChecklist ? ticket.initialChecklist.length : 0} OK
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-64 overflow-y-auto space-y-1.5">
                      {ticket.initialChecklist && ticket.initialChecklist.length > 0 ? (
                        ticket.initialChecklist.map((item, idx) => {
                          return (
                            <label
                              key={idx}
                              className={`flex items-center justify-between text-xs p-2 rounded-lg border select-none transition-all duration-200 ${
                                item.checked
                                  ? 'bg-emerald-50/40 border-emerald-100 text-emerald-800 font-medium'
                                  : 'bg-white border-slate-200 text-slate-500'
                              } ${editableIntake ? 'cursor-pointer hover:bg-slate-100' : 'cursor-not-allowed opacity-70'}`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <input
                                  type="checkbox"
                                  checked={item.checked}
                                  disabled={!editableIntake}
                                  onChange={() => {
                                    if (!editableIntake) return;
                                    showToast('Checklist penerimaan hanya dapat diubah saat penerimaan tiket.', 'info');
                                  }}
                                  className="accent-emerald-600 h-3.5 w-3.5 rounded"
                                />
                                <span className="truncate">{item.name}</span>
                              </div>
                              <span
                                className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full ${
                                  item.checked
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {item.checked ? 'OK' : 'BELUM DIPERIKSA'}
                              </span>
                            </label>
                          );
                        })
                      ) : (
                        <div className="text-center py-6 text-slate-400 italic text-[11px] bg-white rounded-lg border border-dashed border-slate-200">
                          <p>Checklist pre-service kosong.</p>
                          <button
                            disabled={!editableIntake}
                            title={
                              !editableIntake
                                ? 'Checklist penerimaan dikunci setelah tahap diagnosis'
                                : undefined
                            }
                            onClick={() => {
                              if (!editableIntake) return;
                               showToast('Checklist penerimaan dikelola saat pembuatan tiket.', 'info');
                            }}
                            className="mt-2 px-2.5 py-1 bg-accent text-white rounded text-[10px] font-bold hover:bg-accent-hover cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Inisialisasi Checklist
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* QC is available only after the repair enters QC or returns for rework. */}
                  {ticket.status === 'QC' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <span className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                          Post-Service (Pengujian QC)
                        </div>
                        <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          {ticket.qcChecklist
                            ? ticket.qcChecklist.filter((x) => x.passed).length
                            : 0}{' '}
                          / {ticket.qcChecklist ? ticket.qcChecklist.length : 10} Passed
                        </span>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-64 overflow-y-auto space-y-1.5">
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

                                          // Calculate suggested QC score
                                          const passedCount = updatedList.filter(
                                            (x) => x.passed
                                          ).length;
                                          const suggestedScore = Math.round(
                                            (passedCount / updatedList.length) * 100
                                          );

                                           void runAction('qc-draft', async () => {
                                             const updated = await patchServiceTicketScope(apiFetch, ticket.id, 'qc-draft', {
                                               checklist: updatedList,
                                               score: suggestedScore,
                                             });
                                             onDetailUpdated?.(updated);
                                             setQcScore(suggestedScore);
                                           });
                                        }}
                                        className="accent-emerald-600 h-3.5 w-3.5 rounded"
                                      />
                                      <span className="truncate">{item.criteria}</span>
                                    </div>
                                    <span
                                      className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full ${
                                        item.passed
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-rose-100 text-rose-800'
                                      }`}
                                    >
                                      {item.passed ? 'PASSED' : 'FAILED'}
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
                                         score: 0,
                                       });
                                       onDetailUpdated?.(updated);
                                       setQcScore(0);
                                     })}
                                     disabled={!!pendingAction}
                                    className="w-full bg-accent-lighter border border-indigo-100 text-accent rounded-lg py-1.5 text-[10px] font-bold hover:bg-indigo-100/50 cursor-pointer transition-all"
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

                {/* Consolidated QC Summary and Scoring Integration */}
                {ticket.status === 'QC' && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Skor Kelayakan QC Terhitung</span>
                      </div>
                      <p className="text-slate-500 text-[10px] leading-relaxed">
                        Skor dihasilkan secara proporsional dari checklist QC di atas. Minimal skor
                        lolos uji adalah 80.
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-center bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-xs">
                        <p className="text-[9px] font-mono font-bold text-slate-400 uppercase">
                          QC SCORE
                        </p>
                        <p
                          className={`text-2xl font-black font-mono tracking-tight ${
                            (ticket.qcScore ?? 0) >= 80 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {ticket.qcScore ?? 0}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span
                          className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-lg border font-mono ${
                            (ticket.qcScore ?? 0) >= 80
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-rose-50 border-rose-200 text-rose-700'
                          }`}
                        >
                          {(ticket.qcScore ?? 0) >= 80 ? '✓ AMAN / LOLOS QC' : '✕ PERLU REWORK'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* QC Inline Form — inside ticket detail modal */}
              {ticket.status === 'QC' && (
                <div className="relative overflow-hidden border border-white/20 dark:border-zinc-800/40 rounded-2xl p-4 shadow-lg shadow-slate-200/30 dark:shadow-zinc-900/30 space-y-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-400 via-cyan-400 to-sky-400 dark:from-teal-600 dark:via-cyan-600 dark:to-sky-600" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-white/10" />
                  <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                  <div className="relative flex items-center justify-between border-b border-white/20 pb-2">
                    <h4 className="font-black text-[11px] text-white uppercase tracking-widest flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Quality Control (QC)
                    </h4>
                    <span className="text-[9px] font-mono font-bold text-white/70 uppercase">
                      #{ticket.ticketNo}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                        Skor Pemeriksaan (0–100)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={qcScore}
                        onChange={(e) => setQcScore(Number(e.target.value))}
                        className="w-full cursor-pointer h-2 bg-slate-100 rounded-lg appearance-none"
                      />
                      <p className="text-right text-xs font-bold font-mono text-slate-800 mt-1">
                        {qcScore}/100
                      </p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
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
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => void runAction('qc-rework', () => completeServiceQC(ticket.id, qcScore, qcNotes, false))}
                      disabled={!!pendingAction || !canRepair || qcNotes.trim().length < 2 || !ticket.qcChecklist?.length}
                      className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs py-2 rounded-lg cursor-pointer border border-rose-200"
                    >
                      Rework (Gagal QC)
                    </button>
                    <button
                      disabled={
                         !!pendingAction ||
                         !canRepair ||
                         qcScore < 80 ||
                        qcNotes.trim().length < 2 ||
                        !ticket.qcChecklist?.length ||
                        ticket.qcChecklist.some((item) => !item.passed)
                      }
                      title={
                        qcScore < 80
                          ? 'Skor QC minimal 80.'
                          : qcNotes.trim().length < 2
                            ? 'Catatan pemeriksaan wajib diisi.'
                            : !ticket.qcChecklist?.length
                              ? 'Simpan checklist QC terlebih dahulu.'
                              : ticket.qcChecklist.some((item) => !item.passed)
                                ? 'Semua pemeriksaan QC harus lulus.'
                                : ''
                      }
                      onClick={() => void runAction('qc-pass', () => completeServiceQC(ticket.id, qcScore, qcNotes, true))}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-xs py-2 rounded-lg cursor-pointer"
                    >
                      Lolos QC (Selesai)
                    </button>
                  </div>
                </div>
              )}

              {/* Grid 1: Diagnostic and Parts Selection */}
              {editableIntake && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Left Workshop column: Manual Diagnostic Updates */}
                  <div className="relative overflow-hidden border border-white/20 dark:border-zinc-800/40 p-4 rounded-2xl space-y-4 shadow-md">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-zinc-100 to-gray-100 dark:from-zinc-800 dark:via-zinc-800 dark:to-zinc-900" />
                    <h4 className="relative font-black text-[11px] text-slate-700 dark:text-zinc-200 uppercase font-mono tracking-wider flex items-center gap-1.5 border-b border-slate-200/50 dark:border-zinc-700/50 pb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-slate-500 to-zinc-500" />
                      Analisa Kerusakan Teknis
                    </h4>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-0.5">
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
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-0.5">
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
                            await addServiceDiagnostic(
                                ticket.id,
                                manualDiagNotes,
                                estCost,
                                ticket.partsRequested || ticket.partsUsed || []
                              );
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

                  {/* Right Workshop column: Spareparts Inventory Integration */}
                  <div className="relative overflow-hidden border border-white/20 dark:border-zinc-800/40 p-4 rounded-2xl space-y-4 shadow-md">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-zinc-100 to-gray-100 dark:from-zinc-800 dark:via-zinc-800 dark:to-zinc-900" />
                    <h4 className="relative font-black text-[11px] text-slate-700 dark:text-zinc-200 uppercase font-mono tracking-wider flex items-center gap-1.5 border-b border-slate-200/50 dark:border-zinc-700/50 pb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-500" />
                      Penggantian Suku Cadang
                    </h4>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-0.5">
                        Cari & Pilih Suku Cadang
                      </label>
                      <select
                        value={selectedSparepartId}
                        onChange={(e) => setSelectedSparepartId(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-accent"
                      >
                        <option value="">-- Pilih part di stok toko --</option>
                        {sparepartsList.map((prod) => (
                          <option key={prod.id} value={prod.id} disabled={prod.stockQty <= 0}>
                            {prod.name} (Stok: {prod.stockQty}) - Rp{' '}
                            {(prod.sellPrice ?? 0).toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-0.5">
                          Jumlah (Qty)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={sparepartQty}
                          onChange={(e) => setSparepartQty(Number(e.target.value))}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-0.5">
                          Serial Number (Opsional)
                        </label>
                        <input
                          type="text"
                          placeholder="Scan / Ketik SN LCD dll"
                          value={sparepartSN}
                          onChange={(e) => setSparepartSN(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-accent"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => void runAction('reserve-part', async () => {
                            if (!selectedSparepartId) {
                              showToast('Pilih spare part terlebih dahulu.', 'error');
                              return;
                            }
                            const partProd = products.find((p) => p.id === selectedSparepartId);
                            if (!partProd) return;
                            const warehouseId = Object.keys(partProd.warehouseStock || {})[0];
                            if (!warehouseId) {
                              showToast('Gudang spare part belum ditentukan.', 'error');
                              return;
                            }
                            await requestServicePart(ticket.id, {
                                productId: selectedSparepartId,
                                warehouseId,
                                quantity: sparepartQty,
                                serialNumber: sparepartSN || undefined,
                              });
                              setSelectedSparepartId('');
                              setSparepartQty(1);
                              setSparepartSN('');
                              showToast(
                                `${partProd.name} berhasil direservasi. Stok dipotong saat handover.`,
                                'success'
                              );
                          })}
                          disabled={!!pendingAction || !canRequestParts}
                          className="w-full bg-accent hover:bg-accent-hover text-white font-bold text-xs py-2 rounded-lg cursor-pointer text-center transition-all shadow-xs"
                        >
                          Reservasi Spare Part
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <ServicePartsLedger
                ticket={ticket}
                onCancelPart={async (part) => {
                  if (!part.id) {
                    showToast('ID reservasi spare part tidak tersedia.', 'error');
                    return;
                  }
                  try {
                    await cancelServicePart(ticket.id, part.id);
                    showToast(`Reservasi ${part.name} dibatalkan.`, 'success');
                  } catch (error: any) {
                    showToast(error?.message || 'Gagal membatalkan spare part.', 'error');
                  }
                }}
              />

              {/* Section 3: Manual Status & Workflow Controller */}
              <div className="relative overflow-hidden border border-white/20 dark:border-zinc-800/40 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-md">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5" />
                <div className="relative space-y-3">
                  <h4 className="font-black text-[10px] text-indigo-700 dark:text-indigo-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                    Lompati / Ubah Status Manual
                  </h4>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-0.5">
                      Pilih Status Baru
                    </label>
                    <select
                      value={ticket.status}
                      onChange={(e) => {
                        const newStatus = e.target.value as ServiceStatus;
                        void runAction('manual-status', () =>
                          updateServiceStatus(
                            ticket.id,
                            newStatus,
                            'Status diperbarui melalui aksi operasional.'
                          )
                        );
                      }}
                      disabled={!!pendingAction}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-accent"
                    >
                      <option value={ticket.status}>Status saat ini: {ticket.status}</option>
                      {(SERVICE_TRANSITIONS[ticket.status] || [])
                        .filter(
                          (status) =>
                            ![
                              ServiceStatus.MENUGGU_PEMBAYARAN,
                              ServiceStatus.SIAP_DIAMBIL,
                              ServiceStatus.DIAMBIL,
                            ].includes(status as ServiceStatus)
                        )
                        .map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Status action buttons depending on flow */}
                <div className="flex flex-col justify-end space-y-2">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                    Tindakan Alur Kerja Cepat:
                  </p>

                  {ticket.status === ServiceStatus.DIAGNOSA && (
                    <div className="space-y-2">
                      <button
                        onClick={() =>
                          runAction('submit-estimate', () => updateServiceStatus(
                             ticket.id,
                             ServiceStatus.MENUGGU_APPROVAL,
                             'Teknisi merumuskan estimasi biaya dan menunggu persetujuan pelanggan.'
                           ))
                        }
                        className="w-full bg-accent hover:bg-accent-hover text-white font-bold text-xs py-2 rounded-lg cursor-pointer text-center"
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
                          const msg =
                            `Halo *${customer?.name || 'Pelanggan'}*, unit *${ticket.deviceName}* ` +
                            `(Tiket *${ticket.ticketNo}*) memerlukan perbaikan ` +
                            `dengan estimasi biaya *Rp ${est.toLocaleString('id-ID')}*. ` +
                            `Silakan setujui estimasi melalui portal resmi kami. ` +
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
                          onClick={() => void runAction('approve-estimate', () => approveServiceEstimate(ticket.id, true))}
                          disabled={!!pendingAction}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer text-center"
                        >
                          Setujui Digital
                        </button>
                        <button
                          onClick={() => void runAction('reject-estimate', () => approveServiceEstimate(ticket.id, false))}
                          disabled={!!pendingAction}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer text-center"
                        >
                          Tolak / Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {ticket.status === ServiceStatus.SEDANG_DIKERJAKAN && (
                    <button
                      onClick={() => void runAction('enter-qc', async () => {
                        await updateServiceStatus(
                          ticket.id,
                          ServiceStatus.QC,
                          'Unit masuk pemeriksaan quality control.'
                        );
                        setQcScore(ticket.qcScore ?? 0);
                         setQcNotes(ticket.qcNotes ?? '');
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
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
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
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
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
                              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-[11px] text-amber-800 leading-relaxed shadow-3xs">
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
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
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
                                <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-600 font-medium leading-relaxed">
                                  ⚠️ <strong>Validasi Gagal</strong>: Harap masukkan Nomor Referensi
                                   sebagai prasyarat status 'Unit Diambil'.
                                </div>
                              )}
                            </div>
                          )}

                          <div className="border border-amber-200 bg-amber-50/80 rounded-xl p-3 space-y-2">
                            <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                              <ListChecks className="w-3.5 h-3.5" /> Checklist Serah Terima Unit
                            </p>
                            <p className="text-[9px] text-amber-700 leading-relaxed">
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
                                <span className="text-[10px] font-medium text-slate-600 group-hover:text-amber-800 transition-colors leading-tight">
                                  {label}
                                </span>
                              </label>
                            ))}
                            {Object.values(handoverChecklist).some((v) => !v) && (
                              <div className="p-1.5 bg-amber-100/80 border border-amber-200 rounded-lg text-[9px] text-amber-700 font-medium">
                                ⚠️ Centang semua item sebelum menyelesaikan handover.
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-slate-200/80 pt-3">
                            <div className="bg-white border border-indigo-100 rounded-xl p-3 shadow-xs">
                              <p className="text-[10px] font-black text-accent uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Receipt className="w-3.5 h-3.5" /> Preview Jurnal Otomatis
                              </p>
                              <div className="space-y-1.5 text-[10px] font-mono text-slate-600">
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
                              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5" /> Preview Garansi & Status
                              </p>
                              <div className="space-y-1.5 text-[10px] font-mono text-slate-600">
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
                            <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5" /> Preview Stok Sparepart Keluar
                            </p>
                            {partsImpact.length > 0 ? (
                              <div className="space-y-1.5">
                                {partsImpact.map((part: any, idx: number) => (
                                  <div
                                    key={`${part.productId || part.name}-${idx}`}
                                    className="flex justify-between gap-3 text-[10px] font-mono text-slate-600"
                                  >
                                    <span className="truncate">
                                      {part.name || part.productName || part.productId}
                                    </span>
                                    <strong>-{part.quantity || part.qty || 0} pcs</strong>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-500">
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

                              await handoverServiceDevice(
                                  ticket.id,
                                  handoverPaymentMethod,
                                  detailsObj
                                );
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
                          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5" /> Dokumen Siap Dicetak
                          </p>
                          <p className="text-[10px] text-emerald-700 mt-1 leading-relaxed">
                            Unit sudah handover. Invoice pembayaran dan kartu garansi siap diberikan
                            ke customer.
                          </p>
                        </div>
                        <span className="text-[9px] font-mono font-bold bg-white text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                          DIAMBIL
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          onClick={() => setShowInvoicePrintout(ticket.id)}
                          className="px-3 py-2 bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                        >
                          <FileText className="w-3.5 h-3.5" /> Cetak Invoice Pembayaran
                        </button>
                        <button
                          onClick={() => setShowWarrantyPrintout(ticket.id)}
                          className="px-3 py-2 bg-white border border-indigo-200 hover:bg-indigo-100 text-accent rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> Cetak Kartu Garansi
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="text-[9px] text-slate-400 italic">
                    Gunakan tombol cetak SPK di pojok kanan atas untuk memprint tanda terima unit.
                  </p>
                </div>
              </div>

              <ServiceWhatsAppHub
                ticket={ticket}
                customer={customer}
                publicBaseUrl={publicBaseUrl}
                customWaMessageText={customWaMessageText}
                renderTenantWaTemplate={renderTenantWaTemplate}
                setCustomWaMessageText={setCustomWaMessageText}
                showToast={showToast}
              />
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
