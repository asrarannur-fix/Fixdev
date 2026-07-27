import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { DollarSign, FileText, BarChart3 } from 'lucide-react';

interface CostEntry {
  documentType: string;
  pages: number;
  transport: 'qz' | 'browser';
  paperSize?: string;
  timestamp: number;
}

const COST_PER_PAGE: Record<string, number> = {
  thermal_58: 50,
  thermal_80: 75,
  a4: 200,
  hvs_a4: 350,
  hvs_letter: 300,
};

const DEFAULT_COST = 150;

interface PrintCostTrackerProps {
  apiFetch?: (url: string, opts?: any) => Promise<any>;
}

const getEstimate = (pages: number, paperSize?: string): number => {
  const rate = COST_PER_PAGE[paperSize || 'thermal_80'] || DEFAULT_COST;
  return pages * rate;
};

export const PrintCostTracker: React.FC<PrintCostTrackerProps> = () => {
  const [entries, setEntries] = useState<CostEntry[]>(() => {
    try {
      const raw = localStorage.getItem('fixdev_print_cost_log');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [paperSize, setPaperSize] = useState('thermal_80');
  const [pagesInput, setPagesInput] = useState('1');

  useEffect(() => {
    const handleCompleted = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          documentType?: string;
          pages?: number;
          paperSize?: string;
          transport?: 'qz' | 'browser';
        }>
      ).detail;
      const entry: CostEntry = {
        documentType: detail.documentType || 'general',
        pages: detail.pages || 1,
        transport: detail.transport || 'browser',
        paperSize: detail.paperSize || 'thermal_80',
        timestamp: Date.now(),
      };
      setEntries((prev) => {
        const next = [entry, ...prev].slice(0, 500);
        try {
          localStorage.setItem('fixdev_print_cost_log', JSON.stringify(next));
        } catch {
          /* noop */
        }
        return next;
      });
    };
    window.addEventListener('fixdev:print-completed', handleCompleted);
    return () => window.removeEventListener('fixdev:print-completed', handleCompleted);
  }, []);

  const clearHistory = useCallback(() => {
    setEntries([]);
    try {
      localStorage.removeItem('fixdev_print_cost_log');
    } catch {
      /* noop */
    }
  }, []);

  const now = new Date();
  const thisMonth = entries.filter((e) => {
    const d = new Date(e.timestamp);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalPages = thisMonth.reduce((s, e) => s + e.pages, 0);
  const totalCost = thisMonth.reduce((s, e) => s + getEstimate(e.pages, e.paperSize), 0);

  const byType = new Map<string, { pages: number; cost: number; count: number }>();
  for (const e of thisMonth) {
    const prev = byType.get(e.documentType) || { pages: 0, cost: 0, count: 0 };
    prev.pages += e.pages;
    prev.cost += getEstimate(e.pages, e.paperSize);
    prev.count += 1;
    byType.set(e.documentType, prev);
  }

  const estimatedCost = getEstimate(parseInt(pagesInput) || 1, paperSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <DollarSign className="w-4 h-4" /> Biaya Cetak
        </h4>
        <button
          onClick={clearHistory}
          className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded hover:bg-gray-200"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-emerald-700">{totalPages}</p>
          <p className="text-[10px] text-emerald-600">Halaman/Bulan</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-blue-700">Rp {totalCost.toLocaleString('id-ID')}</p>
          <p className="text-[10px] text-blue-600">Total/Bulan</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-amber-700">{thisMonth.length}</p>
          <p className="text-[10px] text-amber-600">Job/Bulan</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3">
        <h5 className="text-xs font-semibold text-gray-600 mb-2">Estimasi Biaya</h5>
        <div className="flex items-center gap-2">
          <select
            value={paperSize}
            onChange={(e) => setPaperSize(e.target.value)}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="thermal_58">Thermal 58mm</option>
            <option value="thermal_80">Thermal 80mm</option>
            <option value="a4">A4</option>
            <option value="hvs_a4">HVS A4</option>
            <option value="hvs_letter">HVS Letter</option>
          </select>
          <input
            type="number"
            min="1"
            value={pagesInput}
            onChange={(e) => setPagesInput(e.target.value)}
            className="text-xs border rounded px-2 py-1 w-16"
          />
          <span className="text-xs text-gray-500">halaman</span>
          <span className="text-xs font-semibold text-gray-700 ml-auto">
            Rp {estimatedCost.toLocaleString('id-ID')}
          </span>
        </div>
      </div>

      {byType.size > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
            <BarChart3 className="w-3 h-3" /> Per Dokumen
          </h5>
          <div className="space-y-1">
            {Array.from(byType.entries())
              .sort((a, b) => b[1].cost - a[1].cost)
              .map(([type, data]) => (
                <div
                  key={type}
                  className="flex items-center justify-between text-xs px-2 py-1 bg-gray-50 rounded"
                >
                  <span className="text-gray-700 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> {type}
                  </span>
                  <span className="text-gray-500">
                    {data.count}x • {data.pages}hlm
                  </span>
                  <span className="font-semibold text-gray-700">
                    Rp {data.cost.toLocaleString('id-ID')}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div className="text-center py-4 text-gray-400 text-xs">
          Belum ada riwayat cetak. Cetak dokumen untuk mulai melacak biaya.
        </div>
      )}
    </div>
  );
};

export { getEstimate, COST_PER_PAGE };
