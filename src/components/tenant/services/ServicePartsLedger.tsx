import * as React from 'react';
import { Trash2 } from 'lucide-react';

interface ServicePartsLedgerProps {
  ticket: any;
  onCancelPart: (part: any) => void;
  canCancel: boolean;
}

export const ServicePartsLedger: React.FC<ServicePartsLedgerProps> = ({ ticket, onCancelPart, canCancel }) => (
  <div className="relative overflow-hidden border border-white/20 dark:border-zinc-800/40 rounded-2xl p-4 space-y-3 shadow-md">
    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-fuchsia-500/5" />
    <h4 className="relative font-black text-xs text-violet-700 dark:text-violet-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-500" />
      Rincian Komponen Suku Cadang Terpakai
    </h4>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs text-slate-600">
        <thead className="bg-slate-50 font-mono text-xs uppercase border-b border-slate-100">
          <tr>
            <th className="px-3 py-2">Nama Barang</th>
            <th className="px-3 py-2">Harga Satuan</th>
            <th className="px-3 py-2">Qty</th>
            <th className="px-3 py-2">Total Harga</th>
            <th className="px-3 py-2 text-right">Tindakan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {ticket.partsUsed && ticket.partsUsed.length > 0 ? (
            ticket.partsUsed.map((part: any, pIdx: number) => (
              <tr key={pIdx} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-700">
                  {part.name}
                  {part.serialNumber && (
                    <div className="text-xs font-mono text-indigo-500 mt-0.5 border border-indigo-100 bg-accent-lighter inline-block px-1 rounded">
                      SN: {part.serialNumber}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 font-mono">Rp {Number(part.unitPrice || 0).toLocaleString('id-ID')}</td>
                <td className="px-3 py-2 font-mono font-bold">{part.quantity}</td>
                <td className="px-3 py-2 font-mono font-extrabold text-accent">Rp {Number(part.totalPrice || 0).toLocaleString('id-ID')}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    disabled={!canCancel}
                    aria-label={`Batalkan ${part.name}`}
                    onClick={() => onCancelPart(part)}
                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer transition-all inline-flex items-center disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-3 py-3 text-slate-400 italic text-xs text-center bg-slate-50/50 rounded-lg">
                Belum ada suku cadang yang diaplikasikan pada unit perbaikan ini.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);
