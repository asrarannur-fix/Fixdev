import React, { useEffect, useState } from "react";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import { useConfirm } from "./ui/ConfirmDialog";
import {
  Ticket,
  Gift,
  PlusCircle,
  CheckCircle2,
  Trash2,
  Percent,
  DollarSign,
  Calendar,
  Users,
  Search,
} from "lucide-react";
import { Voucher } from "../types";

const generateUUID = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const VoucherManager: React.FC = () => {
  const { vouchers, setVouchers, currentTenantId, addLog, apiFetch } = useSaaS();
  const { showToast } = useToast();
  const { confirm: showConfirm } = useConfirm();

  const [showAdd, setShowAdd] = useState(false);
  const [code, setCode] = useState("");
  const [vType, setVType] = useState<"DISCOUNT" | "CASHBACK" | "STORE_CREDIT">("DISCOUNT");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "VALUE">("PERCENTAGE");
  const [value, setValue] = useState(0);
  const [minTrans, setMinTrans] = useState(0);
  const [usageLimit, setUsageLimit] = useState(1);
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");

  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/module-records?module=vouchers")
      .then(async (response) => {
        if (!response.ok) return;
        const body = await response.json();
        const rows = Array.isArray(body) ? body : body.data || body.items || [];
        const loaded = rows.map((row: any) => row.payload || row).filter((voucher: any) => voucher.tenantId === currentTenantId);
        if (!cancelled && loaded.length) setVouchers((prev) => [...loaded, ...prev.filter((voucher) => !loaded.some((item: any) => item.id === voucher.id))]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [apiFetch, currentTenantId, setVouchers]);

  const persistVoucher = async (voucher: Voucher, action: "insert" | "update" | "delete") => {
    const response = await apiFetch("/api/module-records", {
      method: "POST",
      body: JSON.stringify({ module: "vouchers", recordId: voucher.id, payload: voucher, action }),
    });
    if (!response.ok) throw new Error(`Voucher sync HTTP ${response.status}`);
  };

  const filtered = vouchers.filter(
    (v) =>
      v.tenantId === currentTenantId &&
      (v.code.toLowerCase().includes(search.toLowerCase()) ||
        v.type.toLowerCase().includes(search.toLowerCase())),
  );

  const handleAdd = async () => {
    const cleanCode = code.trim().toUpperCase();
    const safeValue = discountType === "PERCENTAGE" && vType === "DISCOUNT"
      ? Math.min(100, Math.max(0, Number(value) || 0))
      : Math.max(0, Number(value) || 0);
    const safeMinTrans = Math.max(0, Number(minTrans) || 0);
    const safeUsageLimit = Math.max(1, Math.floor(Number(usageLimit) || 1));
    if (!cleanCode || safeValue <= 0 || !validFrom || !validTo) {
      showToast("Kode, nilai, dan periode berlaku wajib diisi.", "error");
      return;
    }
    if (new Date(validFrom) > new Date(validTo)) {
      showToast("Tanggal mulai tidak boleh melewati tanggal akhir.", "error");
      return;
    }
    const newV: Voucher = {
      id: generateUUID(),
      tenantId: currentTenantId,
      code: cleanCode,
      type: vType,
      discountType,
      value: safeValue,
      minTransaction: safeMinTrans,
      validFrom,
      validTo,
      usageLimit: safeUsageLimit,
      usageCount: 0,
      isActive: true,
    };
    try {
      await persistVoucher(newV, "insert");
      setVouchers((prev) => [newV, ...prev]);
      setShowAdd(false);
      setCode("");
      setValue(0);
      showToast(`Voucher ${newV.code} berhasil dibuat!`, "success");
    } catch (error: any) {
      showToast(error.message || "Voucher gagal disimpan.", "error");
      return;
    }
    if (addLog) addLog("Buat Voucher", `Kode: ${newV.code} (${vType} ${safeValue})`, "INVENTORY");
  };

  const handleToggle = async (id: string) => {
    const current = vouchers.find((v) => v.id === id && v.tenantId === currentTenantId);
    if (!current) return;
    const updated = { ...current, isActive: !current.isActive };
    try {
      await persistVoucher(updated, "update");
      setVouchers((prev) => prev.map((v) => (v.id === id ? updated : v)));
      showToast("Status voucher berhasil diubah.", "info");
    } catch (error: any) {
      showToast(error?.message || "Status voucher gagal disimpan.", "error");
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (
      await showConfirm({
        title: "Hapus Voucher",
        message: `Apakah Anda yakin ingin menghapus voucher ${code}?`,
        confirmLabel: "Ya, Hapus",
        type: "danger",
      })
    ) {
      const current = vouchers.find((v) => v.id === id && v.tenantId === currentTenantId);
      if (!current) return;
      try {
        await persistVoucher(current, "delete");
        setVouchers((prev) => prev.filter((v) => v.id !== id));
        showToast("Voucher berhasil dihapus.", "warning");
      } catch (error: any) {
        showToast(error?.message || "Voucher gagal dihapus.", "error");
      }
    }
  };

  return (
    <div className="space-y-6" id="voucher-pane">
      <div className="flex justify-between items-start bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Gift className="w-5 h-5 text-rose-500" /> Manajemen Voucher &amp; Poin Loyalitas
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Kelola kode diskon, cashback, dan store credit untuk program loyalitas pelanggan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" /> Buat Voucher Baru
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-white border border-rose-200 rounded-xl p-5 shadow-sm space-y-4 animate-fadeIn">
          <h3 className="font-bold text-xs uppercase text-rose-700 tracking-wider flex items-center gap-1.5">
            <Ticket className="w-4 h-4" /> Form Voucher Baru
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Kode Voucher</label>
              <input
                placeholder="DISC10"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Tipe</label>
              <select
                value={vType}
                onChange={(e) => setVType(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold"
              >
                <option value="DISCOUNT">Diskon</option>
                <option value="CASHBACK">Cashback</option>
                <option value="STORE_CREDIT">Store Credit</option>
              </select>
            </div>
            {vType === "DISCOUNT" && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Jenis Diskon</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold"
                >
                  <option value="PERCENTAGE">Persentase (%)</option>
                  <option value="VALUE">Nominal (Rp.)</option>
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">
                {discountType === "PERCENTAGE" && vType === "DISCOUNT" ? "Persentase (%)" : "Nilai"}
              </label>
              <input
                type="number"
                value={value || ""}
                onChange={(e) => setValue(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Berlaku Dari</label>
              <input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Berlaku Sampai</label>
              <input
                type="date"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Min. Transaksi</label>
              <input
                type="number"
                value={minTrans || ""}
                onChange={(e) => setMinTrans(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Batas Pakai</label>
              <input
                type="number"
                value={usageLimit || ""}
                onChange={(e) => setUsageLimit(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" /> Simpan Voucher
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Kode Voucher</th>
              <th className="px-4 py-3">Tipe</th>
              <th className="px-4 py-3">Nilai</th>
              <th className="px-4 py-3">Min. Trans</th>
              <th className="px-4 py-3">Periode</th>
              <th className="px-4 py-3">Pakai</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400 italic">
                  Belum ada voucher. Klik "Buat Voucher Baru" untuk memulai.
                </td>
              </tr>
            )}
            {filtered.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-bold text-slate-800">{v.code}</td>
                <td className="px-4 py-3">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                    v.type === "DISCOUNT"
                      ? "bg-amber-50 text-amber-700"
                      : v.type === "CASHBACK"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-sky-50 text-sky-700"
                  }`}>
                    {v.type === "DISCOUNT" ? <Percent className="w-3 h-3 inline mr-1" /> :
                     v.type === "CASHBACK" ? <DollarSign className="w-3 h-3 inline mr-1" /> :
                     <Gift className="w-3 h-3 inline mr-1" />}
                    {v.type}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono font-bold text-slate-700">
                  {v.discountType === "PERCENTAGE" ? `${v.value}%` : `Rp${v.value.toLocaleString()}`}
                </td>
                <td className="px-4 py-3 font-mono text-slate-500">
                  {v.minTransaction > 0 ? `Rp${v.minTransaction.toLocaleString()}` : "-"}
                </td>
                <td className="px-4 py-3 text-[10px] font-mono text-slate-500">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {v.validFrom} — {v.validTo}
                </td>
                <td className="px-4 py-3 font-mono text-slate-500">
                  {v.usageCount}/{v.usageLimit}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggle(v.id)}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer ${
                      v.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {v.isActive ? "Aktif" : "Nonaktif"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(v.id, v.code)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-100 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
