import React, { useMemo, useState, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
  accessor?: keyof T;
  filterable?: boolean;
}

export interface DataTableState {
  sort?: { key: string; dir: "asc" | "desc" };
  page: number;
  globalQuery: string;
  columnFilters: Record<string, string | number>;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  pageSize?: number;
  initialSort?: { key: string; dir: "asc" | "desc" };
  initialPage?: number;
  initialQuery?: string;
  initialColumnFilters?: Record<string, string | number>;
  emptyState?: React.ReactNode;
  density?: "comfortable" | "compact";
  className?: string;
  state?: DataTableState;
  onStateChange?: (state: DataTableState) => void;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  searchable = true,
  searchKeys,
  pageSize = 10,
  initialSort,
  initialPage,
  initialQuery,
  initialColumnFilters,
  emptyState,
  density = "comfortable",
  className = "",
  state: controlledState,
  onStateChange,
}: DataTableProps<T>) {
  const [internalState, setInternalState] = useState<DataTableState>(() => ({
    sort: initialSort ?? null,
    page: initialPage ?? 0,
    globalQuery: initialQuery ?? "",
    columnFilters: initialColumnFilters ?? {},
  }));

  const tableState = controlledState ?? internalState;
  const emitState = (next: DataTableState) => {
    if (onStateChange) onStateChange(next);
    else setInternalState(next);
  };

  const { globalQuery, sort, page, columnFilters } = tableState;

  const filtered = useMemo(() => {
    let result = data;
    const colEntries = Object.entries(columnFilters).filter(([, v]) =>
      typeof v === "string" ? v.trim() !== "" : true,
    );
    if (colEntries.length > 0) {
      result = result.filter((row) =>
        colEntries.every(([key, val]) => {
          const cell = String((row as any)[key] ?? "").toLowerCase();
          return cell.includes(String(val).toLowerCase());
        }),
      );
    }
    if (globalQuery.trim() && searchable) {
      const q = globalQuery.toLowerCase();
      const keys =
        searchKeys ??
        columns.map((c) => c.accessor).filter((k): k is keyof T => !!k);
      result = result.filter((row) =>
        keys.some((k) => String((row as any)[k] ?? "").toLowerCase().includes(q)),
      );
    }
    return result;
  }, [data, globalQuery, columnFilters, searchable, searchKeys, columns]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    const accessor = col?.accessor;
    if (!accessor) return filtered;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = (a as any)[accessor];
      const bv = (b as any)[accessor];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filtered, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const paged = sorted.slice(current * pageSize, current * pageSize + pageSize);

  const toggleSort = (col: Column<T>) => {
    if (!col.sortable || !col.accessor) return;
    const nextSort =
      sort?.key === col.key
        ? { key: col.key, dir: (sort.dir === "asc" ? "desc" : "asc") as "asc" | "desc" }
        : { key: col.key, dir: "asc" as const };
    emitState({ ...tableState, sort: nextSort, page: 0 });
  };

  const handleGlobalQuery = (value: string) => {
    emitState({ ...tableState, globalQuery: value, page: 0 });
  };

  const handleColumnFilter = (key: string, value: string) => {
    const nextFilters = { ...columnFilters };
    if (!value) delete nextFilters[key];
    else nextFilters[key] = value;
    emitState({ ...tableState, columnFilters: nextFilters, page: 0 });
  };

  const cellPadding = density === "compact" ? "px-3 py-2" : "px-4 py-3";
  const filterCols = columns.filter((c) => c.filterable && c.accessor);

  return (
    <div className={`bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden ${className}`}>
      {searchable && (
        <div className="p-3 border-b border-slate-200 dark:border-zinc-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              value={globalQuery}
              onChange={(e) => handleGlobalQuery(e.target.value)}
              placeholder="Cari semua kolom..."
              className="w-full text-xs py-2 pl-9 pr-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-[var(--c-accent)] focus:ring-2 focus:ring-[var(--c-accent)]/10 rounded-xl outline-none"
            />
          </div>
        </div>
      )}

      {filterCols.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 py-2 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50">
          {filterCols.map((col) => (
            <div key={col.key} className="flex flex-col gap-0.5 min-w-[100px]">
              <label className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider truncate">
                {col.header}
              </label>
              <input
                value={String(columnFilters[col.key as keyof DataTableState["columnFilters"]] ?? "")}
                onChange={(e) => handleColumnFilter(col.key, e.target.value)}
                placeholder={`Filter ${col.header.toLowerCase()}...`}
                className="text-[11px] py-1 px-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg outline-none focus:border-[var(--c-accent)]"
              />
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-400 dark:text-zinc-500 border-b border-slate-200 dark:border-zinc-800">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col)}
                  className={`${cellPadding} font-bold uppercase tracking-wide text-left ${
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""
                  } ${col.sortable ? "cursor-pointer select-none hover:text-slate-600 dark:hover:text-zinc-300" : ""} ${col.className ?? ""}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && <ChevronsUpDown className="w-3 h-3 opacity-50" />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center">
                  {emptyState ?? <span className="text-slate-400 dark:text-zinc-500">Tidak ada data</span>}
                </td>
              </tr>
            ) : (
              paged.map((row) => (
                <tr key={rowKey(row)} className="border-b border-slate-100 dark:border-zinc-800/60 hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`${cellPadding} text-slate-700 dark:text-zinc-200 ${
                        col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""
                      } ${col.className ?? ""}`}
                    >
                      {col.render ? col.render(row) : String(col.accessor ? (row as any)[col.accessor] ?? "" : "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 dark:border-zinc-800 text-[11px] text-slate-500 dark:text-zinc-400">
          <span>
            {sorted.length} baris · hal {current + 1}/{pageCount}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => emitState({ ...tableState, page: Math.max(0, current - 1) })} disabled={current === 0} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40" aria-label="Halaman sebelumnya">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => emitState({ ...tableState, page: Math.min(pageCount - 1, current + 1) })} disabled={current >= pageCount - 1} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40" aria-label="Halaman berikutnya">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
