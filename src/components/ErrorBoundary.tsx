import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="p-8 my-6 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200/50 dark:border-rose-900/30 rounded-2xl text-center max-w-2xl mx-auto space-y-4 animate-fadeIn"
          id="subtab-error-boundary"
        >
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-xs">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-slate-800 dark:text-rose-400 uppercase tracking-wider">
              Gagal Memuat Modul
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Terjadi kesalahan internal saat mencoba menampilkan halaman ini.
            </p>
          </div>
          {this.state.error && (
            <div className="p-3 bg-rose-100/30 dark:bg-rose-950/20 rounded-xl max-h-32 overflow-y-auto text-left font-mono text-[10px] text-rose-700 dark:text-rose-300 border border-rose-200/20">
              {this.state.error.toString()}
            </div>
          )}
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Muat Ulang Modul
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
