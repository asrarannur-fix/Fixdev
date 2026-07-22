import React, { useState } from "react";
import { Globe, Plus, Pencil, Trash2, X } from "lucide-react";
import { useSaaS } from "../../../../context/SaaSContext";
import { useToast } from "../../../ui/Toast";
import { useConfirm } from "../../../ui/ConfirmDialog";

interface BranchesManagerPanelProps {
  currentTenantId: string;
}

export const BranchesManagerPanel: React.FC<BranchesManagerPanelProps> = ({ currentTenantId }) => {
  const { tenants, branches, currentBranchId, addBranch, updateBranch, deleteBranch, switchBranch } = useSaaS();
  const { showToast } = useToast();
  const { confirm: showConfirm } = useConfirm();

  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [brName, setBrName] = useState("");
  const [brAddress, setBrAddress] = useState("");
  const [brPhone, setBrPhone] = useState("");
  const [brIsActive, setBrIsActive] = useState(true);

  const tenantObj = tenants.find((t: any) => t.id === currentTenantId);
  const tenantBranchesCount = branches.filter((b: any) => b.tenantId === currentTenantId).length;
  const branchLimit = tenantObj?.limits?.branches || 1;
  const isBranchLimitReached = tenantBranchesCount >= branchLimit;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-accent" /> Jaringan Lokasi Cabang Usaha
          </h4>
          <button
            onClick={() => {
              setEditingBranchId(null);
              setBrName("");
              setBrAddress("");
              setBrPhone("");
              setBrIsActive(true);
              setShowAddBranchModal(true);
            }}
            className="bg-accent hover:bg-accent-hover text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> Tambah Cabang Baru
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-200/65 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-accent-lighter border border-indigo-100 text-accent rounded-xl text-xs">Kuota</span>
            <div>
              <p className="font-extrabold text-slate-800 text-xs">Kuota Lokasi Cabang / Outlet ({tenantBranchesCount} / {branchLimit})</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Maksimum outlet fisik sesuai paket <strong className="text-accent uppercase">{tenantObj?.tier || "BASIC"}</strong> Anda.</p>
            </div>
          </div>
          {isBranchLimitReached ? (
            <span className="inline-flex items-center gap-1 text-[10px] bg-rose-50 text-rose-700 font-extrabold px-3 py-1 rounded-full border border-rose-150/50">Batas kuota penuh</span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-extrabold px-3 py-1 rounded-full border border-emerald-150/50">Kuota tersedia</span>
          )}
        </div>

        {showAddBranchModal && (
          <div className="p-5 border border-slate-200 bg-slate-50 rounded-xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">{editingBranchId ? "Edit Detail Cabang Bisnis" : "Formulir Registrasi Cabang Baru"}</h4>
              <button onClick={() => setShowAddBranchModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4"/></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1"><label className="block text-[10px] font-mono text-slate-400 uppercase">Nama Cabang</label><input type="text" value={brName} onChange={(e) => setBrName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg outline-none font-bold text-slate-700" /></div>
              <div className="space-y-1"><label className="block text-[10px] font-mono text-slate-400 uppercase">Alamat Lengkap</label><input type="text" value={brAddress} onChange={(e) => setBrAddress(e.target.value)} className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg outline-none text-slate-700" /></div>
              <div className="space-y-1"><label className="block text-[10px] font-mono text-slate-400 uppercase">Nomor Telepon</label><input type="text" value={brPhone} onChange={(e) => setBrPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg outline-none text-slate-700" /></div>
            </div>
            <div className="flex items-center justify-between text-xs pt-2">
              <div className="flex items-center gap-2"><input type="checkbox" id="br_active_checkbox" checked={brIsActive} onChange={(e) => setBrIsActive(e.target.checked)} className="w-4 h-4 text-accent rounded cursor-pointer" /><label htmlFor="br_active_checkbox" className="font-bold text-slate-700 select-none cursor-pointer">Aktifkan Cabang</label></div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowAddBranchModal(false)} className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">Batal</button>
                <button
                  type="button"
                  disabled={!editingBranchId && isBranchLimitReached}
                  onClick={async () => {
                    if (!brName.trim()) { showToast("Nama cabang wajib diisi!", "error"); return; }
                    const safeBranch = { name: brName.trim(), address: brAddress.trim(), phone: brPhone.trim(), isActive: brIsActive };
                    try {
                      if (editingBranchId) { await updateBranch(editingBranchId, safeBranch); showToast("Cabang berhasil diperbarui!", "success"); }
                      else { await addBranch(safeBranch); showToast("Cabang baru berhasil dibuat!", "success"); }
                      setShowAddBranchModal(false);
                    } catch (e: any) {
                      showToast(e.message || "Gagal menyimpan cabang.", "error");
                    }
                  }}
                  className={`px-4 py-1.5 font-bold rounded-lg text-[11px] cursor-pointer transition-all ${!editingBranchId && isBranchLimitReached ? "bg-slate-200 text-slate-400" : "bg-accent hover:bg-accent-hover text-white"}`}
                >
                  {editingBranchId ? "Simpan Perubahan" : "Konfirmasi Buat Cabang"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {branches.filter((b: any) => b.tenantId === currentTenantId).map((branch: any) => {
            const isSelected = branch.id === currentBranchId;
            return (
              <div key={branch.id} className={`border rounded-xl p-4 transition-all relative ${isSelected ? "border-accent bg-accent-lighter/20 shadow-md" : "border-slate-200 bg-white shadow-sm"}`}>
                <div className="space-y-2.5">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono text-slate-400 uppercase">ID Cabang: {branch.id}</span>
                    <h4 className="font-extrabold text-sm text-slate-800">{branch.name}</h4>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p>Alamat: {branch.address || "-"}</p>
                    <p>Kontak: {branch.phone || "-"}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs gap-2">
                    <button type="button" onClick={() => switchBranch(branch.id)} disabled={isSelected || !branch.isActive} className={`flex-1 font-bold text-[10px] py-1.5 rounded-lg ${isSelected ? "bg-slate-100 text-slate-400" : !branch.isActive ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800 text-white"}`}>
                      {isSelected ? "Sedang Diakses" : !branch.isActive ? "Nonaktif" : "Masuk Cabang"}
                    </button>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditingBranchId(branch.id); setBrName(branch.name); setBrAddress(branch.address); setBrPhone(branch.phone); setBrIsActive(branch.isActive); setShowAddBranchModal(true); }} className="p-1.5 rounded-lg border border-slate-200"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={async () => { if (isSelected) { showToast("Tidak dapat menonaktifkan cabang aktif!", "error"); return; } if (await showConfirm({ title: "Nonaktifkan Cabang", message: `Cabang "${branch.name}" akan dinonaktifkan. Data tetap aman.`, confirmLabel: "Nonaktifkan", type: "danger" })) { try { await deleteBranch(branch.id); showToast("Cabang berhasil dinonaktifkan.", "success"); } catch (e: any) { showToast(e.message || "Gagal menonaktifkan cabang.", "error"); } } }} className="p-1.5 rounded-lg border border-slate-200" title="Nonaktifkan Cabang"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

