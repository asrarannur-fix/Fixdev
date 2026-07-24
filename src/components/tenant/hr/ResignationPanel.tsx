import * as React from "react";
import { useState, useMemo } from "react";
import {
  LogOut,
  PlusCircle,
  CheckCircle2,
  XCircle,
  ClipboardList,
  AlertTriangle,
  DollarSign,
  FileText,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import { useSaaS } from "../../../context/SaaSContext";
import { useToast } from "../../ui/Toast";
import { useConfirm } from "../../ui/ConfirmDialog";
import { Employee, Resignation } from "../../../types";

interface ResignationPanelProps {
  activeSubTab: string;
}

const DEFAULT_CLEARANCE_ITEMS = [
  "Return Laptop/Device",
  "Return Uniform",
  "Clear Outstanding Debts",
  "Transfer Knowledge",
  "HR Exit Interview",
  "IT Account Deactivation",
  "Badge/Access Card Return",
];

export const ResignationPanel: React.FC<ResignationPanelProps> = ({
  activeSubTab,
}) => {
  const { employees, updateEmployee, currentUser } = useSaaS();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [showForm, setShowForm] = useState(false);
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formLastWorkingDate, setFormLastWorkingDate] = useState("");
  const [formReason, setFormReason] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  if (activeSubTab !== "resignation") return null;

  const tenantEmployees = employees.filter(
    (e) =>
      e.tenantId === currentUser?.tenantId &&
      e.status !== "RESIGNED" &&
      e.status !== "TERMINATED",
  );

  const activeEmployees = tenantEmployees.filter(
    (e) => e.status === "ACTIVE" || !e.status,
  );

  const allResignations = useMemo(() => {
    const records: (Resignation & { employeeName: string; position: string })[] = [];
    for (const emp of tenantEmployees) {
      if (!emp.resignations) continue;
      for (const r of emp.resignations) {
        records.push({
          ...r,
          employeeName: emp.name,
          position: emp.position,
        });
      }
    }
    return records.sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );
  }, [tenantEmployees]);

  const filteredResignations = useMemo(() => {
    if (filterStatus === "ALL") return allResignations;
    return allResignations.filter((r) => r.status === filterStatus);
  }, [allResignations, filterStatus]);

  const pendingResignations = allResignations.filter(
    (r) => r.status === "PENDING",
  );
  const approvedCount = allResignations.filter(
    (r) => r.status === "APPROVED",
  ).length;
  const rejectedCount = allResignations.filter(
    (r) => r.status === "REJECTED",
  ).length;

  const getEmployeeName = (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    return emp?.name || empId;
  };

  const formatCurrency = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  const calcSettlement = (emp: Employee, lastWorkingDate: string) => {
    const monthlySalary = emp.basicSalary;
    const dailyRate = monthlySalary / 22;
    const lwd = new Date(lastWorkingDate);
    const dayOfMonth = lwd.getDate();
    const proRatedSalary = Math.round((monthlySalary / 30) * dayOfMonth);

    const approvedLeaves = (emp.leaves || []).filter(
      (l) => l.status === "APPROVED",
    );
    let unusedLeaveDays = 12;
    for (const l of approvedLeaves) {
      if (l.type !== "ANNUAL") continue;
      const start = new Date(l.start);
      const end = new Date(l.end);
      const days = Math.round(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;
      unusedLeaveDays -= days;
    }
    if (unusedLeaveDays < 0) unusedLeaveDays = 0;

    const leavePayout = Math.round(dailyRate * unusedLeaveDays);
    return {
      proRatedSalary,
      unusedLeaveDays,
      leavePayout,
      dailyRate: Math.round(dailyRate),
      total: proRatedSalary + leavePayout,
    };
  };

  const handleSubmit = async () => {
    if (!formEmployeeId || !formLastWorkingDate || !formReason) {
      showToast("Lengkapi semua field yang diperlukan", "error");
      return;
    }

    const emp = activeEmployees.find((e) => e.id === formEmployeeId);
    if (!emp) return;

    const settlement = calcSettlement(emp, formLastWorkingDate);

    const newResignation: Resignation = {
      id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      employeeId: formEmployeeId,
      submittedAt: new Date().toISOString(),
      lastWorkingDate: formLastWorkingDate,
      reason: formReason,
      status: "PENDING",
      clearanceChecklist: DEFAULT_CLEARANCE_ITEMS.map((item) => ({
        item,
        cleared: false,
      })),
      settlementAmount: settlement.total,
    };

    const existing = emp.resignations || [];
    updateEmployee(emp.id, {
      resignations: [...existing, newResignation],
      status: "ON_LEAVE",
    });

    showToast("Pengajuan resignasi berhasil diajukan", "success");
    setFormEmployeeId("");
    setFormLastWorkingDate("");
    setFormReason("");
    setShowForm(false);
  };

  const handleApprove = async (
    empId: string,
    resignationId: string,
  ) => {
    const ok = await confirm({
      title: "Setujui Resignasi",
      message:
        "Anda yakin akan menyetujui pengajuan resignasi ini? Status karyawan akan diubah menjadi RESIGNED.",
      confirmLabel: "Ya, Setujui",
      type: "primary",
    });
    if (!ok) return;

    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;

    const updated = (emp.resignations || []).map((r) =>
      r.id === resignationId
        ? {
            ...r,
            status: "APPROVED" as const,
            approvedBy: currentUser?.name || "Admin",
          }
        : r,
    );

    const approvedResignation = updated.find((r) => r.id === resignationId);

    updateEmployee(empId, {
      resignations: updated,
      status: "RESIGNED",
      resignedAt: new Date().toISOString(),
      lastWorkingDate: approvedResignation?.lastWorkingDate,
    });

    showToast("Resignasi berhasil disetujui", "success");
  };

  const handleReject = async (empId: string, resignationId: string) => {
    const ok = await confirm({
      title: "Tolak Resignasi",
      message:
        "Anda yakin akan menolak pengajuan resignasi ini? Status karyawan akan kembali ke ACTIVE.",
      confirmLabel: "Tolak",
      type: "danger",
    });
    if (!ok) return;

    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;

    const updated = (emp.resignations || []).map((r) =>
      r.id === resignationId
        ? {
            ...r,
            status: "REJECTED" as const,
            approvedBy: currentUser?.name || "Admin",
          }
        : r,
    );

    updateEmployee(empId, {
      resignations: updated,
      status: "ACTIVE",
    });

    showToast("Resignasi ditolak", "info");
  };

  const handleToggleClearance = (
    empId: string,
    resignationId: string,
    checklistIndex: number,
  ) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;

    const updated = (emp.resignations || []).map((r) => {
      if (r.id !== resignationId || !r.clearanceChecklist) return r;
      const newChecklist = r.clearanceChecklist.map((item, idx) =>
        idx === checklistIndex ? { ...item, cleared: !item.cleared } : item,
      );
      return { ...r, clearanceChecklist: newChecklist };
    });

    updateEmployee(empId, { resignations: updated });
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING:
        "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
      APPROVED:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
      REJECTED:
        "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
    };
    const label: Record<string, string> = {
      PENDING: "Pending",
      APPROVED: "Disetujui",
      REJECTED: "Ditolak",
    };
    return (
      <span
        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${map[status] || "bg-slate-100 text-slate-600"}`}
      >
        {label[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn dark:text-zinc-300 dark:[&_.bg-white]:bg-zinc-950 dark:[&_.bg-slate-50]:bg-zinc-900 dark:[&_.border-slate-100]:border-zinc-800 dark:[&_.border-slate-200]:border-zinc-800 dark:[&_.text-slate-900]:text-zinc-100 dark:[&_.text-slate-800]:text-zinc-100 dark:[&_.text-slate-700]:text-zinc-200 dark:[&_.text-slate-600]:text-zinc-300 dark:[&_input]:bg-zinc-950 dark:[&_input]:text-zinc-100 dark:[&_select]:bg-zinc-950 dark:[&_select]:text-zinc-100 dark:[&_textarea]:bg-zinc-950 dark:[&_textarea]:text-zinc-100 dark:[&_tr:hover]:bg-zinc-900">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <LogOut className="w-5 h-5 text-rose-500" />
              Manajemen Resignasi & Offboarding
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">
              Ajukan, pantau, dan setujui pengajuan resignasi karyawan beserta
              proses clearance dan settlement.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Ajukan Resignasi
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">
              Pending
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100">
            {pendingResignations.length}{" "}
            <span className="text-sm font-medium text-slate-500 dark:text-zinc-500">
              pengajuan
            </span>
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">
              Disetujui
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100">
            {approvedCount}{" "}
            <span className="text-sm font-medium text-slate-500 dark:text-zinc-500">
              karyawan
            </span>
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30">
              <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">
              Ditolak
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100">
            {rejectedCount}{" "}
            <span className="text-sm font-medium text-slate-500 dark:text-zinc-500">
              pengajuan
            </span>
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">
              Total Riwayat
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100">
            {allResignations.length}{" "}
            <span className="text-sm font-medium text-slate-500 dark:text-zinc-500">
              record
            </span>
          </p>
        </div>
      </div>

      {/* Form Ajukan Resignasi */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
          <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100 mb-4">
            Form Pengajuan Resignasi Baru
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1">
                Karyawan *
              </label>
              <select
                value={formEmployeeId}
                onChange={(e) => setFormEmployeeId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
              >
                <option value="">-- Pilih Karyawan --</option>
                {activeEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} — {emp.position}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1">
                Tanggal Hari Terakhir Bekerja *
              </label>
              <input
                type="date"
                value={formLastWorkingDate}
                onChange={(e) => setFormLastWorkingDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1">
                Alasan Resignasi *
              </label>
              <textarea
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                rows={3}
                placeholder="Jelaskan alasan pengajuan resignasi..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Ajukan Resignasi
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Pending Resignations */}
      {pendingResignations.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden dark:bg-zinc-950 dark:border-zinc-800">
          <div className="px-6 py-4 border-b border-slate-100 bg-amber-50/50 dark:bg-amber-950/10 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100">
                Menunggu Persetujuan ({pendingResignations.length})
              </h4>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-zinc-800">
            {pendingResignations.map((r) => {
              const emp = employees.find((e) => e.id === r.employeeId);
              const settlement = emp
                ? calcSettlement(emp, r.lastWorkingDate)
                : null;
              return (
                <div
                  key={r.id}
                  className="p-5 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-sm text-slate-800 dark:text-zinc-200">
                        {r.employeeName}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-500">
                        {r.position} · Diajukan{" "}
                        {new Date(r.submittedAt).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-bold">
                          Hari Terakhir
                        </p>
                        <p className="text-xs font-mono font-bold text-slate-700 dark:text-zinc-300">
                          {new Date(r.lastWorkingDate).toLocaleDateString(
                            "id-ID",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleApprove(r.employeeId, r.id)}
                          className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors cursor-pointer dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50"
                          title="Setujui"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReject(r.employeeId, r.id)}
                          className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer dark:bg-rose-950/30 dark:hover:bg-rose-950/50"
                          title="Tolak"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 mt-2">
                    {r.reason}
                  </p>
                  {settlement && (
                    <div className="mt-3 flex flex-wrap gap-4 text-[10px] font-mono text-slate-500 dark:text-zinc-500">
                      <span>
                        Gaji pro-rata:{" "}
                        <strong className="text-slate-700 dark:text-zinc-300">
                          {formatCurrency(settlement.proRatedSalary)}
                        </strong>
                      </span>
                      <span>
                        Sisa cuti:{" "}
                        <strong className="text-slate-700 dark:text-zinc-300">
                          {settlement.unusedLeaveDays} hari
                        </strong>
                      </span>
                      <span>
                        Total settlement:{" "}
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(settlement.total)}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">
            <Filter className="w-4 h-4" />
            Filter
          </div>
          {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border cursor-pointer transition-all ${
                filterStatus === s
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-500 border-slate-200 hover:border-blue-300 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400"
              }`}
            >
              {s === "ALL" ? "Semua" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Resignation History Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden dark:bg-zinc-950 dark:border-zinc-800">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center">
          <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100">
            Riwayat Resignasi ({filteredResignations.length} record)
          </h4>
        </div>
        {filteredResignations.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-zinc-500">
              Belum ada data resignasi.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-zinc-800">
            {filteredResignations.map((r) => {
              const isExpanded = expandedId === r.id;
              const emp = employees.find((e) => e.id === r.employeeId);
              const settlement = emp
                ? calcSettlement(emp, r.lastWorkingDate)
                : null;
              return (
                <div key={r.id}>
                  <div
                    className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : r.id)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <p className="font-bold text-sm text-slate-800 dark:text-zinc-200">
                            {r.employeeName}
                          </p>
                          {statusBadge(r.status)}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-0.5">
                          {r.position} · Diajukan{" "}
                          {new Date(r.submittedAt).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-bold">
                            Hari Terakhir
                          </p>
                          <p className="text-xs font-mono font-bold text-slate-700 dark:text-zinc-300">
                            {new Date(
                              r.lastWorkingDate,
                            ).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-6 pb-5 bg-slate-50/50 dark:bg-zinc-900/50 border-t border-slate-100 dark:border-zinc-800">
                      <div className="pt-4 space-y-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
                            Alasan
                          </p>
                          <p className="text-xs text-slate-700 dark:text-zinc-300">
                            {r.reason}
                          </p>
                        </div>

                        {r.approvedBy && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
                              Disetujui/Ditolak Oleh
                            </p>
                            <p className="text-xs text-slate-700 dark:text-zinc-300">
                              {r.approvedBy}
                            </p>
                          </div>
                        )}

                        {/* Clearance Checklist */}
                        {r.clearanceChecklist && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2 flex items-center gap-1">
                              <ClipboardList className="w-3 h-3" />
                              Clearance Checklist
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {r.clearanceChecklist.map((item, idx) => (
                                <label
                                  key={idx}
                                  className="flex items-center gap-2 text-xs cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={item.cleared}
                                    onChange={() =>
                                      handleToggleClearance(
                                        r.employeeId,
                                        r.id,
                                        idx,
                                      )
                                    }
                                    className="rounded border-slate-300 dark:border-zinc-700"
                                  />
                                  <span
                                    className={
                                      item.cleared
                                        ? "line-through text-slate-400 dark:text-zinc-600"
                                        : "text-slate-700 dark:text-zinc-300"
                                    }
                                  >
                                    {item.item}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Settlement */}
                        {settlement && (
                          <div className="bg-white border border-slate-200 rounded-xl p-4 dark:bg-zinc-950 dark:border-zinc-800">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2 flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              Perhitungan Settlement
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                              <div>
                                <p className="text-[10px] text-slate-400 dark:text-zinc-600">
                                  Gaji Harian
                                </p>
                                <p className="font-bold text-slate-700 dark:text-zinc-300">
                                  {formatCurrency(settlement.dailyRate)}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 dark:text-zinc-600">
                                  Gaji Pro-rata
                                </p>
                                <p className="font-bold text-slate-700 dark:text-zinc-300">
                                  {formatCurrency(settlement.proRatedSalary)}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 dark:text-zinc-600">
                                  Sisa Cuti
                                </p>
                                <p className="font-bold text-slate-700 dark:text-zinc-300">
                                  {settlement.unusedLeaveDays} hari (
                                  {formatCurrency(settlement.leavePayout)})
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 dark:text-zinc-600">
                                  Total Settlement
                                </p>
                                <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                  {formatCurrency(settlement.total)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {r.exitInterviewNotes && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
                              Catatan Exit Interview
                            </p>
                            <p className="text-xs text-slate-700 dark:text-zinc-300">
                              {r.exitInterviewNotes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
