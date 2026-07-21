import React from "react";
import { Server, CheckCircle2 } from "lucide-react";
import { SettingsSection } from "../SettingsUI";

export const StoragePanel: React.FC = () => (
  <div className="animate-fadeIn">
    <SettingsSection
      icon={Server}
      title="Cloud Storage"
      description="System Managed vs Custom S3/R2 Storage Providers"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-slate-200 rounded-xl p-4">
          <h5 className="text-xs font-bold text-slate-700 mb-2">Default (System Managed)</h5>
          <p className="text-[10px] text-slate-500 mb-3">
            File disimpan di storage sistem default yang dikelola otomatis.
          </p>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-1">
            <CheckCircle2 className="w-3 h-3" /> Aktif
          </span>
        </div>
        <div className="border border-slate-200 rounded-xl p-4 opacity-75">
          <h5 className="text-xs font-bold text-slate-700 mb-2">Custom S3 / R2</h5>
          <p className="text-[10px] text-slate-500 mb-3">
            Hubungkan bucket S3 atau Cloudflare R2 sendiri untuk kontrol penuh.
          </p>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded-full px-2 py-1">
            Belum dikonfigurasi
          </span>
        </div>
      </div>
    </SettingsSection>
  </div>
);
