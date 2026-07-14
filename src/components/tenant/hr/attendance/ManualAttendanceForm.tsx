import * as React from "react";
import { Plus } from "lucide-react";

export const ManualAttendanceForm: React.FC<any> = ({ employees, currentTenantId, currentBranchId, attendanceEmployeeId, setAttendanceEmployeeId, attendanceInTime, setAttendanceInTime, attendanceOutTime, setAttendanceOutTime, attendanceManualStatus, setAttendanceManualStatus, attendanceDate, recordAttendance, showToast }) => (
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
);
