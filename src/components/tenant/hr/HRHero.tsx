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
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${meta.gradient} p-3 shadow-md shadow-slate-900/10`}
    >
      <div
        className={`pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full ${meta.glow} blur-2xl`}
      />
      <div className="relative flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20 backdrop-blur">
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold tracking-tight text-white leading-tight">
            {meta.title}
          </h3>
          <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-white ring-1 ring-white/15">
            <Clock className="h-2.5 w-2.5" />
            {new Date().toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      <div className="relative mt-2.5 grid grid-cols-2 gap-1.5 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg bg-white/5 p-2 ring-1 ring-white/10 backdrop-blur"
          >
            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
              {s.label}
            </p>
            <p className={`mt-0.5 text-sm font-black leading-tight ${s.accent || 'text-white'}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
