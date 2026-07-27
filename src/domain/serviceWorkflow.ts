import { ServiceStatus } from '../types';

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
    ServiceStatus.MENUGGU_APPROVAL,
    ServiceStatus.TIDAK_BISA_DIPERBAIKI,
    ServiceStatus.DIBATALKAN,
  ],
  [ServiceStatus.ESTIMATE_PENDING]: [
    ServiceStatus.SEDANG_DIKERJAKAN,
    ServiceStatus.APPROVAL_DITOLAK,
  ],
  [ServiceStatus.MENUGGU_APPROVAL]: [
    ServiceStatus.SEDANG_DIKERJAKAN,
    ServiceStatus.APPROVAL_DITOLAK,
    ServiceStatus.DIBATALKAN,
    ServiceStatus.CUSTOMER_TIDAK_MERESPON,
  ],
  [ServiceStatus.APPROVAL_DITOLAK]: [ServiceStatus.DIAGNOSA, ServiceStatus.DIBATALKAN],
  [ServiceStatus.MENUGGU_SPAREPART]: [
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
  { label: string; tone: string; terminal: boolean }
> = {
  [ServiceStatus.DRAFT]: { label: 'Draft', tone: 'slate', terminal: false },
  [ServiceStatus.BOOKING]: { label: 'Booking', tone: 'sky', terminal: false },
  [ServiceStatus.DITERIMA]: { label: 'Diterima', tone: 'blue', terminal: false },
  [ServiceStatus.ANTRIAN]: { label: 'Antrian', tone: 'slate', terminal: false },
  [ServiceStatus.DIAGNOSA]: { label: 'Diagnosa', tone: 'amber', terminal: false },
  [ServiceStatus.ESTIMATE_PENDING]: { label: 'Estimasi Legacy', tone: 'amber', terminal: false },
  [ServiceStatus.MENUGGU_APPROVAL]: {
    label: 'Menunggu Persetujuan',
    tone: 'amber',
    terminal: false,
  },
  [ServiceStatus.APPROVAL_DITOLAK]: { label: 'Persetujuan Ditolak', tone: 'rose', terminal: false },
  [ServiceStatus.MENUGGU_SPAREPART]: {
    label: 'Menunggu Spare Part',
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
  [ServiceStatus.DIBATALKAN]: { label: 'Dibatalkan', tone: 'rose', terminal: true },
  [ServiceStatus.KLAIM_GARANSI]: { label: 'Klaim Garansi', tone: 'violet', terminal: false },
  [ServiceStatus.TIDAK_BISA_DIPERBAIKI]: {
    label: 'Tidak Bisa Diperbaiki',
    tone: 'rose',
    terminal: true,
  },
  [ServiceStatus.CUSTOMER_TIDAK_MERESPON]: {
    label: 'Pelanggan Tidak Merespon',
    tone: 'orange',
    terminal: true,
  },
  [ServiceStatus.BARANG_TIDAK_DIAMBIL]: {
    label: 'Barang Tidak Diambil',
    tone: 'orange',
    terminal: true,
  },
  [ServiceStatus.RUSAK]: { label: 'Rusak', tone: 'rose', terminal: true },
};

export const SERVICE_TERMINAL_STATUSES = new Set(
  Object.entries(SERVICE_STATUS_META)
    .filter(([, meta]) => meta.terminal)
    .map(([status]) => status as ServiceStatus)
);

export const canServiceTransition = (from: string, to: string) =>
  SERVICE_TRANSITIONS[from as ServiceStatus]?.includes(to as ServiceStatus) ?? false;
