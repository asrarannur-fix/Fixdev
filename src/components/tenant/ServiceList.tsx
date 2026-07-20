import * as React from "react";
import { createPortal } from "react-dom";
import { Badge } from "../ui/Badge";
import { DocumentPrintouts } from "./services/DocumentPrintouts";
import { ServiceModals } from "./ServiceModals";
import { ServiceDetailModal } from "./ServiceDetailModal";
import { getStorageLocations } from "./StorageLocationManager";
import { buildServiceReceptionPreview } from "../../utils/serviceReceptionUtils";
import { ServiceStatus, UserRole, CustomerSegment, PaymentMethod } from "../../types";
import { Building2, Sliders, Receipt, Lock, Zap, FileText, ChevronRight, HelpCircle, Save, PlusCircle, CheckCircle2, Trash2, Copy, AlertTriangle, Monitor, ExternalLink, Brush, Ticket, X, Paintbrush, Fingerprint, MapPin, Search, CheckSquare, Activity, Camera, Maximize, Check, Calendar, ArrowRight, Printer, AlertCircle, RefreshCw, MessageSquare, Wrench, Upload, Minus, Eye, Edit, MoreVertical, SearchIcon, CheckCircle, Package, Send, Filter, ChevronLeft, QrCode, Cpu, Share2, Barcode, ShieldCheck, Timer, PackagePlus, Sparkles, ListChecks } from "lucide-react";

export const ServiceList: React.FC<any> = (props) => {
  const { activeTenantId, activeWaModal, additionalCostAmount, additionalCostApprovedBy, additionalCostDescription, additionalCostMethod, additionalCostNote, additionalCostProof, additionalCostTicket, aiLoading, aiResult, approveServiceEstimate, cameraActive, completeServiceQC, currentUserPermissions, customWaMessageText, filteredMicroComponents, handleApplyAiRecommendation, handlePrintReceptionReceipt, handoverChecklist, handoverPaymentMethod, handoverProofName, handoverRefNo, handoverServiceDevice, handoverTempoDays, internalCommentText, isSubTabAllowed, justCreatedTicket, liveTimerSeconds, manualDiagCost, manualDiagNotes, microChargeable, microNote, microQty, microSearch, microTicket, microUnitPrice, openManualEstimateWhatsApp, openMicroComponentModal, partOrderCost, partOrderCostApproved, partOrderEta, partOrderName, partOrderNote, partOrderQty, partOrderReason, partOrderSupplier, partOrderTicket, previewReceptionTicket, qcNotes, qcScore, renderTenantWaTemplate, requestPartMode, requestedPartId, requestedPartQty, savingAdditionalCost, savingMicroUsage, savingPartOrder, selectedMicro, selectedMicroId, selectedServiceId, selectedServiceIds, selectedSparepartId, setActiveSubTab, setActiveWaModal, setAdditionalCostAmount, setAdditionalCostApprovedBy, setAdditionalCostDescription, setAdditionalCostMethod, setAdditionalCostNote, setAdditionalCostProof, setAdditionalCostTicket, setAiResult, setCustomWaMessageText, setHandoverChecklist, setHandoverPaymentMethod, setHandoverProofName, setHandoverRefNo, setHandoverTempoDays, setInternalCommentText, setJustCreatedTicket, setManualDiagCost, setManualDiagNotes, setMicroChargeable, setMicroNote, setMicroQty, setMicroSearch, setMicroTicket, setMicroUnitPrice, setPartOrderCost, setPartOrderCostApproved, setPartOrderEta, setPartOrderName, setPartOrderNote, setPartOrderQty, setPartOrderReason, setPartOrderSupplier, setPartOrderTicket, setPreviewReceptionTicket, setQcNotes, setQcScore, setRequestPartMode, setRequestedPartId, setRequestedPartQty, setSavingAdditionalCost, setSavingMicroUsage, setSavingPartOrder, setSelectedMicroId, setSelectedServiceId, setSelectedServiceIds, setSelectedSparepartId, setShowInvoicePrintout, setShowProvisionalQuote, setShowSpkPrintout, setShowWarrantyPrintout, setSparepartQty, setSparepartSN, setSrvSearchQuery, setSrvSort, setStatusFilter, setViewingServiceTicketId, showInvoicePrintout, showProvisionalQuote, showSpkPrintout, showWarrantyPrintout, sparepartQty, sparepartSN, srvSearchQuery, srvSort, startCamera, statusFilter, stopCamera, tenantObj, tenantServices, updateServiceStatus, videoRef, viewingServiceTicketId, currentUser, showConfirm, updateServiceTicket, showToast, customers, employees, products, currentTenantId, microComponentsLoading, microComponentsError, loadMicroComponents, consumeMicroComponentForService, addServiceDiagnostic, requestServicePart, cancelServicePart, createServicePartOrder, addApprovedAdditionalCost } = props;
  return (
<div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-3 shadow-sm animate-fadeIn space-y-3">
  {/* KPI Dashboard Summary */}
  {(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const finalStatuses = new Set([
      ServiceStatus.SELESAI, ServiceStatus.DIAMBIL, ServiceStatus.DIBATALKAN,
      ServiceStatus.KLAIM_GARANSI, ServiceStatus.TIDAK_BISA_DIPERBAIKI,
      ServiceStatus.CUSTOMER_TIDAK_MERESPON, ServiceStatus.BARANG_TIDAK_DIAMBIL,
      ServiceStatus.RUSAK, ServiceStatus.APPROVAL_DITOLAK,
    ]);
    const active = tenantServices.filter(s => !finalStatuses.has(s.status));
    const baruHariIni = tenantServices.filter(s => {
      const d = s.createdAt ? new Date(s.createdAt) : null;
      return d && d >= todayStart;
    }).length;
    const menungguDiagnosa = tenantServices.filter(s =>
      s.status === ServiceStatus.DITERIMA || s.status === ServiceStatus.ANTRIAN
    ).length;
    const menungguApproval = tenantServices.filter(s =>
      s.status === ServiceStatus.MENUGGU_APPROVAL || s.status === ServiceStatus.ESTIMATE_PENDING
    ).length;
    const dikerjakan = tenantServices.filter(s =>
      s.status === ServiceStatus.SEDANG_DIKERJAKAN
    ).length;
    const qc = tenantServices.filter(s =>
      s.status === ServiceStatus.QC
    ).length;
    const selesai = tenantServices.filter(s =>
      s.status === ServiceStatus.SELESAI
    ).length;
    const siapDiambil = tenantServices.filter(s =>
      s.status === ServiceStatus.SIAP_DIAMBIL
    ).length;
    const terlambat = tenantServices.filter(s => {
      const est = s.estimatedCompletionDate ? new Date(s.estimatedCompletionDate) : null;
      return est && est < now && !finalStatuses.has(s.status);
    }).length;
    const totalEstimasiBulanIni = Math.round(tenantServices
      .filter(s => {
        const d = s.createdAt ? new Date(s.createdAt) : null;
        return d && d >= monthStart;
      })
      .reduce((n, t) => n + (Number(t.estimatedCost) || 0), 0));
    const kpiItems = [
      { label: "Aktif", value: active.length, color: "text-blue-600 dark:text-blue-400" },
      { label: "Baru Hari Ini", value: baruHariIni, color: "text-emerald-600 dark:text-emerald-400" },
      { label: "Menunggu Diagnosa", value: menungguDiagnosa, color: "text-amber-600 dark:text-amber-400" },
      { label: "Menunggu Approval", value: menungguApproval, color: "text-orange-600 dark:text-orange-400" },
      { label: "Dikerjakan", value: dikerjakan, color: "text-blue-600 dark:text-blue-400" },
      { label: "QC", value: qc, color: "text-purple-600 dark:text-purple-400" },
      { label: "Selesai", value: selesai, color: "text-emerald-600 dark:text-emerald-400" },
      { label: "Siap Diambil", value: siapDiambil, color: "text-accent dark:text-accent" },
      { label: "Terlambat", value: terlambat, color: "text-rose-600 dark:text-rose-400" },
      { label: "Estimasi (Bln Ini)", value: `Rp${totalEstimasiBulanIni.toLocaleString("id-ID")}`, color: "text-slate-700 dark:text-zinc-300" },
    ];
    return (
      <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3">
        {kpiItems.map((item, i) => (
          <div key={i} className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-2 text-center">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">{item.label}</p>
            <p className={`text-sm font-extrabold mt-0.5 ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>
      {/* QC Report + SLA Breach */}
      {(() => {
        const qcTickets = tenantServices.filter(s => typeof s.qcScore === "number");
        const avgQcScore = qcTickets.length ? Math.round(qcTickets.reduce((sum, s) => sum + Number(s.qcScore), 0) / qcTickets.length) : 0;
        const slaHours = tenantObj?.settings?.serviceSettings?.slaHours || 24;
        const slaBreaches = active.filter(s => s.createdAt && now.getTime() - new Date(s.createdAt).getTime() > slaHours * 3600_000).length;
        const techCount = qcTickets.reduce((acc, s) => { const k = s.assignedTechId || "unassigned"; acc.add(k); return acc; }, new Set<string>());
        return (
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 pt-1">
            <span className="font-bold text-accent">QC Rata-rata: <strong>{avgQcScore}%</strong></span>
            <span className="text-slate-300">·</span>
            <span className="font-bold text-rose-600">Pelanggaran SLA: <strong>{slaBreaches}</strong></span>
            <span className="text-slate-300">·</span>
            <span className="font-bold text-slate-600">Teknisi Aktif: <strong>{techCount.size}</strong></span>
          </div>
        );
      })()}
      </>
    );
  })()}
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-2.5">
    <div>
      <h4 className="font-extrabold text-xs uppercase text-slate-800 dark:text-zinc-100 tracking-tight">
        Daftar Servis
      </h4>
    </div>
    <div className="flex items-center gap-2">
      {/* Feature 2: Bulk Actions UI */}
      {selectedServiceIds.length > 0 &&
        (currentUser?.role === UserRole.OWNER ||
        currentUserPermissions.includes(
          "action-services-delete-ticket",
        )) && (
          <div className="flex items-center gap-2 animate-fadeIn">
            <span className="text-[10px] font-bold text-accent px-2">
              {selectedServiceIds.length} Terpilih
            </span>
            <button
              onClick={async () => {
                if (
                  await showConfirm({
                    title: "Hapus Tiket Massal",
                    message: `Apakah Anda yakin ingin menghapus ${selectedServiceIds.length} tiket terpilih secara permanen?`,
                    confirmLabel: "Ya, Hapus Permanen",
                    type: "danger",
                  })
                ) {
                  selectedServiceIds.forEach((id) => {
                    updateServiceTicket(id, { deletedAt: new Date().toISOString() } as any);
                  });
                  setSelectedServiceIds([]);
                  showToast(
                    `${selectedServiceIds.length} tiket berhasil dihapus secara massal.`,
                    "success",
                  );
                }
              }}
              className="px-3 py-1.5 text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-xl hover:bg-rose-100 transition cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus Massal
            </button>
          </div>
        )}
      {/* Feature 3: Excel Export UI */}
      <button
        onClick={() => {
          const csvContent =
            "data:text/csv;charset=utf-8,Ticket No,Device,Customer,Status,Price\n" +
            tenantServices
              .map(
                (s) =>
                  `${s.ticketNo},${s.deviceName},${customers.find((c) => c.id === s.customerId)?.name || "-"},${s.status},${s.estimatedCost || 0}`,
              )
              .join("\n");
          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          link.setAttribute("download", "daftar_servis_saas.csv");
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }}
        className="px-3 py-1.5 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 transition cursor-pointer flex items-center gap-1.5"
      >
        <FileText className="w-3.5 h-3.5" /> Export CSV
      </button>
      <button
        onClick={() => setActiveSubTab("new-ticket")}
        className={`bg-accent hover:bg-accent-hover text-white font-extrabold text-[10px] px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all ${isSubTabAllowed("services", "new-ticket") ? "" : "hidden"}`}
      >
        <PlusCircle className="w-3.5 h-3.5" /> Terima Unit Baru
      </button>
    </div>
  </div>
  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 xl:w-full xl:mb-2">
    {[
      {
        label: "Semua Unit",
        filter: "ALL",
        count: tenantServices.length,
        color:
          "border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 bg-slate-50 dark:bg-zinc-900/60",
        hide: false,
      },
      {
        label: "Baru",
        filter: ServiceStatus.DITERIMA,
        count: tenantServices.filter(
          (s) => s.status === ServiceStatus.DITERIMA,
        ).length,
        color:
          "border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 bg-white dark:bg-zinc-900",
      },
      {
        label: "Diagnosa",
        filter: ServiceStatus.DIAGNOSA,
        count: tenantServices.filter(
          (s) => s.status === ServiceStatus.DIAGNOSA,
        ).length,
        color:
          "border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/20",
      },
      {
        label: "Pending",
        filter: ServiceStatus.MENUGGU_APPROVAL,
        count: tenantServices.filter(
          (s) => s.status === ServiceStatus.MENUGGU_APPROVAL,
        ).length,
        color:
          "border-blue-200 dark:border-blue-900/40 text-blue-800 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20",
      },
      {
        label: "Kerja",
        filter: ServiceStatus.SEDANG_DIKERJAKAN,
        count: tenantServices.filter(
          (s) => s.status === ServiceStatus.SEDANG_DIKERJAKAN,
        ).length,
        color:
          "border-blue-200 dark:border-blue-900/40 text-blue-800 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20",
      },
      {
        label: "Rework",
        filter: ServiceStatus.REWORK,
        count: tenantServices.filter(
          (s) => s.status === ServiceStatus.REWORK,
        ).length,
        color:
          "border-orange-200 dark:border-orange-900/40 text-orange-800 dark:text-orange-400 bg-orange-50/30 dark:bg-orange-950/20",
      },
      {
        label: "Selesai",
        filter: ServiceStatus.SELESAI,
        count: tenantServices.filter(
          (s) => s.status === ServiceStatus.SELESAI,
        ).length,
        color:
          "border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20",
      },
      {
        label: "Diambil",
        filter: ServiceStatus.DIAMBIL,
        count: tenantServices.filter(
          (s) => s.status === ServiceStatus.DIAMBIL,
        ).length,
        color:
          "border-slate-300 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800/40",
      },
    ].filter(card => card.label === "Semua Unit" || card.count > 0).map((card) => (
      <button
        key={card.filter}
        onClick={() => setStatusFilter(card.filter)}
        className={`border rounded-xl p-2.5 text-left transition-all hover:shadow-sm cursor-pointer select-none ${statusFilter === card.filter ? 'ring-2 ring-indigo-500/30 border-accent bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-950/30 dark:to-indigo-900/40 shadow-md transform scale-[1.02]' : ''} ${card.color}`}
      >
        <p className="text-[9px] uppercase font-mono font-bold opacity-70 tracking-wider truncate">
          {card.label}
        </p>
        <p className="text-lg font-bold mt-0.5 font-mono">
          {card.count}
        </p>
      </button>
    ))}
  </div>

  {/* Main List Table Area */}
  <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col overflow-hidden min-h-[480px]">
    <div className="p-3 border-b border-slate-100 bg-slate-50/55 flex items-center justify-between gap-2">
      <div className="relative flex-1 flex items-center gap-2">
        <input
          type="text"
          placeholder="Cari tiket, nama, device..."
          value={srvSearchQuery}
          onChange={(e) => setSrvSearchQuery(e.target.value)}
          className="w-full text-xs px-3 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg outline-none focus:border-accent dark:focus:border-accent bg-white dark:bg-zinc-900"
        />
        <select
          value={srvSort}
          onChange={(e) => setSrvSort(e.target.value as any)}
          className="text-xs px-2 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 outline-none"
        >
          <option value="newest">Terbaru</option>
          <option value="oldest">Terlama</option>
          <option value="cost_desc">Biaya Tinggi</option>
          <option value="cost_asc">Biaya Rendah</option>
        </select>
      </div>
    </div>

    {/* Filter chips */}
    {statusFilter !== "ALL" && (
      <div className="flex items-center gap-1.5 px-3 pb-1.5">
        <span className="text-xs text-slate-500">Filter:</span>
        <span className="px-2 py-0.5 text-xs font-bold bg-indigo-100 text-accent rounded-full">
          {statusFilter}
        </span>
        <button
          onClick={() => setStatusFilter("ALL")}
          className="text-xs text-slate-500 hover:text-blue-600"
        >
          ✕ Clear
        </button>
      </div>
    )}

    <div className="max-h-[650px] overflow-y-auto p-3 space-y-1.5 bg-slate-50/50 dark:bg-zinc-950/20">
      {tenantServices
        .filter((s) => {
          const q = srvSearchQuery.toLowerCase();
          const matchesQuery =
            s.ticketNo.toLowerCase().includes(q) ||
            s.deviceName.toLowerCase().includes(q) ||
            (s.deviceBrandModel && s.deviceBrandModel.toLowerCase().includes(q)) ||
            (customers.find((c) => c.id === s.customerId)?.name || "").toLowerCase().includes(q);
          if (statusFilter === "ALL") return matchesQuery;
          return matchesQuery && s.status === statusFilter;
        })
        .sort((a, b) => {
          if (srvSort === "cost_desc") return Number(b.estimatedCost || 0) - Number(a.estimatedCost || 0);
          if (srvSort === "cost_asc") return Number(a.estimatedCost || 0) - Number(b.estimatedCost || 0);
          const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          return srvSort === "oldest" ? diff : -diff;
        })
        .map((s) => {
          const customer = customers.find((c) => c.id === s.customerId);
          const technician = employees.find((e) => e.id === s.assignedTechId);

          // Style Status Badges
          const getStatusBadge = (status: ServiceStatus) => {
            switch (status) {
              case ServiceStatus.DITERIMA:
              case ServiceStatus.ANTRIAN:
                return "bg-slate-100 text-slate-800 border-slate-200";
              case ServiceStatus.DIAGNOSA:
                return "bg-amber-100 text-amber-800 border-amber-200";
              case ServiceStatus.MENUGGU_APPROVAL:
                return "bg-sky-100 text-sky-800 border-sky-200";
              case ServiceStatus.SEDANG_DIKERJAKAN:
                return "bg-indigo-100 text-indigo-800 border-indigo-200";
              case ServiceStatus.QC:
                return "bg-teal-100 text-teal-800 border-teal-200";
              case ServiceStatus.SELESAI:
              case ServiceStatus.SIAP_DIAMBIL:
                return "bg-emerald-100 text-emerald-800 border-emerald-200 font-bold";
              case ServiceStatus.DIAMBIL:
                return "bg-slate-100 text-slate-500 border-slate-200";
              case ServiceStatus.REWORK:
                return "bg-orange-100 text-orange-800 border-orange-200";
              case ServiceStatus.MENUGGU_SPAREPART:
                return "bg-purple-100 text-purple-800 border-purple-200";
              case ServiceStatus.DIKIRIM_KE_VENDOR:
                return "bg-pink-100 text-pink-800 border-pink-200";
              default:
                return "bg-slate-100 text-slate-800 border-slate-200";
            }
          };

          const statusRail = s.status === ServiceStatus.SELESAI || s.status === ServiceStatus.SIAP_DIAMBIL || s.status === ServiceStatus.DIAMBIL
            ? "border-l-emerald-500"
            : s.status === ServiceStatus.REWORK
              ? "border-l-orange-500"
              : s.status === ServiceStatus.DIAGNOSA
                ? "border-l-amber-500"
                : s.status === ServiceStatus.QC
                  ? "border-l-teal-500"
                  : "border-l-indigo-400";

          // Avatar inisial
          const initials = (customer?.name || "U").charAt(0).toUpperCase();

          return (
            <div
              key={s.id}
              onClick={() => {
                setViewingServiceTicketId(s.id);
                setManualDiagNotes(s.techDiagnosis || "");
                setManualDiagCost(String(Number(s.estimatedCost) || 0));
              }}
              className={`group relative bg-white dark:bg-zinc-900 rounded-2xl border border-l-[4px] ${statusRail} border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer select-none ${
                viewingServiceTicketId === s.id ? "ring-2 ring-indigo-400/40 border-l-[5px]" : ""
              }`}
            >
              <div className="flex items-center gap-2 px-3 py-2.5">

                {/* Checkbox */}
                <div
                  className="shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedServiceIds.includes(s.id)}
                    onChange={() => {
                      if (selectedServiceIds.includes(s.id)) {
                        setSelectedServiceIds(
                          selectedServiceIds.filter((id) => id !== s.id),
                        );
                      } else {
                        setSelectedServiceIds([
                          ...selectedServiceIds,
                          s.id,
                        ]);
                      }
                    }}
                    className="w-3.5 h-3.5 rounded border-slate-300"
                  />
                </div>

                {/* Avatar inisial */}
                <span
                  className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold font-mono
                    ${statusRail.includes("emerald") ? "bg-emerald-100 text-emerald-700" :
                      statusRail.includes("orange") ? "bg-orange-100 text-orange-700" :
                      statusRail.includes("amber") ? "bg-amber-100 text-amber-700" :
                      statusRail.includes("teal") ? "bg-teal-100 text-teal-700" :
                      "bg-indigo-100 text-accent"}`}
                >
                  {initials}
                </span>

                {/* Main content — 3-line info */}
                <div className="flex-1 min-w-0 flex flex-col gap-0 leading-tight">
                  {/* Baris 1: tiket + customer */}
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold font-mono text-[11px] text-blue-600 dark:text-blue-400">
                      #{s.ticketNo}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-800 dark:text-zinc-100 truncate">
                      {customer?.name || "Umum"}
                    </span>
                  </div>
                  {/* Baris 2: device + brand + keluhan */}
                  <div className="flex items-center gap-1.5 text-[9.5px] text-slate-500 dark:text-zinc-400 truncate">
                    <span className="truncate">{s.deviceName}</span>
                    {s.deviceBrandModel && (
                      <span className="text-[8px] text-slate-400 font-mono shrink-0">· {s.deviceBrandModel}</span>
                    )}
                  </div>
                  {/* Baris 2b: keluhan */}
                  {s.customerComplaints && (
                    <div className="flex items-center gap-1 text-[9px] text-slate-400 dark:text-zinc-500 truncate italic">
                      <span className="shrink-0">💬</span>
                      <span className="truncate">{s.customerComplaints}</span>
                    </div>
                  )}
                  {/* Baris 3: phone + teknisi + tanggal */}
                  <div className="flex items-center gap-2 text-[8.5px] text-slate-400 dark:text-zinc-500 font-mono">
                    {customer?.phone ? <span>{customer.phone}</span> : null}
                    {technician ? (
                      <span className="text-indigo-400 dark:text-indigo-300">· 🔧 {technician.name}</span>
                    ) : null}
                    <span className="ml-auto">{new Date(s.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                  </div>
                </div>

                {/* Status badge + harga stacking */}
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <span
                    className={`px-2 py-0.5 text-[8px] font-bold rounded-md border uppercase font-mono tracking-wide ${getStatusBadge(s.status)}`}
                  >
                    {s.status === ServiceStatus.DITERIMA ? "Baru" :
                     s.status === ServiceStatus.MENUGGU_APPROVAL ? "Pending" :
                     s.status === ServiceStatus.SEDANG_DIKERJAKAN ? "Kerja" :
                     s.status === ServiceStatus.SIAP_DIAMBIL ? "Ambil" :
                     s.status === ServiceStatus.DIKIRIM_KE_VENDOR ? "Vendor" :
                     s.status}
                  </span>
                  <span className="font-bold font-mono text-[10px] text-slate-700 dark:text-zinc-300 tabular-nums">
                    Rp{Number(s.estimatedCost || 0).toLocaleString("id-ID")}
                  </span>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-3 h-3 text-slate-300 dark:text-zinc-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          );
        })}
    </div>
  </div>

  {/* Floating bulk action bar */}
  {selectedServiceIds.length > 0 && (
    <div className="sticky bottom-0 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-b-2xl p-2.5 flex items-center justify-between shadow-lg -mt-2">
      <span className="text-xs font-bold text-accent">{selectedServiceIds.length} terpilih</span>
      <div className="flex items-center gap-2">
        {(currentUser?.role === UserRole.OWNER || currentUserPermissions.includes("action-services-delete-ticket")) && (
          <button
            onClick={async () => {
              if (await showConfirm({ title: "Hapus Tiket Massal", message: `Yakin hapus ${selectedServiceIds.length} tiket?`, confirmLabel: "Ya", type: "danger" })) {
                selectedServiceIds.forEach((id) => updateServiceTicket(id, { deletedAt: new Date().toISOString() } as any));
                setSelectedServiceIds([]);
                showToast(`${selectedServiceIds.length} tiket dihapus.`, "success");
              }
            }}
            className="px-2.5 py-1 text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100"
          >
            Hapus
          </button>
        )}
        <button
          onClick={() => setSelectedServiceIds([])}
          className="px-2.5 py-1 text-[10px] font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          Batal
        </button>
      </div>
    </div>
  )}

  {/* Gemini AI diagnostic recommendations widget (when active) */}
  {selectedServiceId && aiLoading && (
    <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center shadow-inner">
      <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-accent animate-spin" />
      <p className="text-xs font-semibold text-slate-600 font-mono mt-3">
        Sedang merumuskan diagnosa terbaik dengan Gemini AI...
      </p>
    </div>
  )}

  {selectedServiceId && aiResult && (
    <div className="p-5 bg-gradient-to-r from-amber-50 to-indigo-50/30 border border-amber-200 rounded-xl space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-amber-100 pb-2.5">
        <h4 className="font-bold text-xs text-amber-800 flex items-center gap-2 uppercase font-mono">
          <Sparkles className="w-4 h-4 text-amber-500 animate-bounce" />{" "}
          Hasil Diagnosa Pintar Gemini AI
        </h4>
        <div className="flex gap-2">
          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[9px] font-mono uppercase">
            Tingkat Kesulitan: {aiResult.difficulty}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="space-y-2.5">
          <div>
            <p className="font-bold text-slate-700">
              Analisa Inti Masalah:
            </p>
            <p className="text-slate-600 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-slate-100 mt-1">
              {aiResult.coreIssue}
            </p>
          </div>
          <div>
            <p className="font-bold text-slate-700 mt-2">
              Catatan Perbaikan:
            </p>
            <p className="text-slate-600 italic leading-relaxed bg-white/70 p-2.5 rounded-lg border border-slate-100 mt-1">
              {aiResult.diagnosticNotes}
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <p className="font-bold text-slate-700">
              Estimasi Rentang Jasa:
            </p>
            <p className="text-sm font-extrabold text-accent font-mono mt-0.5">
              Rp {(aiResult.estimatedCostMin ?? 0).toLocaleString()} -
              Rp {(aiResult.estimatedCostMax ?? 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="font-bold text-slate-700">
              Suku Cadang yang Diperlukan:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-slate-600 mt-1 bg-white/70 p-2.5 rounded-lg border border-slate-100">
              {aiResult.requiredParts?.map(
                (part: any, index: number) => (
                  <li key={index} className="font-medium">
                    {part?.partName} (~Rp{" "}
                    {(part?.estPrice ?? 0).toLocaleString()})
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
        <button
          onClick={() => {
            setSelectedServiceId(null);
            setAiResult(null);
          }}
          className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
        >
          Abaikan
        </button>
        <button
          onClick={() =>
            handleApplyAiRecommendation(selectedServiceId!)
          }
          className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white font-bold rounded-lg text-xs cursor-pointer shadow-md shadow-accent/10 flex items-center gap-1"
        >
          <Check className="w-3.5 h-3.5" /> Terapkan Diagnosa &
          Estimasikan Biaya
        </button>
      </div>
    </div>
  )}
  <ServiceDetailModal {...props} />
  <DocumentPrintouts
    showSpkPrintout={showSpkPrintout}
    setShowSpkPrintout={setShowSpkPrintout}
    showInvoicePrintout={showInvoicePrintout}
    setShowInvoicePrintout={setShowInvoicePrintout}
    showProvisionalQuote={showProvisionalQuote}
    setShowProvisionalQuote={setShowProvisionalQuote}
    showWarrantyPrintout={showWarrantyPrintout}
    setShowWarrantyPrintout={setShowWarrantyPrintout}
    tenantServices={tenantServices}
    customers={customers}
    employees={employees}
    currentUser={currentUser}
    showToast={showToast}
    printConfig={tenantObj?.settings?.printConfig}
  />
  <ServiceModals {...props} />
</div>
  );
};