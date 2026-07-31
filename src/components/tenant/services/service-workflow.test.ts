import { describe, expect, it } from 'vitest';
import { ServiceStatus } from '../../../types';
import {
  NEXT_STEP,
  SERVICE_TERMINAL_STATUSES,
  SERVICE_TRANSITIONS,
  canServiceTransition,
  serviceApprovalTransition,
  WORKFLOW_STEPS,
} from '../../../domain/serviceWorkflow';

describe('Service Workflow — SIAP_DIAMBIL & DIAMBIL status', () => {
  it('SIAP_DIAMBIL and DIAMBIL are valid service statuses', () => {
    expect(Object.values(ServiceStatus)).toContain('SIAP_DIAMBIL');
    expect(Object.values(ServiceStatus)).toContain('DIAMBIL');
  });

  it('maps ESTIMATE_PENDING to approval step', () => {
    const steps = Object.fromEntries(WORKFLOW_STEPS.map((step) => [step.status, step.label]));
    expect(steps[ServiceStatus.ESTIMATE_PENDING]).toBe('Estimasi');
    expect(NEXT_STEP[ServiceStatus.ESTIMATE_PENDING]?.label).toBe('Persetujuan Pelanggan');
  });

  it('NEXT_STEP banner supports SIAP_DIAMBIL status', () => {
    expect(NEXT_STEP[ServiceStatus.SIAP_DIAMBIL]).toBeDefined();
    expect(NEXT_STEP[ServiceStatus.DIAMBIL]).toBeDefined();
    expect(NEXT_STEP[ServiceStatus.SIAP_DIAMBIL]?.label).toBe('Unit Siap Diambil');
    expect(NEXT_STEP[ServiceStatus.DIAMBIL]?.label).toBe('Unit Diambil');
  });

  it.each([
    [ServiceStatus.DRAFT, ServiceStatus.BOOKING],
    [ServiceStatus.MENUGGU_APPROVAL, ServiceStatus.APPROVAL_DITOLAK],
    [ServiceStatus.APPROVAL_DITOLAK, ServiceStatus.MENUGGU_APPROVAL],
    [ServiceStatus.SIAP_DIAMBIL, ServiceStatus.DIAMBIL],
  ])('allows valid transition from %s to %s', (from, to) => {
    expect(canServiceTransition(from, to)).toBe(true);
  });

  it.each([
    [ServiceStatus.DRAFT, ServiceStatus.DIAMBIL],
    [ServiceStatus.QC, ServiceStatus.BOOKING],
    [ServiceStatus.APPROVAL_DITOLAK, ServiceStatus.SEDANG_DIKERJAKAN],
  ])('rejects invalid transition from %s to %s', (from, to) => {
    expect(canServiceTransition(from, to)).toBe(false);
  });

  it('uses one approval transition for staff and portal flows', () => {
    expect(serviceApprovalTransition(true)).toEqual({
      approvalStatus: 'APPROVED',
      status: ServiceStatus.SEDANG_DIKERJAKAN,
    });
    expect(serviceApprovalTransition(false)).toEqual({
      approvalStatus: 'REJECTED',
      status: ServiceStatus.APPROVAL_DITOLAK,
    });
  });

  it('rejects every transition from terminal statuses', () => {
    for (const from of SERVICE_TERMINAL_STATUSES) {
      for (const to of Object.values(ServiceStatus)) {
        expect(canServiceTransition(from, to)).toBe(false);
      }
    }
  });

  it('allows QC only after work or vendor return and only exits to pass or rework', () => {
    expect(canServiceTransition(ServiceStatus.SEDANG_DIKERJAKAN, ServiceStatus.QC)).toBe(true);
    expect(canServiceTransition(ServiceStatus.DIKIRIM_KE_VENDOR, ServiceStatus.QC)).toBe(true);
    expect(SERVICE_TRANSITIONS[ServiceStatus.QC]).toEqual([ServiceStatus.SELESAI, ServiceStatus.REWORK]);
    expect(canServiceTransition(ServiceStatus.QC, ServiceStatus.DIAMBIL)).toBe(false);
  });

  it('keeps transition destinations valid and rejects unknown statuses', () => {
    for (const step of WORKFLOW_STEPS) expect(Object.values(ServiceStatus)).toContain(step.status);
    expect(canServiceTransition('UNKNOWN', ServiceStatus.DITERIMA)).toBe(false);
    expect(canServiceTransition(ServiceStatus.DITERIMA, 'UNKNOWN')).toBe(false);
    expect(canServiceTransition(ServiceStatus.DITERIMA, ServiceStatus.DITERIMA)).toBe(false);
  });

  it('WORKFLOW_STEPS distinguishes completed, ready, and collected units', () => {
    const steps = Object.fromEntries(WORKFLOW_STEPS.map((step) => [step.status, step.label]));

    expect(steps[ServiceStatus.SELESAI]).toBe('Selesai');
    expect(steps[ServiceStatus.SIAP_DIAMBIL]).toBe('Siap Diambil');
    expect(steps[ServiceStatus.DIAMBIL]).toBe('Diambil');
  });

  it('covers all ServiceStatus enum values in SERVICE_TRANSITIONS', () => {
    const allStatuses = Object.values(ServiceStatus);
    const transitionKeys = Object.keys(SERVICE_TRANSITIONS);
    for (const s of allStatuses) {
      expect(transitionKeys).toContain(s);
    }
  });

  it('covers all ServiceStatus enum values in NEXT_STEP', () => {
    for (const s of Object.values(ServiceStatus)) {
      expect(NEXT_STEP[s]).toBeDefined();
      expect(NEXT_STEP[s].label.length).toBeGreaterThan(0);
      expect(NEXT_STEP[s].hint.length).toBeGreaterThan(0);
    }
  });

  it('blocks SELESAI transition without QC step (no direct SEDANG_DIKERJAKAN to SELESAI)', () => {
    expect(canServiceTransition(ServiceStatus.SEDANG_DIKERJAKAN, ServiceStatus.SELESAI)).toBe(false);
    expect(canServiceTransition(ServiceStatus.QC, ServiceStatus.SELESAI)).toBe(true);
  });

  it('MENUGGU_SPAREPART can continue to SEDANG_DIKERJAKAN or vendor but not skip to QC', () => {
    expect(canServiceTransition(ServiceStatus.MENUGGU_SPAREPART, ServiceStatus.SEDANG_DIKERJAKAN)).toBe(true);
    expect(canServiceTransition(ServiceStatus.MENUGGU_SPAREPART, ServiceStatus.QC)).toBe(false);
    expect(canServiceTransition(ServiceStatus.MENUGGU_SPAREPART, ServiceStatus.SELESAI)).toBe(false);
  });

  it('handover chain: SELESAI -> payment -> pickup -> collected', () => {
    expect(canServiceTransition(ServiceStatus.SELESAI, ServiceStatus.MENUGGU_PEMBAYARAN)).toBe(true);
    expect(canServiceTransition(ServiceStatus.SELESAI, ServiceStatus.SIAP_DIAMBIL)).toBe(true);
    expect(canServiceTransition(ServiceStatus.SELESAI, ServiceStatus.DIAMBIL)).toBe(true);
    expect(canServiceTransition(ServiceStatus.MENUGGU_PEMBAYARAN, ServiceStatus.SIAP_DIAMBIL)).toBe(true);
    expect(canServiceTransition(ServiceStatus.SIAP_DIAMBIL, ServiceStatus.DIAMBIL)).toBe(true);
  });

  it('KLAIM_GARANSI re-enters DIAGNOSA but not completed states', () => {
    expect(canServiceTransition(ServiceStatus.KLAIM_GARANSI, ServiceStatus.DIAGNOSA)).toBe(true);
    expect(canServiceTransition(ServiceStatus.KLAIM_GARANSI, ServiceStatus.SELESAI)).toBe(false);
    expect(canServiceTransition(ServiceStatus.KLAIM_GARANSI, ServiceStatus.DIAMBIL)).toBe(false);
  });
});