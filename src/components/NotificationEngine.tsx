import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Bell,
  MessageSquare,
  Send,
  Smartphone,
  Globe,
  Settings,
  AlertCircle,
  CheckCircle2,
  Clock,
  Activity,
  Zap,
  Server,
  Trash2,
  X,
  Plus,
  RefreshCw,
  Mail,
} from "lucide-react";

export const NotificationEngine: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "templates" | "webhooks" | "logs" | "channels"
  >("channels");

  const [channels, setChannels] = useState([
    {
      id: "wa",
      name: "WhatsApp Meta API",
      type: "whatsapp",
      status: "active",
      icon: MessageSquare,
      color: "emerald",
    },
    {
      id: "tg",
      name: "Telegram Bot",
      type: "telegram",
      status: "active",
      icon: Send,
      color: "sky",
    },
    {
      id: "push",
      name: "FCM Push Mobile",
      type: "push",
      status: "inactive",
      icon: Smartphone,
      color: "indigo",
    },
    {
      id: "ws",
      name: "WebSocket (Realtime UI)",
      type: "websocket",
      status: "active",
      icon: Globe,
      color: "purple",
    },
  ]);

  const [templates, setTemplates] = useState([
    {
      id: "tpl-1",
      name: "Notifikasi Pembayaran Sukses",
      channel: "whatsapp",
      trigger: "payment.success",
      content:
        "Halo {{customer_name}}, pembayaran sebesar Rp{{amount}} untuk tiket #{{ticket_id}} telah berhasil. Terima kasih!",
    },
    {
      id: "tpl-2",
      name: "Peringatan Stok Tipis",
      channel: "telegram",
      trigger: "inventory.low_stock",
      content:
        "🚨 ALERT: Stok {{item_name}} tersisa {{stock_left}} unit di cabang {{branch_name}}.",
    },
    {
      id: "tpl-3",
      name: "Perubahan Status Servis",
      channel: "push",
      trigger: "service.status_changed",
      content:
        "Servis perangkat {{device}} Anda kini berstatus: {{new_status}}.",
    },
    {
      id: "tpl-4",
      name: "Login Mencurigakan",
      channel: "telegram",
      trigger: "security.suspicious_login",
      content:
        "⚠️ Peringatan Keamanan: Percobaan login dari IP {{ip_address}} pada {{time}}.",
    },
  ]);

  const [logs] = useState([
    {
      id: "log-1",
      date: "2026-07-01 14:30:22",
      event: "payment.success",
      channel: "WhatsApp",
      recipient: "+6281234567890",
      status: "delivered",
    },
    {
      id: "log-2",
      date: "2026-07-01 14:15:05",
      event: "service.status_changed",
      channel: "Push Notification",
      recipient: "User #1204",
      status: "failed",
    },
    {
      id: "log-3",
      date: "2026-07-01 13:50:11",
      event: "inventory.low_stock",
      channel: "Telegram",
      recipient: "Group Staff",
      status: "delivered",
    },
    {
      id: "log-4",
      date: "2026-07-01 11:05:40",
      event: "security.suspicious_login",
      channel: "Telegram",
      recipient: "Admin IT",
      status: "delivered",
    },
  ]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pusat kendali komunikasi multi-saluran. Atur trigger, template, dan
            pantau log pengiriman.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Engine Active
          </span>
        </div>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800">
        {[
          { id: "channels", label: "Saluran (Channels)", icon: Server },
          { id: "webhooks", label: "Events & Webhooks", icon: Activity },
          { id: "templates", label: "Template Pesan", icon: Mail },
          { id: "logs", label: "Log & Retry", icon: Clock },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === tab.id
                ? "border-accent text-accent dark:border-accent/60 dark:text-accent"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Saluran (Channels) */}
      {activeTab === "channels" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm relative overflow-hidden group"
            >
              <div
                className={`absolute top-0 right-0 w-24 h-24 bg-${channel.color}-500/10 rounded-bl-full -z-10 transition-transform group-hover:scale-110`}
              ></div>
              <div className="flex justify-between items-start mb-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-${channel.color}-100 dark:bg-${channel.color}-900/30 flex items-center justify-center text-${channel.color}-600 dark:text-${channel.color}-400`}
                >
                  <channel.icon className="w-6 h-6" />
                </div>
                <span
                  className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md border ${
                    channel.status === "active"
                      ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50"
                      : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                  }`}
                >
                  {channel.status}
                </span>
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white mb-1">
                {channel.name}
              </h3>
              <p className="text-xs text-slate-500 mb-4 font-mono">
                {channel.type}
              </p>

              <button
                className={`w-full py-2 rounded-lg text-xs font-bold transition-colors border ${
                  channel.status === "active"
                    ? "border-slate-200 hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300"
                    : "border-indigo-200 bg-accent-lighter text-accent hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-accent"
                }`}
              >
                {channel.status === "active"
                  ? "Konfigurasi API"
                  : "Aktifkan Saluran"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Events & Webhooks */}
      {activeTab === "webhooks" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                Mapping Event to Webhook
              </h3>
              <p className="text-xs text-slate-500">
                Tentukan event sistem apa saja yang akan men-trigger notifikasi.
              </p>
            </div>
            <button className="px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-accent-hover transition-colors">
              <Plus className="w-4 h-4" /> Tambah Event
            </button>
          </div>

          <div className="space-y-4">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-accent dark:text-accent bg-accent-lighter dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                        {tpl.trigger}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                      {tpl.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">
                      Saluran Aktif
                    </p>
                    <p className="text-xs font-semibold flex items-center justify-end gap-1 mt-0.5">
                      {tpl.channel === "whatsapp" && (
                        <MessageSquare className="w-3 h-3 text-emerald-500" />
                      )}
                      {tpl.channel === "telegram" && (
                        <Send className="w-3 h-3 text-sky-500" />
                      )}
                      {tpl.channel === "push" && (
                        <Smartphone className="w-3 h-3 text-indigo-500" />
                      )}
                      <span className="capitalize">{tpl.channel}</span>
                    </p>
                  </div>
                  <button className="p-2 text-slate-400 hover:text-accent hover:bg-accent-lighter dark:hover:bg-indigo-900/30 rounded-lg transition-colors">
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Templates */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-slate-800 dark:text-white">
                  {tpl.name}
                </h3>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold rounded uppercase">
                  {tpl.channel}
                </span>
              </div>
              <p className="text-xs text-accent dark:text-accent font-mono mb-3">
                Trigger: {tpl.trigger}
              </p>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50 mb-4">
                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  {tpl.content}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors">
                  Hapus
                </button>
                <button className="px-3 py-1.5 text-xs font-semibold text-accent bg-accent-lighter hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 rounded-lg transition-colors">
                  Edit Template
                </button>
              </div>
            </div>
          ))}
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center text-center min-h-[200px] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="w-12 h-12 rounded-full bg-accent-lighter dark:bg-indigo-900/30 flex items-center justify-center text-accent dark:text-accent mb-3">
              <Plus className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white">
              Buat Template Baru
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Gunakan variabel dinamis seperti {"{{name}}"}.
            </p>
          </div>
        </div>
      )}

      {/* Logs & Retry */}
      {activeTab === "logs" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4">Waktu</th>
                  <th className="px-6 py-4">Event Trigger</th>
                  <th className="px-6 py-4">Saluran / Penerima</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                      {log.date}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                        {log.event}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {log.channel}
                      </p>
                      <p className="text-xs text-slate-500">{log.recipient}</p>
                    </td>
                    <td className="px-6 py-4">
                      {log.status === "delivered" ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-md text-xs font-semibold w-fit">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Terkirim
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-2.5 py-1 rounded-md text-xs font-semibold w-fit">
                          <AlertCircle className="w-3.5 h-3.5" /> Gagal
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {log.status === "failed" ? (
                        <button className="flex items-center justify-end gap-1.5 text-accent hover:text-indigo-800 font-medium text-xs ml-auto">
                          <RefreshCw className="w-3.5 h-3.5" /> Coba Lagi
                        </button>
                      ) : (
                        <button className="text-slate-400 hover:text-slate-600 font-medium text-xs">
                          Detail
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
