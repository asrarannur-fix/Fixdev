/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import {
  Sliders,
  Settings,
  Zap,
  Clock,
  Percent,
  ShieldCheck,
  Database,
  RefreshCw,
  Save,
  AlertTriangle,
  FileText,
} from "lucide-react";

export const ModuleParameterConfig: React.FC = () => {
  const { showToast } = useToast();
  const { currentTenantId, tenants, updateTenant } = useSaaS();
  const activeTenant = tenants.find((t) => t.id === currentTenantId);
  const [isSaving, setIsSaving] = useState(false);

  // Load from tenant settings
  const docConfig = activeTenant?.settings?.documentConfig || {};
  const [ticketPrefix, setTicketPrefix] = useState(docConfig.ticketPrefix || "TKT");
  const [invoicePrefix, setInvoicePrefix] = useState(docConfig.invoicePrefix || "INV");
  const [posPrefix, setPosPrefix] = useState(docConfig.posInvoicePrefix || "POS");

  const [warrantyDays, setWarrantyDays] = useState(activeTenant?.settings?.warrantyDays ?? 30);
  const [autoReminderDays, setAutoReminderDays] = useState(activeTenant?.settings?.autoReminderDays ?? 7);
  const [stockLowThreshold, setStockLowThreshold] = useState(activeTenant?.settings?.stockLowThreshold ?? 5);
  const [enableTechnicianCommission, setEnableTechnicianCommission] = useState(activeTenant?.settings?.enableTechnicianCommission ?? true);
  const [enableKnowledgeBase, setEnableKnowledgeBase] = useState(activeTenant?.settings?.enableKnowledgeBase ?? true);
  const [taxRate, setTaxRate] = useState(activeTenant?.settings?.taxSettings?.taxRate ?? 11);

  const handleSave = () => {
    if (!updateTenant || !currentTenantId) return;

    const clamp = (value: number, min: number, max: number) =>
      Math.min(max, Math.max(min, Number.isFinite(value) ? Math.trunc(value) : min));
    const safeTicketPrefix = ticketPrefix.trim().toUpperCase();
    const safeInvoicePrefix = invoicePrefix.trim().toUpperCase();
    const safePosPrefix = posPrefix.trim().toUpperCase();
    const prefixRegex = /^[A-Z0-9-]+$/;
    if (!safeTicketPrefix || !safeInvoicePrefix || !safePosPrefix) {
      showToast("Prefiks dokumen wajib diisi.", "error");
      return;
    }
    if (!prefixRegex.test(safeTicketPrefix) || !prefixRegex.test(safeInvoicePrefix) || !prefixRegex.test(safePosPrefix)) {
      showToast("Prefiks hanya boleh berisi huruf, angka, dan tanda hubung (-).", "error");
      return;
    }

    const safeWarrantyDays = clamp(warrantyDays, 0, 365);
    const safeAutoReminderDays = clamp(autoReminderDays, 0, 365);
    const safeStockLowThreshold = clamp(stockLowThreshold, 0, 9999);
    const safeTaxRate = clamp(taxRate, 0, 100);

    setIsSaving(true);
    updateTenant(currentTenantId, {
      settings: {
        ...activeTenant?.settings,
        taxSettings: { ...activeTenant?.settings?.taxSettings, taxRate: safeTaxRate },
        documentConfig: { ticketPrefix: safeTicketPrefix, invoicePrefix: safeInvoicePrefix, posInvoicePrefix: safePosPrefix },
        warrantyDays: safeWarrantyDays,
        autoReminderDays: safeAutoReminderDays,
        stockLowThreshold: safeStockLowThreshold,
        enableTechnicianCommission,
        enableKnowledgeBase,
      },
    });
    setTimeout(() => {
      showToast("Parameter modul berhasil disimpan!", "success");
      setIsSaving(false);
    }, 300);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-4 h-4 text-indigo-600" />
            Parameter & Penyesuaian Modul Bisnis
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">
            Konfigurasi variabel global, ambang batas sistem, dan aturan bisnis otomatis tenant {activeTenant?.name}.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? "Menyimpan..." : "Simpan Parameter Modul"}
        </button>
      </div>

      {/* Card: Numbering / Document Prefix */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><FileText className="w-5 h-5" /></div>
          <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">Nomor Dokumen & Prefiks</h4>
        </div>
        <p className="text-[10px] text-slate-500">Prefiks ini akan digunakan saat membuat Tiket Servis, Invoice, dan Penjualan baru.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Prefiks Tiket Servis</label>
            <input type="text" value={ticketPrefix} onChange={(e) => setTicketPrefix(e.target.value)} className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500 uppercase" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Prefiks Invoice Servis</label>
            <input type="text" value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500 uppercase" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Prefiks Penjualan / POS</label>
            <input type="text" value={posPrefix} onChange={(e) => setPosPrefix(e.target.value)} className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500 uppercase" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Operasional & Garansi */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Zap className="w-5 h-5" /></div>
            <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">Layanan & Garansi</h4>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Masa Garansi Default</label>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{warrantyDays} Hari</span>
              </div>
              <input type="range" min="0" max="365" step="1" value={warrantyDays} onChange={(e) => setWarrantyDays(Number(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Auto-Reminder Pick-up (Hari)</label>
              <input type="number" value={autoReminderDays} onChange={(e) => setAutoReminderDays(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-mono" />
            </div>
          </div>
        </div>

        {/* Card 2: Keuangan & Pajak */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Percent className="w-5 h-5" /></div>
            <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">Perpajakan & Valuta</h4>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Default PPN / Tax (%)</label>
              <div className="relative">
                <input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-mono font-bold" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-600 uppercase">Hitung Komisi Teknisi</span>
              <div onClick={() => setEnableTechnicianCommission(!enableTechnicianCommission)} className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-all ${enableTechnicianCommission ? "bg-emerald-500" : "bg-slate-300"}`}>
                <div className={`w-3 h-3 bg-white rounded-full transition-all ${enableTechnicianCommission ? "ml-5" : "ml-0"}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Logistik & Inventori */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Database className="w-5 h-5" /></div>
            <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">Inventori & Gudang</h4>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Batas Stok Rendah (Critical)</label>
              <input type="number" value={stockLowThreshold} onChange={(e) => setStockLowThreshold(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-mono font-bold" />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-600 uppercase">Aktifkan Modul Skema & Panduan Teknis</span>
              <div onClick={() => setEnableKnowledgeBase(!enableKnowledgeBase)} className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-all ${enableKnowledgeBase ? "bg-emerald-500" : "bg-slate-300"}`}>
                <div className={`w-3 h-3 bg-white rounded-full transition-all ${enableKnowledgeBase ? "ml-5" : "ml-0"}`} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
