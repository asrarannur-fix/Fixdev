// InvoiceTemplateEditor — Superadmin invoice template editor UI
import React, { useState, useEffect } from "react";

interface InvoiceTemplate {
  header?: string;
  logoUrl?: string;
  fields?: string[];
  footer?: string;
  colorPrimary?: string;
}

async function apiFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

const AVAILABLE_FIELDS = [
  { key: "invoice_number", label: "Nomor Invoice" },
  { key: "tenant_name", label: "Nama Tenant" },
  { key: "plan_name", label: "Nama Paket" },
  { key: "amount", label: "Nominal" },
  { key: "due_date", label: "Tanggal Jatuh Tempo" },
  { key: "payment_method", label: "Metode Pembayaran" },
  { key: "billing_cycle", label: "Siklus Tagihan" },
  { key: "period_start", label: "Awal Periode" },
  { key: "period_end", label: "Akhir Periode" },
];

export const InvoiceTemplateEditor: React.FC = () => {
  const [template, setTemplate] = useState<InvoiceTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<InvoiceTemplate>({
    header: "",
    logoUrl: "",
    fields: [],
    footer: "",
    colorPrimary: "#059669",
  });

  const loadTemplate = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch("/api/billing/invoice-template");
      setTemplate(data);
      setForm({
        header: data?.header || "",
        logoUrl: data?.logoUrl || "",
        fields: Array.isArray(data?.fields) ? data.fields : [],
        footer: data?.footer || "",
        colorPrimary: data?.colorPrimary || "#059669",
      });
    } catch {
      setError("Gagal memuat template");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplate();
  }, []);

  const saveTemplate = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/billing/invoice-template", {
        method: "POST",
        body: JSON.stringify(form),
      });
      await loadTemplate();
    } catch {
      setError("Gagal menyimpan template");
    } finally {
      setSaving(false);
    }
  };

  const toggleField = (field: string) => {
    setForm((prev) => ({
      ...prev,
      fields: prev.fields?.includes(field)
        ? prev.fields.filter((f) => f !== field)
        : [...(prev.fields || []), field],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        <span className="ml-3 text-sm text-slate-500">Memuat template…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Template Invoice</h3>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <div className="text-center mb-4">
          <div className="text-lg font-bold" style={{ color: form.colorPrimary || "#059669" }}>
            {form.header || "PT FixDev ERP — Invoice"}
          </div>
          {form.logoUrl && <img src={form.logoUrl} alt="Logo" className="h-12 mx-auto mt-2" />}
        </div>
        <div className="text-xs text-slate-500 mb-4">
          Preview: {form.fields?.join(" | ")} | Rp 0,00 | Jatuh tempo: 2026-08-07
        </div>
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
          <div className="text-xs text-slate-400 italic">{form.footer || "Terima kasih atas kepercayaan Anda."}</div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Header Text</label>
          <input
            type="text"
            value={form.header}
            onChange={(e) => setForm((f) => ({ ...f, header: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="PT FixDev ERP — Invoice"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Logo URL</label>
          <input
            type="text"
            value={form.logoUrl || ""}
            onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-mono text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="https://… atau kosongkan"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-2">Sertakan Fields</label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_FIELDS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => toggleField(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  form.fields?.includes(f.key)
                    ? "bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-white border-slate-300 text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400"
                }`}
              >
                {form.fields?.includes(f.key) ? "✓ " : ""}{f.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Footer Text</label>
          <input
            type="text"
            value={form.footer || ""}
            onChange={(e) => setForm((f) => ({ ...f, footer: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Terima kasih telah berlangganan FixDev ERP"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Warna Utama</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.colorPrimary || "#059669"}
              onChange={(e) => setForm((f) => ({ ...f, colorPrimary: e.target.value }))}
              className="w-10 h-10 rounded cursor-pointer border-0"
            />
            <input
              type="text"
              value={form.colorPrimary || "#059669"}
              onChange={(e) => setForm((f) => ({ ...f, colorPrimary: e.target.value }))}
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-mono text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setForm({ header: "", logoUrl: "", fields: [], footer: "", colorPrimary: "#059669" })}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50"
          >
            Reset ke Default
          </button>
          <button
            onClick={saveTemplate}
            disabled={saving}
            className="flex-1 py-2 px-4 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "⏳ Menyimpan…" : "💾 Simpan Template"}
          </button>
        </div>
      </div>
    </div>
  );
};
