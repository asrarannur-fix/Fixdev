import React, { useState } from "react";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import { useConfirm } from "./ui/ConfirmDialog";
import {
  ShoppingCart,
  PlusCircle,
  CheckCircle2,
  Trash2,
  Package,
  Truck,
  FileText,
  Search,
  X,
} from "lucide-react";

const generateUUID = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface POItem {
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
}

interface PurchaseOrder {
  id: string;
  tenantId: string;
  poNo: string;
  supplier: string;
  items: POItem[];
  totalCost: number;
  status: "DRAFT" | "ORDERED" | "PARTIAL" | "RECEIVED" | "CANCELLED";
  notes: string;
  createdAt: string;
}

export const PurchaseManager: React.FC = () => {
  const { currentTenantId, products, addLog } = useSaaS();
  const { showToast } = useToast();
  const { confirm: showConfirm } = useConfirm();

  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  // Form fields
  const [supplier, setSupplier] = useState("");
  const [poItems, setPoItems] = useState<POItem[]>([{ productId: "", productName: "", qty: 1, unitPrice: 0 }]);
  const [notes, setNotes] = useState("");

  const filtered = pos.filter(
    (p) =>
      p.poNo.toLowerCase().includes(search.toLowerCase()) ||
      p.supplier.toLowerCase().includes(search.toLowerCase()),
  );

  const addItemRow = () => {
    setPoItems((prev) => [...prev, { productId: "", productName: "", qty: 1, unitPrice: 0 }]);
  };

  const removeItemRow = (idx: number) => {
    setPoItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof POItem, value: any) => {
    setPoItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        if (field === "productName") {
          const cleanValue = String(value || "").trim();
          const found = products.find(
            (p) => p.tenantId === currentTenantId && (p.name.toLowerCase().includes(cleanValue.toLowerCase()) || p.sku?.toLowerCase().includes(cleanValue.toLowerCase())),
          );
          return {
            ...item,
            productName: value,
            productId: found?.id || "",
            unitPrice: found?.purchaseCost || item.unitPrice,
          };
        }
        if (field === "qty" || field === "unitPrice") {
          return { ...item, [field]: Math.max(0, Number(value) || 0) };
        }
        return { ...item, [field]: value };
      }),
    );
  };

  const totalPOCost = poItems.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);

  const handleCreatePO = () => {
    if (!supplier.trim() || poItems.length === 0 || poItems.every((i) => !i.productName)) {
      showToast("Nama supplier dan minimal 1 item barang wajib diisi.", "error");
      return;
    }

    const cleanItems = poItems
      .map((i) => ({ ...i, productName: i.productName.trim(), qty: Math.max(0, Number(i.qty) || 0), unitPrice: Math.max(0, Number(i.unitPrice) || 0) }))
      .filter((i) => i.productName && i.qty > 0 && i.unitPrice >= 0);
    if (cleanItems.length === 0) {
      showToast("Minimal 1 item PO valid wajib diisi.", "error");
      return;
    }

    const cleanSupplier = supplier.trim();
    const cleanNotes = notes.trim();
    const cleanTotalPOCost = cleanItems.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);

    const newPO: PurchaseOrder = {
      id: generateUUID(),
      tenantId: currentTenantId,
      poNo: `PO-${Date.now().toString().slice(-6)}`,
      supplier: cleanSupplier,
      items: cleanItems,
      totalCost: cleanTotalPOCost,
      status: "DRAFT",
      notes: cleanNotes,
      createdAt: new Date().toISOString(),
    };

    setPos((prev) => [newPO, ...prev]);
    setShowForm(false);
    setSupplier("");
    setPoItems([{ productId: "", productName: "", qty: 1, unitPrice: 0 }]);
    setNotes("");
    showToast(`Purchase Order ${newPO.poNo} berhasil dibuat!`, "success");
    if (addLog) addLog("Buat PO", `Supplier: ${cleanSupplier}, Total: Rp${cleanTotalPOCost.toLocaleString()}`, "INVENTORY");
  };

  const updateStatus = (id: string, status: PurchaseOrder["status"]) => {
    setPos((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    showToast(`Status PO diubah menjadi ${status}`, "success");
  };

  const handleDelete = async (id: string, poNo: string) => {
    if (await showConfirm({ title: "Hapus PO", message: `Hapus ${poNo}?`, confirmLabel: "Ya, Hapus", type: "danger" })) {
      setPos((prev) => prev.filter((p) => p.id !== id));
      showToast("PO berhasil dihapus.", "warning");
    }
  };

  const statusBadge = (s: PurchaseOrder["status"]) => {
    const map = {
      DRAFT: "bg-slate-100 text-slate-600",
      ORDERED: "bg-blue-50 text-blue-700",
      PARTIAL: "bg-amber-50 text-amber-700",
      RECEIVED: "bg-emerald-50 text-emerald-700",
      CANCELLED: "bg-rose-50 text-rose-700",
    };
    return `px-2 py-0.5 rounded text-[9px] font-bold ${map[s]}`;
  };

  return (
    <div className="space-y-6 dark:text-zinc-300 dark:[&_.bg-white]:bg-zinc-950 dark:[&_.bg-slate-50]:bg-zinc-900 dark:[&_.border-slate-100]:border-zinc-800 dark:[&_.border-slate-200]:border-zinc-800 dark:[&_.text-slate-800]:text-zinc-100 dark:[&_.text-slate-700]:text-zinc-200 dark:[&_.text-slate-600]:text-zinc-300 dark:[&_input]:bg-zinc-950 dark:[&_input]:text-zinc-100 dark:[&_textarea]:bg-zinc-950 dark:[&_textarea]:text-zinc-100 dark:[&_select]:bg-zinc-950 dark:[&_select]:text-zinc-100 dark:[&_tr:hover]:bg-zinc-900" id="purchase-pane">
      <div className="flex justify-between items-start bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-indigo-500" /> Purchase Order (PO)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Buat dan kelola pesanan pembelian barang ke supplier / vendor.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" />
            <input
              placeholder="Cari PO / supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-accent hover:bg-accent-hover rounded-lg cursor-pointer shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" /> Buat PO Baru
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-indigo-200 rounded-xl p-5 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-xs uppercase text-accent tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> Form Purchase Order Baru
            </h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Nama Supplier / Vendor</label>
            <input
              placeholder="PT Sparepart Jaya"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Item Barang</label>
              <button
                onClick={addItemRow}
                className="text-[10px] font-bold text-accent hover:text-indigo-800 cursor-pointer flex items-center gap-1"
              >
                <PlusCircle className="w-3 h-3" /> Tambah Item
              </button>
            </div>
            {poItems.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  placeholder="Nama barang..."
                  value={item.productName}
                  onChange={(e) => updateItem(idx, "productName", e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={item.qty || ""}
                  onChange={(e) => updateItem(idx, "qty", Number(e.target.value))}
                  className="w-16 px-2 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <input
                  type="number"
                  placeholder="Harga"
                  value={item.unitPrice || ""}
                  onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))}
                  className="w-28 px-2 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <span className="text-xs font-bold text-accent w-20 text-right">
                  Rp {(item.qty * item.unitPrice).toLocaleString()}
                </span>
                {poItems.length > 1 && (
                  <button onClick={() => removeItemRow(idx)} className="p-1 text-rose-400 hover:text-rose-600 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            <div className="text-right text-sm font-black text-indigo-800 pt-2 border-t border-slate-100">
              Total: Rp {totalPOCost.toLocaleString()}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Catatan</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <button
            onClick={handleCreatePO}
            className="w-full py-2 text-xs font-bold text-white bg-accent hover:bg-accent-hover rounded-lg cursor-pointer shadow-sm transition-all"
          >
            <CheckCircle2 className="w-4 h-4 inline mr-1.5" /> Buat Purchase Order
          </button>
        </div>
      )}

      {pos.length === 0 && !showForm && (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500">Belum ada Purchase Order</p>
          <p className="text-[10px] text-slate-400 mt-1">Klik "Buat PO Baru" untuk memulai.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">PO No</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-bold text-slate-800">{po.poNo}</td>
                  <td className="px-4 py-3"><Truck className="w-3 h-3 inline mr-1 text-slate-400" />{po.supplier}</td>
                  <td className="px-4 py-3">
                    <Package className="w-3 h-3 inline mr-1 text-slate-400" />
                    {po.items.length} item
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-accent">Rp {po.totalCost.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <select
                      value={po.status}
                      onChange={(e) => updateStatus(po.id, e.target.value as any)}
                      className={`${statusBadge(po.status)} border-0 cursor-pointer text-[9px] font-bold`}
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="ORDERED">ORDERED</option>
                      <option value="PARTIAL">PARTIAL</option>
                      <option value="RECEIVED">RECEIVED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-[10px] text-slate-400 font-mono">
                    {new Date(po.createdAt).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(po.id, po.poNo)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
