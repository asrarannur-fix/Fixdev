/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Pencil, Trash2, X, Loader2, Search, Copy, Filter, RotateCcw } from "lucide-react";
import api from "../lib/api/client";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import { useConfirm } from "./ui/ConfirmDialog";
import { DataTable, Column, DataTableState } from "./ui/DataTable";

export type { Column, DataTableState } from "./ui/DataTable";

export interface CrudField {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea" | "select" | "checkbox" | "date";
  options?: { label: string; value: string }[];
  required?: boolean;
  placeholder?: string;
}

export interface CrudManagerProps {
  table: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  columns: Column<any>[];
  fields: CrudField[];
}

const emptyForm = (fields: CrudField[]) =>
  fields.reduce<Record<string, any>>((acc, f) => { acc[f.name] = f.type === "checkbox" ? false : ""; return acc; }, {});

function readUrlState(table: string): Partial<DataTableState> & { globalQuery?: string; colFilters?: Record<string, string> } {
  const p = new URLSearchParams(window.location.search);
  const result: any = {};
  if (p.get("q")) result.globalQuery = p.get("q")!;
  if (p.get("sort")) result.sort = { key: p.get("sort")!, dir: (p.get("dir") as "asc" | "desc") || "asc" };
  if (p.get("page")) result.page = Math.max(0, parseInt(p.get("page")!, 10) || 0);
  const colFilters: Record<string, string> = {};
  for (const [k, v] of p.entries()) {
    if (k.startsWith("f_")) colFilters[k.slice(2)] = v;
  }
  if (Object.keys(colFilters).length > 0) result.colFilters = colFilters;
  return result;
}

function writeUrlState(state: DataTableState & { table: string }) {
  const p = new URLSearchParams();
  p.set("table", state.table);
  if (state.globalQuery) p.set("q", state.globalQuery);
  if (state.sort) {
    p.set("sort", state.sort.key);
    p.set("dir", state.sort.dir);
  }
  if (state.page > 0) p.set("page", String(state.page));
  for (const [k, v] of Object.entries(state.columnFilters)) {
    if (v) p.set(`f_${k}`, String(v));
  }
  const qs = p.toString();
  const url = `${window.location.pathname}${qs ? "?" + qs : ""}`;
  window.history.replaceState({}, "", url);
}

export const CrudManager: React.FC<CrudManagerProps> = ({
  table,
  title,
  icon: Icon,
  columns,
  fields,
}) => {
  const { currentTenantId = "", currentBranchId = "" } = useSaaS();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const mountedRef = useRef(true);
  const [urlReady, setUrlReady] = useState(false);

  const headers = useMemo(
    () => ({ "X-Tenant-ID": currentTenantId, "X-Branch-ID": currentBranchId }),
    [currentTenantId, currentBranchId],
  );

  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const urlState = useMemo(() => readUrlState(table), [table]);

  const [tableState, setTableState] = useState<DataTableState>({
    sort: urlState.sort,
    page: urlState.page ?? 0,
    globalQuery: urlState.globalQuery ?? "",
    columnFilters: urlState.colFilters ?? {},
  });

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>(emptyForm(fields));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    setUrlReady(true);
    return () => { mountedRef.current = false; };
  }, []);

  const handleStateChange = useCallback((next: DataTableState) => {
    setTableState(next);
    writeUrlState({ ...next, table });
  }, [table]);

  const resetFilters = useCallback(() => {
    const clean: DataTableState = { sort: undefined, page: 0, globalQuery: "", columnFilters: {} };
    setTableState(clean);
    writeUrlState({ ...clean, table });
  }, [table]);

  const hasActiveFilters = tableState.globalQuery.trim() !== "" || Object.keys(tableState.columnFilters).length > 0 || tableState.sort;

  const copyCurrentUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("URL berhasil disalin!", "success");
    } catch {
      showToast("Gagal menyalin URL.", "error");
    }
  }, [showToast]);

  const fetchData = useCallback(async () => {
    if (!currentTenantId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tableState.globalQuery.trim()) params.set("search", tableState.globalQuery.trim());
      params.set("limit", "200");
      const res = await api.get(`/crud/${table}?${params.toString()}`, { headers });
      setRows(res.data.data || []);
      setTotal(res.data.pagination?.total ?? 0);
    } catch {
      showToast("Gagal memuat data.", "error");
    } finally { setLoading(false); }
  }, [table, tableState.globalQuery, headers, currentTenantId, showToast]);

  useEffect(() => { const t = setTimeout(fetchData, 250); return () => clearTimeout(t); }, [fetchData]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm(fields)); setShowModal(true); };
  const openEdit = (row: any) => {
    setEditingId(row.id);
    setForm(fields.reduce<Record<string, any>>((acc, f) => { acc[f.name] = row[f.name] ?? (f.type === "checkbox" ? false : ""); return acc; }, {}));
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = fields.find((f) => f.required && !String(form[f.name] ?? "").trim());
    if (missing) { showToast(`Field \"${missing.label}\" wajib diisi.`, "error"); return; }
    const payload: Record<string, any> = {};
    for (const f of fields) {
      let v = form[f.name];
      if (f.type === "number") v = v === "" || v == null ? null : Number(v);
      else if (f.type === "checkbox") v = Boolean(v);
      payload[f.name] = v;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/crud/${table}/${editingId}`, payload, { headers });
        showToast("Berhasil diperbarui.", "success");
      } else {
        await api.post(`/crud/${table}`, payload, { headers });
        showToast("Berhasil ditambah.", "success");
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Gagal menyimpan.", "error");
    } finally { setSaving(false); }
  };

  const handleDelete = async (row: any) => {
    const ok = await confirm({ title: "Hapus data?", message: `Yakin hapus \"${row.name || row.id}\"? Soft-delete.`, type: "danger", confirmLabel: "Hapus" });
    if (!ok) return;
    try {
      await api.delete(`/crud/${table}/${row.id}`, { headers });
      showToast("Berhasil dihapus.", "success");
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Gagal hapus.", "error");
    }
  };

  const actionColumn: Column<any> = {
    key: "__actions__",
    header: "Aksi",
    align: "right",
    render: (row) => (
      <div className="flex items-center justify-end gap-1">
        <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-slate-500 hover:text-accent hover:bg-accent/10" title="Ubah"><Pencil className="w-3.5 h-3.5" /></button>
        <button onClick={() => handleDelete(row)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-500/10" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    ),
  };

  const filterableColumns = useMemo(() => columns.filter((c) => c.filterable), [columns]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-base font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-accent" />}
          {title}
          <span className="text-[11px] font-medium text-slate-400">({total})</span>
        </h2>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button onClick={copyCurrentUrl} className="flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-xl border border-slate-200 dark:border-zinc-700" title="Salin URL filter">
            <Copy className="w-3.5 h-3.5" />
          </button>
          {filterableColumns.length > 0 && (
            <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-bold rounded-xl border transition-all ${showFilters ? "bg-accent text-white border-accent" : "text-slate-500 bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700"}`} title="Filter per kolom">
              <Filter className="w-3.5 h-3.5" />
              {Object.keys(tableState.columnFilters).length > 0 && (
                <span className="bg-white/30 text-[9px] px-1 rounded-full">{Object.keys(tableState.columnFilters).length}</span>
              )}
            </button>
          )}
          {hasActiveFilters && (
            <button onClick={resetFilters} className="flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-xl" title="Reset semua filter">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
          )}
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-accent hover:bg-accent-hover rounded-xl shadow-sm">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400 text-xs">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Memuat...
        </div>
      ) : urlReady && (
        <DataTable
          columns={[...columns.map((c) => ({
            ...c,
            filterable: showFilters ? c.filterable : false,
          })), actionColumn]}
          data={rows}
          rowKey={(r) => r.id}
          searchable={false}
          pageSize={10}
          state={tableState}
          onStateChange={handleStateChange}
        />
      )}

      {showModal && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="crud-modal-title">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => !saving && setShowModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 id="crud-modal-title" className="text-sm font-bold text-slate-900 dark:text-white">{editingId ? `Ubah ${title}` : `Tambah ${title}`}</h3>
              <button type="button" aria-label="Tutup" onClick={() => !saving && setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              {fields.map((f) => (
                <div key={f.name} className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">
                    {f.label}{f.required && <span className="text-rose-500"> *</span>}
                  </label>
                  {f.type === "textarea" ? (
                    <textarea value={form[f.name] ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} placeholder={f.placeholder} rows={3} className="w-full text-xs py-2 px-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-accent" />
                  ) : f.type === "select" ? (
                    <select value={form[f.name] ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} className="w-full text-xs py-2 px-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-accent">
                      <option value="">— Pilih —</option>
                      {f.options?.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                    </select>
                  ) : f.type === "checkbox" ? (
                    <input type="checkbox" checked={Boolean(form[f.name])} onChange={(e) => setForm({ ...form, [f.name]: e.target.checked })} className="w-4 h-4 accent-accent" />
                  ) : (
                    <input type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"} value={form[f.name] ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} placeholder={f.placeholder} className="w-full text-xs py-2 px-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-accent" />
                  )}
                </div>
              ))}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} disabled={saving} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">Batal</button>
                <button type="submit" disabled={saving} className="px-5 py-2 text-xs font-bold text-white bg-accent hover:bg-accent-hover rounded-xl shadow-sm disabled:opacity-60">{saving ? "Menyimpan..." : editingId ? "Simpan" : "Tambah"}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};
