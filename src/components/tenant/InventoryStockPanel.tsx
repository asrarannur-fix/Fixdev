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


export const InventoryStockPanel: React.FC<any> = (props) => {
  const {  addInventoryProduct, addProdBarcode, addProdBranchId, addProdCategory, addProdMinStock, addProdName, addProdPurchaseCost, addProdSellPrice, addProdSku, addProdStockQty, addProdStorageLocId, addProdUnit, addProdWarehouseId, branches, currentBranchId, currentTenantId, editProdMinStock, editProdName, editProdPurchaseCost, editProdSellPrice, editProdSku, editProdStorageLocId, editProdWarehouseStock, expandedProductIds, getBranchStock, isAddProductOpen, isEditProductOpen, pendingPartRequests, selectedEditProduct, setAddProdBarcode, setAddProdBranchId, setAddProdCategory, setAddProdMinStock, setAddProdName, setAddProdPurchaseCost, setAddProdSellPrice, setAddProdSku, setAddProdStockQty, setAddProdStorageLocId, setAddProdUnit, setAddProdWarehouseId, setEditProdMinStock, setEditProdName, setEditProdPurchaseCost, setEditProdSellPrice, setEditProdSku, setEditProdStockQty, setEditProdStorageLocId, setEditProdWarehouseStock, setExpandedProductIds, setIsAddProductOpen, setIsEditProductOpen, setSelectedEditProduct, showConfirm, showToast, tenantProducts, tenantWhs, updateInventoryProduct, updateServiceTicket, warehouses } = props;
  return (
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
                    className="bg-accent hover:bg-accent-hover text-white font-bold text-xs px-3.5 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-xs"
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
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mt-1 bg-accent-lighter text-accent text-[8px] font-mono font-bold rounded border border-indigo-100">
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
                            className="mt-1 text-[9px] font-bold text-accent hover:text-indigo-800 cursor-pointer"
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
                            className="p-1.5 text-accent hover:text-indigo-900 rounded-lg hover:bg-accent-lighter inline-flex items-center gap-1 font-extrabold text-[10px] uppercase cursor-pointer transition-all border border-indigo-100"
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
                      <PlusCircle className="w-5 h-5 text-accent animate-pulse" />{" "}
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
                      className="px-4 py-2 bg-accent hover:bg-accent-hover text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
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
                      <Pencil className="w-4 h-4 text-accent" /> Ubah Detail
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
                          value={Object.values(editProdWarehouseStock as Record<string, number>).reduce((s, v) => s + (Number(v) || 0), 0)}
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
                      className="px-4 py-2 bg-accent hover:bg-accent-hover text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                    >
                      Simpan Perubahan
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>
  );
};
