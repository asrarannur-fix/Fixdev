import * as React from "react";

export const LeaveRequestsPanel: React.FC<any> = ({ employees, currentTenantId, currentBranchId, leaveEmployeeId, setLeaveEmployeeId, leaveStart, setLeaveStart, leaveEnd, setLeaveEnd, leaveType, setLeaveType, leaveReason, setLeaveReason, submitLeave, approveLeave, showToast }) => (
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
);
