import * as React from "react";
import {
  Check,
  ListChecks,
  Receipt,
  ShieldCheck,
  Package,
  FileText,
} from "lucide-react";
import { PaymentMethod } from "../../../types";

interface HandoverPanelProps {
  ticket: any;
  handoverPaymentMethod: PaymentMethod;
  setHandoverPaymentMethod: (v: PaymentMethod) => void;
  handoverRefNo: string;
  setHandoverRefNo: (v: string) => void;
  handoverProofName: string;
  setHandoverProofName: (v: string) => void;
  handoverTempoDays: string;
  setHandoverTempoDays: (v: string) => void;
  handoverChecklist: {
    accessoriesReturned: boolean;
    customerChecked: boolean;
    invoiceReady: boolean;
    warrantyReady: boolean;
  };
  setHandoverChecklist: React.Dispatch<
    React.SetStateAction<{
      accessoriesReturned: boolean;
      customerChecked: boolean;
      invoiceReady: boolean;
      warrantyReady: boolean;
    }>
  >;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  handoverServiceDevice: (
    ticketId: string,
    method: PaymentMethod,
    details: any,
  ) => Promise<any>;
  setShowInvoicePrintout: (id: string | null) => void;
  setShowWarrantyPrintout: (id: string | null) => void;
}

// Panel serah terima unit (handover) + preview jurnal/garansi/stok.
// Diekstrak dari ServicesTab.tsx (bagian Section 3) agar god-component mengecil.
export const HandoverPanel: React.FC<HandoverPanelProps> = ({
  ticket,
  handoverPaymentMethod,
  setHandoverPaymentMethod,
  handoverRefNo,
  setHandoverRefNo,
  handoverProofName,
  setHandoverProofName,
  handoverTempoDays,
  setHandoverTempoDays,
  handoverChecklist,
  setHandoverChecklist,
  showToast,
  handoverServiceDevice,
  setShowInvoicePrintout,
  setShowWarrantyPrintout,
}) => {
  if (!["SELESAI", "SIAP_DIAMBIL"].includes(ticket.status)) return null;

  const isRefOrProofRequired =
    handoverPaymentMethod !== PaymentMethod.CASH &&
    handoverPaymentMethod !== PaymentMethod.TEMPO;
  const isHandoverValid =
    !isRefOrProofRequired ||
    handoverRefNo.trim() !== "" ||
    handoverProofName.trim() !== "";

  const estCost = ticket.estimatedCost || 0;
  const taxAmt = Math.round(estCost * 0.11);
  const totalAmt = estCost + taxAmt;
  const targetAccountLabel =
    handoverPaymentMethod === PaymentMethod.TEMPO
      ? "10300 - Piutang Usaha"
      : handoverPaymentMethod === PaymentMethod.CASH
        ? "10100 - Kas Utama"
        : "10200 - Bank / Payment Gateway";
  const warrantyEndsPreview = new Date(
    Date.now() + (ticket.warrantyMonths || 0) * 30 * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .split("T")[0];
  const partsImpact = ticket.partsUsed || [];
  const isChecklistComplete = Object.values(handoverChecklist).every(Boolean);

  return (
    <div className="space-y-3.5 border border-slate-200/85 dark:border-zinc-800 p-4 rounded-xl bg-slate-50/70 dark:bg-zinc-900 w-full text-left shadow-sm dark:text-zinc-300 dark:[&_.bg-white]:bg-zinc-950 dark:[&_.border-slate-200]:border-zinc-800 dark:[&_.text-slate-700]:text-zinc-200 dark:[&_.text-slate-600]:text-zinc-300 dark:[&_input]:bg-zinc-950 dark:[&_input]:text-zinc-100 dark:[&_select]:bg-zinc-950 dark:[&_select]:text-zinc-100">
      <div className="flex justify-between items-center bg-accent-lighter/50 border border-indigo-100/60 p-3 rounded-lg text-xs font-semibold text-slate-700">
        <span className="text-slate-600">Total Tagihan Pelunasan (PPN 11%):</span>
        <span className="text-accent font-mono text-sm font-bold">
          Rp {totalAmt.toLocaleString()}
        </span>
      </div>

      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Metode Pembayaran Pelunasan
        </label>
        <select
          value={handoverPaymentMethod}
          onChange={(e) => {
            setHandoverPaymentMethod(e.target.value as PaymentMethod);
            setHandoverRefNo("");
            setHandoverProofName("");
          }}
          className="block w-full text-xs px-2.5 py-2 border border-slate-200 bg-white rounded-lg outline-none focus:border-accent font-medium text-slate-700 shadow-xs"
        >
          <option value={PaymentMethod.CASH}>💵 CASH / TUNAI (Kas Utama)</option>
          <option value={PaymentMethod.BANK_TRANSFER}>
            🏦 TRANSFER BANK (Bank Mandiri)
          </option>
          <option value={PaymentMethod.QRIS}>📱 QRIS (Bank Mandiri)</option>
          <option value={PaymentMethod.EDC}>💳 DEBIT / EDC (Bank Mandiri)</option>
          <option value={PaymentMethod.E_WALLET}>
            👛 E-WALLET (Bank Mandiri)
          </option>
          <option value={PaymentMethod.TEMPO}>
            ⏳ TEMPO / BAYAR NANTI (Piutang Usaha)
          </option>
        </select>
      </div>

      {handoverPaymentMethod === PaymentMethod.TEMPO && (
        <div className="space-y-2.5 animate-fadeIn">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Termin Jatuh Tempo (Hari)
            </label>
            <select
              value={handoverTempoDays}
              onChange={(e) => setHandoverTempoDays(e.target.value)}
              className="block w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-accent font-medium text-slate-700 shadow-xs"
            >
              <option value="15">15 Hari</option>
              <option value="30">30 Hari (Default)</option>
              <option value="45">45 Hari</option>
              <option value="60">60 Hari</option>
            </select>
          </div>
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-[11px] text-amber-800 leading-relaxed shadow-3xs">
            📌 <strong>Informasi Piutang & Pinjaman</strong>: Penyerahan dengan
            status tempo akan mencatat piutang customer sebesar{" "}
            <strong>Rp {totalAmt.toLocaleString()}</strong> ke akun{" "}
            <strong>10300 - Piutang Usaha B2B</strong>. Transaksi kas tidak
            bertambah sampai pembayaran piutang dilunasi oleh pelanggan di modul
            keuangan.
          </div>
        </div>
      )}

      {isRefOrProofRequired && (
        <div className="space-y-3 border-t border-slate-200/80 pt-3 animate-fadeIn">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Nomor Referensi Transaksi <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: TRX-1029302 atau No. Rek / Slip"
              value={handoverRefNo}
              onChange={(e) => setHandoverRefNo(e.target.value)}
              className="block w-full text-xs px-2.5 py-2 border border-slate-200 bg-white rounded-lg outline-none focus:border-accent font-medium text-slate-700 shadow-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Bukti Transfer (Upload / Seret File){" "}
              <span className="text-rose-500 font-bold">*</span>
            </label>
            {handoverProofName ? (
              <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                <div className="flex items-center gap-1.5 font-medium truncate">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">{handoverProofName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setHandoverProofName("")}
                  className="text-red-500 hover:text-red-700 font-bold ml-2 cursor-pointer text-xs"
                >
                  Hapus
                </button>
              </div>
            ) : (
              <div
                onClick={() => {
                  document.getElementById(`proof-upload-${ticket.id}`)?.click();
                }}
                className="border-2 border-dashed border-slate-200 hover:border-accent/60 hover:bg-accent-lighter/30 p-4 rounded-lg text-center cursor-pointer transition-all duration-150"
              >
                <input
                  type="file"
                  id={`proof-upload-${ticket.id}`}
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setHandoverProofName(file.name);
                  }}
                />
                <p className="text-[11px] text-slate-500 font-medium">
                  Klik untuk memilih atau seret file bukti transfer
                </p>
                <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                  Maks. File: 5MB (PNG, JPG, PDF)
                </p>
              </div>
            )}
          </div>

          {!isHandoverValid && (
            <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-600 font-medium leading-relaxed">
              ⚠️ <strong>Validasi Gagal</strong>: Harap masukkan Nomor Referensi
              ATAU unggah file Bukti Transfer sebagai prasyarat status 'Unit
              Diambil'.
            </div>
          )}
        </div>
      )}

      <div className="border border-amber-200 bg-amber-50/80 rounded-xl p-3 space-y-2">
        <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
          <ListChecks className="w-3.5 h-3.5" /> Checklist Serah Terima Unit
        </p>
        <p className="text-[9px] text-amber-700 leading-relaxed">
          Pastikan semua item berikut terpenuhi sebelum klik tombol handover.
        </p>
        {[
          { key: "accessoriesReturned", label: "Charger / adaptor dan aksesoris dikembalikan" },
          { key: "customerChecked", label: "Customer sudah cek kondisi unit" },
          { key: "invoiceReady", label: "Invoice pembayaran sudah dicetak" },
          { key: "warrantyReady", label: "Kartu garansi sudah dicetak" },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-start gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={(handoverChecklist as any)[key]}
              onChange={(e) =>
                setHandoverChecklist((prev) => ({
                  ...prev,
                  [key]: e.target.checked,
                }))
              }
              className="mt-0.5 w-3.5 h-3.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <span className="text-[10px] font-medium text-slate-600 group-hover:text-amber-800 transition-colors leading-tight">
              {label}
            </span>
          </label>
        ))}
        {Object.values(handoverChecklist).some((v) => !v) && (
          <div className="p-1.5 bg-amber-100/80 border border-amber-200 rounded-lg text-[9px] text-amber-700 font-medium">
            ⚠️ Centang semua item sebelum menyelesaikan handover.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-slate-200/80 pt-3">
        <div className="bg-white border border-indigo-100 rounded-xl p-3 shadow-xs">
          <p className="text-[10px] font-black text-accent uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5" /> Preview Jurnal Otomatis
          </p>
          <div className="space-y-1.5 text-[10px] font-mono text-slate-600">
            <div className="flex justify-between gap-3">
              <span>Debit {targetAccountLabel}</span>
              <strong>Rp {totalAmt.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between gap-3">
              <span>Kredit Pendapatan Servis</span>
              <strong>Rp {estCost.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between gap-3">
              <span>Kredit PPN Keluaran 11%</span>
              <strong>Rp {taxAmt.toLocaleString()}</strong>
            </div>
          </div>
        </div>
        <div className="bg-white border border-emerald-100 rounded-xl p-3 shadow-xs">
          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Preview Garansi & Status
          </p>
          <div className="space-y-1.5 text-[10px] font-mono text-slate-600">
            <div className="flex justify-between gap-3">
              <span>Status Tiket</span>
              <strong>DIAMBIL</strong>
            </div>
            <div className="flex justify-between gap-3">
              <span>Garansi Aktif Sampai</span>
              <strong>{warrantyEndsPreview}</strong>
            </div>
            <div className="flex justify-between gap-3">
              <span>Kartu Garansi</span>
              <strong>Terkirim</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-amber-100 rounded-xl p-3 shadow-xs">
        <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5" /> Preview Stok Sparepart Keluar
        </p>
        {partsImpact.length > 0 ? (
          <div className="space-y-1.5">
            {partsImpact.map((part: any, idx: number) => (
              <div
                key={`${part.productId || part.name}-${idx}`}
                className="flex justify-between gap-3 text-[10px] font-mono text-slate-600"
              >
                <span className="truncate">
                  {part.name || part.productName || part.productId}
                </span>
                <strong>-{part.quantity || part.qty || 0} pcs</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-slate-500">
            Tidak ada sparepart tercatat. Handover hanya membuat jurnal
            pendapatan, pembayaran, dan garansi.
          </p>
        )}
      </div>

      <button
        onClick={() => {
          if (isRefOrProofRequired && !isHandoverValid) {
            showToast(
              "Gagal memproses: Nomor referensi atau unggah bukti transfer diperlukan!",
              "error",
            );
            return;
          }
          const detailsObj = {
            refNo: handoverRefNo.trim() || undefined,
            proofName: handoverProofName.trim() || undefined,
            tempoDays:
              handoverPaymentMethod === PaymentMethod.TEMPO
                ? parseInt(handoverTempoDays, 10)
                : undefined,
          };

          handoverServiceDevice(ticket.id, handoverPaymentMethod, detailsObj);

          setHandoverRefNo("");
          setHandoverProofName("");
          setHandoverTempoDays("30");
          setHandoverChecklist({
            accessoriesReturned: false,
            customerChecked: false,
            invoiceReady: false,
            warrantyReady: false,
          });

          showToast(
            handoverPaymentMethod === PaymentMethod.TEMPO
              ? `Serah terima berhasil via TEMPO! Piutang dicatat sebesar Rp ${totalAmt.toLocaleString()}.`
              : `Serah terima berhasil via ${handoverPaymentMethod}! Status diubah menjadi DIAMBIL.`,
            "success",
          );
        }}
        disabled={
          (isRefOrProofRequired && !isHandoverValid) || !isChecklistComplete
        }
        className={`w-full font-bold text-xs py-2.5 rounded-lg text-center transition-all duration-150 ${
          (isRefOrProofRequired && !isHandoverValid) || !isChecklistComplete
            ? "bg-slate-300 text-slate-500 cursor-not-allowed"
            : "bg-accent hover:bg-accent-hover text-white cursor-pointer"
        }`}
      >
        Konfirmasi Handover & Sinkronkan Accounting
      </button>

      {ticket.status === "DIAMBIL" && (
        <div className="w-full border border-emerald-200 bg-emerald-50/80 rounded-xl p-3 space-y-3 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Dokumen Siap Dicetak
              </p>
              <p className="text-[10px] text-emerald-700 mt-1 leading-relaxed">
                Unit sudah handover. Invoice pembayaran dan kartu garansi siap
                diberikan ke customer.
              </p>
            </div>
            <span className="text-[9px] font-mono font-bold bg-white text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
              DIAMBIL
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => setShowInvoicePrintout(ticket.id)}
              className="px-3 py-2 bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <FileText className="w-3.5 h-3.5" /> Cetak Invoice Pembayaran
            </button>
            <button
              onClick={() => setShowWarrantyPrintout(ticket.id)}
              className="px-3 py-2 bg-white border border-indigo-200 hover:bg-indigo-100 text-accent rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Cetak Kartu Garansi
            </button>
          </div>
        </div>
      )}

      <p className="text-[9px] text-slate-400 italic">
        Gunakan tombol cetak SPK di pojok kanan atas untuk memprint tanda terima
        unit.
      </p>
    </div>
  );
};
