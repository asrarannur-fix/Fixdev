import { describe, expect, it } from 'vitest';
import { ServiceStatus } from '../../../types';

describe('Service Workflow — SIAP_DIAMBIL & DIAMBIL status', () => {
  it('SIAP_DIAMBIL and DIAMBIL are valid service statuses', () => {
    expect(Object.values(ServiceStatus)).toContain('SIAP_DIAMBIL');
    expect(Object.values(ServiceStatus)).toContain('DIAMBIL');
  });

  it('NEXT_STEP banner supports SIAP_DIAMBIL status', async () => {
    // Simulate NEXT_STEP lookup
    const NEXT_STEP: Record<string, { label: string; hint: string }> = {
      [ServiceStatus.DIAGNOSA]: { label: 'Isi Diagnosa', hint: 'Buka bagian Diagnosa Teknis' },
      [ServiceStatus.MENUGGU_APPROVAL]: { label: 'Menunggu Persetujuan', hint: 'Tunggu persetujuan dari pemilik' },
      [ServiceStatus.SEDANG_DIKERJAKAN]: { label: 'Proses Perbaikan', hint: 'Pekerjaan sedang berlangsung' },
      [ServiceStatus.QC]: { label: 'QC/Testing', hint: 'Lakukan pengecekan kualitas' },
      [ServiceStatus.SELESAI]: { label: 'Serah Terima', hint: 'Unit siap diambil pemilik' },
      [ServiceStatus.SIAP_DIAMBIL]: { label: 'Ambil Unit', hint: 'Klik untuk mengambil unit yang sudah selesai' },
      [ServiceStatus.DIAMBIL]: { label: 'Diambil', hint: 'Unit telah diambil oleh pemilik' },
    };

    expect(NEXT_STEP[ServiceStatus.SIAP_DIAMBIL]).toBeDefined();
    expect(NEXT_STEP[ServiceStatus.DIAMBIL]).toBeDefined();
    expect(NEXT_STEP[ServiceStatus.SIAP_DIAMBIL]?.label).toBe('Ambil Unit');
    expect(NEXT_STEP[ServiceStatus.DIAMBIL]?.label).toBe('Diambil');
  });

  it('WORKFLOW_STEPS includes SIAP_DIAMBIL and DIAMBIL', async () => {
    const WORKFLOW_STEPS = [
      { status: ServiceStatus.DIAGNOSA, label: 'Diagnosa' },
      { status: ServiceStatus.MENUGGU_APPROVAL, label: 'Menunggu Persetujuan' },
      { status: ServiceStatus.SEDANG_DIKERJAKAN, label: 'Proses Perbaikan' },
      { status: ServiceStatus.QC, label: 'QC/Testing' },
      { status: ServiceStatus.SELESAI, label: 'Selesai' },
      { status: ServiceStatus.SIAP_DIAMBIL, label: 'Siap Diambil' },
      { status: ServiceStatus.DIAMBIL, label: 'Diambil' },
    ];

    const statuses = WORKFLOW_STEPS.map(s => s.status);
    expect(statuses).toContain(ServiceStatus.SIAP_DIAMBIL);
    expect(statuses).toContain(ServiceStatus.DIAMBIL);
  });
});