import React from "react";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { Save, RotateCcw } from "lucide-react";

/**
 * Primif UI bersama untuk semua panel Settings.
 * Pakai token sama (rounded-2xl, accent, emerald) agar konsisten & tidak membingungkan.
 */

export const SettingsSection: React.FC<{
  icon?: React.ComponentType<any>;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ icon: Icon, title, description, children, className = "" }) => (
  <Card className={`space-y-4 ${className}`}>
    <div className="flex items-center gap-2">
      <div className="p-1.5 bg-accent-lighter text-accent rounded-lg shrink-0">
        {Icon && <Icon className="w-4 h-4" />}
      </div>
      <div>
        <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">{title}</h4>
        {description && <p className="text-[10px] text-slate-400">{description}</p>}
      </div>
    </div>
    {children}
  </Card>
);

export const Field: React.FC<{
  label: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, children, className = "" }) => (
  <div className={`space-y-1 ${className}`}>
    <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wide">{label}</label>
    {children}
  </div>
);

export const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative w-10 h-5 rounded-full transition-colors ${
      checked ? "bg-accent" : "bg-slate-300"
    }`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
        checked ? "translate-x-5" : ""
      }`}
    />
  </button>
);

export const SettingRow: React.FC<{
  label: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, children, className = "" }) => (
  <div
    className={`flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 ${className}`}
  >
    <span className="text-[10px] font-bold text-slate-600 uppercase">{label}</span>
    {children}
  </div>
);

export const SettingsSaveBar: React.FC<{
  onSave: () => void;
  onReset?: () => void;
  saving?: boolean;
  saveLabel?: string;
  resetLabel?: string;
}> = ({ onSave, onReset, saving, saveLabel = "Simpan", resetLabel = "Reset" }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 pt-2">
    {onReset && (
      <Button variant="secondary" onClick={onReset} icon={RotateCcw}>
        {resetLabel}
      </Button>
    )}
    <Button variant="primary" onClick={onSave} disabled={saving} icon={Save}>
      {saving ? "Menyimpan..." : saveLabel}
    </Button>
  </div>
);

export const SectionTabs: React.FC<{
  tabs: { id: string; label: string; icon?: React.ComponentType<any> }[];
  active: string;
  onChange: (id: string) => void;
}> = ({ tabs, active, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {tabs.map((t) => {
      const Icon = t.icon;
      return (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`text-[11px] font-semibold rounded-full px-3 py-2 border transition ${
            active === t.id
              ? "bg-accent-lighter text-accent border-accent/40"
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-800"
          }`}
        >
          {Icon && <Icon className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />}
          {t.label}
        </button>
      );
    })}
  </div>
);
