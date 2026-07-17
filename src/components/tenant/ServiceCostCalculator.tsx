import React from "react";
import { Sliders, FileText, Wrench, Printer, CheckSquare } from "lucide-react";
import { CustomerSegment } from "../../types";

export interface ServiceCostCalculatorProps {
  calcDeviceModel: string;
  setCalcDeviceModel: (v: string) => void;
  calcCustomDeviceModel: string;
  setCalcCustomDeviceModel: (v: string) => void;
  calcDamageType: string;
  setCalcDamageType: (v: string) => void;
  calcCustomDamageType: string;
  setCalcCustomDamageType: (v: string) => void;
  calcPartCost: string;
  setCalcPartCost: (v: string) => void;
  calcServiceCost: string;
  setCalcServiceCost: (v: string) => void;
  calcIncludeTax: boolean;
  setCalcIncludeTax: (v: boolean) => void;
  calcDiscountValue: string;
  setCalcDiscountValue: (v: string) => void;
  calcCustomerId: string;
  setCalcCustomerId: (v: string) => void;
  calcCustName: string;
  setCalcCustName: (v: string) => void;
  calcCustPhone: string;
  setCalcCustPhone: (v: string) => void;
  calcWarranty: number;
  setCalcWarranty: (v: number) => void;
  activeQuote: any | null;
  setActiveQuote: (v: any | null) => void;
  setActiveSubTab: (sub: string) => void;
  customers: any[];
  addCustomer: (c: any) => any;
  addServiceTicket: (t: any) => void;
  currentTenantId: string;
  currentBranchId: string;
  activeTenant: any;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export const ServiceCostCalculator: React.FC<ServiceCostCalculatorProps> = ({
  calcDeviceModel,
  setCalcDeviceModel,
  calcCustomDeviceModel,
  setCalcCustomDeviceModel,
  calcDamageType,
  setCalcDamageType,
  calcCustomDamageType,
  setCalcCustomDamageType,
  calcPartCost,
  setCalcPartCost,
  calcServiceCost,
  setCalcServiceCost,
  calcIncludeTax,
  setCalcIncludeTax,
  calcDiscountValue,
  setCalcDiscountValue,
  calcCustomerId,
  setCalcCustomerId,
  calcCustName,
  setCalcCustName,
  calcCustPhone,
  setCalcCustPhone,
  calcWarranty,
  setCalcWarranty,
  activeQuote,
  setActiveQuote,
  setActiveSubTab,
  customers,
  addCustomer,
  addServiceTicket,
  currentTenantId,
  currentBranchId,
  activeTenant,
  showToast,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Form: Parameters (5 cols) */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-xs text-slate-800 flex items-center gap-2 uppercase tracking-wider font-mono">
            <Sliders className="w-4 h-4 text-indigo-600" /> Kalkulator
            Estimasi Biaya
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Tentukan jenis unit dan kerusakan untuk simulasi harga &
            garansi.
          </p>
        </div>

        <div className="space-y-4">
          {/* Select Device Model */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
              Model Perangkat
            </label>
            <select
              value={calcDeviceModel}
              onChange={(e) => {
                const val = e.target.value;
                setCalcDeviceModel(val);
                if (val === "MacBook Pro M1") {
                  setCalcPartCost("1500000");
                  setCalcServiceCost("450000");
                } else if (val === "MacBook Air M1") {
                  setCalcPartCost("1200000");
                  setCalcServiceCost("350000");
                } else if (val === "iPhone 14 Pro") {
                  setCalcPartCost("1800000");
                  setCalcServiceCost("300000");
                } else if (val === "Samsung S23 Ultra") {
                  setCalcPartCost("2100000");
                  setCalcServiceCost("300000");
                } else if (val === "iPad Air") {
                  setCalcPartCost("950000");
                  setCalcServiceCost("250000");
                } else if (val === "Custom") {
                  setCalcPartCost("0");
                  setCalcServiceCost("0");
                }
              }}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500 font-medium"
            >
              <option value="MacBook Pro M1">MacBook Pro M1 (High Class)</option>
              <option value="MacBook Air M1">MacBook Air M1 (Medium Class)</option>
              <option value="iPhone 14 Pro">iPhone 14 Pro (Premium Mobile)</option>
              <option value="Samsung S23 Ultra">Samsung S23 Ultra (Premium Mobile)</option>
              <option value="iPad Air">iPad Air (Tablet Class)</option>
              <option value="Custom">-- Custom Perangkat Lain --</option>
            </select>
          </div>

          {calcDeviceModel === "Custom" && (
            <div className="animate-fadeIn">
              <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                Ketik Nama Model Kustom
              </label>
              <input
                type="text"
                placeholder="cth: Asus ROG Zephyrus G14"
                value={calcCustomDeviceModel}
                onChange={(e) => setCalcCustomDeviceModel(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Select Damage Type */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
              Jenis Kerusakan
            </label>
            <select
              value={calcDamageType}
              onChange={(e) => {
                const val = e.target.value;
                setCalcDamageType(val);
                let mult = 1.0;
                if (calcDeviceModel === "MacBook Pro M1") mult = 1.4;
                else if (calcDeviceModel === "MacBook Air M1") mult = 1.2;
                else if (calcDeviceModel === "iPhone 14 Pro") mult = 1.1;
                else if (calcDeviceModel === "Samsung S23 Ultra") mult = 1.25;

                if (val === "Ganti Layar LCD") {
                  setCalcPartCost(String(Math.round(1400000 * mult)));
                  setCalcServiceCost(String(Math.round(350000 * mult)));
                } else if (val === "Ganti Baterai") {
                  setCalcPartCost(String(Math.round(450000 * mult)));
                  setCalcServiceCost(String(Math.round(150000 * mult)));
                } else if (val === "Mati Total / IC Power") {
                  setCalcPartCost(String(Math.round(650000 * mult)));
                  setCalcServiceCost(String(Math.round(600000 * mult)));
                } else if (val === "Keyboard Error") {
                  setCalcPartCost(String(Math.round(550000 * mult)));
                  setCalcServiceCost(String(Math.round(300000 * mult)));
                } else if (val === "Pembersihan & Pasta") {
                  setCalcPartCost("50000");
                  setCalcServiceCost("100000");
                } else if (val === "Custom") {
                  setCalcPartCost("0");
                  setCalcServiceCost("0");
                }
              }}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500 font-medium"
            >
              <option value="Ganti Layar LCD">Ganti Layar LCD Original</option>
              <option value="Ganti Baterai">Ganti Baterai High Capacity</option>
              <option value="Mati Total / IC Power">Mati Total / Perbaikan IC Board</option>
              <option value="Keyboard Error">Ganti Keyboard & Trackpad</option>
              <option value="Pembersihan & Pasta">Pembersihan Internal & Repaste Thermal</option>
              <option value="Custom">-- Custom Kerusakan Lain --</option>
            </select>
          </div>

          {calcDamageType === "Custom" && (
            <div className="animate-fadeIn">
              <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                Deskripsi Kerusakan Kustom
              </label>
              <input
                type="text"
                placeholder="cth: Kerusakan Engsel Layar & Casing Retak"
                value={calcCustomDamageType}
                onChange={(e) => setCalcCustomDamageType(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Pricing Input Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                Biaya Suku Cadang (Rp)
              </label>
              <input
                type="number"
                value={calcPartCost}
                onChange={(e) => setCalcPartCost(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                Biaya Jasa Servis (Rp)
              </label>
              <input
                type="number"
                value={calcServiceCost}
                onChange={(e) => setCalcServiceCost(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Options Checkbox & Discount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex items-center gap-2 border border-slate-100 rounded-xl px-3 py-2 bg-slate-50/50">
              <input
                type="checkbox"
                id="include-tax-chk"
                checked={calcIncludeTax}
                onChange={(e) => setCalcIncludeTax(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
              <label
                htmlFor="include-tax-chk"
                className="text-xs text-slate-600 font-medium cursor-pointer"
              >
                Terapkan PPN (11%)
              </label>
            </div>
            <div>
              <input
                type="number"
                placeholder="Diskon (Rupiah)..."
                value={calcDiscountValue}
                onChange={(e) => setCalcDiscountValue(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Customer Selection & Warranty */}
          <div className="border-t border-slate-100 pt-4 space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                Hubungkan ke Pelanggan
              </label>
              <select
                value={calcCustomerId}
                onChange={(e) => setCalcCustomerId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500 font-medium"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
                <option value="new">+ Daftarkan Pelanggan Baru +</option>
              </select>
            </div>

            {calcCustomerId === "new" && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3 animate-fadeIn">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Form Pendaftaran Cepat
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      placeholder="Nama Lengkap..."
                      value={calcCustName}
                      onChange={(e) => setCalcCustName(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="No. WhatsApp (628...)"
                      value={calcCustPhone}
                      onChange={(e) => setCalcCustPhone(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                Masa Garansi Ditawarkan
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 3, 6, 12].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setCalcWarranty(m)}
                    className={`py-1.5 px-2 text-xs font-bold font-mono rounded-lg border cursor-pointer transition-all ${
                      calcWarranty === m
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {m} Bln
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions Submit */}
          <button
            type="button"
            onClick={() => {
              const part = Number(calcPartCost || 0);
              const service = Number(calcServiceCost || 0);
              const subtotal = part + service;
              const tax = calcIncludeTax ? Math.round(subtotal * 0.11) : 0;
              const discRaw = Number(calcDiscountValue || 0);
              const disc = Number.isFinite(discRaw) && discRaw >= 0 ? discRaw : 0;
              const total = subtotal + tax - disc;

              let customerObj = null;
              if (calcCustomerId === "new") {
                if (!calcCustName || !calcCustPhone) {
                  showToast("Mohon lengkapi data Nama & WhatsApp pelanggan baru!", "error");
                  return;
                }
                customerObj = { id: "cust-temp", name: calcCustName, phone: calcCustPhone };
              } else {
                customerObj = customers.find((c) => c.id === calcCustomerId) || { id: "cust-temp", name: "Umum", phone: "+62 811" };
              }

              const devName = calcDeviceModel === "Custom" ? calcCustomDeviceModel : calcDeviceModel;
              const damageName = calcDamageType === "Custom" ? calcCustomDamageType : calcDamageType;

              const quoteTime = Date.now();
              setActiveQuote({
                id: "qt-" + quoteTime.toString(36),
                quoteNo: `QT/${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, "0")}/${quoteTime.toString().slice(-4)}`,
                createdAt: new Date().toISOString(),
                customer: customerObj,
                deviceName: devName,
                damageType: damageName,
                partCost: part,
                serviceCost: service,
                subtotal,
                tax,
                discount: disc,
                grandTotal: total,
                warranty: calcWarranty,
              });
            }}
            className="w-full bg-slate-900 hover:bg-slate-850 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
          >
            <Sliders className="w-4 h-4 text-emerald-400" /> Buat Dokumen
            Penawaran Resmi
          </button>
        </div>
      </div>

      {/* Right Column: Quote Preview & Action Sheet (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        {!activeQuote ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-3 min-h-[450px]">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
              <FileText className="w-6 h-6 text-slate-400" />
            </div>
            <div className="space-y-1">
              <p className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">
                Preview Penawaran Kosong
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                Masukkan parameter estimasi di kolom sebelah kiri dan klik
                tombol buat penawaran untuk memuat dokumen formal.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Official Business Layout Letterhead */}
            <div className="bg-white border border-slate-300 rounded-2xl shadow-xl p-6 md:p-8 font-sans text-slate-800 space-y-6 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-50/40 rounded-full border border-indigo-100/30 pointer-events-none" />

              {/* Letterhead Header */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-200 pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Wrench className="w-5 h-5 text-indigo-600" />
                    <span className="font-black text-sm uppercase tracking-tight text-slate-900">
                      {activeTenant?.name || "REPAIR SERVICE CENTER"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">OFFICIAL SERVICE QUOTATION SHEET</p>
                  <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed">
                    {activeTenant?.address || "Kawasan Tamalanrea Utama, Makassar, ID"}
                  </p>
                </div>
                <div className="md:text-right font-mono text-[10px] space-y-0.5 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                  <p className="text-slate-400 uppercase font-bold text-[8px]">Penawaran No:</p>
                  <p className="text-slate-800 font-extrabold text-xs">{activeQuote.quoteNo}</p>
                  <p className="text-[9px] text-slate-500 mt-1">
                    Tanggal:{" "}
                    {new Date(activeQuote.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-[9px] text-emerald-600 font-bold">Masa Berlaku: 14 Hari</p>
                </div>
              </div>

              {/* Client details info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-3.5 border border-slate-100 rounded-xl text-xs">
                <div className="space-y-1">
                  <p className="text-[9px] text-slate-400 font-mono uppercase font-bold">Ditujukan Kepada:</p>
                  <p className="font-extrabold text-slate-800">{activeQuote.customer?.name}</p>
                  <p className="text-slate-500">Phone: {activeQuote.customer?.phone}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] text-slate-400 font-mono uppercase font-bold">Rincian Perangkat:</p>
                  <p className="font-extrabold text-slate-800">{activeQuote.deviceName}</p>
                  <p className="text-slate-500">
                    Estimasi Kerusakan:{" "}
                    <span className="font-bold text-indigo-600">{activeQuote.damageType}</span>
                  </p>
                </div>
              </div>

              {/* Pricing Table */}
              <div className="space-y-2 text-xs">
                <p className="font-mono text-[9px] text-slate-400 uppercase font-bold">
                  Rincian Estimasi Biaya Perbaikan (Itemized Cost):
                </p>
                <div className="overflow-hidden border border-slate-200 rounded-xl">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[9px] uppercase font-mono text-slate-500">
                      <tr>
                        <th className="px-3.5 py-2">Deskripsi Layanan & Part</th>
                        <th className="px-3.5 py-2 text-right">Biaya Satuan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                      <tr>
                        <td className="px-3.5 py-2.5 font-medium">
                          Komponen Pengganti Suku Cadang ({activeQuote.damageType})
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono">
                          Rp{" "}
                          {(activeQuote.partCost ?? 0).toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2.5 font-medium">
                          Biaya Jasa Perbaikan Perangkat & Pengujian Teknis
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono">
                          Rp{" "}
                          {(activeQuote.serviceCost ?? 0).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Pricing Block */}
              <div className="border-t border-slate-200 pt-4 flex flex-col items-end text-xs space-y-1.5 font-mono">
                <div className="flex justify-between w-64 text-slate-500">
                  <span>Subtotal:</span>
                  <span>Rp {(activeQuote.subtotal ?? 0).toLocaleString()}</span>
                </div>
                {(activeQuote.tax ?? 0) > 0 && (
                  <div className="flex justify-between w-64 text-slate-500">
                    <span>PPN Pajak (11%):</span>
                    <span>Rp {(activeQuote.tax ?? 0).toLocaleString()}</span>
                  </div>
                )}
                {(activeQuote.discount ?? 0) > 0 && (
                  <div className="flex justify-between w-64 text-rose-500 font-bold">
                    <span>Diskon Khusus:</span>
                    <span>-Rp {(activeQuote.discount ?? 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between w-64 text-slate-900 border-t border-slate-200 pt-2 font-black text-sm">
                  <span className="font-sans">Grand Total:</span>
                  <span className="text-indigo-600">
                    Rp {(activeQuote.grandTotal ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Terms and Conditions Footnotes */}
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-1.5 text-[10px] text-slate-500 leading-relaxed font-sans">
                <p className="font-bold text-slate-700 font-mono uppercase tracking-wider text-[8px]">
                  Ketentuan & Syarat Layanan:
                </p>
                <p>
                  1. Penawaran biaya perbaikan ini bersifat estimasi awal
                  dan berlaku selama *14 hari* dari tanggal tertera.
                </p>
                <p>
                  2. Garansi berlaku selama *{activeQuote.warranty} bulan* untuk
                  jenis penggantian komponen yang sama pasca serah terima.
                </p>
                <p>
                  3. Pihak toko berhak membatalkan perbaikan apabila ditemukan
                  kerusakan sekunder pasca bongkar unit dengan persetujuan
                  customer.
                </p>
              </div>
            </div>

            {/* Operational Action Row */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  showToast(
                    `Mencetak Dokumen Resmi ${activeQuote.quoteNo}... Mengunduh file penawaran berformat PDF.`,
                    "info",
                  );
                }}
                className="flex-1 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4 text-slate-500" /> Unduh PDF Formal
              </button>
              <button
                type="button"
                onClick={() => {
                  let finalCustId = activeQuote.customer.id;
                  if (calcCustomerId === "new") {
                    const addedCust = addCustomer({
                      name: activeQuote.customer.name,
                      phone: activeQuote.customer.phone,
                      email: "client@service.io",
                      address: "",
                      segment: CustomerSegment.PERSONAL,
                      tags: [],
                      salesPipelineStage: "LEAD",
                    });
                    finalCustId = addedCust.id;
                  }

                  addServiceTicket({
                    tenantId: currentTenantId,
                    branchId: currentBranchId,
                    customerId: finalCustId,
                    deviceName: activeQuote.deviceName,
                    deviceBrandModel: activeQuote.deviceName,
                    initialChecklist: [
                      { name: "Unit Menyala", checked: true },
                      { name: "Fisik Mulus", checked: true },
                    ],
                    initialPhotos: [
                      "https://images.unsplash.com/photo-1597872200319-336c261c6742?auto=format&fit=crop&q=80&w=400",
                    ],
                    customerComplaints: `Unit dikonversi langsung dari Penawaran Penjualan #${activeQuote.quoteNo}. Penanganan: ${activeQuote.damageType}`,
                    techDiagnosis: activeQuote.damageType,
                    estimatedCost: activeQuote.grandTotal,
                    customerApprovalStatus: "APPROVED",
                    customerApprovalDate: new Date().toISOString(),
                    partsUsed: [
                      {
                        productId: "sparepart-temp",
                        name: activeQuote.damageType,
                        quantity: 1,
                        unitPrice: activeQuote.partCost,
                        totalPrice: activeQuote.partCost,
                      },
                    ],
                    warrantyMonths: activeQuote.warranty,
                    isOutsourced: false,
                  });

                  showToast(
                    `Penawaran resmi ${activeQuote.quoteNo} berhasil dikonversi dan disetujui! Tiket perbaikan aktif dan SPK baru telah diterbitkan.`,
                    "success",
                  );
                  setActiveQuote(null);
                  setCalcCustName("");
                  setCalcCustPhone("");
                  setActiveSubTab("list");
                }}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-600/10"
              >
                <CheckSquare className="w-4 h-4" /> Konversi & Buat Tiket Aktif
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
