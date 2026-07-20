import React, { useState } from "react";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import {
  Hammer,
  Sparkles,
  Check,
  ListChecks,
  Coins,
  Info,
  ShieldAlert,
  Clock,
  ArrowRight,
  ArrowRightLeft,
  FileSpreadsheet,
} from "lucide-react";
import { ItemGrade } from "../types";

interface SalvageItem {
  id: string;
  name: string;
  baseValue: number;
  selected: boolean;
}

export const CannibalWorkshop: React.FC = () => {
  const { showToast } = useToast();
  const {
    products,
    warehouses,
    currentTenantId,
    currentBranchId,
    addInventoryProduct,
    updateInventoryProduct,
    addJournalEntry,
    addLog,
  } = useSaaS();

  const [donorName, setDonorName] = useState("iPhone 11 Pro Max Mati Total");
  const [donorSKU, setDonorSKU] = useState("SCRAP-IPHONE11PM");
  const [grade, setGrade] = useState<ItemGrade>(ItemGrade.GRADE_B);

  // Sales state for scrap components
  const [sellingProduct, setSellingProduct] = useState<any | null>(null);
  const [buyerName, setBuyerName] = useState("Pelanggan Umum");
  const [soldPrice, setSoldPrice] = useState("");

  // Dynamic Parts checklist
  const [salvageableParts, setSalvageableParts] = useState<SalvageItem[]>([
    {
      id: "part-lcd",
      name: "Layar Super Retina XDR OLED (Salvaged)",
      baseValue: 650000,
      selected: true,
    },
    {
      id: "part-cam",
      name: "Triple Camera Module System (Salvaged)",
      baseValue: 350000,
      selected: true,
    },
    {
      id: "part-batt",
      name: "Baterai Li-ion Original 3969 mAh (Salvaged)",
      baseValue: 120000,
      selected: false,
    },
    {
      id: "part-faceid",
      name: "Sensors FaceID & TrueDepth (Salvaged)",
      baseValue: 200000,
      selected: false,
    },
    {
      id: "part-housing",
      name: "Stainless Steel Frame + Back Glass (Salvaged)",
      baseValue: 250000,
      selected: false,
    },
  ]);

  // History log of disassemblies
  const [harvestLogs, setHarvestLogs] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem(
        `saas_cannibal_logs_${currentTenantId}`,
      );
      return saved
        ? JSON.parse(saved)
        : [
            {
              id: "CAN-0041",
              donorDevice: "Asus ROG GL503 Broken Screen",
              partsExtracted: ["Heatsink Dual Fan", "Keyboard RGB Mech"],
              totalValue: 450000,
              techName: "Ahmad Teknisi",
              date: "2026-06-28",
            },
          ];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(
        `saas_cannibal_logs_${currentTenantId}`,
      );
      if (saved) {
        setHarvestLogs(JSON.parse(saved));
      } else {
        setHarvestLogs([
          {
            id: "CAN-0041",
            donorDevice: "Asus ROG GL503 Broken Screen",
            partsExtracted: ["Heatsink Dual Fan", "Keyboard RGB Mech"],
            totalValue: 450000,
            techName: "Ahmad Teknisi",
            date: "2026-06-28",
          },
        ]);
      }
    } catch {
      setHarvestLogs([]);
    }
  }, [currentTenantId]);

  // Adjust valuation according to grade modifier
  const getGradeModifier = () => {
    switch (grade) {
      case ItemGrade.GRADE_A:
        return 1.2; // +20% for excellent condition
      case ItemGrade.GRADE_B:
        return 1.0;
      case ItemGrade.GRADE_C:
        return 0.7; // -30% for scratches
      case ItemGrade.GRADE_D:
        return 0.4; // -60% for heavily worn
      default:
        return 1.0;
    }
  };

  const modifier = getGradeModifier();
  const totalSalvageValue = salvageableParts
    .filter((p) => p.selected)
    .reduce((sum, p) => sum + Math.round(p.baseValue * modifier), 0);

  const togglePartSelection = (partId: string) => {
    setSalvageableParts((prev) =>
      prev.map((p) => {
        if (p.id === partId) {
          return { ...p, selected: !p.selected };
        }
        return p;
      }),
    );
  };

  const handleHarvest = () => {
    const cleanDonorName = donorName.trim();
    const cleanDonorSKU = donorSKU.trim().toUpperCase();
    if (!cleanDonorName || !cleanDonorSKU) {
      showToast("Mohon isi nama perangkat donor scrap dan SKU induk!", "error");
      return;
    }
    const selectedParts = salvageableParts.filter((p) => p.selected);
    if (selectedParts.length === 0) {
      showToast(
        "Mohon pilih minimal 1 part suku cadang untuk dipanen!",
        "error",
      );
      return;
    }

    const tenantWhs = warehouses.filter((w) => w.tenantId === currentTenantId);
    const saleWarehouse =
      tenantWhs.find((w) => w.branchId === currentBranchId) || tenantWhs[0];
    if (!saleWarehouse) {
      showToast(
        "Gagal memanen: tidak ada gudang yang tersedia untuk tenant Anda.",
        "error",
      );
      return;
    }
    const whId = saleWarehouse.id;

    // 1. Add each selected part into the global inventory list
    selectedParts.forEach((part, index) => {
      const computedValue = Math.round(part.baseValue * modifier);
      const partSKU = `${cleanDonorSKU}-S${index + 1}`;

      addInventoryProduct({
        name: `${part.name} - Ex ${cleanDonorName}`,
        sku: partSKU,
        barcode: "899" + Date.now().toString().slice(-9),
        category: "SPAREPART",
        purchaseCost: 0,
        sellPrice: computedValue,
        unit: "pcs",
        minStock: 0,
        reorderLevel: 0,
        stockQty: 1,
        warehouseStock: { [whId]: 1 },
        grade: grade,
        isConsignment: false,
      });
    });

    // 2. Post automatic double-entry accounting journal entries
    // Debit: Spareparts Inventory (COA Code: 10200)
    // Credit: Miscellaneous Income / Other Revenues (COA Code: 40200)
    addJournalEntry(
      `CAN-${cleanDonorSKU}-${Date.now().toString(36)}`,
      `Panen Suku Cadang dari ${cleanDonorName} (Grade ${grade.replace("_", " ")})`,
      [
        {
          accountId: `coa-${currentTenantId}-10200`,
          debit: totalSalvageValue,
          credit: 0,
        },
        {
          accountId: `coa-${currentTenantId}-40200`,
          debit: 0,
          credit: totalSalvageValue,
        },
      ],
    );

    // 3. Add audit trace
    addLog(
      "Dismantle/Harvest",
      `Memanen ${selectedParts.length} spareparts dari ${cleanDonorName} senilai Rp ${totalSalvageValue.toLocaleString()}`,
      "INVENTORY",
      "MEDIUM",
    );

    // 4. Update local log list
    const newLog = {
      id: `CAN-${Date.now().toString(36)}`,
      donorDevice: cleanDonorName,
      partsExtracted: selectedParts.map((p) =>
        p.name.replace(" (Salvaged)", ""),
      ),
      totalValue: totalSalvageValue,
      techName: "Ahmad Teknisi",
      date: new Date().toISOString().split("T")[0],
    };

    setHarvestLogs((prev) => {
      const nextLogs = [newLog, ...prev];
      try {
        localStorage.setItem(
          `saas_cannibal_logs_${currentTenantId}`,
          JSON.stringify(nextLogs),
        );
      } catch (_) {}
      return nextLogs;
    });

    showToast(
      `Sukses! ${selectedParts.length} Suku cadang berhasil dipanen, dimasukkan ke stok gudang, dan pembukuan neraca otomatis diposting.`,
      "success",
    );

    // Reset inputs
    setDonorName("");
    setDonorSKU("");
    setSalvageableParts((prev) => prev.map((p) => ({ ...p, selected: false })));
  };

  return (
    <div
      className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden"
      id="cannibal-workshop-container"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-sm text-indigo-950 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-2">
            <Hammer className="w-5 h-5 text-accent" /> Kanibalisasi &amp;
            Bengkel Disassembly
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Urai perangkat rongsokan (scrap unit) menjadi sparepart layak pakai,
            tingkatkan profit margin dengan nol modal pengadaan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 text-[10px] font-bold font-mono">
            Modul Pembukuan Otomatis
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12">
        {/* Left column: Setup Dismantle */}
        <div className="xl:col-span-5 p-5 border-r border-slate-100 dark:border-zinc-800 space-y-5">
          <div className="border-b border-slate-100 dark:border-zinc-800 pb-2">
            <h4 className="font-bold text-xs uppercase text-slate-700 dark:text-zinc-200 tracking-wider flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-accent animate-pulse" />{" "}
              Form Dekonstruksi Suku Cadang
            </h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Daftarkan rincian fisik perangkat scrap dan kondisi komponen yang
              diekstrak.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Perangkat Donor Rongsokan (Scrap Unit)
                </label>
                <input
                  type="text"
                  placeholder="Cth: iPhone 11 Pro Max Mati Total"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-accent font-semibold dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Kode SKU Induk Scrap
                </label>
                <input
                  type="text"
                  placeholder="Cth: SCRAP-IPHONE11"
                  value={donorSKU}
                  onChange={(e) => setDonorSKU(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-accent font-mono text-[10px] dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Grade Fisik Part (Kualitas)
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value as ItemGrade)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-accent font-semibold text-slate-700 dark:text-zinc-200"
                >
                  <option value={ItemGrade.GRADE_A}>
                    Grade A (Sangat Mulus +20%)
                  </option>
                  <option value={ItemGrade.GRADE_B}>
                    Grade B (Normal / Standar)
                  </option>
                  <option value={ItemGrade.GRADE_C}>
                    Grade C (Ada Goresan Ringan -30%)
                  </option>
                  <option value={ItemGrade.GRADE_D}>
                    Grade D (Fungsional Saja -60%)
                  </option>
                </select>
              </div>
            </div>

            {/* Component checkboxes list */}
            <div className="space-y-2">
              <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-1 flex justify-between">
                <span>Daftar Suku Cadang Yang Dipanen</span>
                <span className="text-accent dark:text-accent font-bold">
                  Pilih Komponen
                </span>
              </label>

              <div className="border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/20 p-3.5 space-y-2.5">
                {salvageableParts.map((part) => {
                  const compValue = Math.round(part.baseValue * modifier);
                  return (
                    <div
                      key={part.id}
                      onClick={() => togglePartSelection(part.id)}
                      className="flex items-center justify-between p-2.5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-xl hover:border-accent/50 dark:hover:border-indigo-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                            part.selected
                              ? "bg-accent border-accent text-white"
                              : "border-slate-300 dark:border-zinc-700"
                          }`}
                        >
                          {part.selected && (
                            <Check className="w-3 h-3 stroke-[3]" />
                          )}
                        </div>
                        <span className="font-semibold text-slate-700 dark:text-zinc-200 text-[11px] leading-tight">
                          {part.name}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 dark:text-zinc-500 font-bold">
                        Rp {compValue.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Accounting double entry notice */}
            <div className="p-4 bg-accent-lighter/60 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 space-y-2 text-[10.5px] leading-normal text-slate-600 dark:text-zinc-300">
              <p className="font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1">
                <Coins className="w-4 h-4 text-accent" /> Jurnal
                Double-Entry Otomatis:
              </p>
              <div className="font-mono text-[9px] text-slate-500 dark:text-slate-400 space-y-1 bg-white dark:bg-zinc-950 border border-indigo-100/40 dark:border-indigo-900/30 p-2.5 rounded-xl">
                <p className="text-emerald-700 dark:text-emerald-400 font-bold">
                  &bull; DEBIT: Persediaan Suku Cadang (Asset) <br />
                  &rArr; Rp {totalSalvageValue.toLocaleString()}
                </p>
                <p className="text-accent dark:text-accent font-bold">
                  &bull; KREDIT: Pendapatan Operasional Lain (Revenue) <br />
                  &rArr; Rp {totalSalvageValue.toLocaleString()}
                </p>
              </div>
              <p className="text-[9px] text-slate-400 dark:text-slate-500">
                Pemanenan langsung mendebit neraca persediaan tanpa mengeluarkan
                arus kas keluar.
              </p>
            </div>

            {/* Submit trigger */}
            <button
              onClick={handleHarvest}
              className="w-full bg-accent hover:bg-accent-hover text-white font-black text-xs py-2.5 rounded-xl transition shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Hammer className="w-4 h-4" /> Proses Ekstraksi Suku Cadang
            </button>
          </div>
        </div>

        {/* Right column: Active inventory and Logs */}
        <div className="xl:col-span-7 p-6 bg-slate-50/50 dark:bg-zinc-950/10 space-y-6">
          {/* Active harvested inventory search */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3.5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-800">
              <h4 className="font-bold text-xs uppercase text-slate-700 dark:text-zinc-200 tracking-wider flex items-center gap-1 border-b-0">
                <ListChecks className="w-4 h-4 text-accent" /> Suku Cadang
                Bekas Hasil Panen Terdaftar
              </h4>
              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 text-[9px] font-bold font-mono">
                Used Inventory List
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-950 border-b border-slate-100 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 font-mono text-[9px] uppercase">
                    <th className="px-3 py-2">Nama Sparepart</th>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2 text-center">Grade</th>
                    <th className="px-3 py-2 text-right">Stok</th>
                    <th className="px-3 py-2 text-right">Harga Jual</th>
                    <th className="px-3 py-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-805 font-medium">
                  {products.filter(
                    (p) =>
                      p.sku.toLowerCase().includes("scrap") ||
                      p.name.toLowerCase().includes("salvaged") ||
                      p.sku.toLowerCase().includes("can-"),
                  ).length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-6 text-slate-400 italic font-normal text-[11px]"
                      >
                        Belum ada spareparts hasil kanibal terdaftar saat ini.
                      </td>
                    </tr>
                  ) : (
                    products
                      .filter(
                        (p) =>
                          p.sku.toLowerCase().includes("scrap") ||
                          p.name.toLowerCase().includes("salvaged") ||
                          p.sku.toLowerCase().includes("can-"),
                      )
                      .map((p) => (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50/30 dark:hover:bg-zinc-800/40"
                        >
                          <td className="px-3 py-2.5 font-bold text-slate-800 dark:text-zinc-200 leading-tight">
                            {p.name}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-slate-400 dark:text-zinc-500 text-[10px]">
                            {p.sku}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-400 rounded font-mono text-[9px] font-bold">
                              {p.grade ? p.grade.replace("_", " ") : "B"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-700 dark:text-zinc-300 font-bold">
                            {p.stockQty} Pcs
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">
                            Rp {(p.sellPrice ?? 0).toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {p.stockQty > 0 ? (
                              <button
                                onClick={() => {
                                  setSellingProduct(p);
                                  setSoldPrice(String(p.sellPrice));
                                  setBuyerName("Pelanggan Umum");
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-lg transition-all"
                              >
                                Jual Rongsok
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 dark:text-zinc-500 italic font-normal">
                                Terjual
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Quick Sale Form Overlay */}
            {sellingProduct && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 space-y-3 animate-fadeIn mt-4 text-xs">
                <div className="flex justify-between items-center pb-1 border-b border-emerald-100 dark:border-emerald-900/30">
                  <h5 className="font-extrabold text-emerald-900 dark:text-emerald-400 flex items-center gap-1">
                    <Coins className="w-4 h-4 text-emerald-600" /> Form
                    Penjualan Cepat Barang Bekas / Rongsokan
                  </h5>
                  <button
                    onClick={() => setSellingProduct(null)}
                    className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-100 font-bold font-mono text-xs p-1"
                  >
                    Batal
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-mono text-emerald-800 dark:text-emerald-400 uppercase mb-0.5">
                      Nama Suku Cadang
                    </label>
                    <input
                      type="text"
                      value={sellingProduct.name}
                      disabled
                      className="w-full px-2.5 py-1.5 bg-emerald-100/50 dark:bg-zinc-800 border border-emerald-200 dark:border-zinc-700 rounded-lg text-emerald-900 dark:text-emerald-350 font-semibold cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-emerald-800 dark:text-emerald-400 uppercase mb-0.5">
                      Grade Barang
                    </label>
                    <input
                      type="text"
                      value={
                        sellingProduct.grade
                          ? sellingProduct.grade.replace("_", " ")
                          : "B"
                      }
                      disabled
                      className="w-full px-2.5 py-1.5 bg-emerald-100/50 dark:bg-zinc-800 border border-emerald-200 dark:border-zinc-700 rounded-lg text-emerald-900 dark:text-emerald-350 font-mono cursor-not-allowed text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-emerald-800 dark:text-emerald-400 uppercase mb-0.5">
                      Nama Pembeli (Customer)
                    </label>
                    <input
                      type="text"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="Cth: Pak Slamet Rongsokan"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-950 border border-emerald-200 dark:border-zinc-850 rounded-lg text-slate-800 dark:text-zinc-100 font-semibold outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-emerald-800 dark:text-emerald-400 uppercase mb-0.5">
                      Harga Jual Disepakati (Rp)
                    </label>
                    <input
                      type="number"
                      value={soldPrice}
                      onChange={(e) => setSoldPrice(e.target.value)}
                      placeholder="Cth: 150000"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-950 border border-emerald-200 dark:border-zinc-850 rounded-lg text-slate-800 dark:text-zinc-100 font-bold font-mono outline-none focus:border-accent"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      const cleanBuyerName = buyerName.trim();
                      if (!cleanBuyerName) {
                        showToast("Mohon masukkan nama pembeli!", "error");
                        return;
                      }
                      const amt = Math.max(0, Number(soldPrice) || 0);
                      if (amt <= 0) {
                        showToast(
                          "Mohon masukkan harga jual rongsokan yang valid!",
                          "error",
                        );
                        return;
                      }

                      // Process sale
                      updateInventoryProduct(sellingProduct.id, {
                        stockQty: sellingProduct.stockQty - 1,
                      });

                      addJournalEntry(
                        `SALES-SCRAP-${Date.now().toString(36)}`,
                        `Penjualan Suku Cadang Bekas/Rongsok: ${sellingProduct.name} kepada ${cleanBuyerName}`,
                        [
                          {
                            accountId: `coa-${currentTenantId}-10100`,
                            debit: amt,
                            credit: 0,
                          }, // Kas Terminal
                          {
                            accountId: `coa-${currentTenantId}-40200`,
                            debit: 0,
                            credit: amt,
                          }, // Pendapatan Lainnya
                        ],
                      );

                      addLog(
                        "Sell Scrap Part",
                        `Berhasil menjual sparepart rongsokan ${sellingProduct.name} seharga Rp ${amt.toLocaleString()} kepada ${cleanBuyerName}`,
                        "FINANCE",
                        "LOW",
                      );

                      showToast(
                        `Sukses! Barang bekas/rongsokan "${sellingProduct.name}" berhasil terjual seharga Rp ${amt.toLocaleString()} kepada ${cleanBuyerName}. Dana tercatat masuk kas kasir.`,
                        "success",
                      );
                      setSellingProduct(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-1.5 rounded-lg cursor-pointer transition-all"
                  >
                    Konfirmasi Jual Rongsokan
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Dismantle history trail */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="font-bold text-xs uppercase text-slate-700 dark:text-zinc-200 tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400 dark:text-zinc-500" />{" "}
              Riwayat Audit &amp; Bongkar Kanibalisasi
            </h4>

            <div className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs">
              {harvestLogs.map((log) => (
                <div
                  key={log.id}
                  className="py-3 flex justify-between items-start gap-4"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800 dark:text-zinc-200 leading-tight">
                      {log.donorDevice}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Komponen dipanen:{" "}
                      <span className="font-mono text-accent dark:text-accent font-semibold">
                        {log.partsExtracted.join(", ")}
                      </span>
                    </p>
                    <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono">
                      ID: {log.id} &bull; Oleh: {log.techName} &bull; {log.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                      Rp {(log.totalValue ?? 0).toLocaleString()}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[8.5px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 font-bold px-1.5 py-0.5 rounded-md mt-1">
                      <FileSpreadsheet className="w-3 h-3" /> Ledger Posted
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
