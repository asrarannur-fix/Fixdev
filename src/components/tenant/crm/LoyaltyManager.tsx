import React, { useState } from "react";
import { useSaaS } from "../../../context/SaaSContext";
import { useToast } from "../../ui/Toast";
import { LoyaltyRule } from "../../../types";
import { Gift, Plus, Trash2, Edit2, Star, Award } from "lucide-react";

export const LoyaltyManager: React.FC = () => {
  const { loyaltyRules, loyaltyTiers, addLoyaltyRule, updateLoyaltyRule, deleteLoyaltyRule, customers, currentTenantId } = useSaaS();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<LoyaltyRule | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"EARN" | "REDEEM">("EARN");
  const [formPointsPerRp, setFormPointsPerRp] = useState(1);
  const [formMinSpend, setFormMinSpend] = useState(0);
  const [formMaxPoints, setFormMaxPoints] = useState(1000);

  const tenantCustomers = customers.filter((c) => c.tenantId === currentTenantId);
  const tenantRules = loyaltyRules.filter((r) => r.tenantId === currentTenantId);

  const tierColors: Record<string, string> = {
    BRONZE: "from-amber-700 to-amber-900",
    SILVER: "from-slate-400 to-slate-600",
    GOLD: "from-yellow-400 to-amber-500",
    PLATINUM: "from-indigo-400 to-purple-600",
  };

  const tierCounts = loyaltyTiers.map((t) => {
    const minP = t.minPoints;
    const maxP = loyaltyTiers.find((tt) => tt.minPoints > minP)?.minPoints || Infinity;
    return {
      ...t,
      count: tenantCustomers.filter((c) => {
        const pts = c.loyaltyPoints || 0;
        return pts >= minP && pts < maxP;
      }).length,
    };
  });

  const handleSave = () => {
    if (!formName) {
      showToast("Isi nama aturan", "error");
      return;
    }
    const data = {
      name: formName,
      type: formType,
      pointsPerRp: formPointsPerRp,
      minSpend: formMinSpend,
      maxPoints: formMaxPoints,
      active: true,
    };
    if (editingRule) {
      updateLoyaltyRule(editingRule.id, data);
      showToast("Aturan diperbarui", "success");
    } else {
      addLoyaltyRule(data);
      showToast("Aturan baru ditambahkan", "success");
    }
    resetForm();
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingRule(null);
    setFormName("");
    setFormType("EARN");
    setFormPointsPerRp(1);
    setFormMinSpend(0);
    setFormMaxPoints(1000);
  };

  const startEdit = (rule: LoyaltyRule) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormType(rule.type);
    setFormPointsPerRp(rule.pointsPerRp);
    setFormMinSpend(rule.minSpend);
    setFormMaxPoints(rule.maxPoints);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {tierCounts.map((t) => (
          <div key={t.tier} className={`bg-gradient-to-br ${tierColors[t.tier]} rounded-xl p-4 text-white shadow-sm`}>
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 opacity-80" />
              <span className="text-xs font-bold uppercase">{t.tier}</span>
            </div>
            <p className="text-2xl font-bold">{t.count}</p>
            <p className="text-[10px] opacity-70">Min: {t.minPoints} pts | Diskon: {t.discountPercent}%</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Aturan Loyalty Points</h3>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
            <Plus className="w-3 h-3" /> Aturan Baru
          </button>
        </div>

        {showForm && (
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Nama Aturan</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Contoh: Poin per Rp1000" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Tipe</label>
                <select value={formType} onChange={(e) => setFormType(e.target.value as "EARN" | "REDEEM")} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none cursor-pointer">
                  <option value="EARN">Earn (Kumpulkan)</option>
                  <option value="REDEEM">Redeem (Tukarkan)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Poin per Rp</label>
                <input type="number" value={formPointsPerRp} onChange={(e) => setFormPointsPerRp(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Min. Belanja (Rp)</label>
                <input type="number" value={formMinSpend} onChange={(e) => setFormMinSpend(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Max. Poin</label>
                <input type="number" value={formMaxPoints} onChange={(e) => setFormMaxPoints(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={resetForm} className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-3 py-1.5 rounded-lg">Batal</button>
              <button onClick={handleSave} className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg">
                {editingRule ? "Perbarui" : "Simpan"}
              </button>
            </div>
          </div>
        )}

        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-mono">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Tipe</th>
              <th className="px-4 py-3">Poin/Rp</th>
              <th className="px-4 py-3">Min. Belanja</th>
              <th className="px-4 py-3">Max. Poin</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tenantRules.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs">Belum ada aturan loyalty</td></tr>
            ) : (
              tenantRules.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-800">{r.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${r.type === "EARN" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{r.type}</span>
                  </td>
                  <td className="px-4 py-3 font-mono">{r.pointsPerRp}</td>
                  <td className="px-4 py-3 font-mono">Rp {r.minSpend.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono">{r.maxPoints}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => updateLoyaltyRule(r.id, { active: !r.active })} className={`px-2 py-0.5 rounded text-[9px] font-bold ${r.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {r.active ? "AKTIF" : "NONAKTIF"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right flex gap-1 justify-end">
                    <button onClick={() => startEdit(r)} className="p-1 hover:bg-slate-100 rounded">
                      <Edit2 className="w-3 h-3 text-slate-500" />
                    </button>
                    <button onClick={() => { deleteLoyaltyRule(r.id); showToast("Aturan dihapus", "success"); }} className="p-1 hover:bg-red-50 rounded">
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
