import React, { useState } from "react";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import { useConfirm } from "./ui/ConfirmDialog";
import {
  Plus,
  ChevronRight,
  ChevronLeft,
  Building,
  ClipboardList,
  Trash2,
  DollarSign,
  TrendingUp,
  Sparkles,
  AlertCircle,
  FileSpreadsheet,
  Check,
} from "lucide-react";

interface PipelineDeal {
  id: string;
  clientName: string;
  contactPerson: string;
  phone: string;
  deviceDetails: string;
  qty: number;
  estimatedValue: number;
  stage: "LEAD" | "OPPORTUNITY" | "QUOTATION" | "WON" | "LOST";
  notes: string;
  createdAt: string;
}

export const B2BPipeline: React.FC = () => {
  const { showToast } = useToast();
  const { confirm: showConfirm } = useConfirm();
  const {
    customers,
    addServiceTicket,
    addLog,
    currentTenantId,
    currentBranchId,
  } = useSaaS();

  // Internal CRM Leads State (Pre-filled with rich corporate prospects)
  const [deals, setDeals] = useState<PipelineDeal[]>(() => {
    const saved = localStorage.getItem(`zk_b2b_deals_${currentTenantId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: "deal-01",
        clientName: "SMA Negeri 1 Makassar",
        contactPerson: "Pak Hendra (Wakasek Sarpras)",
        phone: "081293810294",
        deviceDetails: "Servis 12 Unit PC Lab & Pembersihan Ram",
        qty: 12,
        estimatedValue: 6500000,
        stage: "LEAD",
        notes: "Suku cadang butuh pasta thermal & repasting masal.",
        createdAt: "2026-06-25",
      },
      {
        id: "deal-02",
        clientName: "Universitas Hasanuddin (Fakultas Teknik)",
        contactPerson: "Bu Ratna (Staf Inventaris)",
        phone: "082348572910",
        deviceDetails: "Perbaikan 3 Unit Proyektor Aula & Ganti Lampu",
        qty: 3,
        estimatedValue: 3200000,
        stage: "OPPORTUNITY",
        notes: "Menunggu persetujuan dekanat untuk pencairan dana taktis.",
        createdAt: "2026-06-26",
      },
      {
        id: "deal-03",
        clientName: "PT Bosowa Semen (Lantai 4 Office)",
        contactPerson: "Mas Ivan (IT Support)",
        phone: "085210492839",
        deviceDetails: "Upgrade SSD 512GB & RAM 16GB iMac 27 Inch",
        qty: 5,
        estimatedValue: 4800000,
        stage: "QUOTATION",
        notes: "Quotation penawaran No. 2026/QTN/042 sudah dikirim.",
        createdAt: "2026-06-27",
      },
      {
        id: "deal-04",
        clientName: "Bank Sulselbar Cabang Utama",
        contactPerson: "Ibu Desi (Humas & IT Procurement)",
        phone: "081192840294",
        deviceDetails: "Ganti Backlight & IC Power 4 Unit Server Monitor",
        qty: 4,
        estimatedValue: 12000000,
        stage: "WON",
        notes:
          "SPK sudah ditandatangani. Perlu segera dikonversikan menjadi tiket servis utama.",
        createdAt: "2026-06-28",
      },
    ];
  });

  // Form states
  const [showAddLead, setShowAddLead] = useState(false);
  const [clientName, setClientName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [deviceDetails, setDeviceDetails] = useState("");
  const [qty, setQty] = useState(1);
  const [valAmount, setValAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [initStage, setInitStage] = useState<PipelineDeal["stage"]>("LEAD");

  const [convertedDeals, setConvertedDeals] = useState<string[]>(() => {
    const saved = localStorage.getItem(`zk_converted_deals_${currentTenantId}`);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) && parsed.every((id): id is string => typeof id === "string")
        ? parsed
        : [];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    localStorage.setItem(
      `zk_b2b_deals_${currentTenantId}`,
      JSON.stringify(deals),
    );
  }, [deals, currentTenantId]);

  React.useEffect(() => {
    localStorage.setItem(
      `zk_converted_deals_${currentTenantId}`,
      JSON.stringify(convertedDeals),
    );
  }, [convertedDeals, currentTenantId]);

  // Calculate totals
  const totalPipelineValue = deals.reduce(
    (sum, d) => sum + d.estimatedValue,
    0,
  );
  const wonValue = deals
    .filter((d) => d.stage === "WON")
    .reduce((sum, d) => sum + d.estimatedValue, 0);

  const moveStage = (
    dealId: string,
    direction: "next" | "prev" | "lost" | "won",
  ) => {
    const stagesOrder: PipelineDeal["stage"][] = [
      "LEAD",
      "OPPORTUNITY",
      "QUOTATION",
      "WON",
      "LOST",
    ];

    setDeals((prevDeals) =>
      prevDeals.map((d) => {
        if (d.id !== dealId) return d;

        let curIdx = stagesOrder.indexOf(d.stage);
        let nextStage = d.stage;

        if (direction === "next" && curIdx < stagesOrder.length - 2) {
          nextStage = stagesOrder[curIdx + 1];
        } else if (direction === "prev" && curIdx > 0) {
          nextStage = stagesOrder[curIdx - 1];
        } else if (direction === "lost") {
          nextStage = "LOST";
        } else if (direction === "won") {
          nextStage = "WON";
        }

        if (nextStage !== d.stage) {
          addLog(
            "CRM Pipeline",
            `Memindahkan prospek ${d.clientName} ke tahap ${nextStage}`,
            "CRM",
            "LOW",
          );
        }

        return { ...d, stage: nextStage };
      }),
    );
  };

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !deviceDetails.trim() || !valAmount) {
      showToast("Mohon isi seluruh kolom wajib penawaran!", "error");
      return;
    }

    const cleanClient = clientName.trim();
    const cleanContact = contactPerson.trim();
    const cleanPhone = phone.trim();
    const cleanDevice = deviceDetails.trim();
    const safeQty = Math.max(1, Math.trunc(qty || 1));
    const safeValue = Math.max(0, Number(valAmount) || 0);

    const newDeal: PipelineDeal = {
      id: "deal-" + Date.now().toString(36),
      clientName: cleanClient,
      contactPerson: cleanContact,
      phone: cleanPhone,
      deviceDetails: cleanDevice,
      qty: safeQty,
      estimatedValue: safeValue,
      stage: initStage,
      notes: notes.trim(),
      createdAt: new Date().toISOString().split("T")[0],
    };

    setDeals((prev) => [...prev, newDeal]);
    addLog(
      "CRM Create Lead",
      `Prospek korporat baru dibuat: ${cleanClient} senilai Rp ${safeValue.toLocaleString()}`,
      "CRM",
      "LOW",
    );

    // Reset Form
    setClientName("");
    setContactPerson("");
    setPhone("");
    setDeviceDetails("");
    setQty(1);
    setValAmount("");
    setNotes("");
    setShowAddLead(false);
  };

  const handleDeleteDeal = async (id: string) => {
    if (
      await showConfirm({
        title: "Hapus Prospek",
        message:
          "Apakah Anda yakin ingin menghapus prospek ini dari pipeline? Data estimasi nilai proyek akan hilang.",
        confirmLabel: "Hapus Prospek",
        type: "danger",
      })
    ) {
      setDeals((prev) => prev.filter((d) => d.id !== id));
    }
  };

  const handleConvertToTicket = (deal: PipelineDeal) => {
    if (convertedDeals.includes(deal.id)) {
      showToast(
        "Prospek ini sudah dikonversikan menjadi tiket servis aktif!",
        "info",
      );
      return;
    }

    // Attempt to lookup or use default customer
    const matchCust = customers[0]?.id || "cust-default";

    // Add Service Ticket to Context State
    addServiceTicket({
      tenantId: currentTenantId,
      branchId: currentBranchId,
      customerId: matchCust,
      deviceName: `${deal.deviceDetails} (${deal.qty} unit)`,
      deviceBrandModel: deal.clientName,
      deviceSerial: "B2B-BULK-CONTRACT",
      initialChecklist: [
        { name: "Verifikasi SPK Kontrak", checked: true },
        { name: "Suku Cadang Siap", checked: true },
        { name: "Inventarisasi Cabang", checked: true },
      ],
      initialPhotos: [],
      customerComplaints: `Tugas B2B: ${deal.notes}. Ditransisikan langsung dari modul CRM Pipeline Penawaran.`,
      estimatedCost: deal.estimatedValue,
      customerApprovalStatus: "APPROVED",
      partsUsed: [],
      warrantyMonths: 12,
      isOutsourced: false,
    });

    setConvertedDeals((prev) => [...prev, deal.id]);
    addLog(
      "CRM Conversion",
      `Mengonversikan kesepakatan B2B ${deal.clientName} menjadi Tiket Servis Aktif senilai Rp ${deal.estimatedValue.toLocaleString()}`,
      "CRM",
      "MEDIUM",
    );
    showToast(
      `Sukses! Prospek ${deal.clientName} berhasil dikonversikan menjadi Tiket Servis Utama Aktif bergaransi 12 bulan!`,
      "success",
    );
  };

  const columns: {
    label: string;
    stage: PipelineDeal["stage"];
    bg: string;
    border: string;
    text: string;
  }[] = [
    {
      label: "Leads Baru",
      stage: "LEAD",
      bg: "bg-blue-50/40 dark:bg-blue-950/10",
      border: "border-blue-200/60 dark:border-blue-900/40",
      text: "text-blue-700 dark:text-blue-400",
    },
    {
      label: "Negosiasi",
      stage: "OPPORTUNITY",
      bg: "bg-amber-50/40 dark:bg-amber-950/10",
      border: "border-amber-200/60 dark:border-amber-900/40",
      text: "text-amber-700 dark:text-amber-400",
    },
    {
      label: "Quotation Terkirim",
      stage: "QUOTATION",
      bg: "bg-sky-50/40 dark:bg-sky-950/10",
      border: "border-sky-200/60 dark:border-sky-900/40",
      text: "text-sky-700 dark:text-sky-400",
    },
    {
      label: "Deal Won (Lunas)",
      stage: "WON",
      bg: "bg-emerald-50/40 dark:bg-emerald-950/10",
      border: "border-emerald-200/60 dark:border-emerald-900/40",
      text: "text-emerald-700 dark:text-emerald-400",
    },
    {
      label: "Lost / Gagal",
      stage: "LOST",
      bg: "bg-rose-50/40 dark:bg-rose-950/10",
      border: "border-rose-200/60 dark:border-rose-900/40",
      text: "text-rose-700 dark:text-rose-400",
    },
  ];

  return (
    <div
      className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden"
      id="b2b-pipeline-container"
    >
      {/* Header */}
      <div className="px-6 py-6 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[9.5px] font-mono font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase mb-1">
            CRM &amp; INTELLIGENCE / CRM PELANGGAN / PIPELINE &amp; PENAWARAN
          </div>
          <h3 className="font-syne font-extrabold text-xl text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-600" /> Visual CRM &amp;
            Pipeline
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium mt-1">
            Lacak siklus prospek penawaran harga instansi / korporat sebelum
            diubah menjadi tiket servis lunas.
          </p>
        </div>
        <button
          onClick={() => setShowAddLead(!showAddLead)}
          className="btn-modern px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Add B2B Prospect
        </button>
      </div>

      {/* Analytics widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-900/10">
        <div className="p-5 flex items-center gap-4 border-r border-slate-100 dark:border-zinc-800">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9.5px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
              Total Pipeline Value
            </p>
            <p className="text-lg font-syne font-black text-slate-800 dark:text-slate-100">
              Rp {totalPipelineValue.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="p-5 flex items-center gap-4 border-r border-slate-100 dark:border-zinc-800">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9.5px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
              Deals Won
            </p>
            <p className="text-lg font-syne font-black text-emerald-600 dark:text-emerald-400">
              Rp {wonValue.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9.5px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
              Win Efficiency
            </p>
            <p className="text-lg font-syne font-black text-amber-600 dark:text-amber-400">
              {deals.length > 0
                ? Math.round(
                    (deals.filter((d) => d.stage === "WON").length /
                      deals.length) *
                      100,
                  )
                : 0}
              % Conversion
            </p>
          </div>
        </div>
      </div>

      {/* Add Lead Overlay Form */}
      {showAddLead && (
        <form
          onSubmit={handleCreateLead}
          className="p-5 bg-blue-50/40 dark:bg-zinc-800/40 border-b border-blue-100 dark:border-zinc-750 animate-fadeIn space-y-4 text-xs"
        >
          <div className="flex items-center justify-between border-b border-blue-100/60 dark:border-zinc-750 pb-2">
            <h4 className="font-extrabold text-xs text-blue-950 dark:text-zinc-200 uppercase tracking-wide flex items-center gap-1.5">
              <Building className="w-4 h-4 text-blue-600" /> Formulir Proposal
              Penawaran B2B Baru
            </h4>
            <button
              type="button"
              onClick={() => setShowAddLead(false)}
              className="text-slate-400 hover:text-slate-600 font-bold"
            >
              Batal
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
                Nama Instansi / Klien
              </label>
              <input
                type="text"
                required
                placeholder="Cth: PT Pertamina Regional VII"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-xl outline-none focus:border-accent font-semibold dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
                Contact Person (PJ Klien)
              </label>
              <input
                type="text"
                placeholder="Cth: Ibu Fitri (Bagian Umum)"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-xl outline-none focus:border-accent font-medium dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
                No Telepon / WhatsApp
              </label>
              <input
                type="text"
                placeholder="0812XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-xl outline-none focus:border-accent font-mono dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
                Keluhan / Perincian Perangkat
              </label>
              <input
                type="text"
                required
                placeholder="Cth: Upgrade 14 unit laptop kerja Lenovo Core i5"
                value={deviceDetails}
                onChange={(e) => setDeviceDetails(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-xl outline-none focus:border-accent font-semibold dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
                Jumlah Unit (Qty)
              </label>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-xl outline-none focus:border-accent font-mono dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
                Estimasi Total Proyek (Rp)
              </label>
              <input
                type="number"
                required
                placeholder="Cth: 15000000"
                value={valAmount}
                onChange={(e) => setValAmount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-xl outline-none focus:border-accent font-mono font-bold dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
                Catatan Tambahan &amp; Suku Cadang Terkait
              </label>
              <input
                type="text"
                placeholder="Cth: SSD disediakan dari gudang utama kami, jasa instalasi sistem operasi"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-xl outline-none focus:border-accent font-medium dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
                Tahap Awal Prospek
              </label>
              <select
                value={initStage}
                onChange={(e) =>
                  setInitStage(e.target.value as PipelineDeal["stage"])
                }
                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-xl outline-none focus:border-accent font-semibold text-slate-700 dark:text-zinc-300"
              >
                <option value="LEAD">Leads Baru</option>
                <option value="OPPORTUNITY">Negosiasi / Kontak</option>
                <option value="QUOTATION">Quotation Dikirim</option>
                <option value="WON">Deal Won (Disetujui)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddLead(false)}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 font-bold border border-slate-200 rounded-xl transition cursor-pointer"
            >
              Kembali
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition shadow-sm cursor-pointer"
            >
              Simpan Prospek CRM
            </button>
          </div>
        </form>
      )}

      {/* Kanban Board Grid */}
      <div className="p-6 overflow-x-auto">
        <div className="flex gap-5 min-w-[1100px] items-stretch">
          {columns.map((col) => {
            const colDeals = deals.filter((d) => d.stage === col.stage);
            const colSum = colDeals.reduce(
              (sum, d) => sum + d.estimatedValue,
              0,
            );

            return (
              <div
                key={col.stage}
                className={`flex-1 rounded-2xl border ${col.border} ${col.bg} p-4 flex flex-col space-y-4 min-h-[480px]`}
              >
                {/* Column Title */}
                <div className="border-b border-slate-200/80 dark:border-zinc-800/80 pb-2.5 flex items-center justify-between">
                  <div>
                    <h4 className="font-syne font-extrabold text-[12px] uppercase tracking-wider text-slate-950 dark:text-zinc-100">
                      {col.label}
                    </h4>
                    <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                      Rp {colSum.toLocaleString()}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${col.text} bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800`}
                  >
                    {colDeals.length}
                  </span>
                </div>

                {/* Deal Cards */}
                <div className="space-y-4 flex-1 overflow-y-auto max-h-[460px] pr-1">
                  {colDeals.length === 0 ? (
                    <div className="h-28 border border-dashed border-slate-200/60 dark:border-zinc-800 rounded-xl flex items-center justify-center text-[10px] text-slate-400 dark:text-zinc-500 font-medium italic">
                      Kosong
                    </div>
                  ) : (
                    colDeals.map((deal) => {
                      const isConverted = convertedDeals.includes(deal.id);
                      return (
                        <div
                          key={deal.id}
                          className="modern-deal-card p-4 space-y-3 shadow-xs hover:shadow-sm transition group text-xs relative"
                        >
                          {/* Trash button */}
                          <button
                            onClick={() => handleDeleteDeal(deal.id)}
                            className="absolute top-2.5 right-2.5 text-slate-300 dark:text-zinc-600 hover:text-rose-600 dark:hover:text-rose-400 transition p-0.5 cursor-pointer opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <div className="space-y-1">
                            <p className="font-syne font-extrabold text-slate-950 dark:text-zinc-50 flex items-center gap-1.5 pr-4">
                              <Building className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />{" "}
                              {deal.clientName}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-zinc-400 font-medium">
                              PJ: {deal.contactPerson} ·{" "}
                              <span className="font-mono">{deal.phone}</span>
                            </p>
                          </div>

                          <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800/80 p-2.5 rounded-lg">
                            <p className="font-bold text-[10px] text-slate-700 dark:text-zinc-300">
                              {deal.deviceDetails}
                            </p>
                            <p className="text-[9px] text-slate-400 dark:text-zinc-500 mt-0.5 font-medium leading-relaxed italic">
                              &ldquo;{deal.notes}&rdquo;
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-[10.5px] font-mono border-t border-slate-100 dark:border-zinc-800/80 pt-2.5">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              Rp {deal.estimatedValue.toLocaleString()}
                            </span>
                            <span className="text-slate-400 dark:text-zinc-400 font-medium">
                              Qty: {deal.qty} Pcs
                            </span>
                          </div>

                          {/* Interactive Move & Convert triggers */}
                          <div className="pt-2 flex items-center justify-between gap-1.5 border-t border-slate-100 dark:border-zinc-800/80">
                            {/* Direction triggers */}
                            <div className="flex items-center gap-1">
                              {col.stage !== "LEAD" && (
                                <button
                                  onClick={() => moveStage(deal.id, "prev")}
                                  title="Pindahkan ke tahap sebelumnya"
                                  className="p-1 bg-slate-50 dark:bg-zinc-950 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-500 dark:text-zinc-400 rounded border border-slate-200 dark:border-zinc-800 cursor-pointer"
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {col.stage !== "WON" && col.stage !== "LOST" && (
                                <>
                                  <button
                                    onClick={() => moveStage(deal.id, "next")}
                                    title="Pindahkan ke tahap selanjutnya"
                                    className="p-1 bg-slate-50 dark:bg-zinc-950 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-500 dark:text-zinc-400 rounded border border-slate-200 dark:border-zinc-800 cursor-pointer"
                                  >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => moveStage(deal.id, "lost")}
                                    title="Tandai Gagal / Lost"
                                    className="px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-400 font-extrabold text-[8px] rounded border border-rose-200 dark:border-rose-900/40 uppercase cursor-pointer"
                                  >
                                    Lost
                                  </button>
                                </>
                              )}
                              {col.stage === "LOST" && (
                                <button
                                  onClick={() => moveStage(deal.id, "prev")}
                                  className="px-1.5 py-0.5 bg-slate-50 dark:bg-zinc-950 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-600 dark:text-zinc-400 font-semibold text-[8px] rounded border border-slate-200 dark:border-zinc-800 uppercase cursor-pointer"
                                >
                                  Re-Open
                                </button>
                              )}
                            </div>

                            {/* Convert to Ticket button (Enabled only on WON column) */}
                            {col.stage === "WON" && (
                              <button
                                onClick={() => handleConvertToTicket(deal)}
                                disabled={isConverted}
                                className={`px-2 py-1 text-[8.5px] font-black uppercase tracking-wider rounded-lg border shadow-xs cursor-pointer flex items-center gap-1 transition ${
                                  isConverted
                                    ? "bg-slate-100 dark:bg-zinc-950 text-slate-400 dark:text-zinc-600 border-slate-200 dark:border-zinc-800 cursor-not-allowed"
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500"
                                }`}
                              >
                                {isConverted ? (
                                  <>
                                    <Check className="w-3 h-3" /> Konvert
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3 h-3 animate-pulse" />{" "}
                                    Buat Tiket
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
