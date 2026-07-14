import * as React from "react";
import { FileSpreadsheet } from "lucide-react";

export const PayrollPanel: React.FC<any> = ({ generatePayroll, showToast }) => (

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-xl">
            <h3 className="font-bold text-xs uppercase text-slate-800 tracking-wider mb-4">
              Pemrosesan Gaji Periodik Staff
            </h3>
            <div className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Generate slip gaji untuk seluruh staff aktif di tenant Anda.
                Gaji pokok, komisi servis teknisi, komisi lapangan secara
                otomatis akan ditotal ke dalam slip gaji periodik ini. Sistem
                juga akan memotong otomatis kasbon yang telah disetujui (belum
                lunas) dari setiap karyawan.
              </p>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-600">
                <p className="font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />{" "}
                  Otomatisasi Double-Entry:
                </p>
                Sistem penggajian akan mendebit akun Beban Gaji (Expense), serta
                mengkredit akun Kas/Bank Utama (Asset), akun Piutang
                Karyawan/Kasbon (jika ada potongan kasbon), dan akun Kewajiban
                secara otomatis.
              </div>
              <button
                onClick={() => {
                  generatePayroll("06-2026");
                  showToast(
                    "Proses penggajian sukses! Jurnal umum beban gaji otomatis diposting.",
                    "success",
                  );
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition-all"
              >
                Generate & Bayarkan Payroll Juni 2026
              </button>
            </div>
          </div>
        
);
