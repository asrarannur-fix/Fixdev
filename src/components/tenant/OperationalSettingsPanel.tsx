/**
 * Operational Settings Panel
 * Covers: Service, POS & Kasir, Stok & Pembelian, Keuangan & Accounting, HRM
 * All settings persist via updateTenant -> syncToSupabase (PostgreSQL)
 */
import React, { useState } from "react";
import { Wrench, ShoppingCart, Package, Calculator, Users, Save, RefreshCw } from "lucide-react";
import { useSaaS } from "../../context/SaaSContext";
import { useToast } from "../ui/Toast";

type OperationalSectionKey = "service" | "pos" | "stok" | "accounting" | "hr";

interface Props {
  currentTenantId: string;
  tenantObj: any;
  updateTenant: (id: string, updates: any) => void;
}

export const OperationalSettingsPanel: React.FC<Props> = ({ currentTenantId, tenantObj, updateTenant }) => {
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const s = tenantObj?.settings || {};
  const [activeSection, setActiveSection] = useState<OperationalSectionKey>("service");

  // Service settings
  const [diagFee, setDiagFee] = useState(s.serviceSettings?.defaultDiagnosisFee ?? 25000);
  const [requireEstApprove, setRequireEstApprove] = useState(s.serviceSettings?.requireEstimateApproval ?? true);
  const [allowProceedNoApprove, setAllowProceedNoApprove] = useState(s.serviceSettings?.allowProceedWithoutApproval ?? false);
  const [slaHours, setSlaHours] = useState(s.serviceSettings?.slaHours ?? 48);
  const [autoAssign, setAutoAssign] = useState(s.serviceSettings?.autoAssignTechnician ?? false);

  // POS settings
  const [maxDiscount, setMaxDiscount] = useState(s.posSettings?.maxDiscount ?? 50);
  const [allowNegStock, setAllowNegStock] = useState(s.posSettings?.allowNegativeStock ?? false);
  const [voidApprove, setVoidApprove] = useState(s.posSettings?.requireVoidApproval ?? true);
  const [closeCash, setCloseCash] = useState(s.posSettings?.requireCloseCash ?? true);

  // Inventory / Purchase
  const [hppMethod, setHppMethod] = useState(s.purchaseSettings?.hppMethod ?? "FIFO");
  const [stockAlert, setStockAlert] = useState(s.inventorySettings?.enableStockAlert ?? true);
  const [adjustApprove, setAdjustApprove] = useState(s.purchaseSettings?.requireAdjustmentApproval ?? true);

  // Accounting
  const [autoJournal, setAutoJournal] = useState(s.accountingSettings?.autoJournalEnabled ?? true);

  // HRM
  const [workHours, setWorkHours] = useState(s.hrSettings?.defaultWorkHours ?? 8);
  const [graceLate, setGraceLate] = useState(s.hrSettings?.graceLateMinutes ?? 15);
  const [enableOvertime, setEnableOvertime] = useState(s.hrSettings?.enableOvertime ?? true);
  const [overtimeRate, setOvertimeRate] = useState(s.hrSettings?.overtimeRate ?? 1.5);

  const handleSave = () => {
    if (!updateTenant || !currentTenantId) return;

    const clamp = (value: number, min: number, max: number) =>
      Math.min(max, Math.max(min, Number.isFinite(value) ? Math.trunc(value) : min));

    const safeDiagFee = clamp(diagFee, 0, 100000000);
    const safeSlaHours = clamp(slaHours, 1, 720);
    const safeMaxDiscount = clamp(maxDiscount, 0, 100);
    const safeWorkHours = clamp(workHours, 1, 24);
    const safeGraceLate = clamp(graceLate, 0, 1440);
    const safeOvertimeRate = Math.min(10, Math.max(1, Number.isFinite(overtimeRate) ? overtimeRate : 1));

    setIsSaving(true);
    updateTenant(currentTenantId, {
      settings: {
        ...s,
        serviceSettings: { defaultDiagnosisFee: safeDiagFee, requireEstimateApproval: requireEstApprove, allowProceedWithoutApproval: allowProceedNoApprove, slaHours: safeSlaHours, autoAssignTechnician: autoAssign },
        posSettings: { maxDiscount: safeMaxDiscount, allowNegativeStock: allowNegStock, requireVoidApproval: voidApprove, requireCloseCash: closeCash },
        purchaseSettings: { hppMethod, requireAdjustmentApproval: adjustApprove },
        inventorySettings: { enableStockAlert: stockAlert },
        accountingSettings: { autoJournalEnabled: autoJournal },
        hrSettings: { defaultWorkHours: safeWorkHours, graceLateMinutes: safeGraceLate, enableOvertime, overtimeRate: safeOvertimeRate },
      },
    });
    setTimeout(() => { showToast("Pengaturan operasional berhasil disimpan!", "success"); setIsSaving(false); }, 300);
  };

  const toggle = (val: boolean, setter: (v: boolean) => void) => setter(!val);
  const Toggle = ({ val, onToggle }: { val: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} className={`relative w-10 h-5 rounded-full transition-colors ${val ? "bg-emerald-500" : "bg-slate-300"}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${val ? "translate-x-5" : ""}`} />
    </button>
  );
  const Label = ({ text }: { text: string }) => <label className="text-[10px] font-bold text-slate-500 uppercase">{text}</label>;
  const Select = ({ val, onChange, children }: any) => (
    <select value={val} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white">{children}</select>
  );
  const NumInput = ({ val, onChange, min, max }: any) => (
    <input type="number" min={min} max={max} value={val} onChange={(e) => onChange(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
  );

  const sections: Array<{ id: OperationalSectionKey; label: string; icon: any; color: string }> = [
    { id: "service", label: "Servis", icon: Wrench, color: "indigo" },
    { id: "pos", label: "POS & Kasir", icon: ShoppingCart, color: "emerald" },
    { id: "stok", label: "Stok & Pembelian", icon: Package, color: "amber" },
    { id: "accounting", label: "Keuangan & Accounting", icon: Calculator, color: "blue" },
    { id: "hr", label: "HRM & Payroll", icon: Users, color: "violet" },
  ];

  const sectionDefaults = {
    service: {
      diagFee: s.serviceSettings?.defaultDiagnosisFee ?? 25000,
      requireEstApprove: s.serviceSettings?.requireEstimateApproval ?? true,
      allowProceedNoApprove: s.serviceSettings?.allowProceedWithoutApproval ?? false,
      slaHours: s.serviceSettings?.slaHours ?? 48,
      autoAssign: s.serviceSettings?.autoAssignTechnician ?? false,
    },
    pos: {
      maxDiscount: s.posSettings?.maxDiscount ?? 50,
      allowNegStock: s.posSettings?.allowNegativeStock ?? false,
      voidApprove: s.posSettings?.requireVoidApproval ?? true,
      closeCash: s.posSettings?.requireCloseCash ?? true,
    },
    stok: {
      hppMethod: s.purchaseSettings?.hppMethod ?? "FIFO",
      stockAlert: s.inventorySettings?.enableStockAlert ?? true,
      adjustApprove: s.purchaseSettings?.requireAdjustmentApproval ?? true,
    },
    accounting: {
      autoJournal: s.accountingSettings?.autoJournalEnabled ?? true,
    },
    hr: {
      workHours: s.hrSettings?.defaultWorkHours ?? 8,
      graceLate: s.hrSettings?.graceLateMinutes ?? 15,
      enableOvertime: s.hrSettings?.enableOvertime ?? true,
      overtimeRate: s.hrSettings?.overtimeRate ?? 1.5,
    },
  };

  const handleResetSection = (section: OperationalSectionKey) => {
    const defaults = sectionDefaults[section] as any;
    if (!defaults) return;
    switch (section) {
      case "service":
        setDiagFee(defaults.diagFee);
        setRequireEstApprove(defaults.requireEstApprove);
        setAllowProceedNoApprove(defaults.allowProceedNoApprove);
        setSlaHours(defaults.slaHours);
        setAutoAssign(defaults.autoAssign);
        break;
      case "pos":
        setMaxDiscount(defaults.maxDiscount);
        setAllowNegStock(defaults.allowNegStock);
        setVoidApprove(defaults.voidApprove);
        setCloseCash(defaults.closeCash);
        break;
      case "stok":
        setHppMethod(defaults.hppMethod);
        setStockAlert(defaults.stockAlert);
        setAdjustApprove(defaults.adjustApprove);
        break;
      case "accounting":
        setAutoJournal(defaults.autoJournal);
        break;
      case "hr":
        setWorkHours(defaults.workHours);
        setGraceLate(defaults.graceLate);
        setEnableOvertime(defaults.enableOvertime);
        setOvertimeRate(defaults.overtimeRate);
        break;
    }
  };

  const renderSwitch = () => {
    switch (activeSection) {
      case "service": return (
        <div className="space-y-4">
          <div className="space-y-1"><Label text="Biaya Diagnosis Default (Rp)" /><NumInput val={diagFee} onChange={setDiagFee} min={0} /></div>
          <div className="space-y-1"><Label text="SLA Default (Jam)" /><NumInput val={slaHours} onChange={setSlaHours} min={1} max={168} /></div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"><span className="text-[10px] font-bold text-slate-600 uppercase">Wajib Approve Estimasi</span><Toggle val={requireEstApprove} onToggle={() => toggle(requireEstApprove, setRequireEstApprove)} /></div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"><span className="text-[10px] font-bold text-slate-600 uppercase">Boleh Proses Tanpa Approval</span><Toggle val={allowProceedNoApprove} onToggle={() => toggle(allowProceedNoApprove, setAllowProceedNoApprove)} /></div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"><span className="text-[10px] font-bold text-slate-600 uppercase">Assign Teknisi Otomatis</span><Toggle val={autoAssign} onToggle={() => toggle(autoAssign, setAutoAssign)} /></div>
        </div>
      );
      case "pos": return (
        <div className="space-y-4">
          <div className="space-y-1"><Label text="Diskon Maksimal (%)" /><NumInput val={maxDiscount} onChange={setMaxDiscount} min={0} max={100} /></div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"><span className="text-[10px] font-bold text-slate-600 uppercase">Boleh Stok Negatif</span><Toggle val={allowNegStock} onToggle={() => toggle(allowNegStock, setAllowNegStock)} /></div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"><span className="text-[10px] font-bold text-slate-600 uppercase">Void/Refund Butuh Approval</span><Toggle val={voidApprove} onToggle={() => toggle(voidApprove, setVoidApprove)} /></div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"><span className="text-[10px] font-bold text-slate-600 uppercase">Closing Kas Wajib</span><Toggle val={closeCash} onToggle={() => toggle(closeCash, setCloseCash)} /></div>
        </div>
      );
      case "stok": return (
        <div className="space-y-4">
          <div className="space-y-1"><Label text="Metode HPP" />
            <Select val={hppMethod} onChange={setHppMethod}>
              <option value="FIFO">FIFO (First In First Out)</option>
              <option value="LIFO">LIFO (Last In First Out)</option>
              <option value="AVG">Rata-rata (Average)</option>
            </Select>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"><span className="text-[10px] font-bold text-slate-600 uppercase">Alert Stok Rendah</span><Toggle val={stockAlert} onToggle={() => toggle(stockAlert, setStockAlert)} /></div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"><span className="text-[10px] font-bold text-slate-600 uppercase">Adjustment Stok Butuh Approval</span><Toggle val={adjustApprove} onToggle={() => toggle(adjustApprove, setAdjustApprove)} /></div>
        </div>
      );
      case "accounting": return (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"><span className="text-[10px] font-bold text-slate-600 uppercase">Auto Jurnal Aktif</span><Toggle val={autoJournal} onToggle={() => toggle(autoJournal, setAutoJournal)} /></div>
          <p className="text-[10px] text-slate-400">Saat aktif, setiap transaksi POS, servis, pembelian, dan payroll akan otomatis membuat jurnal di Accounting.</p>
        </div>
      );
      case "hr": return (
        <div className="space-y-4">
          <div className="space-y-1"><Label text="Jam Kerja Default" /><NumInput val={workHours} onChange={setWorkHours} min={1} max={24} /></div>
          <div className="space-y-1"><Label text="Toleransi Telat (Menit)" /><NumInput val={graceLate} onChange={setGraceLate} min={0} max={120} /></div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"><span className="text-[10px] font-bold text-slate-600 uppercase">Aktifkan Lembur</span><Toggle val={enableOvertime} onToggle={() => toggle(enableOvertime, setEnableOvertime)} /></div>
          <div className="space-y-1"><Label text="Rate Lembur (x Jam Normal)" /><NumInput val={overtimeRate} onChange={setOvertimeRate} min={1} max={5} /></div>
        </div>
      );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Wrench className="w-4 h-4 text-indigo-600" /> Pengaturan Operasional
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">Konfigurasi parameter servis, POS, stok, akuntansi, dan HRM.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleResetSection(activeSection)}
            className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl transition-all"
          >
            Reset Bagian Ini
          </button>
          <button onClick={handleSave} disabled={isSaving} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50">
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Menyimpan..." : "Simpan Semua"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left sidebar: section tabs */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-1">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const colorStyles: Record<string, string> = {
              indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
              emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
              amber: "bg-amber-50 text-amber-700 border-amber-200",
              blue: "bg-blue-50 text-blue-700 border-blue-200",
              violet: "bg-violet-50 text-violet-700 border-violet-200",
            };
            const activeStyle = colorStyles[sec.color] || "bg-slate-50 text-slate-700 border-slate-200";
            return (
              <button key={sec.id} onClick={() => setActiveSection(sec.id)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer border ${activeSection === sec.id ? activeStyle : "text-slate-600 hover:bg-slate-50 border-transparent"}`}>
                <Icon className="w-4 h-4" /> {sec.label}
              </button>
            );
          })}
        </div>
        {/* Right content */}
        <div className="lg:col-span-9 bg-white border border-slate-200 rounded-xl p-6 shadow-sm min-h-[300px]">
          {renderSwitch()}
        </div>
      </div>
    </div>
  );
};
