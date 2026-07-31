import * as React from 'react';
import { CATEGORY_CONFIGS } from '../../config/categoryConfigs';
import {
  isValidIndonesianPhone,
  normalizeIndonesianPhone,
} from '../../utils/serviceReceptionUtils';
import {
  Save,
  CheckCircle2,
  SearchIcon,
  PlusCircle,
  RefreshCw,
  Camera,
  X,
  MapPin,
  AlertCircle,
  Lock,
  CheckSquare,
  ChevronRight,
  ChevronLeft,
  Wrench,
  Package,
  Upload,
  Eye,
  ShieldCheck,
  Timer,
  FileText,
  MessageSquare,
  Sliders,
  Receipt,
  Building2,
  Zap,
  HelpCircle,
  Trash2,
  Copy,
  AlertTriangle,
  Monitor,
  ExternalLink,
  Brush,
  Ticket,
  Paintbrush,
  Fingerprint,
  Search,
  Activity,
  Maximize,
  Check,
  Calendar,
  ArrowRight,
  Printer,
  Minus,
  Edit,
  MoreVertical,
  CheckCircle,
  Send,
  Filter,
  QrCode,
  Cpu,
  Share2,
  Barcode,
  PackagePlus,
  ListChecks,
  ClipboardList,
  User,
  Phone,
  Mail,
  Tag,
} from 'lucide-react';

export const ServiceReceptionWizard: React.FC<any> = (props) => {
  const {
    receptionFormRef,
    handleCreateService,
    receptionErrors,
    selectedReceptionCustomer,
    setNewSrvCustomer,
    setCustQuery,
    setShowNewSrvCustForm,
    custQuery,
    setCustOpen,
    custOpen,
    customers,
    setNewSrvCustName,
    setNewSrvCustPhone,
    newSrvCustomer,
    showNewSrvCustForm,
    newSrvCustName,
    newSrvCustPhone,
    newSrvCustEmail,
    setNewSrvCustEmail,
    newSrvCustAddress,
    setNewSrvCustAddress,
    newSrvCategory,
    setNewSrvCategory,
    newSrvEstCompletion,
    setNewSrvEstCompletion,
    newSrvDevice,
    setNewSrvDevice,
    newSrvBrand,
    setNewSrvBrand,
    setShowMoreDetails,
    showMoreDetails,
    newSrvSerial,
    setNewSrvSerial,
    newSrvWarranty,
    setNewSrvWarranty,
    newSrvDownPayment,
    setNewSrvDownPayment,
    newSrvDownPaymentMethod,
    setNewSrvDownPaymentMethod,
    newSrvIsCheckOnly,
    setNewSrvIsCheckOnly,
    newSrvPhysicalCondition,
    setNewSrvPhysicalCondition,
    showScreenLock,
    newSrvScreenLock,
    setNewSrvScreenLock,
    setShowScreenLock,
    newSrvComplaint,
    setNewSrvComplaint,
    setShowAdvancedSpecs,
    showAdvancedSpecs,
    newSrvDynamicSpecs,
    setNewSrvDynamicSpecs,
    runAutoAssign,
    newSrvTechId,
    setNewSrvTechId,
    setAutoAssignReason,
    employees,
    autoAssignReason,
    newSrvStorageLocId,
    setNewSrvStorageLocId,
     storageLocations,
      activeTenantId,
    currentBranchId,
    newSrvChecklist,
    setNewSrvChecklist,
    newSrvAccessories,
    setNewSrvAccessories,
    newSrvCustomAccessories,
    setNewSrvCustomAccessories,
    setShowDocumentation,
    newSrvCapturedConditions,
    showDocumentation,
    selectedCaptureCategory,
    setSelectedCaptureCategory,
    cameraActive,
    videoRef,
    capturePhoto,
    setNewSrvCapturedConditions,
    stopCamera,
    startCamera,
    newSrvIsOutsourced,
    setNewSrvIsOutsourced,
    newSrvOutsourcedVendor,
    setNewSrvOutsourcedVendor,
    newSrvOutsourcingCost,
    setNewSrvOutsourcingCost,
    setActiveSubTab,
    isSubmittingReception,
    showToast,
  } = props;

  const fieldError = (k: string): string | undefined => receptionErrors?.[k];
  const fieldBorder = (k: string) =>
    fieldError(k) ? 'figma-input border-red-400' : 'figma-input';
  const FieldError = ({ name }: { name: string }) =>
    fieldError(name) ? (
      <p id={`reception-error-${name}`} role="alert" className="mt-1 text-xs font-medium text-rose-600">{fieldError(name)}</p>
    ) : null;
  const steps = ['Pelanggan', 'Unit', 'Pemeriksaan', 'Konfirmasi'];
  const [currentStep, setCurrentStep] = React.useState(0);
  const validateStep = (step: number) => {
    if (step === 0 && !selectedReceptionCustomer && !(newSrvCustName.trim() && newSrvCustPhone.trim())) {
      showToast('Pilih pelanggan atau isi data pelanggan baru.', 'error');
      return false;
    }
    if (step === 1 && !newSrvDevice.trim()) {
      showToast('Nama perangkat wajib diisi.', 'error');
      return false;
    }
    if (step === 2 && !newSrvComplaint.trim()) {
      showToast('Keluhan perangkat wajib diisi.', 'error');
      return false;
    }
    return true;
  };
  const handleWizardSubmit = (event: React.FormEvent) => {
    if (currentStep < steps.length - 1) {
      event.preventDefault();
      if (validateStep(currentStep)) setCurrentStep((step) => step + 1);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-sm">
       <form ref={receptionFormRef} onSubmit={(event) => currentStep === steps.length - 1 ? handleCreateService(event) : handleWizardSubmit(event)} className="space-y-4 p-3 [6_button]:min-h-10 [6_input]:min-h-10 [6_select]:min-h-10 sm:p-5 dark:bg-zinc-950 dark:text-zinc-100">
        <div className="border-b border-slate-200 bg-white px-3 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white"><ClipboardList className="h-5 w-5" /></div>
              <div><span className="text-sm font-bold text-slate-800">Penerimaan Servis</span><p className="text-xs text-slate-500">Langkah {currentStep + 1} dari {steps.length}: {steps[currentStep]}</p></div>
            </div>
            <span className="text-xs font-semibold text-accent">{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
          </div>
          <div className="mt-3 flex gap-1" aria-label="Progress penerimaan">
            {steps.map((step, index) => <div key={step} className="flex-1"><div className={`h-1.5 rounded-full ${index <= currentStep ? 'bg-accent' : 'bg-slate-200'}`} /><span className="mt-1 hidden text-[12px] text-slate-500 sm:block">{step}</span></div>)}
          </div>
        </div>
        <div className="hidden">
          <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-accent text-white shadow-sm shadow-accent/15">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <span className="text-sm font-bold text-slate-800">Penerimaan Servis</span>
          </div>

        </div>
        {Object.keys(receptionErrors).length > 0 && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-700">
              Data wajib belum lengkap
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-rose-700">
              {Object.values(receptionErrors).map((error) => (
                <li key={String(error)}>{String(error)}</li>
              ))}
            </ul>
          </div>
        )}
          <div className="flex flex-col gap-3">
          {currentStep === 0 && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="rounded-lg bg-slate-50 p-3">
              <div className="mb-3 hidden">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm"><User className="h-4 w-4" /></span>
              </div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Pelanggan <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cari pelanggan lama atau daftarkan pelanggan baru.
                  </p>
                </div>
                {selectedReceptionCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewSrvCustomer('');
                      setCustQuery('');
                      setShowNewSrvCustForm(true);
                    }}
                    className="text-xs font-bold text-accent hover:text-indigo-900"
                  >
                    Ganti pelanggan
                  </button>
                )}
              </div>

              {selectedReceptionCustomer ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-600 text-white text-xs font-bold flex-shrink-0">
                      {(selectedReceptionCustomer.name || '?')
                        .split(' ')
                        .map((w: string) => w[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {selectedReceptionCustomer.name}
                      </p>
                      <p className="text-xs font-mono text-slate-500 mt-0.5">
                        {selectedReceptionCustomer.phone || 'Tanpa nomor WhatsApp'}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
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
                         aria-label="Cari pelanggan"
                         aria-expanded={custOpen}
                         aria-controls="reception-customer-results"
                         placeholder="Cari nama atau nomor WhatsApp pelanggan"
                        onFocus={() => setCustOpen(true)}
                        onBlur={() => setTimeout(() => setCustOpen(false), 150)}
                        onChange={(e) => {
                          setCustQuery(e.target.value);
                          setCustOpen(true);
                        }}
                        className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-accent transition-all font-semibold"
                      />
                    </div>
                    {custOpen && (
                       <div id="reception-customer-results" role="listbox" className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-md shadow-slate-900/5 dark:border-zinc-700 dark:bg-zinc-900">
                        {customers
                          .filter((c) =>
                            `${c.name} ${c.phone}`.toLowerCase().includes(custQuery.toLowerCase())
                          )
                          .map((c) => (
                            <button
                              type="button"
                              key={c.id}
                              onClick={() => {
                                setNewSrvCustomer(c.id);
                                setNewSrvCustName('');
                                setNewSrvCustPhone('');
                                setShowNewSrvCustForm(false);
                                setCustQuery(`${c.name} (${c.phone})`);
                                setCustOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 border-b border-slate-50 flex items-center justify-between gap-2 ${
                                newSrvCustomer === c.id ? 'bg-accent-lighter/60' : ''
                              }`}
                            >
                              <span className="font-semibold text-slate-700 truncate">
                                {c.name}
                              </span>
                              <span className="font-mono text-xs text-slate-400 shrink-0">
                                {c.phone}
                              </span>
                            </button>
                          ))}
                        {customers.filter((c) =>
                          `${c.name} ${c.phone}`.toLowerCase().includes(custQuery.toLowerCase())
                        ).length === 0 &&
                          custQuery.trim() && (
                            <button
                              type="button"
                              onClick={() => {
                                const query = custQuery.trim();
                                const queryLooksLikePhone = /^[\d\s+()-]{8,}$/.test(query);
                                setNewSrvCustomer('');
                                setNewSrvCustName(queryLooksLikePhone ? '' : query);
                                setNewSrvCustPhone(queryLooksLikePhone ? query : '');
                                setShowNewSrvCustForm(true);
                                setCustOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-bold text-accent hover:bg-accent-lighter border-b border-slate-100 flex items-center gap-1.5"
                            >
                              <PlusCircle className="w-3.5 h-3.5" /> Tambah pelanggan baru: "
                              {custQuery.trim()}"
                            </button>
                          )}
                        {customers.filter((c) =>
                          `${c.name} ${c.phone}`.toLowerCase().includes(custQuery.toLowerCase())
                        ).length === 0 &&
                          !custQuery.trim() && (
                            <p className="px-3 py-2 text-xs text-slate-400">
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
                      <div className="relative">
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-0.5">
                          Nama Pelanggan Baru *
                        </label>
                        <input
                          type="text"
                          value={newSrvCustName}
                          onChange={(e) => setNewSrvCustName(e.target.value)}
                          placeholder="Nama lengkap"
                          aria-invalid={Boolean(fieldError('customerName'))}
                          aria-describedby={fieldError('customerName') ? 'reception-error-customerName' : undefined}
                          data-reception-error={fieldError('customerName') ? 'true' : undefined}
                          className={`w-full text-xs pl-9 pr-3 py-2 ${fieldBorder('customerName')} rounded-lg outline-none focus:border-accent`}
                        />
                        <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <FieldError name="customerName" />
                      </div>
                      <div className="relative">
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-0.5">
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
                          aria-invalid={Boolean(fieldError('customerPhone'))}
                          aria-describedby={fieldError('customerPhone') ? 'reception-error-customerPhone' : undefined}
                          data-reception-error={fieldError('customerPhone') ? 'true' : undefined}
                          className={`w-full text-xs pl-9 pr-3 py-2 ${fieldBorder('customerPhone')} rounded-lg outline-none focus:border-accent font-mono`}
                        />
                        <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <FieldError name="customerPhone" />
                      </div>
                      <div className="relative">
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-0.5">
                          Email
                        </label>
                        <input
                          type="email"
                          value={newSrvCustEmail}
                          onChange={(e) => setNewSrvCustEmail(e.target.value)}
                          placeholder="pelanggan@email.com"
                          className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-accent"
                        />
                        <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-0.5">
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
                    <p
                      className={`mt-2 text-xs font-medium ${
                        isValidIndonesianPhone(newSrvCustPhone)
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {isValidIndonesianPhone(newSrvCustPhone)
                        ? `Nomor tersimpan sebagai ${normalizeIndonesianPhone(newSrvCustPhone)}`
                        : 'Gunakan nomor WhatsApp Indonesia yang valid.'}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-0.5">
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
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-0.5">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-0.5">
                  Nama Perangkat
                </label>
                <input
                  type="text"
                  placeholder="Asus ROG GL503"
                  value={newSrvDevice}
                  onChange={(e) => setNewSrvDevice(e.target.value)}
                  className={`w-full text-xs pl-9 pr-3 py-2 ${fieldBorder('deviceName')} rounded-lg outline-none focus:border-accent transition-all`}
                  required
                />
                <Cpu className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <FieldError name="deviceName" />
              </div>
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-0.5">
                  Brand / Model
                </label>
                <input
                  type="text"
                  placeholder="ASUS ROG GA401"
                  value={newSrvBrand}
                  onChange={(e) => setNewSrvBrand(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-accent transition-all"
                />
                <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowMoreDetails((v) => !v)}
                className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-slate-100/70 transition-colors"
              >
                <span className="text-xs font-bold text-slate-600">Detail lainnya (opsional)</span>
                <ChevronRight
                  className={`w-4 h-4 text-slate-400 transition-transform ${showMoreDetails ? 'rotate-90' : ''}`}
                />
              </button>
              {showMoreDetails && (
                <div className="px-4 pb-4 pt-2 space-y-3 border-t border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-0.5">
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
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-0.5">
                        Masa Garansi Bawaan
                      </label>
                      <select
                        value={newSrvWarranty}
                        onChange={(e) => setNewSrvWarranty(Number(e.target.value))}
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

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-mono text-slate-500 uppercase mb-1">
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
                {Number(newSrvDownPayment) > 0 && (
                  <select
                    value={newSrvDownPaymentMethod}
                    onChange={(e) => setNewSrvDownPaymentMethod(e.target.value)}
                    disabled={newSrvIsCheckOnly}
                    className="mt-2 w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-md outline-none focus:border-accent"
                  >
                    <option value="CASH">Tunai</option>
                    <option value="BANK_TRANSFER">Transfer Bank</option>
                    <option value="QRIS">QRIS</option>
                  </select>
                )}
              </div>
              <div className="flex flex-col justify-center">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none mt-2">
                  <input
                    type="checkbox"
                    checked={newSrvIsCheckOnly}
                    onChange={(e) => {
                      setNewSrvIsCheckOnly(e.target.checked);
                      if (e.target.checked) {
                        setNewSrvDownPayment('0');
                      }
                    }}
                    className="accent-accent h-4 w-4 rounded"
                  />
                  <span>Hanya Cek / Estimasi Dulu</span>
                </label>
                <p className="text-xs text-slate-400 pl-6 mt-0.5">
                  Biaya ditentukan setelah diagnosa teknisi.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-0.5">
                  Kondisi Fisik Perangkat
                </label>
                <select
                  value={newSrvPhysicalCondition}
                  onChange={(e) => setNewSrvPhysicalCondition(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-accent transition-all font-medium"
                >
                  <option value="Mulus / Normal Wear">Mulus / Normal Wear</option>
                  <option value="Banyak Lecet Halus">Banyak Lecet Halus</option>
                  <option value="Lecet Kasar & Penyok">Lecet Kasar & Penyok</option>
                  <option value="Retak / Pecah Sebagian">Retak / Pecah Sebagian</option>
                  <option value="Pecah Parah / Hancur">Pecah Parah / Hancur</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-0.5">
                  PIN / Pola / Password Kunci Layar
                </label>
                <input
                  type={showScreenLock ? 'text' : 'password'}
                  placeholder="Password tidak disimpan permanen"
                  value={newSrvScreenLock}
                  onChange={(e) => setNewSrvScreenLock(e.target.value)}
                  className="w-full text-xs px-3 py-2 pr-16 border border-slate-200 rounded-lg outline-none focus:border-accent transition-all font-mono font-medium"
                  autoComplete="new-password"
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] text-slate-400">PIN/Password hanya untuk perbaikan, otomatis terhapus setelah unit selesai</span>
                  <button
                    type="button"
                    onClick={() => setShowScreenLock((visible) => !visible)}
                    className="text-xs font-semibold text-accent hover:text-indigo-800"
                  >
                    {showScreenLock ? 'Sembunyikan' : 'Tampilkan'}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-0.5">
                Keluhan Kerusakan / Kendala Perangkat
              </label>
              <textarea
                rows={3}
                placeholder="cth: Layar bergaris horizontal setelah terjatuh dari meja."
                value={newSrvComplaint}
                onChange={(e) => setNewSrvComplaint(e.target.value)}
                className={`w-full text-xs px-3 py-2 ${fieldBorder('complaint')} rounded-lg outline-none focus:border-accent transition-all`}
                required
              />
              <FieldError name="complaint" />
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
                <ChevronRight
                  className={`w-4 h-4 text-slate-400 transition-transform ${showAdvancedSpecs ? 'rotate-90' : ''}`}
                />
              </button>
              {showAdvancedSpecs && (
                <div className="px-4 pb-4 space-y-2.5 border-t border-slate-200 pt-3">
                  <p className="text-xs text-slate-400">
                    Lengkapi jika spesifikasi unit diketahui saat penerimaan.
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {(() => {
                      let fields: {
                        key: string;
                        label: string;
                        placeholder: string;
                      }[];
                      if (newSrvCategory === 'Laptop' || newSrvCategory === 'Desktop') {
                        fields = [
                          {
                            key: 'processor',
                            label: 'Processor / Chipset',
                            placeholder: 'Core i7 / Apple M2',
                          },
                          {
                            key: 'ram',
                            label: 'Ukuran RAM',
                            placeholder: '16 GB DDR5',
                          },
                          {
                            key: 'storage',
                            label: 'Kapasitas & Tipe Storage',
                            placeholder: '512 GB NVMe SSD',
                          },
                          {
                            key: 'gpu',
                            label: 'Graphics Card (Opsional)',
                            placeholder: 'NVIDIA RTX 4050',
                          },
                        ];
                      } else if (newSrvCategory === 'Smartphone' || newSrvCategory === 'Tablet') {
                        fields = [
                          {
                            key: 'os',
                            label: 'Sistem Operasi',
                            placeholder: 'iOS 17.5 / Android 14',
                          },
                          {
                            key: 'bh',
                            label: 'Battery Health (%)',
                            placeholder: '85%',
                          },
                          {
                            key: 'storage',
                            label: 'Kapasitas Storage',
                            placeholder: '256 GB',
                          },
                          {
                            key: 'imei',
                            label: 'IMEI / Serial',
                            placeholder: '358201...',
                          },
                        ];
                      } else if (newSrvCategory === 'Printer') {
                        fields = [
                          {
                            key: 'ink_level',
                            label: 'Kondisi Tinta / Toner',
                            placeholder: 'Penuh / Setengah / Kosong',
                          },
                          {
                            key: 'connection',
                            label: 'Tipe Koneksi',
                            placeholder: 'Wi-Fi / USB / LAN',
                          },
                          {
                            key: 'page_count',
                            label: 'Total Print Page Count',
                            placeholder: '12,450 lembar',
                          },
                        ];
                      } else if (newSrvCategory === 'Console') {
                        fields = [
                          {
                            key: 'model_type',
                            label: 'Tipe & Versi Konsol',
                            placeholder: 'PS5 Slim Disc / Switch OLED',
                          },
                          {
                            key: 'controllers',
                            label: 'Jumlah Controller',
                            placeholder: '1 DualSense / 2 Joycons',
                          },
                          {
                            key: 'storage',
                            label: 'Storage Internal',
                            placeholder: '1 TB SSD',
                          },
                        ];
                      } else if (newSrvCategory === 'Wearable') {
                        fields = [
                          {
                            key: 'strap_type',
                            label: 'Tipe & Warna Strap',
                            placeholder: 'Sport Band Green',
                          },
                          {
                            key: 'size',
                            label: 'Ukuran Watch Size',
                            placeholder: '44mm / 49mm',
                          },
                        ];
                      } else {
                        fields = [
                          {
                            key: 'custom_spec',
                            label: 'Spesifikasi Tambahan',
                            placeholder: 'Masukkan detail unit',
                          },
                        ];
                      }

                      return fields.map((f) => (
                        <div key={f.key} className="space-y-1">
                          <label className="block text-xs font-semibold text-slate-500 uppercase">
                            {f.label}
                          </label>
                          <input
                            type="text"
                            placeholder={f.placeholder}
                            value={newSrvDynamicSpecs[f.key] || ''}
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

            <div className="rounded-lg bg-slate-50 p-3 space-y-3">
              <div className="mb-3 hidden">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm"><Wrench className="h-4 w-4" /></span>
              </div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-accent">
                  Tugaskan Teknisi
                </label>
                <button
                  type="button"
                  onClick={runAutoAssign}
                  className="px-2.5 py-1 bg-accent hover:bg-accent-hover text-white text-xs font-bold font-mono uppercase rounded flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                >
                  <CheckCircle className="w-2.5 h-2.5" /> Auto-Assign
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
                <option value="">-- Antrian Umum / Belum Ditugaskan --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.position})
                  </option>
                ))}
              </select>
              {autoAssignReason && (
                <div className="text-xs text-indigo-800 leading-relaxed bg-white border border-indigo-200 p-2 rounded-lg font-medium shadow-xs">
                  {autoAssignReason}
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-indigo-100">
                <label className="block text-xs font-semibold text-amber-800 mb-1">
                  Lokasi Rak Unit
                </label>
                <select
                  value={newSrvStorageLocId}
                  onChange={(e) => setNewSrvStorageLocId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-amber-200 rounded-lg bg-white outline-none focus:border-accent transition-all font-medium"
                >
                  <option value="">-- Tentukan setelah penerimaan --</option>
                   {(storageLocations || [])
                      .filter(
                      (loc) =>
                        loc.type === 'UNIT_SERVICE' &&
                        (!currentBranchId || loc.branchId === currentBranchId)
                    )
                    .map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        📍 {loc.code} — {loc.name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-amber-700 mt-1">
                  Pilih rak/locker untuk unit fisik. Bisa diubah dari detail tiket.
                </p>
              </div>
            </div>
            </div>
          )}

          {currentStep === 2 && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 hidden">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm"><ListChecks className="h-4 w-4" /></span>
            </div>
            {/* Checklist */}
            <div className="rounded-lg bg-slate-50 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-xs text-slate-600">
                  Checklist Uji Fungsi & Kondisi Masuk:
                </p>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-accent-lighter text-accent">
                  {Object.values(newSrvChecklist).filter(Boolean).length} /{' '}
                  {Object.keys(newSrvChecklist).length} OK
                </span>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 pb-1 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...newSrvChecklist };
                    Object.keys(updated).forEach((k) => {
                      updated[k] = true;
                    });
                    setNewSrvChecklist(updated);
                  }}
                  className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-accent rounded cursor-pointer transition-all"
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
                  className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-rose-600 rounded cursor-pointer transition-all"
                >
                  ✕ Kosongkan Semua
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                {Object.entries(newSrvChecklist).map(([name, checked]) => (
                  <label
                    key={name}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer select-none transition-all duration-200 ${
                      checked
                        ? 'bg-emerald-50/55 border-emerald-200 text-emerald-800 font-medium'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
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
                ))}
              </div>
            </div>

            {/* Accessories Left Selection */}
            <div className="rounded-lg bg-slate-50 p-3 space-y-3">
              <p className="font-semibold text-xs text-slate-600">
                Aksesoris Titipan / Bawaan:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {(
                  CATEGORY_CONFIGS[newSrvCategory as keyof typeof CATEGORY_CONFIGS] ||
                  CATEGORY_CONFIGS.Other
                ).accessories.map((item) => {
                  const checked = newSrvAccessories.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer select-none transition-all duration-200 ${
                        checked
                          ? 'bg-accent-lighter/55 border-indigo-200 text-indigo-800 font-medium'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(checked)}
                        onChange={() => {
                          if (checked) {
                            setNewSrvAccessories((prev) => prev.filter((x) => x !== item.id));
                          } else {
                            setNewSrvAccessories((prev) => [...prev, item.id]);
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
                <label className="block text-xs font-semibold text-slate-600 mb-0.5">
                  Aksesoris Tambahan Lainnya (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="cth: Pouch, Stylus Pen, OTG adapter, dll"
                  value={newSrvCustomAccessories}
                  onChange={(e) => setNewSrvCustomAccessories(e.target.value)}
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
                  <p className="text-xs text-slate-500 mt-1">
                    {newSrvCapturedConditions.length} foto tersimpan
                  </p>
                </div>
                <ChevronRight
                  className={`w-4 h-4 text-slate-400 transition-transform ${showDocumentation ? 'rotate-90' : ''}`}
                />
              </button>
              {showDocumentation && (
                <div className="px-4 pb-4 space-y-3.5 border-t border-slate-100 pt-3">
                  <p className="text-xs text-slate-400">
                    Ambil foto kondisi kerusakan dengan kategori dan cap waktu.
                  </p>

                  {/* Select Photo Category */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase">
                      Kategori Kerusakan / Bagian
                    </label>
                    <select
                      value={selectedCaptureCategory}
                      onChange={(e) => setSelectedCaptureCategory(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-md outline-none focus:border-accent"
                    >
                      <option value="Layar tergores">Layar tergores</option>
                      <option value="Penyok / Casing lecet">Penyok / Casing lecet</option>
                      <option value="Soket Charger Longgar">Soket Charger Longgar</option>
                      <option value="Tombol keras / rusak">Tombol keras / rusak</option>
                      <option value="Baterai Kembung">Baterai Kembung</option>
                      <option value="Kondisi Lainnya">Kondisi Lainnya (Keterangan Bebas)</option>
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
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                        >
                          <Camera className="w-3.5 h-3.5" /> Jepret Foto
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            showToast('Kamera tidak tersedia; gunakan upload foto nyata.', 'error')
                          }
                          className="bg-slate-500 hover:bg-slate-600 text-white text-xs font-bold px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                          title="Demo dinonaktifkan di produksi"
                        >
                          <AlertCircle className="w-3.5 h-3.5" /> Demo dinonaktifkan
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-2 py-1.5 rounded-lg cursor-pointer"
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
                      <Camera className="w-4 h-4 text-slate-400" /> Buka Kamera Kondisi Fisik
                    </button>
                  )}

                  {/* Captured Photos Gallery */}
                  {newSrvCapturedConditions.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-400 uppercase">
                        Foto Terlampir ({newSrvCapturedConditions.length})
                      </label>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {newSrvCapturedConditions.map((cap) => (
                          <div
                            key={cap.id}
                            className="relative rounded-lg overflow-hidden border border-slate-200 group h-20 bg-slate-900"
                          >
                            <img
                              src={cap.url}
                              alt={cap.category}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1 flex items-center justify-between">
                              <span className="text-xs font-mono font-bold text-white uppercase truncate max-w-[100px]">
                                {cap.category}
                              </span>
                              <span className="text-xs font-mono text-slate-300">
                                {cap.timestamp}
                              </span>
                            </div>
                            <button
                              type="button"
                               onClick={() => {
                                 URL.revokeObjectURL(cap.url);
                                 setNewSrvCapturedConditions((prev) => prev.filter((x) => x.id !== cap.id));
                               }}
                              className="absolute top-1 right-1 p-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
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
            <div className="rounded-lg bg-slate-50 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newSrvIsOutsourced}
                    onChange={() => setNewSrvIsOutsourced(!newSrvIsOutsourced)}
                    className="accent-accent rounded"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    Subkontrak ke Pihak Luar (Outsourced)?
                  </span>
                </label>
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-mono font-bold uppercase">
                  MAKLOON
                </span>
              </div>

              {newSrvIsOutsourced && (
                <div className="grid grid-cols-2 gap-3 pt-1 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-0.5">
                      Nama Vendor Rekanan
                    </label>
                    <input
                      type="text"
                      placeholder="cth: Bengkel Solder Master"
                      value={newSrvOutsourcedVendor}
                      onChange={(e) => setNewSrvOutsourcedVendor(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-accent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-0.5">
                      Estimasi Biaya Vendor (HPP)
                    </label>
                    <input
                      type="number"
                      placeholder="Rp..."
                      value={newSrvOutsourcingCost}
                      onChange={(e) => setNewSrvOutsourcingCost(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-accent"
                      required
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          )}
          {currentStep === 3 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 space-y-2">
              <p className="font-bold text-slate-800">Konfirmasi penerimaan</p>
              <p>Pelanggan: {selectedReceptionCustomer?.name || newSrvCustName}</p>
              <p>Unit: {newSrvDevice || '-'}</p>
              <p>Keluhan: {newSrvComplaint || '-'}</p>
              <p>PIN/password tidak tersimpan di draft perangkat ini.</p>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-b-2xl border-t border-slate-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:px-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Save className="w-3.5 h-3.5 text-emerald-600" />
            <span>Perubahan tersimpan otomatis sebagai draft di perangkat ini.</span>
          </div>
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => currentStep > 0 ? setCurrentStep((step) => step - 1) : setActiveSubTab('list')}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-all"
            >
              {currentStep > 0 ? 'Kembali' : 'Batal'}
            </button>
            <button
              type="submit"
              disabled={isSubmittingReception}
              className="bg-accent hover:bg-accent-hover text-white font-bold text-xs px-6 py-2.5 rounded-xl cursor-pointer transition-all shadow-accent/15 flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmittingReception ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Menyimpan...
                </>
              ) : currentStep < steps.length - 1 ? (
                <>Berikutnya <ChevronRight className="w-4 h-4" /></>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" /> Daftarkan Unit & Buat SPK
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
