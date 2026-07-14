import React, { useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  /** Custom cell renderer; defaults to String(row[key]). */
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
  /** Field used for text search & sorting when no custom sort provided. */
  accessor?: keyof T;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  searchable?: boolean;
  /** Keys searched by the global filter input. */
  searchKeys?: (keyof T)[];
  pageSize?: number;
  initialSort?: { key: string; dir: "asc" | "desc" };
  emptyState?: React.ReactNode;
  density?: "comfortable" | "compact";
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  searchable = true,
  searchKeys,
  pageSize = 10,
  initialSort,
  emptyState,
  density = "comfortable",
  className = "",
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(
    initialSort ?? null,
  );
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!query.trim() || !searchable) return data;
    const q = query.toLowerCase();
    const keys =
      searchKeys ??
      columns
        .map((c) => c.accessor)
        .filter((k): k is keyof T => !!k);
    return data.filter((row) =>
      keys.some((k) => String(row[k] ?? "").toLowerCase().includes(q)),
    );
  }, [query, data, searchable, searchKeys, columns]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    const accessor = col?.accessor;
    if (!accessor) return filtered;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[accessor];
      const bv = b[accessor];
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
    setSort((prev) => {
      if (prev?.key === col.key)
        return { key: col.key, dir: prev.dir === "asc" ? "desc" : "asc" };
      return { key: col.key, dir: "asc" };
    });
  };

  const cellPadding =
    density === "compact" ? "px-3 py-2" : "px-4 py-3";

  return (
    <div
      className={`bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden ${className}`}
    >
      {searchable && (
        <div className="p-3 border-b border-slate-200 dark:border-zinc-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Cari..."
              className="w-full text-xs py-2 pl-9 pr-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-[var(--c-accent)] focus:ring-2 focus:ring-[var(--c-accent)]/10 rounded-xl outline-none"
            />
          </div>
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
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : ""
                  } ${col.sortable ? "cursor-pointer select-none hover:text-slate-600 dark:hover:text-zinc-300" : ""} ${col.className ?? ""}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <ChevronsUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center">
                  {emptyState ?? (
                    <span className="text-slate-400 dark:text-zinc-500">
                      Tidak ada data
                    </span>
                  )}
                </td>
              </tr>
            ) : (
              paged.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="border-b border-slate-100 dark:border-zinc-800/60 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`${cellPadding} text-slate-700 dark:text-zinc-200 ${
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                            ? "text-center"
                            : ""
                      } ${col.className ?? ""}`}
                    >
                      {col.render
                        ? col.render(row)
                        : String(
                            col.accessor ? row[col.accessor] ?? "" : "",
                          )}
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
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={current === 0}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={current >= pageCount - 1}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
