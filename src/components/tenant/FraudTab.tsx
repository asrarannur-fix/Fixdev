import * as React from "react";
import { FraudDetector } from "../FraudDetector";
import {
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Zap,
  Target,
  Download,
} from "lucide-react";
import { useSaaS } from "../../context/SaaSContext";

interface FraudTabProps {
  activeSubTab: string;
}

export const FraudTab: React.FC<FraudTabProps> = ({ activeSubTab }) => {
  const { auditLogs, currentTenantId } = useSaaS();

  return (
    <>
      <div className="space-y-6" id="fraud-pane">
        {activeSubTab === "audit-log" && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden animate-fadeIn">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-zinc-100 uppercase tracking-tight">
                  Audit Trail Operasional
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Logging ketat seluruh aktivitas CRUD dan akses data sensitif.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl text-slate-400 transition cursor-pointer">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Feature 7: Enhanced Audit Log Detailed Table */}
            <div className="responsive-table-container max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-400 uppercase text-[9px] font-mono border-b border-slate-100 dark:border-zinc-800 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3">Timestamp</th>
                    <th className="px-6 py-3">User</th>
                    <th className="px-6 py-3">Kategori</th>
                    <th className="px-6 py-3">Aksi</th>
                    <th className="px-6 py-3">Detail Perubahan</th>
                    <th className="px-6 py-3 text-right">Risiko</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-zinc-800/50">
                  {auditLogs
                    .filter((l) => l.tenantId === currentTenantId)
                    .map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors"
                      >
                        <td className="px-6 py-4 font-mono text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700 dark:text-zinc-200">
                          {log.userName}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-[9px] font-bold uppercase tracking-wider">
                            {log.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-800 dark:text-zinc-100">
                          {log.action}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-zinc-400 italic">
                          {log.details}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                              log.riskLevel === "HIGH"
                                ? "bg-rose-100 text-rose-800 animate-pulse"
                                : log.riskLevel === "MEDIUM"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {log.riskLevel}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === "fraud-alert" && <FraudDetector />}
      </div>
    </>
  );
};
