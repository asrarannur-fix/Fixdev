import * as React from "react";
import { COAAccount as Account } from "../../../types";
import { AccountType } from "../../../types";

interface ChartOfAccountsProps {
  accounts: Account[];
  currentTenantId: string;
}

export const ChartOfAccounts: React.FC<ChartOfAccountsProps> = ({ accounts, currentTenantId }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
        <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
          Chart of Accounts (COA) Tenant
        </h3>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-xs">
        <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-mono">
          <tr>
            <th className="px-4 py-3">Kode Akun</th>
            <th className="px-4 py-3">Nama Rekening</th>
            <th className="px-4 py-3">Klasifikasi</th>
            <th className="px-4 py-3 text-right">Saldo Saat Ini</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {accounts
            .filter((acc) => acc.tenantId === currentTenantId)
            .map((acc) => (
              <tr key={acc.id} className="hover:bg-slate-50">
                <td className="px-4 py-3.5 font-mono font-bold text-slate-700">
                  {acc.code}
                </td>
                <td className="px-4 py-3.5 font-semibold text-slate-800">
                  {acc.name}
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                      acc.type === AccountType.ASSET
                        ? "bg-blue-100 text-blue-800"
                        : acc.type === AccountType.REVENUE
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {acc.type}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800">
                  Rp {(acc.balance ?? 0).toLocaleString()}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      </div>
    </div>
  );
};
