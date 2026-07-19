import React, { useState } from "react";
import { PlusCircle, Sparkles, ArrowRightLeft, Play, Trash2, GitBranch } from "lucide-react";
import { useSaaS } from "../../../../context/SaaSContext";
import { useToast } from "../../../ui/Toast";
import { useConfirm } from "../../../ui/ConfirmDialog";

interface WorkflowsBuilderPanelProps {
  currentTenantId: string;
}

export const WorkflowsBuilderPanel: React.FC<WorkflowsBuilderPanelProps> = ({ currentTenantId }) => {
  const { workflows, addWorkflow, updateWorkflow, deleteWorkflow, executeWorkflow } = useSaaS();
  const { showToast } = useToast();
  const { confirm: showConfirm } = useConfirm();

  const [showAddWorkflowModal, setShowAddWorkflowModal] = useState(false);
  const [wfName, setWfName] = useState("");
  const [wfTriggerType, setWfTriggerType] = useState<"INVOICE_UNPAID" | "TICKET_CREATED" | "STOCK_LOW" | "SHIFT_CLOSED">("TICKET_CREATED");
  const [wfTriggerCondition, setWfTriggerCondition] = useState("");
  const [wfActionType, setWfActionType] = useState<"WHATSAPP" | "EMAIL" | "JOURNAL_ENTRY" | "FRAUD_ALERT">("WHATSAPP");
  const [wfActionPayload, setWfActionPayload] = useState("");


  return (
    <div className="w-full max-w-6xl animate-fadeIn space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">Aturan Alur Kerja (Workflow Rules)</h4>
        <button
          type="button"
          onClick={() => {
            setWfName("");
            setWfTriggerType("INVOICE_UNPAID");
            setWfTriggerCondition("> 30");
            setWfActionType("WHATSAPP");
            setWfActionPayload("Halo {customer_name}, invoice tagihan Anda #{invoice_no} senilai Rp {amount} telah tertunggak lebih dari {condition} hari. Mohon segera melakukan pembayaran. Terima kasih!");
            setShowAddWorkflowModal(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
        >
          <PlusCircle className="w-4 h-4" /> Buat Aturan Automasi Baru
        </button>
      </div>

      {showAddWorkflowModal && (
        <div className="bg-slate-50 border border-indigo-100 rounded-2xl p-5 animate-fadeIn space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h4 className="font-extrabold text-xs text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" /> Buat Alur Kerja Otomatis Baru
            </h4>
            <button type="button" onClick={() => setShowAddWorkflowModal(false)} className="text-slate-400 hover:text-slate-600 font-extrabold text-xs">Batal</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <label className="block">
              <span className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Nama Alur Kerja</span>
              <input type="text" value={wfName} onChange={(e) => setWfName(e.target.value)} placeholder="Contoh: Pengingat WhatsApp Invoice Jatuh Tempo" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-medium" />
            </label>
            <label className="block">
              <span className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Pemicu Kejadian (Trigger Event)</span>
              <select value={wfTriggerType} onChange={(e) => setWfTriggerType(e.target.value as any)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-semibold text-slate-800">
                <option value="INVOICE_UNPAID">INVOICE_UNPAID (Tagihan Invoice Tertunggak)</option>
                <option value="TICKET_CREATED">TICKET_CREATED (Tiket Reparasi Baru Diterima)</option>
                <option value="STOCK_LOW">STOCK_LOW (Level Stok Barang Menipis)</option>
                <option value="SHIFT_CLOSED">SHIFT_CLOSED (Shift Laci Kasir Ditutup Operator)</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Ambang Batas / Kondisi</span>
              <input type="text" value={wfTriggerCondition} onChange={(e) => setWfTriggerCondition(e.target.value)} placeholder="Contoh: > 30, < 5, all" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-mono font-bold" />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <label className="block">
              <span className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Metode Aksi Otomatis</span>
              <select value={wfActionType} onChange={(e) => setWfActionType(e.target.value as any)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-semibold text-slate-800">
                <option value="WHATSAPP">Kirim Notifikasi WhatsApp Gateway</option>
                <option value="EMAIL">Kirim Notifikasi Email Gateway</option>
                <option value="JOURNAL_ENTRY">Buat Penjurnalan Akuntansi Otomatis</option>
                <option value="FRAUD_ALERT">Picu Sinyal Alert Detektor Fraud</option>
              </select>
            </label>
            <label className="md:col-span-2 block">
              <span className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Isi Pesan / Parameter Payload Aksi</span>
              <textarea value={wfActionPayload} onChange={(e) => setWfActionPayload(e.target.value)} rows={2} placeholder="Isi konten notifikasi otomatis atau entri log..." className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-medium font-sans" />
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-1">
            <button type="button" onClick={() => setShowAddWorkflowModal(false)} className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 font-bold border border-slate-200 rounded-xl transition-all cursor-pointer text-xs">Kembali</button>
            <button
              type="button"
              onClick={async () => {
                if (!wfName.trim() || !wfActionPayload.trim()) {
                  showToast("Mohon isi seluruh bidang nama alur kerja dan parameter aksi!", "error");
                  return;
                }
                await addWorkflow({
                  tenantId: currentTenantId,
                  name: wfName,
                  triggerType: wfTriggerType,
                  triggerCondition: wfTriggerCondition,
                  actionType: wfActionType,
                  actionPayload: wfActionPayload,
                  isActive: true,
                  executionCount: 0,
                });
                setShowAddWorkflowModal(false);
                showToast("Alur kerja otomatisasi berhasil dibuat & diaktifkan!", "success");
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-all cursor-pointer text-xs shadow-sm"
            >
              Aktifkan Alur Kerja
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {workflows
          .filter((w) => w.tenantId === currentTenantId)
          .map((w) => {
            const isWfActive = w.isActive;
            return (
              <div key={w.id} className={`border rounded-2xl p-5 transition-all relative overflow-hidden flex flex-col justify-between ${isWfActive ? "bg-white border-slate-200 shadow-sm hover:border-indigo-200" : "bg-slate-50/70 border-slate-200 opacity-75"}`}>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-sm text-slate-900 leading-tight">{w.name}</h4>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-mono font-bold uppercase">{w.triggerType}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[9px] font-mono font-bold">kondisi: {w.triggerCondition}</span>
                      </div>
                    </div>
                    <button type="button" onClick={async () => { try { await updateWorkflow(w.id, { isActive: !w.isActive }); } catch (error: any) { showToast(error?.message || "Gagal mengubah status alur.", "error"); } }} className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-black border transition-all cursor-pointer ${isWfActive ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"}`}>{isWfActive ? "● AKTIF" : "○ NONAKTIF"}</button>
                  </div>
                  <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1 text-[10px] font-mono text-indigo-700 uppercase font-black">
                      <ArrowRightLeft className="w-3.5 h-3.5" /> Pemicu Aksi Otomatis ({w.actionType})
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed font-medium italic">{w.actionPayload}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3.5 mt-4 text-[10px] text-slate-500">
                  <div className="flex items-center gap-3 font-mono">
                    <span>Eksekusi: <strong className="text-slate-800">{w.executionCount}x</strong></span>
                    {w.lastTriggeredAt && <span>Last: <strong className="text-slate-800">{new Date(w.lastTriggeredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong></span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={async () => { try { await executeWorkflow(w.id); showToast(`Pemicu alur "${w.name}" tersimpan.`, "success"); } catch (error: any) { showToast(error?.message || "Gagal menjalankan alur.", "error"); } }} disabled={!isWfActive} className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all text-[11px] cursor-pointer ${isWfActive ? "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>
                      <Play className="w-3 h-3 text-indigo-600 fill-indigo-600" /> Uji Alur
                    </button>
                    <button type="button" onClick={async () => { if (await showConfirm({ title: "Hapus Otomatisasi", message: "Apakah Anda yakin ingin menghapus alur kerja otomatisasi ini?", confirmLabel: "Ya, Hapus", type: "danger" })) { try { await deleteWorkflow(w.id); } catch (error: any) { showToast(error?.message || "Gagal menghapus alur.", "error"); } } }} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-100 transition-all cursor-pointer" title="Hapus Alur Kerja">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

        {workflows.filter((w) => w.tenantId === currentTenantId).length === 0 && (
          <div className="col-span-2 text-center py-10 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
            <GitBranch className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-bounce" />
            <p className="text-xs text-slate-500 font-bold">Belum ada aturan otomatisasi yang dikonfigurasikan.</p>
            <p className="text-[10px] text-slate-400">Klik tombol di kanan atas untuk membuat aturan otomatisasi pertama Anda.</p>
          </div>
        )}
      </div>
    </div>
  );
};
