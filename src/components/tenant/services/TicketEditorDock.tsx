import React, { useState, useEffect } from 'react';
import {
  Laptop, User, Wrench, Clock, DollarSign, CheckCircle2,
  AlertCircle, Bot, Shield, MessageSquare, Package, X,
  Plus, Zap, ChevronRight, Image as ImageIcon, Hash
} from 'lucide-react';
import { ServiceStatus } from '../../../types';
import { QCChecklistModal } from './QCChecklistModal';

/* ── constants ──────────────────────────────────────────────── */
const STATUS_LABEL: Record<string, string> = {
  [ServiceStatus.DITERIMA]:           'Diterima',
  [ServiceStatus.DIAGNOSA]:           'Diagnosa',
  [ServiceStatus.MENUGGU_APPROVAL]:   'Menunggu Approval',
  [ServiceStatus.SEDANG_DIKERJAKAN]:  'Sedang Dikerjakan',
  [ServiceStatus.SELESAI]:            'Selesai',
  [ServiceStatus.DIAMBIL]:            'Diambil',
  [ServiceStatus.DIBATALKAN]:         'Dibatalkan',
  [ServiceStatus.ESTIMATE_PENDING]:   'Estimasi Pending',
  [ServiceStatus.APPROVAL_DITOLAK]:   'Approval Ditolak',
  [ServiceStatus.KLAIM_GARANSI]:      'Klaim Garansi',
  [ServiceStatus.RUSAK]:              'Rusak / BER',
};

const STATUS_COLOR: Record<string, string> = {
  [ServiceStatus.DITERIMA]:          'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400',
  [ServiceStatus.DIAGNOSA]:          'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400',
  [ServiceStatus.MENUGGU_APPROVAL]:  'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
  [ServiceStatus.SEDANG_DIKERJAKAN]: 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400',
  [ServiceStatus.SELESAI]:           'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
  [ServiceStatus.DIAMBIL]:           'bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400',
  [ServiceStatus.DIBATALKAN]:        'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400',
  [ServiceStatus.ESTIMATE_PENDING]:  'bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400',
  [ServiceStatus.APPROVAL_DITOLAK]:  'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400',
  [ServiceStatus.KLAIM_GARANSI]:     'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
  [ServiceStatus.RUSAK]:             'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400',
};

const PRIORITY_CONFIG: Record<string, { label: string; dot: string; bg: string }> = {
  URGENT: { label: 'URGENT', dot: 'bg-rose-500',  bg: 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400' },
  HIGH:   { label: 'HIGH',   dot: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400' },
  NORMAL: { label: 'NORMAL', dot: 'bg-blue-500',  bg: 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400' },
  LOW:    { label: 'LOW',    dot: 'bg-slate-400', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' },
};

/* ── helpers ────────────────────────────────────────────────── */
const fmtRp = (n?: number) => n != null && Number.isFinite(n) ? 'Rp\u00a0' + n.toLocaleString('id-ID') : '–';
const fmtDt = (s?: string) => s ? new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '–';
const timeAgo = (s?: string): string => {
  if (!s) return '';
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60_000);
  if (m < 1)   return 'Baru saja';
  if (m < 60)  return `${m}m lalu`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}j lalu`;
  return `${Math.floor(h / 24)}h lalu`;
};

/* ── AI engine (mock) ───────────────────────────────────────── */
const runAI = (complaints: string, brand: string) => {
  const q = `${complaints} ${brand}`.toLowerCase();
  const r: { cause: string; pct: number; parts: string[]; action: string }[] = [];

  if (q.includes('mati') || q.includes('blank') || q.includes('tidak nyala'))
    r.push({ cause: 'IC Power / Mosfet Short / Motherboard', pct: 74, parts: ['IC Power BQ24765', 'Mosfet Q1/Q2 Charger'], action: 'Ukur short Rail 19V. Cek tegangan VIN, VSYS, VCC3. Pastikan adaptor OK sebelum lanjut.' });
  if (q.includes('panas') || q.includes('overheat') || q.includes('kipas') || q.includes('fan'))
    r.push({ cause: 'Thermal Paste Kering & Heatsink Tersumbat Debu', pct: 91, parts: ['Thermal Paste Noctua NT-H1', 'Blower Compressed Air'], action: 'Bongkar heatsink, bersihkan fin & fan. Ganti pasta. Target suhu idle CPU ≤ 50°C.' });
  if (q.includes('layar') || q.includes('display') || q.includes('flicker') || q.includes('gelap'))
    r.push({ cause: 'Kabel Flex LCD Longgar / Putus', pct: 68, parts: ['Kabel Flex LCD 40-pin 15.6"'], action: 'Buka bezel atas, cek konektor kabel flex. Ganti jika ada sobekan atau karat.' });
  if (q.includes('keyboard') || q.includes('air') || q.includes('tumpah') || q.includes('kopi'))
    r.push({ cause: 'Keyboard Korsleting / Korosi Cairan', pct: 87, parts: ['Keyboard OEM ' + brand.split(' ')[0], 'IPA 99%'], action: 'Bersihkan PCB dengan IPA 99%. Keringkan 24 jam. Ghost key tetap ada → ganti keyboard.' });
  if (q.includes('charging') || q.includes('ngecas') || q.includes('tidak mengisi'))
    r.push({ cause: 'DC Jack Longgar / IC Charging Rusak', pct: 72, parts: ['DC Jack OEM 5.5mm', 'IC BQ25700'], action: 'Goyangkan adaptor saat charging. Hilang muncul → ganti DC Jack. Cek output adaptor (19V±0.5V).' });
  if (q.includes('lambat') || q.includes('booting') || q.includes('ssd') || q.includes('hang'))
    r.push({ cause: 'SSD/HDD Degradasi – Health Drop / Bad Sector', pct: 80, parts: ['SSD NVMe M.2 512GB PCIe 4.0'], action: 'Jalankan CrystalDiskInfo. Health < 80% → segera backup & ganti storage.' });
  if (q.includes('ram') || q.includes('bsod') || q.includes('bluescreen') || q.includes('restart'))
    r.push({ cause: 'RAM Kotor / Slot Teroksidasi', pct: 62, parts: ['RAM DDR4/DDR5 8GB sesuai slot'], action: 'Cabut RAM, bersihkan pin dengan penghapus putih. Pasang di slot lain. MemTest86 minimal 2 pass.' });

  if (!r.length)
    r.push({ cause: 'Perlu Diagnosa Mendalam Teknisi Senior', pct: 100, parts: ['POST Diagnostic Card', 'Multimeter Digital'], action: 'POST test, ukur titik tegangan kritis motherboard, load test CPU+GPU.' });

  return r.sort((a, b) => b.pct - a.pct).slice(0, 3);
};

/* ── small UI atoms ─────────────────────────────────────────── */
const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[status] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
    {STATUS_LABEL[status] ?? status}
  </span>
);

const InfoRow: React.FC<{ label: string; children: React.ReactNode; mono?: boolean }> = ({ label, children, mono }) => (
  <div>
    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">{label}</dt>
    <dd className={`text-sm font-semibold text-slate-800 dark:text-slate-200 ${mono ? 'font-mono text-xs tracking-wider' : ''}`}>{children}</dd>
  </div>
);

const inputCls =
  'w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 ' +
  'rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all';

const selectCls =
  'w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 ' +
  'rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 ' +
  'focus:border-indigo-500 transition-all cursor-pointer';

/* ── main component ──────────────────────────────────────────── */
type TabKey = 'info' | 'ai' | 'edit' | 'qc' | 'history';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'info',    label: 'Detail',      icon: <Laptop className="w-3.5 h-3.5" /> },
  { key: 'ai',      label: 'AI Diagnosa', icon: <Bot className="w-3.5 h-3.5" /> },
  { key: 'edit',    label: 'Perbaikan',   icon: <Wrench className="w-3.5 h-3.5" /> },
  { key: 'qc',      label: 'QC',          icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { key: 'history', label: 'Riwayat',     icon: <Clock className="w-3.5 h-3.5" /> },
];

export const TicketEditorDock: React.FC<{
  repairs?: any[];
  selectedTicketIdForEdit?: string;
  setSelectedTicketIdForEdit?: (id: string | null) => void;
  onModifyRepair?: (t: any) => Promise<void>;
  onDeleteRepair?: (id: string) => Promise<void>;
  technicians?: any[];
  branches?: any[];
}> = ({ repairs = [], selectedTicketIdForEdit, setSelectedTicketIdForEdit, onModifyRepair, technicians = [] }) => {
  const ticket = repairs.find(r => r.id === selectedTicketIdForEdit);

  const [tab,       setTab      ] = useState<TabKey>('info');
  const [status,    setStatus   ] = useState(ticket?.status ?? '');
  const [notes,     setNotes    ] = useState(ticket?.notes ?? '');
  const [cost,      setCost     ] = useState(ticket?.estimatedCost?.toString() ?? '');
  const [techId,    setTechId   ] = useState(ticket?.technicianId ?? '');
  const [wDays,     setWDays    ] = useState(ticket?.warrantyDays?.toString() ?? '30');
  const [saving,    setSaving   ] = useState(false);
  const [msg,       setMsg      ] = useState<{ ok: boolean; text: string } | null>(null);
  const [showQC,    setShowQC   ] = useState(false);
  const [qcItems,   setQcItems  ] = useState<any[]>(ticket?.qcChecklist ?? []);
  const [aiResult,  setAiResult ] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [parts,     setParts    ] = useState<{ name: string; qty: number; cost: number }[]>(ticket?.spareParts ?? []);
  const [newPart,   setNewPart  ] = useState({ name: '', qty: 1, cost: 0 });
  const [waSent,    setWaSent   ] = useState(false);

  useEffect(() => {
    if (!ticket) return;
    setTab('info');
    setStatus(ticket.status ?? '');
    setNotes(ticket.notes ?? '');
    setCost(ticket.estimatedCost?.toString() ?? '');
    setTechId(ticket.technicianId ?? '');
    setWDays(ticket.warrantyDays?.toString() ?? '30');
    setQcItems(ticket.qcChecklist ?? []);
    setParts(ticket.spareParts ?? []);
    setAiResult([]);
    setWaSent(false);
    setMsg(null);
  }, [selectedTicketIdForEdit]);

  if (!ticket) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
      <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-amber-500" />
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tiket tidak ditemukan</p>
      <button onClick={() => setSelectedTicketIdForEdit?.(null)} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl cursor-pointer transition-colors hover:opacity-80">
        ← Kembali
      </button>
    </div>
  );

  const partsCost = parts.reduce((s, p) => s + p.cost * p.qty, 0);
  const qcPass    = qcItems.filter((i: any) => i.checked).length;
  const qcRate    = qcItems.length ? Math.round((qcPass / qcItems.length) * 100) : 0;
  const priority  = PRIORITY_CONFIG[ticket.priority ?? 'NORMAL'] ?? PRIORITY_CONFIG.NORMAL;
  const hasWarranty = ticket.warrantyExpiry && new Date(ticket.warrantyExpiry) > new Date();

  const handleRunAI = async () => {
    setAiLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setAiResult(runAI(ticket.customerComplaints ?? '', ticket.deviceBrandModel ?? ''));
    setAiLoading(false);
  };

  const addPart = () => {
    if (!newPart.name.trim()) return;
    setParts(p => [...p, { ...newPart }]);
    setNewPart({ name: '', qty: 1, cost: 0 });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const parsedWarrantyDays = Number(wDays);
      const parsedCost = Number(cost);
      if (!Number.isFinite(parsedWarrantyDays) || parsedWarrantyDays < 0) {
        throw new Error('Hari garansi tidak valid.');
      }
      if (cost && (!Number.isFinite(parsedCost) || parsedCost < 0)) {
        throw new Error('Estimasi biaya tidak valid.');
      }
      const wExp = status === ServiceStatus.SELESAI
        ? new Date(Date.now() + parsedWarrantyDays * 86_400_000).toISOString()
        : ticket.warrantyExpiry;
      await onModifyRepair?.({
        ...ticket,
        status,
        notes,
        estimatedCost: cost ? parsedCost : ticket.estimatedCost,
        technicianId:  techId,
        warrantyDays:  parsedWarrantyDays,
        warrantyExpiry: wExp,
        spareParts:    parts,
        qcChecklist:   qcItems,
        updatedAt:     new Date().toISOString(),
      });
      setMsg({ ok: true, text: status === ServiceStatus.SELESAI ? `Tersimpan! Garansi aktif ${wDays} hari.` : 'Perubahan berhasil disimpan.' });
    } catch {
      setMsg({ ok: false, text: 'Gagal menyimpan. Coba lagi.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const handleWA = () => {
    const ph = (ticket.customerPhone ?? '').replace(/[^0-9]/g, '').replace(/^0/, '62');
    if (!ph) return;
    const lines = [
      `Halo *${ticket.customerName}*, update servis dari kami:`,
      `Unit: *${ticket.deviceBrandModel ?? ticket.deviceName}*`,
      `No. Tiket: *#${ticket.ticketNo}*`,
      `Status: *${STATUS_LABEL[status] ?? status}*`,
      status === ServiceStatus.SELESAI ? `Garansi: *${wDays} hari* aktif hari ini` : '',
      `Biaya: *${fmtRp(cost ? Number(cost) : ticket.estimatedCost)}*`,
      notes ? `Catatan: ${notes}` : '',
      '',
      'Terima kasih telah mempercayakan servis ke kami. 🙏',
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/${ph}?text=${encodeURIComponent(lines)}`, '_blank');
    setWaSent(true);
  };

  /* ── render ─────────────────────────────────────────────────── */
  return (
    <div className="space-y-4 animate-fadeIn">
      {showQC && (
        <QCChecklistModal
          ticket={ticket}
          initialChecklist={qcItems}
          onClose={() => setShowQC(false)}
          onSave={async items => { setQcItems(items); setShowQC(false); }}
        />
      )}

      {/* ── Hero Header ─────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800 via-indigo-900 to-slate-900 text-white">
        {/* bg glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative p-5">
          {/* Row 1 — ticket & badges */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-950/50 border border-indigo-700/30 px-2 py-0.5 rounded-full">
                  #{ticket.ticketNo}
                </span>
                <StatusBadge status={ticket.status} />
                {ticket.priority && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priority.bg}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${priority.dot} mr-1 -mb-px`} />
                    {priority.label}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black leading-tight truncate">
                {ticket.deviceBrandModel ?? ticket.deviceName ?? 'Laptop'}
              </h2>
              <p className="text-sm text-indigo-200 mt-0.5">{ticket.customerName}</p>
              {ticket.serialNumber && (
                <p className="text-[10px] text-indigo-400 font-mono mt-0.5 flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  {ticket.serialNumber}
                </p>
              )}
            </div>

            <div className="text-right shrink-0">
              <div className="text-2xl font-black">{fmtRp(ticket.estimatedCost)}</div>
              <div className="text-[10px] text-indigo-300 mt-0.5">{timeAgo(ticket.createdAt)}</div>
              {hasWarranty && (
                <div className="text-[10px] text-emerald-400 mt-1 font-semibold">
                  Garansi s/d {fmtDt(ticket.warrantyExpiry)}
                </div>
              )}
            </div>
          </div>

          {/* Row 2 — actions */}
          <div className="flex items-center gap-2 pt-3 border-t border-white/10">
            <button
              onClick={handleWA}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all border ${waSent ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'}`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {waSent ? 'WA Terkirim ✓' : 'Kirim Update WA'}
            </button>
            {qcItems.length > 0 && (
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${qcRate >= 80 ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/20 border-rose-500/30 text-rose-300'}`}>
                QC {qcRate}% ({qcPass}/{qcItems.length})
              </span>
            )}
            <button
              onClick={() => setSelectedTicketIdForEdit?.(null)}
              className="ml-auto p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white cursor-pointer transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ─────────────────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap select-none cursor-pointer transition-all ${
              tab === t.key
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Notification ────────────────────────────────────── */}
      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm font-semibold border flex items-center gap-2 ${msg.ok ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/40'}`}>
          {msg.ok
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />
          }
          {msg.text}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: Detail
      ══════════════════════════════════════════════════════ */}
      {tab === 'info' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Customer */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <User className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Pelanggan</h3>
              </div>
              <dl className="space-y-3">
                <InfoRow label="Nama">{ticket.customerName ?? '–'}</InfoRow>
                <InfoRow label="WhatsApp">{ticket.customerPhone ?? '–'}</InfoRow>
                {ticket.customerEmail && <InfoRow label="Email">{ticket.customerEmail}</InfoRow>}
              </dl>
            </div>

            {/* Device */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <Laptop className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Perangkat</h3>
              </div>
              <dl className="space-y-3">
                <InfoRow label="Merek / Model">{ticket.deviceBrandModel ?? '–'}</InfoRow>
                {ticket.serialNumber && <InfoRow label="Serial Number" mono>{ticket.serialNumber}</InfoRow>}
                {ticket.deviceColor && <InfoRow label="Warna">{ticket.deviceColor}</InfoRow>}
              </dl>
            </div>

            {/* Complaint */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:col-span-2">
              <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <Zap className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Keluhan & Kerusakan</h3>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 leading-relaxed whitespace-pre-wrap">
                {ticket.customerComplaints || <span className="text-slate-400 italic">Tidak ada catatan keluhan.</span>}
              </p>
            </div>

            {/* Cost & tech */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <DollarSign className="w-4 h-4 text-teal-500" />
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Biaya & Teknisi</h3>
              </div>
              <dl className="space-y-3">
                <InfoRow label="Estimasi Total">
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{fmtRp(ticket.estimatedCost)}</span>
                </InfoRow>
                {ticket.diagnosticFee > 0 && <InfoRow label="Biaya Diagnosa">{fmtRp(ticket.diagnosticFee)}</InfoRow>}
                <InfoRow label="Teknisi">
                  {technicians.find(t => t.id === ticket.technicianId)?.name ?? <span className="text-slate-400 italic">Belum ditugaskan</span>}
                </InfoRow>
              </dl>
            </div>

            {/* Warranty */}
            <div className={`border rounded-2xl p-4 ${hasWarranty ? 'bg-teal-50/50 dark:bg-teal-950/10 border-teal-200 dark:border-teal-800/40' : 'bg-slate-50 dark:bg-slate-800/30 border-dashed border-slate-200 dark:border-slate-700'}`}>
              <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-teal-100/60 dark:border-teal-900/30">
                <Shield className={`w-4 h-4 ${hasWarranty ? 'text-teal-500' : 'text-slate-400'}`} />
                <h3 className={`text-xs font-bold uppercase tracking-wide ${hasWarranty ? 'text-teal-700 dark:text-teal-400' : 'text-slate-500'}`}>Garansi Servis</h3>
              </div>
              {ticket.warrantyExpiry ? (
                <dl className="space-y-2">
                  <InfoRow label="Durasi">{ticket.warrantyDays ?? 30} hari</InfoRow>
                  <InfoRow label="Berakhir">{fmtDt(ticket.warrantyExpiry)}</InfoRow>
                  <div className="pt-1">
                    {hasWarranty
                      ? <span className="text-[10px] font-black bg-teal-500 text-white px-2.5 py-1 rounded-full">✓ AKTIF</span>
                      : <span className="text-[10px] font-black bg-rose-500 text-white px-2.5 py-1 rounded-full">KADALUARSA</span>
                    }
                  </div>
                </dl>
              ) : (
                <div className="py-4 text-center">
                  <Shield className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 leading-snug">Garansi belum aktif.<br/>Ubah status ke <strong>Selesai</strong> untuk mengaktifkan.</p>
                </div>
              )}
            </div>
          </div>

          {/* Photos */}
          {ticket.photos?.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <ImageIcon className="w-4 h-4 text-violet-500" />
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Foto Kondisi Fisik</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ticket.photos.map((url: string, i: number) => (
                  <div key={i} className="aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                    <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setTab('edit')}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-bold rounded-xl cursor-pointer transition-all shadow-lg shadow-indigo-600/20"
          >
            <Wrench className="w-4 h-4" />
            Update Status & Perbaikan
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: AI Diagnosa
      ══════════════════════════════════════════════════════ */}
      {tab === 'ai' && (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 border border-violet-200 dark:border-violet-800/40 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/25">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white">AI Service Assistant</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Analisis kerusakan otomatis dari keluhan & model laptop</p>
              </div>
            </div>

            <div className="bg-white/70 dark:bg-slate-800/40 backdrop-blur-sm rounded-xl p-3.5 mb-4 border border-violet-100 dark:border-violet-900/30">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Input Analisis</p>
              <div className="space-y-1.5 text-xs">
                <p><span className="text-slate-500">Unit: </span><span className="font-bold text-slate-900 dark:text-white">{ticket.deviceBrandModel ?? '–'}</span></p>
                <p><span className="text-slate-500">Keluhan: </span><span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">{ticket.customerComplaints ?? '–'}</span></p>
              </div>
            </div>

            <button
              onClick={handleRunAI}
              disabled={aiLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl cursor-pointer transition-all shadow-lg shadow-violet-600/20"
            >
              {aiLoading ? (
                <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Menganalisis...</>
              ) : (
                <><Bot className="w-4 h-4" /> {aiResult.length ? 'Ulangi AI Diagnosis' : 'Jalankan AI Diagnosis'}</>
              )}
            </button>
          </div>

          {aiResult.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hasil Diagnosa</h4>
                <span className="text-[10px] bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 px-2 py-0.5 rounded-full font-bold">{aiResult.length} temuan</span>
              </div>

              {aiResult.map((d, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 mt-0.5 ${i === 0 ? 'bg-rose-500' : i === 1 ? 'bg-amber-500' : 'bg-blue-500'}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-bold text-sm text-slate-900 dark:text-white">{d.cause}</p>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-lg shrink-0 ${d.pct >= 70 ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400' : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'}`}>
                          {d.pct}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
                        <div
                          className={`h-full rounded-full ${i === 0 ? 'bg-rose-500' : i === 1 ? 'bg-amber-500' : 'bg-blue-500'}`}
                          style={{ width: `${d.pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3.5 py-2.5 leading-relaxed mb-3">
                    {d.action}
                  </p>
                  {d.parts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {d.parts.map((p: string, pi: number) => (
                        <span key={pi} className="text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <p className="text-[10px] text-slate-400 text-center italic pt-1">
                * Hasil AI bersifat estimasi. Wajib dikonfirmasi teknisi sebelum tindakan.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: Perbaikan
      ══════════════════════════════════════════════════════ */}
      {tab === 'edit' && (
        <div className="space-y-4">
          {/* Status & Tech */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status & Penugasan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Status Perbaikan</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className={selectCls}>
                  {Object.entries(STATUS_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Teknisi Pengerjaan</label>
                <select value={techId} onChange={e => setTechId(e.target.value)} className={selectCls}>
                  <option value="">Belum Ditugaskan</option>
                  {technicians.map((t: any) => <option key={t.id} value={t.id}>{t.name ?? t.id}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Cost */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Biaya Perbaikan</h3>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Estimasi Biaya Total (Rp)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="0" className={inputCls + ' pl-8'} />
              </div>
              {partsCost > 0 && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  Total sparepart: <span className="font-bold text-slate-700 dark:text-slate-300">{fmtRp(partsCost)}</span>
                </p>
              )}
            </div>

            {/* Warranty duration — shown only when status = SELESAI */}
            {status === ServiceStatus.SELESAI && (
              <div className="bg-emerald-50/60 dark:bg-emerald-950/15 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Masa Garansi Servis (Hari)</label>
                </div>
                <input
                  type="number" value={wDays} onChange={e => setWDays(e.target.value)} min={1} max={365}
                  className={inputCls + ' border-emerald-200 dark:border-emerald-700 focus:border-emerald-500 focus:ring-emerald-500/25'}
                />
                <p className="text-xs text-emerald-600 dark:text-emerald-500">
                  Berlaku hingga: <strong>{fmtDt(new Date(Date.now() + Number(wDays || 30) * 86_400_000).toISOString())}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-2.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Catatan Diagnosa & Tindakan</label>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)} rows={4}
              placeholder="Contoh: IC Power diganti, thermal paste dibersihkan & heatsink, SSD diupgrade ke NVMe 512GB. Boot dari 2 menit → 12 detik."
              className={inputCls + ' resize-none leading-relaxed'}
            />
          </div>

          {/* Spare Parts */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sparepart Digunakan</h3>
              </div>
              {partsCost > 0 && (
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                  {fmtRp(partsCost)}
                </span>
              )}
            </div>

            {parts.length > 0 && (
              <div className="space-y-1.5 mb-4">
                {parts.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        {p.qty}× {fmtRp(p.cost)} =&nbsp;
                        <strong className="text-slate-700 dark:text-slate-300">{fmtRp(p.qty * p.cost)}</strong>
                      </p>
                    </div>
                    <button
                      onClick={() => setParts(prev => prev.filter((_, i) => i !== idx))}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800 px-0.5">
                  <span className="text-xs text-slate-500">Total</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{fmtRp(partsCost)}</span>
                </div>
              </div>
            )}

            {/* Add part form */}
            <div className="grid grid-cols-12 gap-2">
              <input
                value={newPart.name}
                onChange={e => setNewPart({ ...newPart, name: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && addPart()}
                placeholder="Nama komponen / sparepart..."
                className={inputCls + ' col-span-6'}
              />
              <input
                type="number" min={1} value={newPart.qty} onChange={e => setNewPart({ ...newPart, qty: Number(e.target.value) })}
                className={inputCls + ' col-span-2 text-center'}
                placeholder="Qty"
              />
              <input
                type="number" value={newPart.cost || ''}
                onChange={e => setNewPart({ ...newPart, cost: Number(e.target.value) })}
                placeholder="Harga"
                className={inputCls + ' col-span-3'}
              />
              <button
                onClick={addPart} disabled={!newPart.name.trim()}
                className="col-span-1 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Save bar */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl cursor-pointer transition-all shadow-lg shadow-indigo-600/20"
            >
              {saving
                ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Menyimpan...</>
                : <><CheckCircle2 className="w-4 h-4" /> Simpan Perbaikan</>
              }
            </button>
            <button
              onClick={handleWA}
              title="Kirim update WhatsApp"
              className="px-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedTicketIdForEdit?.(null)}
              className="px-5 py-3.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-xl cursor-pointer transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: QC
      ══════════════════════════════════════════════════════ */}
      {tab === 'qc' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Quality Control</h3>
              </div>
              {qcItems.length > 0 && (
                <span className={`text-sm font-black px-3 py-1 rounded-full ${qcRate >= 80 ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'}`}>
                  {qcRate}%
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Lakukan pengecekan QC sebelum unit diserahkan. Minimal <strong>80%</strong> checklist harus PASS.
            </p>

            {qcItems.length > 0 ? (
              <div className="space-y-1.5 mb-5">
                {qcItems.map((item: any, i: number) => (
                  <div key={i} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl ${item.checked ? 'bg-emerald-50/60 dark:bg-emerald-950/10' : 'bg-slate-50 dark:bg-slate-800/40'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${item.checked ? 'bg-emerald-500' : 'bg-rose-400'}`}>
                      {item.checked
                        ? <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        : <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      }
                    </div>
                    <span className={`text-xs flex-1 leading-snug ${item.checked ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'}`}>
                      {item.label}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full min-w-[2.5rem] text-center ${item.checked ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'}`}>
                      {item.checked ? 'OK' : 'FAIL'}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 px-0.5">
                  <span className="text-xs text-slate-500">{qcPass}/{qcItems.length} item PASS</span>
                  <span className={`text-sm font-black ${qcRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {qcRate >= 80 ? '✓ LAYAK SERAH' : '⚠ PERLU PERBAIKAN'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center mb-5 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                <CheckCircle2 className="w-10 h-10 text-slate-200 dark:text-slate-700 mb-3" />
                <p className="text-sm font-semibold text-slate-500">QC belum dilakukan</p>
                <p className="text-xs text-slate-400 mt-1">Mulai checklist di bawah ini</p>
              </div>
            )}

            <button
              onClick={() => setShowQC(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-bold rounded-xl cursor-pointer transition-all shadow-lg shadow-emerald-600/15"
            >
              <CheckCircle2 className="w-4 h-4" />
              {qcItems.length ? 'Edit / Ulangi QC Checklist' : 'Mulai QC Checklist'}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: Riwayat
      ══════════════════════════════════════════════════════ */}
      {tab === 'history' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-5">Riwayat Tiket</h3>

          <div className="relative">
            {/* vertical line */}
            <div className="absolute left-[18px] top-3 bottom-3 w-px bg-gradient-to-b from-indigo-400/60 via-slate-200 dark:via-slate-700 to-slate-100 dark:to-slate-800" />

            <div className="space-y-5">
              {qcItems.length > 0 && (
                <div className="flex items-start gap-4 pl-1">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/40 border-2 border-white dark:border-slate-900 shadow flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="pt-1.5 flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">QC Checklist</p>
                    <p className="text-xs text-slate-500">{qcPass}/{qcItems.length} poin OK · {timeAgo(ticket.updatedAt ?? ticket.createdAt)}</p>
                  </div>
                </div>
              )}

              {parts.length > 0 && (
                <div className="flex items-start gap-4 pl-1">
                  <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-950/40 border-2 border-white dark:border-slate-900 shadow flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="pt-1.5 flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Sparepart</p>
                    <p className="text-xs text-slate-500">{parts.map(p => p.name).join(', ')}</p>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">{fmtRp(partsCost)}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4 pl-1">
                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950/40 border-2 border-white dark:border-slate-900 shadow flex items-center justify-center shrink-0">
                  <Wrench className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="pt-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Status diubah</p>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <p className="text-xs text-slate-500">{timeAgo(ticket.updatedAt ?? ticket.createdAt)}</p>
                  {ticket.notes && (
                    <p className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 mt-2 line-clamp-3">{ticket.notes}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4 pl-1">
                <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 shadow flex items-center justify-center shrink-0">
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
                <div className="pt-1.5 flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Tiket diterima</p>
                  <p className="text-xs text-slate-500">
                    {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString('id-ID') : '–'}
                  </p>
                  {ticket.customerComplaints && (
                    <p className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 mt-2 line-clamp-2">
                      "{ticket.customerComplaints}"
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setSelectedTicketIdForEdit?.(null)}
              className="w-full py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition-colors"
            >
              Tutup Tiket
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
