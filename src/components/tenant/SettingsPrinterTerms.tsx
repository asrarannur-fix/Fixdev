import * as React from "react";
import { useToast } from "../ui/Toast";
import { Building2, Sliders, Receipt, Lock, Zap, FileText, ChevronRight, HelpCircle, Save, PlusCircle, CheckCircle2, Trash2, Copy, AlertTriangle, Monitor, ExternalLink, Download, Brush, Ticket, X, Paintbrush, Wrench, Fingerprint, MapPin, Search, Server, Smartphone, Globe, MessageSquare, Shield, Settings, GitBranch, Printer, Code, CreditCard, ArrowRightLeft, Play, Pencil, Check, Barcode, ShieldCheck, Eye, CheckSquare, Plus, Sparkles, RefreshCw, Send, Database, FileSpreadsheet, Gift, ClipboardCheck } from "lucide-react";
import { Tenant, Branch, WorkflowRule, UserRole, TenantBranding } from "../../types";

export const SettingsPrinterTerms: React.FC<any> = (props) => {
  const { DataImporter, DeveloperApiManager, MaintenanceContractManager, VoucherManager, activeTenant, customFooterText, customHeaderTitle, effectiveActiveSubTab, publicBaseUrl, handleDirectPrintLabel, labelCustomText, labelFontSize, labelHeight, labelShowLogo, labelShowQr, labelWidth, paperSize, printMode, printerName, qzStatus, qzPrinters, qzChecking, checkPrinterConnection, testConfiguredPrinter, printCustomerNotes, printFontSize, printHeaderLogo, printMargin, printPreviewType, printQrCode, printTermsAndConditions, savePrinterSettings, setPrintPreviewType, setSkActiveTab, showConfirm, showTermsInTracking, showToast, skActiveTab, termsAndConditionsText, termsRentalText, termsSalesText } = props;
  return (
  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fadeIn">
    {/* Left Configuration Column */}
    <div className="xl:col-span-6 space-y-6">
      {/* Save Success Alert Indicator */}
      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-1 bg-emerald-500 text-white rounded-md">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold">
              Sinkronisasi Printer & Label Aktif
            </p>
            <p className="text-[10px] text-emerald-600">
              Seluruh pengaturan ini akan diterapkan otomatis pada
              tindakan cetak langsung (Nota QR & Label QR) di tabel
              tiket.
            </p>
          </div>
        </div>
        <span className="text-[9px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase">
          Ready
        </span>
      </div>

      {/* QZ Tray Connection & Diagnostics */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div><h4 className="font-bold text-xs uppercase text-slate-800">Koneksi QZ Tray</h4><p className="text-[10px] text-slate-400">Cek aplikasi lokal dan daftar printer sebelum memakai mode otomatis.</p></div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${qzStatus?.startsWith("Terhubung") ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{qzStatus || "Belum dicek"}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={checkPrinterConnection} disabled={qzChecking} className="px-3 py-2 rounded-lg bg-accent text-white text-[10px] font-bold disabled:opacity-50">{qzChecking ? "Mengecek..." : "Cek Koneksi & Cari Printer"}</button>
          <button type="button" onClick={testConfiguredPrinter} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-[10px] font-bold">Test Print</button>
        </div>
        {qzPrinters.length > 0 && <select value={printerName || ""} onChange={(e) => savePrinterSettings({ printerName: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"><option value="">Pilih printer terdeteksi</option>{qzPrinters.map((name) => <option key={name} value={name}>{name}</option>)}</select>}
      </div>

      {/* Card 1: Layout & Size Setup */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="p-2 bg-accent-lighter text-accent rounded-xl">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
              Tata Letak & Format Struk/Nota
            </h4>
            <p className="text-[10px] text-slate-400">
              Atur ukuran media, margin fisik, dan ukuran huruf kertas
              thermal atau HVS.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5 font-bold">Mode Printer</label>
            <select value={printMode || "browser"} onChange={(e) => savePrinterSettings({ printMode: e.target.value })} className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold">
              <option value="browser">Browser Print Dialog</option>
              <option value="qz">QZ Tray (Printer Otomatis)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5 font-bold">Nama Printer QZ Tray</label>
            <input value={printerName || ""} onChange={(e) => savePrinterSettings({ printerName: e.target.value })} placeholder="Contoh: POS-80" className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold" />
          </div>
          <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] text-amber-900">
            <div className="font-bold mb-1">QZ Tray belum terpasang?</div>
            <div className="mb-2">Install di komputer kasir/operator. Setelah install, buka ulang browser lalu pilih mode QZ Tray.</div>
            <div className="flex flex-wrap gap-2">
              <a href="https://qz.io/download/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white hover:bg-amber-700"><ExternalLink className="h-3 w-3" /> Download QZ Tray</a>
              <a href="/api/qz/installer.bat" download className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 font-bold text-white hover:bg-accent-hover"><Download className="h-3 w-3" /> Setup Otomatis Windows 7+</a>
            </div>
            <span className="block mt-2">QZ Tray harus tetap berjalan saat mencetak. Installer perlu dijalankan sebagai Administrator.</span>
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5 font-bold">
              Ukuran Kertas Media
            </label>
            <select
              value={paperSize}
              onChange={(e) =>
                savePrinterSettings({ paperSize: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:border-accent cursor-pointer transition-all font-semibold"
            >
              <option value="thermal_58">
                Thermal 58 mm (Kertas Struk Mini)
              </option>
              <option value="thermal_80">
                Thermal 80 mm (Kertas Struk Kasir Standar)
              </option>
              <option value="hvs_a4">
                HVS A4 (Faktur Service Lipat/Penuh)
              </option>
              <option value="hvs_letter">
                HVS Letter (Faktur Standar)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5 font-bold">
              Ukuran Font Utama
            </label>
            <select
              value={printFontSize}
              onChange={(e) =>
                savePrinterSettings({ printFontSize: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:border-accent cursor-pointer transition-all font-semibold"
            >
              <option value="sm">
                Kecil (Maksimum Kepadatan / Eco-Print)
              </option>
              <option value="base">
                Sedang / Default (Sangat Direkomendasikan)
              </option>
              <option value="lg">Besar (Sangat Terbaca & Jelas)</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold">
              Margin Kertas Cetakan
            </label>
            <span className="text-[10px] font-mono font-bold text-accent bg-accent-lighter px-2 py-0.5 rounded">
              {printMargin} px
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="40"
            value={printMargin}
            onChange={(e) =>
              savePrinterSettings({
                printMargin: Number(e.target.value),
              })
            }
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-accent"
          />
          <div className="flex justify-between text-[8px] text-slate-400 font-mono mt-1">
            <span>0 px (Tanpa Margin)</span>
            <span>20 px</span>
            <span>40 px (Sangat Lebar)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50/50 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-700 block">
                Cetak QR Code Lacak
              </span>
              <span className="text-[9px] text-slate-400 block">
                Sertakan QR untuk dipindai pelanggan
              </span>
            </div>
            <input
              type="checkbox"
              checked={printQrCode}
              onChange={(e) =>
                savePrinterSettings({ printQrCode: e.target.checked })
              }
              className="w-4.5 h-4.5 rounded text-accent focus:ring-accent border-slate-300 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50/50 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-700 block">
                Tampilkan Logo Header
              </span>
              <span className="text-[9px] text-slate-400 block">
                Tampilkan ikon lencana keamanan nota
              </span>
            </div>
            <input
              type="checkbox"
              checked={printHeaderLogo}
              onChange={(e) =>
                savePrinterSettings({
                  printHeaderLogo: e.target.checked,
                })
              }
              className="w-4.5 h-4.5 rounded text-accent focus:ring-accent border-slate-300 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50/50 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-700 block">
                Cetak Keluhan Unit
              </span>
              <span className="text-[9px] text-slate-400 block">
                Sertakan detail keluhan pelanggan
              </span>
            </div>
            <input
              type="checkbox"
              checked={printCustomerNotes}
              onChange={(e) =>
                savePrinterSettings({
                  printCustomerNotes: e.target.checked,
                })
              }
              className="w-4.5 h-4.5 rounded text-accent focus:ring-accent border-slate-300 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50/50 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-700 block">
                Cetak Syarat & Garansi
              </span>
              <span className="text-[9px] text-slate-400 block">
                Sertakan poin hukum draf di bawah pada nota
              </span>
            </div>
            <input
              type="checkbox"
              checked={printTermsAndConditions}
              onChange={(e) =>
                savePrinterSettings({
                  printTermsAndConditions: e.target.checked,
                })
              }
              className="w-4.5 h-4.5 rounded text-accent focus:ring-accent border-slate-300 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50/50 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-700 block">
                Tampilkan S&K di Lacak
              </span>
              <span className="text-[9px] text-slate-400 block">
                Sertakan poin hukum draf di portal lacak
              </span>
            </div>
            <input
              type="checkbox"
              checked={showTermsInTracking}
              onChange={(e) =>
                savePrinterSettings({
                  showTermsInTracking: e.target.checked,
                })
              }
              className="w-4.5 h-4.5 rounded text-accent focus:ring-accent border-slate-300 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* New Card: Label Sticker Printing Configuration */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
                Kustomisasi Label Stiker Unit
              </h4>
              <p className="text-[10px] text-slate-400">
                Atur dimensi stiker, font, and informasi pada label
                identifikasi.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const testTicket = {
                ticketNo: "SVC-2026-TEST",
                deviceName: "iPhone 15 Pro Max",
                deviceBrandModel: "Apple - A3106",
                deviceSerial: "C39ZX899V20F",
                customerId: "",
                customerApprovalDate: new Date().toISOString(),
              } as any;
              handleDirectPrintLabel(testTicket);
            }}
            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] uppercase rounded-lg cursor-pointer transition-all flex items-center gap-1"
          >
            <Printer className="w-3 h-3" /> Cetak Tes Label
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">
              Lebar Label (px)
            </label>
            <input
              type="number"
              min="200"
              max="600"
              value={labelWidth}
              onChange={(e) =>
                savePrinterSettings({
                  labelWidth: Number(e.target.value),
                })
              }
              className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-accent font-semibold"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">
              Tinggi Label (px)
            </label>
            <input
              type="number"
              min="100"
              max="400"
              value={labelHeight}
              onChange={(e) =>
                savePrinterSettings({
                  labelHeight: Number(e.target.value),
                })
              }
              className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-accent font-semibold"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">
              Ukuran Font Label
            </label>
            <select
              value={labelFontSize}
              onChange={(e) =>
                savePrinterSettings({ labelFontSize: e.target.value })
              }
              className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:border-accent cursor-pointer font-semibold"
            >
              <option value="xs">Kecil (xs)</option>
              <option value="sm">Default (sm)</option>
              <option value="base">Sedang (base)</option>
              <option value="lg">Besar (lg)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-2.5 border border-slate-100 bg-slate-50/50 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-slate-700 block">
                Tampilkan QR Code
              </span>
              <span className="text-[8px] text-slate-400 block">
                Sertakan barcode QR pelacakan
              </span>
            </div>
            <input
              type="checkbox"
              checked={labelShowQr}
              onChange={(e) =>
                savePrinterSettings({ labelShowQr: e.target.checked })
              }
              className="w-4 h-4 rounded text-accent border-slate-300 cursor-pointer"
            />
          </div>
          <div className="flex items-center justify-between p-2.5 border border-slate-100 bg-slate-50/50 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-slate-700 block">
                Tampilkan Nama Toko
              </span>
              <span className="text-[8px] text-slate-400 block">
                Sertakan header judul toko
              </span>
            </div>
            <input
              type="checkbox"
              checked={labelShowLogo}
              onChange={(e) =>
                savePrinterSettings({ labelShowLogo: e.target.checked })
              }
              className="w-4 h-4 rounded text-accent border-slate-300 cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">
            Teks Kaki Stiker Label (Footer Alert)
          </label>
          <input
            type="text"
            value={labelCustomText}
            onChange={(e) =>
              savePrinterSettings({ labelCustomText: e.target.value })
            }
            placeholder="⚠️ TEMPEL DI UNIT - PINDAI UNTUK DIAGNOSA / AMBIL"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-accent font-mono"
          />
        </div>
      </div>

      {/* Card 2: Custom Header & Footer Texts */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
          <div className="p-2 bg-accent-lighter text-accent rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
              Identitas & Catatan Kaki Nota
            </h4>
            <p className="text-[10px] text-slate-400">
              Sesuaikan draf judul banner atas dan catatan penutup.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">
            Judul Header Toko Khusus
          </label>
          <input
            type="text"
            placeholder={`Nama toko Anda (Kosongkan untuk memakai "${activeTenant?.name || "Nama Toko"}")`}
            value={customHeaderTitle}
            onChange={(e) =>
              savePrinterSettings({ customHeaderTitle: e.target.value })
            }
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-accent transition-all font-semibold"
          />
        </div>

        <div>
          <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">
            Catatan Kaki Penutup (Footer Notes)
          </label>
          <textarea
            rows={3}
            value={customFooterText}
            onChange={(e) =>
              savePrinterSettings({ customFooterText: e.target.value })
            }
            placeholder="Tulis pesan penutup struk atau ucapan terima kasih..."
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-accent font-mono leading-relaxed"
          />
        </div>
      </div>

      {/* Card 3: Specific S&K per Operation type (Service, Sales, Rental) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-2 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-accent-lighter text-accent rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
                Draf Syarat & Ketentuan (S&K)
              </h4>
              <p className="text-[10px] text-slate-400">
                Sesuaikan klausul hukum spesifik per jenis transaksi
                bisnis.
              </p>
            </div>
          </div>
        </div>

        {/* Operational Type Tab Switches */}
        <div className="flex border-b border-slate-100 p-0.5 bg-slate-50 rounded-lg">
          <button
            onClick={() => setSkActiveTab("servis")}
            className={`flex-1 py-1.5 text-center text-[10px] font-bold uppercase rounded-md transition-all cursor-pointer ${
              skActiveTab === "servis"
                ? "bg-white text-accent shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            🛠️ Servis
          </button>
          <button
            onClick={() => setSkActiveTab("penjualan")}
            className={`flex-1 py-1.5 text-center text-[10px] font-bold uppercase rounded-md transition-all cursor-pointer ${
              skActiveTab === "penjualan"
                ? "bg-white text-accent shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            🛒 Penjualan
          </button>
          <button
            onClick={() => setSkActiveTab("penyewaan")}
            className={`flex-1 py-1.5 text-center text-[10px] font-bold uppercase rounded-md transition-all cursor-pointer ${
              skActiveTab === "penyewaan"
                ? "bg-white text-accent shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            📦 Penyewaan
          </button>
        </div>

        {/* Servis S&K Area */}
        {skActiveTab === "servis" && (
          <div className="space-y-2">
            <label className="block text-[9px] font-mono text-slate-400 uppercase font-bold">
              Klausul Perjanjian Reparasi & Garansi Unit
            </label>
            <textarea
              rows={6}
              value={termsAndConditionsText}
              onChange={(e) =>
                savePrinterSettings({
                  termsAndConditionsText: e.target.value,
                })
              }
              placeholder="Masukkan poin-poin syarat servis..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-accent font-mono leading-relaxed"
            />
            <p className="text-[9px] text-slate-400 italic">
              Diterapkan pada Nota Bukti Penerimaan Unit Servis dan
              Portal Pelacakan online.
            </p>
          </div>
        )}

        {/* Penjualan S&K Area */}
        {skActiveTab === "penjualan" && (
          <div className="space-y-2">
            <label className="block text-[9px] font-mono text-slate-400 uppercase font-bold">
              Klausul Faktur & Garansi Penjualan Barang/Aksesoris
            </label>
            <textarea
              rows={6}
              value={termsSalesText}
              onChange={(e) =>
                savePrinterSettings({ termsSalesText: e.target.value })
              }
              placeholder="Masukkan poin-poin syarat penjualan ritel..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-accent font-mono leading-relaxed"
            />
            <p className="text-[9px] text-slate-400 italic">
              Diterapkan otomatis pada pencetakan Struk / Nota penjualan
              kasir POS.
            </p>
          </div>
        )}

        {/* Penyewaan S&K Area */}
        {skActiveTab === "penyewaan" && (
          <div className="space-y-2">
            <label className="block text-[9px] font-mono text-slate-400 uppercase font-bold">
              Klausul Perjanjian Sewa, Jaminan, & Denda Unit
            </label>
            <textarea
              rows={6}
              value={termsRentalText}
              onChange={(e) =>
                savePrinterSettings({ termsRentalText: e.target.value })
              }
              placeholder="Masukkan poin-poin aturan penyewaan perangkat..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-accent font-mono leading-relaxed"
            />
            <p className="text-[9px] text-slate-400 italic">
              Diterapkan otomatis pada pencetakan Dokumen / Nota sewa
              harian/mingguan.
            </p>
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
          <button
            onClick={async () => {
              if (
                await showConfirm({
                  title: "Reset Syarat & Ketentuan",
                  message:
                    "Reset seluruh Syarat & Ketentuan ke nilai default? Perubahan yang Anda buat akan ditimpa.",
                  confirmLabel: "Reset ke Default",
                  type: "warning",
                })
              ) {
                savePrinterSettings({
                  termsAndConditionsText:
                    "1. Garansi berlaku selama 30 hari hanya untuk komponen yang diganti.\n2. Kerusakan akibat cairan, benturan, atau modifikasi software mandiri membatalkan garansi.\n3. Barang yang tidak diambil dalam waktu 90 hari di luar tanggung jawab toko.\n4. Biaya pembatalan setelah pembongkaran dikenakan Rp 50.000,- untuk biaya analisa teknisi.",
                  termsSalesText:
                    "1. Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan.\n2. Komplain kekurangan item wajib menyertakan video unboxing utuh.\n3. Aksesoris dan item promo tidak dilindungi oleh garansi toko.\n4. Pembayaran wajib lunas sebelum barang diserahterimakan.",
                  termsRentalText:
                    "1. Penyewa wajib menyerahkan kartu identitas asli sebagai jaminan.\n2. Keterlambatan pengembalian dikenakan denda Rp 25.000,- per jam.\n3. Kerusakan fisik pada unit sewa sepenuhnya ditanggung oleh penyewa.\n4. Pembatalan sewa kurang dari 24 jam dikenakan biaya administrasi 50%.",
                });
              }
            }}
            className="px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-700 bg-white rounded-xl text-[10px] font-bold cursor-pointer transition-all"
          >
            Reset Default
          </button>

          <button
            onClick={() => void savePrinterSettings({
              paperSize, printMode, printerName, printFontSize, printMargin,
              printQrCode, printHeaderLogo, printCustomerNotes, printTermsAndConditions,
              showTermsInTracking, labelWidth, labelHeight, labelFontSize,
              labelShowQr, labelShowLogo, labelCustomText, customHeaderTitle,
              customFooterText, termsAndConditionsText, termsSalesText, termsRentalText,
            })}
            className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-[10px] font-bold cursor-pointer transition-all shadow-sm"
          >
            Simpan Konfigurasi
          </button>
        </div>
      </div>
    </div>

    {/* Right Live Preview Column */}
    <div className="xl:col-span-6 space-y-4">
      <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 text-white shadow-xl relative overflow-hidden flex flex-col items-center">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />

        <div className="w-full flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 mb-6 gap-3">
          <div>
            <span className="text-[9px] font-mono text-indigo-400 bg-indigo-900/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Pratinjau Langsung
            </span>
            <h3 className="font-extrabold text-sm text-slate-100 tracking-tight mt-1">
              Pratinjau Cetak Fisik
            </h3>
          </div>

          {/* Print Mode Switch */}
          <div className="flex border border-slate-700 bg-slate-800/80 p-0.5 rounded-lg text-[9px] font-bold uppercase">
            <button
              onClick={() => setPrintPreviewType("nota")}
              className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                printPreviewType === "nota"
                  ? "bg-accent text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              📄 Nota Struk
            </button>
            <button
              onClick={() => setPrintPreviewType("label")}
              className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                printPreviewType === "label"
                  ? "bg-accent text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🏷️ Label Stiker
            </button>
          </div>
        </div>

        {printPreviewType === "nota" ? (
          /* Simulated Receipt paper strip */
          <div
            className="bg-white text-slate-800 rounded-lg p-5 shadow-2xl border-t-[8px] border-accent flex flex-col justify-between relative overflow-hidden transition-all duration-300 w-full animate-fadeIn"
            style={{
              maxWidth:
                paperSize === "thermal_58"
                  ? "260px"
                  : paperSize === "thermal_80"
                    ? "340px"
                    : "100%",
              padding: `${Math.max(10, printMargin)}px`,
            }}
          >
            {/* Jagged edges simulation */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-50 border-b border-dashed border-slate-300" />

            {/* Logo */}
            {printHeaderLogo && (
              <div className="flex justify-center mb-3">
                <div className="w-10 h-10 bg-accent-lighter border border-indigo-100 rounded-full flex items-center justify-center text-accent">
                  <Printer className="w-5 h-5" />
                </div>
              </div>
            )}

            {/* Header */}
            <div className="text-center mb-4">
              <h1 className="font-extrabold tracking-tight text-slate-900 text-sm uppercase leading-tight">
                {customHeaderTitle.trim() ||
                  activeTenant?.name ||
                  "NAMA TOKO"}
              </h1>
              <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase tracking-wide">
                BUKTI PENERIMAAN UNIT SERVIS
              </p>
              <div className="inline-block bg-slate-100 border border-slate-200 font-mono font-bold text-[10px] px-2.5 py-0.5 rounded-md mt-2 text-slate-800">
                TIKET: #SVC-2026-0099
              </div>
            </div>

            {/* Meta rows */}
            <div
              className="space-y-1.5 text-slate-700"
              style={{
                fontSize:
                  printFontSize === "sm"
                    ? "10px"
                    : printFontSize === "lg"
                      ? "13px"
                      : "11px",
              }}
            >
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">
                  Pelanggan:
                </span>
                <span className="font-bold text-slate-800 text-right">
                  Ahmad Dahlan (0812-4455-xxxx)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">
                  Tanggal Diterima:
                </span>
                <span className="font-semibold text-slate-800 text-right">
                  01 Juli 2026
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">
                  Nama Perangkat:
                </span>
                <span className="font-bold text-slate-800 text-right">
                  PlayStation 5 Slim
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">
                  Brand & Model:
                </span>
                <span className="font-semibold text-slate-800 text-right">
                  Sony - CFI-2016
                </span>
              </div>

              {printCustomerNotes && (
                <div className="flex justify-between pt-0.5">
                  <span className="text-slate-400 font-medium">
                    Keluhan Utama:
                  </span>
                  <span className="font-semibold text-slate-800 text-right italic">
                    Overheating & mati mendadak saat game 4K
                  </span>
                </div>
              )}

              <div className="h-px border-t border-dashed border-slate-200 my-2" />

              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">
                  Jenis Layanan:
                </span>
                <span className="font-bold text-accent text-right">
                  Reparasi Penuh & Cleaning
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">
                  Estimasi Biaya:
                </span>
                <span className="font-bold text-slate-900 text-right text-xs">
                  Rp 350,000
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">
                  Status Awal:
                </span>
                <span className="font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[9px] uppercase">
                  Diterima
                </span>
              </div>
            </div>

            {/* QR Code section */}
            {printQrCode && (
              <div className="mt-4 p-3 bg-slate-50 border border-slate-150 rounded-lg text-center">
                <div className="w-24 h-24 bg-white border border-slate-200 p-1.5 mx-auto mb-2 rounded flex items-center justify-center">
                  {/* Simulated QR block art for realistic feel */}
                  <div className="grid grid-cols-4 gap-0.5 w-full h-full opacity-80">
                    {[...Array(16)].map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-sm ${i % 3 === 0 || i % 7 === 1 ? "bg-slate-950" : "bg-transparent"}`}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-[9px] font-extrabold text-slate-700 block uppercase tracking-wider">
                  PINDAI QR UNTUK LACAK STATUS
                </span>
                <span className="text-[8px] text-slate-400 block font-mono mt-0.5 truncate max-w-full">
                  {publicBaseUrl}/?ticket=SVC-2026-0099
                </span>
              </div>
            )}

            {/* Terms and Conditions Section */}
            {printTermsAndConditions &&
              termsAndConditionsText.trim() && (
                <div className="mt-4 pt-3 border-t border-dashed border-slate-200">
                  <span className="text-[9px] font-bold text-slate-900 block uppercase mb-1 tracking-wide">
                    Syarat & Ketentuan Layanan (Servis):
                  </span>
                  <ul className="text-[8px] text-slate-500 pl-3 list-decimal space-y-0.5 leading-relaxed">
                    {termsAndConditionsText
                      .split("\n")
                      .filter((l) => l.trim())
                      .map((line, idx) => (
                        <li
                          key={idx}
                          className="font-medium text-slate-600"
                        >
                          {line.replace(/^\d+[\.\s]*/, "")}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

            {/* Footer notes */}
            <div className="mt-4 pt-3 border-t border-slate-100 text-center text-[9px] text-slate-400 font-medium leading-relaxed">
              {customFooterText.split("\n").map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </div>

            {/* Bottom Jagged strip */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-50 border-t border-dashed border-slate-300" />
          </div>
        ) : (
          /* Simulated Label sticker */
          <div
            className="bg-white text-slate-900 rounded-lg p-4 shadow-2xl border-2 border-slate-950 flex flex-col justify-between relative overflow-hidden transition-all duration-300 animate-fadeIn"
            style={{
              width: `${labelWidth}px`,
              height: `${labelHeight}px`,
              maxHeight: "350px",
            }}
          >
            <div className="flex justify-between items-center border-b border-slate-950 pb-1.5">
              <span
                className="font-extrabold text-[9px] text-slate-900 uppercase tracking-tight"
                style={{ display: labelShowLogo ? "block" : "none" }}
              >
                {customHeaderTitle.trim() ||
                  activeTenant?.name ||
                  "NAMA TOKO"}
              </span>
              <span className="text-[10px] font-mono font-extrabold bg-slate-950 text-white px-1.5 py-0.5 rounded">
                #SVC-TEST-LABEL
              </span>
            </div>

            <div className="flex gap-2 items-center my-1.5 flex-1 min-height-0">
              {labelShowQr && (
                <div className="w-14 h-14 border border-slate-900 p-1 bg-white shrink-0 flex items-center justify-center">
                  <div className="grid grid-cols-3 gap-0.5 w-full h-full opacity-90">
                    {[...Array(9)].map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-sm ${i % 2 === 0 ? "bg-slate-950" : "bg-transparent"}`}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div
                className="text-slate-800 leading-tight space-y-0.5 truncate"
                style={{
                  fontSize:
                    labelFontSize === "xs"
                      ? "8px"
                      : labelFontSize === "lg"
                        ? "13px"
                        : labelFontSize === "base"
                          ? "11px"
                          : "9.5px",
                }}
              >
                <div>
                  <strong className="font-extrabold font-mono text-[8px] uppercase text-slate-400 block leading-none">
                    Perangkat
                  </strong>{" "}
                  <span className="font-bold text-slate-900">
                    iPhone 15 Pro Max
                  </span>
                </div>
                <div>
                  <strong className="font-extrabold font-mono text-[8px] uppercase text-slate-400 block leading-none">
                    Model
                  </strong>{" "}
                  <span className="font-semibold text-slate-800">
                    Apple - A3106
                  </span>
                </div>
                <div>
                  <strong className="font-extrabold font-mono text-[8px] uppercase text-slate-400 block leading-none">
                    Pelanggan
                  </strong>{" "}
                  <span className="font-bold text-slate-800">
                    Budi Santoso
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-950 pt-1 text-center font-bold uppercase tracking-wide text-slate-900 text-[7px] truncate font-mono">
              {labelCustomText}
            </div>
          </div>
        )}

        <p className="text-[10px] text-slate-500 mt-4 leading-relaxed text-center max-w-sm">
          Gunakan tombol{" "}
          <strong className="text-slate-300">"Nota QR"</strong> atau{" "}
          <strong className="text-slate-300">"Label QR"</strong> pada
          tabel tiket untuk langsung mencetak nota fisik menggunakan
          konfigurasi di atas.
        </p>
      </div>
    </div>
  </div>
  );
};
