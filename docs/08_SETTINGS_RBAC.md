# 08 — MODUL SETTINGS & RBAC
**RepairHub ERP** | Dokumentasi Teknis v1.0 | 2024

---

## 1. Gambaran Umum

Modul Settings adalah pusat kendali konfigurasi seluruh sistem: manajemen pengguna & hak akses (RBAC 6-level), white-label branding, keamanan autentikasi, konfigurasi semua sub-modul (POS, Servis, Inventory, HR, Accounting, Portal), penomoran dokumen, dan pengaturan cetak. Akses penuh hanya untuk **Owner** dan **SuperAdmin**.

---

## 2. RBAC — Hierarki 6 Level Role

| Role | Level | Scope Akses | Deskripsi |
|------|-------|-------------|-----------|
| superadmin | 6 | Semua tenant | Admin platform, kelola semua tenant |
| owner | 5 | 1 tenant | Pemilik bisnis, akses penuh 1 tenant |
| manager | 4 | 1 tenant | Kelola operasional, kecuali billing & RBAC |
| kasir | 3 | 1 branch | Hanya POS + laporan shift sendiri |
| teknisi | 2 | 1 branch | Hanya tiket servis yang ditugaskan |
| viewer | 1 | 1 tenant | Read-only laporan tertentu |

### Matriks Permission Detail

| Modul / Aksi | owner | manager | kasir | teknisi | viewer |
|-------------|-------|---------|-------|---------|--------|
| POS — Buat Transaksi | RW | RW | RW | - | - |
| POS — Void | RW | RW | - | - | - |
| POS — Refund | RW | RW | - | - | - |
| POS — Lihat Laporan Shift | RW | RW | R(own) | - | R |
| Servis — Semua Tiket | RW | RW | R | RW* | R |
| Servis — Hapus Tiket | RW | - | - | - | - |
| Servis — AI Diagnosa | RW | RW | - | RW | - |
| Inventory — Produk | RW | RW | R | R | R |
| Inventory — PO | RW | RW | - | - | R |
| Inventory — Transfer | RW | RW | - | - | R |
| Inventory — Opname | RW | RW | - | - | - |
| CRM — Pelanggan | RW | RW | RW | R | R |
| CRM — Blacklist | RW | RW | - | - | - |
| CRM — B2B Approval | RW | RW | - | - | - |
| Accounting | RW | R | - | - | R |
| HR — Data Karyawan | RW | RW | - | - | R |
| HR — Payroll | RW | RW | - | - | - |
| Settings — RBAC | RW | - | - | - | - |
| Settings — Branding | RW | - | - | - | - |
| WhatsApp — Config | RW | - | - | - | - |
| Fraud Detection | RW | RW | - | - | R |
| System Backup | RW | - | - | - | - |
| Owner Reports | RW | - | - | - | - |

*Teknisi: hanya dapat mengubah tiket yang ditugaskan ke mereka

### DEFAULT_ROLE_PERMISSIONS (dari SaaSContext.tsx)

```typescript
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  owner: {
    "pos.read": true,       "pos.write": true,       "pos.void": true,
    "pos.refund": true,     "service.read": true,    "service.write": true,
    "service.delete": true, "service.ai": true,
    "inventory.read": true, "inventory.write": true,
    "crm.read": true,       "crm.write": true,
    "accounting.read": true, "accounting.write": true,
    "hr.read": true,        "hr.write": true,
    "settings.read": true,  "settings.write": true,
    "reports.read": true,   "whatsapp.config": true,
    "fraud.read": true,
  },
  manager: {
    // Seperti owner kecuali settings.write, billing, rbac
    "pos.read": true,       "pos.write": true,       "pos.void": true,
    "pos.refund": true,     "service.read": true,    "service.write": true,
    "inventory.read": true, "inventory.write": true,
    "crm.read": true,       "crm.write": true,
    "accounting.read": true,
    "hr.read": true,        "hr.write": true,
    "reports.read": true,   "fraud.read": true,
  },
  kasir: {
    "pos.read": true,       "pos.write": true,
    "crm.read": true,       "service.read": true,
  },
  teknisi: {
    "service.read": true,   "service.write": true,   "service.ai": true,
    "inventory.read": true,
  },
  viewer: {
    "reports.read": true,   "inventory.read": true,
    "service.read": true,   "crm.read": true,
  },
};
```

---

## 3. Manajemen Pengguna

```
Owner buka Settings -> Tab "Pengguna":
  Tampilkan: daftar user + role + branch + status aktif/nonaktif

  Undang User Baru:
    Input: email, pilih role, pilih branch target
    -> Supabase Admin: createUser({email})
    -> Set metadata: {tenantId, role, branchId}
    -> Kirim email undangan (magic link Supabase Auth)
    -> User set password sendiri via link

  Edit Role / Branch User:
    UPDATE user metadata {role: newRole, branchId: newBranchId}
    Berlaku di sesi login berikutnya (JWT refresh)

  Nonaktifkan User:
    UPDATE auth.users SET banned_until = 'infinity'
    User tidak bisa login; data historis tetap tersimpan (audit trail)

  Reset Password:
    -> Supabase: generateLink({type: "recovery", email})
    -> Kirim link ke email user (berlaku 1 jam)
```

---

## 4. Branding & White-Label (TenantBranding)

```typescript
interface TenantBranding {
  logo?: string;              // Base64 image atau URL logo
  logoUrl?: string;           // URL CDN alternatif
  primaryColor: string;       // Warna utama: "#6366f1" (indigo)
  secondaryColor?: string;    // Warna sekunder: "#64748b"
  accentColor: string;        // Tombol CTA: "#06b6d4" (cyan)
  fontFamily?: string;        // "Inter" | "Poppins" | "Roboto"
  slogan?: string;            // "Servis Profesional, Terpercaya"
  whiteLabelEnabled: boolean; // Sembunyikan branding RepairHub
  customDomain?: string;      // "erp.bengkelku.id" (custom subdomain)
  portalHelpTitle?: string;   // Judul halaman help di customer portal
  portalContactText?: string; // Teks kontak di portal pelanggan
}
```

### Aplikasi Branding Real-Time
```typescript
// Di ThemeProvider (src/context/ThemeContext.tsx):
useEffect(() => {
  if (!branding) return;
  const root = document.documentElement;
  root.style.setProperty("--color-primary",   branding.primaryColor);
  root.style.setProperty("--color-accent",    branding.accentColor);
  root.style.setProperty("--color-secondary", branding.secondaryColor ?? "#64748b");
  if (branding.fontFamily) {
    root.style.setProperty("--font-family", branding.fontFamily);
  }
  // Logo update di header, print, dan portal pelanggan
}, [branding]);
```

---

## 5. Pengaturan Keamanan (securitySettings & authSettings)

```typescript
securitySettings: {
  sessionTimeout:       number,   // Menit sebelum auto-logout (default: 480 = 8 jam)
  minPasswordLength:    number,   // Minimum 8 karakter
  requireUppercase:     boolean,  // Wajib huruf kapital
  requireNumber:        boolean,  // Wajib angka
  requireSpecial:       boolean,  // Wajib karakter khusus (@#$%...)
  maxLoginAttempts:     number,   // Max percobaan login (default: 5)
  lockoutDuration:      number,   // Menit lockout setelah gagal (default: 30)
  enableMFA:            boolean,  // Aktifkan 2FA via TOTP (Google Auth)
  allowPasswordReuse:   boolean,  // Izinkan gunakan password lama
}

authSettings: {
  allowGoogleLogin:  boolean,    // Login via Google OAuth
  requireMfa:        boolean,    // Wajibkan MFA untuk semua user
  passwordPolicy:    string,     // "BASIC" | "MEDIUM" | "STRONG"
  ipWhitelist:       string[],   // Daftar IP diizinkan: ["192.168.1.0/24"]
}
```

---

## 6. Pengaturan Umum (generalSettings)

```typescript
generalSettings: {
  appName:         string,    // Nama aplikasi custom (menggantikan "RepairHub")
  timezone:        string,    // "Asia/Jakarta" | "Asia/Makassar" | "Asia/Jayapura"
  dateFormat:      string,    // "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD"
  language:        string,    // "id" (Bahasa Indonesia) | "en"
  numberFormat:    string,    // "id-ID" (1.000,00) | "en-US" (1,000.00)
  maintenanceMode: boolean,   // Tampilkan halaman maintenance ke semua user
}
```

---

## 7. Pengaturan Per-Modul

### Servis
```typescript
serviceSettings: {
  defaultDiagnosisFee:          number,   // Biaya diagnosa default (Rp)
  requireEstimateApproval:      boolean,  // Wajib approval pelanggan sebelum dikerjakan
  allowProceedWithoutApproval:  boolean,  // Boleh lanjut tanpa menunggu approval
  slaHours:                     number,   // Target waktu selesai dalam jam
  autoAssignTechnician:         boolean,  // Auto-assign ke teknisi yang tersedia
}
```

### POS
```typescript
posSettings: {
  paymentMethods:       string[],   // ["CASH","TRANSFER","QRIS","DEBIT_CARD"]
  maxDiscount:          number,     // Batas diskon maksimal (nilai Rp atau %)
  allowNegativeStock:   boolean,    // Izinkan jual meski stok 0
  requireVoidApproval:  boolean,    // Void transaksi perlu PIN manager
  requireCloseCash:     boolean,    // Tutup shift perlu approval manager
}
```

### Inventory & Pembelian
```typescript
purchaseSettings: {
  hppMethod:                  "FIFO" | "AVERAGE",
  defaultWarehouseId:         string,   // Gudang penerimaan default
  requireAdjustmentApproval:  boolean,  // Penyesuaian stok perlu approval
}
inventorySettings: {
  enableStockAlert:   boolean,  // Aktifkan alert stok minimum
}
```

### HR
```typescript
hrSettings: {
  defaultWorkHours:    number,   // Jam kerja per hari (default: 8)
  graceLateMinutes:    number,   // Toleransi keterlambatan (default: 15)
  enableOvertime:      boolean,  // Aktifkan perhitungan lembur
  overtimeRate:        number,   // Multiplier lembur (default: 1.5)
}
```

---

## 8. Penomoran Dokumen (documentConfig)

```typescript
documentConfig: {
  ticketPrefix:        string,   // "SRV" -> "SRV-20240711-001"
  invoicePrefix:       string,   // "INV" -> "INV-20240711-001"
  posInvoicePrefix:    string,   // "POS" -> "POS-20240711-001"
  purchaseOrderPrefix: string,   // "PO"  -> "PO-20240711-001"
  paymentPrefix:       string,   // "PAY" -> "PAY-20240711-001"
  refundPrefix:        string,   // "REF" -> "REF-20240711-001"
  stockOpnamePrefix:   string,   // "STO" -> "STO-20240711-001"
}

// Format: {PREFIX}-{YYYYMMDD}-{sequence 3 digit}
// Sequence reset ke 001 setiap hari baru
// Fungsi: getNextDailySequence(tableName, dateStr)
```

---

## 9. Konfigurasi Cetak (printConfig)

```typescript
printConfig: {
  paperSize:                 "58mm" | "80mm" | "A4",
  printQrCode:               boolean,   // QR code di struk/invoice
  printHeaderLogo:           boolean,   // Logo di header cetakan
  printCustomerNotes:        boolean,   // Catatan pelanggan di struk
  printTermsAndConditions:   boolean,   // Syarat & ketentuan di bawah struk
  showTermsInTracking:       boolean,   // Tampilkan syarat di portal tracking
  printFontSize:             string,    // "10px" | "12px" | "14px"
  printMargin:               number,    // Margin kertas dalam mm
  customHeaderTitle:         string,    // Judul custom menggantikan nama tenant
  customFooterText:          string,    // Teks footer struk
  termsAndConditionsText:    string,    // Isi syarat & ketentuan (markdown)
  labelWidth:                number,    // Lebar label produk (mm, default: 62)
  labelHeight:               number,    // Tinggi label produk (mm, default: 29)
  labelFontSize:             string,
  labelShowQr:               boolean,
  labelShowLogo:             boolean,
  labelCustomText:           string,
  termsSalesText:            string,    // Syarat khusus penjualan
  termsRentalText:           string,    // Syarat khusus sewa/rental
}
```

---

## 10. Pengaturan Email & File Upload

```typescript
emailSettings: {
  smtpHost:                    string,   // "smtp.gmail.com"
  smtpPort:                    number,   // 587 (TLS) atau 465 (SSL)
  smtpUser:                    string,   // Alamat email pengirim
  smtpPass:                    string,   // Password SMTP (terenkripsi)
  defaultFromEmail:            string,   // "noreply@bengkelku.id"
  enablePushNotifications:     boolean,  // Web Push API
  enableRealtimeNotifications: boolean,  // Supabase Realtime events
}

fileUploadSettings: {
  maxUploadSizeMb:      number,   // Max ukuran file per upload (default: 10MB)
  allowedFileTypes:     string,   // "jpg,jpeg,png,pdf,heic,heif"
  folderInvoices:       string,   // Supabase Storage: "invoices/"
  folderServicePhotos:  string,   // Supabase Storage: "service-photos/"
  folderAttendance:     string,   // Supabase Storage: "attendance/"
  folderCustomerDocs:   string,   // Supabase Storage: "customer-docs/"
}
```
