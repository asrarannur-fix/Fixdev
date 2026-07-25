import * as React from 'react';
import { PlusCircle, FileText, AlertCircle, Calendar } from 'lucide-react';
import { AccountType } from '../../types';
import { useSaaS } from '../../context/SaaSContext';

export const HRKasbonPanel: React.FC<any> = (props) => {
  const {
    activeSubTab,
    employees,
    currentTenantId,
    currentBranchId,
    currentUser,
    accounts,
    updateEmployee,
    approveCashAdvance,
  } = props;
  const { requestCashAdvance } = useSaaS();

  const [showAddKasbonModal, setShowAddKasbonModal] = React.useState(false);
  const [newKasbonEmpId, setNewKasbonEmpId] = React.useState('');
  const [newKasbonAmount, setNewKasbonAmount] = React.useState('');
  const [newKasbonReason, setNewKasbonReason] = React.useState('');
  const [kasbonToApprove, setKasbonToApprove] = React.useState<any>(null);
  const [selectedKasbonSource, setSelectedKasbonSource] = React.useState('');

  if (activeSubTab !== 'kasbon') return null;

  const tenantEmployees = employees.filter(
    (e: any) => e.tenantId === currentTenantId && e.branchId === currentBranchId
  );

  const handleSubmitKasbon = () => {
    const amount = Number(newKasbonAmount);
    if (!newKasbonEmpId || !amount || amount <= 0 || !newKasbonReason.trim()) return;
    requestCashAdvance(newKasbonEmpId, {
      amount,
      reason: newKasbonReason.trim(),
      date: new Date().toISOString().slice(0, 10),
    });
    setNewKasbonEmpId('');
    setNewKasbonAmount('');
    setNewKasbonReason('');
    setShowAddKasbonModal(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-bold text-lg text-slate-900">Pengajuan Kasbon Karyawan</h3>
          <p className="text-xs text-slate-500 mt-1">
            Kelola permohonan pinjaman awal/kasbon dari staff dan teknisi.
          </p>
        </div>
        <button
          onClick={() => {
            setNewKasbonEmpId('');
            setNewKasbonAmount('');
            setNewKasbonReason('');
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
            {tenantEmployees
              .flatMap((emp: any) =>
                (emp.cashAdvances || []).map((ca: any) => ({
                  ...ca,
                  employeeName: emp.name,
                  employeeId: emp.id,
                  position: emp.position,
                }))
              )
              .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((ca: any) => (
                <tr
                  key={ca.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 px-4 text-sm text-slate-700">{ca.date}</td>
                  <td className="py-3 px-4">
                    <p className="text-sm font-bold text-slate-800">{ca.employeeName}</p>
                    <p className="text-[10px] text-slate-500">{ca.position}</p>
                  </td>
                  <td className="py-3 px-4 text-sm font-bold text-slate-700">
                    Rp {ca.amount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{ca.reason}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                        ca.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-700'
                          : ca.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : ca.status === 'PAID'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {ca.status === 'PAID' ? 'PAID (DIPOTONG GAJI)' : ca.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {ca.status === 'PENDING' && (
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
                                (a: any) =>
                                  a.type === AccountType.ASSET && a.tenantId === currentTenantId
                              )?.id || '';
                            setSelectedKasbonSource(defaultSource);
                          }}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[10px] font-bold"
                        >
                          Setujui
                        </button>
                        <button
                          onClick={() =>
                            approveCashAdvance(ca.employeeId, ca.id, 'REJECTED', currentUser.name)
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

      {/* Add Kasbon modal */}
      {showAddKasbonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h4 className="font-bold text-slate-900 mb-4">Ajukan Kasbon Baru</h4>
            <label className="block text-xs font-bold text-slate-500 mb-1">Karyawan</label>
            <select
              value={newKasbonEmpId}
              onChange={(e) => setNewKasbonEmpId(e.target.value)}
              className="w-full mb-3 border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Pilih karyawan</option>
              {tenantEmployees.map((e: any) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <label className="block text-xs font-bold text-slate-500 mb-1">Nominal (Rp)</label>
            <input
              type="number"
              value={newKasbonAmount}
              onChange={(e) => setNewKasbonAmount(e.target.value)}
              className="w-full mb-3 border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="0"
            />
            <label className="block text-xs font-bold text-slate-500 mb-1">Alasan</label>
            <textarea
              value={newKasbonReason}
              onChange={(e) => setNewKasbonReason(e.target.value)}
              className="w-full mb-4 border border-slate-300 rounded-lg px-3 py-2 text-sm"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddKasbonModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitKasbon}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700"
              >
                Ajukan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Kasbon modal */}
      {kasbonToApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h4 className="font-bold text-slate-900 mb-2">Setujui Kasbon</h4>
            <p className="text-sm text-slate-600 mb-1">
              Karyawan: <b>{kasbonToApprove.empName}</b>
            </p>
            <p className="text-sm text-slate-600 mb-4">
              Nominal: Rp {Number(kasbonToApprove.amount).toLocaleString()}
            </p>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              Sumber Dana (Kas/Bank)
            </label>
            <select
              value={selectedKasbonSource}
              onChange={(e) => setSelectedKasbonSource(e.target.value)}
              className="w-full mb-4 border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Pilih sumber dana</option>
              {accounts
                .filter((a: any) => a.type === AccountType.ASSET && a.tenantId === currentTenantId)
                .map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setKasbonToApprove(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  approveCashAdvance(
                    kasbonToApprove.employeeId,
                    kasbonToApprove.advanceId,
                    'APPROVED',
                    currentUser.name
                  );
                  setKasbonToApprove(null);
                }}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700"
              >
                Setujui
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
