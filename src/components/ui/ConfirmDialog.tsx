import React, { createContext, useContext, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X, Check, AlertCircle } from "lucide-react";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: "danger" | "info" | "warning" | "primary";
  showInput?: boolean;
  defaultValue?: string;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: ConfirmOptions) => Promise<string | null>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [resolveRef, setResolveRef] = useState<{
    resolve: (value: any) => void;
  } | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    console.log("CONFIRM CALLED with options:", opts);
    setOptions({ ...opts, showInput: false });
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolveRef({ resolve });
    });
  }, []);

  const prompt = useCallback((opts: ConfirmOptions) => {
    setOptions({ ...opts, showInput: true });
    setInputValue(opts.defaultValue || "");
    setIsOpen(true);
    return new Promise<string | null>((resolve) => {
      setResolveRef({ resolve });
    });
  }, []);

  const handleCancel = () => {
    setIsOpen(false);
    if (resolveRef) resolveRef.resolve(options?.showInput ? null : false);
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolveRef) resolveRef.resolve(options?.showInput ? inputValue : true);
  };

  return (
    <ConfirmContext.Provider value={{ confirm, prompt }}>
      {children}
      {isOpen && options && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message">
          <div
            onClick={handleCancel}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
          />
          <div
            className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div
                  className={`p-3 rounded-xl ${
                    options.type === "danger"
                      ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
                      : options.type === "warning"
                        ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
                        : "bg-accent-lighter text-accent dark:bg-indigo-950/30 dark:text-accent"
                  }`}
                >
                  {options.type === "danger" ? (
                    <AlertCircle className="w-6 h-6" />
                  ) : (
                    <AlertTriangle className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 id="confirm-dialog-title" className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                    {options.title}
                  </h3>
                </div>
              </div>

              <p id="confirm-dialog-message" className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                {options.message}
              </p>

              {options.showInput && (
                <input
                  autoFocus
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-accent outline-none transition-all"
                  placeholder="Ketik di sini..."
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                {options.cancelLabel || "Batal"}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-lg transition-all cursor-pointer active:scale-95 ${
                  options.type === "danger"
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
                    : options.type === "warning"
                      ? "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20"
                      : "bg-accent hover:bg-accent-hover shadow-accent/20"
                }`}
              >
                {options.confirmLabel ||
                  (options.showInput ? "Simpan" : "Ya, Lanjutkan")}
              </button>
            </div>
          </div>
        </div>,
        document.body
        )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
};
