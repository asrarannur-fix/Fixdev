/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSaaS } from '../context/SaaSContext';
import { useToast } from './ui/Toast';
import {
  Settings,
  Zap,
  Clock,
  Percent,
  Database,
  RefreshCw,
  Save,
  FileText,
  Package,
  ShoppingCart,
  Users,
  Calculator,
  Briefcase,
  Globe,
  Lock,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

type ModuleParams = Record<string, unknown>;

const Switch: React.FC<{
  enabled: boolean;
  onToggle: () => void;
  label: string;
  desc?: string;
}> = ({ enabled, onToggle, label, desc }) => (
  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 gap-3">
    <div className="flex-1 min-w-0">
      <span className="text-[10px] font-bold text-slate-600 uppercase block">{label}</span>
      {desc && <span className="text-[9px] text-slate-400 block mt-0.5 truncate">{desc}</span>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
    >
      <span
        className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`}
      />
    </button>
  </div>
);

export const ModuleParameterConfig: React.FC = () => {
  const { showToast } = useToast();
  const { currentTenantId, tenants, updateTenant } = useSaaS();
  const activeTenant = tenants.find((t) => t.id === currentTenantId);
  const [isSaving, setIsSaving] = useState(false);

  const docConfig = activeTenant?.settings?.documentConfig || {};
  const modParams = (activeTenant?.settings?.moduleParams || {}) as ModuleParams;
  const taxSettings = activeTenant?.settings?.taxSettings || {};

  const s = useCallback(
    <T,>(key: string, fallback: T): T => (modParams[key] ?? fallback) as T,
    [modParams]
  );

  // Document prefixes
  const [ticketPrefix, setTicketPrefix] = useState(docConfig.ticketPrefix || 'TKT');
  const [invoicePrefix, setInvoicePrefix] = useState(docConfig.invoicePrefix || 'INV');
  const [posPrefix, setPosPrefix] = useState(docConfig.posInvoicePrefix || 'POS');
  const [poPrefix, setPoPrefix] = useState(docConfig.purchaseOrderPrefix || 'PO');
  const [paymentPrefix, setPaymentPrefix] = useState(docConfig.paymentPrefix || 'PAY');
  const [refundPrefix, setRefundPrefix] = useState(docConfig.refundPrefix || 'RFN');
  const [stockOpnamePrefix, setStockOpnamePrefix] = useState(docConfig.stockOpnamePrefix || 'SO');

  // Tax & Currency
  const [taxRate, setTaxRate] = useState(taxSettings.taxRate ?? 11);
  const [taxEnabled, setTaxEnabled] = useState(taxSettings.taxEnabled ?? true);
  const [taxInclusive, setTaxInclusive] = useState(taxSettings.taxInclusive ?? false);
  const [currencyCode, setCurrencyCode] = useState(s('currencyCode', 'IDR'));

  // Service & Warranty
  const [warrantyDays, setWarrantyDays] = useState(s('warrantyDays', 30));
  const [autoReminderDays, setAutoReminderDays] = useState(s('autoReminderDays', 7));
  const [enableAutoReminder, setEnableAutoReminder] = useState(s('enableAutoReminder', true));
  const [requireServiceApproval, setRequireServiceApproval] = useState(
    s('requireServiceApproval', true)
  );
  const [requireDownPayment, setRequireDownPayment] = useState(s('requireDownPayment', false));
  const [defaultDownPaymentPercent, setDefaultDownPaymentPercent] = useState(
    s('defaultDownPaymentPercent', 50)
  );
  const [enableTechnicianCommission, setEnableTechnicianCommission] = useState(
    s('enableTechnicianCommission', true)
  );
  const [enableTechnicianRating, setEnableTechnicianRating] = useState(
    s('enableTechnicianRating', false)
  );
  const [enableCustomerFeedback, setEnableCustomerFeedback] = useState(
    s('enableCustomerFeedback', false)
  );
  const [autoCloseResolvedTickets, setAutoCloseResolvedTickets] = useState(
    s('autoCloseResolvedTickets', false)
  );
  const [autoCloseDays, setAutoCloseDays] = useState(s('autoCloseDays', 7));

  // POS & Discount
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState(
    s('defaultPaymentMethod', 'TUNAI')
  );

  // Inventory
  const [stockLowThreshold, setStockLowThreshold] = useState(s('stockLowThreshold', 5));
  const [enableSerialNumberTracking, setEnableSerialNumberTracking] = useState(
    s('enableSerialNumberTracking', false)
  );
  const [enableBatchTracking, setEnableBatchTracking] = useState(s('enableBatchTracking', false));
  const [enableExpiryTracking, setEnableExpiryTracking] = useState(
    s('enableExpiryTracking', false)
  );

  // Module toggles
  const [enableServiceModule, setEnableServiceModule] = useState(s('enableServiceModule', true));
  const [enablePOSModule, setEnablePOSModule] = useState(s('enablePOSModule', true));
  const [enableInventoryModule, setEnableInventoryModule] = useState(
    s('enableInventoryModule', true)
  );
  const [enableHRMModule, setEnableHRMModule] = useState(s('enableHRMModule', true));
  const [enableAccountingModule, setEnableAccountingModule] = useState(
    s('enableAccountingModule', true)
  );
  const [enableCRMModule, setEnableCRMModule] = useState(s('enableCRMModule', true));
  const [enableCustomerPortal, setEnableCustomerPortal] = useState(s('enableCustomerPortal', true));

  useEffect(() => {
    const settings = activeTenant?.settings;
    const mp = (settings?.moduleParams || {}) as ModuleParams;
    const gp = <T,>(key: string, fallback: T): T => (mp[key] ?? fallback) as T;
    const dc = settings?.documentConfig || {};
    const ts = settings?.taxSettings || {};

    setTicketPrefix(dc.ticketPrefix || 'TKT');
    setInvoicePrefix(dc.invoicePrefix || 'INV');
    setPosPrefix(dc.posInvoicePrefix || 'POS');
    setPoPrefix(dc.purchaseOrderPrefix || 'PO');
    setPaymentPrefix(dc.paymentPrefix || 'PAY');
    setRefundPrefix(dc.refundPrefix || 'RFN');
    setStockOpnamePrefix(dc.stockOpnamePrefix || 'SO');

    setTaxRate(ts.taxRate ?? 11);
    setTaxEnabled(ts.taxEnabled ?? true);
    setTaxInclusive(ts.taxInclusive ?? false);
    setCurrencyCode(gp('currencyCode', 'IDR'));

    setWarrantyDays(gp('warrantyDays', 30));
    setAutoReminderDays(gp('autoReminderDays', 7));
    setEnableAutoReminder(gp('enableAutoReminder', true));
    setRequireServiceApproval(gp('requireServiceApproval', true));
    setRequireDownPayment(gp('requireDownPayment', false));
    setDefaultDownPaymentPercent(gp('defaultDownPaymentPercent', 50));
    setEnableTechnicianCommission(gp('enableTechnicianCommission', true));
    setEnableTechnicianRating(gp('enableTechnicianRating', false));
    setEnableCustomerFeedback(gp('enableCustomerFeedback', false));
    setAutoCloseResolvedTickets(gp('autoCloseResolvedTickets', false));
    setAutoCloseDays(gp('autoCloseDays', 7));

    setDefaultPaymentMethod(gp('defaultPaymentMethod', 'TUNAI'));

    setStockLowThreshold(gp('stockLowThreshold', 5));
    setEnableSerialNumberTracking(gp('enableSerialNumberTracking', false));
    setEnableBatchTracking(gp('enableBatchTracking', false));
    setEnableExpiryTracking(gp('enableExpiryTracking', false));

    setEnableServiceModule(gp('enableServiceModule', true));
    setEnablePOSModule(gp('enablePOSModule', true));
    setEnableInventoryModule(gp('enableInventoryModule', true));
    setEnableHRMModule(gp('enableHRMModule', true));
    setEnableAccountingModule(gp('enableAccountingModule', true));
    setEnableCRMModule(gp('enableCRMModule', true));
    setEnableCustomerPortal(gp('enableCustomerPortal', true));
  }, [currentTenantId, activeTenant]);

  const handleSave = async () => {
    if (!updateTenant || !currentTenantId) return;

    const clamp = (v: number, min: number, max: number) =>
      Math.min(max, Math.max(min, Number.isFinite(v) ? Math.trunc(v) : min));
    const prefixRegex = /^[A-Z0-9-]+$/;
    const prefixes = [
      { v: ticketPrefix, label: 'Tiket' },
      { v: invoicePrefix, label: 'Invoice' },
      { v: posPrefix, label: 'POS' },
      { v: poPrefix, label: 'PO' },
      { v: paymentPrefix, label: 'Pembayaran' },
      { v: refundPrefix, label: 'Refund' },
      { v: stockOpnamePrefix, label: 'Stock Opname' },
    ];
    for (const p of prefixes) {
      const clean = p.v.trim().toUpperCase();
      if (!clean || !prefixRegex.test(clean)) {
        showToast(
          `Prefiks ${p.label} tidak valid. Gunakan huruf, angka, atau tanda hubung.`,
          'error'
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      await updateTenant(currentTenantId, {
        settings: {
          ...activeTenant?.settings,
          taxSettings: {
            ...activeTenant?.settings?.taxSettings,
            taxRate: clamp(taxRate, 0, 100),
            taxEnabled,
            taxInclusive,
          },
          documentConfig: {
            ticketPrefix: ticketPrefix.trim().toUpperCase(),
            invoicePrefix: invoicePrefix.trim().toUpperCase(),
            posInvoicePrefix: posPrefix.trim().toUpperCase(),
            purchaseOrderPrefix: poPrefix.trim().toUpperCase(),
            paymentPrefix: paymentPrefix.trim().toUpperCase(),
            refundPrefix: refundPrefix.trim().toUpperCase(),
            stockOpnamePrefix: stockOpnamePrefix.trim().toUpperCase(),
          },
          moduleParams: {
            ...activeTenant?.settings?.moduleParams,
            warrantyDays: clamp(warrantyDays, 0, 365),
            autoReminderDays: clamp(autoReminderDays, 0, 365),
            stockLowThreshold: clamp(stockLowThreshold, 0, 9999),
            enableTechnicianCommission,
            enableAutoReminder,
            enableServiceModule,
            enablePOSModule,
            enableInventoryModule,
            enableHRMModule,
            enableAccountingModule,
            enableCRMModule,
            enableCustomerPortal,
            requireServiceApproval,
            requireDownPayment,
            defaultDownPaymentPercent: clamp(defaultDownPaymentPercent, 0, 100),
            enableTechnicianRating,
            enableCustomerFeedback,
            autoCloseResolvedTickets,
            autoCloseDays: clamp(autoCloseDays, 1, 90),
            enableSerialNumberTracking,
            enableBatchTracking,
            enableExpiryTracking,
            defaultPaymentMethod: defaultPaymentMethod.trim().toUpperCase() || 'TUNAI',
            currencyCode: currencyCode.trim().toUpperCase() || 'IDR',
          },
        },
      });
      showToast('Parameter modul berhasil disimpan!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Parameter modul gagal disimpan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-4 h-4 text-accent" />
            Parameter & Penyesuaian Modul Bisnis
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">
            Konfigurasi variabel global, ambang batas sistem, dan aturan bisnis otomatis tenant{' '}
            {activeTenant?.name}.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Menyimpan...' : 'Simpan Parameter Modul'}
        </button>
      </div>

      {/* === 1. Aktifkan / Nonaktifkan Modul === */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <ToggleLeft className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">Modul Aktif</h4>
        </div>
        <p className="text-[10px] text-slate-500">
          Aktifkan atau nonaktifkan modul bisnis sesuai kebutuhan tenant.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Switch
            enabled={enableServiceModule}
            onToggle={() => setEnableServiceModule(!enableServiceModule)}
            label="Servis & Tiket"
            desc="Modul penerimaan servis, invoice, dan pelacakan"
          />
          <Switch
            enabled={enablePOSModule}
            onToggle={() => setEnablePOSModule(!enablePOSModule)}
            label="Penjualan / POS"
            desc="Modul point of sale dan transaksi tunai"
          />
          <Switch
            enabled={enableInventoryModule}
            onToggle={() => setEnableInventoryModule(!enableInventoryModule)}
            label="Inventori & Gudang"
            desc="Modul stok, barang, dan stock opname"
          />
          <Switch
            enabled={enableHRMModule}
            onToggle={() => setEnableHRMModule(!enableHRMModule)}
            label="SDM / HRM"
            desc="Modul karyawan, absensi, dan penggajian"
          />
          <Switch
            enabled={enableAccountingModule}
            onToggle={() => setEnableAccountingModule(!enableAccountingModule)}
            label="Akuntansi"
            desc="Modul jurnal, buku besar, dan laporan keuangan"
          />
          <Switch
            enabled={enableCRMModule}
            onToggle={() => setEnableCRMModule(!enableCRMModule)}
            label="CRM"
            desc="Modul pelanggan, leads, dan follow-up"
          />
          <Switch
            enabled={enableCustomerPortal}
            onToggle={() => setEnableCustomerPortal(!enableCustomerPortal)}
            label="Portal Pelanggan"
            desc="Portal self-service untuk cek status servis"
          />
        </div>
      </div>

      {/* === 2. Nomor Dokumen & Prefiks === */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
            Nomor Dokumen & Prefiks
          </h4>
        </div>
        <p className="text-[10px] text-slate-500">
          Prefiks otomatis untuk penomoran dokumen. Format: huruf, angka, dan tanda hubung (-).
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Tiket Servis', value: ticketPrefix, set: setTicketPrefix, ph: 'TKT' },
            { label: 'Invoice Servis', value: invoicePrefix, set: setInvoicePrefix, ph: 'INV' },
            { label: 'Penjualan / POS', value: posPrefix, set: setPosPrefix, ph: 'POS' },
            { label: 'Purchase Order', value: poPrefix, set: setPoPrefix, ph: 'PO' },
            { label: 'Pembayaran', value: paymentPrefix, set: setPaymentPrefix, ph: 'PAY' },
            { label: 'Refund', value: refundPrefix, set: setRefundPrefix, ph: 'RFN' },
            {
              label: 'Stock Opname',
              value: stockOpnamePrefix,
              set: setStockOpnamePrefix,
              ph: 'SO',
            },
          ].map((item) => (
            <div key={item.label} className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">{item.label}</label>
              <input
                type="text"
                value={item.value}
                onChange={(e) => item.set(e.target.value)}
                placeholder={item.ph}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:ring-1 focus:ring-accent uppercase"
              />
            </div>
          ))}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Mata Uang</label>
            <input
              type="text"
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              placeholder="IDR"
              maxLength={5}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:ring-1 focus:ring-accent uppercase"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* === 3. Servis & Garansi === */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 bg-accent-lighter text-accent rounded-xl">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
              Servis & Garansi
            </h4>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                  Masa Garansi Default
                </label>
                <span className="text-[10px] font-bold text-accent bg-accent-lighter px-2 py-0.5 rounded">
                  {warrantyDays} Hari
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="365"
                step="1"
                value={warrantyDays}
                onChange={(e) => setWarrantyDays(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-accent"
              />
            </div>
            <Switch
              enabled={enableAutoReminder}
              onToggle={() => setEnableAutoReminder(!enableAutoReminder)}
              label="Auto-Reminder Pick-up"
              desc="Kirim pengingat otomatis ke pelanggan"
            />
            {enableAutoReminder && (
              <div className="space-y-1.5 pl-3 border-l-2 border-accent/20">
                <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                  Kirim Pengingat Setelah (Hari)
                </label>
                <input
                  type="number"
                  value={autoReminderDays}
                  onChange={(e) => setAutoReminderDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-accent font-mono"
                />
              </div>
            )}
            <Switch
              enabled={requireServiceApproval}
              onToggle={() => setRequireServiceApproval(!requireServiceApproval)}
              label="Wajib Persetujuan Estimasi"
              desc="Teknisi harus disetujui sebelum mulai kerja"
            />
            <Switch
              enabled={requireDownPayment}
              onToggle={() => setRequireDownPayment(!requireDownPayment)}
              label="Wajib Uang Muka (DP)"
              desc="Pelanggan harus bayar DP sebelum servis dimulai"
            />
            {requireDownPayment && (
              <div className="space-y-1.5 pl-3 border-l-2 border-accent/20">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                    Default DP (%)
                  </label>
                  <span className="text-[10px] font-bold text-accent bg-accent-lighter px-2 py-0.5 rounded">
                    {defaultDownPaymentPercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={defaultDownPaymentPercent}
                  onChange={(e) => setDefaultDownPaymentPercent(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-accent"
                />
              </div>
            )}
            <Switch
              enabled={enableTechnicianCommission}
              onToggle={() => setEnableTechnicianCommission(!enableTechnicianCommission)}
              label="Hitung Komisi Teknisi"
              desc="Aktifkan perhitungan komisi otomatis"
            />
            <Switch
              enabled={enableTechnicianRating}
              onToggle={() => setEnableTechnicianRating(!enableTechnicianRating)}
              label="Rating Teknisi"
              desc="Aktifkan penilaian rating dari pelanggan"
            />
            <Switch
              enabled={enableCustomerFeedback}
              onToggle={() => setEnableCustomerFeedback(!enableCustomerFeedback)}
              label="Feedback Pelanggan"
              desc="Aktifkan form feedback setelah servis selesai"
            />
            <Switch
              enabled={autoCloseResolvedTickets}
              onToggle={() => setAutoCloseResolvedTickets(!autoCloseResolvedTickets)}
              label="Auto-Close Tiket Selesai"
              desc="Tutup otomatis tiket yang sudah resolved"
            />
            {autoCloseResolvedTickets && (
              <div className="space-y-1.5 pl-3 border-l-2 border-accent/20">
                <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                  Tutup Setelah (Hari)
                </label>
                <input
                  type="number"
                  value={autoCloseDays}
                  onChange={(e) => setAutoCloseDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-accent font-mono"
                />
              </div>
            )}
          </div>
        </div>

        {/* === 4. Perpajakan & Valuta === */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Percent className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
              Perpajakan & Valuta
            </h4>
          </div>
          <div className="space-y-3">
            <Switch
              enabled={taxEnabled}
              onToggle={() => setTaxEnabled(!taxEnabled)}
              label="Pajak Aktif (PPN)"
              desc="Aktifkan perhitungan pajak pada transaksi"
            />
            {taxEnabled && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                    Default PPN / Tax (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-accent font-mono font-bold"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      %
                    </span>
                  </div>
                </div>
                <Switch
                  enabled={taxInclusive}
                  onToggle={() => setTaxInclusive(!taxInclusive)}
                  label="Harga Termasuk Pajak"
                  desc="Jika aktif, harga jual sudah include PPN"
                />
              </>
            )}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                Mata Uang Default
              </label>
              <input
                type="text"
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-accent font-mono font-bold uppercase"
              />
            </div>
          </div>
        </div>

        {/* === 5. POS & Diskon === */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
              Penjualan / POS
            </h4>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                Metode Pembayaran Default
              </label>
              <div className="relative">
                <select
                  value={defaultPaymentMethod}
                  onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 pr-8 text-xs outline-none transition-all focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/10"
                >
                  <option value="TUNAI">TUNAI</option>
                  <option value="TRANSFER">TRANSFER</option>
                  <option value="QRIS">QRIS</option>
                  <option value="KARTU_KREDIT">KARTU KREDIT</option>
                  <option value="KARTU_DEBIT">KARTU DEBIT</option>
                  <option value="E_WALLET">E-WALLET</option>
                  <option value="KREDIT">KREDIT (Piutang)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* === 6. Inventori & Gudang === */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
              Inventori & Gudang
            </h4>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                Batas Stok Rendah (Critical)
              </label>
              <input
                type="number"
                value={stockLowThreshold}
                onChange={(e) => setStockLowThreshold(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-accent font-mono font-bold"
              />
              <p className="text-[9px] text-slate-400">
                Peringatan otomatis jika stok di bawah angka ini.
              </p>
            </div>
            <Switch
              enabled={enableSerialNumberTracking}
              onToggle={() => setEnableSerialNumberTracking(!enableSerialNumberTracking)}
              label="Pelacakan Nomor Seri"
              desc="Wajibkan nomor seri untuk setiap item"
            />
            <Switch
              enabled={enableBatchTracking}
              onToggle={() => setEnableBatchTracking(!enableBatchTracking)}
              label="Pelacakan Batch / Lot"
              desc="Aktifkan pelacakan per batch produksi"
            />
            <Switch
              enabled={enableExpiryTracking}
              onToggle={() => setEnableExpiryTracking(!enableExpiryTracking)}
              label="Pelacakan Kedaluwarsa"
              desc="Aktifkan alert untuk barang kedaluwarsa"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
