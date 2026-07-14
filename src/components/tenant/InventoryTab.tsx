import * as React from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  Package,
  Search,
  PlusCircle,
  ArrowRightLeft,
  FileSpreadsheet,
  AlertTriangle,
  CheckSquare,
  Zap,
  Clock,
  Truck,
  Layers,
  History,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  X,
  AlertCircle,
  Edit,
  Plus,
  Pencil,
} from "lucide-react";
import { useSaaS } from "../../context/SaaSContext";
import { useToast } from "../ui/Toast";
import { useConfirm } from "../ui/ConfirmDialog";
import { SmallPartsSearch } from "../SmallPartsSearch";
import { TradeInCalculator } from "../TradeInCalculator";
import { CannibalWorkshop } from "../CannibalWorkshop";
import { AssetManager } from "../AssetManager";
import { ConsignmentManager } from "../ConsignmentManager";
import { PurchaseManager } from "../PurchaseManager";
import { ErrorBoundary } from "../ErrorBoundary";
import { StorageLocationManager, getStorageLocations } from "./StorageLocationManager";

import {
  InventoryProduct,
  Warehouse,
  InventoryTransfer,
  ServiceTicket,
  ServiceStatus,
  ItemGrade,
} from "../../types";

interface InventoryTabProps {
  activeSubTab: string;
  tenantProducts?: InventoryProduct[];
  warehouses?: Warehouse[];
  inventoryTransfers?: InventoryTransfer[];
  currentTenantId?: string;
  getBranchStock?: (p: InventoryProduct) => number;
  addInventoryProduct?: any;
  updateInventoryProduct?: any;
  createInventoryTransfer?: any;
  updateInventoryTransferStatus?: any;
  updateServiceTicket?: any;
  tenantWhs?: Warehouse[];
  pendingPartRequests?: any[];
  currentBranchId?: string;
}

export const InventoryTab: React.FC<InventoryTabProps> = ({
  activeSubTab,
  tenantProducts = [],
  warehouses = [],
  inventoryTransfers = [],
  currentTenantId = "",
  getBranchStock,
  addInventoryProduct,
  updateInventoryProduct,
  createInventoryTransfer,
  updateInventoryTransferStatus,
  updateServiceTicket,
  tenantWhs = [],
  pendingPartRequests = [],
  currentBranchId = "",
}) => {
  const { showToast } = useToast();
  const { confirm: showConfirm } = useConfirm();
  const { branches, products } = useSaaS();

  // Local state for add/edit product
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [addProdName, setAddProdName] = useState("");
  const [addProdSku, setAddProdSku] = useState("");
  const [addProdBarcode, setAddProdBarcode] = useState("");
  const [addProdCategory, setAddProdCategory] = useState("SPAREPART");
  const [addProdPurchaseCost, setAddProdPurchaseCost] = useState("");
  const [addProdSellPrice, setAddProdSellPrice] = useState("");
  const [addProdStockQty, setAddProdStockQty] = useState("");
  const [addProdMinStock, setAddProdMinStock] = useState("");
  const [addProdUnit, setAddProdUnit] = useState("pcs");
  const [addProdBranchId, setAddProdBranchId] = useState("");
  const [addProdWarehouseId, setAddProdWarehouseId] = useState("");
  const [addProdStorageLocId, setAddProdStorageLocId] = useState("");

  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [selectedEditProduct, setSelectedEditProduct] =
    useState<InventoryProduct | null>(null);
  const [editProdName, setEditProdName] = useState("");
  const [editProdSku, setEditProdSku] = useState("");
  const [editProdPurchaseCost, setEditProdPurchaseCost] = useState("");
  const [editProdSellPrice, setEditProdSellPrice] = useState("");
  const [editProdStockQty, setEditProdStockQty] = useState("");
  const [editProdMinStock, setEditProdMinStock] = useState("");
  const [editProdWarehouseStock, setEditProdWarehouseStock] = useState<Record<string, string>>({});
  const [editProdStorageLocId, setEditProdStorageLocId] = useState("");

  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set());

  // Bulk transfers
  const [selectedTrfFromWarehouse, setSelectedTrfFromWarehouse] = useState("");
  const [selectedTrfToWarehouse, setSelectedTrfToWarehouse] = useState("");
  const [trfNote, setTrfNote] = useState("");
  const [bulkInputText, setBulkInputText] = useState("");
  const [bulkTrfItems, setBulkTrfItems] = useState<
    { productId: string; qty: number }[]
  >([]);

  const [trfStatusNote, setTrfStatusNote] = useState("");
  const [selectedTrfIdForStepper, setSelectedTrfIdForStepper] = useState<
    string | null
  >(null);

  // Helper functions that might be needed in the JSX
  const handleParseBulkInput = () => {
    // Basic bulk parsing logic
    if (!bulkInputText.trim()) return;
    const lines = bulkInputText.split("\n");
    const newItems: { productId: string; qty: number }[] = [];
    let addedCount = 0;
    let failedCount = 0;

    lines.forEach((line) => {
      const parts = line.split(/[,\t;]/);
      if (parts.length >= 2) {
        const pProd = parts[0].trim();
        const qtyStr = parts[1].trim();
        const qty = parseInt(qtyStr, 10);

        const prod = tenantProducts.find(
          (p) =>
            p.sku.toLowerCase() === pProd.toLowerCase() ||
            p.barcode?.toLowerCase() === pProd.toLowerCase() ||
            p.name.toLowerCase() === pProd.toLowerCase(),
        );

        if (prod && !isNaN(qty) && qty > 0) {
          const existingIdx = newItems.findIndex(
            (i) => i.productId === prod.id,
          );
          if (existingIdx >= 0) {
            newItems[existingIdx].qty += qty;
          } else {
            newItems.push({ productId: prod.id, qty });
          }
          addedCount++;
        } else {
          failedCount++;
        }
      }
    });

    setBulkTrfItems([...bulkTrfItems, ...newItems]);
    setBulkInputText("");
    if (failedCount > 0) {
      showToast(
        `${addedCount} baris berhasil diparse. ${failedCount} baris gagal (SKU tidak ditemukan atau qty tidak valid).`,
        "warning",
      );
    } else if (addedCount > 0) {
      showToast(
        `${addedCount} item berhasil ditambahkan dari teks.`,
        "success",
      );
    }
  };

  const getProductLabel = (id: string) =>
    tenantProducts.find((p) => p.id === id)?.name || id;
  const getWarehouseLabel = (id: string) =>
    warehouses.find((w) => w.id === id)?.name || id;

  const proactiveSuggestions = React.useMemo(() => {
    const list = [];
    const lowStockProds = tenantProducts.filter((p) => p.stockQty <= p.minStock && p.category !== "JASA");
    for (const p of lowStockProds) {
      list.push({
        type: "REORDER",
        productId: p.id,
        message: `Stok ${p.name} menipis (sisa ${p.stockQty} ${p.unit || 'pcs'}). Batas minimum: ${p.minStock} ${p.unit || 'pcs'}. Disarankan lakukan pemesanan ulang (reorder).`,
      });
    }
    const activeWhs = warehouses.filter((w) => w.tenantId === currentTenantId);
    if (activeWhs.length >= 2) {
      for (const p of tenantProducts) {
        if (p.category === "JASA") continue;
        const stocks = activeWhs.map((w) => ({
          warehouseId: w.id,
          name: w.name,
          qty: Number(p.warehouseStock?.[w.id] ?? 0),
        }));
        const highStock = stocks.find((s) => s.qty > (p.minStock || 5) * 1.5);
        const zeroStock = stocks.find((s) => s.qty === 0);
        if (highStock && zeroStock) {
          list.push({
            type: "REBALANCING",
            productId: p.id,
            message: `Stok ${p.name} berlebih di ${highStock.name} (${highStock.qty} pcs), tapi kosong di ${zeroStock.name}. Pertimbangkan untuk melakukan transfer stok.`,
          });
          break;
        }
      }
    }
    return list.slice(0, 3);
  }, [tenantProducts, warehouses, currentTenantId]);

  return (
    <>
      <div className="space-y-6" id="inventory-pane">
        {activeSubTab === "stock" && (
          <div className="space-y-4">
            {/* Technician Part Requests UI */}
            {pendingPartRequests.length > 0 && (
              <div className="bg-white border border-amber-200 rounded-xl shadow-sm overflow-hidden mb-6">
                <div className="px-5 py-4 border-b border-amber-100 bg-amber-50 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600" />{" "}
                      Permintaan Part Baru dari Teknisi
                    </h3>
                    <p className="text-[10px] text-amber-700/70 mt-0.5">
                      Terdapat {pendingPartRequests.length} permintaan sparepart
                      yang butuh persetujuan Gudang/Frontdesk.
                    </p>
                  </div>
                </div>
                <div className="p-0">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3">Tiket / Teknisi</th>
                        <th className="px-4 py-3">Sparepart Diminta</th>
                        <th className="px-4 py-3">Qty</th>
                        <th className="px-4 py-3 text-right">Aksi Gudang</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingPartRequests.map((item, idx) => {
                        const pProd = tenantProducts.find(
                          (p) => p.id === item.request.sparepartId,
                        );
                        const currentStock = pProd ? getBranchStock(pProd) : 0;
                        return (
                          <tr
                            key={idx}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-800">
                                {item.ticket.ticketNo}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {item.ticket.deviceName}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-700">
                                {pProd ? pProd.name : "Unknown Part"}
                              </div>
                              <div className="text-[9px] font-mono text-slate-400">
                                Stok Tersedia: {currentStock}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono font-bold">
                              {item.request.qty}
                            </td>
                            <td className="px-4 py-3 text-right space-x-2">
                              <button
                                onClick={async () => {
                                  if (
                                    await showConfirm({
                                      title: "Tolak Permintaan Part",
                                      message:
                                        "Tolak permintaan part ini? Teknisi akan diberitahu bahwa part tidak tersedia.",
                                      confirmLabel: "Ya, Tolak",
                                      type: "warning",
                                    })
                                  ) {
                                    const updatedReqs =
                                      item.ticket.partsRequested.map(
                                        (r: any) =>
                                          r.id === item.request.id
                                            ? { ...r, status: "REJECTED" }
                                            : r,
                                      );
                                    updateServiceTicket(item.ticket.id, {
                                      partsRequested: updatedReqs,
                                    });
                                  }
                                }}
                                className="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition-all"
                              >
                                Tolak
                              </button>
                              <button
                                onClick={async () => {
                                  if (!pProd) {
                                    showToast("Part tidak valid.", "error");
                                    return;
                                  }
                                  if (currentStock < item.request.qty) {
                                    showToast("Stok tidak mencukupi!", "error");
                                    return;
                                  }
                                  if (
                                    await showConfirm({
                                      title: "Setujui Permintaan Part",
                                      message:
                                        "Setujui dan potong stok gudang sekarang?",
                                      confirmLabel: "Setujui & Potong Stok",
                                    })
                                  ) {
                                    // 1. Update request status
                                    const updatedReqs =
                                      item.ticket.partsRequested.map(
                                        (r: any) =>
                                          r.id === item.request.id
                                            ? { ...r, status: "APPROVED" }
                                            : r,
                                      );

                                    // 2. Add to partsUsed
                                    const newPartUsed = {
                                      productId: pProd.id,
                                      name: pProd.name,
                                      quantity: item.request.qty,
                                      unitPrice: pProd.sellPrice ?? 0,
                                      totalPrice:
                                        (pProd.sellPrice ?? 0) *
                                        item.request.qty,
                                    };
                                    const currentPartsUsed =
                                      item.ticket.partsUsed || [];
                                    const newEstimatedCost =
                                      item.ticket.estimatedCost +
                                      newPartUsed.totalPrice;

                                    updateServiceTicket(item.ticket.id, {
                                      partsRequested: updatedReqs,
                                      partsUsed: [
                                        ...currentPartsUsed,
                                        newPartUsed,
                                      ],
                                      estimatedCost: newEstimatedCost,
                                    });

                                    // 3. Deduct stock
                                    updateInventoryProduct(pProd.id, {
                                      stockQty:
                                        pProd.stockQty - item.request.qty,
                                    });

                                    showToast(
                                      "Permintaan disetujui, part ditambahkan ke tiket, dan stok berhasil dipotong!",
                                      "success",
                                    );
                                  }
                                }}
                                className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-bold shadow-xs transition-all"
                              >
                                Setujui & Potong Stok
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    Kartu Stok Suku Cadang & Aksesoris
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Kelola data logistik, harga beli (HPP), harga jual, dan
                    status reorder stok.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAddProductOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Barang
                  </button>
                  <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold font-mono">
                    Multi-Warehouse
                  </span>
                </div>
              </div>
              <div className="responsive-table-container max-h-[500px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-mono">
                    <tr>
                      <th className="px-4 py-3">Barang / SKU</th>
                      <th className="px-4 py-3">Kategori</th>
                      <th className="px-4 py-3">HPP (Average)</th>
                      <th className="px-4 py-3">Harga Jual</th>
                      <th className="px-4 py-3">Stok Gudang</th>
                      <th className="px-4 py-3 text-right">Status</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tenantProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-800 leading-snug">
                            {p.name}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400">
                            {p.sku}
                          </p>
                          {p.storageLocationId && (() => {
                            const loc = getStorageLocations(currentTenantId).find(l => l.id === p.storageLocationId);
                            return loc ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mt-1 bg-indigo-50 text-indigo-700 text-[8px] font-mono font-bold rounded border border-indigo-100">
                                📍 {loc.code}
                              </span>
                            ) : null;
                          })()}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[9px] font-mono uppercase">
                            {p.category}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-600">
                          Rp {(p.purchaseCost ?? 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-blue-600">
                          Rp {(p.sellPrice ?? 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-800 font-mono">
                            {getBranchStock(p)} {p.unit}
                          </p>
                          <p className="text-[9px] text-slate-400 font-mono mt-1">
                            Global: {p.stockQty} | Min: {p.minStock}
                          </p>
                          <button
                            onClick={() => {
                              const next = new Set(expandedProductIds);
                              if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                              setExpandedProductIds(next);
                            }}
                            className="mt-1 text-[9px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                          >
                            {expandedProductIds.has(p.id) ? '▲ Sembunyikan' : '▼ Stok Lain'}
                          </button>
                          {expandedProductIds.has(p.id) && (
                            <div className="mt-2 space-y-1 bg-slate-50/50 rounded-lg p-2 border border-slate-100 max-h-40 overflow-y-auto">
                              {branches.filter(b => b.tenantId === currentTenantId).map(b => {
                                const branchWhIds = warehouses.filter(w => w.branchId === b.id).map(w => w.id);
                                const sum = branchWhIds.reduce((s, whId) => s + (Number(p.warehouseStock?.[whId]) || 0), 0);
                                return (
                                  <div key={b.id} className="flex justify-between items-center gap-2">
                                    <span className="text-[9px] font-semibold text-slate-500 truncate w-1/2">{b.name}</span>
                                    <span className="font-mono text-[10px] text-slate-700 font-bold">
                                      {sum} {p.unit}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {p.category !== "JASA" &&
                          getBranchStock(p) <= p.minStock ? (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded">
                              REORDER ALERT
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                              STABLE
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => {
                              setSelectedEditProduct(p);
                              setEditProdName(p.name);
                              setEditProdSku(p.sku);
                              setEditProdSellPrice(
                                (p.sellPrice ?? 0).toString(),
                              );
                              setEditProdPurchaseCost(
                                (p.purchaseCost ?? 0).toString(),
                              );
                              setEditProdStockQty((p.stockQty ?? 0).toString());
                              setEditProdMinStock((p.minStock ?? 5).toString());
                              const ws: Record<string, string> = {};
                              (warehouses || []).filter(w => w.tenantId === currentTenantId).forEach(w => {
                                ws[w.id] = ((p.warehouseStock || {})[w.id] || 0).toString();
                              });
                              setEditProdWarehouseStock(ws);
                              setEditProdStorageLocId(p.storageLocationId || "");
                              setIsEditProductOpen(true);
                            }}
                            className="p-1.5 text-indigo-600 hover:text-indigo-900 rounded-lg hover:bg-indigo-50 inline-flex items-center gap-1 font-extrabold text-[10px] uppercase cursor-pointer transition-all border border-indigo-100"
                          >
                            <Pencil className="w-3 h-3" /> Edit Harga/Stok
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add Product Modal Overlay */}
            {isAddProductOpen && createPortal(
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
                <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-fadeIn overflow-y-auto my-auto" style={{ maxHeight: "90vh" }}>
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                      <PlusCircle className="w-5 h-5 text-indigo-600 animate-pulse" />{" "}
                      Tambah Barang Baru
                    </h3>
                    <button
                      onClick={() => setIsAddProductOpen(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-bold cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 text-xs">
                    <div className="col-span-2">
                      <label className="block text-slate-500 font-semibold mb-1">
                        Nama Barang / Jasa
                      </label>
                      <input
                        type="text"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                        placeholder="Contoh: LCD Replacement Asus Rog GL503"
                        value={addProdName}
                        onChange={(e) => setAddProdName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">
                        SKU
                      </label>
                      <input
                        type="text"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                        placeholder="Contoh: SKU-LCD-ASUS"
                        value={addProdSku}
                        onChange={(e) => setAddProdSku(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">
                        Barcode
                      </label>
                      <input
                        type="text"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                        placeholder="EAN-13 Barcode"
                        value={addProdBarcode}
                        onChange={(e) => setAddProdBarcode(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">
                        Kategori
                      </label>
                      <select
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                        value={addProdCategory}
                        onChange={(e) =>
                          setAddProdCategory(e.target.value as any)
                        }
                      >
                        <option value="SPAREPART">SPAREPART</option>
                        <option value="AKSESORIS">AKSESORIS</option>
                        <option value="JASA">JASA</option>
                        <option value="LAINNYA">LAINNYA</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">
                        Satuan
                      </label>
                      <input
                        type="text"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                        value={addProdUnit}
                        onChange={(e) => setAddProdUnit(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">
                        Harga Beli (HPP)
                      </label>
                      <input
                        type="number"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                        placeholder="Rp"
                        value={addProdPurchaseCost}
                        onChange={(e) => setAddProdPurchaseCost(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">
                        Harga Jual
                      </label>
                      <input
                        type="number"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                        placeholder="Rp"
                        value={addProdSellPrice}
                        onChange={(e) => setAddProdSellPrice(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">
                        Stok Awal
                      </label>
                      <input
                        type="number"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                        placeholder="Jumlah"
                        value={addProdStockQty}
                        onChange={(e) => setAddProdStockQty(e.target.value)}
                      />
                    </div>

                    <div className="col-span-2 grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">
                          Cabang
                        </label>
                        <select
                          value={addProdBranchId}
                          onChange={(e) => { setAddProdBranchId(e.target.value); setAddProdWarehouseId(""); }}
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                        >
                          <option value="">Pilih Cabang...</option>
                          {branches.filter(b => b.tenantId === currentTenantId).map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">
                          Gudang Tujuan
                        </label>
                        <select
                          value={addProdWarehouseId}
                          onChange={(e) => setAddProdWarehouseId(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                        >
                          <option value="">Pilih Gudang...</option>
                          {(warehouses || []).filter(w => w.tenantId === currentTenantId && w.branchId === addProdBranchId).map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-slate-500 font-semibold mb-1">
                        Lokasi Rak / Penyimpanan (opsional)
                      </label>
                      <select
                        value={addProdStorageLocId}
                        onChange={e => setAddProdStorageLocId(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                      >
                        <option value="">-- Pilih Rak --</option>
                        {getStorageLocations(currentTenantId).filter(l => l.branchId === currentBranchId && l.type === "SPAREPART").map(l => (
                          <option key={l.id} value={l.id}>{l.code} — {l.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">
                        Batas Minimal Reorder
                      </label>
                      <input
                        type="number"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                        placeholder="5"
                        value={addProdMinStock}
                        onChange={(e) => setAddProdMinStock(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-850">
                    <button
                      onClick={() => setIsAddProductOpen(false)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => {
                        if (!addProdName.trim() || !addProdSku.trim()) {
                          showToast(
                            "Nama barang dan SKU wajib diisi!",
                            "error",
                          );
                          return;
                        }
                        if (
                          Number(addProdPurchaseCost) < 0 ||
                          Number(addProdSellPrice) < 0 ||
                          Number(addProdStockQty) < 0 ||
                          Number(addProdMinStock) < 0
                        ) {
                          showToast("Nilai numerik tidak boleh negatif.", "error");
                          return;
                        }
                        if (Number(addProdSellPrice) < Number(addProdPurchaseCost)) {
                          showToast(
                            "Warning: Harga jual lebih rendah dari harga beli (rugi)!",
                            "warning",
                          );
                        }
                        // stockQty = sum of warehouseStock values for consistency
                        const warehouseStockObj = addProdWarehouseId
                          ? { [addProdWarehouseId]: Number(addProdStockQty) || 0 }
                          : { [tenantWhs[0]?.id || warehouses[0]?.id || ""]: Number(addProdStockQty) || 0 };
                        const totalStock = Object.values(warehouseStockObj).reduce((sum, q) => sum + (q || 0), 0);
                        const cleanName = addProdName.trim();
                        const cleanSku = addProdSku.trim().toUpperCase();
                        const cleanBarcode = (addProdBarcode.trim() || Date.now().toString().slice(-12)).toUpperCase();
                        const cleanUnit = addProdUnit.trim().toLowerCase();
                        addInventoryProduct({
                          name: cleanName,
                          sku: cleanSku,
                          barcode: cleanBarcode,
                          category: addProdCategory,
                          purchaseCost: Number(addProdPurchaseCost) || 0,
                          sellPrice: Number(addProdSellPrice) || 0,
                          stockQty: totalStock,
                          unit: cleanUnit,
                          minStock: Number(addProdMinStock) || 5,
                          reorderLevel: Number(addProdMinStock) || 5,
                          warehouseStock: warehouseStockObj,
                          storageLocationId: addProdStorageLocId || undefined,
                          grade: ItemGrade.GRADE_A,
                          isConsignment: false,
                        });
                        setIsAddProductOpen(false);
                        setAddProdName("");
                        setAddProdSku("");
                        setAddProdBarcode("");
                        setAddProdPurchaseCost("");
                        setAddProdSellPrice("");
                        setAddProdStockQty("");
                        setAddProdUnit("Pcs");
                        setAddProdMinStock("5");
                        setAddProdBranchId("");
                        setAddProdWarehouseId("");
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                    >
                      Simpan Produk
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}

            {/* Edit Product Modal Overlay */}
            {isEditProductOpen && selectedEditProduct && createPortal(
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
                <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-fadeIn overflow-y-auto my-auto" style={{ maxHeight: "90vh" }}>
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                      <Pencil className="w-4 h-4 text-indigo-600" /> Ubah Detail
                      & Harga Barang
                    </h3>
                    <button
                      onClick={() => setIsEditProductOpen(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-bold cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">
                        Nama Barang
                      </label>
                      <input
                        type="text"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                        value={editProdName}
                        onChange={(e) => setEditProdName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">
                        SKU
                      </label>
                      <input
                        type="text"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                        value={editProdSku}
                        onChange={(e) => setEditProdSku(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">
                          Harga Beli (HPP)
                        </label>
                        <input
                          type="number"
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                          value={editProdPurchaseCost}
                          onChange={(e) =>
                            setEditProdPurchaseCost(e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">
                          Harga Jual
                        </label>
                        <input
                          type="number"
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-blue-600 font-bold"
                          value={editProdSellPrice}
                          onChange={(e) => setEditProdSellPrice(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">
                        Stok per Gudang
                      </label>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto p-2 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        {(warehouses || []).filter(w => w.tenantId === currentTenantId).map(w => {
                          const br = branches.find(b => b.id === w.branchId);
                          return (
                            <div key={w.id} className="flex items-center gap-2">
                              <span className="text-[11px] font-semibold text-slate-500 w-1/2 truncate">
                                {w.name}
                                <span className="text-[9px] text-slate-400 font-normal ml-1">({br ? br.name : '-'})</span>
                              </span>
                              <input
                                type="number"
                                className="w-1/2 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg font-mono text-xs text-right"
                                value={editProdWarehouseStock[w.id] || "0"}
                                onChange={(e) => setEditProdWarehouseStock(prev => ({ ...prev, [w.id]: e.target.value }))}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">
                        Lokasi Rak / Penyimpanan
                      </label>
                      <select
                        value={editProdStorageLocId}
                        onChange={e => setEditProdStorageLocId(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                      >
                        <option value="">-- Pilih Rak --</option>
                        {getStorageLocations(currentTenantId).filter(l => l.branchId === currentBranchId && l.type === "SPAREPART").map(l => (
                          <option key={l.id} value={l.id}>{l.code} — {l.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">
                          Stok Total (Auto)
                        </label>
                        <input
                          type="number"
                          className="w-full p-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-mono text-slate-400"
                          value={Object.values(editProdWarehouseStock).reduce((s, v) => s + (Number(v) || 0), 0)}
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">
                          Min. Reorder Stok
                        </label>
                        <input
                          type="number"
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                          value={editProdMinStock}
                          onChange={(e) => setEditProdMinStock(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-850">
                    <button
                      onClick={() => setIsEditProductOpen(false)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => {
                        if (!editProdName.trim() || !editProdSku.trim()) {
                          showToast(
                            "Nama barang dan SKU wajib diisi!",
                            "error",
                          );
                          return;
                        }
                        const parsedWs: Record<string, number> = {};
                        let totalStock = 0;
                        Object.entries(editProdWarehouseStock).forEach(([whId, qtyStr]) => {
                          const q = Number(qtyStr) || 0;
                          parsedWs[whId] = q;
                          totalStock += q;
                        });
                        if (
                          Number(editProdPurchaseCost) < 0 ||
                          Number(editProdSellPrice) < 0 ||
                          Number(editProdMinStock) < 0 ||
                          Object.values(editProdWarehouseStock).some(v => Number(v) < 0)
                        ) {
                          showToast("Nilai numerik tidak boleh negatif.", "error");
                          return;
                        }
                        if (Number(editProdSellPrice) < Number(editProdPurchaseCost)) {
                          showToast(
                            "Warning: Harga jual lebih rendah dari harga beli (rugi)!",
                            "warning",
                          );
                        }
                        updateInventoryProduct(selectedEditProduct.id, {
                          name: editProdName,
                          sku: editProdSku,
                          sellPrice: Number(editProdSellPrice) || 0,
                          purchaseCost: Number(editProdPurchaseCost) || 0,
                          stockQty: totalStock,
                          warehouseStock: parsedWs,
                          minStock: Number(editProdMinStock) || 0,
                          storageLocationId: editProdStorageLocId || undefined,
                        });
                        setIsEditProductOpen(false);
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                    >
                      Simpan Perubahan
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>
        )}

        {activeSubTab === "stock-transfer" &&
          (() => {
            // Helper to resolve human-readable labels
            const getWarehouseLabel = (whId: string) => {
              const wh = warehouses.find((w) => w.id === whId);
              if (!wh) return "Gudang Utama";
              const br = branches.find((b) => b.id === wh.branchId);
              return `${wh.name} (${br ? br.name : "Cabang"})`;
            };

            const getProductLabel = (prodId: string) => {
              const p = products.find((prod) => prod.id === prodId);
              return p ? `${p.name} (${p.sku})` : "Produk Tidak Ditemukan";
            };

            // Proactive threshold-based stock rebalancing suggestions
            const proactiveSuggestions = (() => {
              const list: {
                id: string;
                product: InventoryProduct;
                originWhId: string;
                destWhId: string;
                originStock: number;
                destStock: number;
                minStock: number;
              }[] = [];

              const tenantWhs = warehouses.filter(
                (w) => w.tenantId === currentTenantId,
              );
              if (tenantWhs.length < 2) return [];

              tenantProducts
                .filter((p) => p.category !== "JASA")
                .forEach((p) => {
                  const stocks = p.warehouseStock || {};

                  tenantWhs.forEach((destWh) => {
                    const destStock = stocks[destWh.id] || 0;
                    const limit = p.minStock || 3;
                    if (destStock < limit) {
                      tenantWhs.forEach((originWh) => {
                        if (originWh.id === destWh.id) return;
                        const originStock = stocks[originWh.id] || 0;
                        // If origin has healthy excess inventory
                        if (originStock > limit * 1.5 && originStock >= 5) {
                          list.push({
                            id: `sug-${p.id}-${originWh.id}-${destWh.id}`,
                            product: p,
                            originWhId: originWh.id,
                            destWhId: destWh.id,
                            originStock,
                            destStock,
                            minStock: limit,
                          });
                        }
                      });
                    }
                  });
                });

              return list.slice(0, 3); // top 3 suggestions
            })();

            // Calculate overall validation for the bulk items list
            const isAllStockValid =
              bulkTrfItems.length > 0 &&
              bulkTrfItems.every((item) => {
                const p = tenantProducts.find(
                  (prod) => prod.id === item.productId,
                );
                const stock =
                  p?.warehouseStock?.[selectedTrfFromWarehouse] || 0;
                return item.qty > 0 && stock >= item.qty;
              });

            // Get selected transfer for the visual stepper
            const activeTransfer = inventoryTransfers.find(
              (t) => t.id === selectedTrfIdForStepper,
            );

            // Handler to parse and validate bulk input
            const handleParseBulkInput = () => {
              if (!bulkInputText.trim()) {
                showToast(
                  "Silakan tempel teks CSV/SKU terlebih dahulu!",
                  "error",
                );
                return;
              }
              if (!selectedTrfFromWarehouse) {
                showToast(
                  "Silakan pilih Gudang Pengirim terlebih dahulu agar kami dapat memvalidasi ketersediaan stok!",
                  "error",
                );
                return;
              }

              const lines = bulkInputText.split("\n");
              let addedCount = 0;
              let failedCount = 0;
              const failures: string[] = [];
              const newItems = [...bulkTrfItems];

              lines.forEach((line) => {
                const cleanLine = line.trim();
                if (!cleanLine) return; // skip empty lines

                // Split by comma, semicolon, space, or tab
                const parts = cleanLine.split(/[,;\t]+/);
                if (parts.length < 2) {
                  failures.push(
                    `Gagal memproses baris: "${cleanLine}" - format tidak dikenal (gunakan SKU, Qty)`,
                  );
                  failedCount++;
                  return;
                }

                const sku = parts[0].trim();
                const qtyStr = parts[1].trim();
                const qty = parseInt(qtyStr, 10);

                if (isNaN(qty) || qty <= 0) {
                  failures.push(
                    `Jumlah tidak valid untuk SKU ${sku}: "${qtyStr}"`,
                  );
                  failedCount++;
                  return;
                }

                // Find product by SKU or Barcode
                const prod = tenantProducts.find(
                  (p) =>
                    p.sku.toLowerCase() === sku.toLowerCase() ||
                    p.barcode.toLowerCase() === sku.toLowerCase(),
                );

                if (!prod) {
                  failures.push(
                    `Produk dengan SKU/Barcode "${sku}" tidak ditemukan`,
                  );
                  failedCount++;
                  return;
                }

                // Check stock
                const availableStock =
                  prod.warehouseStock?.[selectedTrfFromWarehouse] || 0;
                if (availableStock < qty) {
                  failures.push(
                    `Stok "${prod.name}" tidak mencukupi. Tersedia: ${availableStock}, diminta: ${qty}`,
                  );
                  failedCount++;
                  return;
                }

                // Add to draft list
                const existingIdx = newItems.findIndex(
                  (item) => item.productId === prod.id,
                );
                if (existingIdx !== -1) {
                  newItems[existingIdx].qty += qty;
                } else {
                  newItems.push({ productId: prod.id, qty: qty });
                }
                addedCount++;
              });

              setBulkTrfItems(newItems);
              setBulkInputText("");
              if (failedCount > 0) {
                showToast(
                  `Berhasil menambahkan ${addedCount} produk. ⚠️ ${failedCount} baris bermasalah.`,
                  "info",
                );
              } else {
                showToast(
                  `Berhasil menambahkan ${addedCount} produk dari bulk input.`,
                  "success",
                );
              }
            };

            return (
              <div className="space-y-6 animate-fadeIn">
                {/* 1. Threshold-Based Proactive Suggestions Banner */}
                {proactiveSuggestions.length > 0 && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 rounded-r-xl p-5 shadow-xs space-y-3 dark:from-slate-850 dark:to-slate-800 dark:border-amber-600">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-bounce" />
                      <h4 className="font-bold text-xs text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                        Sistem Rekomendasi Rebalancing Stok Proaktif
                      </h4>
                    </div>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      Sistem kami mendeteksi bahwa beberapa cabang mengalami
                      kekurangan stok untuk produk tertentu, sementara cabang
                      lain memiliki persediaan berlebih. Ambil tindakan cepat
                      untuk menyeimbangkan stok di bawah ini:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                      {proactiveSuggestions.map((sug) => (
                        <div
                          key={sug.id}
                          className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-800 rounded-lg p-3 flex flex-col justify-between space-y-2"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-1">
                              <span className="font-bold text-[10px] text-slate-800 dark:text-slate-100 line-clamp-1">
                                {sug.product.name}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 text-[8px] font-mono font-bold shrink-0">
                                Stok Cabang Rendah
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                              Kritis di{" "}
                              <strong className="text-slate-700 dark:text-slate-300">
                                {
                                  warehouses.find((w) => w.id === sug.destWhId)
                                    ?.name
                                }
                              </strong>{" "}
                              ({sug.destStock} {sug.product.unit} / min:{" "}
                              {sug.minStock})
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                              Melimpah di{" "}
                              <strong className="text-slate-700 dark:text-slate-300">
                                {
                                  warehouses.find(
                                    (w) => w.id === sug.originWhId,
                                  )?.name
                                }
                              </strong>{" "}
                              ({sug.originStock} {sug.product.unit})
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedTrfFromWarehouse(sug.originWhId);
                              setSelectedTrfToWarehouse(sug.destWhId);
                              // Auto-fill transfer items
                              const recommendedQty = Math.max(
                                1,
                                Math.min(
                                  sug.originStock - sug.minStock,
                                  sug.minStock - sug.destStock,
                                ),
                              );
                              setBulkTrfItems([
                                {
                                  productId: sug.product.id,
                                  qty: recommendedQty,
                                },
                              ]);
                              showToast(
                                `Rekomendasi diisikan: ${sug.product.name} (${recommendedQty} ${sug.product.unit}) dari ${warehouses.find((w) => w.id === sug.originWhId)?.name} ke ${warehouses.find((w) => w.id === sug.destWhId)?.name}. Silakan tinjau form di bawah!`,
                                "info",
                              );
                            }}
                            className="w-full text-center py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[9px] uppercase tracking-wider rounded-lg cursor-pointer transition shadow-xs"
                          >
                            Isi Form Mutasi Otomatis
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Form Builder & Bulk Upload UI */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Form Builder Section */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800">
                      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 dark:bg-slate-850 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                            <Truck className="w-4 h-4 text-indigo-600" />{" "}
                            Permintaan Transfer Multi-Barang Antar Cabang
                          </h3>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Pilih cabang pengirim & penerima, lalu tambahkan
                            barang yang ingin dipindahkan.
                          </p>
                        </div>
                      </div>
                      <div className="p-5 space-y-5 text-xs">
                        {/* Warehouse Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1">
                              Origin Branch & Warehouse (Cabang Asal) *
                            </label>
                            <select
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                              value={selectedTrfFromWarehouse}
                              onChange={(e) => {
                                setSelectedTrfFromWarehouse(e.target.value);
                                // Clear items as stock validity needs to be rechecked
                                setBulkTrfItems([]);
                              }}
                            >
                              <option value="">
                                -- Pilih Cabang Pengirim --
                              </option>
                              {warehouses
                                .filter((wh) => wh.tenantId === currentTenantId)
                                .map((wh) => (
                                  <option key={wh.id} value={wh.id}>
                                    {getWarehouseLabel(wh.id)}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1">
                              Destination Branch & Warehouse (Cabang Tujuan) *
                            </label>
                            <select
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                              value={selectedTrfToWarehouse}
                              onChange={(e) =>
                                setSelectedTrfToWarehouse(e.target.value)
                              }
                            >
                              <option value="">
                                -- Pilih Cabang Penerima --
                              </option>
                              {warehouses
                                .filter(
                                  (wh) =>
                                    wh.tenantId === currentTenantId &&
                                    wh.id !== selectedTrfFromWarehouse,
                                )
                                .map((wh) => (
                                  <option key={wh.id} value={wh.id}>
                                    {getWarehouseLabel(wh.id)}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>

                        {/* Interactive Item list Builder */}
                        {selectedTrfFromWarehouse ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-slate-700 dark:text-slate-300">
                                Daftar Produk yang Akan Ditransfer (
                                {bulkTrfItems.length})
                              </h4>
                              <button
                                onClick={() => {
                                  // Add first available product or empty row
                                  const nonJasaProducts = tenantProducts.filter(
                                    (p) => p.category !== "JASA",
                                  );
                                  if (nonJasaProducts.length > 0) {
                                    setBulkTrfItems((prev) => [
                                      ...prev,
                                      {
                                        productId: nonJasaProducts[0].id,
                                        qty: 1,
                                      },
                                    ]);
                                  }
                                }}
                                className="px-2.5 py-1.5 border border-indigo-200 text-indigo-600 rounded-lg font-bold hover:bg-indigo-50 transition flex items-center gap-1 cursor-pointer dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                              >
                                <Plus className="w-3.5 h-3.5" /> Tambah Baris
                                Manual
                              </button>
                            </div>

                            {bulkTrfItems.length === 0 ? (
                              <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 dark:border-slate-800">
                                Belum ada produk ditambahkan. Gunakan tombol di
                                atas atau paste bulk di sebelah kanan untuk
                                menambahkan.
                              </div>
                            ) : (
                              <div className="border border-slate-200 rounded-xl overflow-hidden dark:border-slate-800">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-50 dark:bg-slate-850 text-slate-400 font-mono text-[9px] uppercase">
                                    <tr>
                                      <th className="px-3 py-2">Nama Barang</th>
                                      <th
                                        className="px-3 py-2 text-center"
                                        style={{ width: "90px" }}
                                      >
                                        Qty
                                      </th>
                                      <th
                                        className="px-3 py-2"
                                        style={{ width: "160px" }}
                                      >
                                        Cek Stok Asal
                                      </th>
                                      <th
                                        className="px-3 py-2 text-right"
                                        style={{ width: "50px" }}
                                      ></th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                                    {bulkTrfItems.map((item, idx) => {
                                      const activeProd = tenantProducts.find(
                                        (p) => p.id === item.productId,
                                      );
                                      const availableStock =
                                        activeProd?.warehouseStock?.[
                                          selectedTrfFromWarehouse
                                        ] || 0;
                                      const isStockSufficient =
                                        availableStock >= item.qty;

                                      return (
                                        <tr
                                          key={idx}
                                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                                        >
                                          <td className="px-3 py-2">
                                            <select
                                              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                                              value={item.productId}
                                              onChange={(e) => {
                                                const copy = [...bulkTrfItems];
                                                copy[idx].productId =
                                                  e.target.value;
                                                setBulkTrfItems(copy);
                                              }}
                                            >
                                              {tenantProducts
                                                .filter(
                                                  (p) => p.category !== "JASA",
                                                )
                                                .map((p) => (
                                                  <option
                                                    key={p.id}
                                                    value={p.id}
                                                  >
                                                    {p.name} ({p.sku})
                                                  </option>
                                                ))}
                                            </select>
                                          </td>
                                          <td className="px-3 py-2">
                                            <input
                                              type="number"
                                              min="1"
                                              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-center dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                                              value={item.qty}
                                              onChange={(e) => {
                                                const copy = [...bulkTrfItems];
                                                copy[idx].qty = Math.max(
                                                  1,
                                                  parseInt(
                                                    e.target.value,
                                                    10,
                                                  ) || 1,
                                                );
                                                setBulkTrfItems(copy);
                                              }}
                                            />
                                          </td>
                                          <td className="px-3 py-2">
                                            {isStockSufficient ? (
                                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                                ✓ Aman (Tersedia:{" "}
                                                {availableStock})
                                              </span>
                                            ) : (
                                              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                                                ✕ Kurang (Tersedia:{" "}
                                                {availableStock})
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2 text-right">
                                            <button
                                              onClick={() => {
                                                setBulkTrfItems((prev) =>
                                                  prev.filter(
                                                    (_, i) => i !== idx,
                                                  ),
                                                );
                                              }}
                                              className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 cursor-pointer dark:hover:bg-rose-950/20"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-slate-50 dark:bg-slate-850 p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-slate-400">
                            Pilih Gudang Pengirim terlebih dahulu untuk mulai
                            menambahkan barang & memvalidasi stok real-time.
                          </div>
                        )}

                        <div>
                          <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1">
                            Catatan Mutasi / Alasan Transfer
                          </label>
                          <input
                            type="text"
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                            placeholder="Contoh: Stok menipis di cabang Hertasning, pemenuhan berkala"
                            value={trfNote}
                            onChange={(e) => setTrfNote(e.target.value)}
                          />
                        </div>

                        {/* Submit Actions */}
                        <div className="flex justify-end pt-2">
                          <button
                            disabled={
                              !selectedTrfFromWarehouse ||
                              !selectedTrfToWarehouse ||
                              selectedTrfFromWarehouse === selectedTrfToWarehouse ||
                              bulkTrfItems.length === 0 ||
                              !isAllStockValid
                            }
                            onClick={() => {
                              if (
                                !selectedTrfFromWarehouse ||
                                !selectedTrfToWarehouse
                              ) {
                                showToast(
                                  "Cabang asal dan tujuan harus diisi!",
                                  "error",
                                );
                                return;
                              }
                              if (selectedTrfFromWarehouse === selectedTrfToWarehouse) {
                                showToast(
                                  "Gudang asal dan tujuan tidak boleh sama!",
                                  "error",
                                );
                                return;
                              }
                              createInventoryTransfer({
                                originWarehouseId: selectedTrfFromWarehouse,
                                destinationWarehouseId: selectedTrfToWarehouse,
                                items: bulkTrfItems,
                                note: trfNote || "Mutasi logistik cabang rutin",
                              });
                              showToast(
                                "Permintaan transfer berhasil dibuat! Berstatus 'Request Created'. Silakan packing & kirim barang pada daftar ledger riwayat.",
                                "success",
                              );
                              // Reset Form
                              setBulkTrfItems([]);
                              setTrfNote("");
                              // Select the new transfer
                              setSelectedTrfIdForStepper("");
                            }}
                            className={`font-bold text-xs px-5 py-3 rounded-xl flex items-center gap-2 cursor-pointer transition shadow-md ${
                              !selectedTrfFromWarehouse ||
                              !selectedTrfToWarehouse ||
                              selectedTrfFromWarehouse === selectedTrfToWarehouse ||
                              bulkTrfItems.length === 0 ||
                              !isAllStockValid
                                ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed"
                                : "bg-indigo-600 hover:bg-indigo-700 text-white"
                            }`}
                          >
                            <Truck className="w-4 h-4" /> Kirim Pengajuan
                            Transfer ({bulkTrfItems.length} Produk)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bulk Paste Upload Section */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 space-y-4 dark:bg-slate-900 dark:border-slate-800">
                      <div>
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />{" "}
                          Upload / Paste Data Mutasi Bulk
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Masukkan baris data SKU produk dan kuantiti secara
                          cepat (cocok copy-paste dari Excel).
                        </p>
                      </div>

                      <div className="space-y-3">
                        <label className="block text-[11px] text-slate-500 font-semibold leading-normal">
                          Format:{" "}
                          <code className="bg-slate-100 dark:bg-slate-850 px-1 py-0.5 rounded font-mono font-bold">
                            [SKU],[Quantity]
                          </code>{" "}
                          <br />
                          <span className="text-[10px] text-slate-400 font-normal">
                            Satu baris untuk satu produk. Pisahkan dengan koma
                            atau tab.
                          </span>
                        </label>
                        <textarea
                          rows={6}
                          className="w-full p-3 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                          placeholder={`prod-lcd, 2\nprod-ssd, 4`}
                          value={bulkInputText}
                          onChange={(e) => setBulkInputText(e.target.value)}
                        />
                        <button
                          disabled={!selectedTrfFromWarehouse}
                          onClick={handleParseBulkInput}
                          className={`w-full py-2.5 rounded-xl font-bold uppercase tracking-wider text-[10px] cursor-pointer transition shadow-xs flex items-center justify-center gap-1.5 ${
                            !selectedTrfFromWarehouse
                              ? "bg-slate-50 border border-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-850 dark:border-slate-800 dark:text-slate-600"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          }`}
                        >
                          <CheckSquare className="w-3.5 h-3.5" /> Parse &
                          Validasi Stok Input
                        </button>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-xl p-3.5 space-y-2 text-[10px] text-slate-500">
                        <p className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                          Petunjuk Upload:
                        </p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>
                            Pilih Gudang Pengirim terlebih dahulu sebelum
                            menekan tombol parse agar sistem dapat memvalidasi
                            stok.
                          </li>
                          <li>
                            Jika SKU valid dan stok tersedia di gudang pengirim,
                            barang akan ditambahkan ke tabel draft di kiri.
                          </li>
                          <li>
                            Tinjau ulang daftar item sebelum melakukan
                            konfirmasi akhir.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Stepper Progress Visualizer (If active) */}
                {activeTransfer && (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 space-y-6 dark:bg-slate-900 dark:border-slate-800 animate-slideUp">
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-4 gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-mono font-bold text-xs dark:bg-indigo-950/40 dark:text-indigo-400">
                            {activeTransfer.transferNo}
                          </span>
                          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                            Lacak Alur Pengiriman Stok
                          </h3>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Dari{" "}
                          {getWarehouseLabel(activeTransfer.originWarehouseId)}{" "}
                          ke{" "}
                          {getWarehouseLabel(
                            activeTransfer.destinationWarehouseId,
                          )}{" "}
                          • Alasan: {activeTransfer.note}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedTrfIdForStepper("")}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold self-start cursor-pointer"
                      >
                        Tutup Panel Pelacakan
                      </button>
                    </div>

                    {/* Stepper Steps UI */}
                    <div className="relative py-4">
                      {/* Connector Line */}
                      <div className="absolute top-1/2 left-[5%] right-[5%] h-1 bg-slate-150 -translate-y-1/2 dark:bg-slate-800" />

                      {/* Active Progress Connector */}
                      <div
                        className="absolute top-1/2 left-[5%] h-1 bg-indigo-500 -translate-y-1/2 transition-all duration-500"
                        style={{
                          width:
                            activeTransfer.status === "REQUEST_CREATED"
                              ? "0%"
                              : activeTransfer.status === "PACKED"
                                ? "33%"
                                : activeTransfer.status === "SHIPPED"
                                  ? "66%"
                                  : "90%",
                        }}
                      />

                      {/* Stepper Nodes */}
                      <div className="relative flex justify-between">
                        {/* Step 1 */}
                        <div className="flex flex-col items-center text-center space-y-1.5 w-[20%]">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition z-15 ${
                              activeTransfer.status === "REQUEST_CREATED"
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-md ring-4 ring-indigo-100 dark:ring-indigo-950"
                                : "bg-emerald-500 border-emerald-500 text-white"
                            }`}
                          >
                            {activeTransfer.status === "REQUEST_CREATED"
                              ? "1"
                              : "✓"}
                          </div>
                          <span className="font-bold text-[10px] text-slate-700 dark:text-slate-300">
                            Permintaan Dibuat
                          </span>
                          <span className="text-[8px] text-slate-400 font-mono leading-none">
                            {new Date(
                              activeTransfer.history.find(
                                (h) => h.status === "REQUEST_CREATED",
                              )?.timestamp || "",
                            ).toLocaleTimeString()}
                          </span>
                        </div>

                        {/* Step 2 */}
                        <div className="flex flex-col items-center text-center space-y-1.5 w-[20%]">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition z-15 ${
                              activeTransfer.status === "PACKED"
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-md ring-4 ring-indigo-100 dark:ring-indigo-950"
                                : ["SHIPPED", "RECEIVED"].includes(
                                      activeTransfer.status,
                                    )
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : "bg-white border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800"
                            }`}
                          >
                            {["SHIPPED", "RECEIVED"].includes(
                              activeTransfer.status,
                            )
                              ? "✓"
                              : "2"}
                          </div>
                          <span className="font-bold text-[10px] text-slate-700 dark:text-slate-300">
                            Telah Dikemas (Packed)
                          </span>
                          <span className="text-[8px] text-slate-400 font-mono leading-none">
                            {activeTransfer.history.find(
                              (h) => h.status === "PACKED",
                            )
                              ? new Date(
                                  activeTransfer.history.find(
                                    (h) => h.status === "PACKED",
                                  )!.timestamp,
                                ).toLocaleTimeString()
                              : "-"}
                          </span>
                        </div>

                        {/* Step 3 */}
                        <div className="flex flex-col items-center text-center space-y-1.5 w-[20%]">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition z-15 ${
                              activeTransfer.status === "SHIPPED"
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-md ring-4 ring-indigo-100 dark:ring-indigo-950"
                                : activeTransfer.status === "RECEIVED"
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : "bg-white border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800"
                            }`}
                          >
                            {activeTransfer.status === "RECEIVED" ? "✓" : "3"}
                          </div>
                          <span className="font-bold text-[10px] text-slate-700 dark:text-slate-300">
                            Sedang Dikirim (Shipped)
                          </span>
                          <span className="text-[8px] text-slate-400 font-mono leading-none">
                            {activeTransfer.history.find(
                              (h) => h.status === "SHIPPED",
                            )
                              ? new Date(
                                  activeTransfer.history.find(
                                    (h) => h.status === "SHIPPED",
                                  )!.timestamp,
                                ).toLocaleTimeString()
                              : "-"}
                          </span>
                        </div>

                        {/* Step 4 */}
                        <div className="flex flex-col items-center text-center space-y-1.5 w-[20%]">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition z-15 ${
                              activeTransfer.status === "RECEIVED"
                                ? "bg-emerald-500 border-emerald-500 text-white shadow-md ring-4 ring-emerald-100 dark:ring-emerald-950"
                                : "bg-white border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800"
                            }`}
                          >
                            4
                          </div>
                          <span className="font-bold text-[10px] text-slate-700 dark:text-slate-300">
                            Diterima di Tujuan
                          </span>
                          <span className="text-[8px] text-slate-400 font-mono leading-none">
                            {activeTransfer.history.find(
                              (h) => h.status === "RECEIVED",
                            )
                              ? new Date(
                                  activeTransfer.history.find(
                                    (h) => h.status === "RECEIVED",
                                  )!.timestamp,
                                ).toLocaleTimeString()
                              : "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline History Event logs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div className="space-y-3">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300">
                          Catatan Aktivitas / Audit Trail Pengiriman:
                        </h4>
                        <div className="border border-slate-100 dark:border-slate-850 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-850/40 space-y-3.5 max-h-[160px] overflow-y-auto">
                          {activeTransfer.history.map((hist, hIdx) => (
                            <div
                              key={hIdx}
                              className="flex gap-2 text-[10px] leading-relaxed border-l-2 border-indigo-200 dark:border-indigo-800 pl-3.5 relative"
                            >
                              <span className="w-2 h-2 rounded-full bg-indigo-500 absolute -left-[5px] top-1" />
                              <div className="space-y-0.5">
                                <p className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono text-[9px]">
                                  {hist.status} •{" "}
                                  {new Date(hist.timestamp).toLocaleString(
                                    "id-ID",
                                  )}
                                </p>
                                <p className="text-slate-500 dark:text-slate-400 italic">
                                  “{hist.note || "Tanpa catatan"}”
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Transition Operations and Notes */}
                      <div className="space-y-3">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300">
                          Otorisasi Tindakan Logistik (Perbarui Status):
                        </h4>
                        <div className="border border-slate-100 dark:border-slate-850 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-850/40 space-y-4">
                          <div>
                            <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase">
                              Catatan Status Baru (Catatan kurir/kondisi barang)
                            </label>
                            <input
                              type="text"
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                              placeholder="Misal: Siap dikirim, packing aman, bubble wrap ganda"
                              value={trfStatusNote}
                              onChange={(e) => setTrfStatusNote(e.target.value)}
                            />
                          </div>

                          <div className="flex gap-2">
                            {activeTransfer.status === "REQUEST_CREATED" && (
                              <>
                                <button
                                  onClick={() => {
                                    updateInventoryTransferStatus(
                                      activeTransfer.id,
                                      "PACKED",
                                      trfStatusNote ||
                                        "Barang selesai dipacking, siap diambil kurir",
                                    );
                                    setTrfStatusNote("");
                                  }}
                                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase rounded-lg cursor-pointer transition shadow-xs"
                                >
                                  Kemas (Mark Packed)
                                </button>
                                <button
                                  onClick={() => {
                                    updateInventoryTransferStatus(
                                      activeTransfer.id,
                                      "SHIPPED",
                                      trfStatusNote ||
                                        "Barang dikirim dan keluar dari gudang asal",
                                    );
                                    setTrfStatusNote("");
                                  }}
                                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase rounded-lg cursor-pointer transition shadow-xs"
                                >
                                  Kirim Langsung (Dispatch)
                                </button>
                              </>
                            )}

                            {activeTransfer.status === "PACKED" && (
                              <button
                                onClick={() => {
                                  updateInventoryTransferStatus(
                                    activeTransfer.id,
                                    "SHIPPED",
                                    trfStatusNote ||
                                      "Barang diserahkan ke driver logistik (In Transit)",
                                  );
                                  setTrfStatusNote("");
                                }}
                                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase rounded-lg cursor-pointer transition shadow-xs"
                              >
                                Berangkatkan Driver (Ship)
                              </button>
                            )}

                            {activeTransfer.status === "SHIPPED" && (
                              <button
                                onClick={() => {
                                  updateInventoryTransferStatus(
                                    activeTransfer.id,
                                    "RECEIVED",
                                    trfStatusNote ||
                                      "Barang telah tiba dan masuk kartu stok gudang tujuan",
                                  );
                                  setTrfStatusNote("");
                                }}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase rounded-lg cursor-pointer transition shadow-xs"
                              >
                                Terima Barang (Receive Stock)
                              </button>
                            )}

                            {activeTransfer.status === "RECEIVED" && (
                              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                                ✓ Siklus mutasi logistik barang selesai
                                dikonfirmasi. Stok telah bertambah di cabang
                                penerima.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Historical Ledger View for Inventory Transfers */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800">
                  <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 dark:bg-slate-850 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <History className="w-4 h-4 text-indigo-600" /> Buku
                        Besar & Ledger Mutasi Antar Cabang
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Daftar lengkap audit trail seluruh pergerakan barang
                        antar gudang cabang beserta status pengiriman aktual.
                      </p>
                    </div>
                  </div>

                  <div className="responsive-table-container max-h-[500px]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-850 text-slate-400 uppercase text-[9px] font-mono">
                        <tr>
                          <th className="px-4 py-3">No. Mutasi</th>
                          <th className="px-4 py-3">Tanggal Pengajuan</th>
                          <th className="px-4 py-3">Gudang Pengirim</th>
                          <th className="px-4 py-3">Gudang Penerima</th>
                          <th className="px-4 py-3">Rincian Barang</th>
                          <th className="px-4 py-3">Status Pengiriman</th>
                          <th className="px-4 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {inventoryTransfers
                          .filter((t) => t.tenantId === currentTenantId)
                          .map((t) => {
                            let statusColor = "bg-slate-100 text-slate-800";
                            let statusLabel = "Menunggu";

                            if (t.status === "REQUEST_CREATED") {
                              statusColor =
                                "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900";
                              statusLabel = "Pending (Created)";
                            } else if (t.status === "PACKED") {
                              statusColor =
                                "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900";
                              statusLabel = "Ready / Packed";
                            } else if (t.status === "SHIPPED") {
                              statusColor =
                                "bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900";
                              statusLabel = "In Transit (Shipped)";
                            } else if (t.status === "RECEIVED") {
                              statusColor =
                                "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900";
                              statusLabel = "Received (Selesai)";
                            }

                            return (
                              <tr
                                key={t.id}
                                className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 cursor-pointer ${
                                  selectedTrfIdForStepper === t.id
                                    ? "bg-indigo-50/30 dark:bg-indigo-950/10"
                                    : ""
                                }`}
                                onClick={() => {
                                  setSelectedTrfIdForStepper(t.id);
                                }}
                              >
                                <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {t.transferNo}
                                </td>
                                <td className="px-4 py-3 text-slate-400 dark:text-slate-500 font-mono text-[10px]">
                                  {new Date(t.createdAt).toLocaleString(
                                    "id-ID",
                                  )}
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">
                                  {getWarehouseLabel(t.originWarehouseId)}
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">
                                  {getWarehouseLabel(t.destinationWarehouseId)}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="space-y-0.5">
                                    {t.items.map((item, iIdx) => (
                                      <p
                                        key={iIdx}
                                        className="text-[10px] text-slate-600 dark:text-slate-400"
                                      >
                                        • {getProductLabel(item.productId)}:{" "}
                                        <strong className="font-mono text-slate-800 dark:text-slate-200">
                                          {item.qty ?? item.quantity} Unit
                                        </strong>
                                      </p>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full font-bold text-[9px] font-mono uppercase ${statusColor}`}
                                  >
                                    {statusLabel}
                                  </span>
                                </td>
                                <td
                                  className="px-4 py-3 text-right"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={() => {
                                      setSelectedTrfIdForStepper(t.id);
                                    }}
                                    className="px-2 py-1 text-[10px] uppercase tracking-wide bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg cursor-pointer transition border border-indigo-150 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900"
                                  >
                                    Lacak / Atur
                                  </button>
                                </td>
                              </tr>
                            );
                          })}

                        {inventoryTransfers.filter(
                          (t) => t.tenantId === currentTenantId,
                        ).length === 0 && (
                          <tr>
                            <td
                              colSpan={7}
                              className="text-center py-8 text-slate-400 dark:text-slate-500 font-medium"
                            >
                              Belum ada riwayat transfer logistik antar cabang
                              yang diajukan.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. Warehouse Sebaran Breakdown Panel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800">
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 dark:bg-slate-850 dark:border-slate-800 flex items-center justify-between">
                      <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-emerald-600" />{" "}
                        Distribusi Stok Multi-Cabang Saat Ini
                      </h3>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[8px] font-bold font-mono">
                        REAL-TIME
                      </span>
                    </div>
                    <div className="p-4 space-y-4 text-xs max-h-[400px] overflow-y-auto">
                      {tenantProducts
                        .filter((p) => p.category !== "JASA")
                        .map((p) => {
                          const whs = warehouses.filter(
                            (w) => w.tenantId === currentTenantId,
                          );
                          return (
                            <div
                              key={p.id}
                              className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-2 dark:bg-slate-850/50 dark:border-slate-800"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-bold text-slate-800 dark:text-slate-200 leading-snug">
                                    {p.name}
                                  </p>
                                  <p className="text-[9px] font-mono text-slate-400">
                                    SKU: {p.sku}
                                  </p>
                                </div>
                                <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold font-mono text-[10px] dark:bg-indigo-950/40 dark:text-indigo-400">
                                  Total: {p.stockQty} {p.unit}
                                </span>
                              </div>
                              <div className="divide-y divide-slate-150 text-[10px] bg-white rounded-lg p-2 border border-slate-100 space-y-1.5 dark:bg-slate-900 dark:border-slate-800 dark:divide-slate-800">
                                {whs.map((wh) => {
                                  const stockInWh =
                                    p.warehouseStock?.[wh.id] || 0;
                                  const pct =
                                    p.stockQty > 0
                                      ? (stockInWh / p.stockQty) * 100
                                      : 0;
                                  return (
                                    <div
                                      key={wh.id}
                                      className="pt-1.5 first:pt-0"
                                    >
                                      <div className="flex justify-between font-medium text-slate-600 dark:text-slate-400 mb-1">
                                        <span>{wh.name}</span>
                                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                          {stockInWh} {p.unit}
                                        </span>
                                      </div>
                                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden dark:bg-slate-800">
                                        <div
                                          className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                                          style={{ width: `${pct}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 space-y-4 dark:bg-slate-900 dark:border-slate-800">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1">
                      <Truck className="w-4 h-4 text-indigo-600" /> Catatan Alur
                      & Kebijakan Transfer
                    </h4>
                    <div className="space-y-3.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl">
                        <p className="font-bold text-slate-700 dark:text-slate-300">
                          1. Alur Siklus Hidup Transaksi (SOP):
                        </p>
                        <p className="mt-1">
                          <strong>Request Created</strong> (Diajukan) →{" "}
                          <strong>Packed</strong> (Kemas barang) →{" "}
                          <strong>Shipped</strong> (Driver jalan, stok di cabang
                          pengirim langsung dipotong) →{" "}
                          <strong>Received</strong> (Barang tiba di tujuan &
                          terkonfirmasi, stok cabang penerima bertambah).
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl">
                        <p className="font-bold text-slate-700 dark:text-slate-300">
                          2. Validasi Ketersediaan Stok Fisik:
                        </p>
                        <p className="mt-1">
                          Sistem akan melarang pengiriman jika kuantiti mutasi
                          melebihi sisa stok real-time yang terdaftar di lokasi
                          gudang pengirim. Ini mencegah terjadinya pencatatan
                          stok negatif.
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl">
                        <p className="font-bold text-slate-700 dark:text-slate-300">
                          3. Audit Trail Otomatis:
                        </p>
                        <p className="mt-1">
                          Setiap penyesuaian status pada alur pengiriman di atas
                          akan otomatis mengunci nama pengguna (operator),
                          melampirkan timestamp lokal presisi, dan mencatat
                          mutasi stok ke sistem log audit internal untuk
                          perlindungan aset anti-fraud.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

        {activeSubTab === "storage-locations" && (
          <StorageLocationManager
            tenantId={currentTenantId}
            branchId={currentBranchId}
            showToast={showToast}
          />
        )}

        {activeSubTab === "trade-in" && (
          <ErrorBoundary>
            <TradeInCalculator />
          </ErrorBoundary>
        )}

        {/* Subtab: CANNIBALIZATION & DISASSEMBLY */}
        {activeSubTab === "cannibal" && (
          <ErrorBoundary>
            <CannibalWorkshop />
          </ErrorBoundary>
        )}

        {/* Subtab: SMALL PARTS SEARCH */}
        {activeSubTab === "small-parts" && (
          <ErrorBoundary>
            <SmallPartsSearch />
          </ErrorBoundary>
        )}

        {activeSubTab === "asset-manager" && (
          <ErrorBoundary>
            <AssetManager key={currentTenantId} />
          </ErrorBoundary>
        )}

        {/* Subtab: CONSIGNMENT */}
        {activeSubTab === "consignment" && (
          <ErrorBoundary>
            <ConsignmentManager />
          </ErrorBoundary>
        )}

        {/* Subtab: PURCHASE */}
        {activeSubTab === "purchase-order" && (
          <ErrorBoundary>
            <PurchaseManager />
          </ErrorBoundary>
        )}
      </div>
    </>
  );
};
