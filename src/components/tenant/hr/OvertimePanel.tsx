import * as React from "react";
import { useState, useMemo } from "react";
import {
  Clock,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Filter,
  Calendar,
  DollarSign,
  Timer,
  AlertCircle,
  ChevronDown,
  Search,
} from "lucide-react";
import { useSaaS } from "../../../context/SaaSContext";
import { useToast } from "../../ui/Toast";
import { useConfirm } from "../../ui/ConfirmDialog";
import { Employee, OvertimeRecord } from "../../../types";

interface OvertimePanelProps {
  activeSubTab: string;
}

const RATE_MULTIPLIER: Record<"1.5X" | "2X", number> = {
  "1.5X": 1.5,
  "2X": 2,
};

export const OvertimePanel: React.FC<OvertimePanelProps> = ({
  activeSubTab,
}) => {
  const { employees, updateEmployee, currentUser } = useSaaS();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [showForm, setShowForm] = useState(false);
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formRate, setFormRate] = useState<"1.5X" | "2X">("1.5X");
  const [formReason, setFormReason] = useState("");

  if (activeSubTab !== "overtime") return null;

  const tenantEmployees = employees.filter(
    (e) =>
      e.tenantId === currentUser?.tenantId &&
      e.status !== "RESIGNED" &&
      e.status !== "TERMINATED",
  );

  interface OvertimeWithEmployee extends OvertimeRecord {
    employeeName: string;
    position: string;
    basicSalary: number;
  }

  const allOvertime = useMemo(() => {
    const records: OvertimeWithEmployee[] = [];
    for (const emp of tenantEmployees) {
      if (!emp.overtimeHistory) continue;
      for (const ot of emp.overtimeHistory) {
        records.push({
          ...ot,
          employeeName: emp.name,
          position: emp.position,
          basicSalary: emp.basicSalary,
        });
      }
    }
    return records;
  }, [tenantEmployees]);

  const filteredOvertime = useMemo(() => {
    return allOvertime
      .filter((ot) => {
        if (filterEmployee && ot.employeeName !== filterEmployee) return false;
        if (filterMonth) {
          const otMonth = ot.date.substring(0, 7);
          if (otMonth !== filterMonth) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allOvertime, filterEmployee, filterMonth]);

  const totalHoursThisMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return allOvertime
      .filter(
        (ot) =>
          ot.date.substring(0, 7) === currentMonth &&
          ot.status !== "REJECTED",
      )
      .reduce((sum, ot) => sum + ot.hours, 0);
  }, [allOvertime]);

  const pendingCount = useMemo(() => {
    return allOvertime.filter((ot) => ot.status === "PENDING").length;
  }, [allOvertime]);

  const totalCostThisMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return allOvertime
      .filter(
        (ot) =>
          ot.date.substring(0, 7) === currentMonth &&
          ot.status === "APPROVED",
      )
      .reduce((sum, ot) => sum + ot.totalAmount, 0);
  }, [allOvertime]);

  const calculatedHours = useMemo(() => {
    if (!formStartTime || !formEndTime) return 0;
    const [sh, sm] = formStartTime.split(":").map(Number);
    const [eh, em] = formEndTime.split(":").map(Number);
    const diff = eh * 60 + em - (sh * 60 + sm);
    return diff > 0 ? Math.round((diff / 60) * 100) / 100 : 0;
  }, [formStartTime, formEndTime]);

  const handleSubmit = async () => {
    if (!formEmployeeId || !formDate || !formStartTime || !formEndTime || !formReason) {
      showToast("Lengkapi semua field yang diperlukan", "error");
      return;
    }
    if (calculatedHours <= 0) {
      showToast("Jam selesai harus lebih besar dari jam mulai", "error");
      return;
    }

    const emp = tenantEmployees.find((e) => e.id === formEmployeeId);
    if (!emp) return;

    const rateMult = RATE_MULTIPLIER[formRate];
    const hourlyRate = emp.basicSalary / 173;
    const totalAmount = Math.round(calculatedHours * hourlyRate * rateMult);

    const newRecord: OvertimeRecord = {
      id: `ot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: formDate,
      startTime: formStartTime,
      endTime: formEndTime,
      hours: calculatedHours,
      rate: formRate,
      reason: formReason,
      status: "PENDING",
      totalAmount,
    };

    const existing = emp.overtimeHistory || [];
    updateEmployee(emp.id, {
      overtimeHistory: [...existing, newRecord],
    });

    showToast("Pengajuan lembur berhasil diajukan", "success");
    setFormEmployeeId("");
    setFormDate("");
    setFormStartTime("");
    setFormEndTime("");
    setFormRate("1.5X");
    setFormReason("");
    setShowForm(false);
  };

  const handleApprove = async (
    empId: string,
    otId: string,
    approved: boolean,
  ) => {
    const ok = await confirm({
      title: approved ? "Setujui Lembur" : "Tolak Lembur",
      message: approved
        ? "Anda yakin akan menyetujui pengajuan lembur ini?"
        : "Anda yakin akan menolak pengajuan lembur ini?",
      confirmLabel: approved ? "Ya, Setujui" : "Tolak",
      type: approved ? "primary" : "danger",
    });
    if (!ok) return;

    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;

    const updated = (emp.overtimeHistory || []).map((ot) =>
      ot.id === otId
        ? {
            ...ot,
            status: (approved ? "APPROVED" : "REJECTED") as "APPROVED" | "REJECTED",
            approvedBy: currentUser?.name || "Admin",
          }
        : ot,
    );
    updateEmployee(empId, { overtimeHistory: updated });
    showToast(
      approved ? "Lembur berhasil disetujui" : "Lembur berhasil ditolak",
      approved ? "success" : "info",
    );
  };

  const formatCurrency = (n: number) =>
    `Rp ${n.toLocaleString("id-ID")}`;

  const uniqueEmployeeNames = [...new Set(tenantEmployees.map((e) => e.name))];

  return (
    <div className="space-y-6 dark:text-zinc-300 dark:[&_.bg-white]:bg-zinc-950 dark:[&_.bg-slate-50]:bg-zinc-900 dark:[&_.border-slate-100]:border-zinc-800 dark:[&_.border-slate-200]:border-zinc-800 dark:[&_.text-slate-900]:text-zinc-100 dark:[&_.text-slate-800]:text-zinc-100 dark:[&_.text-slate-700]:text-zinc-200 dark:[&_.text-slate-600]:text-zinc-300 dark:[&_input]:bg-zinc-950 dark:[&_input]:text-zinc-100 dark:[&_select]:bg-zinc-950 dark:[&_select]:text-zinc-100 dark:[&_tr:hover]:bg-zinc-900">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              Manajemen Lembur Karyawan
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Ajukan, pantau, dan setujui jam lembur karyawan beserta
              perhitungan biaya otomatis.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Ajukan Lembur
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-indigo-50">
              <Timer className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Jam Bulan Ini
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {totalHoursThisMonth.toFixed(1)} <span className="text-sm font-medium text-slate-500">jam</span>
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-50">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pending Approval
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {pendingCount} <span className="text-sm font-medium text-slate-500">pengajuan</span>
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-50">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Biaya Lembur
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(totalCostThisMonth)}
          </p>
        </div>
      </div>

      {/* Form Ajukan Lembur */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h4 className="font-bold text-sm text-slate-900 mb-4">
            Form Pengajuan Lembur Baru
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Karyawan *
              </label>
              <select
                value={formEmployeeId}
                onChange={(e) => setFormEmployeeId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              >
                <option value="">-- Pilih Karyawan --</option>
                {tenantEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} — {emp.position}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Tanggal *
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Jam Mulai *
              </label>
              <input
                type="time"
                value={formStartTime}
                onChange={(e) => setFormStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Jam Selesai *
              </label>
              <input
                type="time"
                value={formEndTime}
                onChange={(e) => setFormEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Tarif Lembur *
              </label>
              <select
                value={formRate}
                onChange={(e) => setFormRate(e.target.value as "1.5X" | "2X")}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              >
                <option value="1.5X">1.5X — Hari Kerja Biasa</option>
                <option value="2X">2X — Hari Libur / Minggu</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Estimasi Jam & Biaya
              </label>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                {calculatedHours > 0 ? (
                  <span className="text-slate-700">
                    <span className="font-bold">{calculatedHours} jam</span>
                    {formEmployeeId && (
                      <span className="text-slate-500">
                        {" "} — {formatCurrency(
                          Math.round(
                            calculatedHours *
                              (tenantEmployees.find((e) => e.id === formEmployeeId)
                                ?.basicSalary || 0) /
                              173 *
                              RATE_MULTIPLIER[formRate],
                          ),
                        )}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-slate-400">Isi jam mulai & selesai</span>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Alasan / Keterangan *
              </label>
              <textarea
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                rows={2}
                placeholder="Contoh: Pengerjaan servis urgent laptop pelanggan..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleSubmit}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Ajukan Lembur
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Filter className="w-4 h-4" />
            Filter
          </div>
          <select
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          >
            <option value="">Semua Karyawan</option>
            {uniqueEmployeeNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
          {(filterEmployee || filterMonth) && (
            <button
              onClick={() => {
                setFilterEmployee("");
                setFilterMonth(
                  () => {
                    const now = new Date();
                    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
                  },
                );
              }}
              className="text-xs font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Overtime Records Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h4 className="font-bold text-sm text-slate-900">
            Daftar Lembur ({filteredOvertime.length} record)
          </h4>
        </div>
        {filteredOvertime.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Belum ada data lembur</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Karyawan
                  </th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Jam
                  </th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Durasi
                  </th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Tarif
                  </th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Alasan
                  </th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Biaya
                  </th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOvertime.map((ot) => (
                  <tr
                    key={ot.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">
                      {new Date(ot.date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm font-bold text-slate-800">
                        {ot.employeeName}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {ot.position}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">
                      {ot.startTime} — {ot.endTime}
                    </td>
                    <td className="py-3 px-4 text-sm font-bold text-slate-700">
                      {ot.hours} jam
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          ot.rate === "2X"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-indigo-100 text-indigo-700"
                        }`}
                      >
                        {ot.rate}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 max-w-[200px] truncate">
                      {ot.reason}
                    </td>
                    <td className="py-3 px-4 text-sm font-bold text-slate-700 whitespace-nowrap">
                      {formatCurrency(ot.totalAmount)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                          ot.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-700"
                            : ot.status === "REJECTED"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {ot.status === "APPROVED"
                          ? "Disetujui"
                          : ot.status === "REJECTED"
                            ? "Ditolak"
                            : "Pending"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {ot.status === "PENDING" && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() =>
                              handleApprove(
                                tenantEmployees.find(
                                  (e) => e.name === ot.employeeName,
                                )?.id || "",
                                ot.id,
                                true,
                              )
                            }
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors cursor-pointer"
                            title="Setujui"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleApprove(
                                tenantEmployees.find(
                                  (e) => e.name === ot.employeeName,
                                )?.id || "",
                                ot.id,
                                false,
                              )
                            }
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                            title="Tolak"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
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
