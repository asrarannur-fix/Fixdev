import { describe, expect, it } from 'vitest';
import { ServiceStatus } from '../../../types';
import {
  NEXT_STEP,
  SERVICE_TERMINAL_STATUSES,
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
});