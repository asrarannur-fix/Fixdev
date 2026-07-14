# 09 — MODUL WHATSAPP & NOTIFIKASI
**RepairHub ERP** | Dokumentasi Teknis v1.0 | 2024

---

## 1. Gambaran Umum

Modul WhatsApp & Notifikasi adalah mesin komunikasi terpusat RepairHub. Mendukung **multiple gateway provider**, manajemen template pesan dinamis, sistem antrian pengiriman dengan retry otomatis, trigger dari semua modul ERP, serta webhook inbound untuk interaksi dua arah (approval estimasi via WA).

---

## 2. Gateway Provider yang Didukung

| Provider | Tipe | Kelebihan | Kekurangan |
|----------|------|-----------|------------|
| Fonnte | Unofficial (WA Web) | Setup mudah, harga lokal | Bisa kena ban, tidak official |
| WhatsApp Business API (WABA) | Official Meta | Reliability tinggi, template verified | Perlu verifikasi bisnis Meta |
| Twilio | Official via Meta | Enterprise grade, global, SLA | Harga lebih tinggi |
| Zenziva | Unofficial | Harga kompetitif lokal | Keterbatasan fitur |
| Custom HTTP | Generic Webhook | Fleksibel untuk gateway apapun | Konfigurasi manual penuh |

---

## 3. Struktur Konfigurasi (waConfig)

```typescript
// Dari TenantSettings di types/index.ts
waConfig: {
  gateway:        string,   // "fonnte" | "waba" | "twilio" | "zenziva" | "custom"
  isConnected:    boolean,  // Status koneksi aktif/terputus
  apiToken:       string,   // API key / Bearer token autentikasi
  phoneNumber:    string,   // Nomor WA pengirim (format: 628xxx)
  sendingMethod:  string,   // "single" | "broadcast"
  syncEstimate:   boolean,  // Kirim estimasi otomatis ke pelanggan
  phoneId:        string,   // Phone Number ID (khusus WABA)
  wabaId:         string,   // WhatsApp Business Account ID (khusus WABA)
  webhookSecret:  string,   // Secret untuk verifikasi signature webhook Meta
  whatsappKey:    string,   // Additional auth key (provider-specific)
  triggers:       Record<string, boolean | any>,  // Enable/disable per trigger
  templates:      WaTemplate[],  // Daftar template pesan kustom
}

notificationSettings: {
  whatsappEnabled:   boolean,  // Master switch WA (jika false, tidak ada WA terkirim)
  telegramEnabled:   boolean,  // Master switch Telegram
  emailEnabled:      boolean,  // Master switch Email
  whatsappNumber:    string,   // Nomor WA default untuk notif internal
  telegramBotToken:  string,   // Token bot Telegram
  telegramChatId:    string,   // Group/channel Telegram untuk internal notif
}
```

---

## 4. Alur Setup Koneksi Gateway

### Fonnte (Paling Populer untuk UKM)
```
1. Daftar di fonnte.com -> dapatkan API Token
2. Download aplikasi Fonnte di HP yang akan jadi pengirim
3. Scan QR code yang muncul di dashboard Fonnte
4. Di Settings RepairHub -> Tab WhatsApp:
     gateway   = "fonnte"
     apiToken  = "token-dari-fonnte"
     phoneNumber = "628xxxxx"
5. Klik "Test Koneksi" -> sistem kirim WA test ke nomor owner
6. Jika berhasil -> isConnected = true
```

### WABA (WhatsApp Business API Official)
```
1. Buat Facebook Business Manager -> verifikasi bisnis
2. Buat WhatsApp Business Account (WABA)
3. Tambah nomor telepon -> verifikasi via OTP
4. Buat System User + generate token permanen
5. Input di Settings:
     gateway   = "waba"
     phoneId   = "phone-number-id-dari-meta"
     wabaId    = "waba-id-dari-meta"
     apiToken  = "token-permanen"
6. Setup Webhook di Meta for Business:
     URL      : https://app.domain.id/api/wa/webhook
     Verify   : webhookSecret
     Subscribe: messages, message_status_updates
7. Buat template pesan -> submit ke Meta untuk review (24-48 jam)
```

---

## 5. Data Model Template

```typescript
interface WaTemplate {
  id: string;
  name: string;          // Key unik: "tiket_diterima", "estimasi_approval"
  triggerEvent: string;  // Event yang memicu pengiriman template ini
  content: string;       // Isi pesan dengan placeholder {{variabel}}
  variables: string[];   // Daftar nama variabel: ["customerName", "ticketNumber"]
  isActive: boolean;
  wabaTemplateName?: string; // Nama template di Meta (untuk WABA)
}
```

### Template Default Bawaan Sistem

**1. Tiket Diterima (`service.ticket.created`)**
```
Halo {{customerName}},

Tiket servis Anda sudah kami terima.
Nomor Tiket : {{ticketNumber}}
Perangkat   : {{deviceBrand}} {{deviceModel}}
Keluhan     : {{complaint}}

Tim kami akan segera mendiagnosa perangkat Anda.
Terima kasih telah mempercayai {{tenantName}}.
```

**2. Estimasi Siap — Menunggu Approval (`service.estimate.ready`)**
```
Halo {{customerName}},

Diagnosa perangkat {{deviceBrand}} {{deviceModel}} selesai:
{{diagnosisText}}

Estimasi Biaya : Rp {{estimatedCost}}
Durasi Perbaikan: {{estimatedDuration}}

Silakan setujui atau tolak estimasi di link berikut:
{{approvalLink}}

Link berlaku 48 jam.
Salam, Tim {{tenantName}}
```

**3. Servis Selesai (`service.ticket.completed`)**
```
Halo {{customerName}},

Kabar baik! Perangkat {{deviceBrand}} {{deviceModel}} Anda sudah SELESAI diperbaiki.

Nomor Tiket : {{ticketNumber}}
Total Biaya : Rp {{finalCost}}
Garansi     : s/d {{warrantyEndsAt}}

Silakan ambil di {{branchName}}.
Jam Operasional: {{operationalHours}}

Salam, Tim {{tenantName}}
```

**4. Pengingat Pengambilan (`service.pickup.reminder`)**
```
Halo {{customerName}},

Perangkat Anda sudah menunggu {{daysSinceCompleted}} hari.
Mohon segera diambil di {{branchName}}.
Info lebih lanjut: {{contactNumber}}
```

**5. Stok Menipis — Internal (`inventory.low_stock`)**
```
ALERT STOK MENIPIS
Produk  : {{productName}}
SKU     : {{sku}}
Stok    : {{currentStock}} unit
Minimum : {{minStock}} unit

Harap segera lakukan pembelian.
Sistem RepairHub - {{branchName}}
```

---

## 6. Tabel Trigger Events Lengkap

| Event Key | Modul | Penerima | Kirim Otomatis |
|-----------|-------|----------|----------------|
| `service.ticket.created` | Servis | Pelanggan | Ya |
| `service.estimate.ready` | Servis | Pelanggan | Ya (jika syncEstimate) |
| `service.estimate.approved` | Servis | Teknisi + Pelanggan | Ya |
| `service.estimate.rejected` | Servis | Front Desk + Pelanggan | Ya |
| `service.ticket.completed` | Servis | Pelanggan | Ya |
| `service.pickup.reminder` | Servis | Pelanggan | Ya (cron D+3) |
| `pos.invoice.created` | POS | Pelanggan | Opsional |
| `pos.refund.processed` | POS | Pelanggan + Manager | Opsional |
| `inventory.low_stock` | Inventory | Owner + Manager | Ya (jika aktif) |
| `inventory.po.approved` | Inventory | Supplier | Opsional |
| `crm.b2b.invoice_due` | CRM | Pelanggan B2B | Ya (D-3 jatuh tempo) |
| `crm.customer.upgraded` | CRM | Pelanggan | Ya (naik ke VIP) |
| `hr.payslip.ready` | HR | Karyawan | Opsional |
| `auth.suspicious_login` | Security | Owner | Ya |
| `tenant.subscription.expiring` | SuperAdmin | Owner Tenant | Ya (D-7) |

---

## 7. Alur Pengiriman & Queue

```
Event terjadi (misal: tiket selesai)
  |
  v
WhatsApp Service Layer:
  1. Cek: waConfig.isConnected && notificationSettings.whatsappEnabled
     -> FALSE: skip silently (tidak error)
  
  2. Cari template: waConfig.templates.find(t => t.name === eventKey)
     -> Tidak ada: gunakan template hardcoded default
  
  3. Render pesan: replace semua {{variable}} dengan nilai aktual
  
  4. INSERT wa_queue {
       to:          customer.phone,
       message:     renderedMessage,
       status:      "PENDING",
       retry_count: 0,
       tenant_id:   tenantId
     }

Queue Processor (Edge Function / cron tiap 5 detik):
  WHILE ada item status = "PENDING":
    item = ambil item paling lama
    
    TRY:
      response = await callGatewayAPI(gateway, item)
      
      IF response.ok:
        UPDATE wa_queue {status:"SENT", sent_at: NOW()}
        INSERT wa_delivery_logs {status:"DELIVERED"}
      ELSE:
        THROW Error(response.errorMessage)
    
    CATCH error:
      item.retry_count++
      
      IF retry_count <= 3:
        delay = 5 min * retry_count  (exponential backoff)
        UPDATE wa_queue {status:"PENDING", retry_at: NOW() + delay}
      ELSE:
        UPDATE wa_queue {status:"FAILED"}
        INSERT wa_delivery_logs {status:"FAILED", error_msg}
        // Alert ke owner jika kegagalan kritis
```

---

## 8. Rate Limiting

```
Fonnte (unofficial):
  Batasi: 10 pesan/menit (mencegah ban akun WA)
  Implementasi: kirim 1 pesan setiap 6 detik (60s / 10 = 6s interval)
  Config: maxPerMinute di waConfig

WABA (official Meta):
  Tier 1 (baru): 1.000 percakapan unik/hari
  Tier 2: 10.000/hari (upgrade otomatis jika kualitas tinggi)
  Tier 3: 100.000/hari
  Dalam percakapan aktif: tidak ada limit per pesan
  
Throttle Logic:
  if (lastSentAt && (Date.now() - lastSentAt) < minInterval):
    await delay(minInterval - elapsed)
```

---

## 9. Webhook Inbound (WABA — Dua Arah)

```
Meta mengirim POST ke: https://app.domain.id/api/wa/webhook

Langkah 1 — Verifikasi Signature:
  expectedHash = HMAC-SHA256(rawBody, waConfig.webhookSecret)
  actualHash   = request.headers["X-Hub-Signature-256"]
  IF expectedHash != actualHash -> return HTTP 403 (tolak)

Langkah 2 — Parse Event:
  entry.changes.value.messages:
    TYPE = "text"       -> pelanggan balas pesan (simpan ke crm_conversations)
    TYPE = "interactive" -> pelanggan klik tombol Quick Reply
    TYPE = "button"     -> pelanggan klik tombol template

Langkah 3 — Handle Approval via Quick Reply:
  IF message.interactive.button_reply.id == "APPROVE_{{ticketId}}":
    updateServiceTicketStatus(ticketId, "DIKERJAKAN")
    replyWA(customer.phone, "Terima kasih! Pengerjaan dimulai.")

  IF message.interactive.button_reply.id == "REJECT_{{ticketId}}":
    payload    = parseRejectPayload(message)
    rejectNote = payload.rejectReason ?? "Pelanggan menolak estimasi"
    updateServiceTicketStatus(ticketId, "DITOLAK", rejectNote)
    replyWA(customer.phone, "Baik, silakan ambil perangkat Anda.")

Langkah 4 — Update Delivery Status:
  statuses[].status: "sent" | "delivered" | "read" | "failed"
  UPDATE wa_delivery_logs WHERE message_id = status.id
```

---

## 10. Monitoring & Dashboard WA

```
Panel WhatsApp (Settings -> WhatsApp -> Monitoring):

Status Koneksi:
  Badge: [CONNECTED - Fonnte] atau [DISCONNECTED]
  Last ping: [timestamp]

Statistik Hari Ini:
  Terkirim    : 47 pesan
  Gagal       : 2 pesan
  Success Rate: 95.9%
  Queue Saat Ini: [0 pending] [0 sending] [2 failed]

Queue Table:
  [Timestamp] [Nomor Penerima] [Event] [Status] [Retry] [Error]

Delivery Log (30 hari terakhir):
  Filter: status | event | tanggal | nomor penerima
  Export: CSV
```
