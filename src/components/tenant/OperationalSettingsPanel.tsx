/**
 * Operational Settings Panel
 * Covers: Service, POS & Kasir, Stok & Pembelian, Keuangan & Accounting, HRM
 * All settings persist via updateTenant -> PUT /api/tenant/settings/:domain
 */
import React, { useState } from 'react';
import {
  Wrench,
  ShoppingCart,
  Package,
  Calculator,
  Users,
  Save,
  RefreshCw,
  X,
  Plus,
  MapPin,
  BookOpen,
} from 'lucide-react';
import { useSaaS } from '../../context/SaaSContext';
import { useToast } from '../ui/Toast';

type OperationalSectionKey = 'service' | 'pos' | 'stok' | 'accounting' | 'hr';

interface Props {
  currentTenantId: string;
  tenantObj: any;
  updateTenant: (id: string, updates: any) => Promise<void> | void;
}

export const OperationalSettingsPanel: React.FC<Props> = ({
  currentTenantId,
  tenantObj,
  updateTenant,
}) => {
  const { showToast } = useToast();
  const { warehouses, accounts, currentBranchId } = useSaaS();
  const [isSaving, setIsSaving] = useState(false);
  const s = tenantObj?.settings || {};
  const [activeSection, setActiveSection] = useState<OperationalSectionKey>('service');

  // ── Service ──
  const [diagFee, setDiagFee] = useState(s.serviceSettings?.defaultDiagnosisFee ?? 25000);
  const [requireEstApprove, setRequireEstApprove] = useState(
    s.serviceSettings?.requireEstimateApproval ?? true
  );
  const [allowProceedNoApprove, setAllowProceedNoApprove] = useState(
    s.serviceSettings?.allowProceedWithoutApproval ?? false
  );
  const [slaHours, setSlaHours] = useState(s.serviceSettings?.slaHours ?? 48);
  const [autoAssign, setAutoAssign] = useState(s.serviceSettings?.autoAssignTechnician ?? false);

  // ── POS ──
  const [maxDiscount, setMaxDiscount] = useState(s.posSettings?.maxDiscount ?? 50);
  const [allowNegStock, setAllowNegStock] = useState(s.posSettings?.allowNegativeStock ?? false);
  const [voidApprove, setVoidApprove] = useState(s.posSettings?.requireVoidApproval ?? true);
  const [closeCash, setCloseCash] = useState(s.posSettings?.requireCloseCash ?? true);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(
    s.posSettings?.paymentMethods || [
      'TUNAI',
      'TRANSFER',
      'QRIS',
      'KARTU_KREDIT',
      'KARTU_DEBIT',
      'E_WALLET',
    ]
  );
  const [newPaymentMethod, setNewPaymentMethod] = useState('');

  // ── Inventory ──
  const [hppMethod, setHppMethod] = useState(s.inventorySettings?.hppMethod ?? 'FIFO');
  const [stockAlert, setStockAlert] = useState(s.inventorySettings?.enableStockAlert ?? true);
  const [adjustApprove, setAdjustApprove] = useState(
    s.inventorySettings?.requireAdjustmentApproval ?? true
  );
  const [defaultWarehouseId, setDefaultWarehouseId] = useState(
    s.inventorySettings?.defaultWarehouseId || ''
  );

  // ── Accounting ──
  const [autoJournal, setAutoJournal] = useState(s.accountingSettings?.autoJournalEnabled ?? true);
  const [defaultCashAccountId, setDefaultCashAccountId] = useState(
    s.accountingSettings?.defaultCashAccountId || ''
  );
  const [defaultBankAccountId, setDefaultBankAccountId] = useState(
    s.accountingSettings?.defaultBankAccountId || ''
  );
  const [defaultSalesAccountId, setDefaultSalesAccountId] = useState(
    s.accountingSettings?.defaultSalesAccountId || ''
  );
  const [defaultHppAccountId, setDefaultHppAccountId] = useState(
    s.accountingSettings?.defaultHppAccountId || ''
  );
  const [defaultInventoryAccountId, setDefaultInventoryAccountId] = useState(
    s.accountingSettings?.defaultInventoryAccountId || ''
  );
  const [defaultReceivableAccountId, setDefaultReceivableAccountId] = useState(
    s.accountingSettings?.defaultReceivableAccountId || ''
  );
  const [defaultPayableAccountId, setDefaultPayableAccountId] = useState(
    s.accountingSettings?.defaultPayableAccountId || ''
  );

  // ── HRM ──
  const [workHours, setWorkHours] = useState(s.hrmSettings?.defaultWorkHours ?? 8);
  const [graceLate, setGraceLate] = useState(s.hrmSettings?.graceLateMinutes ?? 15);
  const [enableOvertime, setEnableOvertime] = useState(s.hrmSettings?.enableOvertime ?? true);
  const [overtimeRate, setOvertimeRate] = useState(s.hrmSettings?.overtimeRate ?? 1.5);

  // ── Filtered data ──
  const tenantWarehouses = warehouses.filter((w) => w.tenantId === currentTenantId);
  const tenantAccounts = accounts.filter((a) => a.tenantId === currentTenantId && !a.isGroup);
  const assetAccounts = tenantAccounts.filter((a) => a.type === 'ASSET');
  const revenueAccounts = tenantAccounts.filter((a) => a.type === 'REVENUE');
  const expenseAccounts = tenantAccounts.filter((a) => a.type === 'EXPENSE');
  const liabilityAccounts = tenantAccounts.filter((a) => a.type === 'LIABILITY');

  const handleSave = async () => {
    if (!updateTenant || !currentTenantId) return;

    const clamp = (v: number, min: number, max: number) =>
      Math.min(max, Math.max(min, Number.isFinite(v) ? Math.trunc(v) : min));

    const safeDiagFee = clamp(diagFee, 0, 100_000_000);
    const safeSlaHours = clamp(slaHours, 1, 720);
    const safeMaxDiscount = clamp(maxDiscount, 0, 100);
    const safeWorkHours = clamp(workHours, 1, 24);
    const safeGraceLate = clamp(graceLate, 0, 1440);
    const safeOvertimeRate = Math.min(
      10,
      Math.max(1, Number.isFinite(overtimeRate) ? overtimeRate : 1)
    );

    setIsSaving(true);
    try {
      const settingsMap: Record<OperationalSectionKey, any> = {
        service: {
          serviceSettings: {
            defaultDiagnosisFee: safeDiagFee,
            requireEstimateApproval: requireEstApprove,
            allowProceedWithoutApproval: allowProceedNoApprove,
            slaHours: safeSlaHours,
            autoAssignTechnician: autoAssign,
          },
        },
        pos: {
          posSettings: {
            maxDiscount: safeMaxDiscount,
            allowNegativeStock: allowNegStock,
            requireVoidApproval: voidApprove,
            requireCloseCash: closeCash,
            paymentMethods,
          },
        },
        stok: {
          inventorySettings: {
            hppMethod,
            requireAdjustmentApproval: adjustApprove,
            enableStockAlert: stockAlert,
            defaultWarehouseId: defaultWarehouseId || undefined,
          },
        },
        accounting: {
          accountingSettings: {
            autoJournalEnabled: autoJournal,
            defaultCashAccountId: defaultCashAccountId || undefined,
            defaultBankAccountId: defaultBankAccountId || undefined,
            defaultSalesAccountId: defaultSalesAccountId || undefined,
            defaultHppAccountId: defaultHppAccountId || undefined,
            defaultInventoryAccountId: defaultInventoryAccountId || undefined,
            defaultReceivableAccountId: defaultReceivableAccountId || undefined,
            defaultPayableAccountId: defaultPayableAccountId || undefined,
          },
        },
        hr: {
          hrmSettings: {
            defaultWorkHours: safeWorkHours,
            graceLateMinutes: safeGraceLate,
            enableOvertime,
            overtimeRate: safeOvertimeRate,
          },
        },
      };
      await updateTenant(currentTenantId, {
        settings: {
          ...settingsMap.service,
          ...settingsMap.pos,
          ...settingsMap.stok,
          ...settingsMap.accounting,
          ...settingsMap.hr,
        },
      });
      showToast('Pengaturan operasional berhasil disimpan!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Pengaturan operasional gagal disimpan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggle = (val: boolean, setter: (v: boolean) => void) => setter(!val);

  const Toggle = ({ val, onToggle }: { val: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`relative w-10 h-5 rounded-full transition-colors ${
        val ? 'bg-emerald-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
          val ? 'translate-x-5' : ''
        }`}
      />
    </button>
  );

  const Label = ({ text, sub }: { text: string; sub?: string }) => (
    <div>
      <label className="text-[10px] font-bold text-slate-500 uppercase">{text}</label>
      {sub && <p className="text-[9px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );

  const Select = ({
    val,
    onChange,
    children,
  }: {
    val: string;
    onChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      value={val}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent bg-white"
    >
      {children}
    </select>
  );

  const NumInput = ({
    val,
    onChange,
    min,
    max,
    step,
  }: {
    val: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    step?: number;
  }) => (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={val}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
    />
  );

  const AccountSelect = ({
    label,
    value,
    onChange,
    filter,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    filter: typeof tenantAccounts;
  }) => (
    <div className="space-y-1">
      <Label text={label} />
      <Select val={value} onChange={onChange}>
        <option value="">-- Pilih Akun --</option>
        {filter.map((a) => (
          <option key={a.id} value={a.id}>
            {a.code} - {a.name}
          </option>
        ))}
      </Select>
    </div>
  );

  const sections: Array<{
    id: OperationalSectionKey;
    label: string;
    icon: any;
    color: string;
  }> = [
    { id: 'service', label: 'Servis', icon: Wrench, color: 'indigo' },
    {
      id: 'pos',
      label: 'POS & Kasir',
      icon: ShoppingCart,
      color: 'emerald',
    },
    {
      id: 'stok',
      label: 'Stok & Pembelian',
      icon: Package,
      color: 'amber',
    },
    {
      id: 'accounting',
      label: 'Keuangan & Akuntansi',
      icon: Calculator,
      color: 'blue',
    },
    { id: 'hr', label: 'HRM & Payroll', icon: Users, color: 'violet' },
  ];

  const renderSwitch = () => {
    switch (activeSection) {
      case 'service':
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label
                text="Biaya Diagnosis Default (Rp)"
                sub="Fee yang ditampilkan saat teknisi mengisi form diagnosis awal."
              />
              <NumInput val={diagFee} onChange={setDiagFee} min={0} step={5000} />
            </div>
            <div className="space-y-1">
              <Label
                text="SLA Default (Jam)"
                sub="Batas waktu penyelesaian servis sebelum dianggap terlambat."
              />
              <NumInput val={slaHours} onChange={setSlaHours} min={1} max={720} />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-600 uppercase">
                  Wajib Approve Estimasi
                </span>
                <p className="text-[9px] text-slate-400">
                  Pelanggan harus menyetujui estimasi biaya sebelum teknisi mulai kerja.
                </p>
              </div>
              <Toggle
                val={requireEstApprove}
                onToggle={() => toggle(requireEstApprove, setRequireEstApprove)}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-600 uppercase">
                  Boleh Proses Tanpa Approval
                </span>
                <p className="text-[9px] text-slate-400">
                  Teknisi boleh melanjutkan servis meskipun estimasi belum disetujui.
                </p>
              </div>
              <Toggle
                val={allowProceedNoApprove}
                onToggle={() => toggle(allowProceedNoApprove, setAllowProceedNoApprove)}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-600 uppercase">
                  Assign Teknisi Otomatis
                </span>
                <p className="text-[9px] text-slate-400">
                  Secara otomatis menugaskan teknisi yang tersedia saat tiket baru dibuat.
                </p>
              </div>
              <Toggle val={autoAssign} onToggle={() => toggle(autoAssign, setAutoAssign)} />
            </div>
          </div>
        );

      case 'pos':
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label
                text="Diskon Maksimal (%)"
                sub="Batas maksimum diskon yang dapat diberikan kasir per transaksi."
              />
              <NumInput val={maxDiscount} onChange={setMaxDiscount} min={0} max={100} />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-600 uppercase">
                  Boleh Stok Negatif
                </span>
                <p className="text-[9px] text-slate-400">
                  Izinkan penjualan meskipun stok produk habis.
                </p>
              </div>
              <Toggle
                val={allowNegStock}
                onToggle={() => toggle(allowNegStock, setAllowNegStock)}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-600 uppercase">
                  Void / Refund Butuh Approval
                </span>
                <p className="text-[9px] text-slate-400">
                  Pembatalan atau pengembalian uang memerlukan persetujuan admin/owner.
                </p>
              </div>
              <Toggle val={voidApprove} onToggle={() => toggle(voidApprove, setVoidApprove)} />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-600 uppercase">
                  Closing Kas Wajib
                </span>
                <p className="text-[9px] text-slate-400">
                  Kasir harus melakukan closing kas di akhir hari sebelum dapat login kembali.
                </p>
              </div>
              <Toggle val={closeCash} onToggle={() => toggle(closeCash, setCloseCash)} />
            </div>
            <div className="space-y-1.5">
              <Label
                text="Metode Pembayaran Tersedia"
                sub="Daftar metode pembayaran yang muncul di form kasir."
              />
              <div className="flex flex-wrap gap-1.5 mb-2">
                {paymentMethods.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-1 rounded-lg"
                  >
                    {m}
                    <button
                      onClick={() => setPaymentMethods(paymentMethods.filter((x) => x !== m))}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPaymentMethod}
                  onChange={(e) => setNewPaymentMethod(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newPaymentMethod.trim()) {
                      e.preventDefault();
                      if (!paymentMethods.includes(newPaymentMethod.trim())) {
                        setPaymentMethods([...paymentMethods, newPaymentMethod.trim()]);
                      }
                      setNewPaymentMethod('');
                    }
                  }}
                  placeholder="Tambah metode..."
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent uppercase"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (
                      newPaymentMethod.trim() &&
                      !paymentMethods.includes(newPaymentMethod.trim())
                    ) {
                      setPaymentMethods([...paymentMethods, newPaymentMethod.trim()]);
                      setNewPaymentMethod('');
                    }
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );

      case 'stok':
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label
                text="Metode HPP (Harga Pokok Penjualan)"
                sub="Menentukan cara penghitungan modal barang yang terjual."
              />
              <Select val={hppMethod} onChange={setHppMethod}>
                <option value="FIFO">FIFO (First In First Out)</option>
                <option value="LIFO">LIFO (Last In First Out)</option>
                <option value="AVG">Rata-rata (Average)</option>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-600 uppercase">
                  Alert Stok Rendah
                </span>
                <p className="text-[9px] text-slate-400">
                  Tampilkan notifikasi when stok produk mencapai batas minimum.
                </p>
              </div>
              <Toggle val={stockAlert} onToggle={() => toggle(stockAlert, setStockAlert)} />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-600 uppercase">
                  Adjustment Stok Butuh Approval
                </span>
                <p className="text-[9px] text-slate-400">
                  Setiap perubahan stok manual harus disetujui admin.
                </p>
              </div>
              <Toggle
                val={adjustApprove}
                onToggle={() => toggle(adjustApprove, setAdjustApprove)}
              />
            </div>
            <div className="space-y-1">
              <Label
                text="Gudang Default"
                sub="Gudang yang digunakan sebagai fallback untuk transaksi POS."
              />
              <Select val={defaultWarehouseId} onChange={setDefaultWarehouseId}>
                <option value="">-- Pilih Gudang --</option>
                {tenantWarehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                    {w.location ? ` (${w.location})` : ''}
                  </option>
                ))}
              </Select>
              {tenantWarehouses.length === 0 && (
                <p className="text-[9px] text-amber-500">
                  Belum ada gudang. Buat gudang terlebih dahulu di menu Inventori.
                </p>
              )}
            </div>
          </div>
        );

      case 'accounting':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-600 uppercase">
                  Auto Jurnal Aktif
                </span>
                <p className="text-[9px] text-slate-400">
                  Setiap transaksi POS, servis, pembelian, dan payroll akan otomatis membuat jurnal
                  di Accounting.
                </p>
              </div>
              <Toggle val={autoJournal} onToggle={() => toggle(autoJournal, setAutoJournal)} />
            </div>
            {tenantAccounts.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                <BookOpen className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-amber-700">Belum ada Chart of Accounts</p>
                <p className="text-[10px] text-amber-600 mt-1">
                  Buat akun-akun di menu Akuntansi terlebih dahulu untuk mengatur default account.
                </p>
              </div>
            ) : (
              <>
                <p className="text-[10px] font-bold text-slate-500 uppercase border-b border-slate-100 pb-2">
                  Akun Default Transaksi
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <AccountSelect
                    label="Akun Kas"
                    value={defaultCashAccountId}
                    onChange={setDefaultCashAccountId}
                    filter={assetAccounts.filter(
                      (a) => a.name.toLowerCase().includes('kas') || a.code.startsWith('101')
                    )}
                  />
                  <AccountSelect
                    label="Akun Bank"
                    value={defaultBankAccountId}
                    onChange={setDefaultBankAccountId}
                    filter={assetAccounts.filter(
                      (a) => a.name.toLowerCase().includes('bank') || a.code.startsWith('102')
                    )}
                  />
                  <AccountSelect
                    label="Akun Pendapatan"
                    value={defaultSalesAccountId}
                    onChange={setDefaultSalesAccountId}
                    filter={revenueAccounts}
                  />
                  <AccountSelect
                    label="Akun HPP / Beban Pokok"
                    value={defaultHppAccountId}
                    onChange={setDefaultHppAccountId}
                    filter={expenseAccounts.filter(
                      (a) =>
                        a.name.toLowerCase().includes('hpp') ||
                        a.name.toLowerCase().includes('beban pokok')
                    )}
                  />
                  <AccountSelect
                    label="Akun Inventori / Persediaan"
                    value={defaultInventoryAccountId}
                    onChange={setDefaultInventoryAccountId}
                    filter={assetAccounts.filter(
                      (a) =>
                        a.name.toLowerCase().includes('persediaan') ||
                        a.name.toLowerCase().includes('inventori') ||
                        a.code.startsWith('103')
                    )}
                  />
                  <AccountSelect
                    label="Akun Piutang"
                    value={defaultReceivableAccountId}
                    onChange={setDefaultReceivableAccountId}
                    filter={assetAccounts.filter(
                      (a) => a.name.toLowerCase().includes('piutang') || a.code.startsWith('104')
                    )}
                  />
                  <AccountSelect
                    label="Akun Hutang"
                    value={defaultPayableAccountId}
                    onChange={setDefaultPayableAccountId}
                    filter={liabilityAccounts.filter(
                      (a) => a.name.toLowerCase().includes('hutang') || a.code.startsWith('201')
                    )}
                  />
                </div>
              </>
            )}
          </div>
        );

      case 'hr':
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label
                text="Jam Kerja Default per Hari"
                sub="Jam kerja normal yang digunakan untuk menghitung kehadiran dan lembur."
              />
              <NumInput val={workHours} onChange={setWorkHours} min={1} max={24} step={0.5} />
            </div>
            <div className="space-y-1">
              <Label
                text="Toleransi Keterlambatan (Menit)"
                sub="Karyawan dianggap terlambat jika melebihi batas ini setelah jam masuk."
              />
              <NumInput val={graceLate} onChange={setGraceLate} min={0} max={1440} />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-600 uppercase">
                  Aktifkan Lembur
                </span>
                <p className="text-[9px] text-slate-400">
                  Izinkan pencatatan jam lembur dan perhitungan upah lembur otomatis.
                </p>
              </div>
              <Toggle
                val={enableOvertime}
                onToggle={() => toggle(enableOvertime, setEnableOvertime)}
              />
            </div>
            {enableOvertime && (
              <div className="space-y-1 pl-3 border-l-2 border-emerald-300">
                <Label
                  text="Rate Lembur (x Jam Normal)"
                  sub="Mengali jam lembur. Contoh: 1.5 = 1.5x upah per jam."
                />
                <NumInput
                  val={overtimeRate}
                  onChange={setOvertimeRate}
                  min={1}
                  max={10}
                  step={0.25}
                />
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn dark:text-zinc-300 dark:[&_.bg-white]:bg-zinc-950 dark:[&_.bg-slate-50]:bg-zinc-900 dark:[&_.border-slate-100]:border-zinc-800 dark:[&_.border-slate-200]:border-zinc-800 dark:[&_.text-slate-800]:text-zinc-100 dark:[&_.text-slate-700]:text-zinc-200 dark:[&_.text-slate-600]:text-zinc-300 dark:[&_input]:bg-zinc-950 dark:[&_input]:text-zinc-100 dark:[&_select]:bg-zinc-950 dark:[&_select]:text-zinc-100 dark:[&_.hover\:bg-slate-50:hover]:bg-zinc-900">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Wrench className="w-4 h-4 text-accent" /> Pengaturan Operasional
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">
            Konfigurasi parameter detail servis, POS, stok, akuntansi, dan HRM.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left sidebar: section tabs */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-1">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const colorStyles: Record<string, string> = {
              indigo: 'bg-accent-lighter text-accent border-indigo-200',
              emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              amber: 'bg-amber-50 text-amber-700 border-amber-200',
              blue: 'bg-blue-50 text-blue-700 border-blue-200',
              violet: 'bg-violet-50 text-violet-700 border-violet-200',
            };
            const activeStyle =
              colorStyles[sec.color] || 'bg-slate-50 text-slate-700 border-slate-200';
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer border ${
                  activeSection === sec.id
                    ? activeStyle
                    : 'text-slate-600 hover:bg-slate-50 border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" /> {sec.label}
              </button>
            );
          })}
        </div>
        {/* Right content */}
        <div className="lg:col-span-9 bg-white border border-slate-200 rounded-xl p-6 shadow-sm min-h-[300px]">
          {renderSwitch()}
        </div>
      </div>
    </div>
  );
};
