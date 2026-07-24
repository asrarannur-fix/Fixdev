import React, { useState } from "react";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileText,
  Users,
  Package,
  Truck,
  DollarSign,
} from "lucide-react";

type ImportTarget = "CUSTOMERS" | "PRODUCTS" | "SUPPLIERS" | "OPENING_BALANCE";

export const DataImporter: React.FC = () => {
  const {
    currentTenantId = "",
    addCustomer,
    addInventoryProduct,
    addLog,
  } = useSaaS();
  const { showToast } = useToast();

  const [activeTarget, setActiveTarget] = useState<ImportTarget>("PRODUCTS");
  const [csvContent, setCsvContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{
    successCount: number;
    errorCount: number;
    errors: string[];
  } | null>(null);

  // Template generators
  const getTemplateHeader = () => {
    switch (activeTarget) {
      case "PRODUCTS":
        return "name,sku,category,sellPrice,purchaseCost,unit,stockQty\nContoh LCD iPhone 11,SP-001,SPAREPART,450000,300000,PICS,10";
      case "CUSTOMERS":
        return "name,phone,email,address,type\nBudi Santoso,081234567890,budi@example.com,Jl. Merdeka No. 1,RETAIL";
      case "SUPPLIERS":
        return "name,phone,email,address\nPT Sparepart Jaya,0215551234,sales@sparepartjaya.com,Jakarta Central";
      case "OPENING_BALANCE":
        return "accountCode,accountName,debit,credit\n101.01,Kas Toko,5000000,0";
    }
  };

  const handleDownloadTemplate = () => {
    const header = getTemplateHeader();
    const blob = new Blob([header], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `template_import_${activeTarget.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Template CSV berhasil diunduh!", "success");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvContent(text || "");
      setImportResult(null);
      showToast("File CSV berhasil dimuat. Siap diproses.", "info");
    };
    reader.readAsText(file);
  };

  const processImport = () => {
    if (!csvContent.trim()) {
      showToast("Format atau isi CSV kosong. Silakan upload file terlebih dahulu.", "error");
      return;
    }

    setIsProcessing(true);
    const lines = csvContent.split("\n").map((l) => l.trim()).filter(Boolean);
    
    if (lines.length <= 1) {
      showToast("File CSV tidak memiliki baris data (hanya header).", "error");
      setIsProcessing(false);
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim());
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      if (values.length < headers.length) {
        failed++;
        errors.push(`Baris ${i + 1}: Kolom tidak lengkap.`);
        continue;
      }

      try {
        if (activeTarget === "PRODUCTS") {
          const [name, sku, category, sellPrice, purchaseCost, unit, stockQty] = values;
          if (!name || !sellPrice) {
            failed++;
            errors.push(`Baris ${i + 1}: Nama dan harga jual wajib diisi.`);
            continue;
          }

          if (addInventoryProduct) {
            const safeSellPrice = Math.max(0, Number(sellPrice) || 0);
            const safePurchaseCost = Math.max(0, Number(purchaseCost) || 0);
            const safeStockQty = Math.max(0, Number(stockQty) || 0);
            addInventoryProduct({
              tenantId: currentTenantId,
              name: name.trim(),
              sku: (sku || "").trim() || `SKU-${Date.now()}-${i}`,
              barcode: (sku || "").trim() || `SKU-${Date.now()}-${i}`,
              category: (category as any) || "SPAREPART",
              sellPrice: safeSellPrice,
              purchaseCost: safePurchaseCost,
              unit: (unit || "PICS").trim(),
              minStock: 1,
              reorderLevel: 2,
              stockQty: safeStockQty,
              warehouseStock: {},
              grade: "NEW" as any,
              isConsignment: false,
            });
            success++;
          }
        } else if (activeTarget === "CUSTOMERS") {
          const [name, phone, email, address, type] = values;
          if (!name) {
            failed++;
            errors.push(`Baris ${i + 1}: Nama pelanggan wajib diisi.`);
            continue;
          }

          if (addCustomer) {
            addCustomer({
              name: name.trim(),
              phone: (phone || "-").trim(),
              email: (email || "").trim().toLowerCase(),
              address: (address || "").trim(),
              segment: (type as any) || "RETAIL",
              tags: [],
              createdAt: new Date().toISOString(),
            });
            success++;
          }
        } else {
          failed++;
          errors.push(`Baris ${i + 1}: Target ${activeTarget} belum memiliki persistence backend; data tidak disimpan.`);
        }
      } catch (err: any) {
        failed++;
        errors.push(`Baris ${i + 1}: Error - ${err?.message || "Format salah"}`);
      }
    }

    setIsProcessing(false);
    setImportResult({ successCount: success, errorCount: failed, errors });

    if (addLog) {
      addLog(
        "Import Data CSV",
        `Target: ${activeTarget}, Sukses: ${success}, Gagal: ${failed}`,
        "SYSTEM",
      );
    }

    if (success > 0) {
      showToast(`Import selesai: ${success} data berhasil diproses!`, "success");
    } else {
      showToast("Gagal memproses data import.", "error");
    }
  };

  return (
    <div className="space-y-6 dark:text-zinc-300 dark:[&_.bg-white]:bg-zinc-950 dark:[&_.bg-slate-50]:bg-zinc-900 dark:[&_.border-slate-100]:border-zinc-800 dark:[&_.border-slate-200]:border-zinc-800 dark:[&_.text-slate-800]:text-zinc-100 dark:[&_.text-slate-700]:text-zinc-200 dark:[&_.text-slate-600]:text-zinc-300 dark:[&_input]:bg-zinc-950 dark:[&_input]:text-zinc-100 dark:[&_textarea]:bg-zinc-950 dark:[&_textarea]:text-zinc-100 dark:[&_.hover\:bg-slate-100:hover]:bg-zinc-800" id="data-importer-pane">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" /> Pusat Import Data Massal (CSV)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Upload file CSV untuk mengimpor data produk, pelanggan, supplier, atau saldo awal secara sekaligus.
          </p>
        </div>
        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-all border border-slate-200"
        >
          <Download className="w-4 h-4" /> Unduh Template CSV
        </button>
      </div>

      {/* Target Selector Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => { setActiveTarget("PRODUCTS"); setCsvContent(""); setImportResult(null); }}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTarget === "PRODUCTS"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Package className="w-4 h-4" /> Import Produk & Sparepart
        </button>
        <button
          onClick={() => { setActiveTarget("CUSTOMERS"); setCsvContent(""); setImportResult(null); }}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTarget === "CUSTOMERS"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Users className="w-4 h-4" /> Import Database Pelanggan
        </button>
        <button
          onClick={() => { setActiveTarget("SUPPLIERS"); setCsvContent(""); setImportResult(null); }}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTarget === "SUPPLIERS"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Truck className="w-4 h-4" /> Import Vendor / Supplier
        </button>
        <button
          onClick={() => { setActiveTarget("OPENING_BALANCE"); setCsvContent(""); setImportResult(null); }}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTarget === "OPENING_BALANCE"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <DollarSign className="w-4 h-4" /> Import Saldo Awal COA
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload & CSV Input Drawer */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-xs uppercase text-slate-700 tracking-wider">
            1. Unggah atau Tempel Data CSV ({activeTarget})
          </h3>

          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-slate-400 transition-colors">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">Pilih File CSV dari Komputer</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Format file .csv (UTF-8) dengan separator koma (,)</p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="mt-3 block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Atau Tempel Teks CSV Langsung</label>
            <textarea
              rows={6}
              placeholder={getTemplateHeader()}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              className="w-full p-3 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <button
            onClick={processImport}
            disabled={isProcessing || !csvContent.trim()}
            className="w-full py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <span>Memproses Data...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Proses & Eksekusi Import
              </>
            )}
          </button>
        </div>

        {/* Import Results & Audit Drawer */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-xs uppercase text-slate-700 tracking-wider">
            2. Hasil Verifikasi & Eksekusi
          </h3>

          {!importResult ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              Belum ada proses import yang dijalankan. Pilih target dan upload file CSV di sebelah kiri.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Berhasil</span>
                  <div className="text-xl font-black text-emerald-700 font-mono mt-1">
                    {importResult.successCount} Baris
                  </div>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg">
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Gagal / Warning</span>
                  <div className="text-xl font-black text-rose-700 font-mono mt-1">
                    {importResult.errorCount} Baris
                  </div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Rincian Error Format</p>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg max-h-40 overflow-y-auto font-mono text-[10px] text-rose-600 space-y-1">
                    {importResult.errors.map((err, idx) => (
                      <div key={idx}>• {err}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
