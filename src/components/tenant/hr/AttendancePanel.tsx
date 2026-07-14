import * as React from "react";
import { AttendanceSummaryCards } from "./attendance/AttendanceSummaryCards";
import { AttendanceLogPanel } from "./attendance/AttendanceLogPanel";
import { LeaveRequestsPanel } from "./attendance/LeaveRequestsPanel";
import { EmployeeAuditPanel } from "./attendance/EmployeeAuditPanel";

export const AttendancePanel: React.FC<any> = (props) => {
  const { employees, currentTenantId, currentBranchId, attendanceSubTabState, setAttendanceSubTabState, attendanceDate, branches, newEmpName, setNewEmpName, newEmpEmail, setNewEmpEmail, newEmpPhone, setNewEmpPhone, newEmpDiv, setNewEmpDiv, newEmpPos, setNewEmpPos, newEmpSalary, setNewEmpSalary, newEmpContract, setNewEmpContract, addEmployee, showToast } = props;
  const pendingLeaveCount = employees
    .filter((e) => e.tenantId === currentTenantId && e.branchId === currentBranchId)
    .reduce((sum, e) => sum + (e.leaves?.filter((l) => l.status === "PENDING").length || 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Modul HRD & Presensi Karyawan Terpadu</h3>
            <p className="text-xs text-slate-500 mt-1">Kelola daftar karyawan, jam masuk/pulang, persetujuan cuti, serta log kehadiran secara terperinci.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAttendanceSubTabState("log")} className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer border ${attendanceSubTabState === "log" ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>📋 Log Presensi</button>
            <button onClick={() => setAttendanceSubTabState("leaves")} className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer border relative ${attendanceSubTabState === "leaves" ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>📅 Pengajuan Cuti (Leaves){pendingLeaveCount > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white animate-pulse">{pendingLeaveCount}</span>}</button>
            <button onClick={() => setAttendanceSubTabState("add_employee")} className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer border ${attendanceSubTabState === "add_employee" ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>👤 Registrasi Staff</button>
          </div>
        </div>
        <AttendanceSummaryCards employees={employees} currentTenantId={currentTenantId} currentBranchId={currentBranchId} attendanceDate={attendanceDate} />
      </div>
      {attendanceSubTabState === "log" && <AttendanceLogPanel {...props} />}
      {attendanceSubTabState === "leaves" && <LeaveRequestsPanel {...props} />}
            {/* Subtab Content: Registrasi Karyawan Baru */}
            {attendanceSubTabState === "add_employee" && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-2xl mx-auto space-y-6">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    Registrasi Karyawan Baru
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Daftarkan profil staff baru Anda di cabang{" "}
                    {branches.find((b) => b.id === currentBranchId)?.name}.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Roni Wijaya"
                      value={newEmpName}
                      onChange={(e) => setNewEmpName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Jabatan (Position)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Teknisi Handphone Junior"
                      value={newEmpPos}
                      onChange={(e) => setNewEmpPos(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Divisi Kerja
                    </label>
                    <select
                      value={newEmpDiv}
                      onChange={(e) => setNewEmpDiv(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-slate-400"
                    >
                      <option value="Technical Repair">
                        Technical Repair (Suku Cadang & Service)
                      </option>
                      <option value="Operations">
                        Operations (Front Office & Kasir)
                      </option>
                      <option value="Sales & Marketing">
                        Sales & Marketing (Promosi)
                      </option>
                      <option value="General Admin">
                        General Admin (Akunting & HRD)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Status Kontrak
                    </label>
                    <select
                      value={newEmpContract}
                      onChange={(e) => setNewEmpContract(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-slate-400"
                    >
                      <option value="PERMANENT">
                        KARYAWAN TETAP (PERMANENT)
                      </option>
                      <option value="CONTRACT">
                        KONTRAK BERKALA (CONTRACT)
                      </option>
                      <option value="INTERN">MAGANG (INTERN)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Gaji Pokok Bulanan (IDR)
                    </label>
                    <input
                      type="number"
                      placeholder="3500000"
                      value={newEmpSalary}
                      onChange={(e) => setNewEmpSalary(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-700 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Alamat Email
                    </label>
                    <input
                      type="email"
                      placeholder="contoh@email.com"
                      value={newEmpEmail}
                      onChange={(e) => setNewEmpEmail(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Nomor Telepon / WhatsApp
                    </label>
                    <input
                      type="text"
                      placeholder="0812XXXXXXXX"
                      value={newEmpPhone}
                      onChange={(e) => setNewEmpPhone(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setNewEmpName("");
                      setNewEmpPos("");
                      setNewEmpSalary("3500000");
                      setNewEmpEmail("");
                      setNewEmpPhone("");
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-all"
                  >
                    Reset Formulir
                  </button>
                  <button
                    onClick={() => {
                      if (!newEmpName || !newEmpPos || !newEmpEmail) {
                        showToast(
                          "Nama, Jabatan, dan Email wajib diisi.",
                          "error",
                        );
                        return;
                      }
                      addEmployee({
                        branchId: currentBranchId,
                        name: newEmpName,
                        position: newEmpPos,
                        division: newEmpDiv,
                        contractStatus: newEmpContract,
                        basicSalary: Number(newEmpSalary),
                        email: newEmpEmail,
                        phone: newEmpPhone,
                      });
                      showToast(
                        `Sukses mendaftarkan staff baru: ${newEmpName}!`,
                        "success",
                      );
                      setNewEmpName("");
                      setNewEmpPos("");
                      setNewEmpEmail("");
                      setNewEmpPhone("");
                      setAttendanceSubTabState("log"); // back to log
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all"
                  >
                    Daftarkan Karyawan Baru
                  </button>
                </div>
              </div>
            )}
      <EmployeeAuditPanel {...props} />
    </div>
  );
};
