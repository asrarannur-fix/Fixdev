# 03 — MODUL INVENTORY & MANAJEMEN GUDANG
**RepairHub ERP** | Dokumentasi Teknis v1.0 | 2024

---

## 1. Gambaran Umum

Modul Inventory mengelola produk, stok multi-gudang, pembelian, transfer antar gudang/branch, kanibalisme sparepart, stock opname berkala, dan HPP otomatis. Terintegrasi dengan POS (stok keluar penjualan), Servis (sparepart terpakai), dan Accounting (auto-journal pembelian & HPP).

---

## 2. Data Models

### Product
```typescript
interface Product {
  id: string;
  tenantId: string;
  sku: string;                           // Kode unik produk
  name: string;
  category: string;
  unit: string;                          // pcs, set, meter, dll
  buyPrice: number;                      // HPP / harga beli per unit
  sellPrice: number;                     // Harga jual default
  stockQty: number;                      // Total stok (SUM semua gudang)
  warehouseStock: Record<string, number>;// {warehouseId: qty}
  minStock: number;                      // Batas minimum (trigger alert)
  supplierId?: string;
  isActive: boolean;
  createdAt: string;
}
```

### Warehouse
```typescript
interface Warehouse {
  id: string;
  tenantId: string;
  branchId: string;     // Gudang terikat ke satu branch
  name: string;
  location?: string;
  isDefault: boolean;   // Gudang utama branch ini
}
```

### InventoryMovement (Audit Trail Lengkap)
```typescript
interface InventoryMovement {
  id: string;
  productId: string;
  warehouseId: string;
  type: "IN" | "OUT" | "TRANSFER_IN" | "TRANSFER_OUT" | "KANIBALISASI" | "OPNAME_ADJUST";
  qty: number;
  unitCost?: number;
  reference?: string;   // Nomor PO, invoice, tiket, dll
  note?: string;
  createdBy: string;
  createdAt: string;
}
```

### PurchaseOrder
```typescript
interface PurchaseOrder {
  id: string;
  tenantId: string;
  poNumber: string;      // "PO-20240711-001"
  supplierId: string;
  items: POItem[];
  status: "DRAFT" | "APPROVED" | "ORDERED" | "PARTIAL" | "RECEIVED" | "CANCELLED";
  totalAmount: number;
  expectedAt?: string;
  receivedAt?: string;
  createdBy: string;
  createdAt: string;
}
```

---

## 3. Alur Pembelian (Purchase Order)

### Frontend -> Backend
```
Step 1 — Manager buat PO baru:
  - Pilih supplier dari master data
  - Tambah item: produk + qty + harga beli + diskon
  - Set: gudang tujuan, expected delivery date
  - Submit -> INSERT purchase_orders {status: "DRAFT"}

Step 2 — Approval (jika requireAdjustmentApproval = true):
  Owner / Manager review:
    APPROVE -> status: "APPROVED"
    REJECT  -> status: "CANCELLED" + alasan

Step 3 — Barang tiba, staff input penerimaan:
  FOR EACH item in PO:
    a. UPDATE products SET warehouseStock[warehouseId] += qty
    b. Recalculate stockQty = SUM(all warehouseStock values)
    c. INSERT inventory_movements {type: "IN", ref: poNumber, unitCost}
    d. Recalculate HPP (FIFO atau AVERAGE, sesuai setting)
    e. CHECK: if stockQty < minStock -> trigger low stock alert
  
  UPDATE purchase_orders {status: "RECEIVED", receivedAt: NOW()}
  
  Auto-journal Accounting:
    DR  Persediaan Barang     = totalCost
      CR  Hutang Dagang       = totalCost
```

### Nomor PO
```
documentConfig.purchaseOrderPrefix ?? "PO"
poNumber = `${prefix}-${YYYYMMDD}-${seq.padStart(3,"0")}`
```

---

## 4. Hierarki Multi-Warehouse

```
Tenant
  +-- Branch Jakarta
  |    +-- Gudang Utama (isDefault: true)  -> stok produk jual
  |    +-- Gudang Servis                   -> stok sparepart
  |    +-- Gudang Titipan                  -> barang konsinyasi
  +-- Branch Bandung
       +-- Gudang BDG-01 (isDefault: true)
```

**Agregasi stok per branch (dari TenantDashboard.tsx):**
```typescript
const branchStock = (p: Product): number => {
  const branchWhIds = warehouses
    .filter(w => w.branchId === currentBranchId)
    .map(w => w.id);
  return branchWhIds.reduce(
    (sum, id) => sum + (Number(p.warehouseStock[id]) || 0), 0
  );
};
```

---

## 5. Kalkulasi HPP

Setting: `settings.purchaseSettings.hppMethod` = "FIFO" | "AVERAGE"

### FIFO (First In, First Out)
```
Stock layers: [{qty:10, cost:50000}, {qty:5, cost:55000}]
Jual 12 unit:
  Layer 1: 10 x Rp50.000 = Rp500.000 (habis)
  Layer 2:  2 x Rp55.000 = Rp110.000
  Total HPP = Rp610.000
  Sisa layer 2: {qty:3, cost:55000}
```

### Average Cost (Weighted Average)
```
Existing: qty=10, avgCost=50.000 -> value=500.000
Purchase: qty=5,  price=55.000  -> value=275.000
New avgCost = (500.000 + 275.000) / (10 + 5) = Rp51.667/unit
Berlaku untuk semua unit di stok
```

---

## 6. Transfer Stok Antar Gudang / Branch

```
Frontend:
  1. Pilih gudang asal (branch aktif atau pilih semua)
  2. Pilih gudang tujuan (bisa cross-branch)
  3. Pilih produk + qty yang akan ditransfer
  4. Submit -> INSERT inventory_transfers {status: "PENDING"}

Status Flow:
  PENDING  -> [Manager tujuan APPROVE] -> IN_TRANSIT
           -> [CANCEL sebelum IN_TRANSIT] -> CANCELLED
  IN_TRANSIT -> [Penerima konfirmasi tiba] -> COMPLETED

Saat COMPLETED (atomic):
  UPDATE products warehouseStock[asalWh]  -= qty
  UPDATE products warehouseStock[tujWh]   += qty
  INSERT inventory_movements {type:"TRANSFER_OUT", wh: asalWh}
  INSERT inventory_movements {type:"TRANSFER_IN",  wh: tujWh}
  UPDATE inventory_transfers {status: "COMPLETED", completedAt: NOW()}
  
  Notifikasi WA ke manager (opsional):
    "Transfer [produk] sejumlah [qty] dari [asal] ke [tujuan] selesai"
```

---

## 7. Kanibalisme Sparepart

Kanibalisme = mengambil komponen dari perangkat rusak/tidak terpakai untuk dijadikan stok.

```
Frontend:
  1. Input: deskripsi donor device (brand, model, kondisi donor)
  2. List komponen yang diambil:
     [{name:"LCD", qty:1, kondisi:"BAGUS"}, {name:"Baterai", qty:1, kondisi:"BAIK"}, ...]
  3. Submit

Backend:
  FOR EACH part WHERE kondisi IN ["BAGUS", "BAIK"]:
    existing = findProductBySku("[KANIBAL]" + part.name)
    IF existing:
      UPDATE warehouseStock[defaultWh] += part.qty
    ELSE:
      INSERT products {
        name: "[Kanibal] " + part.name,
        sku: "KNB-" + generateSku(),
        buyPrice: 0, sellPrice: estimatedValue,
        category: "Kanibal"
      }
      SET warehouseStock[defaultWh] = part.qty
    
    INSERT inventory_movements {type:"KANIBALISASI", ref: donorDeviceId}
  
  INSERT kanibalisasi_logs {donorInfo, parts, technicianId, tenantId}
```

---

## 8. Stock Opname

```
Alur Lengkap:
  1. Manager: "Mulai Stock Opname"
     -> INSERT stock_opnames {status:"IN_PROGRESS", startedAt: NOW()}
     -> Lock: tidak ada transaksi IN/OUT selama opname

  2. Staff: scan / input qty fisik per produk per gudang
     -> INSERT opname_items {productId, warehouseId, systemQty, physicalQty}

  3. System kalkulasi selisih:
     delta = physicalQty - systemQty
     SURPLUS  (delta > 0): stok fisik lebih banyak
     SHORTAGE (delta < 0): stok fisik kurang
     MATCH    (delta = 0): sama

  4. Manager review & approve:
     FOR EACH item WITH delta != 0:
       UPDATE warehouseStock[wh] = physicalQty
       INSERT inventory_movements {type:"OPNAME_ADJUST", qty:delta}
       IF SURPLUS:
         DR Persediaan / CR Pendapatan Lain-lain
       IF SHORTAGE:
         DR Kerugian Susut / CR Persediaan
     UPDATE stock_opnames {status:"COMPLETED", approvedAt: NOW()}

  5. Generate laporan opname (cetak / PDF)
  6. Unlock transaksi -> operasional normal kembali
```

---

## 9. Low Stock Alert

```typescript
// Cek setiap ada pengurangan stok (POS, Servis, Transfer OUT)
const checkLowStock = (product: Product): void => {
  const current = branchStock(product);
  if (current <= product.minStock && product.minStock > 0) {
    // Toast in-app
    showToast(`Stok ${product.name} menipis! Tersisa: ${current} unit`, "warning");
    
    // WhatsApp ke owner/manager (jika diaktifkan)
    if (settings.inventorySettings?.enableStockAlert) {
      const msg = `ALERT STOK MENIPIS\n` +
        `Produk: ${product.name}\n` +
        `SKU: ${product.sku}\n` +
        `Stok saat ini: ${current} unit\n` +
        `Minimum stok: ${product.minStock} unit\n` +
        `Harap segera lakukan pembelian.`;
      sendWhatsApp(ownerPhone, msg);
    }
  }
};
```

---

## 10. Integrasi Modul Lain

| Event | Dari Modul | Aksi Inventory |
|-------|-----------|----------------|
| Transaksi POS selesai | POS | OUT: kurangi stok per item terjual |
| Teknisi pakai sparepart | Servis | OUT: kurangi stok sparepart di gudang |
| PO diterima | Pembelian | IN: tambah stok + update HPP |
| Kanibalisme disetujui | Servis | IN: tambah stok parts kanibal |
| Transfer dikonfirmasi | Transfer | TRANSFER_IN/OUT antar gudang |
| Opname disetujui | Inventory | OPNAME_ADJUST: koreksi ke qty fisik |
| Refund POS | POS | IN: rollback stok barang dikembalikan |
