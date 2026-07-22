import * as React from "react";
import { Lock } from "lucide-react";
import { ManualAttendanceForm } from "./ManualAttendanceForm";

export const AttendanceLogPanel: React.FC<any> = (props) => {
  const { employees, currentTenantId, currentBranchId, attendanceDate, setAttendanceDate, bulkCheckIn, showToast, currentUserPermissions, showPrompt, updateEmployee, recordAttendance, setDetailHistoryEmpId } = props;
  return (
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
      <ManualAttendanceForm {...props} />
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
                                      <p className="font-bold text-slate-800 leading-tight">
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
                                        className="text-accent hover:text-indigo-800 p-1 hover:bg-accent-lighter rounded-md transition-all cursor-pointer"
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
  );
};
