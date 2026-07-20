import React, { useState, useEffect, useMemo } from "react";
import { Plus, X, Search, MapPin, Package, Wrench, Layers, Edit } from "lucide-react";
import { StorageLocation } from "../../types";
import { useSaaS } from "../../context/SaaSContext";

interface Props {
  tenantId: string;
  branchId: string;
  showToast: (msg: string, type?: any) => void;
}

export const StorageLocationManager: React.FC<Props> = ({ tenantId, branchId, showToast }) => {
  const { apiFetch } = useSaaS();
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editLoc, setEditLoc] = useState<StorageLocation | null>(null);
  const [locName, setLocName] = useState("");
  const [locCode, setLocCode] = useState("");
  const [locType, setLocType] = useState<"SPAREPART" | "UNIT_SERVICE">("SPAREPART");
  const [locDesc, setLocDesc] = useState("");
  const [searchQ, setSearchQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/module-records?module=storage_locations")
      .then(async (r) => {
        if (!r.ok) throw new Error(`Storage locations HTTP ${r.status}`);
        const body = await r.json();
        const rows = Array.isArray(body) ? body : body.data || body.items || [];
        const loaded = rows.map((row: any) => row.payload || row).filter((x: StorageLocation) => x.tenantId === tenantId);
        if (!cancelled) setLocations(loaded);
      })
      .catch((e: any) => showToast(e.message || "Lokasi gagal dimuat.", "error"));
    return () => { cancelled = true; };
  }, [apiFetch, tenantId, showToast]);

  const branchLocs = useMemo(() => locations.filter(l => l.branchId === branchId), [locations, branchId]);
  const filtered = useMemo(() =>
    branchLocs.filter(l => !searchQ || (l.name || "").toLowerCase().includes(searchQ.toLowerCase()) || (l.code || "").toLowerCase().includes(searchQ.toLowerCase())),
    [branchLocs, searchQ]
  );

  const resetForm = () => {
    setLocName(""); setLocCode(""); setLocType("SPAREPART"); setLocDesc(""); setEditLoc(null); setShowForm(false);
  };

  const openEdit = (loc: StorageLocation) => {
    setEditLoc(loc); setLocName(loc.name); setLocCode(loc.code); setLocType(loc.type); setLocDesc(loc.description || ""); setShowForm(true);
  };

  const persist = async (location: StorageLocation, action: "insert" | "update") => {
    const r = await apiFetch("/api/module-records", { method: "POST", body: JSON.stringify({ module: "storage_locations", recordId: location.id, payload: location, action }) });
    if (!r.ok) throw new Error(`Storage location sync HTTP ${r.status}`);
  };

  const handleSave = async () => {
    const name = locName.trim();
    const code = locCode.trim().toUpperCase();
    const description = locDesc.trim();
    if (!name || !code) { showToast("Nama & kode rak wajib diisi!", "error"); return; }
    const duplicate = locations.find(l => l.branchId === branchId && l.code.trim().toUpperCase() === code && l.id !== editLoc?.id);
    if (duplicate) { showToast(`Kode "${code}" sudah ada!`, "error"); return; }
    if (editLoc) {
      const updated = { ...editLoc, name, code, type: locType, description };
      try { await persist(updated, "update"); } catch (e: any) { showToast(e.message || "Rak gagal disimpan.", "error"); return; }
      setLocations(prev => prev.map(l => l.id === editLoc.id ? updated : l));
      showToast("Rak diperbarui!", "success");
    } else {
      const created = { id: `loc-${Date.now()}`, tenantId, branchId, name, code, type: locType, description } as StorageLocation;
      try { await persist(created, "insert"); } catch (e: any) { showToast(e.message || "Rak gagal disimpan.", "error"); return; }
      setLocations(prev => [...prev, created]);
      showToast("Rak baru ditambahkan!", "success");
    }
    resetForm();
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 text-slate-800">
          <Layers className="w-4 h-4 text-accent" /> Rak & Lokasi Penyimpanan ({branchLocs.length})
        </h3>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer">
          <Plus className="w-3 h-3" /> Tambah Rak
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Cari nama/kode rak..." className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none" />
      </div>

      {showForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <h4 className="font-bold text-[10px] text-slate-500 uppercase">{editLoc ? "Edit Rak" : "Tambah Rak Baru"}</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1">Nama Rak</label>
              <input value={locName} onChange={e => setLocName(e.target.value)} placeholder="Contoh: Rak Layar LCD" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1">Kode Rak</label>
              <input value={locCode} onChange={e => setLocCode(e.target.value)} placeholder="Contoh: RAK-A1" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg outline-none font-mono font-bold" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1">Tipe</label>
              <select value={locType} onChange={e => setLocType(e.target.value as any)} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none">
                <option value="SPAREPART">📦 Sparepart & Barang</option>
                <option value="UNIT_SERVICE">🔧 Unit Servis (Laptop/HP)</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button onClick={handleSave} className="flex-1 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-[10px] font-bold rounded-lg cursor-pointer">Simpan</button>
              <button onClick={resetForm} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 text-[10px] font-bold rounded-lg cursor-pointer">Batal</button>
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1">Deskripsi (opsional)</label>
            <input value={locDesc} onChange={e => setLocDesc(e.target.value)} placeholder='Contoh: Rak khusus laptop 14"' className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg outline-none" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {filtered.map(loc => (
          <div key={loc.id} className="flex items-start justify-between p-3 bg-white border border-slate-200 rounded-xl hover:shadow-xs transition">
            <div className="flex items-start gap-2.5">
              <span className="p-1.5 rounded-lg bg-accent-lighter text-accent mt-0.5">
                {loc.type === "SPAREPART" ? <Package className="w-3.5 h-3.5" /> : <Wrench className="w-3.5 h-3.5" />}
              </span>
              <div>
                <p className="font-bold text-xs text-slate-800 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-500" /> {loc.code}
                </p>
                <p className="text-[10px] text-slate-500">{loc.name}</p>
                {loc.description && <p className="text-[9px] text-slate-400 italic mt-0.5">{loc.description}</p>}
                <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] font-bold font-mono ${loc.type === "SPAREPART" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"}`}>
                  {loc.type === "SPAREPART" ? "📦 BARANG" : "🔧 UNIT SERVIS"}
                </span>
              </div>
            </div>
            <button onClick={() => openEdit(loc)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-accent cursor-pointer" title="Edit Rak"><Edit className="w-3 h-3" /></button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-8 text-slate-400 text-xs">Belum ada rak penyimpanan. Tambah rak baru!</div>
        )}
      </div>
    </div>
  );
};

export const getStorageLocations = (_tenantId: string): StorageLocation[] => [];
