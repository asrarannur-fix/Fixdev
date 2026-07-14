import React, { useState, useMemo } from "react";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import { usePrintConfig } from "../hooks/usePrintConfig";
import {
  getPrintFontSizePx,
  getPrintHeaderHtml,
  getPrintFooterHtml,
  getPrintTermsHtml,
} from "../utils/print";
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
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Search,
  BookOpen,
} from "lucide-react";

interface RentalContract {
  id: string;
  customerName: string;
  deviceName: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  ratePerDay: number;
  totalCost: number;
  depositAmount: number;
  status: "ACTIVE" | "RETURNED" | "OVERDUE";
  damageDeduction?: number;
}

export const DeviceRentalDashboard: React.FC = () => {
  const {
    currentTenantId,
    currentBranchId,
    addJournalEntry,
    addLog,
    customers,
  } = useSaaS();

  const { showToast } = useToast();
  const printConfig = usePrintConfig();

  // Scoped customers
  const tenantCustomers = useMemo(() => {
    return customers.filter((c) => c.tenantId === currentTenantId);
  }, [customers, currentTenantId]);

  // Initial rental catalog
  const rentalCatalog = [
    {
      id: "rc-1",
      name: 'MacBook Pro Retina 15" i7 16GB',
      rate: 200000,
      deposit: 1000000,
      category: "Laptop",
    },
    {
      id: "rc-2",
      name: "Lenovo ThinkPad T480 i5 8GB",
      rate: 120000,
      deposit: 500000,
      category: "Laptop",
    },
    {
      id: "rc-3",
      name: 'iPad Pro 11" M1 128GB Wifi',
      rate: 150000,
      deposit: 800000,
      category: "Tablet",
    },
    {
      id: "rc-4",
      name: "Projector Epson EB-X400 3300 Lumens",
      rate: 100000,
      deposit: 400000,
      category: "Aksesoris",
    },
    {
      id: "rc-5",
      name: "SAMSUNG Galaxy Tab S8 Ultra",
      rate: 180000,
      deposit: 900000,
      category: "Tablet",
    },
  ];

  // Rental states
  const [rentals, setRentals] = useState<RentalContract[]>([
    {
      id: "RNT-2026-0001",
      customerName: "Hendra Wijaya",
      deviceName: 'MacBook Pro Retina 15" i7 16GB',
      startDate: "2026-06-25",
      endDate: "2026-07-02",
      durationDays: 7,
      ratePerDay: 200000,
      totalCost: 1400000,
      depositAmount: 1000000,
      status: "ACTIVE",
    },
    {
      id: "RNT-2026-0002",
      customerName: "Siti Rahmawati",
      deviceName: "Lenovo ThinkPad T480 i5 8GB",
      startDate: "2026-06-20",
      endDate: "2026-06-23",
      durationDays: 3,
      ratePerDay: 120000,
      totalCost: 360000,
      depositAmount: 500000,
      status: "RETURNED",
    },
    {
      id: "RNT-2026-0003",
      customerName: "CV Maju Bersama",
      deviceName: "Projector Epson EB-X400 3300 Lumens",
      startDate: "2026-06-15",
      endDate: "2026-06-20",
      durationDays: 5,
      ratePerDay: 100000,
      totalCost: 500000,
      depositAmount: 400000,
      status: "OVERDUE",
    },
  ]);

  // Form input state
  const [selectedCustName, setSelectedCustName] = useState("");
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);
  const [rentDays, setRentDays] = useState(3);
  const [customDeposit, setCustomDeposit] = useState("");

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Damage return state
  const [returningRental, setReturningRental] = useState<RentalContract | null>(
    null,
  );
  const [damageDeductionInput, setDamageDeductionInput] = useState("");
  const [damageNotes, setDamageNotes] = useState("");

  const activeDevice = rentalCatalog[selectedDeviceIndex];
  const calculatedTotal = activeDevice ? activeDevice.rate * rentDays : 0;
  const calculatedDeposit = customDeposit
    ? Number(customDeposit)
    : activeDevice
      ? activeDevice.deposit
      : 0;

  // Stats
  const activeCount = rentals.filter((r) => r.status === "ACTIVE").length;
  const overdueCount = rentals.filter((r) => r.status === "OVERDUE").length;
  const totalRevenue = rentals.reduce((sum, r) => sum + r.totalCost, 0);

  // Filtered rentals list
  const filteredRentals = rentals.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.customerName.toLowerCase().includes(q) ||
      r.deviceName.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q)
    );
  });

  // Handle New Rental
  const handleCreateRental = () => {
    if (!selectedCustName.trim()) {
      showToast("Mohon pilih atau masukkan nama pelanggan!", "error");
      return;
    }
    if (rentDays <= 0) {
      showToast("Durasi sewa minimal 1 hari!", "error");
      return;
    }

    const safeRentDays = Math.max(1, Math.floor(Number(rentDays) || 1));
    const safeDeposit = Math.max(0, Number(calculatedDeposit) || 0);
    const safeTotal = Math.max(0, activeDevice.rate * safeRentDays);
    const cleanCustomerName = selectedCustName.trim();

    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + safeRentDays);

    const contractId = `RNT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    const newRental: RentalContract = {
      id: contractId,
      customerName: cleanCustomerName,
      deviceName: activeDevice.name,
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
      durationDays: safeRentDays,
      ratePerDay: activeDevice.rate,
      totalCost: safeTotal,
      depositAmount: safeDeposit,
      status: "ACTIVE",
    };

    setRentals((prev) => [newRental, ...prev]);

    // Double-entry accounting:
    // Debit: Kas Terminal (10100) -> Rent Cost + Deposit
    // Credit: Pendapatan Sewa (40300) -> Rent Cost
    // Credit: Kewajiban Titipan Deposit (20200) -> Deposit
    addJournalEntry(
      contractId,
      `Sewa Perangkat: ${activeDevice.name} oleh ${selectedCustName} (${rentDays} Hari)`,
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
      ],
    );

    addLog(
      "Create Rental",
      `Penyewaan ${activeDevice.name} kepada ${cleanCustomerName} senilai Rp ${safeTotal.toLocaleString()} + Deposit Rp ${safeDeposit.toLocaleString()}`,
      "SALES",
      "LOW",
    );

    handlePrintRentalContract(newRental);

    // reset form
    setSelectedCustName("");
    setRentDays(3);
    setCustomDeposit("");
  };

  const handlePrintRentalContract = (contract: RentalContract) => {
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
    if (!printDoc) return;

    const fontSizePx = getPrintFontSizePx(printConfig);
    const headerHtml = getPrintHeaderHtml(printConfig, {
      businessName: "REPAIR HUB RENTAL",
      subtitle: "Kontrak Sewa Perangkat",
    });
    const footerHtml = getPrintFooterHtml(
      printConfig,
      "Simpan sebagai bukti jaminan deposit",
    );
    const termsHtml = getPrintTermsHtml(printConfig, "rental");

    printDoc.open();
    printDoc.write(`
      <html>
        <head>
          <title>Contract - ${contract.id}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; width: 76mm; margin: 0 auto; padding: 10px; font-size: ${fontSizePx}px; color: #000; }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .hr { border-bottom: 1px dashed #000; margin: 8px 0; }
            .section { margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="text-center">
            ${headerHtml}
          </div>
          <div class="hr"></div>
          <p>ID Kontrak: ${contract.id}</p>
          <p>Tanggal: ${contract.startDate}</p>
          <p>Pelanggan: ${contract.customerName}</p>
          <div class="hr"></div>
          <div class="section">
            <p class="bold">Perangkat:</p>
            <p>${contract.deviceName}</p>
          </div>
          <div class="section">
            <p>Durasi: ${contract.durationDays} Hari</p>
            <p>Berakhir: ${contract.endDate}</p>
          </div>
          <div class="hr"></div>
          <p>Biaya Sewa: Rp ${contract.totalCost.toLocaleString()}</p>
          <p>Deposit: Rp ${contract.depositAmount.toLocaleString()}</p>
          <p class="bold">TOTAL DIBAYAR: Rp ${(contract.totalCost + contract.depositAmount).toLocaleString()}</p>
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
        printIframe.contentWindow.focus();
        printIframe.contentWindow.print();
      }
    }, 500);
  };

  const handlePrintReturnReceipt = (
    contract: RentalContract,
    damage: number,
    notes: string,
  ) => {
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
    if (!printDoc) return;

    const netRefund = contract.depositAmount - damage;

    const fontSizePx = getPrintFontSizePx(printConfig);
    const headerHtml = getPrintHeaderHtml(printConfig, {
      businessName: "REPAIR HUB RENTAL",
      subtitle: "Bukti Pengembalian & Refund Deposit",
    });
    const footerHtml = getPrintFooterHtml(
      printConfig,
      "Refund diproses otomatis ke saldo/cash.",
    );
    const termsHtml = getPrintTermsHtml(printConfig, "rental");

    printDoc.open();
    printDoc.write(`
      <html>
        <head>
          <title>Return - ${contract.id}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; width: 76mm; margin: 0 auto; padding: 10px; font-size: ${fontSizePx}px; color: #000; }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .hr { border-bottom: 1px dashed #000; margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="text-center">
            ${headerHtml}
          </div>
          <div class="hr"></div>
          <p>ID Kontrak: ${contract.id}</p>
          <p>Pelanggan: ${contract.customerName}</p>
          <p>Perangkat: ${contract.deviceName}</p>
          <div class="hr"></div>
          <p>Deposit Awal: Rp ${contract.depositAmount.toLocaleString()}</p>
          <p>Denda Kerusakan: Rp ${damage.toLocaleString()}</p>
          ${notes ? `<p>Catatan: ${notes}</p>` : ""}
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
        printIframe.contentWindow.focus();
        printIframe.contentWindow.print();
      }
    }, 500);
  };

  // Handle Return & Liquidate Deposit
  const handleProcessReturn = () => {
    if (!returningRental) return;

    const damageAmt = Math.min(
      returningRental.depositAmount,
      Math.max(0, damageDeductionInput ? Number(damageDeductionInput) || 0 : 0),
    );
    if (damageAmt > returningRental.depositAmount) {
      showToast(
        "Denda kerusakan tidak boleh melebihi nilai deposit penjamin!",
        "error",
      );
      return;
    }

    const netDepositRefund = returningRental.depositAmount - damageAmt;

    // Update state
    setRentals((prev) =>
      prev.map((r) => {
        if (r.id === returningRental.id) {
          return {
            ...r,
            status: "RETURNED",
            damageDeduction: damageAmt,
          };
        }
        return r;
      }),
    );

    // Post Double Entry Journal:
    // Debit: Kewajiban Titipan Deposit (20200) -> Full Deposit Amount (Rp returningRental.depositAmount)
    // Credit: Kas Terminal (10100) -> Net Refund (Rp netDepositRefund)
    // Credit: Pendapatan Lain-lain Kerusakan (40200) -> Damage Deduction (Rp damageAmt, if any)
    const entries = [
      {
        accountId: `coa-${currentTenantId}-20200`,
        debit: returningRental.depositAmount,
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
      `RET-${returningRental.id}`,
      `Pengembalian Sewa & Pengembalian Deposit untuk ${returningRental.id} (${returningRental.customerName}). Denda: Rp ${damageAmt.toLocaleString()}`,
      entries,
    );

    addLog(
      "Return Rental",
      `Pengembalian perangkat sewa ${returningRental.deviceName} dari ${returningRental.customerName}. Denda Kerusakan: Rp ${damageAmt.toLocaleString()}, Refund Deposit: Rp ${netDepositRefund.toLocaleString()}`,
      "SALES",
      "LOW",
    );

    handlePrintReturnReceipt(returningRental, damageAmt, damageNotes);
    showToast(
      "Kunjungan Lapangan berhasil diselesaikan! Laporan & komisi teknisi telah diposting.",
      "success",
    );

    setReturningRental(null);
    setDamageDeductionInput("");
    setDamageNotes("");
  };

  return (
    <div
      className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden animate-fadeIn"
      id="device-rental-dashboard"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 dark:bg-zinc-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-sm text-blue-950 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />{" "}
            Pusat Penyewaan Perangkat &amp; Gadget
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Fasilitasi persewaan laptop, projector, &amp; tablet untuk pelanggan
            korporat maupun retail dengan manajemen jaminan deposit otomatis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 text-[10px] font-bold font-mono">
            Integrasi Kas &amp; Jurnal Ledger
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
          <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-600 dark:text-rose-450 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono font-bold text-slate-400 dark:text-slate-500 tracking-wider">
              Terlambat (Overdue)
            </p>
            <h4 className="text-xl font-bold font-mono text-rose-600 dark:text-rose-450 mt-1">
              {overdueCount} Unit
            </h4>
          </div>
        </div>
        <div className="p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 dark:text-emerald-450 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono font-bold text-slate-400 dark:text-slate-500 tracking-wider">
              Akumulasi Pendapatan Sewa
            </p>
            <h4 className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-450 mt-1">
              Rp {totalRevenue.toLocaleString()}
            </h4>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12">
        {/* Left Form column */}
        <div className="xl:col-span-5 p-5 border-r border-slate-100 dark:border-zinc-800 space-y-5">
          <div className="border-b border-slate-100 dark:border-zinc-800 pb-2">
            <h4 className="font-bold text-xs uppercase text-slate-700 dark:text-zinc-200 tracking-wider flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" /> Buat
              Kontrak Sewa Perangkat
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
                  value={selectedCustName}
                  onChange={(e) => setSelectedCustName(e.target.value)}
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
                {rentalCatalog.map((device, idx) => (
                  <div
                    key={device.id}
                    onClick={() => setSelectedDeviceIndex(idx)}
                    className={`flex items-center justify-between p-2.5 bg-white dark:bg-zinc-900 border rounded-xl hover:border-blue-350 transition cursor-pointer ${
                      selectedDeviceIndex === idx
                        ? "border-blue-500 ring-2 ring-blue-100 dark:ring-blue-950/40 shadow-sm"
                        : "border-slate-200 dark:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-3.5 h-3.5 rounded-full border-4 flex items-center justify-center ${
                          selectedDeviceIndex === idx
                            ? "border-blue-600 bg-white dark:bg-zinc-900"
                            : "border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
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
                        Rp {device.rate.toLocaleString()}/hari
                      </p>
                      <p className="text-[8.5px] text-slate-400 dark:text-zinc-500 mt-0.5">
                        Jaminan: Rp {device.deposit.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Durasi Sewa (Hari)
                </label>
                <input
                  type="number"
                  value={rentDays}
                  onChange={(e) =>
                    setRentDays(Math.max(1, Number(e.target.value)))
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 font-bold font-mono dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Kustom Nilai Deposit (Rp)
                </label>
                <input
                  type="number"
                  value={customDeposit}
                  onChange={(e) => setCustomDeposit(e.target.value)}
                  placeholder={`Default Rp ${(activeDevice?.deposit ?? 0).toLocaleString()}`}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 font-bold font-mono dark:text-white"
                />
              </div>
            </div>

            {/* Financial calculation info */}
            <div className="p-4 bg-blue-50/70 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl space-y-2 text-slate-600 dark:text-zinc-300 leading-normal">
              <h5 className="font-extrabold text-blue-950 dark:text-zinc-200 text-[11px] flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />{" "}
                Estimasi Transaksi:
              </h5>
              <div className="space-y-1.5 font-semibold text-[10.5px]">
                <div className="flex justify-between">
                  <span>Biaya Rental ({rentDays} Hari):</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                    Rp {calculatedTotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Jaminan Deposit Kasir:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                    Rp {calculatedDeposit.toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-blue-100 dark:border-blue-900/40 my-1 pt-1 flex justify-between font-extrabold text-blue-950 dark:text-zinc-100">
                  <span>Total Bayar Pelanggan:</span>
                  <span className="font-mono text-xs text-blue-700 dark:text-blue-400">
                    Rp {(calculatedTotal + calculatedDeposit).toLocaleString()}
                  </span>
                </div>
              </div>
              <p className="text-[9px] text-slate-400 mt-1 leading-tight">
                Deposit akan disimpan sebagai akun kewajiban lancar (titipan
                deposit sewa) dan akan dikembalikan secara penuh jika perangkat
                aman.
              </p>
            </div>

            {/* Create Contract Button */}
            <button
              onClick={handleCreateRental}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-2.5 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> Terbitkan Kontrak Sewa &amp;
              Terima Dana
            </button>
          </div>
        </div>

        {/* Right list column */}
        <div className="xl:col-span-7 p-6 bg-slate-50/50 dark:bg-zinc-950/20 space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-zinc-800">
              <h4 className="font-bold text-xs uppercase text-slate-700 dark:text-zinc-300 tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />{" "}
                Daftar Perjanjian &amp; Kontrak Rental Aktif
              </h4>
              <div className="relative max-w-xs w-full sm:w-auto">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Cari penyewa, unit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 focus:border-blue-500 rounded-lg outline-none text-[10.5px] dark:text-white"
                />
              </div>
            </div>

            {/* Rentals Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-950 border-b border-slate-100 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 font-mono text-[9px] uppercase">
                    <th className="px-3 py-2">ID Kontrak</th>
                    <th className="px-3 py-2">Penyewa</th>
                    <th className="px-3 py-2">Perangkat</th>
                    <th className="px-3 py-2">Masa Sewa</th>
                    <th className="px-3 py-2 text-right">
                      Biaya &amp; Deposit
                    </th>
                    <th className="px-3 py-2 text-center">Status</th>
                    <th className="px-3 py-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                  {filteredRentals.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-8 text-slate-400 italic"
                      >
                        Tidak ada kontrak rental yang terdaftar.
                      </td>
                    </tr>
                  ) : (
                    filteredRentals.map((r) => (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50/40 dark:hover:bg-zinc-800/40 text-[11px]"
                      >
                        <td className="px-3 py-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {r.id}
                        </td>
                        <td className="px-3 py-2.5 font-bold text-slate-800 dark:text-zinc-200">
                          {r.customerName}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-slate-700 dark:text-zinc-350 leading-tight">
                          {r.deviceName}
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">
                          <p>{r.startDate} s/d</p>
                          <p className="font-bold text-slate-600 dark:text-zinc-400 font-mono text-[10px]">
                            {r.endDate} ({r.durationDays} h)
                          </p>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono">
                          <p className="font-extrabold text-slate-800 dark:text-zinc-200">
                            Rp {r.totalCost.toLocaleString()}
                          </p>
                          <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-bold">
                            Dep: Rp {r.depositAmount.toLocaleString()}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[8.5px] font-bold font-mono ${
                              r.status === "ACTIVE"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                                : r.status === "RETURNED"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                                  : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {r.status !== "RETURNED" ? (
                            <button
                              onClick={() => {
                                setReturningRental(r);
                                setDamageDeductionInput("");
                                setDamageNotes("");
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-[9.5px] font-extrabold px-2 py-1 rounded-lg transition-all"
                            >
                              Kembalikan
                            </button>
                          ) : (
                            <span className="text-slate-400 font-mono text-[9.5px]">
                              Selesai
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Return & Refund Deposit Form */}
            {returningRental && (
              <div className="p-4 bg-blue-50 dark:bg-zinc-900 border border-blue-100 dark:border-zinc-850 rounded-2xl space-y-3 mt-4 text-xs animate-fadeIn">
                <div className="flex justify-between items-center border-b border-blue-100 dark:border-zinc-800 pb-1.5">
                  <h5 className="font-extrabold text-blue-950 dark:text-zinc-200 flex items-center gap-1">
                    <RotateCcw className="w-4 h-4 text-blue-600" /> Proses Retur
                    Rental &amp; Likuidasi Deposit ({returningRental.id})
                  </h5>
                  <button
                    onClick={() => setReturningRental(null)}
                    className="text-blue-800 dark:text-blue-400 font-bold font-mono text-xs"
                  >
                    Batal
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                  Pelanggan <strong>{returningRental.customerName}</strong>{" "}
                  mengembalikan unit{" "}
                  <strong>{returningRental.deviceName}</strong>. Deposit
                  dititipkan:{" "}
                  <strong>
                    Rp {returningRental.depositAmount.toLocaleString()}
                  </strong>
                  .
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-mono text-blue-800 dark:text-blue-300 uppercase mb-0.5">
                      Potongan Denda Kerusakan/Keterlambatan (Rp)
                    </label>
                    <input
                      type="number"
                      value={damageDeductionInput}
                      onChange={(e) => setDamageDeductionInput(e.target.value)}
                      placeholder="Cth: 150000 (Isi 0 jika mulus)"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-850 border border-blue-200 dark:border-zinc-750 rounded-lg text-slate-800 dark:text-white font-bold font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-blue-800 dark:text-blue-300 uppercase mb-0.5">
                      Catatan Kerusakan (jika ada)
                    </label>
                    <input
                      type="text"
                      value={damageNotes}
                      onChange={(e) => setDamageNotes(e.target.value)}
                      placeholder="Cth: Ada goresan halus di casing belakang"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-850 border border-blue-200 dark:border-zinc-750 rounded-lg text-slate-800 dark:text-white outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 bg-white/70 dark:bg-zinc-850 border border-blue-100 dark:border-zinc-750 rounded-xl space-y-1 font-semibold text-[10.5px]">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Deposit Awal:</span>
                    <span className="font-mono">
                      Rp {returningRental.depositAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Denda / Klaim Kerusakan:</span>
                    <span className="font-mono font-bold">
                      - Rp{" "}
                      {(Number(damageDeductionInput) || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t border-blue-100 dark:border-zinc-750 my-1 pt-1 flex justify-between font-black text-blue-950 dark:text-zinc-100">
                    <span>Deposit Dikembalikan:</span>
                    <span className="font-mono text-emerald-600">
                      Rp{" "}
                      {(
                        returningRental.depositAmount -
                        (Number(damageDeductionInput) || 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={handleProcessReturn}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-1.5 rounded-lg transition-all"
                  >
                    Konfirmasi Pengembalian Perangkat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
