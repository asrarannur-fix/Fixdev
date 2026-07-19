import React, { useState, useMemo, useEffect } from "react";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import {
  Send,
  CheckCircle2,
  Power,
  PowerOff,
  RefreshCw,
  Bell,
  Shield,
  History,
  Copy,
} from "lucide-react";

export const TelegramBotManager: React.FC = () => {
  const {
    currentTenantId,
    tenants,
    updateTenant,
    addLog,
    apiFetch,
  } = useSaaS();
  const { showToast } = useToast();

  const activeTenant = useMemo(
    () => tenants.find((t) => t.id === currentTenantId),
    [tenants, currentTenantId],
  );
  const tgSettings = activeTenant?.settings?.notificationSettings
    ? {
        enabled: activeTenant.settings.notificationSettings.telegramEnabled || false,
        botToken: activeTenant.settings.notificationSettings.telegramBotToken || "",
        chatId: activeTenant.settings.notificationSettings.telegramChatId || "",
      }
    : { enabled: false, botToken: "", chatId: "" };

  const [botToken, setBotToken] = useState(tgSettings.botToken);
  const [chatId, setChatId] = useState(tgSettings.chatId);
  const [isEnabled, setIsEnabled] = useState(tgSettings.enabled);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    setBotToken(tgSettings.botToken);
    setChatId(tgSettings.chatId);
    setIsEnabled(tgSettings.enabled);
    setTestResult(null);
  }, [currentTenantId, tgSettings.botToken, tgSettings.chatId, tgSettings.enabled]);

  const [eventLogs] = useState<Array<{ timestamp: string; event: string; recipient: string; status: string }>>([]);

  const handleSave = async () => {
    if (!updateTenant) return;
    const current = activeTenant?.settings || {};
    const cleanToken = botToken.trim();
    const cleanChatId = chatId.trim();
    try {
      await updateTenant(currentTenantId, {
        settings: {
          ...current,
          notificationSettings: {
            ...current.notificationSettings,
            telegramEnabled: isEnabled,
            telegramBotToken: cleanToken,
            telegramChatId: cleanChatId,
          },
        },
      });
      showToast("Konfigurasi Bot Telegram berhasil disimpan!", "success");
      addLog?.(
        "Update Telegram Bot Config",
        `Telegram ${isEnabled ? "Enabled" : "Disabled"}, Chat ID: ${cleanChatId || "-"}`,
        "SYSTEM",
      );
    } catch (error: any) {
      showToast(error.message || "Konfigurasi Telegram gagal disimpan.", "error");
    }
  };

  const handleTest = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      showToast("Bot Token dan Chat ID Telegram wajib diisi.", "error");
      return;
    }
    setTestResult("sending");
    try {
      const response = await apiFetch("/api/tenant/telegram/test", {
        method: "POST",
        body: JSON.stringify({ message: "Tes integrasi FIXDEV ERP berhasil dikirim." }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Telegram gagal mengirim pesan.");
      setTestResult("success");
      showToast("Pesan uji coba Telegram berhasil terkirim!", "success");
    } catch (error: any) {
      setTestResult("error");
      showToast(error.message || "Telegram gagal mengirim pesan.", "error");
    }
  };

  return (
    <div className="space-y-6" id="telegram-bot-pane">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Send className="w-5 h-5 text-sky-500" /> Bot Telegram & Integrasi Notifikasi
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Konfigurasi Bot Telegram untuk notifikasi otomatis tiket servis, status shift, dan alert ke grup Owner/Teknisi/Admin.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Status Bot:
          </span>
          <button
            onClick={() => setIsEnabled(!isEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
              isEnabled
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
            }`}
          >
            {isEnabled ? (
              <><Power className="w-4 h-4" /> Aktif</>
            ) : (
              <><PowerOff className="w-4 h-4" /> Nonaktif</>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Bot Configuration */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-xs uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-sky-500" /> Autentikasi & Token Bot
          </h3>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">
                Token Bot Telegram (dari @BotFather)
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="7123456789:ABC_def_GHI..."
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 pr-10"
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(botToken); showToast("Token tersalin!", "info"); }}
                  className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[9px] text-slate-400 mt-0.5">Token disimpan di database tenant secara aman (private).</p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">
                Chat ID Tujuan (Grup / Private)
              </label>
              <input
                type="text"
                placeholder="-1001234567890"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <p className="text-[9px] text-slate-400 mt-0.5">
                Chat ID grup (awalan -100...) atau ID user. Gunakan @getidsbot untuk melihat ID.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg cursor-pointer shadow-sm transition-all"
              >
                <CheckCircle2 className="w-4 h-4" /> Simpan Konfigurasi
              </button>
              <button
                onClick={handleTest}
                disabled={testResult === "sending"}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg cursor-pointer transition-all disabled:opacity-50"
              >
                {testResult === "sending" ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Mengirim...</>
                ) : (
                  <><Send className="w-4 h-4" /> Uji Kirim Pesan</>
                )}
              </button>
            </div>

            {testResult === "success" && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-800 font-bold">Pesan uji coba berhasil dikirim ke Telegram!</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Statistics */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 h-fit">
          <h3 className="font-bold text-xs uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-sky-500" /> Event & Notifikasi Terkirim
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-sky-50 rounded-lg flex justify-between items-center text-xs">
              <span className="text-sky-600 font-bold">Total Terkirim (Hari Ini)</span>
              <span className="font-mono font-black text-sky-800">{eventLogs.filter((log) => log.status === "SENT").length}</span>
            </div>
            <div className="p-3 bg-rose-50 rounded-lg flex justify-between items-center text-xs">
              <span className="text-rose-600 font-bold">Total Gagal</span>
              <span className="font-mono font-black text-rose-800">{eventLogs.filter((log) => log.status === "FAILED").length}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center text-xs">
              <span className="text-slate-500">Long Polling Status</span>
              <span className="font-mono text-emerald-600 font-bold">
                {testResult === "success" ? "Connected" : "Not tested"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Telegram Event Log */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-xs uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
          <History className="w-4 h-4 text-slate-500" /> Riwayat Event Notifikasi
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Recipient</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {eventLogs.map((log, idx) => (
                <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-mono text-slate-600">{log.timestamp}</td>
                  <td className="px-3 py-2 font-bold text-slate-700">{log.event}</td>
                  <td className="px-3 py-2 text-slate-500">{log.recipient}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                      log.status === "SENT"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
