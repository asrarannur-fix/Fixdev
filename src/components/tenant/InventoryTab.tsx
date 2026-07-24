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
import { InventoryStockPanel } from "./InventoryStockPanel";
import { InventoryTransferPanel } from "./InventoryTransferPanel";

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
        {(activeSubTab === "stock" || activeSubTab === "products" || activeSubTab === "") && <InventoryStockPanel {...{ addInventoryProduct, addProdBarcode, addProdBranchId, addProdCategory, addProdMinStock, addProdName, addProdPurchaseCost, addProdSellPrice, addProdSku, addProdStockQty, addProdStorageLocId, addProdUnit, addProdWarehouseId, branches, currentBranchId, currentTenantId, editProdMinStock, editProdName, editProdPurchaseCost, editProdSellPrice, editProdSku, editProdStorageLocId, editProdWarehouseStock, expandedProductIds, getBranchStock, isAddProductOpen, isEditProductOpen, pendingPartRequests, selectedEditProduct, setAddProdBarcode, setAddProdBranchId, setAddProdCategory, setAddProdMinStock, setAddProdName, setAddProdPurchaseCost, setAddProdSellPrice, setAddProdSku, setAddProdStockQty, setAddProdStorageLocId, setAddProdUnit, setAddProdWarehouseId, setEditProdMinStock, setEditProdName, setEditProdPurchaseCost, setEditProdSellPrice, setEditProdSku, setEditProdStockQty, setEditProdStorageLocId, setEditProdWarehouseStock, setExpandedProductIds, setIsAddProductOpen, setIsEditProductOpen, setSelectedEditProduct, showConfirm, showToast, tenantProducts, tenantWhs, updateInventoryProduct, updateServiceTicket, warehouses }} />}

        {activeSubTab === "stock-transfer" && <InventoryTransferPanel {...{ activeSubTab, branches, bulkInputText, bulkTrfItems, createInventoryTransfer, currentTenantId, inventoryTransfers, products, selectedTrfFromWarehouse, selectedTrfIdForStepper, selectedTrfToWarehouse, setBulkInputText, setBulkTrfItems, setSelectedTrfFromWarehouse, setSelectedTrfIdForStepper, setSelectedTrfToWarehouse, setTrfNote, setTrfStatusNote, showToast, tenantProducts, trfNote, trfStatusNote, updateInventoryTransferStatus, warehouses }} />}

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
