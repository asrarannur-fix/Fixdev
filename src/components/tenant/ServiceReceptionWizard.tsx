import * as React from "react";
import { CATEGORY_CONFIGS } from "../../config/categoryConfigs";
import { isValidIndonesianPhone, normalizeIndonesianPhone } from "../../utils/serviceReceptionUtils";
import { Save, CheckCircle2, SearchIcon, PlusCircle, RefreshCw, Camera, X, MapPin, Sparkles, AlertCircle, Lock, CheckSquare, ChevronRight, ChevronLeft, Wrench, Package, Upload, Eye, ShieldCheck, Timer, FileText, MessageSquare, Sliders, Receipt, Building2, Zap, HelpCircle, Trash2, Copy, AlertTriangle, Monitor, ExternalLink, Brush, Ticket, Paintbrush, Fingerprint, Search, Activity, Maximize, Check, Calendar, ArrowRight, Printer, Minus, Edit, MoreVertical, CheckCircle, Send, Filter, QrCode, Cpu, Share2, Barcode, PackagePlus, ListChecks } from "lucide-react";

export const ServiceReceptionWizard: React.FC<any> = (props) => {
  const { receptionProgress, receptionFormRef, handleCreateService, receptionErrors, selectedReceptionCustomer, setNewSrvCustomer, setCustQuery, setShowNewSrvCustForm, custQuery, setCustOpen, custOpen, customers, setNewSrvCustName, setNewSrvCustPhone, newSrvCustomer, showNewSrvCustForm, newSrvCustName, newSrvCustPhone, newSrvCustEmail, setNewSrvCustEmail, newSrvCustAddress, setNewSrvCustAddress, newSrvCategory, setNewSrvCategory, newSrvEstCompletion, setNewSrvEstCompletion, newSrvDevice, setNewSrvDevice, newSrvBrand, setNewSrvBrand, setShowMoreDetails, showMoreDetails, newSrvSerial, setNewSrvSerial, newSrvWarranty, setNewSrvWarranty, newSrvDownPayment, setNewSrvDownPayment, newSrvIsCheckOnly, setNewSrvIsCheckOnly, newSrvPhysicalCondition, setNewSrvPhysicalCondition, showScreenLock, newSrvScreenLock, setNewSrvScreenLock, setShowScreenLock, newSrvComplaint, setNewSrvComplaint, setShowAdvancedSpecs, showAdvancedSpecs, newSrvDynamicSpecs, setNewSrvDynamicSpecs, runAutoAssign, newSrvTechId, setNewSrvTechId, setAutoAssignReason, employees, autoAssignReason, newSrvStorageLocId, setNewSrvStorageLocId, getStorageLocations, activeTenantId, currentBranchId, newSrvChecklist, setNewSrvChecklist, newSrvAccessories, setNewSrvAccessories, newSrvCustomAccessories, setNewSrvCustomAccessories, setShowDocumentation, newSrvCapturedConditions, showDocumentation, selectedCaptureCategory, setSelectedCaptureCategory, cameraActive, videoRef, capturePhoto, setNewSrvCapturedConditions, stopCamera, startCamera, newSrvIsOutsourced, setNewSrvIsOutsourced, newSrvOutsourcedVendor, setNewSrvOutsourcedVendor, newSrvOutsourcingCost, setNewSrvOutsourcingCost, setActiveSubTab, isSubmittingReception, showToast } = props;
  return (
<div className="min-h-[calc(100vh-120px)] bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
  <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/70 backdrop-blur">
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
      <Save className="w-3 h-3" /> Draft otomatis
    </span>
    <div className="flex items-center gap-2 min-w-[160px]">
      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">
        Kelengkapan form
      </span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
          style={{ width: `${(receptionProgress / 4) * 100}%` }}
        />
      </div>
      <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">{receptionProgress}/4</span>
    </div>
  </div>
  <form ref={receptionFormRef} onSubmit={handleCreateService} className="p-4 sm:p-6 space-y-6">
    {receptionErrors.length > 0 && (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
          Data wajib belum lengkap
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[11px] text-rose-700">
          {receptionErrors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      </div>
    )}
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,1fr)] gap-6 items-start">
      {/* Left Column: Device & Customer Info */}
      <div className="space-y-5 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-accent text-white text-xs font-extrabold shadow-sm">
            1
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            Pelanggan & Identitas Unit
          </span>
        </div>

        <div className="rounded-2xl border border-indigo-100 bg-accent-lighter/40 p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Pelanggan <span className="text-rose-500">*</span>
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Cari pelanggan lama atau daftarkan pelanggan baru.
              </p>
            </div>
            {selectedReceptionCustomer && (
              <button
                type="button"
                onClick={() => {
                  setNewSrvCustomer("");
                  setCustQuery("");
                  setShowNewSrvCustForm(true);
                }}
                className="text-[10px] font-bold text-accent hover:text-indigo-900"
              >
                Ganti pelanggan
              </button>
            )}
          </div>

          {selectedReceptionCustomer ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-600 text-white text-xs font-bold flex-shrink-0">
                  {(selectedReceptionCustomer.name || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{selectedReceptionCustomer.name}</p>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">{selectedReceptionCustomer.phone || "Tanpa nomor WhatsApp"}</p>
                </div>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                <CheckCircle2 className="w-3 h-3" /> Terpilih
              </span>
            </div>
          ) : (
          <>
          <div className="relative">
              <div className="relative">
                <SearchIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={custQuery}
                  placeholder="Cari nama / no. WhatsApp pelanggan..."
                  onFocus={() => setCustOpen(true)}
                  onBlur={() =>
                    setTimeout(() => setCustOpen(false), 150)
                  }
                  onChange={(e) => {
                    setCustQuery(e.target.value);
                    setCustOpen(true);
                  }}
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-accent transition-all font-semibold"
                />
              </div>
              {custOpen && (
                <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg">
                  {customers
                    .filter((c) =>
                      `${c.name} ${c.phone}`
                        .toLowerCase()
                        .includes(custQuery.toLowerCase()),
                    )
                    .map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => {
                          setNewSrvCustomer(c.id);
                          setNewSrvCustName("");
                          setNewSrvCustPhone("");
                          setShowNewSrvCustForm(false);
                          setCustQuery(`${c.name} (${c.phone})`);
                          setCustOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-[11px] hover:bg-slate-50 border-b border-slate-50 flex items-center justify-between gap-2 ${
                          newSrvCustomer === c.id
                            ? "bg-accent-lighter/60"
                            : ""
                        }`}
                      >
                        <span className="font-semibold text-slate-700 truncate">
                          {c.name}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 shrink-0">
                          {c.phone}
                        </span>
                      </button>
                    ))}
                  {customers.filter((c) =>
                    `${c.name} ${c.phone}`
                      .toLowerCase()
                      .includes(custQuery.toLowerCase()),
                  ).length === 0 && custQuery.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        const query = custQuery.trim();
                        const queryLooksLikePhone = /^[\d\s+()-]{8,}$/.test(query);
                        setNewSrvCustomer("");
                        setNewSrvCustName(queryLooksLikePhone ? "" : query);
                        setNewSrvCustPhone(queryLooksLikePhone ? query : "");
                        setShowNewSrvCustForm(true);
                        setCustOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-[11px] font-bold text-accent hover:bg-accent-lighter border-b border-slate-100 flex items-center gap-1.5"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Tambah pelanggan baru: "{custQuery.trim()}"
                    </button>
                  )}
                  {customers.filter((c) =>
                    `${c.name} ${c.phone}`
                      .toLowerCase()
                      .includes(custQuery.toLowerCase()),
                  ).length === 0 && !custQuery.trim() && (
                    <p className="px-3 py-2 text-[11px] text-slate-400">
                      Ketik nama atau no. WhatsApp...
                    </p>
                  )}
                </div>
              )}
              {/* menyimpan id terpilih untuk submit */}
              <input type="hidden" value={newSrvCustomer} readOnly />
            </div>

            {showNewSrvCustForm && !newSrvCustomer && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-indigo-100 bg-white p-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                    Nama Pelanggan Baru *
                  </label>
                  <input
                    type="text"
                    value={newSrvCustName}
                    onChange={(e) => setNewSrvCustName(e.target.value)}
                    placeholder="Nama lengkap"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                    Nomor WhatsApp *
                  </label>
                  <input
                    type="tel"
                    value={newSrvCustPhone}
                    onChange={(e) => setNewSrvCustPhone(e.target.value)}
                    onBlur={() =>
                      setNewSrvCustPhone(normalizeIndonesianPhone(newSrvCustPhone))
                    }
                    placeholder="081234567890"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-accent font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newSrvCustEmail}
                    onChange={(e) => setNewSrvCustEmail(e.target.value)}
                    placeholder="pelanggan@email.com"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                    Alamat
                  </label>
                  <input
                    type="text"
                    value={newSrvCustAddress}
                    onChange={(e) => setNewSrvCustAddress(e.target.value)}
                    placeholder="Alamat pelanggan"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-accent"
                  />
                </div>
              </div>
            )}
            {newSrvCustPhone && (
              <p className={`mt-2 text-[10px] font-medium ${
                isValidIndonesianPhone(newSrvCustPhone)
                  ? "text-emerald-600"
                  : "text-rose-600"
              }`}>
                {isValidIndonesianPhone(newSrvCustPhone)
                  ? `Nomor tersimpan sebagai ${normalizeIndonesianPhone(newSrvCustPhone)}`
                  : "Gunakan nomor WhatsApp Indonesia yang valid."}
              </p>
            )}
          </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
              Kategori Perangkat
            </label>
            <select
              value={newSrvCategory}
              onChange={(e) => setNewSrvCategory(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-accent transition-all font-medium"
            >
              <option value="Smartphone">Smartphone / HP</option>
              <option value="Tablet">Tablet / iPad</option>
              <option value="Laptop">Laptop / MacBook</option>
              <option value="Desktop">Desktop PC / iMac</option>
              <option value="Console">Konsol Game (PS/Switch)</option>
              <option value="Wearable">Smartwatch / Wearable</option>
              <option value="Printer">Printer / Scanner</option>
              <option value="Other">Lain-lain</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
              Estimasi Selesai
            </label>
            <input
              type="date"
              value={newSrvEstCompletion}
              onChange={(e) => setNewSrvEstCompletion(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-accent transition-all font-mono font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
              Nama Perangkat
            </label>
            <input
              type="text"
              placeholder="Asus ROG GL503"
              value={newSrvDevice}
              onChange={(e) => setNewSrvDevice(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-accent transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
              Brand / Model
            </label>
            <input
              type="text"
              placeholder="ASUS ROG GA401"
              value={newSrvBrand}
              onChange={(e) => setNewSrvBrand(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-accent transition-all"
            />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowMoreDetails((v) => !v)}
            className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-slate-100/70 transition-colors"
          >
            <span className="text-xs font-bold text-slate-600">Detail lainnya (opsional)</span>
            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showMoreDetails ? "rotate-90" : ""}`} />
          </button>
          {showMoreDetails && (
          <div className="px-4 pb-4 pt-2 space-y-3 border-t border-slate-200">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
              Serial Number (SN)
            </label>
            <input
              type="text"
              placeholder="M1N0CV02K24"
              value={newSrvSerial}
              onChange={(e) => setNewSrvSerial(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-accent transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
              Masa Garansi Bawaan
            </label>
            <select
              value={newSrvWarranty}
              onChange={(e) =>
                setNewSrvWarranty(Number(e.target.value))
              }
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-accent transition-all"
            >
              <option value="0">Tanpa Garansi</option>
              <option value="1">1 Bulan</option>
              <option value="3">3 Bulan (Standar)</option>
              <option value="6">6 Bulan</option>
              <option value="12">12 Bulan</option>
            </select>
          </div>
        </div>
          </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-150">
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
              Uang Muka / DP (Rp)
            </label>
            <input
              type="number"
              placeholder="0"
              value={newSrvDownPayment}
              onChange={(e) => setNewSrvDownPayment(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-md outline-none focus:border-accent font-mono font-bold"
              disabled={newSrvIsCheckOnly}
            />
          </div>
          <div className="flex flex-col justify-center">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none mt-2">
              <input
                type="checkbox"
                checked={newSrvIsCheckOnly}
                onChange={(e) => {
                  setNewSrvIsCheckOnly(e.target.checked);
                  if (e.target.checked) {
                    setNewSrvDownPayment("0");
                  }
                }}
                className="accent-accent h-4 w-4 rounded"
              />
              <span>Hanya Cek / Estimasi Dulu</span>
            </label>
            <p className="text-[9px] text-slate-400 pl-6 mt-0.5">
              Biaya ditentukan setelah diagnosa teknisi.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
              Kondisi Fisik Perangkat
            </label>
            <select
              value={newSrvPhysicalCondition}
              onChange={(e) =>
                setNewSrvPhysicalCondition(e.target.value)
              }
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-accent transition-all font-medium"
            >
              <option value="Mulus / Normal Wear">
                Mulus / Normal Wear
              </option>
              <option value="Banyak Lecet Halus">
                Banyak Lecet Halus
              </option>
              <option value="Lecet Kasar & Penyok">
                Lecet Kasar & Penyok
              </option>
              <option value="Retak / Pecah Sebagian">
                Retak / Pecah Sebagian
              </option>
              <option value="Pecah Parah / Hancur">
                Pecah Parah / Hancur
              </option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
              PIN / Pola / Password Kunci Layar
            </label>
            <input
              type={showScreenLock ? "text" : "password"}
              placeholder="PIN / Pola Layar (Opsional)"
              value={newSrvScreenLock}
              onChange={(e) => setNewSrvScreenLock(e.target.value)}
              className="w-full text-xs px-3 py-2 pr-16 border border-slate-200 rounded-lg outline-none focus:border-accent transition-all font-mono font-medium"
            />
            <button
              type="button"
              onClick={() => setShowScreenLock((visible) => !visible)}
              className="mt-1 text-[10px] font-semibold text-accent hover:text-indigo-800"
            >
              {showScreenLock ? "Sembunyikan PIN" : "Tampilkan PIN"}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
            Keluhan Kerusakan / Kendala Perangkat
          </label>
          <textarea
            rows={3}
            placeholder="cth: Layar bergaris horizontal setelah terjatuh dari meja."
            value={newSrvComplaint}
            onChange={(e) => setNewSrvComplaint(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-accent transition-all"
            required
          />
        </div>

        {/* Dynamic Configuration Engine: Device Category Specification Fields */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvancedSpecs((visible) => !visible)}
            className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-100/70 transition-colors"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-accent">
              <Cpu className="w-4 h-4 text-accent" />
              <span>Spesifikasi Teknis ({newSrvCategory})</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showAdvancedSpecs ? "rotate-90" : ""}`} />
          </button>
          {showAdvancedSpecs && (
          <div className="px-4 pb-4 space-y-2.5 border-t border-slate-200 pt-3">
          <p className="text-[10px] text-slate-400">
            Lengkapi jika spesifikasi unit diketahui saat penerimaan.
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {(() => {
              let fields: {
                key: string;
                label: string;
                placeholder: string;
              }[] = [];
              if (
                newSrvCategory === "Laptop" ||
                newSrvCategory === "Desktop"
              ) {
                fields = [
                  {
                    key: "processor",
                    label: "Processor / Chipset",
                    placeholder: "Core i7 / Apple M2",
                  },
                  {
                    key: "ram",
                    label: "Ukuran RAM",
                    placeholder: "16 GB DDR5",
                  },
                  {
                    key: "storage",
                    label: "Kapasitas & Tipe Storage",
                    placeholder: "512 GB NVMe SSD",
                  },
                  {
                    key: "gpu",
                    label: "Graphics Card (Opsional)",
                    placeholder: "NVIDIA RTX 4050",
                  },
                ];
              } else if (
                newSrvCategory === "Smartphone" ||
                newSrvCategory === "Tablet"
              ) {
                fields = [
                  {
                    key: "os",
                    label: "Sistem Operasi",
                    placeholder: "iOS 17.5 / Android 14",
                  },
                  {
                    key: "bh",
                    label: "Battery Health (%)",
                    placeholder: "85%",
                  },
                  {
                    key: "storage",
                    label: "Kapasitas Storage",
                    placeholder: "256 GB",
                  },
                  {
                    key: "imei",
                    label: "IMEI / Serial",
                    placeholder: "358201...",
                  },
                ];
              } else if (newSrvCategory === "Printer") {
                fields = [
                  {
                    key: "ink_level",
                    label: "Kondisi Tinta / Toner",
                    placeholder: "Penuh / Setengah / Kosong",
                  },
                  {
                    key: "connection",
                    label: "Tipe Koneksi",
                    placeholder: "Wi-Fi / USB / LAN",
                  },
                  {
                    key: "page_count",
                    label: "Total Print Page Count",
                    placeholder: "12,450 lembar",
                  },
                ];
              } else if (newSrvCategory === "Console") {
                fields = [
                  {
                    key: "model_type",
                    label: "Tipe & Versi Konsol",
                    placeholder: "PS5 Slim Disc / Switch OLED",
                  },
                  {
                    key: "controllers",
                    label: "Jumlah Controller",
                    placeholder: "1 DualSense / 2 Joycons",
                  },
                  {
                    key: "storage",
                    label: "Storage Internal",
                    placeholder: "1 TB SSD",
                  },
                ];
              } else if (newSrvCategory === "Wearable") {
                fields = [
                  {
                    key: "strap_type",
                    label: "Tipe & Warna Strap",
                    placeholder: "Sport Band Green",
                  },
                  {
                    key: "size",
                    label: "Ukuran Watch Size",
                    placeholder: "44mm / 49mm",
                  },
                ];
              } else {
                fields = [
                  {
                    key: "custom_spec",
                    label: "Spesifikasi Tambahan",
                    placeholder: "Masukkan detail unit",
                  },
                ];
              }

              return fields.map((f) => (
                <div key={f.key} className="space-y-1">
                  <label className="block text-[9.5px] font-semibold text-slate-500 uppercase">
                    {f.label}
                  </label>
                  <input
                    type="text"
                    placeholder={f.placeholder}
                    value={newSrvDynamicSpecs[f.key] || ""}
                    onChange={(e) => {
                      setNewSrvDynamicSpecs((prev) => ({
                        ...prev,
                        [f.key]: e.target.value,
                      }));
                    }}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-md outline-none focus:border-accent font-medium font-mono"
                  />
                </div>
              ));
            })()}
          </div>
          </div>
          )}
        </div>

        <div className="space-y-2 bg-accent-lighter/40 p-3.5 rounded-xl border border-indigo-100">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-mono text-accent uppercase">
              Tugaskan Teknisi
            </label>
            <button
              type="button"
              onClick={runAutoAssign}
              className="px-2.5 py-1 bg-accent hover:bg-accent-hover text-white text-[9px] font-bold font-mono uppercase rounded flex items-center gap-1 cursor-pointer transition-all shadow-xs"
            >
              <Sparkles className="w-2.5 h-2.5" /> Auto-Assign Pintar
            </button>
          </div>
          <select
            value={newSrvTechId}
            onChange={(e) => {
              setNewSrvTechId(e.target.value);
              setAutoAssignReason(null);
            }}
            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-accent transition-all font-medium"
          >
            <option value="">
              -- Antrian Umum / Belum Ditugaskan --
            </option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.position})
              </option>
            ))}
          </select>
          {autoAssignReason && (
            <div className="text-[9.5px] text-indigo-800 leading-relaxed bg-white border border-indigo-150 p-2 rounded-lg font-medium shadow-2xs">
              {autoAssignReason}
            </div>
          )}
        </div>

        <div className="space-y-2 bg-amber-50/50 p-3.5 rounded-xl border border-amber-100">
          <label className="block text-[10px] font-mono text-amber-800 uppercase">Lokasi Rak Unit</label>
          <select
            value={newSrvStorageLocId}
            onChange={(e) => setNewSrvStorageLocId(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-amber-200 rounded-lg bg-white outline-none focus:border-accent transition-all font-medium"
          >
            <option value="">-- Tentukan setelah penerimaan --</option>
            {getStorageLocations(activeTenantId || "")
              .filter((loc) => loc.type === "UNIT_SERVICE" && (!currentBranchId || loc.branchId === currentBranchId))
              .map((loc) => (
                <option key={loc.id} value={loc.id}>📍 {loc.code} — {loc.name}</option>
              ))}
          </select>
          <p className="text-[9.5px] text-amber-700">Pilih rak/locker untuk unit fisik. Bisa diubah dari detail tiket.</p>
        </div>
      </div>

      {/* Right Column: Checklist, Photos, and Outsourcing */}
      <div className="space-y-5 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm xl:sticky xl:top-28">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-600 text-white text-xs font-extrabold shadow-sm">
            2
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            Kondisi Unit Saat Diterima
          </span>
        </div>

        {/* Checklist */}
        <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-bold text-[10px] text-slate-500 uppercase tracking-wider font-mono">
              Checklist Uji Fungsi & Kondisi Masuk:
            </p>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-accent-lighter text-accent border border-indigo-100">
              {Object.values(newSrvChecklist).filter(Boolean).length}{" "}
              / {Object.keys(newSrvChecklist).length} OK
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pb-1 border-b border-slate-150">
            <button
              type="button"
              onClick={() => {
                const updated = { ...newSrvChecklist };
                Object.keys(updated).forEach((k) => {
                  updated[k] = true;
                });
                setNewSrvChecklist(updated);
              }}
              className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-accent rounded cursor-pointer transition-all"
            >
              ✓ Pilih Semua
            </button>
            <button
              type="button"
              onClick={() => {
                const updated = { ...newSrvChecklist };
                Object.keys(updated).forEach((k) => {
                  updated[k] = false;
                });
                setNewSrvChecklist(updated);
              }}
              className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-rose-600 rounded cursor-pointer transition-all"
            >
              ✕ Kosongkan Semua
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] max-h-60 overflow-y-auto pr-1">
            {Object.entries(newSrvChecklist).map(
              ([name, checked]) => (
                <label
                  key={name}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer select-none transition-all duration-200 ${
                    checked
                      ? "bg-emerald-50/55 border-emerald-200 text-emerald-800 font-medium"
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(checked)}
                    onChange={() =>
                      setNewSrvChecklist((prev) => ({
                        ...prev,
                        [name]: !prev[name],
                      }))
                    }
                    className="accent-emerald-600 h-3.5 w-3.5 rounded"
                  />
                  <span className="truncate">{name}</span>
                </label>
              ),
            )}
          </div>
        </div>

        {/* Accessories Left Selection */}
        <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm space-y-3">
          <p className="font-bold text-[10px] text-slate-500 uppercase tracking-wider font-mono">
            Aksesoris Titipan / Bawaan:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
            {(
              CATEGORY_CONFIGS[
                newSrvCategory as keyof typeof CATEGORY_CONFIGS
              ] || CATEGORY_CONFIGS.Other
            ).accessories.map((item) => {
              const checked = newSrvAccessories.includes(item.id);
              return (
                <label
                  key={item.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer select-none transition-all duration-200 ${
                    checked
                      ? "bg-accent-lighter/55 border-indigo-200 text-indigo-800 font-medium"
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(checked)}
                    onChange={() => {
                      if (checked) {
                        setNewSrvAccessories((prev) =>
                          prev.filter((x) => x !== item.id),
                        );
                      } else {
                        setNewSrvAccessories((prev) => [
                          ...prev,
                          item.id,
                        ]);
                      }
                    }}
                    className="accent-accent h-3.5 w-3.5 rounded"
                  />
                  <span className="truncate">{item.label}</span>
                </label>
              );
            })}
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-0.5">
              Aksesoris Tambahan Lainnya (Opsional)
            </label>
            <input
              type="text"
              placeholder="cth: Pouch, Stylus Pen, OTG adapter, dll"
              value={newSrvCustomAccessories}
              onChange={(e) =>
                setNewSrvCustomAccessories(e.target.value)
              }
              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Interactive Capture Condition Module */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDocumentation((visible) => !visible)}
            className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50"
          >
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-accent">
                <Camera className="w-4 h-4 text-accent" />
                <span>Foto Kondisi Unit</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                {newSrvCapturedConditions.length} foto tersimpan
              </p>
            </div>
            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showDocumentation ? "rotate-90" : ""}`} />
          </button>
          {showDocumentation && (
          <div className="px-4 pb-4 space-y-3.5 border-t border-slate-100 pt-3">
          <p className="text-[10px] text-slate-400">
            Ambil foto kondisi kerusakan dengan kategori dan cap waktu.
          </p>

          {/* Select Photo Category */}
          <div className="space-y-1">
            <label className="block text-[9.5px] font-semibold text-slate-500 uppercase">
              Kategori Kerusakan / Bagian
            </label>
            <select
              value={selectedCaptureCategory}
              onChange={(e) =>
                setSelectedCaptureCategory(e.target.value)
              }
              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-md outline-none focus:border-accent"
            >
              <option value="Layar tergores">Layar tergores</option>
              <option value="Penyok / Casing lecet">
                Penyok / Casing lecet
              </option>
              <option value="Soket Charger Longgar">
                Soket Charger Longgar
              </option>
              <option value="Tombol keras / rusak">
                Tombol keras / rusak
              </option>
              <option value="Baterai Kembung">Baterai Kembung</option>
              <option value="Kondisi Lainnya">
                Kondisi Lainnya (Keterangan Bebas)
              </option>
            </select>
          </div>

          {/* Camera Console */}
          {cameraActive ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-900 p-2 space-y-2 relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-44 object-cover bg-black rounded-lg"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                >
                  <Camera className="w-3.5 h-3.5" /> Jepret Foto
                </button>
                <button
                  type="button"
                  onClick={() => showToast("Kamera tidak tersedia; gunakan upload foto nyata.", "error")}
                  className="bg-slate-500 hover:bg-slate-600 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                  title="Demo dinonaktifkan di produksi"
                >
                  <AlertCircle className="w-3.5 h-3.5" /> Demo dinonaktifkan
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-[10px] font-semibold px-2 py-1.5 rounded-lg cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Tutup
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={startCamera}
              className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-accent text-xs py-3.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all font-semibold shadow-xs"
            >
              <Camera className="w-4 h-4 text-slate-400" /> Buka
              Kamera Kondisi Fisik
            </button>
          )}

          {/* Captured Photos Gallery */}
          {newSrvCapturedConditions.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-[9px] font-semibold text-slate-400 uppercase">
                Foto Terlampir ({newSrvCapturedConditions.length})
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {newSrvCapturedConditions.map((cap) => (
                  <div
                    key={cap.id}
                    className="relative rounded-lg overflow-hidden border border-slate-200 group h-20 bg-slate-900"
                  >
                    <img
                      src={cap.photoUrl}
                      alt={cap.category}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1 flex items-center justify-between">
                      <span className="text-[7.5px] font-mono font-bold text-white uppercase truncate max-w-[100px]">
                        {cap.category}
                      </span>
                      <span className="text-[7px] font-mono text-slate-300">
                        {cap.timestamp}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setNewSrvCapturedConditions((prev) =>
                          prev.filter((x) => x.id !== cap.id),
                        )
                      }
                      className="absolute top-1 right-1 p-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
          )}
        </div>

        {/* Outsourcing Section */}
        <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newSrvIsOutsourced}
                onChange={() =>
                  setNewSrvIsOutsourced(!newSrvIsOutsourced)
                }
                className="accent-accent rounded"
              />
              <span className="text-xs font-bold text-slate-700">
                Subkontrak ke Pihak Luar (Outsourced)?
              </span>
            </label>
            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[8px] font-mono font-bold uppercase">
              MAKLOON
            </span>
          </div>

          {newSrvIsOutsourced && (
            <div className="grid grid-cols-2 gap-3 pt-1 animate-fadeIn">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-0.5">
                  Nama Vendor Rekanan
                </label>
                <input
                  type="text"
                  placeholder="cth: Bengkel Solder Master"
                  value={newSrvOutsourcedVendor}
                  onChange={(e) =>
                    setNewSrvOutsourcedVendor(e.target.value)
                  }
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-accent"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-0.5">
                  Estimasi Biaya Vendor (HPP)
                </label>
                <input
                  type="number"
                  placeholder="Rp..."
                  value={newSrvOutsourcingCost}
                  onChange={(e) =>
                    setNewSrvOutsourcingCost(e.target.value)
                  }
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-accent"
                  required
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    <div className="sticky bottom-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-200 bg-white/95 backdrop-blur p-3 sm:px-4 rounded-2xl shadow-[0_-8px_30px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <Save className="w-3.5 h-3.5 text-emerald-600" />
        <span>Perubahan tersimpan otomatis sebagai draft di perangkat ini.</span>
      </div>
      <div className="flex justify-end gap-2.5">
      <button
        type="button"
        onClick={() => setActiveSubTab("list")}
        className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-all"
      >
        Batal
      </button>
      <button
        type="submit"
        disabled={isSubmittingReception}
        className="bg-gradient-to-r from-accent to-accent hover:from-accent-hover hover:to-accent-hover text-white font-bold text-xs px-6 py-2.5 rounded-xl cursor-pointer transition-all shadow-lg shadow-accent/25 flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isSubmittingReception ? (
          <><RefreshCw className="w-4 h-4 animate-spin" /> Menyimpan...</>
        ) : (
          <><PlusCircle className="w-4 h-4" /> Daftarkan Unit & Buat SPK</>
        )}
      </button>
      </div>
    </div>
  </form>
</div>
  );
};
