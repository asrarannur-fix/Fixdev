import React, { useState, useMemo } from "react";
import { useSaaS } from "../../../context/SaaSContext";
import { useToast } from "../../ui/Toast";
import { Customer, CustomerSegment } from "../../../types";
import { Database, Users, RefreshCw, ArrowRight } from "lucide-react";

interface SegmentDef {
  id: string;
  name: string;
  description: string;
  color: string;
  bgColor: string;
  filter: (c: Customer) => boolean;
}

export const SegmentEngine: React.FC = () => {
  const { customers, currentTenantId, updateCustomer, computeCustomerSegment } = useSaaS();
  const { showToast } = useToast();
  const [isComputing, setIsComputing] = useState(false);

  const tenantCustomers = customers.filter((c) => c.tenantId === currentTenantId);

  const segments: SegmentDef[] = [
    { id: "CHAMPION", name: "Champion", description: "Total spend > Rp10.000.000", color: "text-purple-700", bgColor: "bg-purple-100", filter: (c) => (c.totalSpend || 0) > 10000000 },
    { id: "VIP", name: "VIP", description: "Total spend > Rp5.000.000", color: "text-amber-700", bgColor: "bg-amber-100", filter: (c) => (c.totalSpend || 0) > 5000000 && (c.totalSpend || 0) <= 10000000 },
    { id: "ACTIVE", name: "Aktif", description: "Lebih dari 5 kali servis", color: "text-emerald-700", bgColor: "bg-emerald-100", filter: (c) => (c.visitCount || 0) > 5 },
    { id: "COLD", name: "Pasif", description: "Tidak servis > 6 bulan", color: "text-blue-700", bgColor: "bg-blue-100", filter: (c) => {
      if (!c.lastServiceDate) return true;
      const months = (Date.now() - new Date(c.lastServiceDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
      return months > 6;
    }},
    { id: "NEW", name: "Baru", description: "Belum pernah servis", color: "text-slate-700", bgColor: "bg-slate-100", filter: (c) => !c.lastServiceDate },
    { id: "CORPORATE", name: "Corporate", description: "Segmen bisnis B2B", color: "text-indigo-700", bgColor: "bg-indigo-100", filter: (c) => c.segment === "CORPORATE" },
  ];

  const segmentCounts = useMemo(() => {
    return segments.map((s) => ({
      ...s,
      count: tenantCustomers.filter(s.filter).length,
    }));
  }, [tenantCustomers, segments]);

  const handleRecompute = () => {
    setIsComputing(true);
    let count = 0;
    tenantCustomers.forEach((c) => {
      const newSegment = computeCustomerSegment(c);
      if (newSegment !== c.segment) {
        updateCustomer(c.id, { segment: newSegment });
        count++;
      }
    });
    setTimeout(() => {
      setIsComputing(false);
      showToast(`Segmen diperbarui untuk ${count} pelanggan`, "success");
    }, 800);
  };

  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const filteredCustomers = selectedSegment
    ? tenantCustomers.filter(segments.find((s) => s.id === selectedSegment)?.filter || (() => false))
    : [];

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Dynamic Segmentation</h3>
          </div>
          <button onClick={handleRecompute} disabled={isComputing} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
            <RefreshCw className={`w-3 h-3 ${isComputing ? "animate-spin" : ""}`} /> Hitung Ulang Segmen
          </button>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-3 gap-3 mb-4">
            {segmentCounts.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSegment(selectedSegment === s.id ? null : s.id)}
                className={`${s.bgColor} border-2 ${selectedSegment === s.id ? "border-slate-800" : "border-transparent"} rounded-xl p-4 text-left transition-all hover:shadow-sm`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold ${s.color}`}>{s.name}</span>
                  <span className={`text-lg font-bold ${s.color}`}>{s.count}</span>
                </div>
                <p className="text-[10px] text-slate-500">{s.description}</p>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                  <Users className="w-3 h-3" /> {s.count} pelanggan
                  <ArrowRight className="w-3 h-3 ml-auto" />
                </div>
              </button>
            ))}
          </div>

          {selectedSegment && (
            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-xs font-bold text-slate-700 mb-3">
                Pelanggan di segmen "{segments.find((s) => s.id === selectedSegment)?.name}"
              </h4>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-mono">
                  <tr>
                    <th className="px-3 py-2">Nama</th>
                    <th className="px-3 py-2">Telepon</th>
                    <th className="px-3 py-2">Total Spend</th>
                    <th className="px-3 py-2">Loyalty Pts</th>
                    <th className="px-3 py-2">Segmen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">Tidak ada pelanggan di segmen ini</td></tr>
                  ) : (
                    filteredCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-bold text-slate-800">{c.name}</td>
                        <td className="px-3 py-2 text-slate-500">{c.phone}</td>
                        <td className="px-3 py-2 font-mono text-emerald-600">Rp {(c.totalSpend || 0).toLocaleString()}</td>
                        <td className="px-3 py-2 font-mono">{c.loyaltyPoints || 0} pts</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${segments.find((s) => s.id === c.segment)?.bgColor} ${segments.find((s) => s.id === c.segment)?.color}`}>
                            {c.segment}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
