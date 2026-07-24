import React, { useState } from "react";
import { useSaaS } from "../../../context/SaaSContext";
import { useToast } from "../../ui/Toast";
import { Download, FileSpreadsheet, Table } from "lucide-react";

interface AttendanceExportProps {
  activeSubTab: string;
}

interface AttendanceRecord {
  employeeName: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
  workHours: number;
}

export const AttendanceExport: React.FC<AttendanceExportProps> = ({
  activeSubTab,
}) => {
  const { employees, currentUser } = useSaaS();
  const { showToast } = useToast();

  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [filterEmployee, setFilterEmployee] = useState<string>("");

  if (activeSubTab !== "export-attendance") return null;

  const tenantEmployees = employees.filter(
    (e) =>
      e.tenantId === currentUser?.tenantId &&
      e.status !== "RESIGNED" &&
      e.status !== "TERMINATED",
  );

  const allRecords: AttendanceRecord[] = [];
  for (const emp of tenantEmployees) {
    if (!emp.attendanceHistory) continue;
    for (const att of emp.attendanceHistory) {
      const attMonth = att.date.substring(0, 7);
      if (filterMonth && attMonth !== filterMonth) continue;
      if (filterEmployee && emp.id !== filterEmployee) continue;
      allRecords.push({
        employeeName: emp.name,
        employeeId: emp.id,
        date: att.date,
        checkIn: att.checkIn || "-",
        checkOut: att.checkOut || "-",
        status: att.status,
        workHours: att.workHours || 0,
      });
    }
  }

  const sortedRecords = allRecords.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const dates = sortedRecords.map((r) => r.date).filter(Boolean);
  const dateRange =
    dates.length > 0
      ? `${new Date(dates[dates.length - 1]).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })} — ${new Date(dates[0]).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}`
      : "-";

  const totalWorkHours = sortedRecords.reduce((sum, r) => sum + r.workHours, 0);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PRESENT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
      LATE: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
      ABSENT: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
      LEAVE: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    };
    const label: Record<string, string> = {
      PRESENT: "Hadir",
      LATE: "Terlambat",
      ABSENT: "Alpha",
      LEAVE: "Cuti",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${map[status] || "bg-slate-100 text-slate-600"}`}
      >
        {label[status] || status}
      </span>
    );
  };

  const downloadCsv = (csvContent: string, filename: string) => {
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    if (sortedRecords.length === 0) {
      showToast("Tidak ada data untuk diekspor", "warning");
      return;
    }
    const sep = ";";
    const header = ["Nama", "Tanggal", "Check-In", "Check-Out", "Status", "Jam Kerja"];
    const rows = sortedRecords.map((r) => [
      r.employeeName,
      new Date(r.date).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      r.checkIn,
      r.checkOut,
      r.status,
      r.workHours.toFixed(1),
    ]);
    const csv = [header.join(sep), ...rows.map((r) => r.join(sep))].join("\n");
    downloadCsv(csv, `absensi-detail-${filterMonth}.csv`);
    showToast("Berhasil mengekspor data absensi detail", "success");
  };

  const handleExportRekap = () => {
    if (sortedRecords.length === 0) {
      showToast("Tidak ada data untuk diekspor", "warning");
      return;
    }
    const sep = ";";
    const summaryMap: Record<
      string,
      {
        hadir: number;
        terlambat: number;
        alpha: number;
        cuti: number;
        totalJam: number;
      }
    > = {};
    for (const r of sortedRecords) {
      if (!summaryMap[r.employeeName]) {
        summaryMap[r.employeeName] = {
          hadir: 0,
          terlambat: 0,
          alpha: 0,
          cuti: 0,
          totalJam: 0,
        };
      }
      const s = summaryMap[r.employeeName];
      if (r.status === "PRESENT") s.hadir++;
      else if (r.status === "LATE") s.terlambat++;
      else if (r.status === "ABSENT") s.alpha++;
      else if (r.status === "LEAVE") s.cuti++;
      s.totalJam += r.workHours;
    }
    const header = [
      "Nama",
      "Total Hadir",
      "Total Terlambat",
      "Total Alpha",
      "Total Cuti",
      "Total Jam Kerja",
    ];
    const rows = Object.entries(summaryMap).map(([name, s]) => [
      name,
      String(s.hadir),
      String(s.terlambat),
      String(s.alpha),
      String(s.cuti),
      s.totalJam.toFixed(1),
    ]);
    const csv = [header.join(sep), ...rows.map((r) => r.join(sep))].join("\n");
    downloadCsv(csv, `rekap-absensi-${filterMonth}.csv`);
    showToast("Berhasil mengekspor rekap bulanan absensi", "success");
  };

  return (
    <div className="space-y-6 animate-fadeIn dark:text-zinc-300">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 dark:bg-zinc-950 dark:border-zinc-800">
        <div className="flex items-center gap-3 mb-6">
          <Download className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-zinc-100">
              Export Data Absensi
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">
              Ekspor data kehadiran karyawan ke format CSV untuk keperluan pelaporan.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 dark:bg-zinc-900 dark:border-zinc-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Total Record
            </span>
            <p className="text-2xl font-extrabold font-mono text-slate-800 dark:text-zinc-100 mt-1">
              {sortedRecords.length}
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 dark:bg-zinc-900 dark:border-zinc-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Rentang Tanggal
            </span>
            <p className="text-sm font-bold font-mono text-slate-800 dark:text-zinc-100 mt-1">
              {dateRange}
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 dark:bg-zinc-900 dark:border-zinc-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Total Jam Kerja
            </span>
            <p className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {totalWorkHours.toFixed(1)}{" "}
              <span className="text-sm font-medium text-slate-400 dark:text-zinc-500">
                jam
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center mb-6">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
              Periode
            </label>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
              Karyawan
            </label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
            >
              <option value="">Semua Karyawan</option>
              {tenantEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={handleExportCsv}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handleExportRekap}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Table className="w-4 h-4" />
            Export Rekap Bulanan
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden dark:bg-zinc-950 dark:border-zinc-800">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 dark:bg-zinc-900 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="font-bold text-xs text-slate-800 dark:text-zinc-100 uppercase tracking-wider">
            Preview Data Absensi
          </h3>
          <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
            {sortedRecords.length} record
          </span>
        </div>

        {sortedRecords.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet className="w-10 h-10 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-xs text-slate-400 dark:text-zinc-500 font-semibold">
              Belum ada data absensi untuk periode ini.
            </p>
            <p className="text-[10px] text-slate-300 dark:text-zinc-600 mt-1">
              Data kehadiran akan muncul setelah karyawan melakukan absensi harian.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-mono dark:bg-zinc-900 dark:text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Check-In</th>
                  <th className="px-4 py-3">Check-Out</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Jam Kerja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {sortedRecords.map((r, idx) => (
                  <tr key={`${r.employeeId}-${r.date}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-zinc-200">
                      {r.employeeName}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 dark:text-zinc-400">
                      {new Date(r.date).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-zinc-300">
                      {r.checkIn}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-zinc-300">
                      {r.checkOut}
                    </td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-700 dark:text-zinc-200">
                      {r.workHours.toFixed(1)} jam
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
