# 05 — MODUL CRM & MANAJEMEN B2B
**RepairHub ERP** | Dokumentasi Teknis v1.0 | 2024

---

## 1. Gambaran Umum

Modul CRM mengelola hubungan pelanggan end-to-end: segmentasi otomatis (Regular/VIP/B2B), pipeline B2B, portal self-service pelanggan, program loyalitas berbasis poin, approval panel terpusat, dan analitik retensi. Terintegrasi dengan Servis (portal approval tiket), POS (loyalty points + B2B credit), dan WhatsApp (semua notifikasi pelanggan).

---

## 2. Data Model: Customer

```typescript
interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone: string;                  // Format: 62xxxxx (tanpa +)
  email?: string;
  address?: string;
  segment: CustomerSegment;
  companyName?: string;           // Wajib untuk B2B
  npwp?: string;                  // NPWP perusahaan B2B
  creditLimit?: number;           // Limit kredit B2B (Rp)
  creditUsed?: number;            // Saldo kredit terpakai B2B
  loyaltyPoints: number;          // Akumulasi poin loyalitas
  totalSpending: number;          // Total belanja lifetime (Rp)
  visitCount: number;             // Jumlah transaksi/kunjungan
  isBlacklisted: boolean;
  blacklistReason?: string;
  portalToken?: string;           // Token akses portal pelanggan
  lastVisitAt?: string;           // Timestamp kunjungan terakhir
  createdAt: string;
}

enum CustomerSegment {
  REGULAR     = "REGULAR",        // Default untuk pelanggan baru
  VIP         = "VIP",            // Auto-upgrade saat spending >= threshold
  B2B_PARTNER = "B2B_PARTNER",    // Mitra bisnis (verifikasi manual)
  BLACKLIST   = "BLACKLIST",      // Dilarang dilayani
}
```

---

## 3. Segmentasi & Auto-Upgrade

| Segment | Kriteria | Benefit Utama |
|---------|----------|---------------|
| REGULAR | Default (baru daftar) | Layanan standar, loyalty points |
| VIP | `totalSpending >= Rp5.000.000` (auto) | Prioritas antrian, diskon khusus |
| B2B_PARTNER | Verifikasi + approve manual | Invoice, kredit (NET30/60), harga grosir |
| BLACKLIST | Ditandai manual + alasan | Peringatan di semua modul |

```typescript
// Dipanggil setelah setiap transaksi POS berhasil
const checkAutoUpgrade = async (customerId: string): Promise<void> => {
  const cust = await getCustomer(customerId);
  if (cust.segment === "REGULAR" && cust.totalSpending >= 5_000_000) {
    await updateCustomerSegment(customerId, "VIP");
    await sendWhatsApp(cust.phone,
      "Selamat! Anda telah naik ke status VIP Member! " +
      "Nikmati layanan prioritas dan penawaran eksklusif."
    );
  }
};
```

---

## 4. B2B Pipeline

### Tahapan Pipeline
```
LEAD -> PROSPECT -> PROPOSAL -> NEGOTIATION -> DEAL_CLOSED
                                                   |
                                              ONBOARDING -> ACTIVE_PARTNER
```

### Proses Registrasi & Onboarding B2B
```
Step 1 — Sales buat profil B2B calon mitra:
  Input: nama perusahaan, alamat, NPWP, kontak PIC, email
  Submit -> INSERT customers {segment: "REGULAR", companyName, npwp}
          -> INSERT b2b_applications {status: "PENDING_APPROVAL"}

Step 2 — Owner / Manager review aplikasi:
  APPROVE:
    SET customer.creditLimit = inputAmount  (misal: Rp10.000.000)
    SET customer.segment     = "B2B_PARTNER"
    CREATE b2b_terms {paymentTerms: "NET30", discountRate: 5}
    WA ke PIC: "Aplikasi B2B disetujui. Credit limit: Rp[limit]"

  REJECT + alasan:
    UPDATE b2b_applications {status: "REJECTED", rejectReason}
    WA ke PIC: "Mohon maaf, aplikasi belum dapat disetujui: [alasan]"
```

### Transaksi B2B via POS
```
Kasir pilih pelanggan B2B -> pilih payment: CREDIT
  Validasi:
    IF customer.creditUsed + totalAmount > customer.creditLimit:
      showError("Melampaui credit limit! Sisa limit: Rp[sisa]")
      return

  Berhasil:
    creditUsed += totalAmount
    Generate invoice B2B (due date = today + paymentTerms days)
    Kirim invoice via WA + email (opsional)

Pembayaran tagihan B2B (oleh manager):
  Manager input: pelanggan + nominal pembayaran
  creditUsed -= paymentAmount
  Journal:
    DR  Kas / Bank                   = paymentAmount
      CR  Piutang Usaha B2B         = paymentAmount
```

---

## 5. Customer Portal

### Akses & Autentikasi
```
Link dikirim via WhatsApp:
  https://app.repairhub.id/portal?ticket={ticketNo}&token={token}

Backend validasi:
  SELECT * FROM service_tickets
    WHERE ticket_number = :ticketNo
    AND portal_token = :token
    AND tenant_id = :tenantId
  
  Jika valid -> render CustomerPortalDashboard
  Jika invalid/expired -> tampilkan error "Link tidak valid"
```

### Fitur Portal (Dikonfigurasi per Tenant)
```typescript
customerPortalSettings: {
  enableStatusCheck:      boolean,  // Real-time status tiket
  enableEstimateApproval: boolean,  // Tombol approve / tolak estimasi
  enableInvoiceView:      boolean,  // Download invoice PDF
  enableWarrantyView:     boolean,  // Lihat detail masa garansi
  enableTicketTracking:   boolean,  // Timeline progress perbaikan
  hideInternalNotes:      boolean,  // Sembunyikan catatan teknisi internal
  hideProfit:             boolean,  // Sembunyikan margin & HPP
}
```

### Tampilan Portal Pelanggan
```
Dashboard Portal:
  [Header: Logo + nama tenant + nama pelanggan]
  
  Tiket Aktif:
    - Status badge (DITERIMA / MENUNGGU_APPROVAL / DIKERJAKAN / dll)
    - Timeline progress (visual)
    - Detail perangkat + foto
  
  [Jika enableEstimateApproval && status==MENUNGGU_APPROVAL]:
    Estimasi Biaya: Rp[amount]
    Diagnosa: [teks AI]
    [SETUJU] [TOLAK]
  
  [Jika enableInvoiceView && status==SELESAI]:
    [Download Invoice PDF]
  
  [Jika enableWarrantyView && warrantyEndsAt]:
    Garansi berlaku sampai: [tanggal]
```

---

## 6. Approval Panel (Admin View)

Panel di tab CRM untuk memantau & mengelola semua tiket pending approval:

```
List tiket status "MENUNGGU_APPROVAL":
  Filter: branch | teknisi | segment pelanggan | rentang tanggal
  Sort: prioritas DESC, tanggal masuk ASC, nilai estimasi DESC

  Per baris:
    [Nomor Tiket] [Pelanggan] [Perangkat] [Estimasi] [Tanggal] [Teknisi]
    Aksi: [Detail] [Resend WA] [Approve Manual] [Reject Manual]

Auto-refresh: setiap 30 detik via Supabase Realtime channel
Indikator: badge merah jumlah pending di tab CRM
```

---

## 7. Program Loyalitas

```typescript
// Konfigurasi
const POINTS_PER_TEN_THOUSAND = 1;   // 1 poin per Rp10.000 belanja
const DIVISOR                 = 10_000;
const POINT_REDEEM_VALUE      = 100; // 1 poin = Rp100 diskon

// Tambah poin setelah transaksi POS selesai (dalam atomic DB tx)
const earnPoints = (totalAmount: number): number =>
  Math.floor(totalAmount / DIVISOR) * POINTS_PER_TEN_THOUSAND;

// Redeem poin di POS (kasir tawari pelanggan)
const redeemPoints = (pointsToUse: number): number => {
  const discountAmount = pointsToUse * POINT_REDEEM_VALUE;
  // UPDATE customers SET loyalty_points -= pointsToUse (atomic in tx)
  return discountAmount;
};

// Tampilan di POS: "Poin tersedia: 150 (setara Rp15.000)"
```

---

## 8. Blacklist Management

```
Tambah ke blacklist:
  Manager pilih pelanggan -> klik "Blacklist"
  Input: alasan (wajib)
  UPDATE customers SET isBlacklisted=true, blacklistReason="..."
  
Warning saat pelanggan masuk sistem:
  POS: toast merah "PERHATIAN: Pelanggan ini termasuk daftar hitam"
       Reason: [alasan]
       [Override dengan PIN manager] [Batalkan transaksi]
  
  Servis: alert merah di form tiket
  CRM:  badge merah di profil pelanggan

Hapus dari blacklist:
  Owner / Manager konfirmasi + catat alasan penghapusan
  UPDATE customers SET isBlacklisted=false, blacklistReason=null
  INSERT blacklist_history {removedBy, removedAt, removeReason}
```

---

## 9. Analytics CRM

| Laporan | Metrik Utama | Frekuensi Update |
|---------|-------------|------------------|
| Segmentasi Pelanggan | Jumlah per segment, avg spending | Real-time |
| Analisis Retensi | Returning vs new, churn rate | Bulanan |
| Customer Lifetime Value | LTV per segment | Kumulatif |
| B2B Pipeline Report | Konversi per stage, win rate, avg deal | Kuartal |
| Program Loyalitas | Points earned/redeemed, active members | Bulanan |
| Top Pelanggan | Ranking by spending, visit freq, LTV | Periodik |
| Blacklist History | Log penambahan + penghapusan | Kumulatif |
