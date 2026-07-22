import React, { useState, useEffect, useCallback } from "react";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import { Truck, PlusCircle, Search, X, Pencil, CheckCircle2 } from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
}

const emptyForm = { name: "", contactName: "", phone: "", email: "", address: "" };

export const SupplierManager: React.FC = () => {
  const { apiFetch } = useSaaS();
  const { showToast } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/purchasing/suppliers");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setSuppliers(body.data || []);
    } catch (e: any) {
      showToast(e.message || "Gagal memuat supplier.", "error");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, showToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.phone || "").includes(search),
  );

  const openCreate = () => { setEditId(null); setForm({ ...emptyForm }); setShowForm(true); };
  const openEdit = (s: Supplier) => {
    setEditId(s.id);
    setForm({ name: s.name, contactName: s.contactName || "", phone: s.phone || "", email: s.email || "", address: s.address || "" });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast("Nama supplier wajib diisi.", "error"); return; }
    setSaving(true);
    try {
      const url = editId ? `/api/purchasing/suppliers/${editId}` : "/api/purchasing/suppliers";
      const res = await apiFetch(url, {
        method: editId ? "PATCH" : "POST",
        body: JSON.stringify({ ...form, name: form.name.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      showToast(editId ? "Supplier diperbarui." : "Supplier ditambahkan.", "success");
      setShowForm(false);
      await load();
    } catch (e: any) {
      showToast(e.message || "Gagal menyimpan supplier.", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (s: Supplier) => {
    try {
      const res = await apiFetch(`/api/purchasing/suppliers/${s.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !s.isActive }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e: any) {
      showToast(e.message || "Gagal mengubah status.", "error");
    }
  };

  return (
    <div className="space-y-6 dark:text-zinc-300 dark:[&_.bg-white]:bg-zinc-950 dark:[&_.bg-slate-50]:bg-zinc-900 dark:[&_.border-slate-100]:border-zinc-800 dark:[&_.border-slate-200]:border-zinc-800 dark:[&_.text-slate-800]:text-zinc-100 dark:[&_.text-slate-700]:text-zinc-200 dark:[&_.text-slate-600]:text-zinc-300 dark:[&_input]:bg-zinc-950 dark:[&_input]:text-zinc-100 dark:[&_textarea]:bg-zinc-950 dark:[&_textarea]:text-zinc-100 dark:[&_tr:hover]:bg-zinc-900" id="supplier-pane">
      <div className="flex justify-between items-start bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-500" /> Master Supplier
          </h2>
          <p className="text-xs text-slate-400 mt-1">Kelola data supplier / vendor pembelian.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" />
            <input
              placeholder="Cari supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-accent hover:bg-accent-hover rounded-lg cursor-pointer shadow-sm"
          >
            <PlusCircle className="w-4 h-4" /> Supplier Baru
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-indigo-200 rounded-xl p-5 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-xs uppercase text-accent tracking-wider">
              {editId ? "Edit Supplier" : "Supplier Baru"}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {([
              ["name", "Nama Supplier *"],
              ["contactName", "Nama Kontak"],
              ["phone", "Telepon"],
              ["email", "Email"],
            ] as const).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">{label}</label>
                <input
                  value={(form as any)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            ))}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Alamat</label>
              <textarea
                rows={2}
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2 text-xs font-bold text-white bg-accent hover:bg-accent-hover rounded-lg cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4 inline mr-1.5" /> {saving ? "Menyimpan…" : "Simpan Supplier"}
          </button>
        </div>
      )}

      {loading && <p className="text-center text-xs text-slate-400 py-6">Memuat supplier…</p>}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <Truck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500">Belum ada supplier</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Kontak</th>
                <th className="px-4 py-3">Telepon</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-800">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.contactName || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{s.phone || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{s.email || "-"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(s)}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer ${s.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                    >
                      {s.isActive ? "AKTIF" : "NONAKTIF"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-accent cursor-pointer">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
