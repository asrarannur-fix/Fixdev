// GatewayConfig — Superadmin Midtrans gateway configuration UI
import React, { useState, useEffect } from "react";

interface GatewayConfigData {
  merchantId: string;
  serverKeyMasked: string;
  clientKey: string;
  isProduction: boolean;
  isEnabled: boolean;
}

async function apiFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export const GatewayConfig: React.FC = () => {
  const [config, setConfig] = useState<GatewayConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    merchantId: "",
    serverKey: "",
    clientKey: "",
    isProduction: false,
    isEnabled: false,
  });
  const [showServerKey, setShowServerKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch("/api/billing/gateway-config");
      setConfig(data);
      setForm({
        merchantId: data?.merchantId || "",
        serverKey: "",
        clientKey: data?.clientKey || "",
        isProduction: data?.isProduction || false,
        isEnabled: data?.isEnabled || false,
      });
    } catch {
      setError("Gagal memuat konfigurasi gateway");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/billing/gateway-config", {
        method: "POST",
        body: JSON.stringify(form),
      });
      await loadConfig();
    } catch {
      setError("Gagal menyimpan konfigurasi gateway");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        <span className="ml-3 text-sm text-slate-500">Memuat konfigurasi…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Konfigurasi Gateway</h3>
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
          Midtrans
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      <div className={`rounded-lg p-4 border ${config?.isEnabled ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800" : "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{config?.isEnabled ? "🟢" : "🔴"}</span>
          <span className="font-medium text-sm">{config?.isEnabled ? "Gateway Aktif" : "Gateway Tidak Aktif"}</span>
          <span className="text-xs text-slate-500 ml-2">{config?.isProduction ? "Produksi" : "Sandbox"}</span>
        </div>
        {config?.serverKeyMasked && (
          <div className="mt-2 text-xs font-mono text-slate-500">Server Key: {config.serverKeyMasked}</div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Merchant ID</label>
          <input
            type="text"
            value={form.merchantId}
            onChange={(e) => setForm((f) => ({ ...f, merchantId: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="MID-XXXXXX"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Server Key</label>
          <div className="flex gap-2">
            <input
              type={showServerKey ? "text" : "password"}
              value={form.serverKey}
              onChange={(e) => setForm((f) => ({ ...f, serverKey: e.target.value }))}
              placeholder="Isi untuk mengubah, biarkan kosong jika tidak diubah"
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-mono text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => setShowServerKey(!showServerKey)}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50"
            >
              {showServerKey ? "🙈" : "👁️"}
            </button>
          </div>
          {config?.serverKeyMasked && (
            <div className="text-xs text-slate-400 mt-1 font-mono">Server key: {config.serverKeyMasked}</div>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Client Key</label>
          <input
            type="text"
            value={form.clientKey}
            onChange={(e) => setForm((f) => ({ ...f, clientKey: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isProduction}
              onChange={(e) => setForm((f) => ({ ...f, isProduction: e.target.checked }))}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Mode Produksi</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isEnabled}
              onChange={(e) => setForm((f) => ({ ...f, isEnabled: e.target.checked }))}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Gateway Diaktifkan</span>
          </label>
        </div>
        <button
          onClick={saveConfig}
          disabled={saving}
          className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-wait"
        >
          {saving ? "⏳ Menyimpan…" : "💾 Simpan Konfigurasi"}
        </button>
      </div>

      <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setError("Test koneksi Midtrans — fitur lengkap di backend")}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50"
        >
          🔧 Uji Koneksi Gateway
        </button>
      </div>
    </div>
  );
};
