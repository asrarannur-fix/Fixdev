import * as React from 'react';

interface ChecklistItem {
  name: string;
  checked: boolean;
}

interface ServiceIntakeChecklistProps {
  items?: ChecklistItem[];
}

export const ServiceIntakeChecklist: React.FC<ServiceIntakeChecklistProps> = ({ items = [] }) => {
  if (!items.length) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/40 p-3.5 shadow-md dark:border-zinc-800/40">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-teal-500/5 to-emerald-500/5" />
      <h4 className="relative flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
        <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500" />
        Checklist Masuk
      </h4>
      <div className="relative mt-2 grid grid-cols-1 gap-1.5">
        {items.map((item, index) => (
          <div key={`${item.name}-${index}`} className="flex items-center justify-between border-b border-slate-50 py-1 text-xs last:border-0">
            <span className="text-slate-600">{item.name}</span>
            <span className={`rounded-lg px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase ${item.checked ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-rose-200 bg-rose-50 text-rose-700'}`}>
              {item.checked ? 'OK' : 'BELUM DIPERIKSA'}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};
