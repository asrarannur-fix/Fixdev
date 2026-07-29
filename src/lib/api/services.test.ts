import { describe, expect, it, vi } from 'vitest';
import { csvCell, getServiceTicket, SERVICE_ENDPOINT } from './services';

describe('service API helpers', () => {
  it('uses canonical detail endpoint and unwraps ticket', async () => {
    const apiFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'ticket-1' } }), { status: 200 })
    );

    await expect(getServiceTicket(apiFetch, 'ticket-1')).resolves.toEqual({ id: 'ticket-1' });
    expect(apiFetch).toHaveBeenCalledWith(`${SERVICE_ENDPOINT}/ticket-1`);
  });

  it('escapes CSV fields and neutralizes spreadsheet formulas', () => {
    expect(csvCell('a"b')).toBe('"a""b"');
    expect(csvCell('=SUM(A1:A2)')).toBe('"\'=SUM(A1:A2)"');
  });
});
