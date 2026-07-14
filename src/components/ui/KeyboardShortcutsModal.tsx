import React from "react";
import { createPortal } from "react-dom";
import { X, Keyboard } from "lucide-react";

interface ShortcutItem {
  keys: string;
  label: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: "⌘ / Ctrl + K", label: "Buka Command Palette (pencarian)" },
  { keys: "G lalu O", label: "Buka Dashboard / Overview" },
  { keys: "G lalu S", label: "Buka modul Servis" },
  { keys: "G lalu P", label: "Buka modul Kasir (POS)" },
  { keys: "G lalu I", label: "Buka modul Inventory" },
  { keys: "G lalu A", label: "Buka modul Accounting" },
  { keys: "G lalu H", label: "Buka modul HR / Payroll" },
  { keys: "G lalu C", label: "Buka modul CRM" },
  { keys: "G lalu F", label: "Buka modul Fraud / Keamanan" },
  { keys: "G lalu T", label: "Buka modul Pengaturan" },
  { keys: "?", label: "Tampilkan bantuan shortcut ini" },
];

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  open,
  onClose,
}) => {
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center">
            <Keyboard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h4 className="text-sm font-black text-slate-900 dark:text-white">
            Pintasan Keyboard
          </h4>
          <button
            onClick={onClose}
            className="ml-auto p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="space-y-1.5">
          {SHORTCUTS.map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-between gap-4 py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800/60"
            >
              <span className="text-xs text-slate-600 dark:text-zinc-300">
                {s.label}
              </span>
              <kbd className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 px-2 py-1 rounded-md shadow-inner whitespace-nowrap">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-4 leading-relaxed">
          Tekan <kbd className="font-mono">G</kbd> lalu huruf dalam 1 detik untuk
          berpindah modul dengan cepat. Pintasan tidak aktif saat mengetik di
          input.
        </p>
      </div>
    </div>,
    document.body,
  );
};
