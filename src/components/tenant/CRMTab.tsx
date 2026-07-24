import * as React from "react";
import { useState } from "react";
import { useSaaS } from "../../context/SaaSContext";
import { useToast } from "../ui/Toast";
import { CustomerActivityFeed } from "../CustomerActivityFeed";
import { B2BPipeline } from "../B2BPipeline";
import { QuotationList, QuotationForm, CampaignManager, LoyaltyManager, SegmentEngine, FollowUpManager } from "./crm";
import { Customer, CRMQuotation } from "../../types";

interface CRMTabProps {
  activeSubTab: string;
}

export const CRMTab: React.FC<CRMTabProps> = ({ activeSubTab }) => {
  const { customers, currentTenantId } = useSaaS();
  const { showToast } = useToast();
  const [selectedCrmCustomerId, setSelectedCrmCustomerId] = useState<string | null>(null);
  const [quotationCustomerId, setQuotationCustomerId] = useState<string | null>(null);
  const [editingQuotation, setEditingQuotation] = useState<CRMQuotation | undefined>();

  const tenantCustomers = React.useMemo(
    () => customers.filter((c) => c.tenantId === currentTenantId),
    [customers, currentTenantId],
  );

  const handleQuotationEdit = (customerId: string, quotation?: CRMQuotation) => {
    setQuotationCustomerId(customerId);
    setEditingQuotation(quotation);
  };

  return (
    <>
      <div className="space-y-6" id="crm-pane">
        {activeSubTab === "customers" && selectedCrmCustomerId ? (
          <CustomerActivityFeed
            customerId={selectedCrmCustomerId}
            onBack={() => setSelectedCrmCustomerId(null)}
          />
        ) : (
          activeSubTab === "customers" && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-fadeIn">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Database CRM Pelanggan
                </h3>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold font-mono">
                  SaaS CRM Module
                </span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-mono">
                  <tr>
                    <th className="px-4 py-3">Nama Pelanggan</th>
                    <th className="px-4 py-3">Segment</th>
                    <th className="px-4 py-3">Loyalty Points</th>
                    <th className="px-4 py-3">Store Credit</th>
                    <th className="px-4 py-3 font-mono">Referral Code</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenantCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-800">{c.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {c.phone} · {c.email}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                            c.segment === "CORPORATE"
                              ? "bg-purple-100 text-purple-800"
                              : c.segment === "VIP"
                              ? "bg-amber-100 text-amber-800"
                              : c.segment === "CHAMPION"
                              ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                              : c.segment === "COLD"
                              ? "bg-blue-100 text-blue-800"
                              : c.segment === "NEW"
                              ? "bg-slate-100 text-slate-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {c.segment}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-700">
                        {c.loyaltyPoints ?? 0} pts
                      </td>
                      <td className="px-4 py-3.5 font-mono text-emerald-600">
                        Rp {(c.storeCredit ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-400">
                        {c.referralCode || "-"}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedCrmCustomerId(c.id)}
                          className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-slate-800 dark:text-slate-200 border border-blue-200/40 dark:border-slate-700 font-extrabold text-[10.5px] px-3 py-1 rounded-lg cursor-pointer transition duration-200"
                        >
                          Profil &amp; Aktivitas
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {activeSubTab === "pipeline" && <B2BPipeline />}

        {activeSubTab === "quotations" && (
          quotationCustomerId ? (
            <QuotationForm
              customerId={quotationCustomerId}
              quotation={editingQuotation}
              onClose={() => { setQuotationCustomerId(null); setEditingQuotation(undefined); }}
            />
          ) : (
            <QuotationList onEdit={handleQuotationEdit} />
          )
        )}

        {activeSubTab === "campaigns" && <CampaignManager />}

        {activeSubTab === "loyalty" && <LoyaltyManager />}

        {activeSubTab === "segments" && <SegmentEngine />}

        {activeSubTab === "follow-ups" && <FollowUpManager />}
      </div>
    </>
  );
};
