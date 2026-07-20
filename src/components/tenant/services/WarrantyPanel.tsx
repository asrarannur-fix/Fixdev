import React, { useState } from 'react';
import {
  Shield, CheckCircle2, XCircle, AlertTriangle,
  ChevronRight, MessageSquare, Clock, RotateCcw
} from 'lucide-react';
import { ServiceStatus } from '../../../types';

/* ── helpers ────────────────────────────────────────────────── */
const fmtRp  = (n?: number) => n ? 'Rp\u00a0' + n.toLocaleString('id-ID') : '–';
const fmtDt  = (s?: string) => s ? new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '–';
const daysLeft = (exp?: string): number | null => {
  if (!exp) return null;
  return Math.ceil((new Date(exp).getTime() - Date.now()) / 86_400_000);
};

/* ── local Badge ─────────────────────────────────────────────── */
const Badge: React.FC<{ variant: 'success' | 'warn' | 'danger' | 'muted'; children: React.ReactNode }> = ({ variant, children }) => {
  const map = {
    success: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
    warn:    'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
    danger:  'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
    muted:   'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${map[variant]}`}>
      {children}
    </span>
  );
};

/* ── WarrantyCard ────────────────────────────────────────────── */
const WarrantyCard: React.FC<{
  ticket:      any;
  isActive:    boolean;
  claimId:     string | null;
  claimNote:   string;
  claiming:    boolean;
  onClaim:     (ticket: any) => void;
  onOpenClaim: (id: string | null) => void;
  onNoteChange:(v: string) => void;
  onWA:        (ticket: any) => void;
  onOpen:      (id: string) => void;
}> = ({ ticket, isActive, claimId, claimNote, claiming, onClaim, onOpenClaim, onNoteChange, onWA, onOpen }) => {
  const days      = daysLeft(ticket.warrantyExpiry);
  const isClaim   = ticket.status === ServiceStatus.KLAIM_GARANSI;
  const isExpired = (days ?? -1) < 0;
  const isCritical= !isExpired && !isClaim && (days ?? 100) <= 7;
  const totalDays = ticket.warrantyDays ?? 30;
  const pct       = days !== null
    ? Math.max(0, Math.min(100, Math.round((days / totalDays) * 100)))
    : 0;

  const borderCls = isClaim    ? 'border-amber-200 dark:border-amber-800/40' :
                    isExpired  ? 'border-slate-200 dark:border-slate-800'    :
                    isCritical ? 'border-amber-200 dark:border-amber-800/40' :
                                 'border-teal-200 dark:border-teal-800/40';

  const badgeEl = isClaim    ? <Badge variant="warn">🔔 Klaim Aktif</Badge> :
                  isExpired  ? <Badge variant="danger">Kadaluarsa</Badge>   :
                  isCritical ? <Badge variant="warn">⚠ Hampir Habis</Badge>  :
                               <Badge variant="success">✓ Aktif</Badge>;

  return (
    <div className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all hover:shadow-md ${borderCls} ${isExpired ? 'opacity-70' : ''}`}>

      {/* Card top */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              <span className="text-[10px] font-mono text-slate-400">#{ticket.ticketNo}</span>
              {badgeEl}
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight truncate">
              {ticket.deviceBrandModel ?? ticket.deviceName}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {ticket.customerName}
              {ticket.customerPhone && ` · ${ticket.customerPhone}`}
            </p>
          </div>

          {/* Days countdown */}
          {days !== null && (
            <div className={`text-right shrink-0 px-2.5 py-1.5 rounded-xl ${isExpired ? 'bg-rose-50 dark:bg-rose-950/20' : isCritical ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-teal-50 dark:bg-teal-950/20'}`}>
              <div className={`text-xl font-black leading-none ${isExpired ? 'text-rose-600 dark:text-rose-400' : isCritical ? 'text-amber-600 dark:text-amber-400' : 'text-teal-600 dark:text-teal-400'}`}>
                {Math.abs(days ?? 0)}
              </div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                {isExpired ? 'hari lalu' : 'hari lagi'}
              </div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {!isExpired && !isClaim && (
          <div className="mb-3">
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-slate-400">Sisa garansi</span>
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{pct}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isCritical ? 'bg-amber-400' : 'bg-teal-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
          <div>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">Selesai</p>
            <p className="font-semibold text-slate-700 dark:text-slate-300">{fmtDt(ticket.updatedAt)}</p>
          </div>
          <div>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">Berakhir</p>
            <p className="font-semibold text-slate-700 dark:text-slate-300">{fmtDt(ticket.warrantyExpiry)}</p>
          </div>
          <div>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">Durasi</p>
            <p className="font-semibold text-slate-700 dark:text-slate-300">{ticket.warrantyDays ?? 30} hari</p>
          </div>
          <div>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">Biaya</p>
            <p className="font-semibold text-emerald-600 dark:text-emerald-400">{fmtRp(ticket.estimatedCost)}</p>
          </div>
          {ticket.notes && (
            <div className="col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">Catatan Perbaikan</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 italic line-clamp-2">{ticket.notes}</p>
            </div>
          )}
          {ticket.claimNote && (
            <div className="col-span-2 pt-2 border-t border-amber-100 dark:border-amber-900/30">
              <p className="text-amber-600 dark:text-amber-400 text-[10px] uppercase tracking-wider mb-0.5">Alasan Klaim</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 italic">{ticket.claimNote}</p>
            </div>
          )}
        </div>
      </div>

      {/* Card actions */}
      <div className="flex items-stretch border-t border-slate-100 dark:border-slate-800 divide-x divide-slate-100 dark:divide-slate-800">
        <button
          onClick={() => onOpen(ticket.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
        >
          <ChevronRight className="w-3.5 h-3.5" /> Buka Tiket
        </button>
        {isActive && !isClaim && !isExpired && (
          <button
            onClick={() => onOpenClaim(claimId === ticket.id ? null : ticket.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Klaim
          </button>
        )}
        <button
          onClick={() => onWA(ticket)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Claim form (expandable) */}
      {claimId === ticket.id && (
        <div className="px-4 pb-4 pt-3 border-t border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/10">
          <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-2.5 flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> Daftarkan Klaim Garansi
          </p>
          <textarea
            value={claimNote}
            onChange={e => onNoteChange(e.target.value)}
            rows={3}
            placeholder="Jelaskan masalah yang muncul kembali setelah perbaikan sebelumnya..."
            className="w-full px-3 py-2 text-xs border border-amber-200 dark:border-amber-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-all"
          />
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={() => onClaim(ticket)}
              disabled={claiming || !claimNote.trim()}
              className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
            >
              {claiming ? 'Mendaftarkan...' : 'Daftarkan Klaim'}
            </button>
            <button
              onClick={() => onOpenClaim(null)}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-xl cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── main component ──────────────────────────────────────────── */
export const WarrantyPanel: React.FC<{
  repairs?: any[];
  branches?: any[];
  activeRole?: string;
  selectedBranchId?: string;
  onModifyRepair?: (ticket: any) => Promise<void>;
  setSelectedTicketIdForEdit?: (id: string | null) => void;
  setActiveTab?: (tab: string) => void;
}> = ({ repairs = [], onModifyRepair, setSelectedTicketIdForEdit, setActiveTab }) => {
  const [claimId,   setClaimId  ] = useState<string | null>(null);
  const [claimNote, setClaimNote] = useState('');
  const [claiming,  setClaiming ] = useState(false);
  const [notice,    setNotice   ] = useState<{ ok: boolean; msg: string } | null>(null);

  const warrantyList = repairs.filter(r =>
    r.warrantyExpiry &&
    [ServiceStatus.SELESAI, ServiceStatus.DIAMBIL, ServiceStatus.KLAIM_GARANSI].includes(r.status)
  );
  const active  = warrantyList.filter(r => r.status !== ServiceStatus.KLAIM_GARANSI && (daysLeft(r.warrantyExpiry) ?? -1) >= 0);
  const expired = warrantyList.filter(r => r.status !== ServiceStatus.KLAIM_GARANSI && (daysLeft(r.warrantyExpiry) ?? 1)  < 0);
  const claims  = warrantyList.filter(r => r.status === ServiceStatus.KLAIM_GARANSI);

  const handleClaim = async (ticket: any) => {
    if (!claimNote.trim()) return;
    setClaiming(true);
    try {
      await onModifyRepair?.({
        ...ticket,
        status:    ServiceStatus.KLAIM_GARANSI,
        claimNote,
        claimDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setNotice({ ok: true, msg: 'Klaim garansi berhasil didaftarkan!' });
      setClaimId(null);
      setClaimNote('');
    } catch {
      setNotice({ ok: false, msg: 'Gagal mendaftarkan klaim.' });
    } finally {
      setClaiming(false);
      setTimeout(() => setNotice(null), 3500);
    }
  };

  const handleWA = (ticket: any) => {
    const ph = (ticket.customerPhone ?? '').replace(/[^0-9]/g, '').replace(/^0/, '62');
    if (!ph) return;
    const d = daysLeft(ticket.warrantyExpiry);
    const lines = [
      `Halo *${ticket.customerName}*,`,
      '',
      'Info garansi servis laptop Anda:',
      `Unit: *${ticket.deviceBrandModel ?? ticket.deviceName}*`,
      `No. Tiket: *#${ticket.ticketNo}*`,
      `Status: *${d !== null && d >= 0 ? d + ' hari lagi' : 'KADALUARSA'}*`,
      `Berlaku s/d: *${fmtDt(ticket.warrantyExpiry)}*`,
      '',
      'Jika ada masalah terkait perbaikan sebelumnya, segera hubungi kami. 🙏',
    ].join('\n');
    window.open(`https://wa.me/${ph}?text=${encodeURIComponent(lines)}`, '_blank');
  };

  const cardProps = {
    claimId,
    claimNote,
    claiming,
    onClaim:     handleClaim,
    onOpenClaim: setClaimId,
    onNoteChange:setClaimNote,
    onWA:        handleWA,
    onOpen:      (id: string) => setSelectedTicketIdForEdit?.(id),
  };

  const StatBox: React.FC<{ count: number; label: string; color: string; icon: React.ReactNode }> = ({ count, label, color, icon }) => (
    <div className={`rounded-2xl border p-4 text-center ${color}`}>
      <div className="flex items-center justify-center gap-1.5 mb-1 opacity-70">{icon}</div>
      <div className="text-2xl font-black leading-none">{count}</div>
      <div className="text-[11px] font-semibold mt-1 opacity-80">{label}</div>
    </div>
  );

  const SectionTitle: React.FC<{ icon: React.ReactNode; title: string; count: number }> = ({ icon, title, count }) => (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">{title}</h3>
      <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{count}</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-teal-100 dark:bg-teal-950/40 flex items-center justify-center">
            <Shield className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Kelola garansi servis & klaim pelanggan
            </p>
          </div>
        </div>
        <button
          onClick={() => setActiveTab?.('main-tickets')}
          className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
        >
          ← Tiket
        </button>
      </div>

      {/* Notice */}
      {notice && (
        <div className={`px-4 py-3 rounded-xl text-sm font-semibold border flex items-center gap-2 ${notice.ok ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/40'}`}>
          {notice.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {notice.msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox
          count={active.length}
          label="Garansi Aktif"
          color="bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800/40 text-teal-700 dark:text-teal-400"
          icon={<Shield className="w-4 h-4" />}
        />
        <StatBox
          count={claims.length}
          label="Klaim Proses"
          color="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400"
          icon={<AlertTriangle className="w-4 h-4" />}
        />
        <StatBox
          count={expired.length}
          label="Kadaluarsa"
          color="bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
          icon={<Clock className="w-4 h-4" />}
        />
      </div>

      {/* Empty state */}
      {warrantyList.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl py-16 px-8 text-center">
          <Shield className="w-14 h-14 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="font-black text-slate-800 dark:text-white text-lg mb-2">Belum Ada Data Garansi</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
            Garansi aktif otomatis saat tiket diubah ke status <strong className="text-slate-700 dark:text-slate-300">Selesai</strong> dan masa garansi diisi di form perbaikan.
          </p>
          <button
            onClick={() => setActiveTab?.('main-tickets')}
            className="mt-5 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-bold rounded-xl cursor-pointer transition-colors"
          >
            Lihat Tiket Servis
          </button>
        </div>
      )}

      {/* Klaim section */}
      {claims.length > 0 && (
        <div>
          <SectionTitle
            icon={<AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
            title="Klaim Sedang Diproses"
            count={claims.length}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {claims.map(t => <WarrantyCard key={t.id} ticket={t} isActive={true} {...cardProps} />)}
          </div>
        </div>
      )}

      {/* Active section */}
      {active.length > 0 && (
        <div>
          <SectionTitle
            icon={<CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
            title="Garansi Aktif"
            count={active.length}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {active.map(t => <WarrantyCard key={t.id} ticket={t} isActive={true} {...cardProps} />)}
          </div>
        </div>
      )}

      {/* Expired section */}
      {expired.length > 0 && (
        <div>
          <SectionTitle
            icon={<XCircle className="w-4 h-4 text-slate-400" />}
            title="Garansi Kadaluarsa"
            count={expired.length}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {expired.map(t => <WarrantyCard key={t.id} ticket={t} isActive={false} {...cardProps} />)}
          </div>
        </div>
      )}
    </div>
  );
};
