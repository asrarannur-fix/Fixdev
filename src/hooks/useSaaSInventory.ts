/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Inventory domain hook extracted from SaaSContext.tsx
 */
import { generateUUID } from "../utils/saasUtils";
import type { InventoryProduct, StockMovement, InventoryTransfer, TransferItem } from "../types";

export interface UseSaaSInventoryProps {
  currentTenantId: string;
  products: InventoryProduct[];
  setProducts: React.Dispatch<React.SetStateAction<InventoryProduct[]>>;
  setStockMovements: React.Dispatch<React.SetStateAction<StockMovement[]>>;
  setInventoryTransfers: React.Dispatch<React.SetStateAction<InventoryTransfer[]>>;
  syncToSupabase: (table: string, action: string, data: any) => void;
  addLog: (title: string, desc: string, type: string) => void;
  verifyScope: (tenantId?: string) => { tenantId: string; branchId: string };
}

export function useSaaSInventory(props: UseSaaSInventoryProps) {
  const {
    currentTenantId,
    setProducts,
    setStockMovements,
    setInventoryTransfers,
    syncToSupabase,
    addLog,
    verifyScope,
  } = props;

  const assertPositiveQuantity = (quantity: number, label = "quantity") => {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`${label} harus lebih besar dari 0.`);
    }
  };

  const assertDifferentWarehouses = (fromWarehouseId: string, toWarehouseId: string) => {
    if (!fromWarehouseId || !toWarehouseId || fromWarehouseId === toWarehouseId) {
      throw new Error("Gudang asal dan tujuan harus valid dan berbeda.");
    }
  };

  const canMutateProduct = (product: InventoryProduct, tenantId = currentTenantId) =>
    product.tenantId === tenantId;

  const recalculateStockQty = (product: InventoryProduct, warehouseStock: Record<string, number>) => {
    if (product.category === "JASA") return product.stockQty;
    return Object.values(warehouseStock).reduce((sum, qty) => sum + Number(qty || 0), 0);
  };

  const addInventoryProduct = (
    prod: Omit<InventoryProduct, "id" | "tenantId"> & { tenantId?: string },
  ) => {
    const { tenantId } = verifyScope(prod.tenantId);
    const id = generateUUID();
    const newProd: InventoryProduct = { ...prod, id, tenantId };
    setProducts((prev) => [...prev, newProd]);
    syncToSupabase("products", "insert", newProd);
    addLog("Add Inventory Product", `Menambahkan produk baru ke persediaan: ${prod.name} (SKU: ${prod.sku})`, "INVENTORY");
  };

  const updateInventoryProduct = (
    productId: string,
    data: Partial<InventoryProduct> & { tenantId?: string },
  ) => {
    const { tenantId } = verifyScope(data.tenantId);
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId || !canMutateProduct(p, tenantId)) return p;
        const updated = { ...p, ...data, tenantId };
        syncToSupabase("products", "update", updated);
        addLog("Update Inventory Product", `Memperbarui data produk: ${updated.name} (Harga: Rp ${(updated.sellPrice ?? 0).toLocaleString()})`, "INVENTORY");
        return updated;
      }),
    );
  };

  const transferProductStock = (
    productId: string,
    fromWarehouseId: string,
    toWarehouseId: string,
    quantity: number,
    note: string,
  ) => {
    verifyScope(currentTenantId);
    assertPositiveQuantity(quantity);
    assertDifferentWarehouses(fromWarehouseId, toWarehouseId);

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId || !canMutateProduct(p)) return p;
        const currentWarehouseStock = p.warehouseStock || {};
        const sourceStock = Number(currentWarehouseStock[fromWarehouseId] || 0);
        const destStock = Number(currentWarehouseStock[toWarehouseId] || 0);
        const updatedWarehouseStock = {
          ...currentWarehouseStock,
          [fromWarehouseId]: Math.max(0, sourceStock - quantity),
          [toWarehouseId]: destStock + quantity,
        };
        const updatedProd = {
          ...p,
          warehouseStock: updatedWarehouseStock,
          stockQty: recalculateStockQty(p, updatedWarehouseStock),
        };
        syncToSupabase("products", "update", updatedProd);
        addLog("Stock Transfer", `Transfer ${quantity} ${p.unit} dari ${fromWarehouseId} ke ${toWarehouseId}: ${p.name}`, "INVENTORY");
        return updatedProd;
      }),
    );

    const now = new Date().toISOString();
    const trfNo = "TRF-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(1000 + Math.random() * 9000);
    const movements: StockMovement[] = [
      {
        id: "mov-" + Date.now().toString(36) + "1",
        tenantId: currentTenantId,
        productId,
        warehouseId: fromWarehouseId,
        type: "TRANSFER",
        quantity: -quantity,
        referenceNo: trfNo,
        note: `Keluar transfer ke ${toWarehouseId}. Catatan: ${note}`,
        timestamp: now,
      },
      {
        id: "mov-" + Date.now().toString(36) + "2",
        tenantId: currentTenantId,
        productId,
        warehouseId: toWarehouseId,
        type: "TRANSFER",
        quantity,
        referenceNo: trfNo,
        note: `Masuk transfer dari ${fromWarehouseId}. Catatan: ${note}`,
        timestamp: now,
      },
    ];
    setStockMovements((prev) => [...movements, ...prev]);
  };

  const adjustProductStock = (
    productId: string,
    warehouseId: string,
    adjustmentQty: number,
    type: "IN" | "OUT" | "ADJUSTMENT",
    note: string,
  ) => {
    verifyScope(currentTenantId);
    assertPositiveQuantity(adjustmentQty, "adjustmentQty");

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId || !canMutateProduct(p)) return p;
        const currentWarehouseStock = p.warehouseStock || {};
        const oldStock = Number(currentWarehouseStock[warehouseId] || 0);
        const newStock = type === "IN" ? oldStock + adjustmentQty : type === "OUT" ? Math.max(0, oldStock - adjustmentQty) : adjustmentQty;
        const updatedWarehouseStock = { ...currentWarehouseStock, [warehouseId]: newStock };
        const newTotalStock = recalculateStockQty(p, updatedWarehouseStock);

        if (p.category !== "JASA" && newTotalStock <= p.minStock) {
          window.dispatchEvent(
            new CustomEvent("live_notification", {
              detail: {
                title: "⚠️ Peringatan Stok Kritis",
                text: `Stok untuk produk "${p.name}" (SKU: ${p.sku}) tinggal ${newTotalStock} ${p.unit}. Batas minimum adalah ${p.minStock}.`,
                message: `Stok untuk produk "${p.name}" (SKU: ${p.sku}) tinggal ${newTotalStock} ${p.unit}. Batas minimum adalah ${p.minStock}.`,
                category: "stock",
              },
            }),
          );
        }

        const updatedProd = { ...p, warehouseStock: updatedWarehouseStock, stockQty: newTotalStock };
        syncToSupabase("products", "update", updatedProd);
        addLog("Stock Adjustment", `Penyesuaian stok (${type}) di ${warehouseId} sebanyak ${adjustmentQty} ${p.unit}: ${p.name}`, "INVENTORY");
        return updatedProd;
      }),
    );

    const timestamp = Date.now().toString(36);
    const adjNo = "ADJ-" + timestamp.toUpperCase() + "-" + Math.floor(1000 + Math.random() * 9000);
    const adjustmentMovement: StockMovement = {
      id: "mov-" + timestamp + "3",
      tenantId: currentTenantId,
      productId,
      warehouseId,
      type: type === "ADJUSTMENT" ? "ADJUSTMENT" : type === "IN" ? "IN" : "OUT",
      quantity: type === "ADJUSTMENT" ? adjustmentQty : type === "IN" ? adjustmentQty : -adjustmentQty,
      referenceNo: adjNo,
      note: `Penyesuaian stok (${type}). Catatan: ${note}`,
      timestamp: new Date().toISOString(),
    };
    setStockMovements((prev) => [adjustmentMovement, ...prev]);
  };

  const createInventoryTransfer = (data: {
    originWarehouseId: string;
    destinationWarehouseId: string;
    items: TransferItem[];
    note: string;
  }) => {
    verifyScope(currentTenantId);
    assertDifferentWarehouses(data.originWarehouseId, data.destinationWarehouseId);
    for (const item of data.items) assertPositiveQuantity(item.quantity, "item.quantity");

    const id = "trf-" + Date.now().toString(36);
    const transferNo = "TRF-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Date.now().toString(36).slice(-4).toUpperCase();
    const now = new Date().toISOString();
    const newTrf: InventoryTransfer = {
      id,
      tenantId: currentTenantId,
      transferNo,
      originWarehouseId: data.originWarehouseId,
      destinationWarehouseId: data.destinationWarehouseId,
      items: data.items,
      status: "REQUEST_CREATED",
      note: data.note,
      createdAt: now,
      updatedAt: now,
      history: [{ status: "REQUEST_CREATED", timestamp: now, note: `Permintaan transfer stok dibuat dari ${data.originWarehouseId} ke ${data.destinationWarehouseId}.` }],
    };
    setInventoryTransfers((prev) => [newTrf, ...prev]);
    addLog("Inventory Transfer Created", `Membuat permintaan transfer stok ${transferNo} (${data.items.length} item) dari ${data.originWarehouseId} ke ${data.destinationWarehouseId}`, "INVENTORY");
  };

  const updateInventoryTransferStatus = (
    transferId: string,
    status: "REQUEST_CREATED" | "PACKED" | "SHIPPED" | "RECEIVED",
    note?: string,
  ) => {
    verifyScope(currentTenantId);
    setInventoryTransfers((prev) =>
      prev.map((t) => {
        if (t.id !== transferId || t.tenantId !== currentTenantId) return t;
        const oldStatus = t.status;
        if (oldStatus === status) return t;
        const now = new Date().toISOString();
        const deductOrigin = (status === "PACKED" || status === "SHIPPED") && oldStatus === "REQUEST_CREATED" || status === "RECEIVED" && (oldStatus === "REQUEST_CREATED" || oldStatus === "PACKED");
        const addDestination = status === "RECEIVED";

        if (deductOrigin || addDestination) {
          setProducts((prevProducts) =>
            prevProducts.map((p) => {
              const item = t.items.find((i) => i.productId === p.id);
              if (!item || !canMutateProduct(p)) return p;
              const currentWarehouseStock = p.warehouseStock || {};
              const originStock = deductOrigin ? Math.max(0, Number(currentWarehouseStock[t.originWarehouseId] || 0) - item.quantity) : Number(currentWarehouseStock[t.originWarehouseId] || 0);
              const destStock = addDestination ? Number(currentWarehouseStock[t.destinationWarehouseId] || 0) + item.quantity : Number(currentWarehouseStock[t.destinationWarehouseId] || 0);
              const updatedWarehouseStock = { ...currentWarehouseStock, [t.originWarehouseId]: originStock, [t.destinationWarehouseId]: destStock };
              const updatedProd = { ...p, warehouseStock: updatedWarehouseStock, stockQty: recalculateStockQty(p, updatedWarehouseStock) };
              syncToSupabase("products", "update", updatedProd);
              return updatedProd;
            }),
          );
        }

        addLog("Inventory Transfer Status Updated", `Memperbarui status transfer ${t.transferNo} dari ${oldStatus} menjadi ${status}`, "INVENTORY");
        return { ...t, status, updatedAt: now, history: [...t.history, { status, timestamp: now, note: note || "" }] };
      }),
    );
  };

  return {
    addInventoryProduct,
    updateInventoryProduct,
    transferProductStock,
    adjustProductStock,
    createInventoryTransfer,
    updateInventoryTransferStatus,
  };
}
