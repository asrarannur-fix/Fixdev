import * as React from 'react';
import { useState, useCallback } from 'react';
import { CheckSquare, Square, Printer, Play, Pause, X, Loader2 } from 'lucide-react';
import { createPrintDocument } from '../utils/printJob';
import type { PrintConfig } from '../utils/print';

interface BatchDocument {
  id: string;
  title: string;
  html: string;
  qrPayload?: string;
  documentType?: string;
  selected: boolean;
}

interface BatchPrintProps {
  documents: BatchDocument[];
  printConfig?: PrintConfig;
  onComplete?: (results: Array<{ id: string; ok: boolean; error?: string }>) => void;
}

export const BatchPrint: React.FC<BatchPrintProps> = ({
  documents: initialDocs,
  printConfig,
  onComplete,
}) => {
  const [docs, setDocs] = useState<BatchDocument[]>(initialDocs);
  const [printing, setPrinting] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [results, setResults] = useState<Array<{ id: string; ok: boolean; error?: string }>>([]);
  const [stopped, setStopped] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d)));
  }, []);

  const toggleAll = useCallback(() => {
    setDocs((prev) => {
      const allSelected = prev.every((d) => d.selected);
      return prev.map((d) => ({ ...d, selected: !allSelected }));
    });
  }, []);

  const selectedDocs = docs.filter((d) => d.selected);
  const allSelected = docs.length > 0 && docs.every((d) => d.selected);

  const runBatchPrint = useCallback(async () => {
    setPrinting(true);
    setStopped(false);
    setResults([]);
    const toPrint = docs.filter((d) => d.selected);
    const batchResults: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (let i = 0; i < toPrint.length; i++) {
      if (stopped) break;
      setCurrentIdx(i);
      const doc = toPrint[i];
      try {
        const fullHtml = createPrintDocument(doc.title, doc.html, printConfig, doc.qrPayload);
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;left:-9999px;width:0;height:0;border:none';
        document.body.appendChild(iframe);
        const doc_ = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc_) throw new Error('Tidak bisa membuat document');
        doc_.open();
        doc_.write(fullHtml);
        doc_.close();
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            document.body.removeChild(iframe);
            reject(new Error('Timeout print'));
          }, 10000);
          iframe.onload = () => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
              setTimeout(() => {
                clearTimeout(timer);
                document.body.removeChild(iframe);
                resolve();
              }, 1500);
            } catch (err) {
              clearTimeout(timer);
              document.body.removeChild(iframe);
              reject(err);
            }
          };
        });
        batchResults.push({ id: doc.id, ok: true });
      } catch (err: any) {
        batchResults.push({ id: doc.id, ok: false, error: err.message || 'Print gagal' });
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    setResults(batchResults);
    setCurrentIdx(-1);
    setPrinting(false);
    onComplete?.(batchResults);
  }, [docs, printConfig, stopped, onComplete]);

  const stop = useCallback(() => {
    setStopped(true);
  }, []);

  const successCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Printer className="w-4 h-4" /> Batch Print
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {selectedDocs.length}/{docs.length} dipilih
          </span>
          {!printing ? (
            <button
              onClick={runBatchPrint}
              disabled={selectedDocs.length === 0}
              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Play className="w-3 h-3" /> Cetak ({selectedDocs.length})
            </button>
          ) : (
            <button
              onClick={stop}
              className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1"
            >
              <Pause className="w-3 h-3" /> Hentikan
            </button>
          )}
        </div>
      </div>

      {printing && currentIdx >= 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
          <span className="text-xs text-blue-700">
            Mencetak {currentIdx + 1}/{selectedDocs.length}: {selectedDocs[currentIdx]?.title}
          </span>
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-2 text-xs">
          <span className="text-emerald-600 font-semibold">{successCount} berhasil</span>
          {failCount > 0 && (
            <span className="text-red-600 font-semibold ml-2">{failCount} gagal</span>
          )}
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 flex items-center gap-2 border-b">
          <button onClick={toggleAll} className="text-gray-500 hover:text-gray-700">
            {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </button>
          <span className="text-xs font-medium text-gray-600">Dokumen</span>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {docs.map((doc) => {
            const result = results.find((r) => r.id === doc.id);
            return (
              <div
                key={doc.id}
                className={`flex items-center gap-2 px-3 py-2 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                  result && !result.ok ? 'bg-red-50' : result?.ok ? 'bg-emerald-50' : ''
                }`}
                onClick={() => toggleSelect(doc.id)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(doc.id);
                  }}
                  className="text-gray-500"
                >
                  {doc.selected ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 truncate">{doc.title}</p>
                  {doc.documentType && (
                    <p className="text-[10px] text-gray-400">{doc.documentType}</p>
                  )}
                </div>
                {result && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${result.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {result.ok ? 'OK' : result.error}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
