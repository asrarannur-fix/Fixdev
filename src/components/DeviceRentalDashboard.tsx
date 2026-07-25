import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSaaS } from '../context/SaaSContext';
import { useToast } from './ui/Toast';
import { usePrintConfig } from '../hooks/usePrintConfig';
import { printFrame } from '../utils/printJob';
import {
  getPrintFontSizePx,
  getPrintHeaderHtml,
  getPrintFooterHtml,
  getPrintTermsHtml,
} from '../utils/print';
import {
  Smartphone,
  Calendar,
  DollarSign,
  Clock,
  User,
  PlusCircle,
  RotateCcw,
  CheckCircle,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  Search,
  BookOpen,
  Loader2,
  XCircle,
  Package,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import {
  useRentalApi,
  RentalCatalogItem,
  RentalDevice,
  RentalContract,
  RentalStats,
  OverdueContract,
} from '../hooks/useRentalApi';

interface RentalFormData {
  customerName: string;
  deviceIndex: number;
  rentDays: number;
  customDeposit: string;
}

export const DeviceRentalDashboard: React.FC = () => {
  const { currentTenantId, currentBranchId, addJournalEntry, addLog, customers, tenants } =
    useSaaS();

  const { showToast } = useToast();
  const activeTenant = tenants.find((tenant) => tenant.id === currentTenantId);
  const businessName = activeTenant?.name || 'Layanan Penyewaan Perangkat';
  const logoUrl = activeTenant?.branding?.logoUrl;
  const printConfig = usePrintConfig();

  // Scoped customers
  const tenantCustomers = useMemo(() => {
    return customers.filter((c) => c.tenantId === currentTenantId);
  }, [customers, currentTenantId]);

  // API hook
  const {
    loading,
    error,
    listCatalog,
    listDevices,
    listContracts,
    getRentalStats,
    getOverdueContracts,
    createContract,
    returnContract,
    extendContract,
    cancelContract,
    createDevice,
    createInspection,
  } = useRentalApi();

  // State
  const [catalog, setCatalog] = useState<RentalCatalogItem[]>([]);
  const [devices, setDevices] = useState<RentalDevice[]>([]);
  const [contracts, setContracts] = useState<RentalContract[]>([]);
  const [stats, setStats] = useState<RentalStats | null>(null);
  const [overdueContracts, setOverdueContracts] = useState<OverdueContract[]>([]);

  // Form input state
  const [formData, setFormData] = useState<RentalFormData>({
    customerName: '',
    deviceIndex: 0,
    rentDays: 3,
    customDeposit: '',
  });

  // Return/Damage state
  const [returningContract, setReturningContract] = useState<RentalContract | null>(null);
  const [damageDeductionInput, setDamageDeductionInput] = useState('');
  const [damageNotes, setDamageNotes] = useState('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Load all data on mount
  const loadAllData = useCallback(async () => {
    try {
      const [catalogRes, devicesRes, contractsRes, statsRes, overdueRes] = await Promise.all([
        listCatalog({ active: true }),
        listDevices(),
        listContracts({ limit: 50 }),
        getRentalStats(),
        getOverdueContracts(),
      ]);
      setCatalog(catalogRes.data || []);
      setDevices(devicesRes.data || []);
      setContracts(contractsRes.data || []);
      setStats(statsRes.data || null);
      setOverdueContracts(overdueRes.data || []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memuat data rental', 'error');
    }
  }, [listCatalog, listDevices, listContracts, getRentalStats, getOverdueContracts, showToast]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Active device from catalog
  const activeCatalogDevice = catalog[formData.deviceIndex];

  // Available devices for selected catalog item
  const availableDevices = useMemo(() => {
    if (!activeCatalogDevice) return [];
    return devices.filter(
      (d) => d.catalog_id === activeCatalogDevice.id && d.status === 'AVAILABLE'
    );
  }, [devices, activeCatalogDevice]);

  const calculatedTotal = activeCatalogDevice
    ? activeCatalogDevice.daily_rate * formData.rentDays
    : 0;
  const calculatedDeposit = formData.customDeposit
    ? Number(formData.customDeposit)
    : activeCatalogDevice
      ? activeCatalogDevice.deposit_amount
      : 0;

  // Stats from API (fallback to computed)
  const activeCount =
    stats?.active_contracts ?? contracts.filter((r) => r.status === 'ACTIVE').length;
  const overdueCount =
    stats?.overdue_contracts ?? contracts.filter((r) => r.status === 'OVERDUE').length;
  const totalRevenue = stats?.total_revenue ?? contracts.reduce((sum, r) => sum + r.total_rent, 0);

  // Filtered contracts list
  const filteredContracts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return contracts.filter(
      (r) =>
        r.customer_name.toLowerCase().includes(q) ||
        r.device_name.toLowerCase().includes(q) ||
        r.contract_number.toLowerCase().includes(q)
    );
  }, [contracts, searchQuery]);

  // Handle New Rental Contract
  const handleCreateRental = async () => {
    if (!formData.customerName.trim()) {
      showToast('Mohon pilih atau masukkan nama pelanggan!', 'error');
      return;
    }
    if (formData.rentDays <= 0) {
      showToast('Durasi sewa minimal 1 hari!', 'error');
      return;
    }
    if (!activeCatalogDevice) {
      showToast('Pilih perangkat terlebih dahulu!', 'error');
      return;
    }
    if (availableDevices.length === 0) {
      showToast('Tidak ada unit tersedia untuk perangkat ini!', 'error');
      return;
    }

    const selectedDevice = availableDevices[0]; // Auto-pick first available
    const safeRentDays = Math.max(1, Math.floor(Number(formData.rentDays) || 1));
    const safeDeposit = Math.max(0, Number(calculatedDeposit) || 0);
    const safeTotal = Math.max(0, activeCatalogDevice.daily_rate * safeRentDays);
    const cleanCustomerName = formData.customerName.trim();

    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + safeRentDays);

    try {
      // Create contract via API
      const contractRes = await createContract({
        customer_id: '', // Will be matched by name or created
        device_id: selectedDevice.id,
        start_date: start.toISOString().split('T')[0],
        duration_days: safeRentDays,
        daily_rate: activeCatalogDevice.daily_rate,
        deposit_amount: safeDeposit,
        notes: `Pelanggan: ${cleanCustomerName}`,
      });

      const newContract = contractRes.data;

      // Also create pre-rental inspection
      await createInspection({
        contract_id: newContract.id,
        inspection_type: 'PRE_RENTAL',
        condition_rating: 'GOOD',
        checklist_items: {
          'Kondisi fisik': true,
          'Fungsi dasar': true,
          'Aksesoris lengkap': true,
        },
        notes: 'Pemeriksaan sebelum disewakan',
      });

      // Update local state
      setContracts((prev) => [newContract, ...prev]);
      await loadAllData(); // Refresh stats

      // Double-entry accounting:
      // Debit: Kas Terminal (10100) -> Rent Cost + Deposit
      // Credit: Pendapatan Sewa (40300) -> Rent Cost
      // Credit: Kewajiban Titipan Deposit (20200) -> Deposit
      addJournalEntry(
        newContract.id,
        `Sewa Perangkat: ${activeCatalogDevice.name} oleh ${cleanCustomerName} (${safeRentDays} Hari)`,
        [
          {
            accountId: `coa-${currentTenantId}-10100`,
            debit: safeTotal + safeDeposit,
            credit: 0,
          },
          {
            accountId: `coa-${currentTenantId}-40300`,
            debit: 0,
            credit: safeTotal,
          },
          {
            accountId: `coa-${currentTenantId}-20200`,
            debit: 0,
            credit: safeDeposit,
          },
        ]
      );

      addLog(
        'Create Rental',
        `Penyewaan ${activeCatalogDevice.name} kepada ${cleanCustomerName} senilai Rp ${safeTotal.toLocaleString()} + Deposit Rp ${safeDeposit.toLocaleString()}`,
        'SALES',
        'LOW'
      );

      handlePrintRentalContract(newContract);

      // Reset form
      setFormData({ customerName: '', deviceIndex: 0, rentDays: 3, customDeposit: '' });
      showToast('Kontrak sewa berhasil dibuat!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal membuat kontrak sewa', 'error');
    }
  };

  // Handle Return & Liquidate Deposit
  const handleProcessReturn = async () => {
    if (!returningContract) return;

    const damageAmt = Math.min(
      returningContract.deposit_amount,
      Math.max(0, damageDeductionInput ? Number(damageDeductionInput) || 0 : 0)
    );
    if (damageAmt > returningContract.deposit_amount) {
      showToast('Denda kerusakan tidak boleh melebihi nilai deposit penjamin!', 'error');
      return;
    }

    const netDepositRefund = returningContract.deposit_amount - damageAmt;

    try {
      await returnContract({
        contract_id: returningContract.id,
        damage_deduction: damageAmt,
        damage_notes: damageNotes,
        actual_return_date: new Date().toISOString().split('T')[0],
      });

      // Update local state
      setContracts((prev) =>
        prev.map((r) => {
          if (r.id === returningContract.id) {
            return {
              ...r,
              status: 'RETURNED',
              damage_deduction: damageAmt,
              damage_notes: damageNotes,
              actual_return_date: new Date().toISOString().split('T')[0],
            };
          }
          return r;
        })
      );

      await loadAllData(); // Refresh stats

      // Post Double Entry Journal:
      // Debit: Kewajiban Titipan Deposit (20200) -> Full Deposit Amount
      // Credit: Kas Terminal (10100) -> Net Refund
      // Credit: Pendapatan Lain-lain Kerusakan (40200) -> Damage Deduction (if any)
      const entries = [
        {
          accountId: `coa-${currentTenantId}-20200`,
          debit: returningContract.deposit_amount,
          credit: 0,
        },
      ];
      if (netDepositRefund > 0) {
        entries.push({
          accountId: `coa-${currentTenantId}-10100`,
          debit: 0,
          credit: netDepositRefund,
        });
      }
      if (damageAmt > 0) {
        entries.push({
          accountId: `coa-${currentTenantId}-40200`,
          debit: 0,
          credit: damageAmt,
        });
      }

      addJournalEntry(
        `RET-${returningContract.id}`,
        `Pengembalian Sewa & Pengembalian Deposit untuk ${returningContract.id} (${returningContract.customer_name}). Denda: Rp ${damageAmt.toLocaleString()}`,
        entries
      );

      addLog(
        'Return Rental',
        `Pengembalian perangkat sewa ${returningContract.device_name} dari ${returningContract.customer_name}. Denda Kerusakan: Rp ${damageAmt.toLocaleString()}, Refund Deposit: Rp ${netDepositRefund.toLocaleString()}`,
        'SALES',
        'LOW'
      );

      handlePrintReturnReceipt(returningContract, damageAmt, damageNotes);
      showToast('Pengembalian berhasil diproses!', 'success');

      setReturningContract(null);
      setDamageDeductionInput('');
      setDamageNotes('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memproses pengembalian', 'error');
    }
  };

  const handleExtendContract = async (contract: RentalContract) => {
    const additionalDays = prompt('Tambah berapa hari?');
    if (!additionalDays || isNaN(Number(additionalDays))) return;

    try {
      await extendContract({ contract_id: contract.id, additional_days: Number(additionalDays) });
      await loadAllData();
      showToast('Kontrak berhasil diperpanjang!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memperpanjang kontrak', 'error');
    }
  };

  const handleCancelContract = async (contract: RentalContract) => {
    if (!confirm(`Batalkan kontrak ${contract.contract_number}?`)) return;

    try {
      await cancelContract(contract.id);
      await loadAllData();
      showToast('Kontrak dibatalkan', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal membatalkan kontrak', 'error');
    }
  };

  // Print functions
  const handlePrintRentalContract = (contract: RentalContract) => {
    let printIframe = document.getElementById('hidden-print-iframe') as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'hidden-print-iframe';
      printIframe.style.position = 'fixed';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = 'none';
      printIframe.style.opacity = '0';
      document.body.appendChild(printIframe);
    }
    const printDoc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (!printDoc) return;

    const fontSizePx = getPrintFontSizePx(printConfig);
    const headerHtml = getPrintHeaderHtml(printConfig, {
      businessName,
      subtitle: 'Kontrak Sewa Perangkat',
      logoUrl,
    });
    const footerHtml = getPrintFooterHtml(printConfig, 'Simpan sebagai bukti jaminan deposit');
    const termsHtml = getPrintTermsHtml(printConfig, 'rental');

    printDoc.open();
    printDoc.write(`
      <html>
        <head>
          <title>Contract - ${contract.contract_number}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; width: 76mm; margin: 0 auto; padding: 10px; font-size: ${fontSizePx}px; color: #000; }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .hr { border-bottom: 1px dashed #000; margin: 8px 0; }
            .section { margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="text-center">${headerHtml}</div>
          <div class="hr"></div>
          <p>ID Kontrak: ${contract.contract_number}</p>
          <p>Tanggal: ${contract.start_date}</p>
          <p>Pelanggan: ${contract.customer_name}</p>
          <div class="hr"></div>
          <div class="section">
            <p class="bold">Perangkat:</p>
            <p>${contract.device_name}</p>
          </div>
          <div class="section">
            <p>Durasi: ${contract.duration_days} Hari</p>
            <p>Berakhir: ${contract.end_date}</p>
          </div>
          <div class="hr"></div>
          <p>Biaya Sewa: Rp ${contract.total_rent.toLocaleString()}</p>
          <p>Deposit: Rp ${contract.deposit_amount.toLocaleString()}</p>
          <p class="bold">TOTAL DIBAYAR: Rp ${(contract.total_rent + contract.deposit_amount).toLocaleString()}</p>
          <div class="hr"></div>
          <div class="text-center" style="margin-top: 20px;">
            <p>Tanda Tangan Pelanggan</p>
            <br/><br/>
            <p>( ____________________ )</p>
          </div>
          ${footerHtml}
          ${termsHtml}
        </body>
      </html>
    `);
    printDoc.close();
    setTimeout(() => {
      if (printIframe.contentWindow) {
        printFrame(printIframe, printConfig, 'Rental Receipt');
      }
    }, 500);
  };

  const handlePrintReturnReceipt = (contract: RentalContract, damage: number, notes: string) => {
    let printIframe = document.getElementById('hidden-print-iframe') as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'hidden-print-iframe';
      printIframe.style.position = 'fixed';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = 'none';
      printIframe.style.opacity = '0';
      document.body.appendChild(printIframe);
    }
    const printDoc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (!printDoc) return;

    const netRefund = contract.deposit_amount - damage;

    const fontSizePx = getPrintFontSizePx(printConfig);
    const headerHtml = getPrintHeaderHtml(printConfig, {
      businessName,
      subtitle: 'Bukti Pengembalian & Refund Deposit',
      logoUrl,
    });
    const footerHtml = getPrintFooterHtml(printConfig, 'Refund diproses otomatis ke saldo/cash.');
    const termsHtml = getPrintTermsHtml(printConfig, 'rental');

    printDoc.open();
    printDoc.write(`
      <html>
        <head>
          <title>Return - ${contract.contract_number}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; width: 76mm; margin: 0 auto; padding: 10px; font-size: ${fontSizePx}px; color: #000; }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .hr { border-bottom: 1px dashed #000; margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="text-center">${headerHtml}</div>
          <div class="hr"></div>
          <p>ID Kontrak: ${contract.contract_number}</p>
          <p>Pelanggan: ${contract.customer_name}</p>
          <p>Perangkat: ${contract.device_name}</p>
          <div class="hr"></div>
          <p>Deposit Awal: Rp ${contract.deposit_amount.toLocaleString()}</p>
          <p>Denda Kerusakan: Rp ${damage.toLocaleString()}</p>
          ${notes ? `<p>Catatan: ${notes}</p>` : ''}
          <div class="hr"></div>
          <p class="bold">REFUND DEPOSIT: Rp ${netRefund.toLocaleString()}</p>
          <div class="hr"></div>
          <div class="text-center" style="margin-top: 20px;">
            <p>Terima kasih telah menyewa di tempat kami.</p>
          </div>
          ${footerHtml}
          ${termsHtml}
        </body>
      </html>
    `);
    printDoc.close();
    setTimeout(() => {
      if (printIframe.contentWindow) {
        printFrame(printIframe, printConfig, 'Rental Receipt');
      }
    }, 500);
  };

  if (loading && contracts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div
      className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden animate-fadeIn"
      id="device-rental-dashboard"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 dark:bg-zinc-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-sm text-blue-950 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Pusat Penyewaan
            Perangkat & Gadget
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Fasilitasi persewaan laptop, projector, & tablet untuk pelanggan korporat maupun retail
            dengan manajemen jaminan deposit otomatis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 text-[10px] font-bold font-mono">
            Integrasi Kas & Jurnal Ledger
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-zinc-800 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/20 dark:bg-zinc-950/20">
        <div className="p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">
              Sewa Aktif (Sedang Dipinjam)
            </p>
            <h4 className="text-xl font-bold font-mono text-blue-950 dark:text-zinc-200 mt-1">
              {activeCount} Unit
            </h4>
          </div>
        </div>
        <div className="p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono font-bold text-slate-400 dark:text-slate-500 tracking-wider">
              Terlambat (Overdue)
            </p>
            <h4 className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
              {overdueCount} Unit
            </h4>
          </div>
        </div>
        <div className="p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono font-bold text-slate-400 dark:text-slate-500 tracking-wider">
              Akumulasi Pendapatan Sewa
            </p>
            <h4 className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              Rp {totalRevenue.toLocaleString()}
            </h4>
          </div>
        </div>
      </div>

      {/* Overdue Alert Banner */}
      {overdueContracts.length > 0 && (
        <div className="px-5 py-3 bg-rose-50 dark:bg-rose-950/20 border-b border-rose-200 dark:border-rose-900/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
            <AlertCircle className="w-5 h-5" />
            <span className="font-bold text-sm">
              {overdueContracts.length} kontrak terlambat dikembalikan
            </span>
          </div>
          <button
            onClick={() => setSearchQuery('')}
            className="text-[11px] font-mono text-rose-600 hover:underline"
          >
            Lihat daftar overdue
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12">
        {/* Left Form column */}
        <div className="xl:col-span-5 p-5 border-r border-slate-100 dark:border-zinc-800 space-y-5">
          <div className="border-b border-slate-100 dark:border-zinc-800 pb-2">
            <h4 className="font-bold text-xs uppercase text-slate-700 dark:text-zinc-200 tracking-wider flex items-center gap-1">
              <Smartphone className="w-4 h-4 text-blue-600" /> Buat Kontrak Sewa Perangkat
            </h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Catat penyewaan unit beserta jaminan deposit kas penjamin.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Customer select */}
            <div>
              <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-1">
                Nama Penyewa (Pelanggan)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="Cari atau ketik nama pelanggan..."
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 font-semibold text-slate-800 dark:text-zinc-200"
                  list="rental-customers-list"
                />
                <datalist id="rental-customers-list">
                  {tenantCustomers.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Catalog list selection */}
            <div>
              <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-1">
                Pilih Perangkat Sewa
              </label>
              <div className="space-y-2 border border-slate-100 dark:border-zinc-800 p-2.5 bg-slate-50/40 dark:bg-zinc-950/10 rounded-2xl">
                {catalog.map((device, idx) => (
                  <div
                    key={device.id}
                    onClick={() => setFormData({ ...formData, deviceIndex: idx })}
                    className={`flex items-center justify-between p-2.5 bg-white dark:bg-zinc-900 border rounded-xl hover:border-blue-400 transition cursor-pointer ${
                      formData.deviceIndex === idx
                        ? 'border-blue-500 ring-2 ring-blue-100 dark:ring-blue-950/40 shadow-sm'
                        : 'border-slate-200 dark:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-3.5 h-3.5 rounded-full border-4 flex items-center justify-center ${
                          formData.deviceIndex === idx
                            ? 'border-blue-600 bg-white dark:bg-zinc-900'
                            : 'border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900'
                        }`}
                      />
                      <div>
                        <p className="font-bold text-slate-800 dark:text-zinc-200 text-[11px] leading-none">
                          {device.name}
                        </p>
                        <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono mt-1 block font-bold uppercase">
                          {device.category}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[10.5px] text-slate-700 dark:text-zinc-300 font-bold">
                        Rp {device.daily_rate.toLocaleString()}/hari
                      </p>
                      <p className="text-[8.5px] text-slate-400 dark:text-zinc-500 mt-0.5">
                        Jaminan: Rp {device.deposit_amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                {catalog.length === 0 && (
                  <p className="text-center text-slate-400 py-4 text-xs">
                    Belum ada katalog perangkat. Tambahkan via API atau database.
                  </p>
                )}
              </div>
            </div>

            {/* Available units indicator */}
            {activeCatalogDevice && availableDevices.length > 0 && (
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-[10px]">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>
                    Tersedia <strong>{availableDevices.length}</strong> unit untuk{' '}
                    <strong>{activeCatalogDevice.name}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Duration */}
            <div>
              <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-1">
                Durasi Sewa (Hari)
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={formData.rentDays}
                onChange={(e) =>
                  setFormData({ ...formData, rentDays: Math.max(1, Number(e.target.value) || 1) })
                }
                className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 font-mono text-slate-800 dark:text-zinc-200"
              />
            </div>

            {/* Custom Deposit */}
            <div>
              <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-1">
                Custom Deposit (Opsional)
              </label>
              <input
                type="number"
                min="0"
                value={formData.customDeposit}
                onChange={(e) => setFormData({ ...formData, customDeposit: e.target.value })}
                placeholder={`Default: Rp ${calculatedDeposit.toLocaleString()}`}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 font-mono text-slate-800 dark:text-zinc-200"
              />
            </div>

            {/* Cost Summary */}
            <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl p-3">
              <div className="flex justify-between text-[10px] font-mono mb-1">
                <span className="text-slate-500">Biaya Sewa ({formData.rentDays} hari)</span>
                <span className="font-bold text-slate-800 dark:text-zinc-200">
                  Rp {calculatedTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-[10px] font-mono mb-1">
                <span className="text-slate-500">Deposit</span>
                <span className="font-bold text-slate-800 dark:text-zinc-200">
                  Rp {calculatedDeposit.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-[11px] font-mono border-t border-slate-200 dark:border-zinc-700 pt-2">
                <span className="font-bold text-slate-800 dark:text-zinc-200">TOTAL BAYAR</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  Rp {(calculatedTotal + calculatedDeposit).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleCreateRental}
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Buat Kontrak Sewa & Cetak</span>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            </button>
          </div>
        </div>

        {/* Right List column */}
        <div className="xl:col-span-7 p-5 space-y-5 min-w-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kontrak: nama pelanggan, perangkat, ID..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 text-sm font-medium text-slate-800 dark:text-zinc-200"
            />
          </div>

          {/* Contracts List */}
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {filteredContracts.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Belum ada kontrak sewa</p>
                <p className="text-[10px]">Buat kontrak pertama dari form di sebelah kiri</p>
              </div>
            ) : (
              filteredContracts.map((contract) => (
                <div
                  key={contract.id}
                  className={`bg-white dark:bg-zinc-900 border rounded-xl p-3.5 transition ${
                    contract.status === 'OVERDUE'
                      ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20'
                      : contract.status === 'ACTIVE'
                        ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20'
                        : 'border-slate-200 dark:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-zinc-300">
                          {contract.contract_number}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                            contract.status === 'ACTIVE'
                              ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                              : contract.status === 'OVERDUE'
                                ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                                : contract.status === 'RETURNED'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                                  : contract.status === 'CANCELLED'
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {contract.status}
                        </span>
                      </div>
                      <p className="font-bold text-slate-800 dark:text-zinc-200 mt-1 truncate">
                        {contract.customer_name}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Smartphone className="w-3 h-3" /> {contract.device_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {contract.start_date} →{' '}
                          {contract.end_date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {contract.duration_days} hari
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" /> Rp{' '}
                          {contract.total_rent.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {contract.status === 'ACTIVE' && (
                        <>
                          <button
                            onClick={() => setReturningContract(contract)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" /> Kembalikan
                          </button>
                          <button
                            onClick={() => handleExtendContract(contract)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition flex items-center gap-1"
                          >
                            <Calendar className="w-3 h-3" /> Perpanjang
                          </button>
                          <button
                            onClick={() => handleCancelContract(contract)}
                            className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white text-[10px] font-bold rounded-lg transition flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" /> Batalkan
                          </button>
                        </>
                      )}
                      {contract.status === 'RETURNED' && (
                        <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-lg flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Selesai
                        </span>
                      )}
                      {contract.status === 'OVERDUE' && (
                        <button
                          onClick={() => setReturningContract(contract)}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition flex items-center gap-1"
                        >
                          <AlertCircle className="w-3 h-3" /> Proses Kembali
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Deposit info */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-500 dark:text-zinc-400">
                      Deposit: Rp {contract.deposit_amount.toLocaleString()}
                    </span>
                    {contract.deposit_paid < contract.deposit_amount && (
                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                        Belum Lunas (Rp{' '}
                        {(contract.deposit_amount - contract.deposit_paid).toLocaleString()})
                      </span>
                    )}
                    {contract.damage_deduction && contract.damage_deduction > 0 && (
                      <span className="text-rose-600 dark:text-rose-400 font-bold">
                        Denda: Rp {contract.damage_deduction.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Overdue Summary */}
          {overdueContracts.length > 0 && (
            <div className="border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20 rounded-xl p-4">
              <h4 className="font-bold text-rose-800 dark:text-rose-300 text-sm mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Kontrak Overdue ({overdueContracts.length})
              </h4>
              <div className="space-y-2 text-[10px] font-mono">
                {overdueContracts.slice(0, 5).map((oc) => (
                  <div
                    key={oc.id}
                    className="flex items-center justify-between bg-white dark:bg-zinc-900 p-2 rounded-lg"
                  >
                    <div>
                      <p className="font-bold text-rose-700 dark:text-rose-300">
                        {oc.contract_number}
                      </p>
                      <p className="text-slate-500">
                        {oc.customer_name} • {oc.device_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-rose-600">{oc.days_overdue} hari terlambat</p>
                      <p className="text-slate-500">Rp {oc.daily_rate.toLocaleString()}/hari</p>
                    </div>
                  </div>
                ))}
                {overdueContracts.length > 5 && (
                  <p className="text-center text-rose-600 text-[10px]">
                    + {overdueContracts.length - 5} kontrak lainnya...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Return Modal */}
      {returningContract && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md p-6 animate-slideUp">
            <h3 className="font-bold text-lg text-slate-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-emerald-600" /> Pengembalian Perangkat
            </h3>
            <div className="space-y-3 text-sm mb-4">
              <p>
                <span className="font-mono text-slate-500">Kontrak:</span>{' '}
                {returningContract.contract_number}
              </p>
              <p>
                <span className="font-mono text-slate-500">Pelanggan:</span>{' '}
                {returningContract.customer_name}
              </p>
              <p>
                <span className="font-mono text-slate-500">Perangkat:</span>{' '}
                {returningContract.device_name}
              </p>
              <p>
                <span className="font-mono text-slate-500">Deposit:</span> Rp{' '}
                {returningContract.deposit_amount.toLocaleString()}
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
                  Denda Kerusakan (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  max={returningContract.deposit_amount}
                  value={damageDeductionInput}
                  onChange={(e) => setDamageDeductionInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Maksimal: Rp {returningContract.deposit_amount.toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
                  Catatan Kerusakan
                </label>
                <textarea
                  value={damageNotes}
                  onChange={(e) => setDamageNotes(e.target.value)}
                  rows={3}
                  placeholder="Deskripsi kerusakan (opsional)..."
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-xl">
                <span className="text-slate-500">Refund Deposit</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  Rp{' '}
                  {(
                    returningContract.deposit_amount -
                    (damageDeductionInput ? Number(damageDeductionInput) : 0)
                  ).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setReturningContract(null)}
                className="flex-1 py-2.5 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-bold rounded-xl transition"
              >
                Batal
              </button>
              <button
                onClick={handleProcessReturn}
                disabled={loading}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> Proses Pengembalian & Refund
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
