import * as React from "react";
import { useState, useMemo } from "react";
import {
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Clock,
  Filter,
  Calendar,
  Save,
} from "lucide-react";
import { useSaaS } from "../../../context/SaaSContext";
import { useToast } from "../../ui/Toast";
import { Employee } from "../../../types";

interface ContractTrackerProps {
  activeSubTab: string;
}

function calcMasaKerja(joinDate?: string): string {
  if (!joinDate) return "-";
  const start = new Date(joinDate);
  const now = new Date();
  if (isNaN(start.getTime())) return "-";
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  if (days < 0) {
    months--;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years < 0) return "-";
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} thn`);
  if (months > 0) parts.push(`${months} bln`);
  if (days > 0) parts.push(`${days} hari`);
  return parts.length > 0 ? parts.join(" ") : "0 hari";
}

function calcSisaHari(endDate?: string): number | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  if (isNaN(end.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function fmtDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_BADGE: Record<Employee["contractStatus"], { label: string; cls: string }> = {
  PERMANENT: { label: "PERMANENT", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  CONTRACT: { label: "KONTRAK", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  INTERN: { label: "INTERN", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
};

export const ContractTracker: React.FC<ContractTrackerProps> = ({ activeSubTab }) => {
  const { employees, updateEmployee } = useSaaS();
  const { showToast } = useToast();

  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [extendEmpId, setExtendEmpId] = useState<string | null>(null);
  const [extendEndDate, setExtendEndDate] = useState("");

  const activeEmployees = useMemo(
    () => employees.filter((e) => !e.status || e.status === "ACTIVE"),
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    if (filterStatus === "ALL") return activeEmployees;
    return activeEmployees.filter((e) => e.contractStatus === filterStatus);
  }, [activeEmployees, filterStatus]);

  const kpis = useMemo(() => {
    let urgent = 0;
    let warning = 0;
    let permanent = 0;
    for (const emp of activeEmployees) {
      if (emp.contractStatus === "PERMANENT") permanent++;
      if (emp.contractStatus === "CONTRACT" || emp.contractStatus === "INTERN") {
        const sisa = calcSisaHari(emp.contractEndDate);
        if (sisa !== null) {
          if (sisa <= 30) urgent++;
          else if (sisa <= 90) warning++;
        }
      }
    }
    return { total: activeEmployees.length, urgent, warning, permanent };
  }, [activeEmployees]);

  const contractHistory = useMemo(() => {
    const rows: { empName: string; empId: string; status: string; start: string; end: string }[] = [];
    for (const emp of activeEmployees) {
      if (emp.contractStartDate || emp.contractEndDate) {
        rows.push({
          empName: emp.name,
          empId: emp.id,
          status: emp.contractStatus,
          start: emp.contractStartDate || "",
          end: emp.contractEndDate || "",
        });
      }
    }
    return rows;
  }, [activeEmployees]);

  const handleExtend = (empId: string) => {
    if (!extendEndDate) {
      showToast("Pilih tanggal berakhir baru terlebih dahulu.", "warning");
      return;
    }
    const emp = activeEmployees.find((e) => e.id === empId);
    if (!emp) return;
    updateEmployee(empId, {
      contractEndDate: extendEndDate,
      contractStartDate: emp.contractEndDate || emp.contractStartDate,
    });
    showToast(`Kontrak ${emp.name} berhasil diperpanjang hingga ${fmtDate(extendEndDate)}.`, "success");
    setExtendEmpId(null);
    setExtendEndDate("");
  };

  if (activeSubTab !== "contracts") return null;

  return (
    <div className="space-y-6 dark:text-zinc-300 dark:[&_.bg-white]:bg-zinc-950 dark:[&_.bg-slate-50]:bg-zinc-900 dark:[&_.border-slate-100]:border-zinc-800 dark:[&_.border-slate-200]:border-zinc-800 dark:[&_.text-slate-900]:text-zinc-100 dark:[&_.text-slate-800]:text-zinc-100 dark:[&_.text-slate-700]:text-zinc-200 dark:[&_.text-slate-600]:text-zinc-300 dark:[&_tr:hover]:bg-zinc-900">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Briefcase className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-bold text-lg text-slate-900">Pelacakan Kontrak Karyawan</h3>
            <p className="text-xs text-slate-500 mt-0.5">Monitor masa berlaku kontrak dan masa kerja seluruh karyawan aktif.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Total Karyawan Aktif</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{kpis.total}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-[10px] font-mono uppercase text-red-400 tracking-wider">Berakhir &lt;30 Hari</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{kpis.urgent}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-mono uppercase text-amber-400 tracking-wider">Berakhir &lt;90 Hari</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{kpis.warning}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-mono uppercase text-emerald-400 tracking-wider">PERMANENT</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{kpis.permanent}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter Status:</span>
          {(["ALL", "PERMANENT", "CONTRACT", "INTERN"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border cursor-pointer transition-all ${
                filterStatus === s
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-500 border-slate-200 hover:border-blue-300"
              }`}
            >
              {s === "ALL" ? "Semua" : s}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                {["Nama", "Jabatan", "Status Kontrak", "Tanggal Mulai", "Tanggal Berakhir", "Masa Kerja", "Sisa Hari", "Aksi"].map((h) => (
                  <th key={h} className={`py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider ${h === "Aksi" ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                    Tidak ada data kontrak ditemukan.
                  </td>
                </tr>
              )}
              {filteredEmployees.map((emp) => {
                const sisa = calcSisaHari(emp.contractEndDate);
                const isUrgent = sisa !== null && sisa <= 30 && sisa >= 0;
                const isWarning = sisa !== null && sisa > 30 && sisa <= 90;
                const isExpired = sisa !== null && sisa < 0;
                const rowBg = isUrgent
                  ? "bg-red-50/60 dark:bg-red-950/20"
                  : isWarning
                    ? "bg-amber-50/60 dark:bg-amber-950/20"
                    : "";
                const badge = STATUS_BADGE[emp.contractStatus];
                return (
                  <React.Fragment key={emp.id}>
                    <tr className={`hover:bg-slate-50 ${rowBg}`}>
                      <td className="py-3 px-4 text-xs font-semibold text-slate-700">{emp.name}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{emp.position}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 font-mono">{fmtDate(emp.contractStartDate)}</td>
                      <td className="py-3 px-4 text-xs text-slate-600 font-mono">{fmtDate(emp.contractEndDate)}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{calcMasaKerja(emp.joinDate)}</td>
                      <td className="py-3 px-4 text-xs font-mono font-bold">
                        {sisa === null ? (
                          <span className="text-slate-400">-</span>
                        ) : isExpired ? (
                          <span className="text-red-600">Expired ({Math.abs(sisa)}h lalu)</span>
                        ) : isUrgent ? (
                          <span className="text-red-600">{sisa} hari</span>
                        ) : isWarning ? (
                          <span className="text-amber-600">{sisa} hari</span>
                        ) : (
                          <span className="text-emerald-600">{sisa} hari</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {emp.contractStatus !== "PERMANENT" && (
                          <button
                            onClick={() => {
                              setExtendEmpId(extendEmpId === emp.id ? null : emp.id);
                              setExtendEndDate(emp.contractEndDate || "");
                            }}
                            className="text-blue-600 hover:text-blue-800 text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
                          >
                            {extendEmpId === emp.id ? "Batal" : "Perpanjang"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {extendEmpId === emp.id && (
                      <tr className="bg-blue-50/50 dark:bg-blue-950/20">
                        <td colSpan={8} className="py-3 px-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-xs font-bold text-slate-600">Perpanjang Kontrak {emp.name}:</span>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <input
                                type="date"
                                value={extendEndDate}
                                onChange={(e) => setExtendEndDate(e.target.value)}
                                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <button
                              onClick={() => handleExtend(emp.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer transition-all flex items-center gap-1"
                            >
                              <Save className="w-3 h-3" />
                              Simpan
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" />
          <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
            Registrasi Riwayat Kontrak
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                {["Nama Karyawan", "Status", "Mulai", "Berakhir"].map((h) => (
                  <th key={h} className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contractHistory.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                    Belum ada riwayat kontrak tercatat.
                  </td>
                </tr>
              )}
              {contractHistory.map((row, idx) => {
                const badge = STATUS_BADGE[row.status as Employee["contractStatus"]] || STATUS_BADGE.CONTRACT;
                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-xs font-semibold text-slate-700">{row.empName}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 font-mono">{fmtDate(row.start)}</td>
                    <td className="py-3 px-4 text-xs text-slate-600 font-mono">{fmtDate(row.end)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
