import * as React from "react";
import { Trash2 } from "lucide-react";

interface SparepartsLedgerProps {
  ticket: any;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  cancelServicePart: (id: string, partId: string) => Promise<void>;
  setManualDiagCost: React.Dispatch<React.SetStateAction<string>>;
}

// Daftar sparepart yang dipakai di tiket servis + input biaya diagnosa manual.
// Diekstrak dari ServicesTab.tsx (Section 2) agar god-component mengecil.
export const SparepartsLedger: React.FC<SparepartsLedgerProps> = ({
  ticket,
  showToast,
  cancelServicePart,
  setManualDiagCost,
}) => {
  return (
    <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
      <div className="flex justify-between items-center">
        <h4 className="font-bold text-xs uppercase tracking-wide text-slate-500">
          Spareparts Used Ledger
        </h4>
        <span className="text-[10px] font-semibold text-slate-400">
          {ticket.partsUsed?.length || 0} item
        </span>
      </div>

      {ticket.partsUsed && ticket.partsUsed.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-[11px]">
            <thead className="bg-slate-50 text-slate-500 font-semibold">
              <tr>
                <th className="text-left px-2 py-1.5">Item</th>
                <th className="text-right px-2 py-1.5">Qty</th>
                <th className="text-right px-2 py-1.5">Harga</th>
                <th className="text-right px-2 py-1.5 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ticket.partsUsed.map((part: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/60">
                  <td className="px-2 py-1.5 text-slate-700">
                    {part.name || part.productName}
                  </td>
                  <td className="px-2 py-1.5 text-right text-slate-600">
                    {part.quantity || part.qty}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-slate-700">
                    Rp {(part.price || 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <button
                      onClick={() => cancelServicePart(ticket.id, part.id)}
                      className="text-rose-500 hover:text-rose-700"
                      title="Batalkan sparepart"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-[11px] text-slate-400 italic">
          Belum ada sparepart yang dicatat untuk servis ini.
        </p>
      )}

      <div className="space-y-1 pt-1">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Biaya Diagnosa Manual (Override)
        </label>
        <input
          type="number"
          min={0}
          value={ticket.manualDiagCost ?? ""}
          onChange={(e) => setManualDiagCost(e.target.value)}
          placeholder="Kosongkan untuk pakai default"
          className="block w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-accent font-medium text-slate-700"
        />
      </div>
    </div>
  );
};
