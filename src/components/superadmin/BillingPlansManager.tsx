// BillingPlansManager — Superadmin plan management UI
import React, { useState, useEffect } from "react";

interface Plan {
  tier: "BASIC" | "PRO" | "ENTERPRISE";
  name: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  limits: {
    users: number;
    branches: number;
    storageMb: number;
    features: string[];
  };
}

interface BillingPlansManagerProps {
  readOnlyMode?: boolean;
}

async function apiFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

const TIER_COLORS: Record<string, string> = {
  BASIC: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  PRO: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  ENTERPRISE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

export const BillingPlansManager: React.FC<BillingPlansManagerProps> = ({ readOnlyMode = false }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Plan> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch("/api/billing/plans");
      setPlans(Array.isArray(data) && data.length > 0 ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat paket billing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const startEdit = (plan: Plan) => {
    setEditing(plan.tier);
    setEditForm({ ...plan });
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditForm(null);
  };

  const savePlan = async () => {
    if (!editForm) return;
    try {
      await apiFetch("/api/billing/plans", {
        method: "POST",
        body: JSON.stringify(plans.map((p) => (p.tier === editForm.tier ? (editForm as Plan) : p))),
      });
      setEditing(null);
      setEditForm(null);
      await loadPlans();
    } catch {
      setError("Gagal memperbarui paket billing");
    }
  };

  const updateEditField = (field: string, value: unknown) => {
    setEditForm((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        <span className="ml-3 text-sm text-slate-500">Memuat paket billing…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Paket Langganan</h3>
        <span className="text-xs text-slate-400 font-mono">{plans.length} paket aktif</span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.tier}
            className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden ${plan.tier === "ENTERPRISE" ? "ring-2 ring-emerald-500/30" : ""}`}
          >
            <div
              className={`px-5 py-4 ${
                plan.tier === "BASIC"
                  ? "bg-slate-50 dark:bg-slate-700/50"
                  : plan.tier === "PRO"
                    ? "bg-blue-50 dark:bg-blue-950/30"
                    : "bg-emerald-50 dark:bg-emerald-950/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${TIER_COLORS[plan.tier]}`}>
                  {plan.tier}
                </span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  Rp {Number(plan.priceMonthly).toLocaleString("id-ID")}
                  <span className="text-xs font-normal text-slate-500 ml-1">/bulan</span>
                </span>
              </div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">{plan.name}</h4>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>💰 Tahunan: Rp {Number(plan.priceYearly).toLocaleString("id-ID")}</span>
                <span className="text-emerald-600 font-semibold">
                  Hemat {Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100)}%
                </span>
              </div>

              <ul className="space-y-1.5">
                {plan.features.map((feature, i) => (
                  <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                    <span className="mt-0.5 text-emerald-500">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">👥 User</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{plan.limits?.users ?? "∞"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">🏢 Cabang</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{plan.limits?.branches ?? "∞"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">💾 Storage</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{plan.limits?.storageMb ?? "∞"} MB</span>
                </div>
              </div>

              {!readOnlyMode && (
                <button
                  onClick={() => (editing === plan.tier ? savePlan() : startEdit(plan))}
                  className={`w-full py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${
                    editing === plan.tier
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                  }`}
                >
                  {editing === plan.tier ? "💾 Simpan" : "✏️ Edit Paket"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editing && editForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={cancelEdit}>
          <div
            className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
              Edit Paket {editForm.tier}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nama Paket</label>
                <input
                  type="text"
                  value={(editForm as any).name || ""}
                  onChange={(e) => updateEditField("name", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Harga Bulanan (Rp)</label>
                  <input
                    type="number"
                    value={(editForm as any).priceMonthly || ""}
                    onChange={(e) => updateEditField("priceMonthly", Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Harga Tahunan (Rp)</label>
                  <input
                    type="number"
                    value={(editForm as any).priceYearly || ""}
                    onChange={(e) => updateEditField("priceYearly", Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Limits (JSON)</label>
                <textarea
                  value={JSON.stringify((editForm as any).limits, null, 2)}
                  onChange={(e) => {
                    try {
                      updateEditField("limits", JSON.parse(e.target.value));
                    } catch {
                      // ignore invalid JSON
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-mono text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 h-24"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Features (per baris)</label>
                <textarea
                  value={((editForm as any).features || []).join("\n")}
                  onChange={(e) =>
                    updateEditField("features", e.target.value.split("\n").filter((l: string) => l.trim()))
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 h-24"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={cancelEdit}
                className="flex-1 py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={savePlan}
                className="flex-1 py-2 px-4 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
