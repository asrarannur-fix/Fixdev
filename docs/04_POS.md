# 04 — MODUL POS (POINT OF SALE)
**RepairHub ERP** | Dokumentasi Teknis v1.0 | 2024

---

## 1. Gambaran Umum

Modul POS mengelola transaksi penjualan di konter: manajemen shift kasir, scan produk, multi-metode pembayaran, diskon/voucher, loyalty redemption, auto-journal ke Accounting, cetak struk termal, serta refund dan void. Semua operasi stok bersifat **atomic** (database transaction) untuk mencegah race condition.

---

## 2. Data Models

### POSTransaction
```typescript
interface POSTransaction {
  id: string;
  tenantId: string;
  branchId: string;
  invoiceNumber: string;          // "INV-20240711-001"
  shiftId: string;                // FK ShiftSession aktif
  cashierId: string;              // User yang melakukan transaksi
  customerId?: string;            // FK customers (opsional)
  items: POSItem[];               // Array item yang dibeli
  subtotal: number;               // Sebelum diskon + pajak
  discountType?: "PERCENT"|"FIXED";
  discountValue?: number;
  discountAmount: number;         // Nilai rupiah diskon
  taxAmount: number;              // PPN (0 jika taxEnabled=false)
  totalAmount: number;            // Yang harus dibayar
  amountPaid: number;             // Nominal yang dibayar
  change: number;                 // Kembalian
  paymentMethod: PaymentMethod;
  voucherId?: string;             // Voucher yang digunakan
  status: "COMPLETED"|"VOIDED"|"REFUNDED";
  receiptPrinted: boolean;
  createdAt: string;
}

interface POSItem {
  productId: string;
  name: string;
  sku: string;
  qty: number;
  unitPrice: number;
  discount: number;               // Diskon per item (Rp)
  subtotal: number;
  warehouseId: string;            // Dari gudang mana stok dikurangi
}
```

### ShiftSession
```typescript
interface ShiftSession {
  id: string;
  tenantId: string;
  branchId: string;
  cashierId: string;
  openedAt: string;
  closedAt?: string;
  openingBalance: number;         // Saldo awal kasir (uang fisik)
  closingBalance?: number;        // Saldo akhir input kasir
  expectedCash?: number;          // Kalkulasi: harusnya berapa
  cashDifference?: number;        // closingBalance - expectedCash
  totalSales: number;
  totalTransactions: number;
  totalRefunds: number;
  paymentTotals: Record<PaymentMethod, number>;
  status: "OPEN"|"CLOSED";
}

enum PaymentMethod {
  CASH        = "CASH",
  TRANSFER    = "TRANSFER",
  DEBIT_CARD  = "DEBIT_CARD",
  CREDIT_CARD = "CREDIT_CARD",
  QRIS        = "QRIS",
  CREDIT      = "CREDIT",   // Piutang pelanggan (B2B)
  MIXED       = "MIXED",    // Kombinasi beberapa metode
}
```

---

## 3. Alur Manajemen Shift

### Buka Shift
```
Kasir login -> system cek: ada shift OPEN untuk branchId ini?
  ADA  -> lanjut ke antarmuka POS
  TIDAK -> tampilkan form "Buka Shift":
    - Input: saldo awal (hitung uang fisik di laci kasir)
    - Submit -> INSERT shift_sessions {
        status:         "OPEN",
        openingBalance: inputAmount,
        openedAt:       NOW(),
        cashierId, branchId, tenantId,
        totalSales: 0, totalTransactions: 0
      }
    -> Redirect ke antarmuka POS
```

### Tutup Shift
```
Kasir klik "Tutup Shift":
  1. System kalkulasi ringkasan shift:
     - totalSales per metode pembayaran
     - Jumlah transaksi
     - Total refund
     - expectedCash = openingBalance + totalCASH - totalRefundCASH

  2. Kasir input closingBalance (hitung uang fisik di laci)
  3. cashDifference = closingBalance - expectedCash
       > 0 = Kelebihan (Over)
       < 0 = Kekurangan (Short)
       = 0 = Balance (Sempurna)

  4. IF requireCloseCash = true -> minta PIN manager untuk approval

  5. UPDATE shift_sessions {
       status: "CLOSED",
       closedAt: NOW(),
       closingBalance, expectedCash, cashDifference
     }
  6. Cetak laporan shift (opsional)
```

---

## 4. Alur Transaksi Penjualan

### Step 1: Cari & Tambah Produk
```
Kasir scan barcode ATAU ketik nama/SKU:
  -> Query: products WHERE branchStock > 0 AND isActive = true
  -> Real-time search dengan debounce 300ms
  -> Tampilkan: nama, SKU, harga jual, stok tersedia

Validasi saat tambah ke keranjang:
  if (qty > branchStock(product)) {
    showError(`Stok tidak cukup. Tersedia: ${available}`);
    return;
  }
  addItemToCart({...product, qty});
```

### Step 2: Diskon & Voucher
```
Diskon Manual:
  PERCENT: discountAmount = subtotal * (discountValue / 100)
  FIXED:   discountAmount = Math.min(discountValue, subtotal)
  Batas max: discountAmount <= settings.posSettings.maxDiscount

Voucher Code:
  1. Input kode -> hit DB: SELECT * FROM vouchers WHERE code = input
  2. Validasi semua:
       status = "ACTIVE"
       expiresAt > NOW()
       usedAt IS NULL
       minPurchase <= subtotal (jika ada)
  3. Hitung diskon voucher
  4. Apply ke total
  5. Mark as USED hanya saat transaksi berhasil tersimpan (atomic)
```

### Step 3: Pembayaran
```
CASH:
  Input nominal -> kembalian = amountPaid - totalAmount
  Validasi: amountPaid >= totalAmount

TRANSFER / DEBIT / CREDIT CARD:
  Input bank + nominal (harus >= totalAmount)

QRIS:
  Generate QR code -> tunggu konfirmasi pembayaran
  Timeout: 5 menit -> batalkan QR, minta metode lain

CREDIT (B2B):
  Validasi: customer.creditUsed + totalAmount <= customer.creditLimit
  Jika melewati limit -> tampilkan error + sisa limit

MIXED:
  Input per metode pembayaran
  Validasi: SUM(semua pembayaran) >= totalAmount
```

### Step 4: Atomic Database Transaction
```typescript
// Satu RPC call -> satu DB transaction (all-or-nothing)
const result = await supabase.rpc("create_pos_transaction", {
  p_invoice_number: invoiceNumber,
  p_shift_id:       activeShiftId,
  p_cashier_id:     currentUser.id,
  p_customer_id:    selectedCustomer?.id,
  p_items:          cartItems,
  p_subtotal:       subtotal,
  p_discount_amount: discountAmount,
  p_tax_amount:     taxAmount,
  p_total_amount:   totalAmount,
  p_amount_paid:    amountPaid,
  p_payment_method: paymentMethod,
  p_voucher_id:     appliedVoucher?.id,
});

// Di dalam DB function (semua dalam satu transaction):
//  1. INSERT pos_transactions
//  2. FOR EACH item:
//       UPDATE products SET warehouse_stock[wh] -= item.qty
//       INSERT inventory_movements {type:"OUT", ref: invoiceNumber}
//  3. UPDATE shift_sessions totals += amounts
//  4. IF voucherId: UPDATE vouchers SET status = "USED", used_at = NOW()
//  5. IF customerId: UPDATE customers SET loyalty_points += earned, total_spending += total
//  6. INSERT journal_entries (auto-journal accounting)
```

---

## 5. Auto-Journal ke Accounting (Atomic)

```
Setiap transaksi POS berhasil -> otomatis insert jurnal:

Penjualan:
  DR  Kas (CASH) / Bank (TRANSFER/QRIS) / Piutang B2B (CREDIT) = totalAmount
    CR  Pendapatan Penjualan        = subtotal - discountAmount
    CR  PPN Keluaran                = taxAmount       [jika taxEnabled]

HPP (jika autoJournalEnabled = true):
  DR  Harga Pokok Penjualan (HPP)   = SUM(item.qty * item.buyPrice)
    CR  Persediaan Barang           = SUM(item.qty * item.buyPrice)

Diskon (jika ada):
  DR  Potongan Penjualan (kontra)   = discountAmount
    CR  Pendapatan Penjualan        = discountAmount  [offset]
```

---

## 6. Cetak Struk Termal

```typescript
// Hook: usePrintConfig() -> ambil konfigurasi cetak dari tenant settings
const printReceipt = (tx: POSTransaction): void => {
  const html = `
    ${getPrintHeaderHtml(printConfig, tenantName)}
    <table>
      ${tx.items.map(item =>
        `<tr><td>${item.name}</td><td>${item.qty} x ${formatRp(item.unitPrice)}</td>
             <td>${formatRp(item.subtotal)}</td></tr>`
      ).join("")}
    </table>
    <div class="summary">
      <p>Subtotal : ${formatRp(tx.subtotal)}</p>
      <p>Diskon   : -${formatRp(tx.discountAmount)}</p>
      <p>Pajak    : ${formatRp(tx.taxAmount)}</p>
      <p><strong>TOTAL : ${formatRp(tx.totalAmount)}</strong></p>
      <p>Bayar    : ${formatRp(tx.amountPaid)}</p>
      <p>Kembali  : ${formatRp(tx.change)}</p>
    </div>
    ${printConfig.printQrCode ? `<img src="${generateQR(tx.invoiceNumber)}">` : ""}
    ${getPrintFooterHtml(printConfig)}
    ${printConfig.printTermsAndConditions
        ? getPrintTermsHtml(printConfig) : ""}
  `;
  const win = window.open("", "_blank");
  win.document.write(html);
  win.print();
  win.close();
};
```

---

## 7. Void & Refund

### Void (Transaksi Hari Ini)
```
Kasir pilih transaksi -> klik "Void":
  1. IF requireVoidApproval: input PIN / approval manager
  2. UPDATE pos_transactions SET status = "VOIDED"
  3. Rollback stok: FOR EACH item:
       UPDATE warehouseStock[wh] += item.qty
       INSERT inventory_movements {type:"IN", ref:"VOID-"+invoiceNo}
  4. Insert jurnal terbalik (reverse entry)
  5. UPDATE shift_sessions: kurangi totalSales dan totalTransactions
  6. WA ke supervisor (opsional): "Void: [invoiceNo] oleh [kasir]"
```

### Refund (Transaksi Masa Lalu)
```
Manager input nomor invoice:
  1. Validasi: status = "COMPLETED", belum direfund
  2. Pilih item yang dikembalikan + qty
  3. Input alasan refund
  4. INSERT refund_transactions {
       originalInvoiceId, items, refundAmount,
       refundNumber: documentConfig.refundPrefix + seq
     }
  5. Rollback stok item dikembalikan
  6. Journal:
     DR  Retur & Potongan Penjualan = refundAmount
       CR  Kas / Bank              = refundAmount
  7. WA ke pelanggan: "Refund Rp[amount] untuk invoice [no] telah diproses"
```

---

## 8. Konfigurasi POS (dari TenantSettings)

```typescript
posSettings: {
  paymentMethods:       string[],   // Metode yang diaktifkan
  maxDiscount:          number,     // Batas diskon maksimal (Rp atau %)
  allowNegativeStock:   boolean,    // Izinkan jual meski stok 0
  requireVoidApproval:  boolean,    // Void perlu approval manager
  requireCloseCash:     boolean,    // Tutup shift perlu approval
}
```
