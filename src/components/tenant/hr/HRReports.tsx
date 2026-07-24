import React, { useState, useMemo } from "react";
import {
  BarChart3,
  Printer,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  Briefcase,
  DollarSign,
  Clock,
  UserPlus,
  UserMinus,
  CheckCircle2,
} from "lucide-react";
import { useSaaS } from "../../../context/SaaSContext";
import { useToast } from "../../ui/Toast";

interface HRReportsProps {
  activeSubTab: string;
}

type ReportType = "attendance" | "payroll" | "turnover";

const REPORT_TABS: { key: ReportType; label: string }[] = [
  { key: "attendance", label: "Rekap Kehadiran" },
  { key: "payroll", label: "Rekap Payroll" },
  { key: "turnover", label: "Turnover Report" },
];

export const HRReports: React.FC<HRReportsProps> = ({ activeSubTab }) => {
  const { employees, payroll, scopedCommissions, currentUser } = useSaaS();
  const { showToast } = useToast();

  const [reportType, setReportType] = useState<ReportType>("attendance");
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [turnoverFrom, setTurnoverFrom] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [turnoverTo, setTurnoverTo] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  if (activeSubTab !== "reports") return null;

  const tenantEmployees = employees.filter(
    (e) => e.tenantId === currentUser?.tenantId,
  );

  // ──────────────────────────────────────────
  // ATTENDANCE REPORT
  // ──────────────────────────────────────────

  const attendanceData = useMemo(() => {
    if (reportType !== "attendance") return [];
    const [yStr, mStr] = filterMonth.split("-");
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);

    return tenantEmployees.map((emp) => {
      const monthAttendances = (emp.attendanceHistory || []).filter((a) => {
        const d = new Date(a.date);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      });

      const totalHadir = monthAttendances.filter(
        (a) => a.status === "PRESENT",
      ).length;
      const totalTerlambat = monthAttendances.filter(
        (a) => a.status === "LATE",
      ).length;
      const totalAlpha = monthAttendances.filter(
        (a) => a.status === "ABSENT",
      ).length;
      const approvedLeaves = (emp.leaves || []).filter((l) => {
        if (l.status !== "APPROVED") return false;
        const ld = new Date(l.start);
        return ld.getFullYear() === year && ld.getMonth() + 1 === month;
      }).length;
      const totalCuti = approvedLeaves;
      const totalJamKerja = monthAttendances.reduce(
        (s, a) => s + (a.workHours || 0),
        0,
      );

      return {
        id: emp.id,
        name: emp.name,
        position: emp.position,
        totalHadir,
        totalTerlambat,
        totalAlpha,
        totalCuti,
        totalJamKerja: Math.round(totalJamKerja * 100) / 100,
        maxDays: Math.max(totalHadir + totalTerlambat + totalAlpha, 1),
      };
    });
  }, [tenantEmployees, filterMonth, reportType]);

  const attendanceKpis = useMemo(() => {
    const totalEmp = attendanceData.length;
    const avgHadir =
      totalEmp > 0
        ? Math.round(
            attendanceData.reduce((s, e) => s + e.totalHadir, 0) / totalEmp,
          )
        : 0;
    const avgTerlambat =
      totalEmp > 0
        ? Math.round(
            (attendanceData.reduce((s, e) => s + e.totalTerlambat, 0) /
              totalEmp) *
              10,
          ) / 10
        : 0;
    const totalJam =
      Math.round(
        attendanceData.reduce((s, e) => s + e.totalJamKerja, 0) * 100,
      ) / 100;
    const totalAlpha = attendanceData.reduce((s, e) => s + e.totalAlpha, 0);
    return { totalEmp, avgHadir, avgTerlambat, totalJam, totalAlpha };
  }, [attendanceData]);

  // ──────────────────────────────────────────
  // PAYROLL REPORT
  // ──────────────────────────────────────────

  const payrollData = useMemo(() => {
    if (reportType !== "payroll") return [];
    const monthPayroll = payroll.filter(
      (p) => p.tenantId === currentUser?.tenantId && p.monthYear === filterMonth,
    );

    return monthPayroll.map((p) => {
      const emp = tenantEmployees.find((e) => e.id === p.employeeId);
      return {
        ...p,
        empName: emp?.name || p.employeeId,
        empPosition: emp?.position || "-",
      };
    });
  }, [payroll, tenantEmployees, filterMonth, reportType, currentUser?.tenantId]);

  const payrollKpis = useMemo(() => {
    const totalGaji = payrollData.reduce((s, p) => s + p.netSalary, 0);
    const totalKomisi = payrollData.reduce((s, p) => s + p.commissions, 0);
    const totalPotongan = payrollData.reduce(
      (s, p) =>
        s + p.bpjsKesehatan + p.bpjsKetenagakerjaan + p.pph21 + p.deductions + p.kasbonDeduction,
      0,
    );
    const totalBruto = payrollData.reduce(
      (s, p) =>
        s +
        p.basicSalary +
        p.commissions +
        p.allowances +
        p.overtimePay +
        p.thrAmount,
      0,
    );
    return { totalGaji, totalKomisi, totalPotongan, totalBruto };
  }, [payrollData]);

  // ──────────────────────────────────────────
  // TURNOVER REPORT
  // ──────────────────────────────────────────

  const turnoverData = useMemo(() => {
    if (reportType !== "turnover") return null;
    const fromDate = new Date(turnoverFrom + "-01");
    const toDate = new Date(turnoverTo + "-28");
    toDate.setMonth(toDate.getMonth() + 1);
    toDate.setDate(0);

    const newJoins = tenantEmployees.filter((emp) => {
      if (!emp.joinDate) return false;
      const jd = new Date(emp.joinDate);
      return jd >= fromDate && jd <= toDate;
    });

    const leftEmployees = tenantEmployees.filter((emp) => {
      if (
        (emp.status === "RESIGNED" || emp.status === "TERMINATED") &&
        emp.resignedAt
      ) {
        const rd = new Date(emp.resignedAt);
        return rd >= fromDate && rd <= toDate;
      }
      if (emp.leaves) {
        for (const l of emp.leaves) {
          if (l.status === "APPROVED") {
            const ld = new Date(l.end);
            if (ld >= fromDate && ld <= toDate) return false;
          }
        }
      }
      return false;
    });

    const activeNow = tenantEmployees.filter(
      (e) => !e.status || e.status === "ACTIVE" || e.status === "ON_LEAVE",
    ).length;
    const resignedNow = tenantEmployees.filter(
      (e) => e.status === "RESIGNED",
    ).length;
    const terminatedNow = tenantEmployees.filter(
      (e) => e.status === "TERMINATED",
    ).length;

    return {
      newJoins,
      leftEmployees,
      activeCount: activeNow,
      resignedCount: resignedNow,
      terminatedCount: terminatedNow,
      turnoverRate:
        activeNow + leftEmployees.length > 0
          ? Math.round(
              (leftEmployees.length /
                (activeNow + leftEmployees.length)) *
                1000,
            ) / 10
          : 0,
    };
  }, [tenantEmployees, turnoverFrom, turnoverTo, reportType]);

  // ──────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────

  const fmtCurrency = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
  const fmtMonthLabel = (ym: string) => {
    const [y, m] = ym.split("-");
    const date = new Date(parseInt(y), parseInt(m) - 1);
    return date.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6 animate-fadeIn dark:text-zinc-300 dark:[&_.bg-white]:bg-zinc-950 dark:[&_.bg-slate-50]:bg-zinc-900 dark:[&_.border-slate-100]:border-zinc-800 dark:[&_.border-slate-200]:border-zinc-800 dark:[&_.text-slate-900]:text-zinc-100 dark:[&_.text-slate-800]:text-zinc-100 dark:[&_.text-slate-700]:text-zinc-200 dark:[&_.text-slate-600]:text-zinc-300 dark:[&_.text-slate-500]:text-zinc-400 dark:[&_.text-slate-400]:text-zinc-500 dark:[&_input]:bg-zinc-900 dark:[&_input]:text-zinc-100 dark:[&_select]:bg-zinc-900 dark:[&_select]:text-zinc-100 dark:[&_tr:hover]:bg-zinc-900 print:space-y-4 print:p-0">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm print:rounded-none print:border-0 print:p-2 print:shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                Laporan HR
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {fmtMonthLabel(filterMonth)} &middot; Ringkasan data karyawan
              </p>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer print:hidden"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="flex flex-wrap gap-2 print:gap-1 print:hidden">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setReportType(tab.key)}
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-full border cursor-pointer transition-all ${
              reportType === tab.key
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════
          ATTENDANCE REPORT
          ═══════════════════════════════════════ */}
      {reportType === "attendance" && (
        <div className="space-y-5 print:space-y-3">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:gap-2">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 print:p-2 print:shadow-none">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Total Karyawan
              </p>
              <p className="text-lg font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
                {attendanceKpis.totalEmp}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 print:p-2 print:shadow-none">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Rata-rata Hadir
              </p>
              <p className="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                {attendanceKpis.avgHadir} <span className="text-xs font-medium text-slate-400">hari</span>
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 print:p-2 print:shadow-none">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Rata-rata Terlambat
              </p>
              <p className="text-lg font-extrabold font-mono text-amber-600 dark:text-amber-400">
                {attendanceKpis.avgTerlambat} <span className="text-xs font-medium text-slate-400">hari</span>
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 print:p-2 print:shadow-none">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Total Jam Kerja
              </p>
              <p className="text-lg font-extrabold font-mono text-blue-600 dark:text-blue-400">
                {attendanceKpis.totalJam.toLocaleString("id-ID")} <span className="text-xs font-medium text-slate-400">jam</span>
              </p>
            </div>
          </div>

          {/* Period Filter */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm print:shadow-none print:border-0 print:p-0 print:hidden">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                Periode
              </div>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Attendance Table with Bar Chart */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden print:shadow-none print:rounded-none">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 dark:bg-zinc-900 dark:border-zinc-800 flex justify-between items-center print:bg-transparent print:border-b-black/20">
              <h4 className="font-bold text-xs text-slate-800 dark:text-zinc-100 uppercase tracking-wider">
                Rekap Kehadiran per Karyawan
              </h4>
              <span className="text-[10px] font-mono text-slate-400">
                {attendanceData.length} karyawan
              </span>
            </div>
            {attendanceData.length === 0 ? (
              <div className="p-10 text-center">
                <Users className="w-8 h-8 text-slate-300 dark:text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-slate-400 dark:text-zinc-500 font-semibold">
                  Belum ada data kehadiran untuk periode ini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-mono dark:bg-zinc-900 dark:text-zinc-500">
                    <tr>
                      <th className="px-3 py-2.5">Karyawan</th>
                      <th className="px-3 py-2.5 text-center">Hadir</th>
                      <th className="px-3 py-2.5 text-center">Terlambat</th>
                      <th className="px-3 py-2.5 text-center">Alpha</th>
                      <th className="px-3 py-2.5 text-center">Cuti</th>
                      <th className="px-3 py-2.5 text-center">Jam Kerja</th>
                      <th className="px-3 py-2.5 min-w-[180px]">Komposisi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {attendanceData.map((row) => {
                      const total =
                        row.totalHadir +
                        row.totalTerlambat +
                        row.totalAlpha +
                        row.totalCuti;
                      const maxVal = Math.max(total, 1);
                      return (
                        <tr
                          key={row.id}
                          className="hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors"
                        >
                          <td className="px-3 py-2.5">
                            <p className="font-semibold text-slate-700 dark:text-zinc-200">
                              {row.name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {row.position}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {row.totalHadir}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-amber-600 dark:text-amber-400">
                            {row.totalTerlambat}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                            {row.totalAlpha}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                            {row.totalCuti}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-700 dark:text-zinc-200">
                            {row.totalJamKerja.toFixed(1)}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-zinc-800 gap-px">
                              {row.totalHadir > 0 && (
                                <div
                                  className="bg-emerald-500 transition-all"
                                  style={{
                                    width: `${(row.totalHadir / maxVal) * 100}%`,
                                  }}
                                  title={`Hadir: ${row.totalHadir}`}
                                />
                              )}
                              {row.totalTerlambat > 0 && (
                                <div
                                  className="bg-amber-400 transition-all"
                                  style={{
                                    width: `${(row.totalTerlambat / maxVal) * 100}%`,
                                  }}
                                  title={`Terlambat: ${row.totalTerlambat}`}
                                />
                              )}
                              {row.totalAlpha > 0 && (
                                <div
                                  className="bg-rose-400 transition-all"
                                  style={{
                                    width: `${(row.totalAlpha / maxVal) * 100}%`,
                                  }}
                                  title={`Alpha: ${row.totalAlpha}`}
                                />
                              )}
                              {row.totalCuti > 0 && (
                                <div
                                  className="bg-blue-400 transition-all"
                                  style={{
                                    width: `${(row.totalCuti / maxVal) * 100}%`,
                                  }}
                                  title={`Cuti: ${row.totalCuti}`}
                                />
                              )}
                            </div>
                            <div className="flex gap-2 mt-1 text-[8px] text-slate-400">
                              <span className="flex items-center gap-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Hadir
                              </span>
                              <span className="flex items-center gap-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                Telat
                              </span>
                              <span className="flex items-center gap-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                Alpha
                              </span>
                              <span className="flex items-center gap-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                Cuti
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          PAYROLL REPORT
          ═══════════════════════════════════════ */}
      {reportType === "payroll" && (
        <div className="space-y-5 print:space-y-3">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:gap-2">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 print:p-2 print:shadow-none">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Total Gaji Dibayar
              </p>
              <p className="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                {fmtCurrency(payrollKpis.totalGaji)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 print:p-2 print:shadow-none">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Total Komisi
              </p>
              <p className="text-lg font-extrabold font-mono text-blue-600 dark:text-blue-400">
                {fmtCurrency(payrollKpis.totalKomisi)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 print:p-2 print:shadow-none">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Total Potongan
              </p>
              <p className="text-lg font-extrabold font-mono text-rose-600 dark:text-rose-400">
                {fmtCurrency(payrollKpis.totalPotongan)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 print:p-2 print:shadow-none">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Total Bruto
              </p>
              <p className="text-lg font-extrabold font-mono text-slate-700 dark:text-zinc-200">
                {fmtCurrency(payrollKpis.totalBruto)}
              </p>
            </div>
          </div>

          {/* Period Filter */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm print:shadow-none print:border-0 print:p-0 print:hidden">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                Periode
              </div>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Payroll Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden print:shadow-none print:rounded-none">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 dark:bg-zinc-900 dark:border-zinc-800 flex justify-between items-center print:bg-transparent print:border-b-black/20">
              <h4 className="font-bold text-xs text-slate-800 dark:text-zinc-100 uppercase tracking-wider">
                Detail Payroll &mdash; {fmtMonthLabel(filterMonth)}
              </h4>
              <span className="text-[10px] font-mono text-slate-400">
                {payrollData.length} slip gaji
              </span>
            </div>
            {payrollData.length === 0 ? (
              <div className="p-10 text-center">
                <DollarSign className="w-8 h-8 text-slate-300 dark:text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-slate-400 dark:text-zinc-500 font-semibold">
                  Belum ada data payroll untuk periode ini.
                </p>
                <p className="text-[10px] text-slate-300 dark:text-zinc-600 mt-1">
                  Jalankan proses payroll terlebih dahulu di modul Payroll.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-mono dark:bg-zinc-900 dark:text-zinc-500">
                    <tr>
                      <th className="px-3 py-2.5">Karyawan</th>
                      <th className="px-3 py-2.5 text-right">Gaji Pokok</th>
                      <th className="px-3 py-2.5 text-right">Komisi</th>
                      <th className="px-3 py-2.5 text-right">Tunjangan</th>
                      <th className="px-3 py-2.5 text-right">Lembur</th>
                      <th className="px-3 py-2.5 text-right">Potongan</th>
                      <th className="px-3 py-2.5 text-right font-bold">Gaji Bersih</th>
                      <th className="px-3 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {payrollData.map((row) => {
                      const totalDeductions =
                        row.bpjsKesehatan +
                        row.bpjsKetenagakerjaan +
                        row.pph21 +
                        row.deductions +
                        row.kasbonDeduction;
                      return (
                        <tr
                          key={row.id}
                          className="hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors"
                        >
                          <td className="px-3 py-2.5">
                            <p className="font-semibold text-slate-700 dark:text-zinc-200">
                              {row.empName}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {row.empPosition}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-600 dark:text-zinc-300">
                            {fmtCurrency(row.basicSalary)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-blue-600 dark:text-blue-400">
                            {fmtCurrency(row.commissions)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-600 dark:text-zinc-300">
                            {fmtCurrency(row.allowances)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-indigo-600 dark:text-indigo-400">
                            {fmtCurrency(row.overtimePay)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-rose-600 dark:text-rose-400">
                            {fmtCurrency(totalDeductions)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            {fmtCurrency(row.netSalary)}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                row.status === "PAID"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                              }`}
                            >
                              {row.status === "PAID" ? "DIBAYAR" : "DRAFT"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800">
                    <tr className="font-bold">
                      <td className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-slate-500">
                        Total
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[10px] text-slate-600">
                        {fmtCurrency(payrollData.reduce((s, r) => s + r.basicSalary, 0))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[10px] text-blue-600">
                        {fmtCurrency(payrollData.reduce((s, r) => s + r.commissions, 0))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[10px] text-slate-600">
                        {fmtCurrency(payrollData.reduce((s, r) => s + r.allowances, 0))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[10px] text-indigo-600">
                        {fmtCurrency(payrollData.reduce((s, r) => s + r.overtimePay, 0))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[10px] text-rose-600">
                        {fmtCurrency(payrollData.reduce(
                          (s, r) =>
                            s + r.bpjsKesehatan + r.bpjsKetenagakerjaan + r.pph21 + r.deductions + r.kasbonDeduction,
                          0,
                        ))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[10px] text-emerald-700 font-extrabold">
                        {fmtCurrency(payrollData.reduce((s, r) => s + r.netSalary, 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          TURNOVER REPORT
          ═══════════════════════════════════════ */}
      {reportType === "turnover" && turnoverData && (
        <div className="space-y-5 print:space-y-3">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:gap-2">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 print:p-2 print:shadow-none">
              <div className="flex items-center gap-2 mb-1">
                <UserPlus className="w-4 h-4 text-emerald-500" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Karyawan Baru
                </p>
              </div>
              <p className="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                {turnoverData.newJoins.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 print:p-2 print:shadow-none">
              <div className="flex items-center gap-2 mb-1">
                <UserMinus className="w-4 h-4 text-rose-500" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Keluar / Resign
                </p>
              </div>
              <p className="text-lg font-extrabold font-mono text-rose-600 dark:text-rose-400">
                {turnoverData.leftEmployees.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 print:p-2 print:shadow-none">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-500" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total Aktif
                </p>
              </div>
              <p className="text-lg font-extrabold font-mono text-blue-600 dark:text-blue-400">
                {turnoverData.activeCount}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 print:p-2 print:shadow-none">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-amber-500" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Turnover Rate
                </p>
              </div>
              <p className="text-lg font-extrabold font-mono text-amber-600 dark:text-amber-400">
                {turnoverData.turnoverRate}%
              </p>
            </div>
          </div>

          {/* Period Filters */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm print:shadow-none print:border-0 print:p-0 print:hidden">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                Periode
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-400">
                  Dari
                </label>
                <input
                  type="month"
                  value={turnoverFrom}
                  onChange={(e) => setTurnoverFrom(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-400">
                  Sampai
                </label>
                <input
                  type="month"
                  value={turnoverTo}
                  onChange={(e) => setTurnoverTo(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
                />
              </div>
            </div>
          </div>

          {/* New Joins */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden print:shadow-none print:rounded-none">
            <div className="px-4 py-3 border-b border-slate-100 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-zinc-800 flex items-center gap-2 print:bg-transparent print:border-b-black/20">
              <UserPlus className="w-4 h-4 text-emerald-500" />
              <h4 className="font-bold text-xs text-slate-800 dark:text-zinc-100 uppercase tracking-wider">
                Karyawan Baru Masuk
              </h4>
              <span className="ml-auto text-[10px] font-mono text-slate-400">
                {turnoverData.newJoins.length} orang
              </span>
            </div>
            {turnoverData.newJoins.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-slate-400 dark:text-zinc-500">
                  Tidak ada karyawan baru di periode ini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-mono dark:bg-zinc-900 dark:text-zinc-500">
                    <tr>
                      <th className="px-3 py-2.5">Nama</th>
                      <th className="px-3 py-2.5">Jabatan</th>
                      <th className="px-3 py-2.5">Status Kontrak</th>
                      <th className="px-3 py-2.5">Tanggal Gabung</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {turnoverData.newJoins.map((emp) => (
                      <tr
                        key={emp.id}
                        className="hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors"
                      >
                        <td className="px-3 py-2.5 font-semibold text-slate-700 dark:text-zinc-200">
                          {emp.name}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-zinc-300">
                          {emp.position}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              emp.contractStatus === "PERMANENT"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : emp.contractStatus === "CONTRACT"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                            }`}
                          >
                            {emp.contractStatus}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-500">
                          {emp.joinDate
                            ? new Date(emp.joinDate).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Left Employees */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden print:shadow-none print:rounded-none">
            <div className="px-4 py-3 border-b border-slate-100 bg-rose-50/50 dark:bg-rose-950/20 dark:border-zinc-800 flex items-center gap-2 print:bg-transparent print:border-b-black/20">
              <UserMinus className="w-4 h-4 text-rose-500" />
              <h4 className="font-bold text-xs text-slate-800 dark:text-zinc-100 uppercase tracking-wider">
                Karyawan Keluar
              </h4>
              <span className="ml-auto text-[10px] font-mono text-slate-400">
                {turnoverData.leftEmployees.length} orang
              </span>
            </div>
            {turnoverData.leftEmployees.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-slate-400 dark:text-zinc-500">
                  Tidak ada karyawan yang keluar di periode ini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-mono dark:bg-zinc-900 dark:text-zinc-500">
                    <tr>
                      <th className="px-3 py-2.5">Nama</th>
                      <th className="px-3 py-2.5">Jabatan</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Tanggal Keluar</th>
                      <th className="px-3 py-2.5">Alasan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {turnoverData.leftEmployees.map((emp) => (
                      <tr
                        key={emp.id}
                        className="hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors"
                      >
                        <td className="px-3 py-2.5 font-semibold text-slate-700 dark:text-zinc-200">
                          {emp.name}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-zinc-300">
                          {emp.position}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              emp.status === "RESIGNED"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                            }`}
                          >
                            {emp.status === "RESIGNED" ? "RESIGN" : "TERMINATED"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-500">
                          {emp.resignedAt
                            ? new Date(emp.resignedAt).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 max-w-[200px] truncate">
                          {emp.exitInterviewNotes || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 print:shadow-none print:rounded-none">
            <h4 className="font-bold text-xs text-slate-800 dark:text-zinc-100 uppercase tracking-wider mb-3">
              Ringkasan Status Karyawan
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2 p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg dark:bg-emerald-950/20 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <div>
                  <p className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                    Aktif
                  </p>
                  <p className="text-lg font-extrabold font-mono text-emerald-700 dark:text-emerald-300">
                    {turnoverData.activeCount}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-amber-50/50 border border-amber-200 rounded-lg dark:bg-amber-950/20 dark:border-amber-800">
                <TrendingDown className="w-4 h-4 text-amber-500" />
                <div>
                  <p className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
                    Resign
                  </p>
                  <p className="text-lg font-extrabold font-mono text-amber-700 dark:text-amber-300">
                    {turnoverData.resignedCount}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-rose-50/50 border border-rose-200 rounded-lg dark:bg-rose-950/20 dark:border-rose-800">
                <UserMinus className="w-4 h-4 text-rose-500" />
                <div>
                  <p className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400">
                    Terminated
                  </p>
                  <p className="text-lg font-extrabold font-mono text-rose-700 dark:text-rose-300">
                    {turnoverData.terminatedCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
