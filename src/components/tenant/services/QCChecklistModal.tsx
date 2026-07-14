import React, { useState } from 'react';
import { X, Save, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

/* ── checklist data ─────────────────────────────────────────── */
const GROUPS: { id: string; label: string; emoji: string; items: { id: string; label: string }[] }[] = [
  { id: 'g-body', label: 'Kondisi Fisik', emoji: '🔩', items: [
    { id: 'f1', label: 'Casing / body tidak retak, tidak pecah, engsel bergerak mulus' },
    { id: 'f2', label: 'Tombol power & semua indikator LED menyala normal' },
    { id: 'f3', label: 'Semua baut terpasang — tidak ada baut hilang atau kendor' },
  ]},
  { id: 'g-disp', label: 'Layar & Display', emoji: '🖥️', items: [
    { id: 'd1', label: 'Tidak ada dead pixel, bintik hitam, atau garis vertikal di layar' },
    { id: 'd2', label: 'Backlight merata — tidak ada bleeding / shadow di pojok atau tepi' },
    { id: 'd3', label: 'Brightness & contrast normal saat digeser 0% hingga 100%' },
    { id: 'd4', label: 'Touchscreen responsif & akurat di seluruh area (jika ada)' },
  ]},
  { id: 'g-kbd', label: 'Keyboard & Touchpad', emoji: '⌨️', items: [
    { id: 'k1', label: 'Semua tombol keyboard berfungsi — tidak ada ghost key atau stuck key' },
    { id: 'k2', label: 'Backlight keyboard menyala & dapat diatur tingkat kecerahannya (jika ada)' },
    { id: 'k3', label: 'Touchpad responsif, smooth scrolling OK, klik kiri & kanan normal' },
  ]},
  { id: 'g-bat', label: 'Baterai & Charging', emoji: '🔋', items: [
    { id: 'b1', label: 'Baterai terdeteksi sistem — tidak menampilkan "Plugged in, not charging"' },
    { id: 'b2', label: 'Health baterai > 80% (diverifikasi dengan BatteryInfoView / HWMonitor)' },
    { id: 'b3', label: 'Adaptor mengisi daya normal — LED indikator charging menyala oranye/hijau' },
  ]},
  { id: 'g-port', label: 'Port & Konektor', emoji: '🔌', items: [
    { id: 'p1', label: 'Semua port USB-A & USB-C dapat membaca perangkat dengan benar' },
    { id: 'p2', label: 'Port HDMI / DisplayPort output ke monitor eksternal berfungsi (jika ada)' },
    { id: 'p3', label: 'Jack audio 3.5mm — headphone terdeteksi & mikrofon input aktif' },
    { id: 'p4', label: 'Card reader SD mendeteksi kartu memori (jika ada)' },
  ]},
  { id: 'g-net', label: 'Koneksi Nirkabel', emoji: '📶', items: [
    { id: 'n1', label: 'WiFi terdeteksi, dapat terhubung ke jaringan & browsing lancar' },
    { id: 'n2', label: 'Bluetooth ON & dapat melakukan pairing dengan perangkat lain' },
  ]},
  { id: 'g-perf', label: 'Performa & Suhu', emoji: '⚡', items: [
    { id: 'pr1', label: 'Boot time normal — < 30 detik untuk laptop ber-SSD' },
    { id: 'pr2', label: 'Suhu CPU idle ≤ 55°C (diverifikasi dengan HWMonitor atau HWInfo64)' },
    { id: 'pr3', label: 'Tidak ada freeze / hang saat multitasking ringan selama 5 menit' },
    { id: 'pr4', label: 'Kipas / fan berputar normal — tidak berisik berlebihan atau tidak berputar' },
  ]},
  { id: 'g-media', label: 'Multimedia', emoji: '🔊', items: [
    { id: 'm1', label: 'Speaker kiri & kanan berbunyi jernih — tidak cempreng atau pecah' },
    { id: 'm2', label: 'Mikrofon built-in berfungsi (tes rekam via Voice Recorder / Browser)' },
    { id: 'm3', label: 'Webcam menyala, gambar jernih, tidak ada noise berlebihan' },
  ]},
];

interface CheckItem {
  id: string;
  label: string;
  checked: boolean;
  notes: string;
}

/* ── component ─────────────────────────────────────────────── */
export const QCChecklistModal: React.FC<{
  ticket: any;
  onClose: () => void;
  onSave: (checklist: CheckItem[]) => Promise<void>;
  initialChecklist?: any[];
}> = ({ ticket, onClose, onSave, initialChecklist = [] }) => {
  const buildItems = (): CheckItem[] => {
    const all = GROUPS.flatMap(g =>
      g.items.map(i => ({ id: i.id, label: i.label, checked: false, notes: '' }))
    );
    if (!initialChecklist.length) return all;
    return all.map(item => {
      const found = initialChecklist.find(c => c.id === item.id);
      return found ? { ...item, checked: !!found.checked, notes: found.notes ?? '' } : item;
    });
  };

  const [items, setItems]       = useState<CheckItem[]>(buildItems);
  const [saving, setSaving]     = useState(false);
  const [noteId, setNoteId]     = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle      = (id: string) => setItems(p => p.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  const setNote     = (id: string, v: string) => setItems(p => p.map(i => i.id === id ? { ...i, notes: v } : i));
  const checkAll    = () => setItems(p => p.map(i => ({ ...i, checked: true })));
  const uncheckAll  = () => setItems(p => p.map(i => ({ ...i, checked: false })));
  const toggleGroup = (gid: string) => setCollapsed(p => {
    const n = new Set(p);
    n.has(gid) ? n.delete(gid) : n.add(gid);
    return n;
  });

  const pass    = items.filter(i => i.checked).length;
  const total   = items.length;
  const rate    = Math.round((pass / total) * 100);
  const isGood  = rate >= 80;

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(items); } finally { setSaving(false); }
  };

  const barColor =
    rate >= 80 ? 'bg-emerald-500' :
    rate >= 50 ? 'bg-amber-500'   : 'bg-rose-500';

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-[2px]">
      <div className="bg-white dark:bg-zinc-950 w-full sm:max-w-2xl sm:rounded-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col border-0 sm:border border-slate-200 dark:border-slate-800 shadow-2xl rounded-t-2xl overflow-hidden">

        {/* ── Modal Header ─────────────────────────────── */}
        <div className="shrink-0 bg-white dark:bg-zinc-950 px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  QC Checklist Laptop
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {ticket.deviceBrandModel ?? ticket.deviceName} &nbsp;·&nbsp;
                  <span className="font-mono">#{ticket.ticketNo}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress section */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${barColor}`} />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {pass} / {total} item OK
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-black ${isGood ? 'text-emerald-600 dark:text-emerald-400' : rate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {rate}%
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isGood ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'}`}>
                  {isGood ? '✓ LAYAK SERAH' : '⚠ PERLU CEK'}
                </span>
              </div>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${rate}%` }}
              />
            </div>
            <div className="flex gap-2 pt-0.5">
              <button onClick={checkAll} className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer">
                Tandai Semua OK
              </button>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <button onClick={uncheckAll} className="text-[11px] font-semibold text-slate-400 hover:underline cursor-pointer">
                Reset Semua
              </button>
            </div>
          </div>
        </div>

        {/* ── Checklist Body ───────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-3">
          {GROUPS.map(group => {
            const groupItems = group.items.map(gi => items.find(i => i.id === gi.id)!).filter(Boolean);
            const gPass      = groupItems.filter(i => i.checked).length;
            const gTotal     = groupItems.length;
            const isCollapsed = collapsed.has(group.id);

            return (
              <div key={group.id} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base leading-none">{group.emoji}</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                      {group.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${gPass === gTotal ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                      {gPass}/{gTotal}
                    </span>
                    {isCollapsed
                      ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      : <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                    }
                  </div>
                </button>

                {/* Group items */}
                {!isCollapsed && (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {groupItems.map(item => (
                      <div key={item.id}>
                        <div
                          onClick={() => toggle(item.id)}
                          className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${item.checked ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : 'bg-white dark:bg-zinc-950 hover:bg-slate-50 dark:hover:bg-slate-900/40'}`}
                        >
                          {/* Checkbox */}
                          <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all ${item.checked ? 'bg-emerald-500 border-2 border-emerald-500' : 'border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'}`}>
                            {item.checked && (
                              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>

                          {/* Label + badge */}
                          <span className={`flex-1 text-sm leading-relaxed ${item.checked ? 'text-emerald-700 dark:text-emerald-300 line-through decoration-emerald-400/50' : 'text-slate-700 dark:text-slate-200'}`}>
                            {item.label}
                          </span>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <button
                              onClick={e => { e.stopPropagation(); setNoteId(noteId === item.id ? null : item.id); }}
                              className="text-[10px] font-semibold text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                            >
                              {item.notes ? '📝' : '+ catatan'}
                            </button>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full min-w-[2.5rem] text-center ${item.checked ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'}`}>
                              {item.checked ? 'OK' : 'FAIL'}
                            </span>
                          </div>
                        </div>

                        {/* Note input */}
                        {noteId === item.id && (
                          <div className="px-4 pb-3 bg-slate-50/80 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                            <input
                              autoFocus
                              value={item.notes}
                              onChange={e => setNote(item.id, e.target.value)}
                              placeholder="Catatan tambahan (opsional)..."
                              className="w-full mt-2.5 px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 transition-all"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Modal Footer ─────────────────────────────── */}
        <div className="shrink-0 px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-zinc-950 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            {saving ? (
              <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Menyimpan...</>
            ) : (
              <><Save className="w-4 h-4" /> Simpan Hasil QC</>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};
