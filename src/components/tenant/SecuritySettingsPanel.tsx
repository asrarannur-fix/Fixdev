import React, { useState, useMemo } from 'react';
import { Shield, Lock, Clock, Eye, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useToast } from '../ui/Toast';

interface SecuritySettingsPanelProps {
  currentTenantId: string;
  tenantObj: any;
  updateTenant: (id: string, updates: any) => Promise<void> | void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

const FACTORY_DEFAULTS = {
  sessionTimeout: 60,
  minPasswordLength: 8,
  requireUppercase: true,
  requireNumber: true,
  requireSpecial: false,
  maxLoginAttempts: 5,
  lockoutDuration: 15,
  enableMFA: false,
  allowPasswordReuse: false,
};

export const SecuritySettingsPanel: React.FC<SecuritySettingsPanelProps> = ({
  currentTenantId,
  tenantObj,
  updateTenant,
  showToast,
}) => {
  const [sessionTimeout, setSessionTimeout] = useState(FACTORY_DEFAULTS.sessionTimeout);
  const [minPasswordLength, setMinPasswordLength] = useState(FACTORY_DEFAULTS.minPasswordLength);
  const [requireUppercase, setRequireUppercase] = useState(FACTORY_DEFAULTS.requireUppercase);
  const [requireNumber, setRequireNumber] = useState(FACTORY_DEFAULTS.requireNumber);
  const [requireSpecial, setRequireSpecial] = useState(FACTORY_DEFAULTS.requireSpecial);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(FACTORY_DEFAULTS.maxLoginAttempts);
  const [lockoutDuration, setLockoutDuration] = useState(FACTORY_DEFAULTS.lockoutDuration);
  const [enableMFA, setEnableMFA] = useState(FACTORY_DEFAULTS.enableMFA);
  const [allowPasswordReuse, setAllowPasswordReuse] = useState(FACTORY_DEFAULTS.allowPasswordReuse);
  const [isSaving, setIsSaving] = useState(false);

  const clampNumber = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

  const handleReset = () => {
    setSessionTimeout(FACTORY_DEFAULTS.sessionTimeout);
    setMinPasswordLength(FACTORY_DEFAULTS.minPasswordLength);
    setRequireUppercase(FACTORY_DEFAULTS.requireUppercase);
    setRequireNumber(FACTORY_DEFAULTS.requireNumber);
    setRequireSpecial(FACTORY_DEFAULTS.requireSpecial);
    setMaxLoginAttempts(FACTORY_DEFAULTS.maxLoginAttempts);
    setLockoutDuration(FACTORY_DEFAULTS.lockoutDuration);
    setEnableMFA(FACTORY_DEFAULTS.enableMFA);
    setAllowPasswordReuse(FACTORY_DEFAULTS.allowPasswordReuse);
    showToast('Pengaturan keamanan telah dikembalikan ke factory default.', 'success');
  };

  const handleSave = async () => {
    if (!updateTenant || !currentTenantId) return;
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
    setIsSaving(true);
    try {
      await updateTenant(currentTenantId, {
        settings: { securitySettings: safeSecuritySettings },
      });
      showToast('Pengaturan keamanan berhasil disimpan!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Pengaturan keamanan gagal disimpan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="space-y-6 dark:text-zinc-300 dark:[&_.bg-white]:bg-zinc-950 dark:[&_.border-slate-200]:border-zinc-800 dark:[&_.text-slate-700]:text-zinc-200 dark:[&_input]:bg-zinc-950 dark:[&_input]:text-zinc-100 dark:[&_select]:bg-zinc-950 dark:[&_select]:text-zinc-100 dark:[&_.hover\:bg-slate-50:hover]:bg-zinc-900"
      id="security-settings-pane"
    >
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-xs uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
          <Lock className="w-4 h-4 text-red-500" /> Kebijakan Sandi
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              Panjang Minimum
            </label>
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
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              Batas Percobaan Login
            </label>
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
            <input
              type="checkbox"
              checked={requireUppercase}
              onChange={(e) => setRequireUppercase(e.target.checked)}
              className="rounded"
            />
            Huruf Besar
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={requireNumber}
              onChange={(e) => setRequireNumber(e.target.checked)}
              className="rounded"
            />
            Angka
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={requireSpecial}
              onChange={(e) => setRequireSpecial(e.target.checked)}
              className="rounded"
            />
            Simbol (!@#)
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowPasswordReuse}
              onChange={(e) => setAllowPasswordReuse(e.target.checked)}
              className="rounded"
            />
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
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              Batas Waktu Sesi (Menit)
            </label>
            <input
              type="number"
              min={15}
              max={480}
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              Durasi Blokir Akun (Menit)
            </label>
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
            <p className="text-[10px] text-slate-400">
              Mengaktifkan otentikasi via Google Authenticator
            </p>
          </div>
          <button
            onClick={() => setEnableMFA(!enableMFA)}
            className={`relative w-10 h-5 rounded-full transition-colors ${enableMFA ? 'bg-red-500' : 'bg-slate-300'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${enableMFA ? 'translate-x-5' : ''}`}
            />
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 pt-2">
        <button
          onClick={handleReset}
          className="rounded-lg border border-slate-200 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
        >
          Reset Default
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-6 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{' '}
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Simpan Kebijakan Keamanan
            </>
          )}
        </button>
      </div>
    </div>
  );
};
