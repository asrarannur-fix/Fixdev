import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const portal = readFileSync(new URL('./CustomerPortal.tsx', import.meta.url), 'utf8');

describe('CustomerPortal safeguards', () => {
  it('guards customer and URL auto-selection', () => {
    expect(portal).toContain('searchedTicket.customerId !== activeCustomer.id');
    expect(portal).toContain('autoSearchKeyRef.current === searchKey');
  });

  it('uses shared status labels and preserves zero warranty', () => {
    expect(portal).toContain('SERVICE_STATUS_META[ticket.status as ServiceStatus]?.label ?? ticket.status');
    expect(portal).not.toContain('warrantyMonths || 3');
    expect(portal).not.toContain("|| '2026-09-30'");
  });
});
