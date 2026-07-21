import { useState } from 'react';
import { Card, Button } from '../ui/SharedUI';
import { X, Paintbrush } from 'lucide-react';
import { SUGGESTED_PRESETS, getSuggestedSlogan } from '../../utils/brandingIO';
import { Tenant, TenantBranding } from '../../types';

interface BrandingWizardProps {
  open: boolean;
  onClose: () => void;
  tenant: Tenant | null;
  onSelectPreset: (branding: Partial<TenantBranding>) => void;
}

export const BrandingWizard: React.FC<BrandingWizardProps> = ({ open, onClose, tenant, onSelectPreset }) => {
  if (!open || !tenant) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto !p-0">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className='flex items-center gap-3'>
                <div className='p-2 bg-accent-lighter rounded-xl text-accent'><Paintbrush className='w-5 h-5'/></div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Atur Identitas Brand Anda</h2>
                    <p className='text-sm text-slate-500'>Pilih palet warna dan slogan yang paling cocok untuk '{tenant.name}'.</p>
                </div>
            </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className='w-5 h-5'/></button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {SUGGESTED_PRESETS.map((preset) => (
            <div key={preset.key} className="border rounded-lg p-4 flex flex-col items-center text-center gap-3 hover:border-accent transition-all">
              <div className='w-16 h-16 rounded-full border-4 border-white shadow-inner' style={{ backgroundColor: preset.primaryColor }} />
              <h3 className='font-bold text-sm'>{preset.name}</h3>
              <p className='text-xs text-slate-500 italic'>"{preset.slogan}"</p>
              <Button size='sm' onClick={() => {
                onSelectPreset({ 
                  primaryColor: preset.primaryColor, 
                  accentColor: preset.accentColor,
                  secondaryColor: preset.secondaryColor,
                  fontFamily: preset.fontFamily, 
                  slogan: getSuggestedSlogan(tenant.name) 
                });
                onClose();
              }}>Pilih Tema Ini</Button>
            </div>
          ))}
        </div>
        <div className='p-6 border-t border-slate-100 text-center'>
            <Button variant='ghost' size='sm' onClick={onClose}>Nanti Saja</Button>
        </div>
      </Card>
    </div>
  );
};