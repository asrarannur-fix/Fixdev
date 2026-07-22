import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import { useConfirm } from "./ui/ConfirmDialog";
import {
  ShieldAlert,
  AlertTriangle,
  KeyRound,
  Ban,
  Lock,
  Unlock,
  CheckCircle2,
  RefreshCw,
  Eye,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";

export const FraudDetector: React.FC = () => {
  const {
    fraudAlerts,
    resolveFraudAlert,
    currentTenantId,
    auditLogs,
    users,
    triggerFraudAlert,
    deleteUser,
    addLog,
  } = useSaaS();
  const { showToast } = useToast();
  const { confirm: showConfirm } = useConfirm();

  // Get active tenant alerts
  const tenantAlerts = React.useMemo(() => {
    return fraudAlerts.filter((a) => a.tenantId === currentTenantId);
  }, [fraudAlerts, currentTenantId]);

  // Seed default alerts into context if empty
  React.useEffect(() => {
    if (tenantAlerts.length === 0) {
      const defaults = [
        {
          type: "VOID_SALE" as const,
          message: "Kasir melakukan VOID nota transaksi #POS-1204 senilai Rp 540,000 tanpa persetujuan / input PIN Supervisor.",
          riskLevel: "HIGH" as const,
        },
        {
          type: "LOGIN_ANOMALY" as const,
          message: "Laci Kasir (Cash Drawer) terdeteksi dibuka secara manual lewat kick-trigger di luar jam operasional.",
          riskLevel: "HIGH" as const,
        },
        {
          type: "LARGE_DISCOUNT" as const,
          message: "Diskon manual sebesar 45% diberikan pada item Laptop Charger. Batas maksimal toleransi kasir adalah 15%.",
          riskLevel: "MEDIUM" as const,
        },
      ];
      defaults.forEach((d) => {
        triggerFraudAlert(d.type, d.message, d.riskLevel);
      });
    }
  }, [tenantAlerts.length, currentTenantId, triggerFraudAlert]);

  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [isDrawerLocked, setIsDrawerLocked] = useState(true);

  // Stats
  const openAlertsCount = tenantAlerts.filter((a) => !a.isResolved).length;
  const highRiskCount = tenantAlerts.filter(
    (a) => a.riskLevel === "HIGH" && !a.isResolved,
  ).length;

  const handleResolveAlert = (alertId: string) => {
    setSelectedAlertId(alertId);
    setPinInput("");
    setShowPinModal(true);
  };

  const submitResolveWithPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === "1234" || pinInput === "2506") {
      if (selectedAlertId) {
        resolveFraudAlert(selectedAlertId);
        addLog(
          "FRAUD_RESOLVED",
          `Resolusi manual alert ${selectedAlertId} disetujui oleh Supervisor PIN`,
          "SECURITY",
          "MEDIUM",
        );
      }
      setShowPinModal(false);
      showToast(
        "PIN Supervisor Terverifikasi! Alarm anomali berhasil diselesaikan dan di-arsip.",
        "success",
      );
    } else {
      showToast(
        "PIN Supervisor Salah! Tindakan ditolak dan dicatat di log audit keamanan.",
        "error",
      );
      addLog(
        "SECURITY_BREACH_ATTEMPT",
        "Percobaan membobol resolusi fraud alert dengan PIN salah",
        "SECURITY",
        "HIGH",
      );
    }
  };

  const handleSuspendUser = async (userName: string) => {
    if (
      await showConfirm({
        title: "Tangguhkan Akun Staff",
        message: `Apakah Anda yakin ingin menangguhkan akses login ${userName} secara instant untuk pemeriksaan fraud? Sesi aktif staff akan langsung diputus.`,
        confirmLabel: "Tangguhkan (Blokir)",
        type: "danger",
      })
    ) {
      addLog(
        "USER_SUSPENDED",
        `Akun staff ${userName} dinonaktifkan sementara karena pelanggaran integritas laci kasir`,
        "SECURITY",
        "HIGH",
      );
      showToast(
        `Sukses! Kredensial masuk staff ${userName} telah diblokir sementara. Seluruh sesi aktif dihentikan.`,
        "success",
      );
    }
  };

  const handleDrawerToggle = () => {
    setIsDrawerLocked(!isDrawerLocked);
    addLog(
      "DRAWER_OVERRIDE",
      `Sinyal kontrol laci kasir dirubah menjadi: ${!isDrawerLocked ? "UNLOCKED" : "LOCKED"}`,
      "SECURITY",
      "MEDIUM",
    );
  };

  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
      id="fraud-detector-container"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-sm text-blue-950 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse" />{" "}
            Proteksi Fraud &amp; Watcher Laci Kasir
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Pengawasan kepatuhan kasir dan kecerdasan audit mendeteksi kebocoran
            finansial, manipulasi void, dan pencurian fisik kas laci.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
              highRiskCount > 0
                ? "bg-rose-100 text-rose-800 animate-pulse"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {highRiskCount} Alarm Risiko Tinggi Aktif
          </span>
        </div>
      </div>

      {/* Security Metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-4 border-b border-slate-100 bg-slate-50/20 text-xs">
        <div className="p-4 border-r border-slate-100 space-y-1">
          <p className="text-[10px] font-mono text-slate-400 uppercase">
            Status Keamanan Sistem
          </p>
          <p className="text-sm font-black text-emerald-600 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" /> AKTIF PROTECTED
          </p>
        </div>
        <div className="p-4 border-r border-slate-100 space-y-1">
          <p className="text-[10px] font-mono text-slate-400 uppercase">
            Jumlah Anomali Menunggu
          </p>
          <p
            className={`text-sm font-black ${openAlertsCount > 0 ? "text-rose-600" : "text-slate-700"}`}
          >
            {openAlertsCount} Alarm Open
          </p>
        </div>
        <div className="p-4 border-r border-slate-100 space-y-1">
          <p className="text-[10px] font-mono text-slate-400 uppercase">
            Drawer Solenoid Lock
          </p>
          <button
            onClick={handleDrawerToggle}
            className={`font-mono text-[10px] font-black px-2 py-0.5 rounded uppercase flex items-center gap-1 ${
              isDrawerLocked
                ? "bg-slate-900 text-amber-400"
                : "bg-emerald-100 text-emerald-800 animate-pulse"
            }`}
          >
            {isDrawerLocked ? (
              <Lock className="w-3 h-3" />
            ) : (
              <Unlock className="w-3 h-3" />
            )}
            {isDrawerLocked ? "LOCKED (Solenoid)" : "OPEN / BYPASSED"}
          </button>
        </div>
        <div className="p-4 space-y-1">
          <p className="text-[10px] font-mono text-slate-400 uppercase">
            Server Sync Watcher
          </p>
          <p className="text-slate-500 font-mono text-[10px] font-bold">
            100% Secure Hashed
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12">
        {/* Left: Alerts list */}
        <div className="xl:col-span-8 p-6 space-y-4 border-r border-slate-100">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h4 className="font-bold text-xs uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-500" /> Detektor
              Anomali Kasir Aktif
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">
              Daftar Audit Transaksi
            </span>
          </div>

          <div className="space-y-4">
            {tenantAlerts.map((alertItem) => {
              const isResolved = alertItem.isResolved;
              return (
                <div
                  key={alertItem.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isResolved
                      ? "bg-slate-50/50 border-slate-100 opacity-65"
                      : alertItem.riskLevel === "HIGH"
                        ? "bg-rose-50/40 border-rose-200 shadow-sm"
                        : "bg-amber-50/30 border-amber-200"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[8px] font-black font-mono uppercase ${
                          isResolved
                            ? "bg-slate-200 text-slate-600"
                            : alertItem.riskLevel === "HIGH"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {alertItem.riskLevel} Risk
                      </span>
                      <span className="font-bold text-slate-800 text-xs">
                        ID Aliran: {alertItem.type}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(alertItem.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
 
                  <p className="text-slate-700 text-xs leading-relaxed font-medium">
                    {alertItem.message}
                  </p>
 
                  <div className="mt-4 pt-3 border-t border-slate-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <p className="text-[10px] text-slate-500 font-medium">
                      Oleh Staff:{" "}
                      <span className="font-bold text-slate-700">
                        {alertItem.operator}
                      </span>{" "}
                      &bull; Status:{" "}
                      <span className="font-bold">{isResolved ? "RESOLVED" : "OPEN"}</span>
                    </p>
 
                    <div className="flex items-center gap-2">
                      {!isResolved ? (
                        <>
                          <button
                            onClick={() =>
                              handleSuspendUser(alertItem.operator)
                            }
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 font-bold border border-rose-200 rounded-lg transition text-[10px] cursor-pointer flex items-center gap-1"
                          >
                            <Ban className="w-3.5 h-3.5" /> Suspend Staff
                          </button>
                          <button
                            onClick={() => handleResolveAlert(alertItem.id)}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-lg transition text-[10px] cursor-pointer flex items-center gap-1 shadow-sm"
                          >
                            <KeyRound className="w-3.5 h-3.5" /> Input PIN
                            Supervisor
                          </button>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                          &amp; Cleared
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Security Settings & Log rules */}
        <div className="xl:col-span-4 p-6 bg-slate-50/50 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="font-extrabold text-xs text-blue-950 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-blue-600" /> Aturan Keamanan
              &amp; Threshold
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
              Konfigurasi batasan toleransi kasir. Jika dilanggar, alarm anomali
              akan langsung berbunyi dan laci terkunci.
            </p>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg dark:bg-zinc-800/40">
                <span className="font-semibold text-slate-700 text-[11px] dark:text-zinc-300">
                  Batas Diskon Tanpa PIN
                </span>
                <span className="font-mono text-blue-600 font-bold">
                  Maks 15%
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <span className="font-semibold text-slate-700 text-[11px]">
                  Verifikasi Void Transaksi
                </span>
                <span className="font-mono text-rose-600 font-bold">
                  Wajib PIN
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <span className="font-semibold text-slate-700 text-[11px]">
                  Toleransi Selisih Akhir Shift
                </span>
                <span className="font-mono text-slate-600 font-bold">
                  Rp 20,000
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <span className="font-semibold text-slate-700 text-[11px]">
                  Auto Lockout Solenoid
                </span>
                <span className="font-mono text-emerald-600 font-bold">
                  Enabled
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="font-extrabold text-xs text-blue-950 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-slate-400" /> Bantuan Verifikasi
              Demo
            </h4>
            <div className="p-3 bg-blue-50/60 rounded-xl space-y-2 text-[10px] text-blue-800 dark:bg-zinc-800/40 dark:text-blue-300 leading-normal border border-blue-100 dark:border-zinc-700">
              <p className="font-bold flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" /> Panduan PIN Supervisor:
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Gunakan PIN master demonstrasi berikut untuk meresolusi anomali
                di atas:
                <br />
                &bull; <strong>PIN Master:</strong>{" "}
                <code className="font-mono bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-blue-100 dark:border-zinc-700 text-blue-700 dark:text-blue-400 font-bold">
                  1234
                </code>{" "}
                atau{" "}
                <code className="font-mono bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-blue-100 dark:border-zinc-700 text-blue-700 dark:text-blue-400 font-bold">
                  2506
                </code>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PIN Verification Modal popup */}
      {showPinModal && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl animate-scaleIn text-xs">
            <div className="text-center space-y-1.5">
              <div className="inline-flex p-3 bg-blue-50 text-blue-600 dark:bg-zinc-800 dark:text-blue-400 rounded-full">
                <KeyRound className="w-6 h-6 animate-pulse" />
              </div>
              <h4 className="font-black text-blue-950 dark:text-zinc-200 text-sm uppercase tracking-wide">
                Persetujuan Otoritas Supervisor
              </h4>
              <p className="text-[10px] text-slate-400">
                Masukkan 4-Digit PIN Supervisor untuk meloloskan &amp;
                menyetujui transaksi ini.
              </p>
            </div>

            <form onSubmit={submitResolveWithPin} className="space-y-4">
              <input
                type="password"
                maxLength={4}
                required
                autoFocus
                placeholder="&bull; &bull; &bull; &bull;"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                className="w-full text-center tracking-[12px] font-black text-lg py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl outline-none focus:border-accent dark:text-white"
              />

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-400 font-bold rounded-xl transition cursor-pointer"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition shadow-md cursor-pointer"
                >
                  Otorisasi PIN
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
