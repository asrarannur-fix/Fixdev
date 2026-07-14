import * as React from "react";
import { useState } from "react";
import { useSaaS } from "../../context/SaaSContext";
import { useToast } from "../ui/Toast";
import { CustomerActivityFeed } from "../CustomerActivityFeed";
import { B2BPipeline } from "../B2BPipeline";

import { Customer, CustomerSegment } from "../../types";

interface CRMTabProps {
  activeSubTab: string;
}

export const CRMTab: React.FC<CRMTabProps> = ({
  activeSubTab,
}) => {
  const { customers, currentTenantId } = useSaaS();
  const { showToast } = useToast();
  const [selectedCrmCustomerId, setSelectedCrmCustomerId] = useState<
    string | null
  >(null);
  const tenantCustomers = React.useMemo(
    () => customers.filter((c) => c.tenantId === currentTenantId),
    [customers, currentTenantId],
  );

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
                  {tenantCustomers
                    .map((c) => (
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
                              c.segment === CustomerSegment.CORPORATE
                                ? "bg-purple-100 text-purple-800"
                                : "bg-slate-100 text-slate-800"
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
                            className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-slate-800 dark:text-slate-200 border border-blue-200/40 dark:border-slate-700 font-extrabold text-[10.5px] px-3 py-1 rounded-lg cursor-pointer transition duration-150"
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

        {activeSubTab === "marketing" && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-xl animate-fadeIn space-y-4">
            <h3 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
              SMS & WhatsApp Cloud Broadcast Center
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Kirim pesan promosi berkala atau kupon potongan harga ke database
              pelanggan Anda berdasarkan segmentasi tertentu.
            </p>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                    Target Segmentasi
                  </label>
                  <select className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg outline-none cursor-pointer">
                    <option value="ALL">
                      Seluruh Database ({tenantCustomers.length} Pelanggan)
                    </option>
                    <option value="COLD">
                      Pelanggan Pasif (&gt;6 bulan tidak servis)
                    </option>
                    <option value="ACTIVE">
                      Pelanggan Aktif (Loyalty &gt; 100 pts)
                    </option>
                    <option value="CORP">
                      Segmen Corporate / Instansi B2B
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                    Pilih Kupon Potongan
                  </label>
                  <select className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg outline-none cursor-pointer">
                    <option value="SERV_JUJU">
                      KUPON 'KOMPUTERSERVICE': Diskon 15% Servis
                    </option>
                    <option value="WIFI_PASS">
                      KUPON 'FREEACCESSORY': Gratis Pelindung Layar
                    </option>
                    <option value="CASHB">
                      KUPON 'MAKASSARJAYA': Cashback Rp 50,000
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                  Format Pesan Broadcast
                </label>
                <textarea
                  rows={4}
                  defaultValue={`Halo Kak! Kami dari Mac Repair Center Makassar punya kabar gembira. Dapatkan diskon spesial 15% untuk pembersihan debu, ganti thermal paste laptop, atau ganti baterai menggunakan kode kupon KOMPUTERSERVICE. Berlaku hingga akhir bulan ini ya Kak! Sampai jumpa di toko kami.`}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg outline-none leading-relaxed font-sans"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-[10px] text-slate-400 font-mono">
                  Meta Broadcast Cost Est: ~Rp 45,000 (Oleh kuota tenant)
                </span>
                <button
                  onClick={() =>
                    showToast(
                      "Kampanye WhatsApp Cloud Broadcast berhasil diterbangkan ke Meta Queue!",
                      "success",
                    )
                  }
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition-all"
                >
                  Kirim WhatsApp Broadcast Sekarang
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
