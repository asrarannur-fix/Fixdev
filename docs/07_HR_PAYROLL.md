# 07 — MODUL HR & PAYROLL
**RepairHub ERP** | Dokumentasi Teknis v1.0 | 2024

---

## 1. Gambaran Umum

Modul HR & Payroll mengelola data karyawan, jadwal shift, pencatatan kehadiran (absensi), penggajian otomatis, lembur, tunjangan, dan komisi teknisi dari tiket servis. Terintegrasi dengan **Accounting** (auto-journal beban gaji) dan **Servis** (kalkulasi komisi per tiket diselesaikan). Notifikasi slip gaji dikirim via WhatsApp.

---

## 2. Data Model: Employee

```typescript
interface Employee {
  id: string;
  tenantId: string;
  branchId: string;
  userId?: string;           // Link ke User account untuk login
  employeeNumber: string;    // "EMP-001"
  name: string;
  position: string;          // "Teknisi Senior", "Kasir", "Admin"
  department: string;        // "Servis", "Sales", "Operasional"
  baseSalary: number;        // Gaji pokok per bulan (Rp)
  salaryType: "MONTHLY" | "DAILY" | "HOURLY";
  bankAccount?: string;
  bankName?: string;
  taxId?: string;            // NPWP karyawan
  joinDate: string;
  isActive: boolean;
  photo?: string;            // URL foto profil (Supabase Storage)
  commissionRate?: number;   // Persentase komisi dari nilai servis
  createdAt: string;
}
```

---

## 3. Manajemen Shift

```typescript
interface ShiftSchedule {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;           // "Shift Pagi", "Shift Sore", "Shift Malam"
  startTime: string;      // "08:00"
  endTime: string;        // "17:00"
  workHours: number;      // 9 (jam kerja bruto)
  breakMinutes: number;   // 60 (menit istirahat)
  isActive: boolean;
}
```

### Penjadwalan Shift Bulanan
```
Manager buka "Jadwal Shift":
  1. Pilih periode (minggu / bulan)
  2. Tampilkan kalender grid: kolom = hari, baris = karyawan
  3. Klik cell -> assign shift (Pagi/Sore/Malam/Libur)
  4. Bulk assign: pilih range hari -> apply shift yang sama
  5. Save -> INSERT employee_schedules per hari per karyawan
  6. Karyawan bisa lihat jadwal mereka via portal atau aplikasi
```

---

## 4. Pencatatan Absensi

### Metode Absensi yang Didukung

| Metode | Cara Kerja | Keakuratan |
|--------|------------|------------|
| Manual (Admin) | Manager input kehadiran karyawan | Rendah |
| Self-Service | Karyawan klik hadir dari device | Sedang |
| Foto Selfie + GPS | Upload foto + koordinat lokasi | Tinggi |
| Integrasi Fingerprint | Data dari mesin absensi via API | Sangat Tinggi |

### Tipe Kehadiran

| Kode | Nama | Keterangan | Pengaruh Gaji |
|------|------|------------|---------------|
| HADIR | Hadir | Tepat waktu | 100% |
| TERLAMBAT | Terlambat | Melewati grace period | 100% - potongan |
| IZIN | Izin Disetujui | Dengan permohonan | 100% (kebijakan) |
| SAKIT | Sakit | Dengan surat dokter | 100% (s/d batas hari) |
| CUTI | Cuti Tahunan | Gunakan saldo cuti | 100% |
| ALPHA | Mangkir | Tanpa keterangan | 0% / potongan penuh |
| LEMBUR | Lembur | Di luar jam shift | Bonus lembur |

### Alur Absensi Harian
```
Karyawan datang -> tap/input absensi masuk:
  checkInTime = NOW()
  IF checkInTime > (shift.startTime + graceLateMinutes):
    type         = "TERLAMBAT"
    lateMinutes  = (checkInTime - shift.startTime) in minutes
  ELSE:
    type         = "HADIR"

  INSERT attendance_records {
    employeeId, date, type,
    checkInTime, lateMinutes
  }

Karyawan pulang -> tap absensi keluar:
  checkOutTime     = NOW()
  actualWorkHours  = (checkOutTime - checkInTime) / 3600 - breakHours
  overtimeHours    = 0

  IF checkOutTime > (shift.endTime + 30min) AND hrSettings.enableOvertime:
    overtimeHours  = (checkOutTime - shift.endTime) / 3600
    overtimePay    = hourlyRate * overtimeHours * hrSettings.overtimeRate

  UPDATE attendance_records {
    checkOutTime, actualWorkHours, overtimeHours
  }

Pengaturan (hrSettings):
  defaultWorkHours  = 8    jam kerja standar per hari
  graceLateMinutes  = 15   toleransi keterlambatan (menit)
  enableOvertime    = true aktifkan perhitungan lembur
  overtimeRate      = 1.5  multiplier lembur (150% tarif normal)
```

---

## 5. Kalkulasi Payroll Bulanan

### Komponen Gaji

```typescript
interface PayrollComponents {
  // PENGHASILAN
  basicSalary:        number;  // Gaji pokok proporsional hari hadir
  attendanceBonus:    number;  // Bonus kehadiran penuh sebulan
  overtimePay:        number;  // Bayaran lembur
  transportAllowance: number;  // Tunjangan transportasi
  mealAllowance:      number;  // Tunjangan makan
  positionAllowance:  number;  // Tunjangan jabatan
  commission:         number;  // Komisi dari tiket servis
  totalEarnings:      number;  // SUM semua penghasilan

  // POTONGAN
  deductionAbsence:   number;  // Potongan hari alpha
  deductionLate:      number;  // Potongan keterlambatan
  bpjsKetenagakerjaan: number; // 3.7% ditanggung karyawan
  bpjsKesehatan:      number;  // 1% ditanggung karyawan
  pph21:              number;  // Pajak penghasilan PPh 21
  totalDeductions:    number;  // SUM semua potongan

  netSalary:          number;  // Gaji bersih = totalEarnings - totalDeductions
}
```

### Alur Pemrosesan Payroll

```
Step 1 — Tutup periode absensi (akhir bulan):
  System rekap per karyawan:
    workDays      = jumlah hari kerja dalam bulan
    hadirDays     = COUNT(HADIR + TERLAMBAT + IZIN + SAKIT + CUTI)
    alphaDays     = COUNT(ALPHA)
    lateMinutes   = SUM(lateMinutes) WHERE type = "TERLAMBAT"
    overtimeHours = SUM(overtimeHours)

Step 2 — Kalkulasi komponen:
  dailyRate     = baseSalary / workDays
  hourlyRate    = dailyRate / defaultWorkHours
  
  basicSalary   = baseSalary * (hadirDays / workDays)
  overtimePay   = overtimeHours * hourlyRate * overtimeRate
  commission    = SUM(ticket.finalCost * commissionRate / 100)
                  WHERE technicianId = employee.id
                  AND completedAt IN [bulan ini]
  
  deductAlpha   = alphaDays * dailyRate
  deductLate    = lateMinutes * (hourlyRate / 60)
  bpjsTK        = basicSalary * 0.037
  bpjsKes       = basicSalary * 0.01
  pph21         = calculatePph21(annualProjectedIncome)
  
  netSalary     = basicSalary + overtimePay + commission + allowances
                - deductAlpha - deductLate - bpjsTK - bpjsKes - pph21

Step 3 — Review & Approve oleh Owner/Manager:
  Tampilkan daftar slip gaji semua karyawan
  Owner review setiap slip -> "Approve All" atau approve satu per satu

Step 4 — Distribusi Slip Gaji:
  INSERT payroll_records {employeeId, period, semua komponen, netSalary, status:"APPROVED"}
  Cetak slip gaji (format PDF / termal)
  Kirim via WhatsApp ke nomor karyawan (opsional)

Step 5 — Auto-journal ke Accounting:
  DR  Biaya Gaji (5200)       = SUM(basicSalary + allowances)
  DR  Biaya Komisi (5300)     = SUM(commission)
  DR  Biaya Lembur (5900)     = SUM(overtimePay)
    CR  Hutang Gaji (2200)    = SUM(netSalary)
    CR  Hutang BPJS           = SUM(bpjsTK + bpjsKes employer portion)
    CR  Hutang PPh21          = SUM(pph21)

Step 6 — Pembayaran gaji:
  Manager konfirmasi pembayaran -> UPDATE payroll_records {status:"PAID", paidAt: NOW()}
  DR  Hutang Gaji (2200)      = totalNetSalary
    CR  Kas / Bank (1000/1010)= totalNetSalary
```

---

## 6. Sistem Komisi Teknisi

Komisi terintegrasi langsung dengan modul Servis dan Payroll:

```typescript
// Saat tiket status -> "SELESAI", sistem hitung komisi otomatis:
const calculateTechnicianCommission = async (ticket: ServiceTicket): Promise<void> => {
  if (!ticket.technicianId) return;
  const technician = employees.find(e => e.userId === ticket.technicianId);
  if (!technician?.commissionRate || technician.commissionRate <= 0) return;

  const commissionAmount = ticket.finalCost * (technician.commissionRate / 100);

  await supabase.from("commission_records").insert({
    tenant_id:        ticket.tenantId,
    employee_id:      technician.id,
    ticket_id:        ticket.id,
    service_amount:   ticket.finalCost,
    commission_rate:  technician.commissionRate,
    commission_amount: commissionAmount,
    period_month:     format(new Date(), "yyyy-MM"),
    status:           "PENDING"   // Menjadi "PAID" saat payroll diproses
  });
};
```

**Dashboard Komisi Teknisi:**
```
Panel Komisi Bulan Ini:
  Tiket Selesai    : 15 tiket
  Total Nilai Jasa : Rp 6.750.000
  Rate Komisi      : 5%
  Komisi Pending   : Rp 337.500
  Komisi Terbayar  : Rp 290.000 (bulan lalu)
  
Daftar per tiket:
  [Tiket No] | [Pelanggan] | [Perangkat] | [Nilai] | [Komisi] | [Status]
```

---

## 7. Manajemen Cuti

```
Pengajuan Cuti oleh Karyawan:
  Input: jenis cuti, tanggal mulai, tanggal selesai, alasan
  -> INSERT leave_requests {employeeId, type, startDate, endDate, reason, status:"PENDING"}
  -> Notif WA ke manager: "Pengajuan cuti dari [nama]: [tgl] s/d [tgl]"

Approval Manager:
  SETUJU:
    UPDATE leave_requests {status:"APPROVED", approvedBy, approvedAt}
    UPDATE leave_balances SET remaining -= requestedDays
    WA ke karyawan: "Cuti Anda disetujui untuk [tgl] s/d [tgl]"
  TOLAK:
    UPDATE leave_requests {status:"REJECTED", rejectNote}
    WA ke karyawan: "Maaf, cuti ditolak: [alasan]"

Jenis Cuti & Kuota Default:
  Cuti Tahunan     : 12 hari/tahun (sesuai UU Ketenagakerjaan)
  Cuti Sakit       : Tidak terbatas (dengan surat dokter)
  Cuti Melahirkan  : 3 bulan (untuk karyawan wanita)
  Cuti Darurat     : 3 hari/kejadian
  Cuti Bersama     : Sesuai kalender nasional
```

---

## 8. Laporan HR

| Laporan | Isi Utama | Periode |
|---------|-----------|---------|
| Rekap Absensi Bulanan | Hadir/Absent/Terlambat per karyawan | Bulanan |
| Slip Gaji | Rincian lengkap gaji per karyawan | Bulanan |
| Rekap Payroll | Total pengeluaran gaji per branch/dept | Bulanan |
| Komisi Teknisi | Ranking + detail per tiket servis | Bulanan |
| Saldo Cuti | Kuota tersisa + histori penggunaan per karyawan | Real-time |
| Overtime Report | Total lembur + biaya per karyawan | Mingguan/Bulanan |
| Karyawan Aktif/Nonaktif | Roster lengkap dengan posisi & gaji | Real-time |

---

## 9. Database Schema

```sql
CREATE TABLE employees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  branch_id       UUID NOT NULL,
  employee_number VARCHAR(50) UNIQUE,
  name            VARCHAR(200) NOT NULL,
  position        VARCHAR(100),
  department      VARCHAR(100),
  base_salary     NUMERIC(15,2) DEFAULT 0,
  salary_type     VARCHAR(20)   DEFAULT 'MONTHLY',
  commission_rate NUMERIC(5,2)  DEFAULT 0,
  is_active       BOOLEAN       DEFAULT TRUE,
  join_date       DATE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE attendance_records (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    UUID REFERENCES employees(id),
  tenant_id      UUID NOT NULL,
  date           DATE NOT NULL,
  type           VARCHAR(30),         -- HADIR | TERLAMBAT | ALPHA | IZIN | dll
  check_in_time  TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  late_minutes   INT DEFAULT 0,
  overtime_hours NUMERIC(4,2) DEFAULT 0,
  note           TEXT,
  UNIQUE(employee_id, date)
);

CREATE TABLE payroll_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      UUID REFERENCES employees(id),
  tenant_id        UUID NOT NULL,
  period_month     VARCHAR(7),          -- "2024-07"
  basic_salary     NUMERIC(15,2),
  overtime_pay     NUMERIC(15,2),
  commission       NUMERIC(15,2),
  allowances       NUMERIC(15,2),
  total_deductions NUMERIC(15,2),
  net_salary       NUMERIC(15,2),
  status           VARCHAR(20) DEFAULT 'DRAFT',  -- DRAFT | APPROVED | PAID
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE commission_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       UUID REFERENCES employees(id),
  ticket_id         UUID,
  tenant_id         UUID NOT NULL,
  period_month      VARCHAR(7),
  service_amount    NUMERIC(15,2),
  commission_rate   NUMERIC(5,2),
  commission_amount NUMERIC(15,2),
  status            VARCHAR(20) DEFAULT 'PENDING'  -- PENDING | PAID
);
```
