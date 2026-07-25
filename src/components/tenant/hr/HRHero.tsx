import React from 'react';
import { useSaaS } from '../../../context/SaaSContext';
import { CreditCard, Users, Star, BarChart3, Clock, type LucideIcon } from 'lucide-react';

type Stat = { label: string; value: string | number; accent?: string };

const GROUP_META: Record<
  string,
  { title: string; subtitle: string; Icon: LucideIcon; gradient: string; glow: string }
> = {
  payroll: {
    title: 'Penggajian & Kompensasi',
    subtitle: 'Payroll, komisi, dan kasbon karyawan dalam satu tempat.',
    Icon: CreditCard,
    gradient: 'from-emerald-900 via-teal-800 to-emerald-900',
    glow: 'bg-emerald-400/20',
  },
  contracts: {
    title: 'Data & Administrasi Karyawan',
    subtitle: 'Kontrak, dokumen, dan proses pengunduran diri.',
    Icon: Users,
    gradient: 'from-blue-900 via-indigo-800 to-blue-900',
    glow: 'bg-blue-400/20',
  },
  performance: {
    title: 'Evaluasi & Kedisiplinan',
    subtitle: 'Penilaian kinerja dan catatan SP karyawan.',
    Icon: Star,
    gradient: 'from-violet-900 via-purple-800 to-violet-900',
    glow: 'bg-violet-400/20',
  },
  reports: {
    title: 'Laporan HR',
    subtitle: 'Ringkasan menyeluruh data kepegawaian & kehadiran.',
    Icon: BarChart3,
    gradient: 'from-slate-900 via-slate-800 to-zinc-900',
    glow: 'bg-slate-400/20',
  },
};

const rupiah = (n: number) =>
  'Rp ' + (n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

export const HRHero: React.FC<{ group: string }> = ({ group }) => {
  const { employees, payroll, currentTenantId, currentBranchId } = useSaaS();
  const meta = GROUP_META[group];
  if (!meta) return null;

  const emp = employees.filter(
    (e) => e.tenantId === currentTenantId && (!currentBranchId || e.branchId === currentBranchId)
  );
  const total = emp.length;

  let stats: Stat[] = [];
  if (group === 'payroll') {
    const monthlyBase = emp.reduce((s, e) => s + (Number(e.basicSalary) || 0), 0);
    const pendingKasbon = emp.reduce(
      (s, e) => s + (e.cashAdvances?.filter((c) => c.status === 'PENDING').length || 0),
      0
    );
    const paidPayroll = payroll.filter((p) => p.tenantId === currentTenantId).length;
    stats = [
      { label: 'Karyawan', value: total },
      { label: 'Total Gaji Pokok / bln', value: rupiah(monthlyBase), accent: 'text-emerald-300' },
      { label: 'Kasbon Pending', value: pendingKasbon, accent: 'text-amber-300' },
      { label: 'Slip Diterbitkan', value: paidPayroll },
    ];
  } else if (group === 'contracts') {
    const now = Date.now();
    const soon = emp.filter((e) => {
      const end = e.contractEndDate ? new Date(e.contractEndDate).getTime() : 0;
      return end && end - now < 30 * 864e5 && end - now > 0;
    }).length;
    const permanent = emp.filter((e) => e.contractStatus === 'PERMANENT').length;
    const docs = emp.reduce((s, e) => s + (e.documents?.length || 0), 0);
    stats = [
      { label: 'Karyawan', value: total },
      { label: 'Tetap (Permanent)', value: permanent, accent: 'text-blue-300' },
      { label: 'Kontrak Berakhir <30h', value: soon, accent: 'text-rose-300' },
      { label: 'Dokumen Tersimpan', value: docs },
    ];
  } else if (group === 'performance') {
    const reviews = emp.reduce((s, e) => s + (e.performanceReviews?.length || 0), 0);
    const warnings = emp.reduce((s, e) => s + (e.disciplinaryActions?.length || 0), 0);
    stats = [
      { label: 'Karyawan', value: total },
      { label: 'Review Kinerja', value: reviews, accent: 'text-violet-300' },
      { label: 'Catatan SP', value: warnings, accent: 'text-rose-300' },
    ];
  } else if (group === 'reports') {
    const todayStr = new Date().toISOString().split('T')[0];
    const present = emp.filter((e) =>
      e.attendanceHistory?.some(
        (h) => h.date === todayStr && (h.status === 'PRESENT' || h.status === 'LATE')
      )
    ).length;
    stats = [
      { label: 'Karyawan', value: total },
      { label: 'Hadir Hari Ini', value: present, accent: 'text-emerald-300' },
      {
        label: 'Tingkat Kehadiran',
        value: total ? Math.round((present / total) * 100) + '%' : '0%',
      },
    ];
  }

  const { Icon } = meta;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${meta.gradient} p-6 shadow-xl shadow-slate-900/20`}
    >
      <div
        className={`pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full ${meta.glow} blur-3xl`}
      />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-white/5 blur-3xl" />

      <div className="relative flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-black tracking-tight text-white">{meta.title}</h3>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-300">{meta.subtitle}</p>
          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white ring-1 ring-white/15">
            <Clock className="h-3 w-3" />
            {new Date().toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 backdrop-blur"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {s.label}
            </p>
            <p className={`mt-1 text-lg font-black leading-tight ${s.accent || 'text-white'}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
