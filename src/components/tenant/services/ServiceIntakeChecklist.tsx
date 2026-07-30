import * as React from 'react';

interface ChecklistItem {
  name: string;
  checked: boolean;
}

interface ServiceIntakeChecklistProps {
  items?: ChecklistItem[];
  editable?: boolean;
  onSave?: (items: ChecklistItem[]) => Promise<void>;
}

export const ServiceIntakeChecklist: React.FC<ServiceIntakeChecklistProps> = ({
  items = [],
  editable = false,
  onSave,
}) => {
  const [draft, setDraft] = React.useState(items);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => setDraft(items), [items]);
  if (!items.length) return null;

  const save = async () => {
    if (!onSave || pending) return;
    setPending(true);
    setError('');
    try {
      await onSave(draft);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal menyimpan checklist masuk.');
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/40 p-3.5 shadow-md dark:border-zinc-800/40">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-teal-500/5 to-emerald-500/5" />
      <h4 className="relative flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
        <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500" />
        Checklist Masuk
      </h4>
      <div className="relative mt-2 grid grid-cols-1 gap-1.5">
        {draft.map((item, index) => (
          <label key={`${item.name}-${index}`} className="flex items-center justify-between border-b border-slate-50 py-1 text-xs last:border-0">
            <span className="text-slate-600">{item.name}</span>
            <input
              type="checkbox"
              checked={item.checked}
              disabled={!editable || pending}
              onChange={() => setDraft((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, checked: !entry.checked } : entry))}
            />
          </label>
        ))}
      </div>
      {error && <p role="alert" className="relative mt-2 text-xs text-rose-600">{error}</p>}
      {editable && <button type="button" disabled={pending} onClick={() => void save()} className="relative mt-3 w-full rounded-lg bg-cyan-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{pending ? 'Menyimpan…' : 'Simpan Checklist'}</button>}
    </section>
  );
};
