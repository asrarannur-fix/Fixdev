import * as React from 'react';
import { useSaaS } from '../../../context/SaaSContext';

export const PayrollBreakdown: React.FC<{ activeSubTab: string }> = ({ activeSubTab }) => {
  const { payroll, currentTenantId } = useSaaS();
  if (activeSubTab !== 'payroll') return null;

  const rows = payroll.filter((p) => p.tenantId === currentTenantId);

  const fmt = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID');

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <h3 className="font-bold text-xs uppercase text-slate-800 tracking-wider mb-4">
        Riwayat Slip Gaji (Payroll)
      </h3>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400">Belum ada payroll diproses untuk cabang ini.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase">
                  Periode
                </th>
                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase">
                  Karyawan
                </th>
                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase">Pokok</th>
                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase">Komisi</th>
                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase">Lembur</th>
                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase">
                  Potongan
                </th>
                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase">Bersih</th>
                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-3 text-xs font-semibold text-slate-700">{p.monthYear}</td>
                  <td className="py-2 px-3 text-xs text-slate-600">{p.employeeId}</td>
                  <td className="py-2 px-3 text-xs text-slate-600">{fmt(p.basicSalary)}</td>
                  <td className="py-2 px-3 text-xs text-slate-600">{fmt(p.commissions)}</td>
                  <td className="py-2 px-3 text-xs text-slate-600">{fmt(p.overtimePay)}</td>
                  <td className="py-2 px-3 text-xs text-slate-600">{fmt(p.deductions)}</td>
                  <td className="py-2 px-3 text-xs font-bold text-slate-800">{fmt(p.netSalary)}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
