import React, { useState } from "react";
import { TenantBranding } from "../../types";

interface BrandingHistoryEntry {
  timestamp: string;
  branding: TenantBranding;
  changedBy: string;
}

interface BrandingHistoryProps {
  tenantId: string;
  currentBranding: TenantBranding;
  onRestore: (branding: TenantBranding) => void;
}

function getStorageKey(tenantId: string): string {
  return `branding_history_${tenantId}`;
}

export function logBrandingChange(
  tenantId: string,
  branding: TenantBranding,
  changedBy: string
): void {
  try {
    const key = getStorageKey(tenantId);
    const raw = localStorage.getItem(key);
    const history: BrandingHistoryEntry[] = raw ? JSON.parse(raw) : [];
    history.unshift({
      timestamp: new Date().toISOString(),
      branding: { ...branding },
      changedBy,
    });
    if (history.length > 10) history.length = 10;
    localStorage.setItem(key, JSON.stringify(history));
  } catch {
    // silently fail
  }
}

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

export default function BrandingHistory({
  tenantId,
  currentBranding,
  onRestore,
}: BrandingHistoryProps) {
  const [history, setHistory] = useState<BrandingHistoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem(getStorageKey(tenantId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const clearHistory = () => {
    localStorage.removeItem(getStorageKey(tenantId));
    setHistory([]);
  };

  const restore = (entry: BrandingHistoryEntry) => {
    onRestore({ ...entry.branding });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-accent">
          Branding History
        </h3>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="px-3 py-1 text-xs font-medium text-accent border border-accent rounded hover:bg-accent hover:text-white transition-colors"
          >
            Clear History
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No branding changes recorded.</p>
      ) : (
        <div className="space-y-2">
          {history.map((entry, idx) => (
            <div
              key={`${entry.timestamp}-${idx}`}
              className="flex items-center gap-3 p-2 rounded border border-accent/20 bg-accent/5"
            >
              <div
                className="w-5 h-5 rounded-sm border border-white/20 flex-shrink-0"
                style={{ backgroundColor: entry.branding.primaryColor }}
                title={entry.branding.primaryColor}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">
                  {formatTimestamp(entry.timestamp)}
                </p>
                <p className="text-[10px] text-gray-400">
                  by {entry.changedBy}
                </p>
              </div>
              <button
                onClick={() => restore(entry)}
                className="px-2 py-0.5 text-[10px] font-medium text-accent border border-accent rounded hover:bg-accent hover:text-white transition-colors flex-shrink-0"
              >
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
