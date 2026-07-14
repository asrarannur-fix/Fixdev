# 02 — MODUL SERVIS & AI DIAGNOSA
**RepairHub ERP** | Dokumentasi Teknis v1.0 | 2024

---

## 1. Gambaran Umum

Modul Servis mengelola siklus penuh perbaikan elektronik: penerimaan → diagnosa AI (Google Gemini) → approval pelanggan via portal → pengerjaan teknisi → QC → selesai → trigger garansi otomatis. Terintegrasi dengan Inventory (sparepart), Accounting (auto-journal), WhatsApp (notifikasi real-time).

---

## 2. Status Machine Tiket

```
DITERIMA
   |
   v
DIAGNOSA ---[Google Gemini API]---> Hasilkan: diagnosa, estimasi biaya, list sparepart
   |
   v
MENUNGGU_APPROVAL ---[WA link portal]--> Pelanggan terima estimasi
   |
   +-- DISETUJUI --> DIKERJAKAN --> QC --> SELESAI --> DIAMBIL
   |                                          |
   |                                    [DB Trigger: warranty_ends_at]
   |                                    [Generate Invoice + WA konfirmasi]
   |
   +-- DITOLAK   --> DIBATALKAN
   
Jalur Garansi:
SELESAI + klaim dalam masa garansi --> GARANSI (tiket baru, link ke asal)
```

**TypeScript Enum:**
```typescript
enum ServiceStatus {
  DITERIMA          = "DITERIMA",
  DIAGNOSA          = "DIAGNOSA",
  MENUNGGU_APPROVAL = "MENUNGGU_APPROVAL",
  DISETUJUI         = "DISETUJUI",
  DIKERJAKAN        = "DIKERJAKAN",
  QC                = "QC",
  SELESAI           = "SELESAI",
  DIAMBIL           = "DIAMBIL",
  DITOLAK           = "DITOLAK",
  DIBATALKAN        = "DIBATALKAN",
  GARANSI           = "GARANSI",
}
```

---

## 3. Data Model: ServiceTicket

```typescript
interface ServiceTicket {
  id: string;                      // UUID primary key
  tenantId: string;                // Tenant isolation (RLS)
  branchId: string;                // Branch context
  ticketNumber: string;            // "SRV-20240711-001"
  customerId: string;              // FK ke customers
  customerName: string;            // Denormalized untuk display cepat
  deviceBrand: string;             // Merek perangkat (Samsung, Apple, dll)
  deviceModel: string;             // Model (Galaxy S23, iPhone 14, dll)
  deviceColor?: string;            // Warna perangkat
  deviceImei?: string;             // IMEI atau Serial Number
  complaint: string;               // Keluhan pelanggan (teks bebas)
  technicianNotes?: string;        // Catatan diagnosa teknisi
  estimatedCost?: number;          // Estimasi biaya (dari AI atau manual)
  finalCost?: number;              // Biaya final setelah perbaikan selesai
  status: ServiceStatus;           // Status saat ini
  technicianId?: string;           // FK ke users (teknisi yang ditugaskan)
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  photos?: string[];               // URL foto kerusakan (Supabase Storage)
  aiDiagnosis?: string;            // Teks hasil diagnosa AI
  warrantyEndsAt?: string;         // ISO timestamp akhir garansi
  completedAt?: string;            // ISO timestamp saat SELESAI
  createdAt: string;
  updatedAt: string;
}
```

---

## 4. Alur Penerimaan Tiket (Frontend -> Backend -> DB)

### Frontend: Form Input
```
Resepsionis / Admin buka "Form Tiket Baru":
  - Input: nama pelanggan (autocomplete dari customers)
  - Input: brand & model perangkat
  - Input (opsional): warna, IMEI/SN
  - Textarea: keluhan pelanggan
  - Upload: foto kerusakan (multi-file)
  - Select: prioritas (LOW / NORMAL / HIGH / URGENT)
  - Input: biaya diagnosa awal (default dari serviceSettings)
  - Submit -> validasi -> SaaSContext.addServiceTicket()
```

### Backend: SaaSContext.addServiceTicket()
```
1. Generate ticket number:
   prefix = settings.documentConfig.ticketPrefix ?? "SRV"
   today  = format(new Date(), "yyyyMMdd")
   seq    = getNextDailySequence("service_tickets", today)
   ticketNumber = `${prefix}-${today}-${seq.toString().padStart(3,"0")}`

2. INSERT INTO service_tickets {
     tenant_id, branch_id, ticket_number,
     customer_id, device_brand, device_model,
     complaint, status: "DITERIMA",
     priority, technician_id (null)
   }

3. IF settings.notificationSettings.whatsappEnabled:
   sendWA(customer.phone, template_tiket_diterima(ticketNumber, deviceModel))

4. Update local state: serviceTickets.push(newTicket)
5. UI refresh -> tiket baru muncul di list
```

### Database Schema
```sql
CREATE TABLE service_tickets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  branch_id        UUID NOT NULL,
  ticket_number    VARCHAR(50) UNIQUE NOT NULL,
  customer_id      UUID REFERENCES customers(id),
  device_brand     VARCHAR(100),
  device_model     VARCHAR(100),
  device_imei      VARCHAR(50),
  complaint        TEXT,
  technician_notes TEXT,
  status           VARCHAR(50)   DEFAULT 'DITERIMA',
  priority         VARCHAR(20)   DEFAULT 'NORMAL',
  estimated_cost   NUMERIC(15,2),
  final_cost       NUMERIC(15,2),
  technician_id    UUID,
  ai_diagnosis     TEXT,
  warranty_ends_at TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE service_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON service_tickets
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

---

## 5. Alur AI Diagnosa (Google Gemini)

### Trigger & Validasi Pre-kondisi
```typescript
const handleApplyAiRecommendation = async (ticket: ServiceTicket) => {
  // Validasi: status harus DIAGNOSA
  if (ticket.status !== "DIAGNOSA") {
    throw new Error("AI diagnosa hanya dapat dijalankan saat status DIAGNOSA");
  }
  setIsLoading(true);
  // ... lanjut ke Gemini API call
};
```

### Prompt Template ke Gemini
```typescript
const prompt = `Kamu adalah teknisi elektronik profesional berpengalaman 15 tahun.
Perangkat: ${ticket.deviceBrand} ${ticket.deviceModel}
Keluhan pelanggan: ${ticket.complaint}
${ticket.technicianNotes ? "Catatan teknisi: " + ticket.technicianNotes : ""}

Berikan diagnosa LENGKAP dalam format JSON valid (tanpa markdown):
{
  "diagnosisText": "Penjelasan kerusakan detail dan teknis",
  "rootCause": "Penyebab utama kerusakan",
  "repairSteps": ["Langkah 1", "Langkah 2", "Langkah 3"],
  "estimatedCost": 250000,
  "requiredParts": ["Nama Part 1", "Nama Part 2"],
  "estimatedDuration": "2-3 jam"
}`;

const model = genAI.getGenerativeModel({ model: "gemini-pro" });
const result = await model.generateContent(prompt);
const parsed = JSON.parse(result.response.text());
```

### Validasi & Update Tiket
```typescript
// Validasi estimasi biaya
if (!Number.isFinite(parsed.estimatedCost) || parsed.estimatedCost < 0) {
  showToast("Estimasi biaya AI tidak valid", "error");
  return;
}

// Update tiket dengan hasil AI
await supabase.from("service_tickets").update({
  ai_diagnosis:   parsed.diagnosisText,
  estimated_cost: parsed.estimatedCost,
  status:         "MENUNGGU_APPROVAL"
}).eq("id", ticket.id);

// Kirim WhatsApp estimasi ke pelanggan
await sendWhatsApp(customer.phone,
  buildEstimateMessage(ticket, parsed));
```

---

## 6. Alur Approval Pelanggan (Customer Portal)

```
1. WhatsApp dikirim ke pelanggan:
   "Estimasi perbaikan [brand model]: Rp[cost]. Klik link berikut untuk merespons:
   https://app.domain.id/portal?ticket=SRV-001&token=abc123"

2. Pelanggan buka portal -> validasi token
3. Portal tampilkan:
   - Detail perangkat + foto kerusakan
   - Diagnosa AI (teks + root cause)
   - Rincian estimasi biaya (labor + parts)
   - Estimasi durasi pengerjaan

4a. SETUJU diklik:
    -> PATCH /service_tickets/:id { status: "DIKERJAKAN" }
    -> WA ke pelanggan: "Perbaikan dimulai. Estimasi selesai: [waktu]"
    -> WA ke teknisi: "Tiket [no] disetujui pelanggan, segera kerjakan"

4b. TOLAK diklik (+ input alasan):
    -> PATCH /service_tickets/:id { status: "DITOLAK", rejection_reason: "..." }
    -> WA ke pelanggan: "Maaf. Silakan ambil perangkat Anda."
    -> WA ke front desk: "Pelanggan [nama] menolak estimasi tiket [no]"
```

### Portal Settings (TenantSettings)
```typescript
customerPortalSettings: {
  enableStatusCheck:       boolean,  // Cek status tiket
  enableEstimateApproval:  boolean,  // Tombol approve/tolak
  enableInvoiceView:       boolean,  // Download invoice PDF
  enableWarrantyView:      boolean,  // Info masa garansi
  enableTicketTracking:    boolean,  // Timeline progress perbaikan
  hideInternalNotes:       boolean,  // Sembunyikan catatan internal
  hideProfit:              boolean,  // Sembunyikan margin keuntungan
}
```

---

## 7. Pengerjaan & Manajemen Sparepart

```
Status: DIKERJAKAN
Teknisi membuka panel pengerjaan:
  1. Pilih sparepart dari inventory (filtered: branch + isActive + stok > 0)
  2. Input qty yang digunakan per part
  3. System (atomic):
     - UPDATE product.warehouseStock[warehouseId] -= qty
     - INSERT service_parts {ticketId, productId, qty, unitCost: product.buyPrice}
     - INSERT inventory_movements {type: "OUT", reference: ticketNumber}
  4. Upload foto perbaikan (progress + hasil akhir)
  5. Kalkulasi total:
     finalCost = laborCost + SUM(part.qty * part.unitCost)
  6. Klik "Selesai Pengerjaan" -> status: "QC"
```

---

## 8. Quality Control (QC) Process

```
Status: QC
QC Inspector (Manager / Senior Teknisi):
  Review:
    - Foto perbaikan before/after
    - Checklist: fungsi utama OK, kosmetik OK, accessories OK
    - Test fungsionalitas perangkat (panggilan, kamera, dll)
  
  Keputusan:
    LULUS QC:
      -> status: "SELESAI"
      -> Trigger: DB function warranty_ends_at
      -> Generate invoice PDF
      -> WA ke pelanggan: "Perangkat siap diambil! Garansi s/d [tanggal]"
    
    GAGAL QC:
      -> status: "DIKERJAKAN"
      -> Catat: alasan gagal QC
      -> WA ke teknisi: "Revisi diperlukan: [alasan]"
```

---

## 9. Database Trigger Garansi (Otomatis)

```sql
CREATE OR REPLACE FUNCTION calculate_warranty_ends_at()
RETURNS TRIGGER AS $$
DECLARE v_days INT;
BEGIN
  IF NEW.status = 'SELESAI' AND OLD.status <> 'SELESAI' THEN
    SELECT COALESCE((settings ->> 'warrantyDays')::int, 30)
    INTO v_days FROM tenants WHERE id = NEW.tenant_id;
    NEW.warranty_ends_at := NOW() + (v_days || ' days')::interval;
    NEW.completed_at     := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_warranty_ends_at
  BEFORE UPDATE ON service_tickets
  FOR EACH ROW EXECUTE FUNCTION calculate_warranty_ends_at();
```

---

## 10. Auto-Journal ke Accounting (saat SELESAI)

```
Saat status berubah ke SELESAI (dipicu otomatis):

DR  Piutang Usaha / Kas              = finalCost
  CR  Pendapatan Jasa Servis         = laborCost
  CR  Pendapatan Penjualan Sparepart = partsCost
  CR  PPN Keluaran (jika taxEnabled) = finalCost * taxRate

HPP sparepart:
DR  HPP Sparepart                    = SUM(part.qty * part.buyPrice)
  CR  Persediaan Sparepart           = SUM(part.qty * part.buyPrice)
```

---

## 11. Klaim Garansi

```
Pelanggan datang klaim dalam masa garansi:
  1. Staff input: nomor tiket atau nama pelanggan + brand/model
  2. System: SELECT warranty_ends_at FROM service_tickets WHERE id = origId
  3. VALID (warranty_ends_at > NOW()):
       -> Buat tiket baru {status: "GARANSI", original_ticket_id: origId}
       -> Biaya pelanggan = Rp 0
       -> Biaya garansi dicatat ke Accounting:
          DR  Biaya Garansi (Expense)
            CR  Kas / Inventory
  4. EXPIRED (warranty_ends_at <= NOW()):
       -> Tampilkan: "Garansi berakhir: [tanggal]"
       -> Buat tiket baru normal (berbiaya)
```
