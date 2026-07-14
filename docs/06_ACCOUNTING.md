# 06 — MODUL ACCOUNTING & KEUANGAN
**RepairHub ERP** | Dokumentasi Teknis v1.0 | 2024

---

## 1. Gambaran Umum

Modul Accounting mengelola keuangan bisnis dengan prinsip **double-entry bookkeeping**: setiap transaksi menghasilkan entri jurnal seimbang (Debit = Kredit). Semua jurnal dihasilkan **otomatis** dari aktivitas POS, Servis, Inventory, dan HR — tanpa input manual double-entry oleh user. Mendukung: Chart of Accounts, Buku Besar, Laporan L/R, Neraca, Arus Kas, dan Rekonsiliasi Bank.

---

## 2. Chart of Accounts (CoA)

### Struktur Akun Default

| Kode | Nama Akun | Tipe | Normal Balance |
|------|-----------|------|----------------|
| 1000 | Kas Tunai | Aset Lancar | Debit |
| 1010 | Bank | Aset Lancar | Debit |
| 1020 | Piutang Usaha | Aset Lancar | Debit |
| 1100 | Persediaan Barang | Aset Lancar | Debit |
| 1500 | Peralatan Bengkel | Aset Tetap | Debit |
| 2000 | Hutang Dagang | Kewajiban | Kredit |
| 2100 | PPN Keluaran | Kewajiban | Kredit |
| 2200 | Hutang Gaji | Kewajiban | Kredit |
| 3000 | Modal Pemilik | Ekuitas | Kredit |
| 4000 | Pendapatan Jasa Servis | Pendapatan | Kredit |
| 4100 | Pendapatan Penjualan | Pendapatan | Kredit |
| 4200 | Potongan Penjualan | Kontra-Pendapatan | Debit |
| 5000 | HPP Barang | Biaya | Debit |
| 5100 | HPP Sparepart | Biaya | Debit |
| 5200 | Biaya Gaji | Biaya | Debit |
| 5300 | Biaya Komisi | Biaya | Debit |
| 5400 | Biaya Garansi | Biaya | Debit |
| 5900 | Biaya Lain-lain | Biaya | Debit |
| 8000 | Pendapatan Lain-lain | Pendapatan | Kredit |
| 9000 | Kerugian Susut | Biaya | Debit |

### Konfigurasi Akun Default (TenantSettings)

```typescript
accountingSettings: {
  defaultCashAccountId:       string,  // ID akun Kas (1000)
  defaultBankAccountId:       string,  // ID akun Bank (1010)
  defaultSalesAccountId:      string,  // ID akun Pendapatan Penjualan (4100)
  defaultHppAccountId:        string,  // ID akun HPP (5000)
  defaultInventoryAccountId:  string,  // ID akun Persediaan (1100)
  defaultReceivableAccountId: string,  // ID akun Piutang (1020)
  defaultPayableAccountId:    string,  // ID akun Hutang Dagang (2000)
  autoJournalEnabled:         boolean, // Aktifkan auto-journal dari semua modul
}
```

---

## 3. Auto-Journal dari Setiap Modul

### 3.1 POS — Penjualan Tunai

```
DR  Kas (1000)                      = totalAmount
  CR  Pendapatan Penjualan (4100)   = subtotal - discountAmount
  CR  PPN Keluaran (2100)           = taxAmount      [jika taxEnabled]

HPP (jika autoJournalEnabled = true):
DR  HPP Barang (5000)               = SUM(qty * buyPrice)
  CR  Persediaan Barang (1100)      = SUM(qty * buyPrice)
```

### 3.2 POS — Penjualan Kredit B2B

```
DR  Piutang Usaha (1020)            = totalAmount
  CR  Pendapatan Penjualan (4100)   = subtotal - discountAmount
  CR  PPN Keluaran (2100)           = taxAmount
```

### 3.3 POS — Pembayaran Piutang B2B

```
DR  Kas / Bank (1000/1010)          = paymentAmount
  CR  Piutang Usaha (1020)          = paymentAmount
```

### 3.4 POS — Void / Refund (Reverse Entry)

```
DR  Pendapatan Penjualan (4100)     = refundAmount
DR  PPN Keluaran (2100)             = taxRefund
  CR  Kas / Bank (1000/1010)        = totalRefund

Rollback HPP:
DR  Persediaan Barang (1100)        = costRolledBack
  CR  HPP Barang (5000)             = costRolledBack
```

### 3.5 Servis — Invoice Dibayar

```
DR  Kas / Bank (1000/1010)          = finalCost
  CR  Pendapatan Jasa Servis (4000) = laborCost
  CR  Pendapatan Penjualan (4100)   = partsCost
  CR  PPN Keluaran (2100)           = taxAmount

HPP sparepart terpakai:
DR  HPP Sparepart (5100)            = SUM(part.qty * part.buyPrice)
  CR  Persediaan Barang (1100)      = SUM(part.qty * part.buyPrice)
```

### 3.6 Inventory — Penerimaan PO

```
DR  Persediaan Barang (1100)        = totalCost
  CR  Hutang Dagang (2000)          = totalCost
```

### 3.7 Inventory — Pembayaran ke Supplier

```
DR  Hutang Dagang (2000)            = paymentAmount
  CR  Kas / Bank (1000/1010)        = paymentAmount
```

### 3.8 Inventory — Stock Opname Selisih

```
SURPLUS (fisik > sistem):
DR  Persediaan Barang (1100)        = surplusValue
  CR  Pendapatan Lain-lain (8000)   = surplusValue

SHORTAGE (fisik < sistem):
DR  Kerugian Susut (9000)           = shortageValue
  CR  Persediaan Barang (1100)      = shortageValue
```

### 3.9 HR — Penggajian Bulanan

```
Pembebanan gaji:
DR  Biaya Gaji (5200)               = totalGajiPokok + tunjangan
DR  Biaya Komisi (5300)             = totalKomisi
DR  Biaya Lembur (5900)             = totalLembur
  CR  Hutang Gaji (2200)            = totalPayroll

Pembayaran:
DR  Hutang Gaji (2200)              = totalPayroll
  CR  Kas / Bank (1000/1010)        = totalPayroll
```

### 3.10 Garansi — Biaya Klaim

```
DR  Biaya Garansi (5400)            = claimCost
  CR  Persediaan Barang (1100)      = partsCost
  CR  Kas (1000)                    = laborCost
```

---

## 4. Input Jurnal Manual

```
Akuntansi buka menu "Jurnal Umum" -> "+ Entri Baru":
  1. Input: tanggal, nomor referensi (auto-gen), deskripsi transaksi
  2. Tambah baris akun:
     [Dropdown Akun]  [Nominal Debit]  [Nominal Kredit]
     [Dropdown Akun]  [Nominal Debit]  [Nominal Kredit]
     ... (minimal 2 baris)
  3. Validasi real-time: SUM(debit) vs SUM(kredit)
     Indikator: hijau jika balance, merah jika tidak
     Tombol "Simpan" disabled jika tidak balance
  4. Submit -> INSERT journal_entries + journal_entry_lines (atomic)
  5. Update running balance per akun di buku besar
```

---

## 5. Laporan Keuangan

### 5.1 Laporan Laba/Rugi (P&L)

```
PENDAPATAN:
  Pendapatan Jasa Servis    :  Rp x.xxx.xxx
  Pendapatan Penjualan      :  Rp x.xxx.xxx
  (-) Potongan Penjualan    : (Rp   xxx.xxx)
  TOTAL PENDAPATAN          :  Rp x.xxx.xxx

HARGA POKOK PENJUALAN (HPP):
  HPP Barang + Sparepart    : (Rp x.xxx.xxx)
  LABA KOTOR                :  Rp x.xxx.xxx

BIAYA OPERASIONAL:
  Biaya Gaji & Komisi       : (Rp x.xxx.xxx)
  Biaya Garansi             : (Rp   xxx.xxx)
  Biaya Lain-lain           : (Rp   xxx.xxx)
  TOTAL BIAYA OPERASIONAL   : (Rp x.xxx.xxx)

  LABA BERSIH SEBELUM PAJAK :  Rp x.xxx.xxx
  Periode: [bulan tahun]
```

### 5.2 Neraca (Balance Sheet)

```
ASET LANCAR               | KEWAJIBAN LANCAR
  Kas           Rp xxx    |   Hutang Dagang   Rp xxx
  Bank          Rp xxx    |   PPN Keluaran    Rp xxx
  Piutang       Rp xxx    |   Hutang Gaji     Rp xxx
  Persediaan    Rp xxx    |   TOTAL KEW.      Rp xxx
ASET TETAP                  EKUITAS
  Peralatan     Rp xxx    |   Modal Pemilik   Rp xxx
  Akum. Depr.  (Rp xxx)   |   Laba Ditahan   Rp xxx
TOTAL ASET     Rp xxx    |  TOTAL KEW + EKU  Rp xxx

Syarat Keseimbangan: TOTAL ASET = TOTAL KEWAJIBAN + EKUITAS
```

### 5.3 Laporan Arus Kas

```
Aktivitas Operasi:
  + Penerimaan dari pelanggan     : Rp x.xxx.xxx
  - Pembayaran ke supplier        :(Rp x.xxx.xxx)
  - Pembayaran gaji               :(Rp x.xxx.xxx)
  Net Kas Operasi                 : Rp x.xxx.xxx

Aktivitas Investasi:
  - Pembelian peralatan           :(Rp   xxx.xxx)
  Net Kas Investasi               :(Rp   xxx.xxx)

Aktivitas Pendanaan:
  + Modal disetor                 : Rp x.xxx.xxx
  Net Kas Pendanaan               : Rp x.xxx.xxx

KENAIKAN/(PENURUNAN) KAS          : Rp x.xxx.xxx
SALDO KAS AWAL                    : Rp x.xxx.xxx
SALDO KAS AKHIR                   : Rp x.xxx.xxx
```

### 5.4 Buku Besar per Akun

```
Filter: pilih akun, periode, branch
Kolom: Tanggal | Referensi | Deskripsi | Debit | Kredit | Saldo
Running balance dihitung dari saldo awal akun
Export: CSV / PDF
```

---

## 6. Manajemen Pajak (PPN)

```typescript
taxSettings: {
  taxEnabled:   boolean,  // Aktifkan PPN di seluruh sistem
  taxRate:      number,   // Persentase, misal: 11 untuk 11% PPN Indonesia
  taxInclusive: boolean,  // true = harga sudah termasuk PPN
}

// Kalkulasi PPN:
// Eksklusif: taxAmount = netAmount * (taxRate / 100)
// Inklusif:  taxAmount = total - (total / (1 + taxRate/100))

// Contoh Inklusif (taxRate=11, total=111.000):
//   taxAmount = 111.000 - (111.000 / 1.11) = 11.000
//   netAmount = 100.000
```

---

## 7. Penutupan Periode (Period Closing)

```
Alur Tutup Bulan (oleh Owner/Manager):
  1. Pastikan semua jurnal berstatus POSTED (bukan DRAFT)
  2. Rekonsiliasi kas: saldo sistem vs uang fisik di brankas
  3. Rekonsiliasi bank: mutasi rekening koran vs jurnal di sistem
  4. Approve closing:
     UPDATE accounting_periods {status:"CLOSED", closedAt: NOW()}
  5. System: buat opening balance untuk periode baru dari saldo akhir
  6. Lock: semua jurnal periode tertutup tidak dapat diubah/hapus
  7. Generate dan download laporan PDF (L/R + Neraca + Arus Kas)
```

---

## 8. Database Schema

```sql
CREATE TABLE chart_of_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  code        VARCHAR(20) NOT NULL,
  name        VARCHAR(200) NOT NULL,
  type        VARCHAR(50),  -- ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE
  is_system   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE journal_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL,
  branch_id      UUID,
  date           DATE NOT NULL,
  ref_number     VARCHAR(100),
  description    TEXT,
  source_module  VARCHAR(50),  -- POS | SERVIS | INVENTORY | HR | MANUAL
  source_id      UUID,
  status         VARCHAR(20)  DEFAULT 'POSTED',  -- DRAFT | POSTED | VOIDED
  created_by     UUID,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE journal_entry_lines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id  UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id  UUID REFERENCES chart_of_accounts(id),
  debit       NUMERIC(15,2) DEFAULT 0,
  credit      NUMERIC(15,2) DEFAULT 0,
  note        TEXT
);

-- Trigger: pastikan debit = kredit sebelum posting
CREATE OR REPLACE FUNCTION validate_journal_balance()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  IF (SELECT ABS(SUM(debit) - SUM(credit))
      FROM journal_entry_lines
      WHERE journal_id = NEW.journal_id) > 0.01 THEN
    RAISE EXCEPTION 'Journal entry is not balanced (debit != credit)';
  END IF;
  RETURN NEW;
END;
$func$;
```
