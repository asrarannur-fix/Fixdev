import * as React from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { COAAccount as Account, AccountType } from "../../../types";

interface FinancialStatementsProps {
  tenantAccounts: Account[];
  monthlyData: any[];
  monthlyBreakdown: any;
  selectedFinanceMonth: string;
  setSelectedFinanceMonth: (m: string) => void;
}

export const FinancialStatements: React.FC<FinancialStatementsProps> = ({ 
  tenantAccounts, monthlyData, monthlyBreakdown, selectedFinanceMonth, setSelectedFinanceMonth 
}) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Grafik Profitabilitas Usaha
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Tren Pemasukan, Pengeluaran, & Laba Bersih Bulanan
            </p>
          </div>
        </div>

        <div className="h-[280px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `Rp ${(val / 1000000).toFixed(1)}jt`} />
              <Tooltip formatter={(value: any) => [`Rp ${value !== undefined && value !== null ? value.toLocaleString("id-ID") : "0"}`]} contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "none", color: "#fff", fontSize: "11px" }} />
              <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="profit" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
