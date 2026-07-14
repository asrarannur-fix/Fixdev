import React, { useState } from "react";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import {
  ArrowRightLeft,
  Smartphone,
  Calculator,
  Check,
  ShieldAlert,
  CheckCircle2,
  DollarSign,
  RefreshCw,
  FileSpreadsheet,
} from "lucide-react";
import { ItemGrade } from "../types";

export const TradeInCalculator: React.FC = () => {
  const {
    scopedCustomers = [],
    updateCustomer,
    addInventoryProduct,
    addJournalEntry,
    addLog,
    currentTenantId = "",
    currentBranchId = "",
    warehouses = [],
  } = useSaaS();

  const { showToast } = useToast();

  // Selected customer
  const [selectedCustId, setSelectedCustId] = useState("");

  // Auto-select first customer when they load
  React.useEffect(() => {
    if (scopedCustomers && scopedCustomers.length > 0 && !selectedCustId) {
      setSelectedCustId(scopedCustomers[0].id);
    }
  }, [scopedCustomers, selectedCustId]);

  // Device criteria inputs
  const [deviceModel, setDeviceModel] = useState("iPhone 13 128GB Second");
  const [deviceBrand, setDeviceBrand] = useState("Apple");
  const [deviceSerial, setDeviceSerial] = useState("DN8392K4M2");
  const [baseValue, setBaseValue] = useState("5000000"); // Base buyback value

  // Multi-point diagnostic options
  const [screenCond, setScreenCond] = useState<
    "PERFECT" | "SCRATCHED" | "CRACKED" | "DEAD_PIXELS"
  >("PERFECT");
  const [batteryCond, setBatteryCond] = useState<"GOOD" | "WEAK" | "DEAD">(
    "GOOD",
  );
  const [cameraCond, setCameraCond] = useState<"NORMAL" | "BLURRY" | "BROKEN">(
    "NORMAL",
  );
  const [bodyCond, setBodyCond] = useState<
    "LIKE_NEW" | "MINOR_SCRATCH" | "DENT_BENT"
  >("LIKE_NEW");

  // Dynamic calculation of buyback price
  const calculateBuyback = () => {
    let price = Number(baseValue) || 0;

    // 1. Screen condition multiplier
    if (screenCond === "SCRATCHED")
      price *= 0.85; // -15%
    else if (screenCond === "CRACKED")
      price *= 0.6; // -40%
    else if (screenCond === "DEAD_PIXELS") price *= 0.3; // -70%

    // 2. Battery condition multiplier
    if (batteryCond === "WEAK")
      price *= 0.9; // -10%
    else if (batteryCond === "DEAD") price *= 0.7; // -30%

    // 3. Camera condition multiplier
    if (cameraCond === "BLURRY")
      price *= 0.88; // -12%
    else if (cameraCond === "BROKEN") price *= 0.7; // -30%

    // 4. Body condition multiplier
    if (bodyCond === "MINOR_SCRATCH")
      price *= 0.92; // -8%
    else if (bodyCond === "DENT_BENT") price *= 0.75; // -25%

    return Math.round(price);
  };

  const finalComputedVal = calculateBuyback();
  const selectedCust = scopedCustomers.find((c) => c.id === selectedCustId);

  const handlePostTradeIn = () => {
    if (!deviceModel.trim() || !baseValue) {
      showToast("Harap lengkapi formulir input data gadget!", "error");
      return;
    }

    const tenantWhs = warehouses.filter((w) => w.tenantId === currentTenantId);
    const branchWh = tenantWhs.find((w) => w.branchId === currentBranchId) || tenantWhs[0];
    const whId = branchWh?.id || "";
    if (!whId) {
      showToast("Gudang cabang aktif tidak ditemukan", "error");
      return;
    }

    const cleanModel = deviceModel.trim();
    const cleanBrand = deviceBrand.trim();
    const cleanSerial = deviceSerial.trim().toUpperCase();
    const safeVal = Math.max(0, finalComputedVal);

    // 1. Add secondhand device to inventory products list
    addInventoryProduct({
      name: `${cleanModel} (Tukar Tambah)`,
      sku: `USED-${cleanBrand.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-4)}`,
      barcode: "899" + Date.now().toString().slice(-9),
      category: "AKSESORIS", // Used Gadget category mapped
      purchaseCost: safeVal, // Cost is buyback valuation
      sellPrice: Math.round(safeVal * 1.25), // Sell with 25% margin
      unit: "pcs",
      minStock: 0,
      reorderLevel: 0,
      stockQty: 1,
      warehouseStock: { [whId]: 1 },
      grade: ItemGrade.GRADE_C,
      isConsignment: false,
    });

    // 2. Post accounting journal logs
    // Debit: Used Inventory Goods (COA Code: 10300)
    // Credit: Store Credit / Voucher Payable (COA Code: 20200)
    addJournalEntry(
      `TI-${deviceSerial}`,
      `Tukar Tambah Gadget ${deviceModel} dari Pelanggan ${selectedCust?.name || "Customer"}`,
      [
        {
          accountId: `coa-${currentTenantId}-10300`,
          debit: finalComputedVal,
          credit: 0,
        },
        {
          accountId: `coa-${currentTenantId}-20200`,
          debit: 0,
          credit: finalComputedVal,
        },
      ],
    );

    // 3. Increment customer's store credit in memory via context
    if (selectedCust) {
      updateCustomer(selectedCust.id, {
        storeCredit: (selectedCust.storeCredit ?? 0) + finalComputedVal,
      });
    }

    // 4. Register audit trail
    addLog(
      "Trade-In Complete",
      `Tukar tambah ${deviceModel} disetujui. Store credit Rp ${finalComputedVal.toLocaleString()} dikreditkan ke ${selectedCust?.name || "Customer"}.`,
      "FINANCE",
      "MEDIUM",
    );

    showToast(
      `Sukses! Gadget bekas berhasil dinilai sebesar Rp ${finalComputedVal.toLocaleString()}.\n- Barang ditambahkan ke persediaan unit Used/Second.\n- Akun Store Credit pelanggan "${selectedCust?.name}" bertambah.\n- Jurnal Akuntansi double-entry berhasil didebit/kredit.`,
      "success",
    );

    // Reset
    setDeviceModel("");
    setDeviceSerial("");
    setBaseValue("4000000");
  };

  return (
    <div
      className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden"
      id="tradein-calculator-container"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-sm text-blue-950 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-600 dark:text-blue-400" />{" "}
            Kalkulator Penilaian &amp; Tukar Tambah Gadget
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Beri penawaran harga beli balik yang kompetitif dan aman untuk
            gadget bekas pelanggan lewat multi-point diagnostic wizard.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 text-[10px] font-bold font-mono">
            Direct Store Credit Auto-Sync
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12">
        {/* Left Column: Form inputs */}
        <div className="xl:col-span-5 p-4 sm:p-5 border-b xl:border-b-0 xl:border-r border-slate-100 dark:border-zinc-800 space-y-4">
          <div className="border-b border-slate-100 dark:border-zinc-800 pb-2">
            <h4 className="font-bold text-xs uppercase text-slate-700 dark:text-zinc-200 tracking-wider flex items-center gap-1">
              <Calculator className="w-4 h-4 text-blue-600" /> Profil Unit &amp;
              Pelanggan
            </h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Isi detail pelanggan dan unit tukar tambah sebelum memulai skor
              diagnosis fisik.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-1">
                Pilih Pelanggan Pemilik
              </label>
              <select
                value={selectedCustId}
                onChange={(e) => setSelectedCustId(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 font-semibold text-slate-700 dark:text-zinc-300"
              >
                {scopedCustomers.length === 0 ? (
                  <option value="">-- Belum ada pelanggan --</option>
                ) : (
                  scopedCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) - Store Credit: Rp{" "}
                      {(c.storeCredit ?? 0).toLocaleString()}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Model Gadget &amp; Kapasitas
                </label>
                <input
                  type="text"
                  placeholder="Cth: iPhone 13 Pro Max 256GB"
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 font-semibold bg-white dark:bg-zinc-950 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Merek (Brand)
                </label>
                <input
                  type="text"
                  placeholder="Cth: Apple"
                  value={deviceBrand}
                  onChange={(e) => setDeviceBrand(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 font-medium bg-white dark:bg-zinc-950 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Serial Number / IMEI
                </label>
                <input
                  type="text"
                  placeholder="Cth: IMEI-938210392"
                  value={deviceSerial}
                  onChange={(e) => setDeviceSerial(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 font-mono text-[10px] bg-white dark:bg-zinc-950 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-1">
                Harga Beli Normal (Baru / Mulus Maksimal)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 font-bold text-slate-400">
                  Rp
                </span>
                <input
                  type="number"
                  placeholder="6500000"
                  value={baseValue}
                  onChange={(e) => setBaseValue(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 font-mono font-bold text-slate-800 dark:text-zinc-200 bg-white dark:bg-zinc-950"
                />
              </div>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
                Nilai referensi pasar sebelum dikurangi skor degradasi komponen
                fisik.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Multi-point Diagnostic & Results */}
        <div className="xl:col-span-7 p-4 sm:p-6 bg-slate-50/50 dark:bg-zinc-950/10 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="font-bold text-xs uppercase text-slate-700 dark:text-zinc-300 tracking-wider flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-blue-600" /> Wizard
              Multi-Point Diagnostic Kondisi Fisik
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Screen */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-2xl p-4 space-y-2.5">
                <p className="font-bold text-slate-700 dark:text-zinc-300 uppercase text-[10px] font-mono">
                  1. Kondisi Layar / Screen LCD
                </p>
                <div className="space-y-1.5 font-medium">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                    <input
                      type="radio"
                      checked={screenCond === "PERFECT"}
                      onChange={() => setScreenCond("PERFECT")}
                      className="text-blue-600"
                    />
                    <span>Lulus Sempurna / Normal (100%)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                    <input
                      type="radio"
                      checked={screenCond === "SCRATCHED"}
                      onChange={() => setScreenCond("SCRATCHED")}
                      className="text-blue-600"
                    />
                    <span>Baret Tipis / Scratch (-15%)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                    <input
                      type="radio"
                      checked={screenCond === "CRACKED"}
                      onChange={() => setScreenCond("CRACKED")}
                      className="text-blue-600"
                    />
                    <span>Retak Sebagian / Shadow (-40%)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                    <input
                      type="radio"
                      checked={screenCond === "DEAD_PIXELS"}
                      onChange={() => setScreenCond("DEAD_PIXELS")}
                      className="text-blue-600"
                    />
                    <span>Dead Pixel / Blank Sebagian (-70%)</span>
                  </label>
                </div>
              </div>

              {/* Battery */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-2xl p-4 space-y-2.5">
                <p className="font-bold text-slate-700 dark:text-zinc-300 uppercase text-[10px] font-mono">
                  2. Degradasi Kesehatan Baterai (BH)
                </p>
                <div className="space-y-1.5 font-medium">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                    <input
                      type="radio"
                      checked={batteryCond === "GOOD"}
                      onChange={() => setBatteryCond("GOOD")}
                      className="text-blue-600"
                    />
                    <span>Kapasitas Sehat BH &gt;= 80% (100%)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                    <input
                      type="radio"
                      checked={batteryCond === "WEAK"}
                      onChange={() => setBatteryCond("WEAK")}
                      className="text-blue-600"
                    />
                    <span>Battery Service BH 70-79% (-10%)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                    <input
                      type="radio"
                      checked={batteryCond === "DEAD"}
                      onChange={() => setBatteryCond("DEAD")}
                      className="text-blue-600"
                    />
                    <span>Baterai Rusak / Kembung (-30%)</span>
                  </label>
                </div>
              </div>

              {/* Cameras */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-2xl p-4 space-y-2.5">
                <p className="font-bold text-slate-700 dark:text-zinc-300 uppercase text-[10px] font-mono">
                  3. Sistem Kamera &amp; Sensor
                </p>
                <div className="space-y-1.5 font-medium">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                    <input
                      type="radio"
                      checked={cameraCond === "NORMAL"}
                      onChange={() => setCameraCond("NORMAL")}
                      className="text-blue-600"
                    />
                    <span>Fokus Jernih / Semua Lensa Ok (100%)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                    <input
                      type="radio"
                      checked={cameraCond === "BLURRY"}
                      onChange={() => setCameraCond("BLURRY")}
                      className="text-blue-600"
                    />
                    <span>Kamera Baret / Blur Debu (-12%)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                    <input
                      type="radio"
                      checked={cameraCond === "BROKEN"}
                      onChange={() => setCameraCond("BROKEN")}
                      className="text-blue-600"
                    />
                    <span>Lensa Retak / Kamera Mati (-30%)</span>
                  </label>
                </div>
              </div>

              {/* Body */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-2xl p-4 space-y-2.5">
                <p className="font-bold text-slate-700 dark:text-zinc-300 uppercase text-[10px] font-mono">
                  4. Casing / Frame Fisik
                </p>
                <div className="space-y-1.5 font-medium">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                    <input
                      type="radio"
                      checked={bodyCond === "LIKE_NEW"}
                      onChange={() => setBodyCond("LIKE_NEW")}
                      className="text-blue-600"
                    />
                    <span>Mulus Sempurna / Like New (100%)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                    <input
                      type="radio"
                      checked={bodyCond === "MINOR_SCRATCH"}
                      onChange={() => setBodyCond("MINOR_SCRATCH")}
                      className="text-blue-600"
                    />
                    <span>Lecet Halus Pemakaian Normal (-8%)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                    <input
                      type="radio"
                      checked={bodyCond === "DENT_BENT"}
                      onChange={() => setBodyCond("DENT_BENT")}
                      className="text-blue-600"
                    />
                    <span>Penyok Sudut / Bengkok / Dent (-25%)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Results summary panel */}
          <div className="bg-blue-950 border border-blue-900 rounded-2xl p-5 text-white space-y-4 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] text-blue-300 font-mono font-bold uppercase tracking-wider">
                  ESTIMASI HARGA BELI BALIK
                </span>
                <p className="text-2xl font-black text-amber-400 font-mono mt-0.5">
                  Rp {finalComputedVal.toLocaleString()}
                </p>
              </div>
              <div className="bg-white/10 rounded-xl px-4 py-2 border border-white/5 text-right sm:text-left">
                <span className="text-[8px] text-blue-300 font-mono font-bold uppercase block">
                  AKUN PENERIMA KREDIT
                </span>
                <p className="font-bold text-[11px] truncate max-w-[150px]">
                  {selectedCust?.name || "Pilih Pelanggan"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11.5px] text-blue-200 leading-normal">
              <div className="space-y-1 bg-blue-900/40 p-3 rounded-xl border border-white/5">
                <p className="font-extrabold text-white flex items-center gap-1">
                  <Smartphone className="w-4 h-4 text-amber-400" /> Hasil
                  Inventaris:
                </p>
                <p>
                  Sistem akan mendaftarkan unit <strong>{deviceModel}</strong>{" "}
                  ke persediaan dengan harga modal Rp{" "}
                  {finalComputedVal.toLocaleString()} dan harga jual rilis
                  profit.
                </p>
              </div>
              <div className="space-y-1 bg-blue-900/40 p-3 rounded-xl border border-white/5">
                <p className="font-extrabold text-white flex items-center gap-1">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />{" "}
                  Jurnal Akuntansi Double-Entry:
                </p>
                <p>
                  Debit: Persediaan Barang Bekas (+Rp{" "}
                  {finalComputedVal.toLocaleString()}) <br />
                  Kredit: Hutang Store Credit Pelanggan (+Rp{" "}
                  {finalComputedVal.toLocaleString()})
                </p>
              </div>
            </div>

            <button
              onClick={handlePostTradeIn}
              className="w-full bg-amber-400 hover:bg-amber-500 text-blue-950 font-black text-xs py-3 rounded-xl shadow-lg cursor-pointer transition flex items-center justify-center gap-1.5"
            >
              <ArrowRightLeft className="w-4 h-4" /> Finalisasi Persetujuan
              &amp; Tambah Store Credit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
