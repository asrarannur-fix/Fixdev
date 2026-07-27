import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { FileCode, Save, Trash2, Plus, Copy, AlertTriangle } from 'lucide-react';

interface PrintTemplateManagerProps {
  printTemplates: Record<string, string>;
  onSave: (templates: Record<string, string>) => void;
}

const TEMPLATE_LABELS: Record<string, string> = {
  pos_receipt: 'Struk POS',
  service_receipt: 'Nota Servis',
  service_invoice: 'Faktur Servis',
  service_label: 'Label Stiker',
  warranty: 'Klaim Garansi',
  rental: 'Dokumen Sewa',
  inventory: 'Inventory',
  report: 'Laporan',
};

const DEFAULT_TEMPLATES: Record<string, string> = {};

export const PrintTemplateManager: React.FC<PrintTemplateManagerProps> = ({
  printTemplates,
  onSave,
}) => {
  const [templates, setTemplates] = useState<Record<string, string>>({ ...printTemplates });
  const [activeType, setActiveType] = useState('');
  const [editing, setEditing] = useState('');
  const [showConfirm, setShowConfirm] = useState('');

  useEffect(() => {
    setTemplates({ ...printTemplates });
  }, [printTemplates]);

  const types = Object.keys(TEMPLATE_LABELS);

  const handleSave = useCallback(() => {
    onSave(templates);
  }, [templates, onSave]);

  const handleReset = (type: string) => {
    const next = { ...templates };
    delete next[type];
    setTemplates(next);
    setShowConfirm('');
  };

  const handleCopyFrom = (fromType: string) => {
    if (templates[fromType]) {
      setEditing(templates[fromType]);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-violet-50 text-violet-600 rounded-xl">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
              Template Cetak
            </h4>
            <p className="text-[10px] text-slate-400">
              Simpan & muat template HTML per jenis dokumen. Gunakan {'{{variable}}'} untuk
              placeholder dinamis.
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1"
        >
          <Save className="w-3 h-3" /> Simpan Semua
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {types.map((type) => {
          const hasTemplate = !!templates[type];
          return (
            <button
              key={type}
              onClick={() => setActiveType(activeType === type ? '' : type)}
              className={`text-left p-3 rounded-xl border transition-all ${
                activeType === type
                  ? 'border-accent bg-accent-lighter ring-1 ring-accent/30'
                  : hasTemplate
                    ? 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-300'
                    : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-700">
                  {TEMPLATE_LABELS[type]}
                </span>
                {hasTemplate && (
                  <span className="text-[8px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                    Aktif
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {activeType && (
        <div className="border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-[10px] font-bold text-slate-600 uppercase">
              {TEMPLATE_LABELS[activeType]} — Template HTML
            </h5>
            <div className="flex gap-1.5">
              {types
                .filter((t) => t !== activeType && templates[t])
                .slice(0, 3)
                .map((t) => (
                  <button
                    key={t}
                    onClick={() => handleCopyFrom(t)}
                    className="px-2 py-1 text-[8px] font-bold bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-all"
                  >
                    <Copy className="w-2.5 h-2.5 inline mr-0.5" /> {TEMPLATE_LABELS[t]}
                  </button>
                ))}
              {showConfirm === activeType ? (
                <div className="flex items-center gap-1">
                  <span className="text-[8px] text-amber-600 font-bold">Hapus?</span>
                  <button
                    onClick={() => handleReset(activeType)}
                    className="px-2 py-1 text-[8px] font-bold bg-red-500 text-white rounded"
                  >
                    Ya
                  </button>
                  <button
                    onClick={() => setShowConfirm('')}
                    className="px-2 py-1 text-[8px] font-bold bg-slate-200 text-slate-600 rounded"
                  >
                    Batal
                  </button>
                </div>
              ) : templates[activeType] ? (
                <button
                  onClick={() => setShowConfirm(activeType)}
                  className="px-2 py-1 text-[8px] font-bold bg-red-50 text-red-600 rounded hover:bg-red-100 transition-all"
                >
                  <Trash2 className="w-2.5 h-2.5 inline mr-0.5" /> Reset
                </button>
              ) : null}
            </div>
          </div>
          <textarea
            rows={12}
            value={editing}
            onChange={(e) => setEditing(e.target.value)}
            onBlur={() => {
              if (editing.trim()) {
                setTemplates((prev) => ({ ...prev, [activeType]: editing }));
              }
            }}
            placeholder={`<div class="receipt">\n  <h1>{{businessName}}</h1>\n  <p>Tiket: {{ticketNo}}</p>\n  <p>Pelanggan: {{customerName}}</p>\n</div>`}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[10px] font-mono leading-relaxed focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none"
            spellCheck={false}
          />
          <div className="text-[8px] text-slate-400">
            <strong>Available variables:</strong> {'{{businessName}}'} {'{{ticketNo}}'}{' '}
            {'{{customerName}}'} {'{{deviceName}}'} {'{{status}}'} {'{{estimatedCost}}'}{' '}
            {'{{qrCode}}'} {'{{footer}}'} {'{{date}}'}
          </div>
        </div>
      )}
    </div>
  );
};
