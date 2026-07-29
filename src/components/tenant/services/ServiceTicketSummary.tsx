import * as React from 'react';
import { Cpu } from 'lucide-react';

export const ServiceTicketSummary: React.FC<{ ticket: any; customer: any }> = ({ ticket, customer }) => {
  const accessories = (ticket.accessoriesLeft || [])
    .map((accessory: string) => ({ charger: 'Charger', cable: 'Kabel', sim: 'SIM', sd: 'SD', case: 'Case', box: 'Box' }[accessory] || accessory))
    .join(', ');
  const estimatedCompletion = ticket.estimatedCompletionDate ? new Date(ticket.estimatedCompletionDate) : null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/40 p-3 shadow-md dark:border-zinc-800/40">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-fuchsia-500/5" />
      <div className="relative space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p><span className="font-mono text-[10px] text-slate-400">PELANGGAN:</span> <strong className="text-slate-800">{customer?.name || 'Umum'}</strong></p>
        <p><span className="font-mono text-[10px] text-slate-400">PHONE:</span> <span className="font-mono">{customer?.phone || '-'}</span></p>
        <p><span className="font-mono text-[10px] text-slate-400">TIPE UNIT:</span> <strong className="text-slate-700">{ticket.deviceName}</strong></p>
        {ticket.deviceBrandModel && <p><span className="font-mono text-[10px] text-slate-400">BRAND/MODEL:</span> {ticket.deviceBrandModel}</p>}
        <p><span className="font-mono text-[10px] text-slate-400">SERIAL NO:</span> <span className="rounded border border-slate-100 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px]">{ticket.deviceSerial || 'N/A'}</span></p>
        <p><span className="font-mono text-[10px] text-slate-400">MASA GARANSI:</span> <strong className="text-accent">{ticket.warrantyMonths} Bulan</strong></p>
        {ticket.deviceCategory && <p><span className="font-mono text-[10px] text-slate-400">KATEGORI:</span> <strong className="text-slate-700">{ticket.deviceCategory}</strong></p>}
        {ticket.physicalCondition && <p><span className="font-mono text-[10px] text-slate-400">KONDISI FISIK:</span> <strong className="text-slate-700">{ticket.physicalCondition}</strong></p>}
        {estimatedCompletion && !Number.isNaN(estimatedCompletion.getTime()) && <p><span className="font-mono text-[10px] text-slate-400">EST. SELESAI:</span> <strong className="text-emerald-700">{estimatedCompletion.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></p>}
        {(accessories || ticket.customAccessories) && <p><span className="font-mono text-[10px] text-slate-400">AKSESORIS TITIPAN:</span> <span className="text-[11px] font-semibold text-slate-700">{[accessories, ticket.customAccessories].filter(Boolean).join(', ')}</span></p>}
        {ticket.isCheckOnly && <div className="mt-1 rounded-lg border border-amber-100 bg-amber-50 px-2 py-1 text-[10.5px] font-bold text-amber-800">HANYA CEK / ESTIMASI DULU</div>}
        {ticket.downPayment > 0 && <div className="mt-1 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10.5px] font-bold text-emerald-800"><span>UANG MUKA (DP):</span><span>Rp {ticket.downPayment.toLocaleString()}</span></div>}
        {ticket.dynamicFields && Object.keys(ticket.dynamicFields).length > 0 && <div className="mt-2.5 space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5"><p className="flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider text-accent"><Cpu className="h-3.5 w-3.5 text-indigo-500" /> Spesifikasi Kategori ({ticket.deviceCategory})</p>{Object.entries(ticket.dynamicFields).map(([key, value]) => <div key={key} className="flex justify-between border-b border-slate-100 py-0.5 text-[10.5px] last:border-0"><span className="capitalize text-slate-400">{key.replace('_', ' ')}:</span><strong className="font-mono text-[10px] text-slate-700">{String(value)}</strong></div>)}</div>}
      </div>
    </section>
  );
};
