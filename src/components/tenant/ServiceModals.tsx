import * as React from 'react';
import { createPortal } from 'react-dom';
import { Badge } from '../ui/Badge';
import { DocumentPrintouts } from './services/DocumentPrintouts';
import { getStorageLocations } from './StorageLocationManager';
import {
  buildServiceReceptionPreview,
  sanitizeWhatsAppPhone,
  isValidIndonesianPhone,
} from '../../utils/serviceReceptionUtils';
import { ServiceStatus, UserRole, CustomerSegment, PaymentMethod } from '../../types';
import { useSaaS } from '../../context/SaaSContext';
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
  Trash2,
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
  Camera,
  Maximize,
  Check,
  Calendar,
  ArrowRight,
  Printer,
  AlertCircle,
  RefreshCw,
  MessageSquare,
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
  Cpu,
  Share2,
  Barcode,
  ShieldCheck,
  Timer,
  PackagePlus,
  ListChecks,
} from 'lucide-react';

export const ServiceModals: React.FC<any> = (props) => {
  const { publicBaseUrl } = useSaaS();
  const {
    viewingServiceTicketId,
    tenantServices,
    customers,
    employees,
    products,
    currentTenantId,
    currentUser,
    showToast,
    setCurrentActiveSubTab,
    setPreviewReceptionTicket,
    setJustCreatedTicket,
    setMicroTicket,
    microSearch,
    filteredMicroComponents,
    microComponentsLoading,
    microComponentsError,
    loadMicroComponents,
    selectedMicroId,
    setMicroQty,
    microChargeable,
    setMicroChargeable,
    microUnitPrice,
    setMicroUnitPrice,
    microNote,
    setMicroNote,
    setPartOrderTicket,
    partOrderName,
    setPartOrderName,
    partOrderQty,
    setPartOrderQty,
    partOrderReason,
    setPartOrderReason,
    partOrderSupplier,
    setPartOrderSupplier,
    partOrderEta,
    setPartOrderEta,
    partOrderCost,
    setPartOrderCost,
    partOrderCostApproved,
    setPartOrderCostApproved,
    partOrderNote,
    setPartOrderNote,
    additionalCostTicket,
    additionalCostDescription,
    setAdditionalCostDescription,
    additionalCostAmount,
    setAdditionalCostAmount,
    additionalCostMethod,
    setAdditionalCostMethod,
    additionalCostApprovedBy,
    setAdditionalCostApprovedBy,
    additionalCostNote,
    setAdditionalCostNote,
    additionalCostProof,
    setAdditionalCostProof,
    showSpkPrintout,
    setShowSpkPrintout,
    showInvoicePrintout,
    setShowInvoicePrintout,
    showProvisionalQuote,
    setShowProvisionalQuote,
    showWarrantyPrintout,
    setShowWarrantyPrintout,
    printConfig,
    activeWaModal,
    setActiveWaModal,
    cameraActive,
    videoRef,
    startCamera,
    stopCamera,
    selectedSparepartId,
    setSparepartSN,
    requestPartMode,
    requestedPartId,
    requestedPartQty,
    setRequestPartMode,
    selectedServiceId,
    selectedServiceIds,
    aiResult,
    aiLoading,
    handleApplyAiRecommendation,
    handlePrintReceptionReceipt,
    updateServiceTicket,
    renderTenantWaTemplate,
    createServicePartOrder,
    saveProofName,
    setSaveProofName,
    saveProofFileBase64,
    setSaveProofFileBase64,
    saving,
    setSaving,
    consumeMicroComponentForService,
    addServiceDiagnostic,
    requestServicePart,
    cancelServicePart,
    addApprovedAdditionalCost,
    justCreatedTicket,
    microQty,
    microTicket,
    partOrderTicket,
    previewReceptionTicket,
    savingAdditionalCost,
    savingMicroUsage,
    savingPartOrder,
    selectedMicro,
    setAdditionalCostTicket,
    setMicroSearch,
    setSavingAdditionalCost,
    setSavingMicroUsage,
    setSavingPartOrder,
    setSelectedMicroId,
    apiFetch,
  } = props;
  const microUsageKeyRef = React.useRef<string | null>(null);
  const sanitizedRecipientPhone = sanitizeWhatsAppPhone(String(activeWaModal?.phone || ''));
  const canSendWhatsApp = isValidIndonesianPhone(sanitizedRecipientPhone);
  const logManualWhatsApp = async (channel: string) => {
    if (!apiFetch || !activeWaModal) return;
    const log = {
      id: `wa-${Date.now().toString(36)}`,
      tenantId: currentTenantId,
      timestamp: new Date().toISOString(),
      recipientName: activeWaModal.customerName,
      recipientPhone: activeWaModal.phone,
      type: 'SERVICE_UPDATE',
      message: activeWaModal.message,
      status: 'MANUAL_OPENED',
      senderName: 'Operator (Manual)',
      channel,
    };
    const response = await apiFetch('/api/module-records', {
      method: 'POST',
      body: JSON.stringify({
        module: 'whatsapp_manual_logs',
        recordId: log.id,
        payload: log,
        action: 'insert',
      }),
    });
    if (!response.ok) throw new Error(`WhatsApp log HTTP ${response.status}`);
  };

  return (
    <>
      {previewReceptionTicket &&
        (() => {
          const ticket = previewReceptionTicket;
          const customer = customers.find((c) => c.id === ticket.customerId);
          const preview = buildServiceReceptionPreview(
            ticket,
            customer?.name || '-',
            customer?.phone || '-'
          );
          return createPortal(
            <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby="service-reception-preview-title">
              <div className="w-full max-w-md overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                <div className="bg-accent text-white px-5 py-4">
                  <h3 id="service-reception-preview-title" className="font-extrabold text-sm">{preview.title}</h3>
                  <p className="text-[10px] text-indigo-100 mt-1">{preview.subtitle}</p>
                </div>
                <div className="p-5 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                    {preview.lines.map((line) => (
                      <p key={line} className="text-[11px] text-slate-700">
                        {line}
                      </p>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewReceptionTicket(null)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
                    >
                      Tutup
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintReceptionReceipt(ticket)}
                      className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-semibold"
                    >
                      Buka Nota Cetak
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          );
        })()}

      {microTicket &&
        createPortal(
          <div
            className="fixed inset-0 z-[175] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-5"
            role="dialog"
            aria-modal="true"
            aria-label="Cari komponen mikro"
          >
            <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-zinc-900">
              <div className="bg-slate-900 text-white px-5 py-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-sm flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-indigo-300" /> Komponen Mikro untuk Tiket
                  </h3>
                  <p className="text-[10px] text-slate-300 mt-1">
                    {microTicket.ticketNo} · {microTicket.deviceName}{' '}
                    {microTicket.deviceBrandModel || ''} · Status {microTicket.status}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Tutup pencarian komponen"
                  onClick={() => setMicroTicket(null)}
                  className="p-1.5 rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid min-h-0 grid-cols-1 gap-5 overflow-y-auto p-4 sm:p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,.85fr)]">
                <section className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      autoFocus
                      value={microSearch}
                      onChange={(e) => setMicroSearch(e.target.value)}
                      placeholder="Cari nama, SKU, kategori, atau model kompatibel..."
                      className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent/30 outline-none"
                    />
                  </div>
                  {microComponentsLoading ? (
                    <div className="py-16 text-center text-xs text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-accent" />
                      Memuat stok komponen...
                    </div>
                  ) : microComponentsError ? (
                    <div className="py-10 text-center rounded-2xl bg-rose-50 border border-rose-100">
                      <AlertCircle className="w-6 h-6 text-rose-500 mx-auto mb-2" />
                      <p className="text-xs text-rose-700">{microComponentsError}</p>
                      <button
                        onClick={() => loadMicroComponents().catch(() => {})}
                        className="mt-3 px-3 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg"
                      >
                        Coba Lagi
                      </button>
                    </div>
                  ) : filteredMicroComponents.length === 0 ? (
                    <div className="py-14 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                      <Package className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-600">
                        Komponen tidak ditemukan
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Ubah kata pencarian atau tambahkan stok melalui inventaris.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 pr-1 sm:grid-cols-2">
                      {filteredMicroComponents.map((item) => {
                        const selected = item.id === selectedMicroId;
                        const low = item.stockQty <= item.minStock;
                        return (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => {
                              setSelectedMicroId(item.id);
                              setMicroUnitPrice(String(item.sellPrice || 0));
                            }}
                            className={`text-left p-3 rounded-xl border transition ${selected ? 'border-accent ring-2 ring-indigo-100 bg-accent-lighter/50' : 'border-slate-200 hover:border-accent/50'}`}
                          >
                            <div className="flex justify-between gap-2">
                              <div>
                                <p className="text-xs font-extrabold text-slate-800">{item.name}</p>
                                <p className="text-[9px] font-mono text-slate-400 mt-0.5">
                                  {item.sku} · {item.category}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  item.stockQty <= 0 ? 'danger' : low ? 'warning' : 'success'
                                }
                              >
                                {item.stockQty} unit
                              </Badge>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2">
                              Rak {item.rackId} / Laci {item.drawerId}
                              {item.supplierName ? ` · ${item.supplierName}` : ''}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1">
                              Jual Rp {item.sellPrice.toLocaleString('id-ID')} · Kompatibel:{' '}
                              {(item.compatModels || []).join(', ') || 'Umum'}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 h-fit space-y-4">
                  {!selectedMicro ? (
                    <div className="py-10 text-center">
                      <Cpu className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-500">
                        Pilih komponen untuk mencatat pemakaian
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="font-extrabold text-sm text-slate-800">
                          {selectedMicro.name}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Stok tersedia {selectedMicro.stockQty} · HPP Rp{' '}
                          {selectedMicro.purchaseCost.toLocaleString('id-ID')}/unit
                        </p>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Jumlah
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={microQty}
                          onChange={(e) => setMicroQty(Math.max(1, Number(e.target.value) || 1))}
                          className="w-full px-3 py-2.5 text-xs border rounded-xl"
                        />
                      </div>
                      <label className="flex items-start gap-2 text-xs font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={microChargeable}
                          onChange={(e) => setMicroChargeable(e.target.checked)}
                          className="mt-0.5"
                        />
                        <span>
                          Tagihkan ke pelanggan
                          <span className="block text-[9px] font-normal text-slate-400">
                            Matikan untuk bahan internal yang hanya dicatat sebagai HPP.
                          </span>
                        </span>
                      </label>
                      {microChargeable && (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">
                            Harga Jual / Unit
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={microUnitPrice}
                            onChange={(e) => setMicroUnitPrice(e.target.value)}
                            className="w-full px-3 py-2.5 text-xs border rounded-xl"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Catatan
                        </label>
                        <textarea
                          rows={2}
                          value={microNote}
                          onChange={(e) => setMicroNote(e.target.value)}
                          placeholder="Contoh: penggantian IC jalur charging"
                          className="w-full px-3 py-2.5 text-xs border rounded-xl resize-none"
                        />
                      </div>
                      <div className="rounded-xl bg-white border p-3 space-y-1.5 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Total HPP internal</span>
                          <strong>
                            Rp {(selectedMicro.purchaseCost * microQty).toLocaleString('id-ID')}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Biaya pelanggan</span>
                          <strong className="text-accent">
                            Rp{' '}
                            {(microChargeable
                              ? Number(microUnitPrice || 0) * microQty
                              : 0
                            ).toLocaleString('id-ID')}
                          </strong>
                        </div>
                      </div>
                      {selectedMicro.stockQty < microQty ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPartOrderTicket(microTicket);
                            setPartOrderName(selectedMicro.name);
                            setPartOrderQty(Math.max(1, microQty - selectedMicro.stockQty));
                            setPartOrderSupplier(selectedMicro.supplierName || '');
                            setPartOrderCost(
                              String(
                                selectedMicro.purchaseCost *
                                  Math.max(1, microQty - selectedMicro.stockQty)
                              )
                            );
                            setPartOrderReason(
                              `Stok komponen mikro tidak mencukupi (tersedia ${selectedMicro.stockQty}).`
                            );
                            setMicroTicket(null);
                          }}
                          className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-extrabold"
                        >
                          <PackagePlus className="w-4 h-4 inline mr-1.5" /> Buat Permintaan &
                          Menunggu Spare Part
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={savingMicroUsage}
                          onClick={async () => {
                            if (!microTicket) return;
                            setSavingMicroUsage(true);
                            try {
                              const idempotencyKey =
                                microUsageKeyRef.current || crypto.randomUUID();
                              microUsageKeyRef.current = idempotencyKey;
                              await consumeMicroComponentForService(selectedMicro.id, {
                                ticketId: microTicket.id,
                                warehouseId: selectedMicro.warehouseId,
                                quantity: microQty,
                                chargeable: microChargeable,
                                unitPrice: microChargeable
                                  ? Number(microUnitPrice || 0)
                                  : undefined,
                                note: microNote.trim() || undefined,
                                idempotencyKey,
                              });
                              microUsageKeyRef.current = null;
                              showToast('Komponen tercatat dan stok diperbarui.', 'success');
                              setSelectedMicroId('');
                              setMicroQty(1);
                              setMicroNote('');
                            } catch (error: any) {
                              showToast(error?.message || 'Gagal memakai komponen.', 'error');
                            } finally {
                              setSavingMicroUsage(false);
                            }
                          }}
                          className="w-full px-4 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-extrabold disabled:opacity-50"
                        >
                          {savingMicroUsage ? 'Menyimpan...' : 'Gunakan Komponen'}
                        </button>
                      )}
                    </>
                  )}
                </section>
              </div>
            </div>
          </div>,
          document.body
        )}

      {partOrderTicket &&
        createPortal(
          <div className="fixed inset-0 z-[170] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="part-order-title">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="bg-accent text-white px-5 py-4 flex justify-between items-center">
                <div>
                  <h3 id="part-order-title" className="font-extrabold text-sm">Menunggu Spare Part</h3>
                  <p className="text-[10px] text-indigo-100 mt-1">
                    Hentikan pengerjaan sementara dan catat kebutuhan part.
                  </p>
                </div>
                <button type="button" onClick={() => setPartOrderTicket(null)} className="text-xl">
                  ×
                </button>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Nama Spare Part *
                  </label>
                  <input
                    value={partOrderName}
                    onChange={(e) => setPartOrderName(e.target.value)}
                    placeholder="Contoh: LCD iPhone 12 OLED"
                    className="w-full text-xs px-3 py-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Jumlah *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={partOrderQty}
                    onChange={(e) => setPartOrderQty(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Supplier/Vendor
                  </label>
                  <input
                    value={partOrderSupplier}
                    onChange={(e) => setPartOrderSupplier(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 border rounded-xl"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Alasan Dibutuhkan *
                  </label>
                  <input
                    value={partOrderReason}
                    onChange={(e) => setPartOrderReason(e.target.value)}
                    placeholder="Part rusak dan stok toko kosong"
                    className="w-full text-xs px-3 py-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Estimasi Biaya
                  </label>
                  <input
                    type="number"
                    value={partOrderCost}
                    onChange={(e) => setPartOrderCost(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Estimasi Tiba
                  </label>
                  <input
                    type="date"
                    value={partOrderEta}
                    onChange={(e) => setPartOrderEta(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 border rounded-xl"
                  />
                </div>
                <label className="sm:col-span-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={partOrderCostApproved}
                    onChange={(e) => setPartOrderCostApproved(e.target.checked)}
                  />{' '}
                  Biaya part sudah disetujui pelanggan
                </label>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Catatan</label>
                  <textarea
                    rows={2}
                    value={partOrderNote}
                    onChange={(e) => setPartOrderNote(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 border rounded-xl"
                  />
                </div>
              </div>
              <div className="px-5 py-4 bg-slate-50 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPartOrderTicket(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={
                    savingPartOrder ||
                    !partOrderName.trim() ||
                    !partOrderReason.trim() ||
                    partOrderQty < 1
                  }
                  onClick={async () => {
                    setSavingPartOrder(true);
                    try {
                      const result = await createServicePartOrder(partOrderTicket.id, {
                        partName: partOrderName.trim(),
                        quantity: partOrderQty,
                        reason: partOrderReason.trim(),
                        supplierName: partOrderSupplier.trim(),
                        estimatedCost: Number(partOrderCost || 0),
                        estimatedArrivalDate: partOrderEta || undefined,
                        costApproved: partOrderCostApproved,
                        note: partOrderNote.trim(),
                        idempotencyKey: `part-order-${partOrderTicket.id}`,
                      });
                      const customer = customers.find(
                        (item) => item.id === partOrderTicket.customerId
                      );
                      const partCtx = {
                        customer_name: customer?.name || 'Pelanggan',
                        ticket_no: partOrderTicket.ticketNo,
                        device_name: partOrderTicket.deviceName,
                        part_name: partOrderName,
                        eta: partOrderEta || '',
                      };
                      const templatedPart = renderTenantWaTemplate('SERVICE_UPDATE', partCtx);
                      const msg =
                        templatedPart ||
                        `Halo *${customer?.name || 'Pelanggan'}*, unit *${partOrderTicket.deviceName}* (${partOrderTicket.ticketNo}) masih menunggu spare part *${partOrderName}*${partOrderEta ? ` dengan estimasi tiba ${partOrderEta}` : ''}. Kami akan mengabari kembali setelah part tersedia.`;
                      setActiveWaModal({
                        phone: customer?.phone || '',
                        message: msg,
                        ticketNo: partOrderTicket.ticketNo,
                        customerName: customer?.name || 'Pelanggan',
                        type: 'PART_ORDER',
                      });
                      showToast('Tiket ditandai menunggu spare part.', 'success');
                      setPartOrderTicket(null);
                      setPartOrderName('');
                      setPartOrderReason('');
                      setPartOrderSupplier('');
                      setPartOrderCost('');
                      setPartOrderEta('');
                      setPartOrderNote('');
                    } catch (error: any) {
                      showToast(error?.message || 'Gagal membuat permintaan spare part.', 'error');
                    } finally {
                      setSavingPartOrder(false);
                    }
                  }}
                  className="px-4 py-2 bg-accent text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  {savingPartOrder ? 'Menyimpan...' : 'Simpan & Buat Pesan WhatsApp'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {additionalCostTicket &&
        createPortal(
          <div className="fixed inset-0 z-[170] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="additional-cost-title">
            <div className="bg-white rounded-3xl shadow-2xl border border-amber-100 max-w-lg w-full overflow-hidden">
              <div className="bg-amber-500 text-white px-5 py-4 flex items-center justify-between">
                <div>
                  <h3 id="additional-cost-title" className="font-extrabold text-sm">Tambahan Biaya Sudah Disetujui</h3>
                  <p className="text-[10px] text-amber-50 mt-1">
                    Catat persetujuan pelanggan tanpa menghentikan pengerjaan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAdditionalCostTicket(null)}
                  className="text-xl"
                >
                  ×
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Tambahan Pekerjaan *
                    </label>
                    <input
                      value={additionalCostDescription}
                      onChange={(e) => setAdditionalCostDescription(e.target.value)}
                      placeholder="Contoh: Ganti konektor charger"
                      className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Tambahan Biaya *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={additionalCostAmount}
                      onChange={(e) => setAdditionalCostAmount(e.target.value)}
                      placeholder="150000"
                      className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Disetujui Melalui
                    </label>
                    <select
                      value={additionalCostMethod}
                      onChange={(e) => setAdditionalCostMethod(e.target.value as any)}
                      className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl bg-white"
                    >
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="PHONE">Telepon</option>
                      <option value="IN_PERSON">Langsung di Toko</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Nama yang Menyetujui
                    </label>
                    <input
                      value={additionalCostApprovedBy}
                      onChange={(e) => setAdditionalCostApprovedBy(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Screenshot/Bukti (Opsional)
                    </label>
                    <input
                      value={additionalCostProof}
                      onChange={(e) => setAdditionalCostProof(e.target.value)}
                      placeholder="Nama file bukti chat"
                      className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Catatan (Opsional)
                    </label>
                    <textarea
                      rows={2}
                      value={additionalCostNote}
                      onChange={(e) => setAdditionalCostNote(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 border border-slate-200 p-3 text-center">
                  <div>
                    <p className="text-[9px] text-slate-400">Harga Lama</p>
                    <p className="text-xs font-bold">
                      Rp {(Number(additionalCostTicket.estimatedCost) || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400">Tambahan</p>
                    <p className="text-xs font-bold text-amber-600">
                      Rp {Number(additionalCostAmount || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400">Total Baru</p>
                    <p className="text-xs font-extrabold text-accent">
                      Rp{' '}
                      {(
                        (Number(additionalCostTicket.estimatedCost) || 0) +
                        Number(additionalCostAmount || 0)
                      ).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 bg-slate-50 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdditionalCostTicket(null)}
                  className="px-4 py-2 text-xs font-bold border rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={
                    savingAdditionalCost ||
                    !additionalCostDescription.trim() ||
                    Number(additionalCostAmount) <= 0
                  }
                  onClick={async () => {
                    setSavingAdditionalCost(true);
                    try {
                      await addApprovedAdditionalCost(additionalCostTicket.id, {
                        description: additionalCostDescription.trim(),
                        amount: Number(additionalCostAmount),
                        approvalMethod: additionalCostMethod,
                        approvedByName: additionalCostApprovedBy.trim(),
                        note: additionalCostNote.trim(),
                        proofName: additionalCostProof.trim(),
                        idempotencyKey: `additional-${additionalCostTicket.id}`,
                      });
                      showToast('Tambahan biaya dicatat. Pengerjaan tetap dilanjutkan.', 'success');
                      setAdditionalCostTicket(null);
                      setAdditionalCostDescription('');
                      setAdditionalCostAmount('');
                      setAdditionalCostNote('');
                      setAdditionalCostProof('');
                    } catch (error: any) {
                      showToast(error?.message || 'Gagal mencatat tambahan biaya.', 'error');
                    } finally {
                      setSavingAdditionalCost(false);
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl disabled:opacity-50"
                >
                  {savingAdditionalCost ? 'Menyimpan...' : 'Simpan & Lanjutkan Pengerjaan'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Manual WhatsApp Send Helper Modal */}
      {activeWaModal &&
        createPortal(
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col animate-scaleUp">
              {/* Header */}
              <div className="bg-emerald-600 text-white px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  <div>
                    <h3 className="font-bold text-sm">Kirim Pesan WhatsApp (Manual)</h3>
                    <p className="text-[10px] text-emerald-100 font-mono">
                      Penerima: {activeWaModal.customerName} (
                      {activeWaModal.phone || 'nomor belum tersedia'})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveWaModal(null)}
                  className="text-white hover:text-emerald-100 font-bold text-lg cursor-pointer transition-all"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                {activeWaModal.type === 'ESTIMATE' && (
                  <div className="rounded-2xl border border-indigo-100 bg-accent-lighter/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
                          Konfirmasi Harga Perbaikan
                        </p>
                        <p className="text-sm font-extrabold text-slate-800 mt-1">
                          Rp {Number(activeWaModal.estimatedCost || 0).toLocaleString('id-ID')}
                        </p>
                      </div>
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-700">
                        Menunggu Persetujuan
                      </span>
                    </div>
                    <p className="mt-3 text-[11px] text-slate-600 line-clamp-3">
                      {activeWaModal.diagnosis}
                    </p>
                  </div>
                )}
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Anda telah mengonfigurasi pengiriman notifikasi ke{' '}
                  <strong>Manual (WhatsApp Web)</strong>. Silakan salin pesan di bawah ini atau klik
                  tombol kirim untuk langsung membuka WhatsApp Web.
                </p>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold">
                    Isi Pesan Notifikasi:
                  </label>
                  <textarea
                    rows={6}
                    value={activeWaModal.message}
                    onChange={(e) =>
                      setActiveWaModal({
                        ...activeWaModal,
                        message: e.target.value,
                      })
                    }
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-accent font-mono leading-relaxed"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 px-5 py-3.5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-t border-slate-100">
                <button
                   onClick={async () => {
                     try {
                       await navigator.clipboard.writeText(activeWaModal.message);
                       showToast('Pesan berhasil disalin ke clipboard!', 'success');
                       await logManualWhatsApp('Copied to Clipboard');
                     } catch (error: any) {
                       showToast(error?.message || 'Pesan gagal disalin ke clipboard.', 'error');
                     }
                   }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <Copy className="w-3.5 h-3.5" /> Salin Pesan
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveWaModal(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 cursor-pointer transition-all"
                  >
                    Tutup
                  </button>
                  <a
                    href={`https://wa.me/${sanitizedRecipientPhone}?text=${encodeURIComponent(activeWaModal.message)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => {
                      if (!canSendWhatsApp) {
                        event.preventDefault();
                        showToast(
                          'Nomor WhatsApp pelanggan belum valid atau belum tersedia.',
                          'error'
                        );
                        return;
                      }
                      void logManualWhatsApp('WhatsApp Web (wa.me)').catch((error: any) =>
                        showToast(error?.message || 'Log WhatsApp gagal disimpan.', 'error')
                      );
                      setActiveWaModal(null);
                    }}
                    className={`px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all ${!canSendWhatsApp ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Share2 className="w-3.5 h-3.5" /> Buka WhatsApp Web
                  </a>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
