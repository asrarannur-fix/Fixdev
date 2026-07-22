import React, { useState, useMemo } from "react";
import { Shield, Lock, Clock, Eye, Save, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "../ui/Toast";

interface SecuritySettingsPanelProps {
  currentTenantId: string;
  tenantObj: any;
  updateTenant: (id: string, updates: any) => void;
  showToast: (msg: string, type: "success" | "error") => void;
}

export const SecuritySettingsPanel: React.FC<SecuritySettingsPanelProps> = ({
  currentTenantId,
  tenantObj,
  updateTenant,
  showToast,
}) => {
  const secSettings = tenantObj?.settings?.securitySettings || {};

  const [sessionTimeout, setSessionTimeout] = useState(secSettings.sessionTimeout || 60);
  const [minPasswordLength, setMinPasswordLength] = useState(secSettings.minPasswordLength || 8);
  const [requireUppercase, setRequireUppercase] = useState(secSettings.requireUppercase ?? true);
  const [requireNumber, setRequireNumber] = useState(secSettings.requireNumber ?? true);
  const [requireSpecial, setRequireSpecial] = useState(secSettings.requireSpecial ?? false);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(secSettings.maxLoginAttempts || 5);
  const [lockoutDuration, setLockoutDuration] = useState(secSettings.lockoutDuration || 15);
  const [enableMFA, setEnableMFA] = useState(secSettings.enableMFA ?? false);
  const [allowPasswordReuse, setAllowPasswordReuse] = useState(secSettings.allowPasswordReuse ?? false);

  const clampNumber = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

  const defaultSecuritySettings = {
    sessionTimeout: secSettings.sessionTimeout || 60,
    minPasswordLength: secSettings.minPasswordLength || 8,
    requireUppercase: secSettings.requireUppercase ?? true,
    requireNumber: secSettings.requireNumber ?? true,
    requireSpecial: secSettings.requireSpecial ?? false,
    maxLoginAttempts: secSettings.maxLoginAttempts || 5,
    lockoutDuration: secSettings.lockoutDuration || 15,
    enableMFA: secSettings.enableMFA ?? false,
    allowPasswordReuse: secSettings.allowPasswordReuse ?? false,
  };

  const handleReset = () => {
    setSessionTimeout(defaultSecuritySettings.sessionTimeout);
    setMinPasswordLength(defaultSecuritySettings.minPasswordLength);
    setRequireUppercase(defaultSecuritySettings.requireUppercase);
    setRequireNumber(defaultSecuritySettings.requireNumber);
    setRequireSpecial(defaultSecuritySettings.requireSpecial);
    setMaxLoginAttempts(defaultSecuritySettings.maxLoginAttempts);
    setLockoutDuration(defaultSecuritySettings.lockoutDuration);
    setEnableMFA(defaultSecuritySettings.enableMFA);
    setAllowPasswordReuse(defaultSecuritySettings.allowPasswordReuse);
    showToast("Pengaturan keamanan telah dikembalikan ke nilai default tenant.", "success");
  };

  const handleSave = async () => {
    if (!updateTenant || !currentTenantId) return;
    const current = tenantObj?.settings || {};
    const safeSecuritySettings = {
      sessionTimeout: clampNumber(sessionTimeout, 15, 480),
      minPasswordLength: clampNumber(minPasswordLength, 6, 32),
      requireUppercase,
      requireNumber,
      requireSpecial,
      maxLoginAttempts: clampNumber(maxLoginAttempts, 1, 20),
      lockoutDuration: clampNumber(lockoutDuration, 1, 1440),
      enableMFA,
      allowPasswordReuse,
    };
    try {
      await updateTenant(currentTenantId, {
        settings: {
          ...current,
          authSettings: {
            ...(current.authSettings || {}),
            requireMfa: enableMFA,
          },
          securitySettings: safeSecuritySettings,
        },
      });
      showToast("Pengaturan keamanan berhasil disimpan!", "success");
    } catch (error: any) {
      showToast(error.message || "Pengaturan keamanan gagal disimpan.", "error");
    }
  };

  return (
    <div className="space-y-6 dark:text-zinc-300 dark:[&_.bg-white]:bg-zinc-950 dark:[&_.border-slate-200]:border-zinc-800 dark:[&_.text-slate-700]:text-zinc-200 dark:[&_input]:bg-zinc-950 dark:[&_input]:text-zinc-100 dark:[&_select]:bg-zinc-950 dark:[&_select]:text-zinc-100 dark:[&_.hover\:bg-slate-50:hover]:bg-zinc-900" id="security-settings-pane">
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-xs uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
          <Lock className="w-4 h-4 text-red-500" /> Kebijakan Sandi
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Panjang Minimum</label>
            <input
              type="number"
              min={6}
              max={32}
              value={minPasswordLength}
              onChange={(e) => setMinPasswordLength(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Batas Percobaan Login</label>
            <input
              type="number"
              min={1}
              max={20}
              value={maxLoginAttempts}
              onChange={(e) => setMaxLoginAttempts(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={requireUppercase} onChange={(e) => setRequireUppercase(e.target.checked)} className="rounded" />
            Huruf Besar
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={requireNumber} onChange={(e) => setRequireNumber(e.target.checked)} className="rounded" />
            Angka
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={requireSpecial} onChange={(e) => setRequireSpecial(e.target.checked)} className="rounded" />
            Simbol (!@#)
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={allowPasswordReuse} onChange={(e) => setAllowPasswordReuse(e.target.checked)} className="rounded" />
            Izinkan Ulang Sandi
          </label>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-xs uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-amber-500" /> Sesi & Blokir
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Batas Waktu Sesi (Menit)</label>
            <select
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value={15}>15 Menit</option>
              <option value={30}>30 Menit</option>
              <option value={60}>60 Menit (Default)</option>
              <option value={120}>120 Menit</option>
              <option value={480}>8 Jam</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Durasi Blokir Akun (Menit)</label>
            <input
              type="number"
              min={1}
              max={1440}
              value={lockoutDuration}
              onChange={(e) => setLockoutDuration(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="text-xs font-bold text-slate-700">Autentikasi Dua Faktor (2FA)</p>
            <p className="text-[10px] text-slate-400">Mengaktifkan otentikasi via Google Authenticator</p>
          </div>
          <button
            onClick={() => setEnableMFA(!enableMFA)}
            className={`relative w-10 h-5 rounded-full transition-colors ${enableMFA ? "bg-red-500" : "bg-slate-300"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${enableMFA ? "translate-x-5" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 pt-2">
        <button onClick={handleReset} className="rounded-lg border border-slate-200 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all">
          Reset Default
        </button>
        <button onClick={handleSave} className="flex items-center gap-1.5 px-6 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all cursor-pointer">
          <Save className="w-4 h-4" /> Simpan Kebijakan Keamanan
        </button>
      </div>
    </div>
  );
};
