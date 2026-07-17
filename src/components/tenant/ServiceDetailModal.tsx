import * as React from "react";
import { createPortal } from "react-dom";
import { Badge } from "../ui/Badge";
import { DocumentPrintouts } from "./services/DocumentPrintouts";
import { getStorageLocations } from "./StorageLocationManager";
import { buildServiceReceptionPreview } from "../../utils/serviceReceptionUtils";
import { ServiceStatus, UserRole, CustomerSegment, PaymentMethod } from "../../types";
import { Building2, Sliders, Receipt, Lock, Zap, FileText, ChevronRight, HelpCircle, Save, PlusCircle, CheckCircle2, Trash2, Copy, AlertTriangle, Monitor, ExternalLink, Brush, Ticket, X, Paintbrush, Fingerprint, MapPin, Search, CheckSquare, Activity, Camera, Maximize, Check, Calendar, ArrowRight, Printer, AlertCircle, RefreshCw, MessageSquare, Wrench, Upload, Minus, Eye, Edit, MoreVertical, SearchIcon, CheckCircle, Package, Send, Filter, ChevronLeft, QrCode, Cpu, Share2, Barcode, ShieldCheck, Timer, PackagePlus, Sparkles, ListChecks } from "lucide-react";


export const ServiceDetailModal: React.FC<any> = (props) => {
  const { activeTenantId, addServiceDiagnostic, approveServiceEstimate, cameraActive, cancelServicePart, completeServiceQC, currentTenantId, currentUser, customWaMessageText, customers, employees, handoverChecklist, handoverPaymentMethod, handoverProofName, handoverRefNo, handoverServiceDevice, handoverTempoDays, internalCommentText, liveTimerSeconds, manualDiagCost, manualDiagNotes, openManualEstimateWhatsApp, openMicroComponentModal, products, qcNotes, qcScore, renderTenantWaTemplate, requestPartMode, requestServicePart, requestedPartId, requestedPartQty, selectedSparepartId, setAdditionalCostApprovedBy, setAdditionalCostTicket, setCustomWaMessageText, setHandoverChecklist, setHandoverPaymentMethod, setHandoverProofName, setHandoverRefNo, setHandoverTempoDays, setInternalCommentText, setManualDiagCost, setManualDiagNotes, setPartOrderTicket, setQcNotes, setQcScore, setRequestPartMode, setRequestedPartId, setRequestedPartQty, setSelectedSparepartId, setShowInvoicePrintout, setShowProvisionalQuote, setShowSpkPrintout, setShowWarrantyPrintout, setSparepartQty, setSparepartSN, setViewingServiceTicketId, showToast, sparepartQty, sparepartSN, startCamera, stopCamera, tenantObj, tenantServices, updateServiceStatus, updateServiceTicket, videoRef, viewingServiceTicketId } = props;
  if (!viewingServiceTicketId) return null;
  const ticket = tenantServices.find(
    (s) => s.id === viewingServiceTicketId,
  );
  if (!ticket) return null;
  const customer = customers.find(
    (c) => c.id === ticket.customerId,
  );
  const technician = employees.find(
    (e) => e.id === ticket.assignedTechId,
  );

  // Filter products that are spare parts / accessories
  const tenantProducts = products.filter(
    (p) => p.tenantId === currentTenantId,
  );
  const sparepartsList = tenantProducts.filter(
    (p) =>
      (p.category &&
    ["SPAREPART", "SUKU CADANG", "AKSESORIS"].includes(
      p.category.toUpperCase(),
    )) ||
      p.name.toLowerCase().includes("spare") ||
      p.name.toLowerCase().includes("ic ") ||
      p.name.toLowerCase().includes("layar") ||
      p.name.toLowerCase().includes("baterai") ||
      p.name.toLowerCase().includes("flex") ||
      p.name.toLowerCase().includes("connector"),
  );

  // Local dynamic tab state inside modal
  // We use React state via an inline trick or store it in state variables. Since we need state, let's use the local storage or a variable. We can define a local toggle inside.
  // Let's create an elegant tabs selector inside the modal

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4" onClick={() => setViewingServiceTicketId(null)}>
          <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <Wrench className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-800">
                      Manajemen Perbaikan & Servis
                    </h3>
                    <span className="font-mono text-xs font-bold text-indigo-600">
                      #{ticket.ticketNo}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Status Aktif:{" "}
                    <strong className="text-indigo-600">
                      {ticket.status}
                    </strong>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSpkPrintout(ticket.id)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />{" "}
                  Cetak SPK
                </button>
                {["SELESAI", "SIAP_DIAMBIL", "DIAMBIL"].includes(
                  ticket.status,
                ) && (
                  <>
                    <button
                      onClick={() =>
                        setShowInvoicePrintout(ticket.id)
                      }
                      className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-500" />{" "}
                      Cetak Invoice Pembayaran
                    </button>
                    <button
                      onClick={() =>
                        setShowWarrantyPrintout(ticket.id)
                      }
                      className="px-2.5 py-1.5 bg-indigo-50 border border-indigo-100 hover:bg-indigo-150 text-indigo-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />{" "}
                      Cetak Kartu Garansi
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setViewingServiceTicketId(null);
                    setInternalCommentText("");
                    setManualDiagNotes("");
                    setManualDiagCost("");
                    setSelectedSparepartId("");
                    setSparepartSN("");
                  }}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
              {/* LEFT PANEL: Ticket Meta Info, Checklist & Logs */}
              <div className="xl:w-[30%] 2xl:w-[28%] border-r border-slate-100 bg-slate-50/50 p-2 lg:p-3 overflow-y-auto space-y-2">
                {/* Section: Customer & Device */}
                <div className="bg-white p-3 border border-slate-100 rounded-2xl space-y-2 shadow-xs">
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <p>
                      <span className="text-slate-400 font-mono text-[10px]">
                        PELANGGAN:
                      </span>{" "}
                      <strong className="text-slate-800">
                        {customer?.name || "Umum"}
                      </strong>
                    </p>
                    <p>
                      <span className="text-slate-400 font-mono text-[10px]">
                        PHONE:
                      </span>{" "}
                      <span className="font-mono">
                        {customer?.phone || "-"}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400 font-mono text-[10px]">
                        TIPE UNIT:
                      </span>{" "}
                      <strong className="text-slate-700">
                        {ticket.deviceName}
                      </strong>
                    </p>
                    {ticket.deviceBrandModel && (
                      <p>
                        <span className="text-slate-400 font-mono text-[10px]">
                          BRAND/MODEL:
                        </span>{" "}
                        <span>{ticket.deviceBrandModel}</span>
                      </p>
                    )}
                    <p>
                      <span className="text-slate-400 font-mono text-[10px]">
                        SERIAL NO:
                      </span>{" "}
                      <span className="font-mono text-[11px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        {ticket.deviceSerial || "N/A"}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400 font-mono text-[10px]">
                        MASA GARANSI:
                      </span>{" "}
                      <span className="font-bold text-indigo-600">
                        {ticket.warrantyMonths} Bulan
                      </span>
                    </p>

                    {ticket.deviceCategory && (
                      <p>
                        <span className="text-slate-400 font-mono text-[10px]">
                          KATEGORI:
                        </span>{" "}
                        <strong className="text-slate-700">
                          {ticket.deviceCategory}
                        </strong>
                      </p>
                    )}
                    {ticket.physicalCondition && (
                      <p>
                        <span className="text-slate-400 font-mono text-[10px]">
                          KONDISI FISIK:
                        </span>{" "}
                        <strong className="text-slate-700">
                          {ticket.physicalCondition}
                        </strong>
                      </p>
                    )}
                    {ticket.screenLockPin && (
                      <p>
                        <span className="text-slate-400 font-mono text-[10px]">
                          PIN KUNCI LAYAR:
                        </span>{" "}
                        <span className="font-mono bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-bold border border-amber-100">
                          {ticket.screenLockPin}
                        </span>
                      </p>
                    )}
                    {ticket.estimatedCompletionDate && (
                      <p>
                        <span className="text-slate-400 font-mono text-[10px]">
                          EST. SELESAI:
                        </span>{" "}
                        <strong className="text-emerald-700">
                          {new Date(
                            ticket.estimatedCompletionDate,
                          ).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </strong>
                      </p>
                    )}

                    {((ticket.accessoriesLeft &&
                      ticket.accessoriesLeft.length > 0) ||
                      ticket.customAccessories) && (
                      <p>
                        <span className="text-slate-400 font-mono text-[10px]">
                          AKSESORIS TITIPAN:
                        </span>{" "}
                        <span className="font-semibold text-slate-700 text-[11px]">
                          {ticket.accessoriesLeft
                            ? ticket.accessoriesLeft
                                .map((acc) => {
                                  const labels: Record<
                                    string,
                                    string
                                  > = {
                                    charger: "Charger",
                                    cable: "Kabel",
                                    sim: "SIM",
                                    sd: "SD",
                                    case: "Case",
                                    box: "Box",
                                  };
                                  return labels[acc] || acc;
                                })
                                .join(", ")
                            : ""}
                          {ticket.customAccessories
                            ? ticket.accessoriesLeft &&
                              ticket.accessoriesLeft.length > 0
                              ? `, ${ticket.customAccessories}`
                              : ticket.customAccessories
                            : ""}
                        </span>
                      </p>
                    )}

                    {ticket.isCheckOnly && (
                      <div className="mt-1 bg-amber-50 border border-amber-100 text-amber-800 text-[10.5px] font-bold px-2 py-1 rounded-lg">
                        🔍 HANYA CEK / ESTIMASI DULU
                      </div>
                    )}
                    {ticket.downPayment && ticket.downPayment > 0 ? (
                      <div className="mt-1 bg-emerald-50 border border-emerald-150 text-emerald-800 text-[10.5px] font-bold px-2 py-1 rounded-lg flex items-center justify-between">
                        <span>💵 UANG MUKA (DP):</span>
                        <span>
                          Rp {ticket.downPayment.toLocaleString()}
                        </span>
                      </div>
                    ) : null}

                    {/* Dynamic Specifications Viewer inside Ticket Details */}
                    {ticket.dynamicFields &&
                      Object.keys(ticket.dynamicFields).length >
                        0 && (
                        <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                          <p className="font-mono text-[9px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                            <Cpu className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />{" "}
                            Spesifikasi Kategori (
                            {ticket.deviceCategory})
                          </p>
                          <div className="grid grid-cols-1 gap-1 text-[10.5px]">
                            {Object.entries(ticket.dynamicFields).map(
                              ([key, val]) => (
                                <div
                                  key={key}
                                  className="flex justify-between border-b border-slate-100 last:border-0 py-0.5"
                                >
                                  <span className="text-slate-400 capitalize">
                                    {key.replace("_", " ")}:
                                  </span>
                                  <strong className="text-slate-700 font-mono text-[10px]">
                                    {String(val)}
                                  </strong>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    {/* Interactive Technician Assign / Change Dropdown */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">
                        Teknisi Penanggung Jawab
                      </label>
                      <select
                        value={ticket.assignedTechId || ""}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const techName =
                            employees.find(
                              (emp) => emp.id === selectedId,
                            )?.name || "Antrian Bebas";
                          const currentTimeline =
                            ticket.timeline || [];
                          const updatedTimeline = [
                            ...currentTimeline,
                            {
                              status: ticket.status,
                              note: `Teknisi penanggung jawab diubah ke: ${techName}`,
                              timestamp: new Date().toISOString(),
                              operator: currentUser?.name || "Sistem",
                            },
                          ];
                          updateServiceTicket(ticket.id, {
                            assignedTechId: selectedId
                              ? selectedId
                              : undefined,
                            timeline: updatedTimeline,
                          });
                        }}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-indigo-500 font-semibold cursor-pointer text-slate-700"
                      >
                        <option value="">
                          -- Antrian Bebas (Belum Ditugaskan) --
                        </option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.position})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Storage Location Selector */}
                    {(() => {
                      const storageLocs = getStorageLocations(activeTenantId || "").filter(l => l.type === "UNIT_SERVICE");
                      return storageLocs.length > 0 ? (
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">Lokasi Rak Penyimpanan</label>
                          <select
                            value={ticket.storageLocationId || ""}
                            onChange={(e) => {
                              updateServiceTicket(ticket.id, {
                                storageLocationId: e.target.value || undefined,
                              });
                              showToast("Lokasi penyimpanan diperbarui.", "success");
                            }}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-indigo-500 font-semibold cursor-pointer text-slate-700"
                          >
                            <option value="">— Belum Ditentukan —</option>
                            {storageLocs.map(loc => (
                              <option key={loc.id} value={loc.id}>
                                📍 {loc.code} — {loc.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>

                {/* Section: Photos */}
                <div className="hidden">
                  {ticket.initialPhotos && ticket.initialPhotos.length > 0 && (
                    <div className="bg-white p-3.5 border border-slate-100 rounded-xl space-y-2 shadow-xs">
                      <h4 className="font-bold text-[10px] text-indigo-600 uppercase font-mono tracking-wider">
                        Foto Masuk
                      </h4>
                      <div className="rounded-lg overflow-hidden border border-slate-200">
                        <img src={ticket.initialPhotos[0]} alt="Condition" className="w-full h-32 object-cover" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Interactive Camera & Ticket Captured Conditions Gallery */}
                <div className="p-2.5 bg-white border border-slate-100 rounded-xl space-y-2 shadow-xs">
                  <h4 className="font-bold text-[10px] text-slate-500 uppercase font-mono tracking-wider flex items-center justify-between">
                    <span>
                      Foto ({ticket.capturedConditions?.length || 0})
                    </span>
                    <span className="text-[8px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-100 px-1 py-0.5 rounded-md">
                      Live Capture
                    </span>
                  </h4>

                  {ticket.capturedConditions &&
                  ticket.capturedConditions.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                      {ticket.capturedConditions.map((cap) => (
                        <div
                          key={cap.id}
                          className="relative rounded-lg overflow-hidden border border-slate-200 h-16 group bg-slate-900"
                        >
                          <img
                            src={cap.url}
                            alt={cap.category}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/75 p-0.5 flex items-center justify-between">
                            <span className="text-[7px] font-mono font-bold text-white uppercase truncate max-w-[50px]">
                              {cap.category}
                            </span>
                            <span className="text-[6.5px] font-mono text-slate-300">
                              {cap.timestamp}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic text-center">
                      Belum ada foto rekam kondisi terlampir.
                    </p>
                  )}

                  {/* Live Workstation Camera Trigger */}
                  {cameraActive ? (
                    <div className="border border-indigo-100 rounded-lg p-2 bg-slate-900 space-y-2">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-24 object-cover bg-black rounded"
                      />
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            // Real capture photo and append
                            try {
                              const canvas =
                                document.createElement("canvas");
                              canvas.width = 640;
                              canvas.height = 480;
                              const ctx = canvas.getContext("2d");
                              if (ctx && videoRef.current) {
                                ctx.drawImage(
                                  videoRef.current,
                                  0,
                                  0,
                                  640,
                                  480,
                                );
                                const dataUrl =
                                  canvas.toDataURL("image/jpeg");
                                const newPhoto = {
                                  id: "photo-" + Date.now().toString(36) + "a",
                                  url: dataUrl,
                                  category: "Kerusakan Fisik",
                                  timestamp:
                                    new Date().toLocaleTimeString(
                                      "id-ID",
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    ),
                                };
                                updateServiceTicket(ticket.id, {
                                  capturedConditions: [
                                    ...(ticket.capturedConditions ||
                                      []),
                                    newPhoto,
                                  ],
                                });
                                showToast(
                                  "Foto berhasil diambil dan disimpan langsung ke tiket!",
                                  "success",
                                );
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold py-1 rounded cursor-pointer"
                        >
                          Jepret
                        </button>
                        <button
                          onClick={() => {
                            // Simulation trigger inside workstation
                            const images = [
                              "https://images.unsplash.com/photo-1601524909162-be87252be298?auto=format&fit=crop&w=400&q=80",
                              "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=400&q=80",
                              "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=400&q=80",
                              "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80",
                            ];
                            const randomImg =
                              images[
                                Math.floor(
                                  Math.random() * images.length,
                                )
                              ];
                            const newPhoto = {
                              id: "photo-" + Date.now().toString(36) + "b",
                              url: randomImg,
                              category: "Internal Damaged Component",
                              timestamp:
                                new Date().toLocaleTimeString(
                                  "id-ID",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                ),
                            };
                            updateServiceTicket(ticket.id, {
                              capturedConditions: [
                                ...(ticket.capturedConditions || []),
                                newPhoto,
                              ],
                            });
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold px-1.5 py-1 rounded cursor-pointer"
                        >
                          Demo
                        </button>
                        <button
                          onClick={stopCamera}
                          className="bg-slate-700 text-white text-[9px] font-bold px-1.5 py-1 rounded cursor-pointer"
                        >
                          X
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={startCamera}
                      className="w-full bg-slate-50 border border-dashed border-slate-200 hover:bg-indigo-50 text-[10.5px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-indigo-700 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" /> Ambil Foto
                      Kondisi Baru
                    </button>
                  )}
                </div>

                {/* Section: Checklist */}
                {ticket.initialChecklist &&
                  ticket.initialChecklist.length > 0 && (
                    <div className="bg-white p-3.5 border border-slate-100 rounded-xl space-y-2 shadow-xs">
                      <h4 className="font-bold text-[10px] text-indigo-600 uppercase font-mono tracking-wider">
                        Checklist Masuk
                      </h4>
                      <div className="grid grid-cols-1 gap-1.5">
                        {ticket.initialChecklist.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0"
                          >
                            <span className="text-slate-600">
                              {item.name}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 text-[8px] font-bold rounded-lg font-mono uppercase ${
                                item.checked
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {item.checked ? "OK" : "REJECT"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Section: Timeline Logs */}
                <div className="hidden bg-white p-3.5 border border-slate-100 rounded-xl space-y-3 shadow-xs">
                  <h4 className="font-bold text-[10px] text-indigo-600 uppercase font-mono tracking-wider">
                    Log Riwayat Perjalanan
                  </h4>
                  <div className="relative border-l-2 border-slate-100 pl-3 space-y-3 text-xs">
                    {ticket.timeline && ticket.timeline.length > 0 ? (
                      ticket.timeline.map((log, idx) => (
                        <div key={idx} className="relative group">
                          <div className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-white" />
                          <p className="font-semibold text-[10px] font-mono text-indigo-600">
                            {log.status}{" "}
                            <span className="text-slate-400 font-normal">
                              |{" "}
                              {new Date(
                                log.timestamp,
                              ).toLocaleDateString()}
                            </span>
                          </p>
                          <p className="text-slate-500 mt-0.5 italic">
                            {log.note}
                          </p>
                          <p className="text-[9px] text-slate-400">
                            Oleh: {log.operator || "Sistem"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 italic text-[11px]">
                        Belum ada catatan perjalanan.
                      </p>
                    )}
                  </div>
                </div>

                {/* Section: Internal Discussions */}
                <div className="hidden bg-amber-50/50 p-3.5 border border-amber-100 rounded-xl space-y-3 shadow-xs flex-col max-h-80">
                  <h4 className="font-bold text-[10px] text-amber-700 uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-500" />{" "}
                    Diskusi Internal (Tim)
                  </h4>
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {ticket.internalDiscussions &&
                    ticket.internalDiscussions.length > 0 ? (
                      ticket.internalDiscussions.map((msg, idx) => (
                        <div
                          key={msg.id || idx}
                          className="bg-white p-2 rounded-lg border border-amber-100 shadow-sm relative"
                        >
                          <div className="flex items-center justify-between mb-1 text-[9px]">
                            <span className="font-bold text-amber-800">
                              {msg.operator}
                            </span>
                            <span className="text-amber-500/70">
                              {new Date(
                                msg.timestamp,
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-700 whitespace-pre-wrap">
                            {msg.text}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-amber-600/60 italic text-center py-2">
                        Belum ada diskusi internal.
                      </p>
                    )}
                  </div>
                  <div className="pt-2 border-t border-amber-200/50 flex gap-2">
                    <input
                      type="text"
                      value={internalCommentText}
                      onChange={(e) =>
                        setInternalCommentText(e.target.value)
                      }
                      placeholder="Ketik pesan untuk tim..."
                      className="flex-1 bg-white border border-amber-200 rounded-lg text-[10px] px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          internalCommentText.trim()
                        ) {
                          updateServiceTicket(ticket.id, {
                            internalDiscussions: [
                              ...(ticket.internalDiscussions || []),
                              {
                                id: "comm-" + Date.now().toString(36) + "1",
                                text: internalCommentText.trim(),
                                operator:
                                  currentUser?.name || "System",
                                timestamp: new Date().toISOString(),
                              },
                            ],
                          });
                          setInternalCommentText("");
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (internalCommentText.trim()) {
                          updateServiceTicket(ticket.id, {
                            internalDiscussions: [
                              ...(ticket.internalDiscussions || []),
                              {
                                id: "comm-" + Date.now().toString(36) + "2",
                                text: internalCommentText.trim(),
                                operator:
                                  currentUser?.name || "System",
                                timestamp: new Date().toISOString(),
                              },
                            ],
                          });
                          setInternalCommentText("");
                        }
                      }}
                      disabled={!internalCommentText.trim()}
                      className="bg-amber-500 disabled:bg-amber-300 hover:bg-amber-600 text-white p-1.5 rounded-lg transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT PANEL: Interactive Workstation */}
              <div className="xl:w-[70%] 2xl:w-[72%] p-3 lg:p-5 overflow-y-auto space-y-4 lg:space-y-5 flex flex-col justify-between">
                <div className="space-y-6">
                  {/* Visual Repair Workflow Stepper */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-[10px] text-slate-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-indigo-500" />{" "}
                        Visual Repair Workflow
                      </h4>
                      <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
                        <span className="text-[9px] font-mono font-bold text-indigo-700">
                          Live Tracker & Control
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between relative mt-4 px-2">
                      {/* Connector Track line */}
                      <div className="absolute top-4 left-6 right-6 h-1 bg-slate-200 z-0 rounded" />

                      {(() => {
                        const getActiveStepIndex = (
                          st: ServiceStatus,
                        ) => {
                          switch (st) {
                            case ServiceStatus.DITERIMA:
                            case ServiceStatus.ANTRIAN:
                            case ServiceStatus.DIAGNOSA:
                              return 0; // Diagnosa
                            case ServiceStatus.MENUGGU_APPROVAL:
                            case ServiceStatus.APPROVAL_DITOLAK:
                              return 1; // Menunggu Persetujuan
                            case ServiceStatus.SEDANG_DIKERJAKAN:
                            case ServiceStatus.MENUGGU_SPAREPART:
                              return 2; // Proses Perbaikan
                            case ServiceStatus.QC:
                            case ServiceStatus.REWORK:
                              return 3; // QC/Testing
                            case ServiceStatus.SELESAI:
                            case ServiceStatus.SIAP_DIAMBIL:
                            case ServiceStatus.DIAMBIL:
                              return 4; // Siap Diambil
                            default:
                              return 0;
                          }
                        };

                        const steps = [
                          {
                            label: "Diagnosa",
                            status: ServiceStatus.DIAGNOSA,
                            desc: "Pengecekan Kendala",
                          },
                          {
                            label: "Persetujuan",
                            status: ServiceStatus.MENUGGU_APPROVAL,
                            desc: "Konfirmasi Estimasi",
                          },
                          {
                            label: "Perbaikan",
                            status: ServiceStatus.SEDANG_DIKERJAKAN,
                            desc: "Eksekusi Teknisi",
                          },
                          {
                            label: "QC/Testing",
                            status: ServiceStatus.QC,
                            desc: "Uji Layakan & Fungsi",
                          },
                          {
                            label: "Siap Diambil",
                            status: ServiceStatus.SIAP_DIAMBIL,
                            desc: "Siap Diserahkan",
                          },
                        ];

                        const activeIndex = getActiveStepIndex(
                          ticket.status,
                        );

                        return steps.map((step, idx) => {
                          const isCompleted = idx < activeIndex;
                          const isActive = idx === activeIndex;

                          return (
                            <div
                              key={idx}
                              className="flex flex-col items-center flex-1 relative z-10"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  const note = `Status diperbarui via Visual Workflow ke: ${step.label}`;
                                  updateServiceStatus(
                                    ticket.id,
                                    step.status,
                                    note,
                                  );
                                }}
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all border-2 cursor-pointer outline-none ${
                                  isCompleted
                                    ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20"
                                    : isActive
                                      ? "bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-100 shadow-md shadow-indigo-600/20"
                                      : "bg-white border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600"
                                }`}
                                title={`Ubah status ke ${step.label}`}
                              >
                                {isCompleted ? (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                ) : (
                                  idx + 1
                                )}
                              </button>
                              <span
                                className={`text-[9px] font-bold mt-1.5 text-center transition-colors ${
                                  isActive
                                    ? "text-indigo-600 font-extrabold"
                                    : isCompleted
                                      ? "text-emerald-600"
                                      : "text-slate-500"
                                }`}
                              >
                                {step.label}
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Technician Tools Center */}
                  {(currentUser.role === "TEKNISI" ||
                    currentUser.role === "ADMIN" ||
                    currentUser.role === "MANAGER" ||
                    true) && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                            <Timer className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
                              Pusat Kendali Teknisi
                            </h4>
                            <p className="text-[10px] text-slate-400">
                              SLA Timer, Catatan & Permintaan Suku
                              Cadang
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {(ticket.status === ServiceStatus.SEDANG_DIKERJAKAN || ticket.status === ServiceStatus.REWORK) && (
                            <>
                            <button
                              type="button"
                              onClick={() => setPartOrderTicket(ticket)}
                              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold flex items-center gap-1.5 shadow-sm"
                            >
                              <PackagePlus className="w-3.5 h-3.5" /> Menunggu Spare Part
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAdditionalCostTicket(ticket);
                                setAdditionalCostApprovedBy(customer?.name || "");
                              }}
                              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold flex items-center gap-1.5 shadow-sm"
                            >
                              <PlusCircle className="w-3.5 h-3.5" /> Tambahan Biaya Disetujui
                            </button>
                            </>
                          )}
                          {/* Timer Controls */}
                          {(() => {
                            const slaHours = tenantObj?.settings?.serviceSettings?.slaHours || 24;
                            const slaSeconds = slaHours * 3600;
                            const isBreached = liveTimerSeconds > slaSeconds && ticket.repairStartTime && !ticket.repairEndTime;
                            return (
                              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                                <span className={`text-xs font-mono font-bold ${isBreached ? 'text-rose-600' : 'text-slate-700'}`}>
                                  {Math.floor(liveTimerSeconds / 3600).toString().padStart(2, "0")}:
                                  {Math.floor((liveTimerSeconds % 3600) / 60).toString().padStart(2, "0")}:
                                  {(liveTimerSeconds % 60).toString().padStart(2, "0")}
                                </span>
                                {isBreached && <span className="text-[8px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full animate-pulse">SLA BREACH</span>}
                                {!ticket.repairStartTime ? (
                                  <button onClick={() => updateServiceTicket(ticket.id, { repairStartTime: new Date().toISOString() })} className="text-[9px] font-bold bg-emerald-600 text-white px-2 py-1 rounded shadow-xs cursor-pointer hover:bg-emerald-700">Mulai Servis</button>
                                ) : !ticket.repairEndTime ? (
                                  <button onClick={() => updateServiceTicket(ticket.id, { repairEndTime: new Date().toISOString() })} className="text-[9px] font-bold bg-rose-600 text-white px-2 py-1 rounded shadow-xs cursor-pointer hover:bg-rose-700">Hentikan Waktu</button>
                                ) : (
                                  <span className="text-[9px] font-bold text-slate-400 bg-slate-200 px-2 py-1 rounded">Selesai</span>
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
                            <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                              Admin/Teknisi Saja
                            </span>
                          </label>
                          <textarea
                            value={ticket.technicianNotes || ""}
                            onChange={(e) =>
                              updateServiceTicket(ticket.id, {
                                technicianNotes: e.target.value,
                              })
                            }
                            placeholder="Tulis kendala teknis, pin iclude, atau catatan skema di sini..."
                            className="w-full h-24 p-3 text-xs border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                          />
                        </div>

                        {/* Permintaan Sparepart & Skema */}
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openMicroComponentModal(ticket)}
                              disabled={!([ServiceStatus.DIAGNOSA, ServiceStatus.SEDANG_DIKERJAKAN, ServiceStatus.REWORK] as ServiceStatus[]).includes(ticket.status)}
                              title={!([ServiceStatus.DIAGNOSA, ServiceStatus.SEDANG_DIKERJAKAN, ServiceStatus.REWORK] as ServiceStatus[]).includes(ticket.status) ? "Komponen hanya dapat dipakai saat diagnosis atau pengerjaan" : undefined}
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
                              onClick={() =>
                                setRequestPartMode(!requestPartMode)
                              }
                              className="flex-1 flex flex-col items-center justify-center p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer group"
                            >
                              <PackagePlus className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform mb-1" />
                              <span className="text-[10px] font-bold text-slate-700">
                                Request Sparepart
                              </span>
                              <span className="text-[9px] text-slate-400">
                                Dari Gudang
                              </span>
                            </button>
                          </div>

                          {requestPartMode && (
                            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2 animate-fadeIn">
                              <select
                                value={requestedPartId}
                                onChange={(e) =>
                                  setRequestedPartId(e.target.value)
                                }
                                className="w-full text-xs p-2 rounded-lg border border-slate-200"
                              >
                                <option value="">
                                  -- Pilih Sparepart --
                                </option>
                                {sparepartsList.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} (Stok: {p.stock})
                                  </option>
                                ))}
                              </select>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  value={requestedPartQty}
                                  onChange={(e) =>
                                    setRequestedPartQty(
                                      parseInt(e.target.value) || 1,
                                    )
                                  }
                                  className="w-20 text-xs p-2 rounded-lg border border-slate-200"
                                />
                                <button
                                  onClick={() => {
                                    if (
                                      requestedPartId &&
                                      requestedPartQty > 0
                                    ) {
                                      const currentReqs =
                                        ticket.partsRequested || [];
                                      updateServiceTicket(ticket.id, {
                                        partsRequested: [
                                          ...currentReqs,
                                          {
                                            id: "req-" + Date.now().toString(36),
                                            sparepartId:
                                              requestedPartId,
                                            qty: requestedPartQty,
                                            status: "PENDING",
                                            requestedAt:
                                              new Date().toISOString(),
                                          },
                                        ],
                                      });
                                      setRequestedPartId("");
                                      setRequestPartMode(false);
                                      showToast(
                                        "Permintaan berhasil dikirim ke admin gudang!",
                                        "success",
                                      );
                                    }
                                  }}
                                  className="flex-1 bg-emerald-600 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-emerald-700"
                                >
                                  Kirim Permintaan
                                </button>
                              </div>
                            </div>
                          )}

                          {ticket.microComponentUsages && ticket.microComponentUsages.length > 0 && (
                            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 space-y-2">
                              <div className="flex items-center justify-between"><span className="text-[10px] font-extrabold text-indigo-800 uppercase">Komponen Mikro Terpakai</span><span className="text-[9px] text-indigo-500">{ticket.microComponentUsages.length} item</span></div>
                              {ticket.microComponentUsages.map((usage) => <div key={usage.id} className="flex items-start justify-between gap-3 rounded-lg bg-white border border-indigo-100 px-2.5 py-2"><div><p className="text-[10px] font-bold text-slate-700">{usage.name} × {usage.quantity}</p><p className="text-[9px] text-slate-400">{usage.chargeable ? `Ditagihkan Rp ${usage.chargeTotal.toLocaleString("id-ID")}` : "Pemakaian internal"}</p></div><span className="text-[9px] font-semibold text-slate-500">HPP Rp {usage.hppTotal.toLocaleString("id-ID")}</span></div>)}
                              <div className="pt-1 border-t border-indigo-100 grid grid-cols-2 gap-2 text-[9px]"><span>Total HPP: <strong>Rp {ticket.microComponentUsages.reduce((sum, item) => sum + item.hppTotal, 0).toLocaleString("id-ID")}</strong></span><span className="text-right">Ditagihkan: <strong className="text-indigo-700">Rp {ticket.microComponentUsages.reduce((sum, item) => sum + (item.chargeable ? item.chargeTotal : 0), 0).toLocaleString("id-ID")}</strong></span></div>
                            </div>
                          )}

                          {/* List of active requests */}
                          {ticket.partsRequested &&
                            ticket.partsRequested.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold text-slate-500">
                                  Status Permintaan Part:
                                </span>
                                <div className="max-h-24 overflow-y-auto space-y-1">
                                  {ticket.partsRequested.map(
                                    (req) => {
                                      const pName =
                                        sparepartsList.find(
                                          (x) =>
                                            x.id === req.sparepartId,
                                        )?.name || "Unknown Part";
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
                                              req.status === "PENDING"
                                                ? "bg-amber-100 text-amber-700"
                                                : req.status ===
                                                    "APPROVED"
                                                  ? "bg-emerald-100 text-emerald-700"
                                                  : "bg-rose-100 text-rose-700"
                                            }`}
                                          >
                                            {req.status}
                                          </span>
                                        </div>
                                      );
                                    },
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Interactive Testing & Checklist Center (Pre-Service & Post-Service QC) */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
                            Pusat Pengujian & Checklist Fungsi
                            Perangkat
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            Verifikasi kelayakan hardware & software
                            secara real-time
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-bold border border-indigo-150">
                        Teknisi:{" "}
                        {technician?.name || "Belum Ditugaskan"}
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
                          <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            {ticket.initialChecklist
                              ? ticket.initialChecklist.filter(
                                  (x) => x.checked,
                                ).length
                              : 0}{" "}
                            /{" "}
                            {ticket.initialChecklist
                              ? ticket.initialChecklist.length
                              : 0}{" "}
                            OK
                          </span>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-64 overflow-y-auto space-y-1.5">
                          {ticket.initialChecklist &&
                          ticket.initialChecklist.length > 0 ? (
                            ticket.initialChecklist.map(
                              (item, idx) => {
                                return (
                                  <label
                                    key={idx}
                                    className={`flex items-center justify-between text-xs p-2 rounded-lg border cursor-pointer select-none transition-all duration-200 ${
                                      item.checked
                                        ? "bg-emerald-50/40 border-emerald-100 text-emerald-800 font-medium"
                                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <input
                                        type="checkbox"
                                        checked={item.checked}
                                        onChange={() => {
                                          const updatedList =
                                            ticket.initialChecklist.map(
                                              (c, i) =>
                                                i === idx
                                                  ? {
                                                      ...c,
                                                      checked:
                                                        !c.checked,
                                                    }
                                                  : c,
                                            );
                                          updateServiceTicket(
                                            ticket.id,
                                            {
                                              initialChecklist:
                                                updatedList,
                                            },
                                          );
                                        }}
                                        className="accent-emerald-600 h-3.5 w-3.5 rounded"
                                      />
                                      <span className="truncate">
                                        {item.name}
                                      </span>
                                    </div>
                                    <span
                                      className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full ${
                                        item.checked
                                          ? "bg-emerald-100 text-emerald-800"
                                          : "bg-rose-100 text-rose-800"
                                      }`}
                                    >
                                      {item.checked ? "OK" : "REJECT"}
                                    </span>
                                  </label>
                                );
                              },
                            )
                          ) : (
                            <div className="text-center py-6 text-slate-400 italic text-[11px] bg-white rounded-lg border border-dashed border-slate-200">
                              <p>Checklist pre-service kosong.</p>
                              <button
                                onClick={() => {
                                  const defaultList = [
                                    {
                                      name: "Unit Menyala (Power On)",
                                      checked: true,
                                    },
                                    {
                                      name: "Fisik Mulus (No Dents/Scratch)",
                                      checked: true,
                                    },
                                    {
                                      name: "LCD / Layar Normal",
                                      checked: true,
                                    },
                                    {
                                      name: "Touch Screen / Touchpad Normal",
                                      checked: true,
                                    },
                                    {
                                      name: "Speaker & Audio Output",
                                      checked: true,
                                    },
                                    {
                                      name: "Kamera Depan & Belakang",
                                      checked: true,
                                    },
                                    {
                                      name: "Wi-Fi & Bluetooth Sinyal",
                                      checked: true,
                                    },
                                    {
                                      name: "Charger & Port Pengisian",
                                      checked: true,
                                    },
                                  ];
                                  updateServiceTicket(ticket.id, {
                                    initialChecklist: defaultList,
                                  });
                                }}
                                className="mt-2 px-2.5 py-1 bg-indigo-600 text-white rounded text-[10px] font-bold hover:bg-indigo-700 cursor-pointer transition-all"
                              >
                                Inisialisasi Checklist
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* COLUMN 2: POST-SERVICE (QC) TESTING CHECKLIST */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                            <span className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                            Post-Service (Pengujian QC)
                          </div>
                          <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            {ticket.qcChecklist
                              ? ticket.qcChecklist.filter(
                                  (x) => x.passed,
                                ).length
                              : 0}{" "}
                            /{" "}
                            {ticket.qcChecklist
                              ? ticket.qcChecklist.length
                              : 10}{" "}
                            Passed
                          </span>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-64 overflow-y-auto space-y-1.5">
                          {(() => {
                            // Get or auto-initialize qcChecklist
                            const currentQcList =
                              ticket.qcChecklist &&
                              ticket.qcChecklist.length > 0
                                ? ticket.qcChecklist
                                : [
                                    {
                                      criteria:
                                        "Pengujian Pengisian Daya (Charging Test)",
                                      passed: true,
                                    },
                                    {
                                      criteria:
                                        "Uji Ketahanan Baterai (Battery Burn Test)",
                                      passed: true,
                                    },
                                    {
                                      criteria:
                                        "Kalibrasi Layar / Warna (Display Quality)",
                                      passed: true,
                                    },
                                    {
                                      criteria:
                                        "Uji Sensitivitas Sentuh (Touch Response)",
                                      passed: true,
                                    },
                                    {
                                      criteria:
                                        "Uji Suara & Mikrofon (Audio & Mic Test)",
                                      passed: true,
                                    },
                                    {
                                      criteria:
                                        "Uji Suhu & Kipas (Thermal Stress Test)",
                                      passed: true,
                                    },
                                    {
                                      criteria:
                                        "Uji Sinyal Wi-Fi / Seluler",
                                      passed: true,
                                    },
                                    {
                                      criteria:
                                        "Pengecekan Baut & Casing Rapat",
                                      passed: true,
                                    },
                                    {
                                      criteria:
                                        "Sistem Bersih dari Debu",
                                      passed: true,
                                    },
                                    {
                                      criteria:
                                        "Uji Port Input/Output (I/O Ports)",
                                      passed: true,
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
                                          ? "bg-emerald-50/40 border-emerald-100 text-emerald-800 font-medium"
                                          : "bg-rose-50/30 border-rose-150 text-rose-800"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <input
                                          type="checkbox"
                                          checked={item.passed}
                                          onChange={() => {
                                            const updatedList =
                                              currentQcList.map(
                                                (c, i) =>
                                                  i === idx
                                                    ? {
                                                        ...c,
                                                        passed:
                                                          !c.passed,
                                                      }
                                                    : c,
                                              );

                                            // Calculate suggested QC score
                                            const passedCount =
                                              updatedList.filter(
                                                (x) => x.passed,
                                              ).length;
                                            const suggestedScore =
                                              Math.round(
                                                (passedCount /
                                                  updatedList.length) *
                                                  100,
                                              );

                                            updateServiceTicket(
                                              ticket.id,
                                              {
                                                qcChecklist:
                                                  updatedList,
                                                qcScore:
                                                  suggestedScore,
                                              },
                                            );

                                            // Also sync to active QC states if this ticket is in focus
                                            setQcScore(
                                              suggestedScore,
                                            );
                                          }}
                                          className="accent-emerald-600 h-3.5 w-3.5 rounded"
                                        />
                                        <span className="truncate">
                                          {item.criteria}
                                        </span>
                                      </div>
                                      <span
                                        className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full ${
                                          item.passed
                                            ? "bg-emerald-100 text-emerald-800"
                                            : "bg-rose-100 text-rose-800"
                                        }`}
                                      >
                                        {item.passed
                                          ? "PASSED"
                                          : "FAILED"}
                                      </span>
                                    </label>
                                  );
                                })}

                                {/* Sync button to restore qcChecklist if requested */}
                                {(!ticket.qcChecklist ||
                                  ticket.qcChecklist.length ===
                                    0) && (
                                  <div className="pt-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateServiceTicket(
                                          ticket.id,
                                          {
                                            qcChecklist:
                                              currentQcList,
                                            qcScore: 100,
                                          },
                                        );
                                        setQcScore(100);
                                      }}
                                      className="w-full bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg py-1.5 text-[10px] font-bold hover:bg-indigo-100/50 cursor-pointer transition-all"
                                    >
                                      Simpan Checklist QC Standar (10
                                      Pengujian)
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Consolidated QC Summary and Scoring Integration */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>Skor Kelayakan QC Terhitung</span>
                        </div>
                        <p className="text-slate-500 text-[10px] leading-relaxed">
                          Skor dihasilkan secara proporsional dari
                          checklist QC di atas. Minimal skor lolos uji
                          adalah 80.
                        </p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-center bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-xs">
                          <p className="text-[9px] font-mono font-bold text-slate-400 uppercase">
                            QC SCORE
                          </p>
                          <p
                            className={`text-2xl font-black font-mono tracking-tight ${
                              (ticket.qcScore ?? 100) >= 80
                                ? "text-emerald-600"
                                : "text-rose-600"
                            }`}
                          >
                            {ticket.qcScore ?? 100}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-lg border font-mono ${
                              (ticket.qcScore ?? 100) >= 80
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-rose-50 border-rose-200 text-rose-700"
                            }`}
                          >
                            {(ticket.qcScore ?? 100) >= 80
                              ? "✓ AMAN / LOLOS QC"
                              : "✕ PERLU REWORK"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* QC Inline Form — inside ticket detail modal */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="font-bold text-[11px] text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Quality Control (QC)
                      </h4>
                      <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">#{ticket.ticketNo}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Skor Pemeriksaan (0–100)</label>
                        <input type="range" min="0" max="100" value={qcScore} onChange={(e) => setQcScore(Number(e.target.value))} className="w-full cursor-pointer h-2 bg-slate-100 rounded-lg appearance-none" />
                        <p className="text-right text-xs font-bold font-mono text-slate-800 mt-1">{qcScore}/100</p>
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Catatan Pemeriksaan</label>
                        <textarea rows={3} placeholder="cth: Keyboard normal, speaker jernih, suhu idle 45 C pasca repasting." value={qcNotes} onChange={(e) => setQcNotes(e.target.value)} className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => completeServiceQC(ticket.id, qcScore, qcNotes, false)} className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs py-2 rounded-lg cursor-pointer border border-rose-200">Rework (Gagal QC)</button>
                      <button onClick={() => completeServiceQC(ticket.id, qcScore, qcNotes, true)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer">Lolos QC (Selesai)</button>
                    </div>
                  </div>

                  {/* Grid 1: Diagnostic and Parts Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Left Workshop column: Manual Diagnostic Updates */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4">
                      <h4 className="font-bold text-[11px] text-slate-700 uppercase font-mono tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                        <Wrench className="w-4 h-4 text-slate-400" />{" "}
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
                          onChange={(e) =>
                            setManualDiagNotes(e.target.value)
                          }
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-indigo-500"
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
                            onChange={(e) =>
                              setManualDiagCost(e.target.value)
                            }
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={async () => {
                              const estCost = Number(manualDiagCost || 0);
                              if (!manualDiagNotes.trim()) {
                                showToast("Catatan diagnosis wajib diisi.", "error");
                                return;
                              }
                              try {
                                await addServiceDiagnostic(
                                  ticket.id,
                                  manualDiagNotes,
                                  estCost,
                                  ticket.partsRequested || ticket.partsUsed || [],
                                );
                                showToast(
                                  "Diagnosa teknis berhasil disimpan dan penawaran siap dikirim.",
                                  "success",
                                );
                                const sendingMethod = tenantObj?.settings?.waConfig?.sendingMethod || "MANUAL";
                                if (sendingMethod === "MANUAL") {
                                  openManualEstimateWhatsApp(
                                    ticket,
                                    manualDiagNotes,
                                    estCost,
                                    ticket.partsRequested || ticket.partsUsed || [],
                                  );
                                } else {
                                  showToast("Penawaran dimasukkan ke antrean WhatsApp API.", "info");
                                }
                              } catch (error: any) {
                                showToast(error?.message || "Gagal menyimpan diagnosis.", "error");
                              }
                            }}
                            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 rounded-lg cursor-pointer text-center transition-all shadow-xs"
                          >
                            Simpan Diagnosa & Kirim Penawaran
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right Workshop column: Spareparts Inventory Integration */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4">
                      <h4 className="font-bold text-[11px] text-slate-700 uppercase font-mono tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                        <Package className="w-4 h-4 text-slate-400" />{" "}
                        Penggantian Suku Cadang (Inventory)
                      </h4>

                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-0.5">
                          Cari & Pilih Suku Cadang
                        </label>
                        <select
                          value={selectedSparepartId}
                          onChange={(e) =>
                            setSelectedSparepartId(e.target.value)
                          }
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-indigo-500"
                        >
                          <option value="">
                            -- Pilih part di stok toko --
                          </option>
                          {sparepartsList.map((prod) => (
                            <option
                              key={prod.id}
                              value={prod.id}
                              disabled={prod.stockQty <= 0}
                            >
                              {prod.name} (Stok: {prod.stockQty}) - Rp{" "}
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
                            onChange={(e) =>
                              setSparepartQty(Number(e.target.value))
                            }
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-indigo-500"
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
                            onChange={(e) =>
                              setSparepartSN(e.target.value)
                            }
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={async () => {
                              if (!selectedSparepartId) return;
                              const partProd = products.find((p) => p.id === selectedSparepartId);
                              if (!partProd) return;
                              const warehouseId = Object.keys(partProd.warehouseStock || {})[0];
                              if (!warehouseId) {
                                showToast("Gudang spare part belum ditentukan.", "error");
                                return;
                              }
                              try {
                                await requestServicePart(ticket.id, {
                                  productId: selectedSparepartId,
                                  warehouseId,
                                  quantity: sparepartQty,
                                  serialNumber: sparepartSN || undefined,
                                });
                                const updatedCost = (Number(ticket.estimatedCost) || 0) + (partProd.sellPrice ?? 0) * sparepartQty;
                                setSelectedSparepartId("");
                                setSparepartQty(1);
                                setSparepartSN("");
                                setManualDiagCost(String(updatedCost));
                                showToast(`${partProd.name} berhasil direservasi. Stok dipotong saat handover.`, "success");
                              } catch (error: any) {
                                showToast(error?.message || "Gagal mereservasi spare part.", "error");
                              }
                            }}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer text-center transition-all shadow-xs"
                          >
                            Reservasi Spare Part
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Spareparts Used Ledger */}
                  <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                    <h4 className="font-bold text-[10px] text-indigo-600 uppercase font-mono tracking-wider">
                      Rincian Komponen Suku Cadang Terpakai
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 font-mono text-[9px] uppercase border-b border-slate-100">
                          <tr>
                            <th className="px-3 py-2">Nama Barang</th>
                            <th className="px-3 py-2">
                              Harga Satuan
                            </th>
                            <th className="px-3 py-2">Qty</th>
                            <th className="px-3 py-2">Total Harga</th>
                            <th className="px-3 py-2 text-right">
                              Tindakan
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {ticket.partsUsed &&
                          ticket.partsUsed.length > 0 ? (
                            ticket.partsUsed.map((part, pIdx) => (
                              <tr
                                key={pIdx}
                                className="hover:bg-slate-50"
                              >
                                <td className="px-3 py-2 font-medium text-slate-700">
                                  {part.name}
                                  {part.serialNumber && (
                                    <div className="text-[9px] font-mono text-indigo-500 mt-0.5 border border-indigo-100 bg-indigo-50 inline-block px-1 rounded">
                                      SN: {part.serialNumber}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-2 font-mono">
                                  Rp {part.unitPrice.toLocaleString()}
                                </td>
                                <td className="px-3 py-2 font-mono font-bold">
                                  {part.quantity}
                                </td>
                                <td className="px-3 py-2 font-mono font-extrabold text-indigo-600">
                                  Rp{" "}
                                  {part.totalPrice.toLocaleString()}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    onClick={async () => {
                                      if (!(part as any).id) {
                                        showToast("ID reservasi spare part tidak tersedia.", "error");
                                        return;
                                      }
                                      try {
                                        await cancelServicePart(ticket.id, (part as any).id);
                                        const updatedCost = Math.max(0, (Number(ticket.estimatedCost) || 0) - part.totalPrice);
                                        setManualDiagCost(String(updatedCost));
                                        showToast(`Reservasi ${part.name} dibatalkan.`, "success");
                                      } catch (error: any) {
                                        showToast(error?.message || "Gagal membatalkan spare part.", "error");
                                      }
                                    }}
                                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer transition-all inline-flex items-center"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-3 py-3 text-slate-400 italic text-[11px] text-center bg-slate-50/50 rounded-lg"
                              >
                                Belum ada suku cadang yang
                                diaplikasikan pada unit perbaikan ini.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 3: Manual Status & Workflow Controller */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-bold text-[10px] text-indigo-600 uppercase font-mono tracking-wider">
                        Lompati / Ubah Status Manual
                      </h4>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-0.5">
                          Pilih Status Baru
                        </label>
                        <select
                          value={ticket.status}
                          onChange={(e) => {
                            const newStatus = e.target
                              .value as ServiceStatus;
                            updateServiceStatus(
                              ticket.id,
                              newStatus,
                              `Diubah secara manual oleh operator.`,
                            );
                          }}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-indigo-500"
                        >
                          {Object.values(ServiceStatus).map((st) => (
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
                              updateServiceStatus(
                                ticket.id,
                                ServiceStatus.MENUGGU_APPROVAL,
                                "Teknisi merumuskan estimasi biaya dan menunggu persetujuan pelanggan.",
                              )
                            }
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer text-center"
                          >
                            Ajukan Estimasi Biaya ke Pelanggan
                          </button>
                          <button
                            onClick={() => {
                              updateServiceStatus(
                                ticket.id,
                                ServiceStatus.ESTIMATE_PENDING,
                                "Teknisi menandai perbaikan dengan status 'Estimate Pending' dan menerbitkan Surat Penawaran Biaya Sementara.",
                              );
                              setShowProvisionalQuote(ticket.id);
                            }}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <FileText className="w-4 h-4" /> Tandai
                            'Estimate Pending' & Terbitkan Quote
                          </button>
                        </div>
                      )}

                      {(ticket.status ===
                        ServiceStatus.ESTIMATE_PENDING ||
                        ticket.status ===
                          ServiceStatus.MENUGGU_APPROVAL) && (
                        <div className="space-y-2">
                          <button
                            onClick={() =>
                              setShowProvisionalQuote(ticket.id)
                            }
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2.5 rounded-lg cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <FileText className="w-4 h-4" /> 📄
                            Pratinjau Surat Penawaran (Provisional
                            Quote)
                          </button>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() =>
                                approveServiceEstimate(
                                  ticket.id,
                                  true,
                                )
                              }
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer text-center"
                            >
                              Setujui Digital
                            </button>
                            <button
                              onClick={() =>
                                approveServiceEstimate(
                                  ticket.id,
                                  false,
                                )
                              }
                              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer text-center"
                            >
                              Tolak / Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {ticket.status ===
                        ServiceStatus.SEDANG_DIKERJAKAN && (
                        <button
                          onClick={() => {
                            setViewingServiceTicketId(ticket.id);
                            setQcScore(ticket.qcScore ?? 100);
                            setQcNotes(ticket.qcNotes ?? "");
                          }}
                          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer text-center flex items-center justify-center gap-1.5"
                        >
                          <ShieldCheck className="w-4 h-4" /> Buka
                          Panel Quality Control (QC)
                        </button>
                      )}

                      {["SELESAI", "SIAP_DIAMBIL"].includes(
                        ticket.status,
                      ) &&
                        (() => {
                          const isRefOrProofRequired =
                            handoverPaymentMethod !==
                              PaymentMethod.CASH &&
                            handoverPaymentMethod !==
                              PaymentMethod.TEMPO;
                          const isHandoverValid =
                            !isRefOrProofRequired ||
                            handoverRefNo.trim() !== "" ||
                            handoverProofName.trim() !== "";

                          const estCost = Number(ticket.estimatedCost) || 0;
                          const taxAmt = Math.round(estCost * 0.11);
                          const totalAmt = estCost + taxAmt;
                          const targetAccountLabel =
                            handoverPaymentMethod === PaymentMethod.TEMPO
                              ? "10300 - Piutang Usaha"
                              : handoverPaymentMethod === PaymentMethod.CASH
                                ? "10100 - Kas Utama"
                                : "10200 - Bank / Payment Gateway";
                          const warrantyEndsPreview = new Date(
                            Date.now() + (ticket.warrantyMonths || 0) * 30 * 24 * 60 * 60 * 1000,
                          )
                            .toISOString()
                            .split("T")[0];
                          const partsImpact = ticket.partsUsed || [];
                          const isChecklistComplete = Object.values(
                            handoverChecklist,
                          ).every(Boolean);

                          return (
                            <div className="space-y-3.5 border border-slate-200/85 p-4 rounded-xl bg-slate-50/70 w-full text-left shadow-sm">
                              <div className="flex justify-between items-center bg-indigo-50/50 border border-indigo-100/60 p-3 rounded-lg text-xs font-semibold text-slate-700">
                                <span className="text-slate-600">
                                  Total Tagihan Pelunasan (PPN 11%):
                                </span>
                                <span className="text-indigo-700 font-mono text-sm font-bold">
                                  Rp {totalAmt.toLocaleString()}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  Metode Pembayaran Pelunasan
                                </label>
                                <select
                                  value={handoverPaymentMethod}
                                  onChange={(e) => {
                                    setHandoverPaymentMethod(
                                      e.target.value as PaymentMethod,
                                    );
                                    // Reset other states on method change
                                    setHandoverRefNo("");
                                    setHandoverProofName("");
                                  }}
                                  className="block w-full text-xs px-2.5 py-2 border border-slate-200 bg-white rounded-lg outline-none focus:border-indigo-500 font-medium text-slate-700 shadow-xs"
                                >
                                  <option value={PaymentMethod.CASH}>
                                    💵 CASH / TUNAI (Kas Utama)
                                  </option>
                                  <option
                                    value={
                                      PaymentMethod.BANK_TRANSFER
                                    }
                                  >
                                    🏦 TRANSFER BANK (Bank Mandiri)
                                  </option>
                                  <option value={PaymentMethod.QRIS}>
                                    📱 QRIS (Bank Mandiri)
                                  </option>
                                  <option value={PaymentMethod.EDC}>
                                    💳 DEBIT / EDC (Bank Mandiri)
                                  </option>
                                  <option
                                    value={PaymentMethod.E_WALLET}
                                  >
                                    👛 E-WALLET (Bank Mandiri)
                                  </option>
                                  <option value={PaymentMethod.TEMPO}>
                                    ⏳ TEMPO / BAYAR NANTI (Piutang
                                    Usaha)
                                  </option>
                                </select>
                              </div>

                              {handoverPaymentMethod ===
                                PaymentMethod.TEMPO && (
                                <div className="space-y-2.5 animate-fadeIn">
                                  <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                      Termin Jatuh Tempo (Hari)
                                    </label>
                                    <select
                                      value={handoverTempoDays}
                                      onChange={(e) =>
                                        setHandoverTempoDays(
                                          e.target.value,
                                        )
                                      }
                                      className="block w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-indigo-500 font-medium text-slate-700 shadow-xs"
                                    >
                                      <option value="15">
                                        15 Hari
                                      </option>
                                      <option value="30">
                                        30 Hari (Default)
                                      </option>
                                      <option value="45">
                                        45 Hari
                                      </option>
                                      <option value="60">
                                        60 Hari
                                      </option>
                                    </select>
                                  </div>
                                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-[11px] text-amber-800 leading-relaxed shadow-3xs">
                                    📌{" "}
                                    <strong>
                                      Informasi Piutang & Pinjaman
                                    </strong>
                                    : Penyerahan dengan status tempo
                                    akan mencatat piutang customer
                                    sebesar{" "}
                                    <strong>
                                      Rp {totalAmt.toLocaleString()}
                                    </strong>{" "}
                                    ke akun{" "}
                                    <strong>
                                      10300 - Piutang Usaha B2B
                                    </strong>
                                    . Transaksi kas tidak bertambah
                                    sampai pembayaran piutang dilunasi
                                    oleh pelanggan di modul keuangan.
                                  </div>
                                </div>
                              )}

                              {isRefOrProofRequired && (
                                <div className="space-y-3 border-t border-slate-200/80 pt-3 animate-fadeIn">
                                  <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                      Nomor Referensi Transaksi{" "}
                                      <span className="text-rose-500 font-bold">
                                        *
                                      </span>
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="Contoh: TRX-1029302 atau No. Rek / Slip"
                                      value={handoverRefNo}
                                      onChange={(e) =>
                                        setHandoverRefNo(
                                          e.target.value,
                                        )
                                      }
                                      className="block w-full text-xs px-2.5 py-2 border border-slate-200 bg-white rounded-lg outline-none focus:border-indigo-500 font-medium text-slate-700 shadow-xs"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                      Bukti Transfer (Upload / Seret
                                      File){" "}
                                      <span className="text-rose-500 font-bold">
                                        *
                                      </span>
                                    </label>
                                    {handoverProofName ? (
                                      <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                                        <div className="flex items-center gap-1.5 font-medium truncate">
                                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                          <span className="truncate">
                                            {handoverProofName}
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setHandoverProofName("")
                                          }
                                          className="text-red-500 hover:text-red-700 font-bold ml-2 cursor-pointer text-xs"
                                        >
                                          Hapus
                                        </button>
                                      </div>
                                    ) : (
                                      <div
                                        onClick={() => {
                                          document
                                            .getElementById(
                                              `proof-upload-${ticket.id}`,
                                            )
                                            ?.click();
                                        }}
                                        className="border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 p-4 rounded-lg text-center cursor-pointer transition-all duration-150"
                                      >
                                        <input
                                          type="file"
                                          id={`proof-upload-${ticket.id}`}
                                          accept="image/*,application/pdf"
                                          className="hidden"
                                          onChange={(e) => {
                                            const file =
                                              e.target.files?.[0];
                                            if (file) {
                                              setHandoverProofName(
                                                file.name,
                                              );
                                            }
                                          }}
                                        />
                                        <p className="text-[11px] text-slate-500 font-medium">
                                          Klik untuk memilih atau
                                          seret file bukti transfer
                                        </p>
                                        <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                                          Maks. File: 5MB (PNG, JPG,
                                          PDF)
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {!isHandoverValid && (
                                    <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-600 font-medium leading-relaxed">
                                      ⚠️{" "}
                                      <strong>Validasi Gagal</strong>:
                                      Harap masukkan Nomor Referensi
                                      ATAU unggah file Bukti Transfer
                                      sebagai prasyarat status 'Unit
                                      Diambil'.
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
                                  { key: "accessoriesReturned", label: "Charger / adaptor dan aksesoris dikembalikan" },
                                  { key: "customerChecked", label: "Customer sudah cek kondisi unit" },
                                  { key: "invoiceReady", label: "Invoice pembayaran sudah dicetak" },
                                  { key: "warrantyReady", label: "Kartu garansi sudah dicetak" },
                                ].map(({ key, label }) => (
                                  <label key={key} className="flex items-start gap-2 cursor-pointer group">
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
                                  <p className="text-[10px] font-black text-indigo-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Receipt className="w-3.5 h-3.5" /> Preview Jurnal Otomatis
                                  </p>
                                  <div className="space-y-1.5 text-[10px] font-mono text-slate-600">
                                    <div className="flex justify-between gap-3"><span>Debit {targetAccountLabel}</span><strong>Rp {totalAmt.toLocaleString()}</strong></div>
                                    <div className="flex justify-between gap-3"><span>Kredit Pendapatan Servis</span><strong>Rp {estCost.toLocaleString()}</strong></div>
                                    <div className="flex justify-between gap-3"><span>Kredit PPN Keluaran 11%</span><strong>Rp {taxAmt.toLocaleString()}</strong></div>
                                  </div>
                                </div>
                                <div className="bg-white border border-emerald-100 rounded-xl p-3 shadow-xs">
                                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Preview Garansi & Status
                                  </p>
                                  <div className="space-y-1.5 text-[10px] font-mono text-slate-600">
                                    <div className="flex justify-between gap-3"><span>Status Tiket</span><strong>DIAMBIL</strong></div>
                                    <div className="flex justify-between gap-3"><span>Garansi Aktif Sampai</span><strong>{warrantyEndsPreview}</strong></div>
                                    <div className="flex justify-between gap-3"><span>Kartu Garansi</span><strong>Terkirim</strong></div>
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
                                      <div key={`${part.productId || part.name}-${idx}`} className="flex justify-between gap-3 text-[10px] font-mono text-slate-600">
                                        <span className="truncate">{part.name || part.productName || part.productId}</span>
                                        <strong>-{part.quantity || part.qty || 0} pcs</strong>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-slate-500">
                                    Tidak ada sparepart tercatat. Handover hanya membuat jurnal pendapatan, pembayaran, dan garansi.
                                  </p>
                                )}
                              </div>

                              <button
                                onClick={() => {
                                  if (
                                    isRefOrProofRequired &&
                                    !isHandoverValid
                                  ) {
                                    showToast(
                                      "Gagal memproses: Nomor referensi atau unggah bukti transfer diperlukan!",
                                      "error",
                                    );
                                    return;
                                  }
                                  const detailsObj = {
                                    refNo:
                                      handoverRefNo.trim() ||
                                      undefined,
                                    proofName:
                                      handoverProofName.trim() ||
                                      undefined,
                                    tempoDays:
                                      handoverPaymentMethod ===
                                      PaymentMethod.TEMPO
                                        ? parseInt(
                                            handoverTempoDays,
                                            10,
                                          )
                                        : undefined,
                                  };

                                  handoverServiceDevice(
                                    ticket.id,
                                    handoverPaymentMethod,
                                    detailsObj,
                                  );

                                  // Clear form state
                                  setHandoverRefNo("");
                                  setHandoverProofName("");
                                  setHandoverTempoDays("30");
                                  setHandoverChecklist({
                                    accessoriesReturned: false,
                                    customerChecked: false,
                                    invoiceReady: false,
                                    warrantyReady: false,
                                  });

                                  showToast(
                                    handoverPaymentMethod ===
                                      PaymentMethod.TEMPO
                                      ? `Serah terima berhasil via TEMPO! Piutang dicatat sebesar Rp ${totalAmt.toLocaleString()}.`
                                      : `Serah terima berhasil via ${handoverPaymentMethod}! Status diubah menjadi DIAMBIL.`,
                                    "success",
                                  );
                                }}
                                disabled={
                                  (isRefOrProofRequired &&
                                    !isHandoverValid) ||
                                  !isChecklistComplete
                                }
                                className={`w-full font-bold text-xs py-2.5 rounded-lg text-center transition-all duration-150 ${
                                  (isRefOrProofRequired &&
                                    !isHandoverValid) ||
                                  !isChecklistComplete
                                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                                    : "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                                }`}
                              >
                                Konfirmasi Handover & Sinkronkan
                                Accounting
                              </button>
                            </div>
                          );
                        })()}

                      {ticket.status === "DIAMBIL" && (
                        <div className="w-full border border-emerald-200 bg-emerald-50/80 rounded-xl p-3 space-y-3 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5" /> Dokumen Siap Dicetak
                              </p>
                              <p className="text-[10px] text-emerald-700 mt-1 leading-relaxed">
                                Unit sudah handover. Invoice pembayaran dan kartu garansi siap diberikan ke customer.
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
                              className="px-3 py-2 bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" /> Cetak Kartu Garansi
                            </button>
                          </div>
                        </div>
                      )}

                      <p className="text-[9px] text-slate-400 italic">
                        Gunakan tombol cetak SPK di pojok kanan atas
                        untuk memprint tanda terima unit.
                      </p>
                    </div>
                  </div>

                  {/* Section 4: WhatsApp Customer Communication Hub (Manual click-to-chat link helper) */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-[10px] text-indigo-700 uppercase font-mono tracking-wider flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-emerald-500" />{" "}
                        WhatsApp Customer Communication Hub
                      </h4>
                      <span className="text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">
                        Manual Adjustment Mode
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-mono text-slate-400 uppercase">
                          Pilih Template Pesan
                        </label>
                        <select
                          onChange={(e) => {
                            const val = e.target.value;
                            const estTotal =
                              Number(ticket.estimatedCost) || 0;
                            const portalLink =
                              window.location.origin +
                              "/?tab=service&sub=approve-quote&ticket=" +
                              ticket.ticketNo;
                            let txt = "";
                            if (val === "intake") {
                              const ctx = {
                                customer_name: customer?.name || "Pelanggan",
                                ticket_no: ticket.ticketNo,
                                device_name: ticket.deviceName,
                                ticket_status: "DITERIMA",
                                status_note: "Unit telah terdaftar dan menunggu diagnosa.",
                              };
                              txt =
                                renderTenantWaTemplate("SERVICE_UPDATE", ctx) ||
                                `Halo *${customer?.name || "Pelanggan"}*,\n\nUnit *${ticket.deviceName}* Anda telah berhasil terdaftar di Repair Hub dengan No. Tiket *${ticket.ticketNo}*.\n\nTerima kasih telah mempercayakan perbaikan Anda kepada kami. Tim teknisi kami akan segera melakukan diagnosa secara mendalam.`;
                            } else if (val === "diagnose") {
                              const ctx = {
                                customer_name: customer?.name || "Pelanggan",
                                ticket_no: ticket.ticketNo,
                                device_name: ticket.deviceName,
                                ticket_status: "DIAGNOSA",
                                status_note: `Estimasi biaya: Rp ${estTotal.toLocaleString()}.`,
                                estimated_cost: estTotal,
                                approval_link: portalLink,
                              };
                              txt =
                                renderTenantWaTemplate("SERVICE_UPDATE", ctx) ||
                                `Halo *${customer?.name || "Pelanggan"}*,\n\nUnit *${ticket.deviceName}* (No. Tiket *${ticket.ticketNo}*) telah selesai didiagnosa.\n\nKerusakan memerlukan perbaikan dengan total estimasi biaya perbaikan sebesar *Rp ${estTotal.toLocaleString()}*.\n\nSilakan lihat rincian estimasi dan berikan persetujuan digital Anda melalui tautan portal resmi kami berikut:\n${portalLink}\n\nTerima kasih!`;
                            } else if (val === "completed") {
                              const ctx = {
                                customer_name: customer?.name || "Pelanggan",
                                ticket_no: ticket.ticketNo,
                                device_name: ticket.deviceName,
                                ticket_status: "SELESAI",
                                status_note: `Total biaya: Rp ${estTotal.toLocaleString()}.`,
                              };
                              txt =
                                renderTenantWaTemplate("SERVICE_UPDATE", ctx) ||
                                `Halo *${customer?.name || "Pelanggan"}*,\n\nKabar baik! Unit *${ticket.deviceName}* (No. Tiket *${ticket.ticketNo}*) telah selesai diperbaiki dan LOLOS uji kontrol kualitas (QC) kami!\n\nUnit kini siap untuk diambil kembali di toko kami dengan total biaya *Rp ${estTotal.toLocaleString()}*.\n\nTerima kasih atas kepercayaan Anda!`;
                            } else {
                              txt = `Halo *${customer?.name || "Pelanggan"}*,\n\nMengenai unit *${ticket.deviceName}* (No. Tiket *${ticket.ticketNo}*), mohon hubungi kami kembali untuk mendiskusikan kelanjutan proses perbaikan. Terima kasih.`;
                            }
                            setCustomWaMessageText(txt);
                          }}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-md outline-none focus:border-indigo-500 font-medium"
                        >
                          <option value="intake">
                            ✓ Tanda Terima Unit Baru (Intake)
                          </option>
                          <option value="diagnose">
                            ✓ Diagnosa Selesai & Estimasi Biaya
                          </option>
                          <option value="completed">
                            ✓ Perbaikan Selesai & Siap Diambil
                          </option>
                          <option value="custom">
                            ✓ Pesan Kustom / Lainnya
                          </option>
                        </select>
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <label className="block text-[10px] font-mono text-slate-400 uppercase">
                          Isi Pesan WhatsApp (Dapat Diedit Manual)
                        </label>
                        <textarea
                          rows={4}
                          value={
                            customWaMessageText ||
                            (() => {
                              const ctx = {
                                customer_name: customer?.name || "Pelanggan",
                                ticket_no: ticket.ticketNo,
                                device_name: ticket.deviceName,
                                ticket_status: ticket.status,
                              };
                              return (
                                renderTenantWaTemplate("SERVICE_UPDATE", ctx) ||
                                `Halo *${customer?.name || "Pelanggan"}*,\n\nUnit *${ticket.deviceName}* Anda telah terdaftar di sistem kami.`
                              );
                            })()
                          }
                          onChange={(e) =>
                            setCustomWaMessageText(e.target.value)
                          }
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo-500 font-medium leading-relaxed font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const text = customWaMessageText || "";
                          navigator.clipboard.writeText(text);
                          showToast(
                            "Isi pesan WhatsApp berhasil disalin ke clipboard!",
                            "success",
                          );
                        }}
                        className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Salin Pesan
                      </button>
                      <a
                        href={`https://wa.me/${(
                          customer?.phone || "62"
                        )
                          .split("")
                          .filter((c) => c >= "0" && c <= "9")
                          .join(
                            "",
                          )}?text=${encodeURIComponent(customWaMessageText || "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Kirim via
                        wa.me (Manual Link)
                      </a>
                    </div>
                  </div>
                </div>

                {/* Footer Info inside Modal */}
                <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-400">
                  <p>
                    Operator:{" "}
                    <strong className="text-slate-600">
                      {currentUser?.name} ({currentUser?.role})
                    </strong>
                  </p>
                  <p className="font-mono">
                    Created at:{" "}
                    {new Date(
                      ticket.createdAt || "",
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      );

};
