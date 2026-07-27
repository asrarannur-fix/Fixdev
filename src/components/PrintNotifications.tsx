import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';

export interface PrintNotification {
  id: string;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  timestamp: number;
  documentType?: string;
  documentId?: string;
  transport?: string;
  printer?: string;
}

const MAX_NOTIFICATIONS = 5;
const AUTO_DISMISS_MS = 6000;

const _listeners = new Set<(n: PrintNotification) => void>();

export const emitPrintNotification = (n: Omit<PrintNotification, 'id' | 'timestamp'>) => {
  const full: PrintNotification = { ...n, id: crypto.randomUUID(), timestamp: Date.now() };
  _listeners.forEach((fn) => fn(full));
};

export const usePrintNotifications = () => {
  const [notifications, setNotifications] = useState<PrintNotification[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const handler = (n: PrintNotification) => {
      setNotifications((prev) => {
        const next = [n, ...prev].slice(0, MAX_NOTIFICATIONS);
        return next;
      });
      timers.set(
        n.id,
        setTimeout(() => {
          timers.delete(n.id);
          setNotifications((prev) => prev.filter((x) => x.id !== n.id));
        }, AUTO_DISMISS_MS)
      );
    };
    _listeners.add(handler);
    return () => {
      _listeners.delete(handler);
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  return { notifications, dismiss };
};

const TYPE_META: Record<string, { bg: string; border: string; icon: React.FC<any> }> = {
  success: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2 },
  error: { bg: 'bg-red-50', border: 'border-red-200', icon: XCircle },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle },
};

export const PrintNotificationToast: React.FC<{
  notifications: PrintNotification[];
  dismiss: (id: string) => void;
}> = ({ notifications, dismiss }) => {
  if (notifications.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-sm">
      {notifications.map((n) => {
        const meta = TYPE_META[n.type] || TYPE_META.success;
        const Icon = meta.icon;
        return (
          <div
            key={n.id}
            className={`${meta.bg} border ${meta.border} rounded-lg shadow-lg p-3 flex items-start gap-2 animate-[slideIn_0.2s_ease-out]`}
          >
            <Icon
              className={`w-4 h-4 mt-0.5 shrink-0 ${n.type === 'success' ? 'text-emerald-600' : n.type === 'error' ? 'text-red-600' : 'text-amber-600'}`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800">{n.title}</p>
              <p className="text-xs text-gray-600 truncate">{n.message}</p>
              {n.transport && (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {n.transport === 'qz' ? 'QZ Tray' : 'Browser'} {n.printer ? `• ${n.printer}` : ''}
                </p>
              )}
            </div>
            <button
              onClick={() => dismiss(n.id)}
              className="text-gray-400 hover:text-gray-600 shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
