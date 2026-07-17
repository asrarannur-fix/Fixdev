import * as React from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { Clock, Calendar, CheckCircle2, X, PlusCircle, Edit, Trash2, FileText, AlertCircle, UserCheck, Search, ShieldCheck, History, Download, Upload, Filter, Lock } from "lucide-react";
import { AccountType, Employee, ServiceStatus } from "../../types";
export const HRAttendancePanel: React.FC<any> = (props) => {
  const { activeSubTab, Plus, addEmployee, approveLeave, attendanceDate, attendanceEmployeeId, attendanceInTime, attendanceManualStatus, attendanceOutTime, attendanceSubTabState, branches, bulkCheckIn, currentBranchId, currentTenantId, currentUser, currentUserPermissions, detailHistoryEmpId, editEmpContract, editEmpDiv, editEmpEmail, editEmpName, editEmpPhone, editEmpPos, editEmpSalary, employeeAuditTab, employees, leaveEmployeeId, leaveEnd, leaveReason, leaveStart, leaveType, newEmpContract, newEmpDiv, newEmpEmail, newEmpName, newEmpPhone, newEmpPos, newEmpSalary, recordAttendance, services, setAttendanceDate, setAttendanceEmployeeId, setAttendanceInTime, setAttendanceManualStatus, setAttendanceOutTime, setAttendanceSubTabState, setDetailHistoryEmpId, setEditEmpContract, setEditEmpDiv, setEditEmpEmail, setEditEmpName, setEditEmpPhone, setEditEmpPos, setEditEmpSalary, setEmployeeAuditTab, setLeaveEmployeeId, setLeaveEnd, setLeaveReason, setLeaveStart, setLeaveType, setNewEmpContract, setNewEmpDiv, setNewEmpEmail, setNewEmpName, setNewEmpPhone, setNewEmpPos, setNewEmpSalary, showConfirm, showPrompt, showToast, submitLeave, updateEmployee } = props;
  if (activeSubTab !== "attendance") return null;
  return (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Modul HRD & Presensi Karyawan Terpadu
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Kelola daftar karyawan, jam masuk/pulang, persetujuan cuti,
                    serta log kehadiran secara terperinci.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAttendanceSubTabState("log")}
                    className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                      attendanceSubTabState === "log"
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    📋 Log Presensi
                  </button>
                  <button
                    onClick={() => setAttendanceSubTabState("leaves")}
                    className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer border relative ${
                      attendanceSubTabState === "leaves"
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    📅 Pengajuan Cuti (Leaves)
                    {employees
                      .filter(
                        (e) =>
                          e.tenantId === currentTenantId &&
                          e.branchId === currentBranchId,
                      )
                      .reduce(
                        (sum, e) =>
                          sum +
                          (e.leaves?.filter((l) => l.status === "PENDING")
                            .length || 0),
                        0,
                      ) > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white animate-pulse">
                        {employees
                          .filter(
                            (e) =>
                              e.tenantId === currentTenantId &&
                              e.branchId === currentBranchId,
                          )
                          .reduce(
                            (sum, e) =>
                              sum +
                              (e.leaves?.filter((l) => l.status === "PENDING")
                                .length || 0),
                            0,
                          )}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setAttendanceSubTabState("add_employee")}
                    className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                      attendanceSubTabState === "add_employee"
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    👤 Registrasi Staff
                  </button>
                </div>
              </div>

              {/* Performance Widgets (Today's Stats) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Karyawan
                  </span>
                  <span className="text-2xl font-black text-slate-850 mt-1 block">
                    {
                      employees.filter(
                        (e) =>
                          e.tenantId === currentTenantId &&
                          e.branchId === currentBranchId,
                      ).length
                    }{" "}
                    Orang
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Aktif di cabang ini
                  </span>
                </div>
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                    Hadir Hari Ini
                  </span>
                  <span className="text-2xl font-black text-emerald-700 mt-1 block">
                    {
                      employees
                        .filter(
                          (e) =>
                            e.tenantId === currentTenantId &&
                            e.branchId === currentBranchId,
                        )
                        .filter((e) =>
                          e.attendanceHistory?.some(
                            (h) =>
                              h.date === attendanceDate &&
                              (h.status === "PRESENT" || h.status === "LATE"),
                          ),
                        ).length
                    }{" "}
                    Staff
                  </span>
                  <span className="text-[10px] text-emerald-600 block mt-1">
                    Disiplin kerja 100%
                  </span>
                </div>
                <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                    Terlambat (Late)
                  </span>
                  <span className="text-2xl font-black text-amber-700 mt-1 block">
                    {
                      employees
                        .filter(
                          (e) =>
                            e.tenantId === currentTenantId &&
                            e.branchId === currentBranchId,
                        )
                        .filter((e) =>
                          e.attendanceHistory?.some(
                            (h) =>
                              h.date === attendanceDate && h.status === "LATE",
                          ),
                        ).length
                    }{" "}
                    Staff
                  </span>
                  <span className="text-[10px] text-amber-600 block mt-1">
                    Toleransi s/d 15 menit
                  </span>
                </div>
                <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100/50">
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
                    Izin / Cuti / Sakit
                  </span>
                  <span className="text-2xl font-black text-rose-700 mt-1 block">
                    {
                      employees
                        .filter(
                          (e) =>
                            e.tenantId === currentTenantId &&
                            e.branchId === currentBranchId,
                        )
                        .filter((e) =>
                          e.attendanceHistory?.some(
                            (h) =>
                              h.date === attendanceDate &&
                              (h.status === "LEAVE" || h.status === "ABSENT"),
                          ),
                        ).length
                    }{" "}
                    Staff
                  </span>
                  <span className="text-[10px] text-rose-600 block mt-1">
                    Cuti sah terverifikasi
                  </span>
                </div>
              </div>
            </div>

            {/* Subtab Content: Log Presensi */}
            {attendanceSubTabState === "log" && (
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm animate-fadeIn">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Tanggal Presensi:
                    </label>
                    <input
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold font-mono text-slate-700 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        bulkCheckIn();
                        showToast(
                          "Sukses! Berhasil memproses Bulk Check-In untuk seluruh staff aktif hari ini!",
                          "success",
                        );
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer shadow-sm transition-all"
                    >
                      ⚡ Presensi Cepat Seluruh Staff
                    </button>
                  </div>
                </div>

                {/* Manual Presensi Drawer / Form */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/30">
                  <details className="group">
                    <summary className="list-none flex items-center justify-between cursor-pointer select-none">
                      <span className="text-xs font-bold text-slate-600 flex items-center gap-2">
                        <Plus className="h-4 w-4 text-blue-600" />
                        Rekam Presensi Manual Individual Karyawan
                      </span>
                      <span className="text-xs text-blue-600 group-open:hidden">
                        Buka Formulir ↓
                      </span>
                      <span className="text-xs text-blue-600 hidden group-open:block">
                        Tutup Formulir ↑
                      </span>
                    </summary>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100 animate-slideDown">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Pilih Karyawan
                        </label>
                        <select
                          value={attendanceEmployeeId}
                          onChange={(e) =>
                            setAttendanceEmployeeId(e.target.value)
                          }
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700"
                        >
                          <option value="">-- Pilih Staff --</option>
                          {employees
                            .filter(
                              (e) =>
                                e.tenantId === currentTenantId &&
                                e.branchId === currentBranchId,
                            )
                            .map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.name} ({e.position})
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Jam Masuk (Check-In)
                        </label>
                        <input
                          type="text"
                          placeholder="08:00"
                          value={attendanceInTime}
                          onChange={(e) => setAttendanceInTime(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Jam Pulang (Check-Out)
                        </label>
                        <input
                          type="text"
                          placeholder="17:00"
                          value={attendanceOutTime}
                          onChange={(e) => setAttendanceOutTime(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Status & Kehadiran
                        </label>
                        <div className="flex items-center gap-2">
                          <select
                            value={attendanceManualStatus}
                            onChange={(e) =>
                              setAttendanceManualStatus(e.target.value as any)
                            }
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700"
                          >
                            <option value="PRESENT">HADIR (ON-TIME)</option>
                            <option value="LATE">TERLAMBAT (LATE)</option>
                            <option value="ABSENT">ALPA / ABSEN</option>
                            <option value="LEAVE">IZIN / SAKIT / CUTI</option>
                          </select>
                          <button
                            onClick={() => {
                              if (!attendanceEmployeeId) {
                                showToast(
                                  "Silakan pilih karyawan terlebih dahulu.",
                                  "error",
                                );
                                return;
                              }
                              recordAttendance(
                                attendanceEmployeeId,
                                attendanceDate,
                                attendanceInTime,
                                attendanceOutTime || undefined,
                                attendanceManualStatus,
                              );
                              showToast(
                                "Sukses merekam presensi manual staff!",
                                "success",
                              );
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer shrink-0"
                          >
                            Simpan
                          </button>
                        </div>
                      </div>
                    </div>
                  </details>
                </div>

                {/* Log Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-3.5">Karyawan (Staff)</th>
                        <th className="px-5 py-3.5">Gaji Pokok Bulanan</th>
                        <th className="px-5 py-3.5">Check-In</th>
                        <th className="px-5 py-3.5">Check-Out</th>
                        <th className="px-5 py-3.5">Status Presensi</th>
                        <th className="px-5 py-3.5 text-right">
                          Aksi & Log Riwayat
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {employees.filter(
                        (e) =>
                          e.tenantId === currentTenantId &&
                          e.branchId === currentBranchId,
                      ).length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="text-center py-8 text-slate-400"
                          >
                            Tidak ada data karyawan terdaftar di cabang ini.
                            Silakan tambahkan karyawan baru.
                          </td>
                        </tr>
                      ) : (
                        employees
                          .filter(
                            (e) =>
                              e.tenantId === currentTenantId &&
                              e.branchId === currentBranchId,
                          )
                          .map((emp) => {
                            const todayRecord = emp.attendanceHistory?.find(
                              (h) => h.date === attendanceDate,
                            );
                            return (
                              <tr
                                key={emp.id}
                                className="hover:bg-slate-50/80 transition-all duration-150"
                              >
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                                      {emp.name.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-850 leading-tight">
                                        {emp.name}
                                      </p>
                                      <p className="text-[10px] text-slate-400 mt-0.5">
                                        {emp.position} •{" "}
                                        <span className="font-mono">
                                          {emp.division}
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5">
                                  {currentUserPermissions.includes(
                                    "action-hr-salary-edit",
                                  ) ? (
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-black text-slate-700">
                                        Rp{" "}
                                        {(
                                          emp.basicSalary ?? 3500000
                                        ).toLocaleString()}
                                      </span>
                                      <button
                                        onClick={async () => {
                                          const val = await showPrompt({
                                            title: "Ubah Gaji Pokok",
                                            message: `Ubah nominal gaji pokok untuk staff "${emp.name}". Masukkan angka tanpa simbol atau titik pemisah.`,
                                            defaultValue: (
                                              emp.basicSalary ?? 3500000
                                            ).toString(),
                                            confirmLabel: "Simpan Gaji",
                                            type: "primary",
                                          });
                                          if (val !== null) {
                                            const num = Number(val);
                                            if (isNaN(num) || num <= 0) {
                                              showToast(
                                                "Format nominal gaji yang dimasukkan tidak valid.",
                                                "error",
                                              );
                                              return;
                                            }
                                            updateEmployee(emp.id, {
                                              basicSalary: num,
                                            });
                                            showToast(
                                              `Sukses memperbarui gaji pokok ${emp.name} menjadi Rp ${num.toLocaleString()}!`,
                                              "success",
                                            );
                                          }
                                        }}
                                        className="text-indigo-600 hover:text-indigo-800 p-1 hover:bg-indigo-50 rounded-md transition-all cursor-pointer"
                                        title="Ubah Gaji Pokok"
                                      >
                                        ✏️
                                      </button>
                                    </div>
                                  ) : (
                                    <span
                                      className="text-slate-400 font-mono italic flex items-center gap-1 cursor-help"
                                      title="Akses Terbatas: Anda tidak memiliki izin Edit Salary"
                                    >
                                      <Lock className="w-3 h-3 text-slate-300" />{" "}
                                      Rp *******
                                    </span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 font-mono">
                                  {todayRecord ? (
                                    <span className="text-slate-700 font-semibold">
                                      {todayRecord.checkIn}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 font-mono">
                                  {todayRecord?.checkOut ? (
                                    <span className="text-slate-700 font-semibold">
                                      {todayRecord.checkOut}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5">
                                  {todayRecord ? (
                                    <span
                                      className={`px-2.5 py-1 rounded-full text-[9px] font-bold font-mono tracking-wider ${
                                        todayRecord.status === "PRESENT"
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : todayRecord.status === "LATE"
                                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                                            : todayRecord.status === "ABSENT"
                                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                                              : "bg-blue-50 text-blue-700 border border-blue-200"
                                      }`}
                                    >
                                      {todayRecord.status === "PRESENT"
                                        ? "HADIR (ON TIME)"
                                        : todayRecord.status === "LATE"
                                          ? "TERLAMBAT"
                                          : todayRecord.status === "ABSENT"
                                            ? "ALPA / SAKIT"
                                            : "CUTI RESMI"}
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-full text-[9px] font-bold font-mono tracking-wider bg-slate-100 text-slate-400 border border-slate-200">
                                      BELUM ABSEN
                                    </span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* Quick Actions if not checked in */}
                                    {!todayRecord && (
                                      <>
                                        <button
                                          onClick={() =>
                                            recordAttendance(
                                              emp.id,
                                              attendanceDate,
                                              "08:00",
                                              "17:00",
                                              "PRESENT",
                                            )
                                          }
                                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[10px] px-2 py-1 rounded-lg transition-all"
                                          title="Quick Check-In 08:00"
                                        >
                                          ✓ Masuk
                                        </button>
                                        <button
                                          onClick={() =>
                                            recordAttendance(
                                              emp.id,
                                              attendanceDate,
                                              "08:45",
                                              "17:00",
                                              "LATE",
                                            )
                                          }
                                          className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold text-[10px] px-2 py-1 rounded-lg transition-all"
                                          title="Quick Late Check-In"
                                        >
                                          ⚠ Terlambat
                                        </button>
                                        <button
                                          onClick={() =>
                                            recordAttendance(
                                              emp.id,
                                              attendanceDate,
                                              "-",
                                              "-",
                                              "ABSENT",
                                            )
                                          }
                                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] px-2 py-1 rounded-lg transition-all"
                                          title="Mark Absent"
                                        >
                                          ✗ Alpha
                                        </button>
                                      </>
                                    )}

                                    {/* Quick Check-Out if checked in but no checkout */}
                                    {todayRecord && !todayRecord.checkOut && (
                                      <button
                                        onClick={() =>
                                          recordAttendance(
                                            emp.id,
                                            attendanceDate,
                                            todayRecord.checkIn,
                                            "17:00",
                                            todayRecord.status,
                                          )
                                        }
                                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[10px] px-2 py-1 rounded-lg transition-all"
                                      >
                                        ⇥ Check-Out (17:00)
                                      </button>
                                    )}

                                    <button
                                      onClick={() =>
                                        setDetailHistoryEmpId(emp.id)
                                      }
                                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-[10px] px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                                    >
                                      Riwayat 📑
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Subtab Content: Leaves / Cuti */}
            {attendanceSubTabState === "leaves" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Form Pengajuan */}
                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Ajukan Cuti Baru (Leave Request)
                  </h4>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Karyawan
                    </label>
                    <select
                      value={leaveEmployeeId}
                      onChange={(e) => setLeaveEmployeeId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700"
                    >
                      <option value="">-- Pilih Staff --</option>
                      {employees
                        .filter(
                          (e) =>
                            e.tenantId === currentTenantId &&
                            e.branchId === currentBranchId,
                        )
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Tanggal Mulai
                      </label>
                      <input
                        type="date"
                        value={leaveStart}
                        onChange={(e) => setLeaveStart(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Tanggal Selesai
                      </label>
                      <input
                        type="date"
                        value={leaveEnd}
                        onChange={(e) => setLeaveEnd(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Jenis Cuti
                    </label>
                    <select
                      value={leaveType}
                      onChange={(e) => setLeaveType(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700"
                    >
                      <option value="ANNUAL">CUTI TAHUNAN (ANNUAL)</option>
                      <option value="SICK">SAKIT MEDIS (SICK)</option>
                      <option value="UNPAID">
                        CUTI DI LUAR TANGGUNGAN (UNPAID)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Alasan Cuti
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Contoh: Menikahkan adik, periksa kesehatan ke rumah sakit, dll."
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!leaveEmployeeId || !leaveReason) {
                        showToast(
                          "Silakan lengkapi seluruh kolom formulir cuti.",
                          "error",
                        );
                        return;
                      }
                      submitLeave(leaveEmployeeId, {
                        start: leaveStart,
                        end: leaveEnd,
                        type: leaveType,
                        reason: leaveReason,
                      });
                      setLeaveReason("");
                      showToast(
                        "Sukses mengirimkan pengajuan cuti staff!",
                        "success",
                      );
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer shadow-sm transition-all"
                  >
                    Kirim Pengajuan Cuti
                  </button>
                </div>

                {/* Right: List of Leaves */}
                <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Daftar Permohonan & Riwayat Cuti
                  </h4>
                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                    {employees
                      .filter(
                        (e) =>
                          e.tenantId === currentTenantId &&
                          e.branchId === currentBranchId,
                      )
                      .flatMap((emp) =>
                        (emp.leaves || []).map((l) => ({ emp, l })),
                      ).length === 0 ? (
                      <p className="text-center py-10 text-slate-400 text-xs">
                        Belum ada riwayat pengajuan cuti yang didaftarkan.
                      </p>
                    ) : (
                      employees
                        .filter(
                          (e) =>
                            e.tenantId === currentTenantId &&
                            e.branchId === currentBranchId,
                        )
                        .flatMap((emp) =>
                          (emp.leaves || []).map((l) => ({ emp, l })),
                        )
                        .sort((a, b) => b.l.start.localeCompare(a.l.start))
                        .map(({ emp, l }) => (
                          <div
                            key={l.id}
                            className="p-4 rounded-2xl border border-slate-150 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-850">
                                  {emp.name}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[8px] font-bold font-mono ${
                                    l.type === "ANNUAL"
                                      ? "bg-blue-100 text-blue-800"
                                      : l.type === "SICK"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-slate-200 text-slate-800"
                                  }`}
                                >
                                  {l.type === "ANNUAL"
                                    ? "TAHUNAN"
                                    : l.type === "SICK"
                                      ? "SAKIT"
                                      : "DI LUAR GAJI"}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-mono mt-1">
                                Periode: {l.start} s/d {l.end}
                              </p>
                              <p className="text-xs text-slate-600 italic mt-1 bg-white p-2 rounded-lg border border-slate-100">
                                "{l.reason}"
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {l.status === "PENDING" ? (
                                <>
                                  <button
                                    onClick={() => {
                                      approveLeave(emp.id, l.id, "APPROVED");
                                      showToast(
                                        "Cuti disetujui! Kehadiran staff otomatis dimutasi sesuai cuti.",
                                        "success",
                                      );
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                                  >
                                    ✓ Setujui
                                  </button>
                                  <button
                                    onClick={() => {
                                      approveLeave(emp.id, l.id, "REJECTED");
                                      showToast(
                                        "Pengajuan cuti ditolak.",
                                        "info",
                                      );
                                    }}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                                  >
                                    ✗ Tolak
                                  </button>
                                </>
                              ) : (
                                <span
                                  className={`px-2.5 py-1 rounded text-[9px] font-bold font-mono ${
                                    l.status === "APPROVED"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-slate-200 text-slate-500"
                                  }`}
                                >
                                  {l.status === "APPROVED"
                                    ? "APPROVED"
                                    : "REJECTED"}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            )}

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

            {/* Integrated Employee Performance & Financial Audit Center */}
            {detailHistoryEmpId &&
              (() => {
                const targetEmp = employees.find(
                  (e) => e.id === detailHistoryEmpId,
                );
                if (!targetEmp) return null;

                // 1. Audit Performance calculations
                const history = targetEmp.attendanceHistory || [];
                const totalDays = history.length;
                const presents = history.filter(
                  (h) => h.status === "PRESENT",
                ).length;
                const lates = history.filter((h) => h.status === "LATE").length;
                const absents = history.filter(
                  (h) => h.status === "ABSENT",
                ).length;
                const leaves = history.filter(
                  (h) => h.status === "LEAVE",
                ).length;

                const attendanceRate =
                  totalDays > 0
                    ? Math.round(((presents + lates) / totalDays) * 100)
                    : 100;
                const punctualityRate =
                  presents + lates > 0
                    ? Math.round((presents / (presents + lates)) * 100)
                    : 100;

                let performanceGrade = "A+ (EXCELLENT / SANGAT TELADAN)";
                let performanceDesc =
                  "Karyawan teladan dengan kehadiran sempurna dan ketepatan waktu yang sangat tinggi.";
                let gradeColor =
                  "text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400";

                if (attendanceRate < 75) {
                  performanceGrade = "D (UNDERPERFORMING / BUTUH PEMBINAAN)";
                  performanceDesc =
                    "Tingkat kehadiran di bawah standar minimal (75%). Diperlukan evaluasi formal oleh manajemen HRD.";
                  gradeColor =
                    "text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400";
                } else if (attendanceRate < 85 || punctualityRate < 80) {
                  performanceGrade = "C (FAIR / CUKUP DISIPLIN)";
                  performanceDesc =
                    "Kehadiran cukup baik, namun tingkat keterlambatan perlu dikurangi demi produktivitas tim.";
                  gradeColor =
                    "text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400";
                } else if (attendanceRate < 95 || punctualityRate < 90) {
                  performanceGrade = "B (GOOD / DISIPLIN BAIK)";
                  performanceDesc =
                    "Karyawan disiplin, bertanggung jawab, serta mematuhi aturan jam kerja cabang dengan baik.";
                  gradeColor =
                    "text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400";
                }

                // 2. Financial & Kasbon calculations
                const totalApprovedKasbon = (targetEmp.cashAdvances || [])
                  .filter((c) => c.status === "APPROVED")
                  .reduce((sum, c) => sum + c.amount, 0);
                const totalPaidKasbon = (targetEmp.cashAdvances || [])
                  .filter((c) => c.status === "PAID")
                  .reduce((sum, c) => sum + c.amount, 0);

                // Service tickets handled by this employee (as technician)
                const completedServices =
                  services?.filter(
                    (t) =>
                      t.assignedTechId === targetEmp.id &&
                      (t.status === ServiceStatus.SELESAI ||
                        t.status === ServiceStatus.DIAMBIL),
                  ) || [];
                const totalCommissionsEarned = completedServices.reduce(
                  (sum, t) => {
                    const baseCharge = t.estimatedCost || 0;
                    return sum + Math.round(baseCharge * 0.1); // 10% standard commission
                  },
                  0,
                );

                const handleSaveProfile = (e: React.FormEvent) => {
                  e.preventDefault();
                  if (!editEmpName || !editEmpPos || !editEmpEmail) {
                    showToast("Nama, Jabatan, dan Email wajib diisi.", "error");
                    return;
                  }
                  updateEmployee(targetEmp.id, {
                    name: editEmpName,
                    position: editEmpPos,
                    division: editEmpDiv,
                    contractStatus: editEmpContract,
                    basicSalary: editEmpSalary,
                    email: editEmpEmail,
                    phone: editEmpPhone,
                  });
                  showToast(
                    `Profil ${editEmpName} berhasil diperbarui secara permanen!`,
                    "success",
                  );
                };

                const handleRepayKasbon = async (caId: string) => {
                  if (
                    await showConfirm({
                      title: "Pelunasan Kasbon",
                      message:
                        "Apakah Anda yakin ingin melunasi kasbon ini secara manual? Status kasbon akan berubah menjadi PAID.",
                      confirmLabel: "Lunas (Manual)",
                    })
                  ) {
                    const advances = targetEmp.cashAdvances || [];
                    const updatedAdvances = advances.map((a) => {
                      if (a.id !== caId) return a;
                      return {
                        ...a,
                        status: "PAID" as const,
                        repaidAmount: a.amount,
                        approvedBy: currentUser.name,
                      };
                    });
                    updateEmployee(targetEmp.id, {
                      cashAdvances: updatedAdvances,
                    });
                    showToast(
                      "Kasbon berhasil dilunasi secara manual!",
                      "success",
                    );
                  }
                };

                return createPortal(
                  <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-zinc-800 animate-scaleUp flex flex-col max-h-[90vh]">
                      {/* Header Section */}
                      <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-xl">
                            {targetEmp.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-base text-slate-850 dark:text-zinc-200">
                                {targetEmp.name}
                              </h4>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-zinc-850 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {targetEmp.contractStatus}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {targetEmp.position} •{" "}
                              <span className="font-mono">
                                {targetEmp.division}
                              </span>
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setDetailHistoryEmpId(null)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 text-xs font-mono font-bold cursor-pointer border border-slate-200 dark:border-zinc-800 rounded-xl p-2 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all shadow-xs"
                        >
                          ✕ Tutup Pusat Audit
                        </button>
                      </div>

                      {/* Sub-navigation tabs */}
                      <div className="flex border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40 px-6 pt-2">
                        {[
                          {
                            id: "performance",
                            label: "📊 KPI Kinerja & Disiplin",
                            icon: "📊",
                          },
                          {
                            id: "finance",
                            label: "💰 Audit Keuangan & Kasbon",
                            icon: "💰",
                          },
                          {
                            id: "attendance",
                            label: "📅 Log Absensi Lengkap",
                            icon: "📅",
                          },
                          {
                            id: "edit",
                            label: "⚙️ Edit Profil & Gaji",
                            icon: "⚙️",
                          },
                        ].map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setEmployeeAuditTab(t.id as any)}
                            className={`px-4 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer ${
                              employeeAuditTab === t.id
                                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 border-indigo-550"
                                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200"
                            }`}
                          >
                            <span className="mr-1.5">{t.icon}</span> {t.label}
                          </button>
                        ))}
                      </div>

                      {/* Content Area - Scrollable */}
                      <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200">
                        {/* TAB 1: PERFORMANCE AUDIT */}
                        {employeeAuditTab === "performance" && (
                          <div className="space-y-6 animate-fadeIn">
                            {/* Grade Box */}
                            <div
                              className={`p-5 rounded-2xl border ${gradeColor} flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}
                            >
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                                  Hasil Evaluasi Kelayakan
                                </span>
                                <h5 className="text-lg font-black tracking-tight">
                                  {performanceGrade}
                                </h5>
                                <p className="text-xs leading-relaxed opacity-90">
                                  {performanceDesc}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-3xl font-black block tracking-tighter">
                                  {attendanceRate}%
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                                  Rasio Kehadiran
                                </span>
                              </div>
                            </div>

                            {/* Stats grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-150 dark:border-zinc-850 rounded-2xl">
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                  Hadir (On-Time)
                                </p>
                                <p className="text-xl font-black text-slate-800 dark:text-zinc-100 mt-1">
                                  {presents} Hari
                                </p>
                                <p className="text-[10px] text-slate-400 mt-1">
                                  Check-in sebelum batas shift
                                </p>
                              </div>
                              <div className="p-4 bg-amber-50/40 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl">
                                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                  Terlambat (Late)
                                </p>
                                <p className="text-xl font-black text-amber-700 dark:text-amber-400 mt-1">
                                  {lates} Hari
                                </p>
                                <p className="text-[10px] text-amber-500 mt-1 font-medium">
                                  Rasio terlambat:{" "}
                                  {totalDays > 0
                                    ? Math.round((lates / totalDays) * 100)
                                    : 0}
                                  %
                                </p>
                              </div>
                              <div className="p-4 bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl">
                                <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                                  Mangkir (Absent)
                                </p>
                                <p className="text-xl font-black text-rose-700 dark:text-rose-400 mt-1">
                                  {absents} Hari
                                </p>
                                <p className="text-[10px] text-rose-500 mt-1 font-medium font-mono">
                                  Tanpa keterangan sah
                                </p>
                              </div>
                              <div className="p-4 bg-blue-50/40 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl">
                                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                  Cuti / Izin Sakit
                                </p>
                                <p className="text-xl font-black text-blue-700 dark:text-blue-400 mt-1">
                                  {leaves} Hari
                                </p>
                                <p className="text-[10px] text-blue-500 mt-1 font-medium">
                                  Diajukan & disetujui HR
                                </p>
                              </div>
                            </div>

                            {/* KPI Metrics Breakdown */}
                            <div className="bg-slate-50 dark:bg-zinc-950 rounded-2xl p-5 border border-slate-150 dark:border-zinc-850 space-y-4">
                              <h5 className="font-extrabold text-xs text-slate-800 dark:text-zinc-300 uppercase tracking-wider">
                                Rincian KPI Disiplin & Produktivitas
                              </h5>
                              <div className="space-y-4">
                                <div>
                                  <div className="flex justify-between items-center text-xs mb-1">
                                    <span className="font-semibold text-slate-600 dark:text-zinc-400">
                                      Attendance Index (Rasio Kehadiran Total)
                                    </span>
                                    <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                                      {attendanceRate}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                                    <div
                                      className="bg-emerald-500 h-full rounded-full transition-all"
                                      style={{ width: `${attendanceRate}%` }}
                                    />
                                  </div>
                                </div>

                                <div>
                                  <div className="flex justify-between items-center text-xs mb-1">
                                    <span className="font-semibold text-slate-600 dark:text-zinc-400">
                                      Punctuality Rate (Tingkat Ketepatan Waktu)
                                    </span>
                                    <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                                      {punctualityRate}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                                    <div
                                      className="bg-indigo-500 h-full rounded-full transition-all"
                                      style={{ width: `${punctualityRate}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Audit Notes & Warnings */}
                            <div className="p-4 bg-indigo-50/30 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 text-xs leading-relaxed text-indigo-800 dark:text-indigo-400">
                              <p className="font-bold mb-1">
                                💡 Rekomendasi Audit Karyawan:
                              </p>
                              {attendanceRate >= 90 ? (
                                <p>
                                  Karyawan ini memiliki kinerja luar biasa.
                                  Berhak dipertimbangkan untuk mendapatkan
                                  komisi tambahan atau bonus performa bulanan.
                                </p>
                              ) : (
                                <p>
                                  Karyawan memiliki rekor absensi kurang dari
                                  optimal. Harap berikan arahan internal dan
                                  diskusikan kompensasi terkait pemotongan gaji
                                  pokok jika diperlukan.
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* TAB 2: FINANCIAL AUDIT */}
                        {employeeAuditTab === "finance" && (
                          <div className="space-y-6 animate-fadeIn">
                            {/* Summary row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="p-5 bg-emerald-50/40 dark:bg-emerald-950/15 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl text-center">
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                                  Gaji Pokok Bulanan
                                </span>
                                <span className="text-2xl font-black text-emerald-800 dark:text-emerald-400 mt-2 block font-mono">
                                  Rp{" "}
                                  {targetEmp.basicSalary?.toLocaleString() ||
                                    "3,500,000"}
                                </span>
                              </div>
                              <div className="p-5 bg-rose-50/40 dark:bg-rose-950/15 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-center">
                                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                                  Total Kasbon Aktif
                                </span>
                                <span className="text-2xl font-black text-rose-800 dark:text-rose-400 mt-2 block font-mono">
                                  Rp {totalApprovedKasbon.toLocaleString()}
                                </span>
                                <span className="text-[9px] text-rose-500 mt-1 block">
                                  Akan dipotong otomatis pada payroll berikutnya
                                </span>
                              </div>
                              <div className="p-5 bg-blue-50/40 dark:bg-blue-950/15 border border-blue-100 dark:border-blue-900/30 rounded-2xl text-center">
                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                                  Estimasi Komisi Servis
                                </span>
                                <span className="text-2xl font-black text-blue-800 dark:text-blue-400 mt-2 block font-mono">
                                  Rp {totalCommissionsEarned.toLocaleString()}
                                </span>
                                <span className="text-[9px] text-blue-500 mt-1 block">
                                  Total 10% jasa servis terselesaikan
                                </span>
                              </div>
                            </div>

                            {/* Kasbon (Cash Advances) Audit */}
                            <div className="space-y-3">
                              <h5 className="font-extrabold text-xs text-slate-800 dark:text-zinc-300 uppercase tracking-wider">
                                Histori Kasbon & Pinjaman Staff
                              </h5>
                              <div className="bg-white dark:bg-zinc-950 border border-slate-150 dark:border-zinc-850 rounded-2xl overflow-hidden shadow-xs">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-50 dark:bg-zinc-900 text-slate-400 dark:text-slate-500 font-mono text-[10px] uppercase border-b border-slate-100 dark:border-zinc-850">
                                    <tr>
                                      <th className="px-4 py-3">
                                        Tanggal Pengajuan
                                      </th>
                                      <th className="px-4 py-3">
                                        Deskripsi Alasan
                                      </th>
                                      <th className="px-4 py-3 text-right">
                                        Nominal
                                      </th>
                                      <th className="px-4 py-3">Status</th>
                                      <th className="px-4 py-3 text-right">
                                        Tindakan
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                    {!targetEmp.cashAdvances ||
                                    targetEmp.cashAdvances.length === 0 ? (
                                      <tr>
                                        <td
                                          colSpan={5}
                                          className="text-center py-6 text-slate-400 dark:text-slate-500 italic"
                                        >
                                          Tidak ada pengajuan kasbon terdaftar
                                          untuk staff ini.
                                        </td>
                                      </tr>
                                    ) : (
                                      targetEmp.cashAdvances.map((ca) => (
                                        <tr
                                          key={ca.id}
                                          className="hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors"
                                        >
                                          <td className="px-4 py-3 font-mono">
                                            {ca.date}
                                          </td>
                                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">
                                            {ca.reason}
                                          </td>
                                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-850 dark:text-zinc-200">
                                            Rp {ca.amount.toLocaleString()}
                                          </td>
                                          <td className="px-4 py-3">
                                            <span
                                              className={`px-2 py-0.5 rounded text-[8px] font-bold font-mono tracking-wider ${
                                                ca.status === "PENDING"
                                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                                                  : ca.status === "APPROVED"
                                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                                                    : ca.status === "PAID"
                                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-450"
                                                      : "bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:text-slate-400"
                                              }`}
                                            >
                                              {ca.status === "PAID"
                                                ? "PAID (LUNAS)"
                                                : ca.status}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 text-right">
                                            {ca.status === "APPROVED" && (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleRepayKasbon(ca.id)
                                                }
                                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/35 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/30 text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer transition-all"
                                              >
                                                Selesaikan Lunaskan 💸
                                              </button>
                                            )}
                                            {ca.status !== "APPROVED" && (
                                              <span className="text-slate-300 dark:text-zinc-700">
                                                -
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Technician Commissions (Calculated dynamically) */}
                            {targetEmp.division === "Technical Repair" && (
                              <div className="space-y-3">
                                <h5 className="font-extrabold text-xs text-slate-800 dark:text-zinc-300 uppercase tracking-wider">
                                  Histori Komisi Jasa Servis Teknisi
                                </h5>
                                <div className="bg-white dark:bg-zinc-950 border border-slate-150 dark:border-zinc-850 rounded-2xl overflow-hidden shadow-xs">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-zinc-900 text-slate-400 dark:text-slate-500 font-mono text-[10px] uppercase border-b border-slate-100 dark:border-zinc-850">
                                      <tr>
                                        <th className="px-4 py-3">ID Tiket</th>
                                        <th className="px-4 py-3">
                                          Nama Unit Handled
                                        </th>
                                        <th className="px-4 py-3 text-right">
                                          Jasa Servis
                                        </th>
                                        <th className="px-4 py-3 text-right">
                                          Rasio Komisi
                                        </th>
                                        <th className="px-4 py-3 text-right">
                                          Komisi Bersih
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                      {completedServices.length === 0 ? (
                                        <tr>
                                          <td
                                            colSpan={5}
                                            className="text-center py-6 text-slate-400 dark:text-slate-500 italic"
                                          >
                                            Belum ada tiket servis yang
                                            diselesaikan oleh teknisi ini.
                                          </td>
                                        </tr>
                                      ) : (
                                        completedServices.map((t) => (
                                          <tr
                                            key={t.id}
                                            className="hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors"
                                          >
                                            <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                                              {t.ticketNo}
                                            </td>
                                            <td className="px-4 py-3 text-slate-700 dark:text-zinc-300 font-medium">
                                              {t.deviceName} (
                                              {t.deviceBrandModel})
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono">
                                              Rp{" "}
                                              {(
                                                t.estimatedCost || 0
                                              ).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-400 font-mono">
                                              10%
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                                              Rp{" "}
                                              {Math.round(
                                                (t.estimatedCost || 0) * 0.1,
                                              ).toLocaleString()}
                                            </td>
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                              </div>
                            </div>
                          )}
                          </div>
                        )}

                        {/* TAB 3: ATTENDANCE HISTORY */}
                        {employeeAuditTab === "attendance" && (
                          <div className="space-y-4 animate-fadeIn">
                            <h5 className="font-extrabold text-xs text-slate-800 dark:text-zinc-300 uppercase tracking-wider">
                              Log Rekam Kehadiran Harian Lengkap
                            </h5>
                            <div className="space-y-2">
                              {(targetEmp.attendanceHistory || []).length ===
                              0 ? (
                                <p className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs italic">
                                  Belum ada catatan absensi sebelumnya untuk
                                  karyawan ini.
                                </p>
                              ) : (
                                [...(targetEmp.attendanceHistory || [])]
                                  .sort((a, b) => b.date.localeCompare(a.date))
                                  .map((h, i) => (
                                    <div
                                      key={i}
                                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-zinc-850 bg-slate-50/50 dark:bg-zinc-950/40 gap-3 text-xs"
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                                          {h.date}
                                        </span>
                                        <span
                                          className={`px-2.5 py-0.5 rounded-full text-[8px] font-bold font-mono tracking-wider ${
                                            h.status === "PRESENT"
                                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                                              : h.status === "LATE"
                                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                                                : h.status === "ABSENT"
                                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
                                                  : "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
                                          }`}
                                        >
                                          {h.status === "PRESENT"
                                            ? "PRESENT (ON-TIME)"
                                            : h.status}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                                        <span>
                                          Check-In:{" "}
                                          <strong className="text-slate-700 dark:text-zinc-300">
                                            {h.checkIn}
                                          </strong>
                                        </span>
                                        <span className="text-slate-300 dark:text-zinc-850">
                                          |
                                        </span>
                                        <span>
                                          Check-Out:{" "}
                                          <strong className="text-slate-700 dark:text-zinc-300">
                                            {h.checkOut || "-"}
                                          </strong>
                                        </span>
                                        {h.workHours !== undefined && (
                                          <>
                                            <span className="text-slate-300 dark:text-zinc-850">
                                              |
                                            </span>
                                            <span>
                                              Hours:{" "}
                                              <strong className="text-slate-700 dark:text-zinc-300">
                                                {h.workHours} Jam
                                              </strong>
                                            </span>
                                          </>
                                        )}
                                        {h.clockInDistance !== undefined && (
                                          <>
                                            <span className="text-slate-300 dark:text-zinc-850">
                                              |
                                            </span>
                                            <span
                                              className={
                                                h.clockInValid
                                                  ? "text-emerald-600 dark:text-emerald-400"
                                                  : "text-rose-600 dark:text-rose-400"
                                              }
                                            >
                                              GPS:{" "}
                                              {Math.round(h.clockInDistance)}m{" "}
                                              {h.clockInValid
                                                ? "✓ Valid"
                                                : "⚠ Jauh"}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  ))
                              )}
                            </div>
                          </div>
                        )}

                        {/* TAB 4: EDIT PROFILE & SALARY */}
                        {employeeAuditTab === "edit" && (
                          <form
                            onSubmit={handleSaveProfile}
                            className="space-y-5 animate-fadeIn"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                  Nama Lengkap Karyawan
                                </label>
                                <input
                                  type="text"
                                  value={editEmpName}
                                  onChange={(e) =>
                                    setEditEmpName(e.target.value)
                                  }
                                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors font-medium"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                  Jabatan / Posisi
                                </label>
                                <input
                                  type="text"
                                  value={editEmpPos}
                                  onChange={(e) =>
                                    setEditEmpPos(e.target.value)
                                  }
                                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors font-medium"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                  Divisi Kerja
                                </label>
                                <select
                                  value={editEmpDiv}
                                  onChange={(e) =>
                                    setEditEmpDiv(e.target.value)
                                  }
                                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors font-medium"
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
                                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                  Status Kontrak
                                </label>
                                <select
                                  value={editEmpContract}
                                  onChange={(e) =>
                                    setEditEmpContract(e.target.value as any)
                                  }
                                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors font-medium"
                                >
                                  <option value="PERMANENT">
                                    KARYAWAN TETAP (PERMANENT)
                                  </option>
                                  <option value="CONTRACT">
                                    KONTRAK BERKALA (CONTRACT)
                                  </option>
                                  <option value="INTERN">
                                    MAGANG (INTERN)
                                  </option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                  Gaji Pokok Bulanan (IDR)
                                </label>
                                <input
                                  type="number"
                                  value={editEmpSalary}
                                  onChange={(e) =>
                                    setEditEmpSalary(e.target.value)
                                  }
                                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors font-medium"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                  Alamat Email
                                </label>
                                <input
                                  type="email"
                                  value={editEmpEmail}
                                  onChange={(e) =>
                                    setEditEmpEmail(e.target.value)
                                  }
                                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors font-medium"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                  Nomor Telepon / WhatsApp
                                </label>
                                <input
                                  type="text"
                                  value={editEmpPhone}
                                  onChange={(e) =>
                                    setEditEmpPhone(e.target.value)
                                  }
                                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors font-medium"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-zinc-800 font-bold">
                              <button
                                type="submit"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all"
                              >
                                ✓ Simpan Perubahan Profil & Gaji
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>,
                  document.body
                );
              })()}
          </div>
  );
};
