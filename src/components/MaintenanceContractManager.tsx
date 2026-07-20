import React, { useEffect, useState } from "react";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import { useConfirm } from "./ui/ConfirmDialog";
import {
  ClipboardCheck,
  PlusCircle,
  CheckCircle2,
  Trash2,
  Calendar,
  AlertTriangle,
  Search,
  Package,
  User,
  Clock,
  DollarSign,
} from "lucide-react";

const generateUUID = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface MaintenanceContract {
  id: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  deviceType: string;
  deviceBrand: string;
  deviceSerial?: string;
  contractType: "GOLD" | "SILVER" | "BRONZE" | "CUSTOM";
  startDate: string;
  endDate: string;
  serviceIntervalMonths: number;
  totalCost: number;
  notes: string;
  status: "ACTIVE" | "EXPIRING" | "EXPIRED" | "CANCELLED";
  createdAt: string;
}

export const MaintenanceContractManager: React.FC = () => {
  const { currentTenantId, customers, addLog, apiFetch } = useSaaS();
  const { showToast } = useToast();
  const { confirm: showConfirm } = useConfirm();

  const [contracts, setContracts] = useState<MaintenanceContract[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/module-records?module=maintenance_contracts")
      .then(async (response) => {
        if (!response.ok) throw new Error(`Contract load HTTP ${response.status}`);
        const body = await response.json();
        const rows = Array.isArray(body) ? body : body.data || body.items || [];
        const loaded = rows.map((row: any) => row.payload || row).filter((c: MaintenanceContract) => c.tenantId === currentTenantId);
        if (!cancelled) setContracts(loaded);
      })
      .catch((error: any) => showToast(error?.message || "Kontrak gagal dimuat.", "error"));
    return () => { cancelled = true; };
  }, [apiFetch, currentTenantId, showToast]);

  const persistRecord = async (contract: MaintenanceContract, action: "insert" | "update" | "delete") => {
    const response = await apiFetch("/api/module-records", {
      method: "POST",
      body: JSON.stringify({ module: "maintenance_contracts", recordId: contract.id, payload: contract, action }),
    });
    if (!response.ok) throw new Error(`Contract sync HTTP ${response.status}`);
  };
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  // Form
  const [custId, setCustId] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [deviceBrand, setDeviceBrand] = useState("");
  const [deviceSerial, setDeviceSerial] = useState("");
  const [cType, setCType] = useState<MaintenanceContract["contractType"]>("SILVER");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [intervalMonths, setIntervalMonths] = useState(3);
  const [totalCost, setTotalCost] = useState(0);
  const [notes, setNotes] = useState("");

  const persist = (updated: MaintenanceContract[]) => setContracts(updated);

  const filtered = contracts.filter(
    (c) =>
      c.tenantId === currentTenantId && (
        (c.customerName || "").toLowerCase().includes(search.toLowerCase()) ||
        (c.deviceType || "").toLowerCase().includes(search.toLowerCase()) ||
        (c.contractType || "").toLowerCase().includes(search.toLowerCase())
      ),
  );

  const handleCreate = async () => {
    if (!custId || !deviceType.trim() || !deviceBrand.trim() || !startDate || !endDate) {
      showToast("Pelanggan, tipe device, brand, dan periode wajib diisi.", "error");
      return;
    }
    const cust = customers.find((c) => c.id === custId && c.tenantId === currentTenantId);
    if (!cust) { showToast("Pilih pelanggan yang valid.", "error"); return; }
    if (new Date(startDate) > new Date(endDate)) { showToast("Tanggal mulai tidak boleh melewati tanggal akhir.", "error"); return; }
    const safeIntervalMonths = Math.max(1, Math.floor(Number(intervalMonths) || 1));
    const safeTotalCost = Math.max(0, Number(totalCost) || 0);
    const cleanDeviceType = deviceType.trim();
    const cleanDeviceBrand = deviceBrand.trim();
    const cleanDeviceSerial = deviceSerial.trim().toUpperCase();
    const cleanNotes = notes.trim();

    const newC: MaintenanceContract = {
      id: generateUUID(),
      tenantId: currentTenantId,
      customerId: custId,
      customerName: cust.name,
      deviceType: cleanDeviceType,
      deviceBrand: cleanDeviceBrand,
      deviceSerial: cleanDeviceSerial,
      contractType: cType,
      startDate,
      endDate,
      serviceIntervalMonths: safeIntervalMonths,
      totalCost: safeTotalCost,
      notes: cleanNotes,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    };

    try {
      await persistRecord(newC, "insert");
      persist([newC, ...contracts]);
    } catch (error: any) {
      showToast(error?.message || "Kontrak gagal disimpan.", "error");
      return;
    }
    setShowForm(false);
    resetForm();
    showToast(`Kontrak maintenance ${newC.contractType} untuk ${cust.name} berhasil dibuat!`, "success");
    if (addLog) addLog("Buat Maintenance Contract", `${cust.name} - ${deviceType} (${cType})`, "SERVICE");
  };

  const resetForm = () => {
    setCustId(""); setDeviceType(""); setDeviceBrand(""); setDeviceSerial("");
    setCType("SILVER"); setStartDate(""); setEndDate(""); setIntervalMonths(3);
    setTotalCost(0); setNotes("");
  };

  const updateStatus = async (id: string, status: MaintenanceContract["status"]) => {
    const current = contracts.find((c) => c.id === id && c.tenantId === currentTenantId);
    if (!current) return;
    const updated = { ...current, status };
    try {
      await persistRecord(updated, "update");
      persist(contracts.map((c) => (c.id === id ? updated : c)));
      showToast(`Status kontrak: ${status}`, "info");
    } catch (error: any) {
      showToast(error?.message || "Status kontrak gagal disimpan.", "error");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (await showConfirm({ title: "Hapus Kontrak", message: `Hapus kontrak maintenance ${name}?`, confirmLabel: "Ya, Hapus", type: "danger" })) {
      const current = contracts.find((c) => c.id === id && c.tenantId === currentTenantId);
      if (!current) return;
      try {
        await persistRecord(current, "delete");
        persist(contracts.filter((c) => c.id !== id));
        showToast("Kontrak berhasil dihapus.", "warning");
      } catch (error: any) {
        showToast(error?.message || "Kontrak gagal dihapus.", "error");
      }
    }
  };

  const statusBadge = (s: MaintenanceContract["status"]) => {
    const map = {
      ACTIVE: "bg-emerald-50 text-emerald-700",
      EXPIRING: "bg-amber-50 text-amber-700",
      EXPIRED: "bg-rose-50 text-rose-700",
      CANCELLED: "bg-slate-100 text-slate-500",
    };
    return `px-2 py-0.5 rounded text-[9px] font-bold ${map[s]}`;
  };

  return (
    <div className="space-y-6" id="maint-contract-pane">
      <div className="flex justify-between items-start bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-orange-500" /> Kontrak Maintenance Berkala
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Kelola kontrak pemeliharaan rutin device pelanggan — servis periodik GOLD/SILVER/BRONZE.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" />
            <input
              placeholder="Cari kontrak..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg cursor-pointer shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" /> Kontrak Baru
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-orange-200 rounded-xl p-5 shadow-sm space-y-4 animate-fadeIn">
          <h3 className="font-bold text-xs uppercase text-orange-700 tracking-wider">Form Kontrak Maintenance Baru</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Pelanggan</label>
              <select
                value={custId}
                onChange={(e) => setCustId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">-- Pilih Pelanggan --</option>
                {customers
                  .filter((c) => c.tenantId === currentTenantId)
                  .map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Tipe Device (HP/Laptop/dll)</label>
              <input value={deviceType} onChange={(e) => setDeviceType(e.target.value)} placeholder="Smartphone" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Brand / Model</label>
              <input value={deviceBrand} onChange={(e) => setDeviceBrand(e.target.value)} placeholder="Samsung Galaxy S23" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Serial / IMEI</label>
              <input value={deviceSerial} onChange={(e) => setDeviceSerial(e.target.value)} placeholder="352915..." className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Tipe Kontrak</label>
              <select value={cType} onChange={(e) => setCType(e.target.value as any)} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold">
                <option value="GOLD">GOLD — 6x/tahun + prioritas</option>
                <option value="SILVER">SILVER — 4x/tahun</option>
                <option value="BRONZE">BRONZE — 2x/tahun</option>
                <option value="CUSTOM">CUSTOM — Kustom</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Biaya Kontrak</label>
              <input type="number" value={totalCost || ""} onChange={(e) => setTotalCost(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Mulai</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Berakhir</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Interval Servis</label>
              <select value={intervalMonths} onChange={(e) => setIntervalMonths(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold">
                <option value={1}>1 Bulan</option>
                <option value={2}>2 Bulan</option>
                <option value={3}>3 Bulan</option>
                <option value={6}>6 Bulan</option>
                <option value={12}>12 Bulan</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Catatan</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <button onClick={handleCreate} className="w-full py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg cursor-pointer shadow-sm">
            <CheckCircle2 className="w-4 h-4 inline mr-1.5" /> Buat Kontrak Maintenance
          </button>
        </div>
      )}

      {contracts.length === 0 && !showForm && (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500">Belum ada kontrak maintenance</p>
          <p className="text-[10px] text-slate-400 mt-1">Klik "Kontrak Baru" untuk membuat.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Pelanggan</th>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Tipe</th>
                <th className="px-4 py-3">Periode</th>
                <th className="px-4 py-3">Biaya</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><User className="w-3 h-3 inline mr-1 text-slate-400" />{c.customerName}</td>
                  <td className="px-4 py-3"><Package className="w-3 h-3 inline mr-1 text-slate-400" />{c.deviceBrand} ({c.deviceType})</td>
                  <td className="px-4 py-3 font-mono font-bold text-orange-700">{c.contractType}</td>
                  <td className="px-4 py-3 text-[10px] font-mono text-slate-500">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {c.startDate} — {c.endDate}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-700">Rp {Number(c.totalCost || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <select
                      value={c.status}
                      onChange={(e) => updateStatus(c.id, e.target.value as any)}
                      className={`${statusBadge(c.status)} border-0 cursor-pointer font-bold`}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="EXPIRING">EXPIRING</option>
                      <option value="EXPIRED">EXPIRED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(c.id, c.customerName)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
