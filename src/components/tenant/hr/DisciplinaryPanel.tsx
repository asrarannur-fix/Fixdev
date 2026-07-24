import React, { useState, useMemo } from "react";
import {
  AlertTriangle,
  PlusCircle,
  ShieldAlert,
  Filter,
  X,
  Paperclip,
  Clock,
  Users,
} from "lucide-react";
import { useSaaS } from "../../../context/SaaSContext";
import { useToast } from "../../ui/Toast";
import { DisciplinaryAction } from "../../../types";

interface DisciplinaryPanelProps {
  activeSubTab: string;
}

const LEVEL_META: Record<
  DisciplinaryAction["level"],
  { label: string; color: string; bg: string; darkBg: string; darkText: string }
> = {
  WARNING: {
    label: "WARNING",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    bg: "bg-blue-50",
    darkBg: "dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
    darkText: "dark:text-blue-400",
  },
  SP1: {
    label: "SP-1",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    bg: "bg-amber-50",
    darkBg: "dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
    darkText: "dark:text-amber-400",
  },
  SP2: {
    label: "SP-2",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    bg: "bg-orange-50",
    darkBg: "dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800",
    darkText: "dark:text-orange-400",
  },
  SP3: {
    label: "SP-3",
    color: "bg-red-100 text-red-700 border-red-200",
    bg: "bg-red-50",
    darkBg: "dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
    darkText: "dark:text-red-400",
  },
  TERMINATION: {
    label: "TERMINATION",
    color: "bg-red-200 text-red-900 border-red-300",
    bg: "bg-red-50",
    darkBg: "dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
    darkText: "dark:text-red-300",
  },
};

const DOT_COLORS: Record<DisciplinaryAction["level"], string> = {
  WARNING: "bg-blue-500",
  SP1: "bg-amber-500",
  SP2: "bg-orange-500",
  SP3: "bg-red-500",
  TERMINATION: "bg-red-800",
};

const LINE_COLORS: Record<DisciplinaryAction["level"], string> = {
  WARNING: "border-blue-400",
  SP1: "border-amber-400",
  SP2: "border-orange-400",
  SP3: "border-red-400",
  TERMINATION: "border-red-700",
};

export const DisciplinaryPanel: React.FC<DisciplinaryPanelProps> = ({
  activeSubTab,
}) => {
  const { employees, updateEmployee, currentUser } = useSaaS();
  const { showToast } = useToast();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [filterLevel, setFilterLevel] = useState<string>("");
  const [filterEmployee, setFilterEmployee] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [formLevel, setFormLevel] = useState<DisciplinaryAction["level"]>("WARNING");
  const [formReason, setFormReason] = useState("");
  const [formDescription, setFormDescription] = useState("");

  if (activeSubTab !== "disciplinary") return null;

  const tenantEmployees = employees.filter(
    (e) =>
      e.tenantId === currentUser?.tenantId &&
      e.status !== "RESIGNED" &&
      e.status !== "TERMINATED",
  );

  const allActions = useMemo(() => {
    const actions: (DisciplinaryAction & { employeeName: string; employeeId: string })[] = [];
    for (const emp of tenantEmployees) {
      if (!emp.disciplinaryActions) continue;
      for (const da of emp.disciplinaryActions) {
        actions.push({ ...da, employeeName: emp.name, employeeId: emp.id });
      }
    }
    return actions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [tenantEmployees]);

  const filteredGlobal = useMemo(() => {
    return allActions.filter((a) => {
      if (filterLevel && a.level !== filterLevel) return false;
      if (filterEmployee && a.employeeName !== filterEmployee) return false;
      return true;
    });
  }, [allActions, filterLevel, filterEmployee]);

  const selectedEmployee = tenantEmployees.find(
    (e) => e.id === selectedEmployeeId,
  );

  const employeeHistory = useMemo(() => {
    if (!selectedEmployee) return [];
    return (selectedEmployee.disciplinaryActions || []).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [selectedEmployee]);

  const employeeStats = useMemo(() => {
    if (!selectedEmployee) return { total: 0, latestDate: "-" };
    const acts = selectedEmployee.disciplinaryActions || [];
    if (acts.length === 0) return { total: 0, latestDate: "-" };
    const sorted = [...acts].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    return {
      total: acts.length,
      latestDate: new Date(sorted[0].date).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };
  }, [selectedEmployee]);

  const globalStats = useMemo(() => {
    const sp1 = allActions.filter((a) => a.level === "SP1").length;
    const sp2 = allActions.filter((a) => a.level === "SP2").length;
    const sp3 = allActions.filter((a) => a.level === "SP3").length;
    const warnings = allActions.filter((a) => a.level === "WARNING").length;
    const terminations = allActions.filter((a) => a.level === "TERMINATION").length;
    return { total: allActions.length, sp1, sp2, sp3, warnings, terminations };
  }, [allActions]);

  const uniqueEmployeeNames = [...new Set(tenantEmployees.map((e) => e.name))];

  const handleSubmit = () => {
    if (!selectedEmployeeId || !formReason || !formDescription) {
      showToast("Lengkapi semua field yang diperlukan", "error");
      return;
    }

    const emp = tenantEmployees.find((e) => e.id === selectedEmployeeId);
    if (!emp) return;

    const newAction: DisciplinaryAction = {
      id: `da-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: formDate,
      level: formLevel,
      reason: formReason,
      description: formDescription,
      issuedBy: currentUser?.name || "Admin",
    };

    const existing = emp.disciplinaryActions || [];
    updateEmployee(emp.id, {
      disciplinaryActions: [...existing, newAction],
    });

    showToast("Surat peringatan berhasil dibuat", "success");
    setFormDate(
      (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      })(),
    );
    setFormLevel("WARNING");
    setFormReason("");
    setFormDescription("");
    setShowForm(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn dark:text-zinc-300 dark:[&_.bg-white]:bg-zinc-950 dark:[&_.bg-slate-50]:bg-zinc-900 dark:[&_.border-slate-200]:border-zinc-800 dark:[&_.text-slate-900]:text-zinc-100 dark:[&_.text-slate-800]:text-zinc-100 dark:[&_.text-slate-700]:text-zinc-200 dark:[&_.text-slate-600]:text-zinc-300 dark:[&_input]:bg-zinc-900 dark:[&_select]:bg-zinc-900 dark:[&_textarea]:bg-zinc-900">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30">
              <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100">
                Manajemen Disiplin & Surat Peringatan
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-0.5">
                Buat, pantau, dan kelola surat peringatan (SP) untuk karyawan.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Buat SP Baru
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
            Total Aksi
          </p>
          <p className="text-xl font-extrabold font-mono text-slate-800 dark:text-zinc-100">
            {globalStats.total}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm dark:bg-blue-950/20 dark:border-blue-900">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-1">
            WARNING
          </p>
          <p className="text-xl font-extrabold font-mono text-blue-700 dark:text-blue-400">
            {globalStats.warnings}
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm dark:bg-amber-950/20 dark:border-amber-900">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400 mb-1">
            SP-1
          </p>
          <p className="text-xl font-extrabold font-mono text-amber-700 dark:text-amber-400">
            {globalStats.sp1}
          </p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 shadow-sm dark:bg-orange-950/20 dark:border-orange-900">
          <p className="text-[10px] font-bold uppercase tracking-wider text-orange-500 dark:text-orange-400 mb-1">
            SP-2
          </p>
          <p className="text-xl font-extrabold font-mono text-orange-700 dark:text-orange-400">
            {globalStats.sp2}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm dark:bg-red-950/20 dark:border-red-900">
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 dark:text-red-400 mb-1">
            SP-3 / TERMINATE
          </p>
          <p className="text-xl font-extrabold font-mono text-red-700 dark:text-red-400">
            {globalStats.sp3 + globalStats.terminations}
          </p>
        </div>
      </div>

      {/* Form Buat SP Baru */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100">
              Form Surat Peringatan Baru
            </h4>
            <button
              onClick={() => setShowForm(false)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1">
                Karyawan *
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
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
              <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1">
                Tanggal *
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1">
                Level *
              </label>
              <select
                value={formLevel}
                onChange={(e) =>
                  setFormLevel(e.target.value as DisciplinaryAction["level"])
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
              >
                <option value="WARNING">WARNING</option>
                <option value="SP1">SP-1 (Surat Peringatan 1)</option>
                <option value="SP2">SP-2 (Surat Peringatan 2)</option>
                <option value="SP3">SP-3 (Surat Peringatan 3)</option>
                <option value="TERMINATION">TERMINATION (Pemutusan Hubungan Kerja)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1">
                Dikeluarkan Oleh *
              </label>
              <input
                type="text"
                value={currentUser?.name || "Admin"}
                readOnly
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1">
                Alasan *
              </label>
              <input
                type="text"
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                placeholder="Contoh: Keterlambatan masuk kerja berulang kali"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1">
                Deskripsi / Rincian *
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                placeholder="Jelaskan detail pelanggaran, dampak, dan tindakan yang diharapkan..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Simpan Surat Peringatan
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Employee Selector + History Timeline */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">
              Riwayat Per Karyawan
            </span>
          </div>
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
          >
            <option value="">-- Pilih Karyawan --</option>
            {tenantEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
          {selectedEmployee && (
            <div className="flex items-center gap-4 ml-auto">
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Total SP
                </p>
                <p className="text-lg font-extrabold font-mono text-slate-800 dark:text-zinc-100">
                  {employeeStats.total}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Aksi Terakhir
                </p>
                <p className="text-xs font-bold font-mono text-slate-700 dark:text-zinc-200">
                  {employeeStats.latestDate}
                </p>
              </div>
            </div>
          )}
        </div>

        {selectedEmployee ? (
          employeeHistory.length === 0 ? (
            <div className="p-10 text-center">
              <ShieldAlert className="w-10 h-10 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
              <p className="text-xs text-slate-400 dark:text-zinc-500 font-semibold">
                Belum ada riwayat disiplin untuk karyawan ini.
              </p>
            </div>
          ) : (
            <div className="relative pl-6">
              {/* Vertical line */}
              <div
                className={`absolute left-2.5 top-2 bottom-2 w-0.5 border-l-2 ${
                  employeeHistory.length > 0
                    ? LINE_COLORS[employeeHistory[0].level]
                    : "border-slate-200 dark:border-zinc-700"
                }`}
              />
              <div className="space-y-6">
                {employeeHistory.map((action) => {
                  const meta = LEVEL_META[action.level];
                  return (
                    <div key={action.id} className="relative">
                      {/* Dot */}
                      <div
                        className={`absolute -left-[14px] top-3 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-950 ${DOT_COLORS[action.level]} ring-2 ring-slate-100 dark:ring-zinc-800`}
                      />
                      {/* Card */}
                      <div
                        className={`ml-4 border rounded-xl p-4 ${meta.color} ${meta.darkBg} transition-all`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${meta.color} ${meta.darkBg}`}
                            >
                              {meta.label}
                            </span>
                            <span className="text-xs font-bold text-slate-700 dark:text-zinc-200">
                              {action.reason}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(action.date).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-zinc-400 mb-2 leading-relaxed">
                          {action.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 dark:text-zinc-500">
                          <span>
                            Dikeluarkan oleh:{" "}
                            <strong className="text-slate-700 dark:text-zinc-300">
                              {action.issuedBy}
                            </strong>
                          </span>
                          {action.acknowledgedBy && (
                            <span>
                              Ditandatangani:{" "}
                              <strong className="text-slate-700 dark:text-zinc-300">
                                {action.acknowledgedBy}
                              </strong>
                            </span>
                          )}
                          {action.attachments && action.attachments.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Paperclip className="w-3 h-3" />
                              {action.attachments.length} lampiran
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ) : (
          <div className="p-10 text-center">
            <Users className="w-10 h-10 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-xs text-slate-400 dark:text-zinc-500 font-semibold">
              Pilih karyawan untuk melihat riwayat disiplin.
            </p>
          </div>
        )}
      </div>

      {/* Global History Table with Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900">
          <h3 className="font-bold text-xs text-slate-800 dark:text-zinc-100 uppercase tracking-wider">
            Semua Riwayat Disiplin
          </h3>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-zinc-800 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            Filter
          </div>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-wider focus:ring-2 focus:ring-blue-500 outline-none dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
          >
            <option value="">Semua Level</option>
            <option value="WARNING">WARNING</option>
            <option value="SP1">SP-1</option>
            <option value="SP2">SP-2</option>
            <option value="SP3">SP-3</option>
            <option value="TERMINATION">TERMINATION</option>
          </select>
          <select
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-wider focus:ring-2 focus:ring-blue-500 outline-none dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
          >
            <option value="">Semua Karyawan</option>
            {uniqueEmployeeNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {(filterLevel || filterEmployee) && (
            <button
              onClick={() => {
                setFilterLevel("");
                setFilterEmployee("");
              }}
              className="text-[10px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
            >
              Reset
            </button>
          )}
          <span className="ml-auto text-[10px] font-mono text-slate-400 dark:text-zinc-500">
            {filteredGlobal.length} data
          </span>
        </div>

        {filteredGlobal.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldAlert className="w-10 h-10 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-xs text-slate-400 dark:text-zinc-500 font-semibold">
              Belum ada data disiplin ditemukan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-mono dark:bg-zinc-900 dark:text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Karyawan</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Alasan</th>
                  <th className="px-4 py-3">Deskripsi</th>
                  <th className="px-4 py-3">Dikeluarkan Oleh</th>
                  <th className="px-4 py-3">Ditandatangani</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {filteredGlobal.map((action) => {
                  const meta = LEVEL_META[action.level];
                  return (
                    <tr
                      key={action.id}
                      className="hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                        {new Date(action.date).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700 dark:text-zinc-200">
                        {action.employeeName}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${meta.color} ${meta.darkBg}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-zinc-400 max-w-[180px] truncate">
                        {action.reason}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-zinc-500 max-w-[200px] truncate">
                        {action.description}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-zinc-300">
                        {action.issuedBy}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-zinc-300">
                        {action.acknowledgedBy || (
                          <span className="text-slate-300 dark:text-zinc-600">—</span>
                        )}
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
  );
};
