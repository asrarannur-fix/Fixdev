import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import { usePrintConfig } from "../hooks/usePrintConfig";
import { printFrame } from "../utils/printJob";
import {
  getPrintFontSizePx,
  getPrintHeaderHtml,
  getPrintFooterHtml,
  getPrintTermsHtml,
} from "../utils/print";
import {
  Search,
  Map,
  Layers,
  Cpu,
  AlertCircle,
  PlusCircle,
  MinusCircle,
  CheckCircle,
  HelpCircle,
  Hash,
  Tag,
  TrendingUp,
  ShoppingCart,
  Printer,
  Check,
  Calendar,
  Sparkles,
  RefreshCw,
  Clock,
  UserCheck,
  Info,
} from "lucide-react";

interface MicroComponent {
  id: string;
  name: string;
  sku: string;
  category:
    "IC" | "KAPASITOR" | "RESISTOR" | "SEKRING" | "FLEXIBLE" | "KONEKTOR";
  rackId: string; // e.g. Rak Utama
  drawerId: string; // e.g. Laci A-12
  stockQty: number;
  minStock: number;
  compatModels: string[]; // Laptop models compatible
  price: number;
  // Added properties for predictive stock analytics
  avgWeeklyConsumption?: number; // average units consumed per week
  leadTimeDays?: number; // days supplier takes to deliver
  supplierName?: string;
}

export const SmallPartsSearch: React.FC = () => {
  const { addLog, microComponents, microComponentsLoading, microComponentsError, loadMicroComponents, createMicroComponent, consumeMicroComponentForService, scopedServices, scopedWarehouses, currentBranchId, currentTenantId, tenants } = useSaaS();
  const { showToast } = useToast();
  const printConfig = usePrintConfig();
  const activeTenant = tenants.find((tenant) => tenant.id === currentTenantId);
  const businessName = activeTenant?.name || "Sistem Inventaris";
  const logoUrl = activeTenant?.branding?.logoUrl;

  // Backend is the source of truth; map shared pricing fields to this screen's view model.
  const components = useMemo<MicroComponent[]>(() => microComponents.map((item) => ({
    id: item.id, name: item.name, sku: item.sku, category: item.category as MicroComponent["category"],
    rackId: item.rackId, drawerId: item.drawerId, stockQty: item.stockQty,
    minStock: item.minStock, compatModels: item.compatModels, price: item.sellPrice,
    avgWeeklyConsumption: item.avgWeeklyConsumption, leadTimeDays: item.leadTimeDays,
    supplierName: item.supplierName,
  })), [microComponents]);

  useEffect(() => { loadMicroComponents().catch(() => {}); }, []);

  // Tab state: "search" | "predictive"
  const [activeSubTab, setActiveSubTab] = useState<"search" | "predictive">(
    "search",
  );

  // Form states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Selected component for details and locator highlights
  const [selectedCompId, setSelectedCompId] = useState<string>("mc-01");

  // New component states
  const [newName, setNewName] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newCat, setNewCat] = useState<MicroComponent["category"]>("IC");
  const [newRack, setNewRack] = useState("RACK-BLUE-1");
  const [newDrawer, setNewDrawer] = useState("Laci A-01");
  const [newStock, setNewStock] = useState("10");
  const [newMinStock, setNewMinStock] = useState("5");
  const [newCompat, setNewCompat] = useState("");
  const [newPrice, setNewPrice] = useState("15000");
  const [newAvgConsumption, setNewAvgConsumption] = useState("2.5");
  const [newLeadTime, setNewLeadTime] = useState("4");
  const [newSupplier, setNewSupplier] = useState("Sinar Jaya Spareparts");

  const [showAddForm, setShowAddForm] = useState(false);
  const [targetTicket, setTargetTicket] = useState("");

  // Reorder PO modal state
  const [selectedPoComp, setSelectedPoComp] = useState<MicroComponent | null>(
    null,
  );
  const [poQuantity, setPoQuantity] = useState(50);
  const [poSuccess, setPoSuccess] = useState(false);
  const [poPrinterFormat, setPoPrinterFormat] = useState<"58" | "80">("80");

  const stablePoNo = useMemo(() => {
    if (!selectedPoComp) return "";
    const nameSeed = (selectedPoComp.name || "").length + (selectedPoComp.sku || "").length;
    return `PO-COMP-${(1000 + (nameSeed % 9000))}`;
  }, [selectedPoComp]);

  const handlePrintPurchaseOrder = () => {
    if (!selectedPoComp) return;

    let printIframe = document.getElementById(
      "hidden-print-iframe",
    ) as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement("iframe");
      printIframe.id = "hidden-print-iframe";
      printIframe.style.position = "fixed";
      printIframe.style.width = "0";
      printIframe.style.height = "0";
      printIframe.style.border = "none";
      printIframe.style.opacity = "0";
      document.body.appendChild(printIframe);
    }
    const printDoc =
      printIframe.contentWindow?.document || printIframe.contentDocument;
    if (!printDoc) {
      showToast("Gagal menginisialisasi modul pencetakan.", "error");
      return;
    }

    const poNo = stablePoNo;
    const supplier = selectedPoComp.supplierName || "Supplier Mitra Resmi";
    const today = new Date().toISOString().split("T")[0];
    const unitPrice = selectedPoComp.price * 0.75;
    const estTotal = unitPrice * poQuantity;
    const paperSize =
      printConfig?.paperSize ||
      (poPrinterFormat === "80" ? "thermal_80" : "thermal_58");
    const is80 = paperSize !== "thermal_58";
    const widthStyle = is80 ? "76mm" : "54mm";
    const fontSizePx = getPrintFontSizePx(printConfig);
    const headerHtml = getPrintHeaderHtml(printConfig, {
      businessName,
      subtitle: "SISTEM PREDIKTIF REORDER PO",
      logoUrl,
    });
    const footerHtml = getPrintFooterHtml(
      printConfig,
      "Generated automatically via AI Predictive Stock System",
    );
    const termsHtml = getPrintTermsHtml(printConfig, "general");

    printDoc.open();
    printDoc.write(`
      <html>
        <head>
          <title>PO - \${poNo}</title>
          <style>
            @page {
              size: auto;
              margin: 0mm;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: \${widthStyle};
              margin: 0 auto;
              padding: 10px;
              color: #000;
              background: #fff;
              font-size: \${fontSizePx}px;
              line-height: 1.2;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .header {
              border-bottom: 1px dashed #000;
              padding-bottom: 8px;
              margin-bottom: 8px;
              text-align: center;
            }
            .header h2 {
              margin: 0 0 4px 0;
              font-size: \${is80 ? "14px" : "12px"};
              letter-spacing: 1px;
            }
            .header p { margin: 2px 0; }
            .meta-table {
              width: 100%;
              margin-bottom: 8px;
            }
            .meta-table td {
              padding: 1px 0;
              vertical-align: top;
            }
            .item-table {
              width: 100%;
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 4px 0;
              margin: 8px 0;
            }
            .item-table th {
              text-align: left;
              border-bottom: 1px dotted #000;
              padding-bottom: 4px;
            }
            .total-section {
              border-top: 1px dotted #000;
              padding-top: 4px;
              margin-top: 4px;
            }
            .footer {
              margin-top: 15px;
              font-size: \${is80 ? "9px" : "8px"};
              color: #555;
              border-top: 1px dashed #000;
              padding-top: 8px;
              text-align: center;
            }
          </style>
        </head>
        <body>
           ${headerHtml}
           
          <table class="meta-table">
            <tr>
              <td class="bold">PO No:</td>
              <td class="text-right">\${poNo}</td>
            </tr>
            <tr>
              <td class="bold">Supplier:</td>
              <td class="text-right">\${supplier}</td>
            </tr>
            <tr>
              <td class="bold">Tanggal:</td>
              <td class="text-right">\${today}</td>
            </tr>
            <tr>
              <td class="bold">Status:</td>
              <td class="text-right font-bold">TERKIRIM (AUTO)</td>
            </tr>
          </table>

          <table class="item-table">
            <thead>
              <tr>
                <th class="bold">Deskripsi Barang</th>
                <th class="text-right bold">Qty</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  \${selectedPoComp.name}<br/>
                  <span style="font-size: 8px; color: #444;">SKU: \${selectedPoComp.sku}</span>
                </td>
                <td class="text-right" style="vertical-align: top;">\${poQuantity} Pcs</td>
              </tr>
              <tr>
                <td style="font-size: 8px; padding-top: 4px; color: #333;">Harga Satuan (Est):</td>
                <td class="text-right" style="font-size: 8px; padding-top: 4px;">Rp \${unitPrice.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div class="total-section">
            <div style="display: flex; justify-content: space-between;" class="bold">
              <span>ESTIMASI TOTAL:</span>
              <span>Rp \${estTotal.toLocaleString()}</span>
            </div>
          </div>

          ${footerHtml}
          ${termsHtml}

          <script>
            window.onload = function() {
              window.focus();
            };
          </script>
        </body>
      </html>
    `);
    printDoc.close();

    setTimeout(() => {
      const pIframe = document.getElementById(
        "hidden-print-iframe",
      ) as HTMLIFrameElement;
      if (pIframe && pIframe.contentWindow) {
        printFrame(pIframe, printConfig, "Purchase Order");
        addLog(
          "Print Purchase Order",
          `Mencetak dokumen Purchase Order \${poNo} ke printer thermal \${poPrinterFormat}mm.`,
          "INVENTORY",
          "LOW",
        );
      }
    }, 500);
  };

  const selectedComponent =
    components.find((c) => c.id === selectedCompId) || components[0];

  // Filters
  const filteredComponents = useMemo(() => {
    return components.filter((c) => {
      const matchQuery =
        searchQuery.trim() === "" ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.compatModels.some((model) =>
          model.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      const matchCat =
        selectedCategory === "ALL" || c.category === selectedCategory;
      return matchQuery && matchCat;
    });
  }, [components, searchQuery, selectedCategory]);

  // Handle Consume (Pakai Komponen)
  const handleConsume = async (id: string) => {
    const comp = components.find((c) => c.id === id);
    const ticket = scopedServices.find((item) => item.id === targetTicket);
    if (!comp || !ticket) {
      showToast("Pilih tiket servis aktif terlebih dahulu.", "error");
      return;
    }
    if (comp.stockQty <= 0) {
      showToast("Stok komponen kosong. Gunakan alur Menunggu Spare Part pada tiket servis.", "error");
      return;
    }
    try {
      const result = await consumeMicroComponentForService(id, { ticketId: ticket.id, quantity: 1, chargeable: true, unitPrice: comp.price, idempotencyKey: `micro-${ticket.id}-${id}-${Date.now()}` });
      addLog("Consume Micro Component", `Menggunakan 1 unit ${comp.name} untuk tiket ${ticket.ticketNo}`, "INVENTORY", "LOW");
      showToast(`1 unit ${comp.name} tercatat pada ${ticket.ticketNo}. Stok tersisa ${result.component.stockQty}.`, "success");
      setTargetTicket("");
    } catch (error: any) {
      showToast(error?.message || "Gagal mencatat pemakaian komponen.", "error");
    }
  };

  // Handle Add New Component
  const handleAddComponent = async () => {
    const cleanName = newName.trim();
    const cleanSku = newSku.trim().toUpperCase();
    const cleanRack = newRack.trim().toUpperCase();
    const cleanDrawer = newDrawer.trim();
    if (!cleanName || !cleanSku || !cleanDrawer) {
      showToast("Mohon isi nama, SKU, dan alamat laci penyimpanan!", "error");
      return;
    }
    const safeStock = Math.max(0, Number(newStock) || 0);
    const safeMinStock = Math.max(0, Number(newMinStock) || 0);
    const safePrice = Math.max(0, Number(newPrice) || 0);
    const safeAvgConsumption = Math.max(0, Number(newAvgConsumption) || 0);
    const safeLeadTime = Math.max(0, Math.floor(Number(newLeadTime) || 0));

    const warehouseId = scopedWarehouses.find((warehouse) => warehouse.branchId === currentBranchId)?.id || scopedWarehouses[0]?.id;
    if (!warehouseId) {
      showToast("Buat atau pilih gudang terlebih dahulu sebelum mendaftarkan komponen.", "error");
      return;
    }
    try {
      await createMicroComponent({
        warehouseId, name: cleanName, sku: cleanSku, category: newCat,
        rackId: cleanRack, drawerId: cleanDrawer, stockQty: safeStock, minStock: safeMinStock,
        compatModels: newCompat ? newCompat.split(",").map((s) => s.trim()).filter(Boolean) : ["Universal"],
        purchaseCost: safePrice * 0.75, sellPrice: safePrice, avgWeeklyConsumption: safeAvgConsumption,
        leadTimeDays: safeLeadTime, supplierName: newSupplier.trim() || "Sinar Jaya Spareparts",
      });
    } catch (error: any) {
      showToast(error?.message || "Gagal menambahkan komponen.", "error");
      return;
    }
    addLog(
      "Add Micro Component",
      `Menambahkan komponen mikro baru ${cleanName} ke ${cleanDrawer} (${cleanRack})`,
      "INVENTORY",
      "LOW",
    );

    showToast(
      `Sukses! Komponen baru "${cleanName}" didaftarkan di laci ${cleanDrawer}.`,
      "success",
    );

    // Reset Form
    setNewName("");
    setNewSku("");
    setNewDrawer("Laci A-01");
    setNewStock("10");
    setNewCompat("");
    setShowAddForm(false);
  };

  // Trigger Purchase Order generator modal
  const triggerAutoPO = (comp: MicroComponent) => {
    // Recommend quantity to reorder: 3x average weekly minus current stock, rounded nicely
    const avg = comp.avgWeeklyConsumption || 3.0;
    const recommendQty = Math.max(20, Math.ceil(avg * 8) - comp.stockQty);
    setPoQuantity(recommendQty);
    setSelectedPoComp(comp);
    setPoSuccess(false);
  };

  // Save/Generate Mock PO
  const handleGeneratePo = () => {
    if (!selectedPoComp) return;
    setPoSuccess(true);

    addLog(
      "Generate Purchase Order",
      `[Predictive stock] Membuat draf PO Suku Cadang ke ${selectedPoComp.supplierName} untuk ${poQuantity} pcs ${selectedPoComp.name}. Estimasi biaya: Rp ${(selectedPoComp.price * 0.75 * poQuantity).toLocaleString()}`,
      "INVENTORY",
      "MEDIUM",
    );

    // PO ini masih berupa draf; stok hanya berubah setelah penerimaan barang dicatat.
    handlePrintPurchaseOrder();
  };

  return (
    <div
      className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden animate-fadeIn"
      id="small-parts-search"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-sm text-amber-950 dark:text-amber-200 uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-500" /> Suku Cadang Mikro &amp;
            Pengelolaan Inventaris
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Sistem laci drawer presisi untuk komponen IC, Kapasitor SMD,
            konektor, serta analitik prediksi pengisian stok.
          </p>
        </div>

        <div className="flex gap-2.5 items-center">
          {/* Sub-tab selection switcher */}
          <div className="flex bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-xl text-[11px] font-black border border-slate-200/50 dark:border-zinc-700/50">
            <button
              onClick={() => {
                setActiveSubTab("search");
                setSelectedCompId(components[0]?.id || "");
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeSubTab === "search"
                  ? "bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Cari &amp; Lokasi Laci
            </button>
            <button
              onClick={() => setActiveSubTab("predictive")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                activeSubTab === "predictive"
                  ? "bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" /> Prediksi
              Reorder Stok
            </button>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-4 py-2 rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5 self-start md:self-auto"
          >
            <PlusCircle className="w-4 h-4" />{" "}
            {showAddForm ? "Tutup Form" : "Daftarkan Komponen"}
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="p-6 bg-amber-50/40 dark:bg-amber-950/10 border-b border-slate-100 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-3 gap-5 text-xs animate-fadeIn">
          <div className="space-y-3">
            <p className="font-bold text-amber-900 dark:text-amber-400 border-b border-amber-200/60 dark:border-amber-900/30 pb-1 uppercase tracking-wider">
              Informasi Dasar
            </p>
            <div>
              <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-0.5">
                Nama Komponen
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Cth: IC Backlight LP8550"
                className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg dark:text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-0.5">
                SKU / Kode Part
              </label>
              <input
                type="text"
                value={newSku}
                onChange={(e) => setNewSku(e.target.value)}
                placeholder="Cth: IC-LP8550-SMD"
                className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg dark:text-white outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-0.5">
                  Kategori
                </label>
                <select
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value as any)}
                  className="w-full px-2 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg dark:text-white outline-none"
                >
                  <option value="IC">IC</option>
                  <option value="KAPASITOR">Kapasitor</option>
                  <option value="RESISTOR">Resistor</option>
                  <option value="SEKRING">Sekring</option>
                  <option value="FLEXIBLE">Flexible</option>
                  <option value="KONEKTOR">Konektor</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-0.5">
                  Pilih Supplier
                </label>
                <input
                  type="text"
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  placeholder="Sinar Jaya Spareparts"
                  className="w-full px-2 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg dark:text-white outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 1: Cari & Lokasi Laci */}
      {activeSubTab === "search" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 xl:divide-x divide-slate-100 dark:divide-zinc-800">
          {/* Left Search & List Area (7 Cols) */}
          <div className="xl:col-span-7 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Ketik nama IC, seri laptop (Asus, Lenovo, Macbook), SKU, atau Laci..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl outline-none focus:border-amber-500 text-xs font-semibold text-slate-800 dark:text-zinc-100"
                />
              </div>

              {/* Category selection chips */}
              <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 shrink-0">
                {[
                  "ALL",
                  "IC",
                  "KAPASITOR",
                  "RESISTOR",
                  "SEKRING",
                  "FLEXIBLE",
                  "KONEKTOR",
                ].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-extrabold uppercase font-mono border tracking-wider transition cursor-pointer shrink-0 ${
                      selectedCategory === cat
                        ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-900/40 ring-1 ring-amber-100"
                        : "bg-white dark:bg-zinc-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Components table */}
            <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-zinc-950 border-b border-slate-100 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 font-mono text-[9px] uppercase">
                      <th className="px-3 py-2.5">Nama Suku Cadang Kecil</th>
                      <th className="px-3 py-2.5">Lokasi Penyimpanan</th>
                      <th className="px-3 py-2.5 text-center">Stok</th>
                      <th className="px-3 py-2.5 text-right">Harga Part</th>
                      <th className="px-3 py-2.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                    {microComponentsLoading && components.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-12 text-slate-500"><RefreshCw className="w-5 h-5 animate-spin text-amber-500 mx-auto mb-2" />Memuat inventaris komponen...</td></tr>
                    ) : microComponentsError && components.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-10"><AlertCircle className="w-5 h-5 text-rose-500 mx-auto mb-2" /><p className="text-rose-600 not-italic">{microComponentsError}</p><button onClick={() => loadMicroComponents().catch(() => {})} className="mt-2 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-[10px] font-bold">Coba Lagi</button></td></tr>
                    ) : filteredComponents.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center py-10 text-slate-400"
                        >
                          <Cpu className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                          <p className="font-bold text-slate-600">{components.length === 0 ? "Belum ada komponen mikro" : "Komponen tidak ditemukan"}</p>
                          <p className="text-[10px] mt-1">{components.length === 0 ? "Klik Daftarkan Komponen untuk mengisi stok pertama." : "Ubah kata pencarian atau kategori."}</p>
                          {components.length === 0 && <button onClick={() => setShowAddForm(true)} className="mt-3 px-3 py-2 bg-amber-600 text-white rounded-lg text-[10px] font-bold"><PlusCircle className="w-3.5 h-3.5 inline mr-1" /> Daftarkan Komponen</button>}
                        </td>
                      </tr>
                    ) : (
                      filteredComponents.map((c) => (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedCompId(c.id)}
                          className={`hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 cursor-pointer transition ${
                            selectedCompId === c.id
                              ? "bg-amber-50/30 dark:bg-amber-950/20"
                              : ""
                          }`}
                        >
                          <td className="px-3 py-3">
                            <div className="flex items-start gap-2">
                              <span className="px-1.5 py-0.5 rounded text-[8.5px] bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-mono font-bold mt-0.5 shrink-0">
                                {c.category}
                              </span>
                              <div>
                                <p className="font-extrabold text-slate-800 dark:text-zinc-200 leading-tight">
                                  {c.name}
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono mt-0.5 leading-none">
                                  {c.sku}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 font-mono text-[10px]">
                            <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-400 font-bold">
                              <Map className="w-3.5 h-3.5 text-amber-500" />{" "}
                              {c.drawerId}
                            </div>
                            <p className="text-[9px] text-slate-400 dark:text-zinc-500 leading-none mt-0.5">
                              {c.rackId}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                                c.stockQty <= c.minStock
                                  ? "bg-rose-100 dark:bg-rose-950/30 text-rose-800 dark:text-rose-400 font-extrabold"
                                  : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                              }`}
                            >
                              {c.stockQty} Pcs
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-mono font-bold text-slate-700 dark:text-zinc-300">
                            Rp {c.price.toLocaleString()}
                          </td>
                          <td
                            className="px-3 py-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setSelectedCompId(c.id);
                                  handleConsume(c.id);
                                }}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] px-2.5 py-1 rounded transition-all cursor-pointer"
                              >
                                Pakai Part
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Grid Locator Visualizer (5 Cols) */}
          <div className="xl:col-span-5 p-5 space-y-4 bg-slate-50/30 dark:bg-zinc-950/20">
            <div className="border-b border-slate-100 dark:border-zinc-800 pb-2">
              <h4 className="font-bold text-xs uppercase text-slate-700 dark:text-zinc-200 tracking-wider flex items-center gap-1.5">
                <Map className="w-4 h-4 text-amber-500" /> Visualisasi Laci
                &amp; Detail Locator
              </h4>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                Sistem visual penunjuk posisi laci organizer yang menyala
                berdasarkan part terpilih.
              </p>
            </div>

            {selectedComponent ? (
              <div className="space-y-4 animate-fadeIn">
                {/* Card Detail Component */}
                <div className="bg-white dark:bg-zinc-950 border border-amber-100 dark:border-amber-900/40 rounded-2xl p-4 shadow-sm space-y-3 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-extrabold text-slate-800 dark:text-zinc-100 text-xs leading-snug">
                        {selectedComponent.name}
                      </h5>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono mt-0.5 font-bold uppercase">
                        {selectedComponent.sku}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 font-mono text-[9px] font-black uppercase tracking-wide">
                      {selectedComponent.category}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                    <div className="bg-slate-50 dark:bg-zinc-900 p-2 rounded-xl">
                      <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono block uppercase">
                        Rak Penyimpanan
                      </span>
                      <strong className="text-slate-700 dark:text-zinc-300 font-mono font-bold block mt-0.5">
                        {selectedComponent.rackId}
                      </strong>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/20 p-2 rounded-xl border border-amber-100/50 dark:border-amber-900/30">
                      <span className="text-[9px] text-amber-600 dark:text-amber-400 font-mono block uppercase">
                        Alamat Laci
                      </span>
                      <strong className="text-amber-950 dark:text-amber-200 font-bold block mt-0.5">
                        {selectedComponent.drawerId}
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono block uppercase">
                      Kompatibilitas Laptop/Model
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {selectedComponent.compatModels.map((m, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 border border-slate-200/50 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 rounded text-[9.5px] font-semibold"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-zinc-800 pt-3 flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-[9px] font-mono text-slate-400 dark:text-zinc-500 uppercase mb-0.5">
                        Pilih Tiket Servis Aktif
                      </label>
                      <select
                        value={targetTicket}
                        onChange={(e) => setTargetTicket(e.target.value)}
                        className="w-full px-2.5 py-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-900 focus:border-amber-500 text-slate-800 dark:text-zinc-100 rounded text-[10.5px] outline-none"
                      >
                        <option value="">-- Pilih tiket --</option>
                        {scopedServices.filter((ticket) => ["DIAGNOSA", "SEDANG_DIKERJAKAN", "REWORK"].includes(ticket.status)).map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.ticketNo} · {ticket.deviceName}</option>)}
                      </select>
                    </div>
                    <button
                      onClick={() => handleConsume(selectedComponent.id)}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-4 py-1.5 rounded-lg h-9 self-end cursor-pointer transition shadow-xs"
                    >
                      Pakai Part
                    </button>
                  </div>
                </div>

                {/* Graphical Organizer Cabinet Map */}
                <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3 text-xs">
                  <div>
                    <p className="font-extrabold text-slate-700 dark:text-zinc-200 flex items-center gap-1 text-[11px]">
                      <Layers className="w-3.5 h-3.5 text-slate-400" /> Cabinet
                      Organizer Map: {selectedComponent.rackId}
                    </p>
                    <p className="text-[9px] text-slate-400 dark:text-zinc-500">
                      Kotak oranye menyala menunjukkan posisi drawer laci
                      penyimpanan dari komponen mikro yang Anda pilih.
                    </p>
                  </div>

                  {/* Cabinet grid visualization */}
                  <div className="grid grid-cols-4 gap-2 p-2 bg-slate-900 rounded-2xl border border-slate-800">
                    {Array.from({ length: 16 }).map((_, idx) => {
                      const rowLetter = ["A", "B", "C", "D", "E"][
                        Math.floor(idx / 4)
                      ];
                      const colNum = (idx % 4) + 1;
                      const drawerName = `Laci ${rowLetter}-0${colNum}`;
                      const isSelected =
                        selectedComponent.drawerId.includes(drawerName);

                      return (
                        <div
                          key={idx}
                          className={`h-11 rounded-lg border flex flex-col items-center justify-center transition-all ${
                            isSelected
                              ? "bg-amber-500 border-amber-300 text-white shadow-[0_0_12px_rgba(245,158,11,0.6)] scale-[1.04]"
                              : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                          }`}
                        >
                          <span
                            className={`text-[8px] font-mono font-bold block ${isSelected ? "text-amber-100" : "text-slate-500"}`}
                          >
                            {rowLetter}-{colNum}
                          </span>
                          <span
                            className={`text-[9px] font-extrabold font-mono mt-0.5 ${isSelected ? "text-white" : "text-slate-300"}`}
                          >
                            {isSelected ? "AKTIF" : "EMPTY"}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-amber-500 inline-block" />{" "}
                      Posisi Terpilih
                    </span>
                    <span>Rack ID: {selectedComponent.rackId}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center py-10 italic text-slate-400">
                Pilih komponen di tabel sebelah kiri untuk mendeteksi koordinat
                laci drawer penyimpanannya.
              </p>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: AI Predictive Reorder Dashboard */}
      {activeSubTab === "predictive" && (
        <div className="p-5 space-y-5 animate-fadeIn">
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
            <div className="space-y-1">
              <h4 className="font-extrabold text-amber-900 dark:text-amber-400 flex items-center gap-1.5 uppercase font-mono text-[11px] tracking-wide">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />{" "}
                Algoritma Prediksi Pengisian Ulang Stok Otomatis
              </h4>
              <p className="text-amber-800 dark:text-amber-500 leading-relaxed text-[11px]">
                Sistem menghitung <strong>RTO (Reorder Point)</strong> &amp;{" "}
                <strong>Days Out of Stock</strong> secara dinamis berdasarkan{" "}
                <code>Stok Saat Ini / Konsumsi Mingguan x 7 Hari</code>.
                Pembelian disarankan otomatis sebelum kritis.
              </p>
            </div>

            <div className="flex gap-2 shrink-0 bg-white/70 dark:bg-zinc-900 p-2.5 rounded-xl border border-amber-100 dark:border-zinc-800">
              <div className="text-center px-2 border-r border-slate-200 dark:border-zinc-900">
                <p className="text-[9px] text-slate-400 uppercase font-mono">
                  Critical Items
                </p>
                <strong className="text-rose-600 dark:text-rose-400 text-sm font-black">
                  {
                    components.filter((c) => c.stockQty <= (c.minStock || 5))
                      .length
                  }{" "}
                  Parts
                </strong>
              </div>
              <div className="text-center px-2">
                <p className="text-[9px] text-slate-400 uppercase font-mono">
                  Safety stock limit
                </p>
                <strong className="text-slate-700 dark:text-zinc-200 text-sm font-black">
                  7 Days
                </strong>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-950 border-b border-slate-100 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 font-mono text-[9px] uppercase">
                    <th className="px-4 py-3">Suku Cadang Mikro</th>
                    <th className="px-4 py-3">Supplier Terdaftar</th>
                    <th className="px-4 py-3 text-center">Stok Saat Ini</th>
                    <th className="px-4 py-3 text-center">
                      Avg Konsumsi/Minggu
                    </th>
                    <th className="px-4 py-3 text-center">
                      Estimasi Sisa Hari
                    </th>
                    <th className="px-4 py-3 text-center">
                      Reorder Point (RTO)
                    </th>
                    <th className="px-4 py-3 text-center">Status Cerdas</th>
                    <th className="px-4 py-3 text-center">Tindakan PO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                  {components.map((c) => {
                    const avgWeekly = c.avgWeeklyConsumption || 2.5;
                    const daysRemaining = Math.max(
                      0,
                      parseFloat(((c.stockQty / avgWeekly) * 7).toFixed(1)),
                    );
                    const isCritical =
                      daysRemaining <= 7 || c.stockQty <= c.minStock;
                    const isWarning = daysRemaining > 7 && daysRemaining <= 15;

                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-50/40 dark:hover:bg-zinc-900/40 transition"
                      >
                        <td className="px-4 py-3.5">
                          <p className="font-extrabold text-slate-800 dark:text-zinc-100">
                            {c.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {c.sku} • {c.category}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 dark:text-zinc-400 font-bold">
                          {c.supplierName || "Sinar Jaya Spareparts"}
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono font-bold">
                          <span
                            className={`px-2 py-0.5 rounded ${
                              c.stockQty <= c.minStock
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400"
                                : "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300"
                            }`}
                          >
                            {c.stockQty} Pcs
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono text-slate-600 dark:text-zinc-400">
                          {avgWeekly} pcs / mgg
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono">
                          <strong
                            className={
                              isCritical
                                ? "text-rose-600"
                                : isWarning
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                            }
                          >
                            {daysRemaining} Hari Lagi
                          </strong>
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono text-slate-500 dark:text-zinc-400">
                          {c.minStock} Pcs
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {isCritical ? (
                            <span className="px-2 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black uppercase rounded-lg dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-400 flex items-center gap-1 justify-center max-w-[130px] mx-auto animate-pulse">
                              🚨 REORDER NOW
                            </span>
                          ) : isWarning ? (
                            <span className="px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase rounded-lg dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-400 flex items-center gap-1 justify-center max-w-[130px] mx-auto">
                              ⚠️ STOK MENIPIZ
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase rounded-lg dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400 flex items-center gap-1 justify-center max-w-[130px] mx-auto">
                              ✅ AMAN
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => triggerAutoPO(c)}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 mx-auto cursor-pointer transition shadow-xs"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" /> Auto PO
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* AUTO PURCHASE ORDER (PO) GENERATOR MODAL */}
      {selectedPoComp && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-900 shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="bg-slate-50 dark:bg-zinc-950 p-5 border-b border-slate-100 dark:border-zinc-900 flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-zinc-100 flex items-center gap-1.5 uppercase font-mono tracking-wide">
                  <ShoppingCart className="w-4 h-4 text-amber-500" /> Draf
                  Purchase Order Suku Cadang
                </h4>
                <p className="text-[10px] text-slate-400">
                  Reorder otomatis berbasis rata-rata konsumsi.
                </p>
              </div>
              <button
                onClick={() => setSelectedPoComp(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-300 dark:hover:bg-zinc-700 text-base"
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4">
              {poSuccess ? (
                <div className="text-center py-6 space-y-3 animate-scaleUp">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <h5 className="font-black text-slate-800 dark:text-slate-100 text-sm">
                    PO Berhasil Dikirim ke Supplier!
                  </h5>
                  <p className="text-[11px] text-slate-400 leading-relaxed px-4">
                    Pesanan Suku Cadang telah dikonfirmasi dan draf email PO
                    otomatis dikirim ke{" "}
                    <strong>{selectedPoComp.supplierName}</strong>. Stok akan
                    masuk secara otomatis setelah diverifikasi.
                  </p>

                  {/* Thermal order ticket display */}
                  <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-800/60 p-4.5 rounded-xl font-mono text-[9.5px] text-slate-700 dark:text-slate-300 max-w-xs mx-auto text-left space-y-2 leading-tight">
                    <div className="text-center border-b border-dashed border-slate-300 dark:border-zinc-800 pb-2">
                      <p className="font-extrabold uppercase">
                        {businessName} - PO SYSTEM
                      </p>
                      <p className="text-[8px] text-slate-400">
                        Pemesanan Suku Cadang Mikro
                      </p>
                    </div>

                    <div>
                      <p>
                        <strong>PO No:</strong> {stablePoNo}
                      </p>
                      <p>
                        <strong>Supplier:</strong> {selectedPoComp.supplierName}
                      </p>
                      <p>
                        <strong>Tanggal:</strong> 2026-07-02
                      </p>
                    </div>

                    <div className="border-t border-b border-dashed border-slate-300 dark:border-zinc-800 py-2 my-2 space-y-1">
                      <div className="flex justify-between font-bold">
                        <span>{selectedPoComp.name}</span>
                        <span>x{poQuantity} Pcs</span>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[8.5px]">
                        <span>Price/Pcs:</span>
                        <span>
                          Rp {(selectedPoComp.price * 0.75).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between font-extrabold text-xs">
                      <span>EST. TOTAL:</span>
                      <span>
                        Rp{" "}
                        {(
                          selectedPoComp.price *
                          0.75 *
                          poQuantity
                        ).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-center text-[7.5px] text-slate-400 pt-2 border-t border-dashed border-slate-300 dark:border-zinc-800 leading-none">
                      * Generated automatically via AI Predictive Stock System
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handlePrintPurchaseOrder}
                      className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold rounded-lg flex items-center justify-center gap-1.5 text-xs"
                    >
                      <Printer className="w-4 h-4" /> Cetak PO (
                      {poPrinterFormat}mm)
                    </button>
                    <select
                      value={poPrinterFormat}
                      onChange={(e) =>
                        setPoPrinterFormat(e.target.value as any)
                      }
                      className="bg-slate-100 border text-xs px-2.5 font-bold rounded-lg border-slate-200"
                    >
                      <option value="80">80mm</option>
                      <option value="58">58mm</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-xs animate-fadeIn">
                  <div className="bg-slate-50 dark:bg-zinc-950 p-3 rounded-xl border border-slate-100 dark:border-zinc-900/60 flex gap-2.5">
                    <Info className="w-4.5 h-4.5 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-slate-800 dark:text-zinc-200">
                        {selectedPoComp.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Current Stock: {selectedPoComp.stockQty} Pcs | RTO:{" "}
                        {selectedPoComp.minStock} Pcs
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase mb-1">
                        Pilih Supplier Pembelian
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={
                          selectedPoComp.supplierName || "Sinar Jaya Spareparts"
                        }
                        className="w-full px-2.5 py-2 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-lg outline-none font-bold text-slate-700 dark:text-zinc-300"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase mb-1">
                          Jumlah Pemesanan (Pcs)
                        </label>
                        <input
                          type="number"
                          required
                          value={poQuantity}
                          onChange={(e) =>
                            setPoQuantity(
                              Math.max(1, parseInt(e.target.value) || 0),
                            )
                          }
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-amber-500 rounded-lg outline-none font-bold font-mono text-amber-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase mb-1">
                          Estimasi Harga Diskon (Rp)
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={`Rp ${(selectedPoComp.price * 0.75).toLocaleString()}`}
                          className="w-full px-2.5 py-1.5 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-lg outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-indigo-500/10 rounded-xl space-y-1 border border-accent/20 text-[10.5px]">
                      <div className="flex justify-between text-slate-400">
                        <span>Original Price:</span>
                        <span>
                          Rp{" "}
                          {(selectedPoComp.price * poQuantity).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Volume Discount (25%):</span>
                        <span className="text-emerald-500">
                          - Rp{" "}
                          {(
                            selectedPoComp.price *
                            0.25 *
                            poQuantity
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between font-extrabold text-slate-800 dark:text-zinc-200 border-t border-slate-200/50 dark:border-zinc-800 pt-1 mt-1">
                        <span>Total Nilai PO:</span>
                        <span>
                          Rp{" "}
                          {(
                            selectedPoComp.price *
                            0.75 *
                            poQuantity
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPoComp(null)}
                      className="w-1/3 py-2 border border-slate-200 dark:border-zinc-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-900 text-xs font-bold rounded-xl transition"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleGeneratePo}
                      className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-md transition"
                    >
                      Kirim &amp; Cetak PO
                    </button>
                  </div>
                </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
