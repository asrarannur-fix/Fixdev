import * as React from "react";

export const CommissionPanel: React.FC<any> = ({ showToast }) => (

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-fadeIn">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Buku Komisi Perbaikan Teknisi
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                Total Komisi Bulan Ini: Rp 2,350,000
              </span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-mono">
                <tr>
                  <th className="px-4 py-3">ID Tiket</th>
                  <th className="px-4 py-3">Nama Teknisi</th>
                  <th className="px-4 py-3">Nama Unit & Kerusakan</th>
                  <th className="px-4 py-3 text-right">Biaya Jasa Servis</th>
                  <th className="px-4 py-3 text-right">Skema Komisi</th>
                  <th className="px-4 py-3 text-right">Nominal Komisi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  {
                    id: "#SVC-2026-001",
                    name: "Budi Setiawan",
                    device: "MacBook Pro Retina 2015 (Ganti Keyboard)",
                    price: 850000,
                    rate: "10%",
                    comm: 85000,
                  },
                  {
                    id: "#SVC-2026-003",
                    name: "Andi Saputra",
                    device: "iPhone 11 (Ganti Baterai Original)",
                    price: 450000,
                    rate: "10%",
                    comm: 45000,
                  },
                  {
                    id: "#SVC-2026-004",
                    name: "Budi Setiawan",
                    device: "Asus ROG Zephyrus G14 (Reball GPU)",
                    price: 1850000,
                    rate: "10%",
                    comm: 185000,
                  },
                ].map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-blue-600">
                      {item.id}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.device}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      Rp {(item.price ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">
                      {item.rate}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                      Rp {(item.comm ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() =>
                  showToast(
                    "Komisi teknisi lunas dibukukan ke jurnal payroll!",
                    "success",
                  )
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition-all"
              >
                Cairkan Seluruh Komisi ke Payroll
              </button>
              </div>
            </div>
          
);
