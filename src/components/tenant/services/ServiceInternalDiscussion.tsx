import * as React from 'react';
import { MessageSquare } from 'lucide-react';

interface ServiceInternalDiscussionProps {
  ticket: any;
  currentUser: any;
  value: string;
  onChange: (value: string) => void;
  updateServiceTicket: (id: string, updates: any) => void;
  canComment: boolean;
}

export const ServiceInternalDiscussion: React.FC<ServiceInternalDiscussionProps> = ({
  ticket,
  currentUser,
  value,
  onChange,
  updateServiceTicket,
  canComment,
}) => {
  const submit = (suffix: string) => {
    if (!canComment || !value.trim()) return;
    updateServiceTicket(ticket.id, {
      internalDiscussions: [
        ...(ticket.internalDiscussions || []),
        {
          id: 'comm-' + Date.now().toString(36) + suffix,
          text: value.trim(),
          operator: currentUser?.name || 'System',
          timestamp: new Date().toISOString(),
        },
      ],
    });
    onChange('');
  };

  return (
    <div className="relative overflow-hidden p-3.5 border border-amber-200/50 dark:border-amber-800/30 rounded-2xl space-y-3 shadow-md max-h-80">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-yellow-500/5" />
      <h4 className="relative font-bold text-[10px] text-amber-700 dark:text-amber-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500" />
        Diskusi Internal (Tim)
      </h4>
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {ticket.internalDiscussions && ticket.internalDiscussions.length > 0 ? (
          ticket.internalDiscussions.map((msg: any, idx: number) => (
            <div
              key={msg.id || idx}
              className="bg-white p-2 rounded-lg border border-amber-100 shadow-sm relative"
            >
              <div className="flex items-center justify-between mb-1 text-[9px]">
                <span className="font-bold text-amber-800">{msg.operator}</span>
                <span className="text-amber-500/70">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-[10px] text-slate-700 whitespace-pre-wrap">{msg.text}</p>
            </div>
          ))
        ) : (
          <p className="text-[10px] text-amber-600/60 italic text-center py-2">
            Belum ada diskusi internal.
          </p>
        )}
      </div>
      <div className="pt-2 border-t border-amber-200/50 flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={!canComment}
          placeholder={canComment ? 'Ketik pesan untuk tim...' : 'Tidak punya akses menulis'}
          className="flex-1 bg-white border border-amber-200 rounded-lg text-[10px] px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit('1');
          }}
        />
        <button
          onClick={() => submit('2')}
           disabled={!canComment || !value.trim()}
          className="bg-amber-500 disabled:bg-amber-300 hover:bg-amber-600 text-white p-1.5 rounded-lg transition"
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
