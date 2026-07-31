import * as React from 'react';
import { MessageSquare } from 'lucide-react';

interface ServiceInternalDiscussionProps {
  ticket: any;
  currentUser: any;
  value: string;
  onChange: (value: string) => void;
  patchServiceWork: (id: string, updates: { internalDiscussion: { text: string } }) => Promise<unknown>;
  canComment: boolean;
  onUpdated?: (ticket: any) => void;
}

export const ServiceInternalDiscussion: React.FC<ServiceInternalDiscussionProps> = ({
  ticket,
  value,
  onChange,
  patchServiceWork,
  canComment,
  onUpdated,
}) => {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState('');
  const submit = async () => {
    if (!canComment || !value.trim() || pending) return;
    setPending(true);
    setError('');
    try {
      const updated = await patchServiceWork(ticket.id, { internalDiscussion: { text: value.trim() } });
      if (updated) onUpdated?.(updated);
      onChange('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal mengirim diskusi.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="relative overflow-hidden p-3.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-3 max-h-80">
      <h4 className="relative font-bold text-xs text-amber-700 dark:text-amber-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Diskusi Internal (Tim)
      </h4>
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {ticket.internalDiscussions && ticket.internalDiscussions.length > 0 ? (
          ticket.internalDiscussions.map((msg: any, idx: number) => (
            <div
              key={msg.id || idx}
              className="bg-white dark:bg-zinc-800 p-2 rounded-lg border border-slate-200 dark:border-zinc-700 relative"
            >
              <div className="flex items-center justify-between mb-1 text-xs">
                <span className="font-bold text-amber-800">{msg.operator}</span>
                <span className="text-amber-500/70">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-zinc-300 whitespace-pre-wrap">{msg.text}</p>
            </div>
          ))
        ) : (
          <p className="text-xs text-amber-600/60 italic text-center py-2">
            Belum ada diskusi internal.
          </p>
        )}
      </div>
      {error && <p role="alert" className="relative text-xs text-rose-600">{error}</p>}
      <div className="pt-2 border-t border-amber-200/50 flex gap-2">
        <input
          type="text"
           value={value}
           maxLength={5000}
           onChange={(e) => onChange(e.target.value)}
          disabled={!canComment}
          placeholder={canComment ? 'Ketik pesan untuk tim...' : 'Tidak punya akses menulis'}
          className="flex-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-300 rounded-lg text-xs px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
        />
        <button
          onClick={() => void submit()}
            disabled={!canComment || !value.trim() || pending}
          className="bg-amber-500 disabled:bg-amber-300 hover:bg-amber-600 text-white p-1.5 rounded-lg transition"
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
