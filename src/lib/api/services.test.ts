import { describe, expect, it, vi } from 'vitest';
import { csvCell, getServiceTicket, patchServiceTicketScope, SERVICE_ENDPOINT, uploadServicePhoto } from './services';

describe('service API helpers', () => {
  it('uses canonical detail endpoint and unwraps ticket', async () => {
    const apiFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'ticket-1' } }), { status: 200 })
    );

    await expect(getServiceTicket(apiFetch, 'ticket-1')).resolves.toEqual({ id: 'ticket-1' });
    expect(apiFetch).toHaveBeenCalledWith(`${SERVICE_ENDPOINT}/ticket-1`);
  });

  it('patches scoped checklist endpoint and unwraps ticket', async () => {
    const apiFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: 'ticket-1' } }), { status: 200 }));
    await expect(patchServiceTicketScope(apiFetch, 'ticket-1', 'qc-draft', { score: 80 })).resolves.toEqual({ id: 'ticket-1' });
    expect(apiFetch).toHaveBeenCalledWith(`${SERVICE_ENDPOINT}/ticket-1/qc-draft`, expect.objectContaining({ method: 'PATCH' }));
  });

  it('requests upload URL then uploads photo bytes', async () => {
    const apiFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ uploadUrl: `${SERVICE_ENDPOINT}/ticket-1/photos/file.jpg` }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(uploadServicePhoto(apiFetch, 'ticket-1', new Blob(['jpeg'], { type: 'image/jpeg' }))).resolves.toContain('/photos/file.jpg');
    expect(apiFetch).toHaveBeenNthCalledWith(2, expect.stringContaining('/photos/file.jpg'), expect.objectContaining({ method: 'PUT' }));
  });

  it('escapes CSV fields and neutralizes spreadsheet formulas', () => {
    expect(csvCell('a"b')).toBe('"a""b"');
    expect(csvCell('=SUM(A1:A2)')).toBe('"\'=SUM(A1:A2)"');
  });
});
