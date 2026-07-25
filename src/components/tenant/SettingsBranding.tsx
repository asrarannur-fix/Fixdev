import * as React from 'react';
import { Settings, Upload, CheckSquare } from 'lucide-react';
import { applyTenantBranding } from '../../utils/branding';
import { logBrandingChange } from './BrandingHistory';

export const SettingsBranding: React.FC<any> = (props) => {
  const { activeTenant, branding, setBranding, showToast, updateTenant } = props;

  const importRef = React.useRef<HTMLInputElement>(null);

  const handleLogoUpload = (file: File) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
      showToast('Logo harus PNG, JPEG, atau WebP maksimal 1 MB', 'error');
      return;
    }
    showToast('Unggah logo ke storage tenant, lalu masukkan URL HTTPS hasil unggahan.', 'error');
  };

  const saveBranding = async () => {
    if (!activeTenant) return;
    try {
      await updateTenant(activeTenant.id, { branding });
      applyTenantBranding(branding, activeTenant.name);
      logBrandingChange(activeTenant.id, branding, 'admin');
      showToast('Branding berhasil disimpan!', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Gagal menyimpan.', 'error');
    }
  };

  return (
    <div className="max-w-2xl space-y-6 animate-fadeIn dark:text-zinc-300 dark:[&_.bg-white]:bg-zinc-950 dark:[&_.border-slate-200]:border-zinc-800 dark:[&_.text-slate-800]:text-zinc-100 dark:[&_.text-slate-700]:text-zinc-200 dark:[&_input]:bg-zinc-950 dark:[&_input]:text-zinc-100">
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-accent-lighter text-accent rounded-lg">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
              Identitas Toko
            </h4>
            <p className="text-[10px] text-slate-400">Logo, warna, dan slogan bisnis Anda.</p>
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">URL Logo</span>
          <div className="flex gap-2">
            <input
              value={branding.logoUrl || ''}
              onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
              placeholder="https://domain/logo.png"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-accent"
            />
            <button
              onClick={() => importRef.current?.click()}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-colors flex items-center gap-1"
              title="Upload gambar"
            >
              <Upload className="w-3.5 h-3.5" /> Upload
            </button>
            <input
              ref={importRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleLogoUpload(f);
                e.target.value = '';
              }}
            />
          </div>
          {branding.logoUrl && (
            <img
              src={branding.logoUrl}
              alt="Logo preview"
              className="h-10 w-10 rounded-lg object-cover border border-slate-200 mt-1"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">Slogan</span>
          <input
            value={branding.slogan || ''}
            onChange={(e) => setBranding({ ...branding, slogan: e.target.value })}
            placeholder="Slogan bisnis"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-accent"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">Custom Domain</span>
          <input
            value={branding.customDomain || ''}
            onChange={(e) => setBranding({ ...branding, customDomain: e.target.value })}
            placeholder="shop.example.com"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-accent"
          />
          <p className="text-[9px] text-slate-400">
            Domain khusus untuk toko Anda. Arahkan CNAME ke domain ini.
          </p>
        </label>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button
          onClick={saveBranding}
          className="bg-accent hover:bg-accent-hover text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer transition-all flex items-center gap-2 shadow-sm"
        >
          <CheckSquare className="w-4 h-4" />
          Simpan Branding
        </button>
      </div>
    </div>
  );
};

export default SettingsBranding;
