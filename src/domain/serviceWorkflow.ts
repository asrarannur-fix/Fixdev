import { ServiceStatus } from '../types';

export { ServiceStatus };
export type SERVICE_STATUS = ServiceStatus;

export const SERVICE_TRANSITIONS: Record<ServiceStatus, ServiceStatus[]> = {
  [ServiceStatus.DRAFT]: [ServiceStatus.BOOKING, ServiceStatus.DITERIMA, ServiceStatus.DIBATALKAN],
  [ServiceStatus.BOOKING]: [ServiceStatus.DITERIMA, ServiceStatus.DIBATALKAN],
  [ServiceStatus.DITERIMA]: [
    ServiceStatus.ANTRIAN,
    ServiceStatus.DIAGNOSA,
    ServiceStatus.DIBATALKAN,
  ],
  [ServiceStatus.ANTRIAN]: [ServiceStatus.DIAGNOSA, ServiceStatus.DIBATALKAN],
  [ServiceStatus.DIAGNOSA]: [
    ServiceStatus.ESTIMATE_PENDING,
    ServiceStatus.MENUGGU_APPROVAL,
    ServiceStatus.TIDAK_BISA_DIPERBAIKI,
    ServiceStatus.DIBATALKAN,
  ],
  [ServiceStatus.ESTIMATE_PENDING]: [
    ServiceStatus.SEDANG_DIKERJAKAN,
    ServiceStatus.APPROVAL_DITOLAK,
    ServiceStatus.DIBATALKAN,
  ],
  [ServiceStatus.MENUGGU_APPROVAL]: [
    ServiceStatus.SEDANG_DIKERJAKAN,
    ServiceStatus.APPROVAL_DITOLAK,
    ServiceStatus.DIBATALKAN,
    ServiceStatus.CUSTOMER_TIDAK_MERESPON,
  ],
  [ServiceStatus.APPROVAL_DITOLAK]: [
    ServiceStatus.DIAGNOSA,
    ServiceStatus.MENUGGU_APPROVAL,
    ServiceStatus.DIBATALKAN,
  ],
  [ServiceStatus.MENUGGU_SPAREPART]: [
    ServiceStatus.SEDANG_DIKERJAKAN,
    ServiceStatus.DIKIRIM_KE_VENDOR,
    ServiceStatus.DIBATALKAN,
  ],
  [ServiceStatus.MENUGGU_PART_ORDER]: [
    ServiceStatus.SEDANG_DIKERJAKAN,
    ServiceStatus.DIKIRIM_KE_VENDOR,
    ServiceStatus.DIBATALKAN,
  ],
  [ServiceStatus.SEDANG_DIKERJAKAN]: [
    ServiceStatus.QC,
    ServiceStatus.MENUGGU_SPAREPART,
    ServiceStatus.DIKIRIM_KE_VENDOR,
    ServiceStatus.TIDAK_BISA_DIPERBAIKI,
    ServiceStatus.RUSAK,
  ],
  [ServiceStatus.DIKIRIM_KE_VENDOR]: [
    ServiceStatus.SEDANG_DIKERJAKAN,
    ServiceStatus.QC,
    ServiceStatus.TIDAK_BISA_DIPERBAIKI,
  ],
  [ServiceStatus.REWORK]: [
    ServiceStatus.SEDANG_DIKERJAKAN,
    ServiceStatus.MENUGGU_SPAREPART,
    ServiceStatus.DIKIRIM_KE_VENDOR,
  ],
  [ServiceStatus.QC]: [ServiceStatus.SELESAI, ServiceStatus.REWORK],
  [ServiceStatus.SELESAI]: [
    ServiceStatus.MENUGGU_PEMBAYARAN,
    ServiceStatus.SIAP_DIAMBIL,
    ServiceStatus.DIAMBIL,
    ServiceStatus.KLAIM_GARANSI,
  ],
  [ServiceStatus.MENUGGU_PEMBAYARAN]: [ServiceStatus.SIAP_DIAMBIL],
  [ServiceStatus.SIAP_DIAMBIL]: [ServiceStatus.DIAMBIL, ServiceStatus.BARANG_TIDAK_DIAMBIL],
  [ServiceStatus.DIAMBIL]: [],
  [ServiceStatus.DIBATALKAN]: [],
  [ServiceStatus.KLAIM_GARANSI]: [ServiceStatus.DIAGNOSA, ServiceStatus.DIBATALKAN],
  [ServiceStatus.TIDAK_BISA_DIPERBAIKI]: [],
  [ServiceStatus.CUSTOMER_TIDAK_MERESPON]: [],
  [ServiceStatus.BARANG_TIDAK_DIAMBIL]: [],
  [ServiceStatus.RUSAK]: [],
};

export const SERVICE_STATUS_META: Record<
  ServiceStatus,
  { label: string; tone: string; terminal: boolean; hint?: string }
> = {
  [ServiceStatus.DRAFT]: { label: 'Draft', tone: 'slate', terminal: false },
  [ServiceStatus.BOOKING]: { label: 'Booking', tone: 'sky', terminal: false },
  [ServiceStatus.DITERIMA]: { label: 'Diterima', tone: 'blue', terminal: false },
  [ServiceStatus.ANTRIAN]: { label: 'Antrian', tone: 'slate', terminal: false },
  [ServiceStatus.DIAGNOSA]: { label: 'Diagnosa', tone: 'amber', terminal: false },
  [ServiceStatus.ESTIMATE_PENDING]: { label: 'Estimasi', tone: 'amber', terminal: false },
  [ServiceStatus.MENUGGU_APPROVAL]: {
    label: 'Menunggu Persetujuan',
    tone: 'amber',
    terminal: false,
  },
  [ServiceStatus.APPROVAL_DITOLAK]: { label: 'Persetujuan Ditolak', tone: 'rose', terminal: false },
  [ServiceStatus.MENUGGU_SPAREPART]: {
    label: 'Menunggu Sparepart',
    tone: 'violet',
    terminal: false,
  },
  [ServiceStatus.MENUGGU_PART_ORDER]: {
    label: 'Part Order',
    tone: 'violet',
    terminal: false,
  },
  [ServiceStatus.SEDANG_DIKERJAKAN]: { label: 'Dikerjakan', tone: 'indigo', terminal: false },
  [ServiceStatus.DIKIRIM_KE_VENDOR]: { label: 'Di Vendor', tone: 'pink', terminal: false },
  [ServiceStatus.REWORK]: { label: 'Rework', tone: 'orange', terminal: false },
  [ServiceStatus.QC]: { label: 'Quality Control', tone: 'teal', terminal: false },
  [ServiceStatus.SELESAI]: { label: 'Selesai Teknis', tone: 'emerald', terminal: false },
  [ServiceStatus.MENUGGU_PEMBAYARAN]: {
    label: 'Menunggu Pembayaran',
    tone: 'amber',
    terminal: false,
  },
  [ServiceStatus.SIAP_DIAMBIL]: { label: 'Siap Diambil', tone: 'emerald', terminal: false },
  [ServiceStatus.DIAMBIL]: { label: 'Diambil', tone: 'teal', terminal: true },
  [ServiceStatus.DIBATALKAN]: { label: 'Dibatalkan', tone: 'rose', terminal: true, hint: 'Tiket dibatalkan oleh pelanggan atau admin.' },
  [ServiceStatus.KLAIM_GARANSI]: { label: 'Klaim Garansi', tone: 'violet', terminal: false, hint: 'Unit masih dalam masa garansi. Ikuti prosedur klaim.' },
  [ServiceStatus.TIDAK_BISA_DIPERBAIKI]: { label: 'Tidak Bisa Diperbaiki', tone: 'rose', terminal: true, hint: 'Unit tidak dapat diperbaiki. Pilih opsi lain.' },
  [ServiceStatus.CUSTOMER_TIDAK_MERESPON]: { label: 'Pelanggan Tidak Merespon', tone: 'orange', terminal: true, hint: 'Belum ada respon dari pelanggan. Kirim follow-up.' },
  [ServiceStatus.BARANG_TIDAK_DIAMBIL]: { label: 'Barang Tidak Diambil', tone: 'orange', terminal: true, hint: 'Unit tidak diambil dalam 7 hari. Hubungi customer.' },
  [ServiceStatus.RUSAK]: { label: 'Rusak', tone: 'rose', terminal: true, hint: 'Unit tidak dapat diperbaiki. Proses Claim Garansi.' },
};

export const SERVICE_TERMINAL_STATUSES = new Set(
  Object.entries(SERVICE_STATUS_META)
    .filter(([, meta]) => meta.terminal)
    .map(([status]) => status as ServiceStatus)
);

export const canServiceTransition = (from: string, to: string) =>
  SERVICE_TRANSITIONS[from as ServiceStatus]?.includes(to as ServiceStatus) ?? false;

export const serviceApprovalTransition = (approved: boolean) => ({
  approvalStatus: approved ? 'APPROVED' : 'REJECTED',
  status: approved ? ServiceStatus.SEDANG_DIKERJAKAN : ServiceStatus.APPROVAL_DITOLAK,
});


// Workflow steps for ServiceTicketActions component
export const WORKFLOW_STEPS = [
  { status: ServiceStatus.DIAGNOSA, label: 'Diagnosa' },
  { status: ServiceStatus.ESTIMATE_PENDING, label: 'Estimasi' },
  { status: ServiceStatus.MENUGGU_APPROVAL, label: 'Menunggu Persetujuan' },
  { status: ServiceStatus.SEDANG_DIKERJAKAN, label: 'Proses Perbaikan' },
  { status: ServiceStatus.QC, label: 'QC/Testing' },
  { status: ServiceStatus.SELESAI, label: 'Selesai' },
  { status: ServiceStatus.SIAP_DIAMBIL, label: 'Siap Diambil' },
  { status: ServiceStatus.DIAMBIL, label: 'Diambil' },
];

// Next step guidance banner for ServiceDetailModal
export const NEXT_STEP: Record<
  ServiceStatus,
  { label: string; hint: string }
> = {
  [ServiceStatus.DITERIMA]: {
    label: 'Isi Diagnosa & Estimasi',
    hint: 'Buka bagian "Diagnosa Teknis", tulis hasil & estimasi biaya, lalu simpan.',
  },
  [ServiceStatus.ANTRIAN]: {
    label: 'Isi Diagnosa & Estimasi',
    hint: 'Buka bagian "Diagnosa Teknis", tulis hasil & estimasi biaya, lalu simpan.',
  },
  [ServiceStatus.DIAGNOSA]: {
    label: 'Kirim Estimasi ke Pelanggan',
    hint: 'Gunakan "Kirim Estimasi via WhatsApp" agar pelanggan bisa menyetujui.',
  },
  [ServiceStatus.ESTIMATE_PENDING]: {
    label: 'Persetujuan Pelanggan',
    hint: 'Tunggu pelanggan menyetujui estimasi (link WhatsApp) lalu klik "Setujui Digital".',
  },
  [ServiceStatus.MENUGGU_APPROVAL]: {
    label: 'Persetujuan Pelanggan',
    hint: 'Tunggu pelanggan menyetujui estimasi (link WhatsApp) lalu klik "Setujui Digital".',
  },
  [ServiceStatus.SEDANG_DIKERJAKAN]: {
    label: 'Proses Perbaikan',
    hint: 'Gunakan "Pusat Kendali Teknisi" untuk spare part / biaya tambahan.',
  },
  [ServiceStatus.REWORK]: {
    label: 'Proses Perbaikan (Rework)',
    hint: 'Lanjutkan perbaikan pada unit yang dikembalikan.',
  },
  [ServiceStatus.MENUGGU_SPAREPART]: {
    label: 'Terima Sparepart',
    hint: 'Setelah spare part tiba, lanjutkan ke proses perbaikan.',
  },
  [ServiceStatus.MENUGGU_PART_ORDER]: {
    label: 'Part Order',
    hint: 'Buat part order untuk membeli sparepart yang diperlukan.',
  },
  [ServiceStatus.QC]: {
    label: 'Lakukan QC / Testing',
    hint: 'Klik "Selesaikan QC" dan isi checklist pengujian.',
  },
  [ServiceStatus.SELESAI]: {
    label: 'Serah Terima (Handover)',
    hint: 'Klik "Serah Terima Unit" untuk menyelesaikan servis.',
  },
  [ServiceStatus.SIAP_DIAMBIL]: {
    label: 'Unit Siap Diambil',
    hint: 'Customer dapat mengambil unit setelah pembayaran selesai.',
  },
  [ServiceStatus.DIAMBIL]: {
    label: 'Unit Diambil',
    hint: 'Unit berhasil diambil oleh customer. Servis selesai.',
  },
  [ServiceStatus.DRAFT]: {
    label: 'Buat Tiket',
    hint: 'Tiket masih dalam draft. Klik "Masuk Antrian" untuk memulai.',
  },
  [ServiceStatus.BOOKING]: {
    label: 'Booking Diproses',
    hint: 'Tiket sedang dipesan. Tunggu konfirmasi dari admin.',
  },
  [ServiceStatus.APPROVAL_DITOLAK]: {
    label: 'Estimasi Ditolak',
    hint: 'Pelanggan menolak estimasi. Hubungi untuk diskusi ulang.',
  },
  [ServiceStatus.DIKIRIM_KE_VENDOR]: {
    label: 'Kirim ke Vendor',
    hint: 'Unit sedang dikirim ke vendor pihak untuk perbaikan.',
  },
  [ServiceStatus.MENUGGU_PEMBAYARAN]: {
    label: 'Tunggu Pembayaran',
    hint: 'Lunasi biaya perbaikan untuk melanjutkan proses.',
  },
  [ServiceStatus.KLAIM_GARANSI]: {
    label: 'Proses Klaim Garansi',
    hint: 'Unit masih dalam masa garansi. Ikuti prosedur klaim.',
  },
  [ServiceStatus.TIDAK_BISA_DIPERBAIKI]: {
    label: 'Tidak Bisa Diperbaiki',
    hint: 'Unit tidak dapat diperbaiki. Pilih opsi lain.',
  },
  [ServiceStatus.CUSTOMER_TIDAK_MERESPON]: {
    label: 'Tunggu Respon Customer',
    hint: 'Belum ada respon dari pelanggan. Kirim follow-up.',
  },
  [ServiceStatus.BARANG_TIDAK_DIAMBIL]: {
    label: 'Barang Tidak Diambil',
    hint: 'Unit tidak diambil dalam 7 hari. Hubungi customer.',
  },
  [ServiceStatus.DIBATALKAN]: {
    label: 'Dibatalkan',
    hint: 'Tiket dibatalkan oleh pelanggan atau admin.',
  },
  [ServiceStatus.RUSAK]: {
    label: 'Unit Rusak Parah',
    hint: 'Unit tidak dapat diperbaiki. Proses Claim Garansi.',
  },
};