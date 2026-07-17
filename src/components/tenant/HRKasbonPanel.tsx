import * as React from "react";
import { PlusCircle, FileText, AlertCircle, Calendar } from "lucide-react";
import { AccountType } from "../../types";
export const HRKasbonPanel: React.FC<any> = (props) => {
  const { activeSubTab, employees, currentTenantId, currentBranchId, currentUser, accounts, newKasbonEmpId, newKasbonAmount, newKasbonReason, showAddKasbonModal, setNewKasbonEmpId, setNewKasbonAmount, setNewKasbonReason, setShowAddKasbonModal, setKasbonToApprove, setSelectedKasbonSource, showConfirm, updateEmployee, addLog, approveCashAdvance } = props;
  if (activeSubTab !== "kasbon") return null;
  return (
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  Pengajuan Kasbon Karyawan
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Kelola permohonan pinjaman awal/kasbon dari staff dan teknisi.
                </p>
              </div>
              <button
                onClick={() => {
                  setNewKasbonEmpId("");
                  setNewKasbonAmount("");
                  setNewKasbonReason("");
                  setShowAddKasbonModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Ajukan Kasbon (Admin)
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Karyawan
                    </th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Nominal
                    </th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Alasan
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
                  {employees
                    .filter(
                      (e) =>
                        e.tenantId === currentTenantId &&
                        e.branchId === currentBranchId,
                    )
                    .flatMap((emp) =>
                      (emp.cashAdvances || []).map((ca) => ({
                        ...ca,
                        employeeName: emp.name,
                        employeeId: emp.id,
                        position: emp.position,
                      })),
                    )
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime(),
                    )
                    .map((ca) => (
                      <tr
                        key={ca.id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm text-slate-700">
                          {ca.date}
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm font-bold text-slate-800">
                            {ca.employeeName}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {ca.position}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-sm font-bold text-slate-700">
                          Rp {ca.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {ca.reason}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                              ca.status === "PENDING"
                                ? "bg-amber-100 text-amber-700"
                                : ca.status === "APPROVED"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : ca.status === "PAID"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {ca.status === "PAID"
                              ? "PAID (DIPOTONG GAJI)"
                              : ca.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {ca.status === "PENDING" && (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  setKasbonToApprove({
                                    employeeId: ca.employeeId,
                                    advanceId: ca.id,
                                    amount: ca.amount,
                                    empName: ca.employeeName,
                                    reason: ca.reason,
                                  });
                                  const defaultSource =
                                    accounts.find(
                                      (a) =>
                                        a.type === AccountType.ASSET &&
                                        a.tenantId === currentTenantId,
                                    )?.id || "";
                                  setSelectedKasbonSource(defaultSource);
                                }}
                                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[10px] font-bold"
                              >
                                Setujui
                              </button>
                              <button
                                onClick={() =>
                                  approveCashAdvance(
                                    ca.employeeId,
                                    ca.id,
                                    "REJECTED",
                                    currentUser.name,
                                  )
                                }
                                className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-[10px] font-bold"
                              >
                                Tolak
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
  );
};
