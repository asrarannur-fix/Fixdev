import { describe, expect, it, vi } from 'vitest';
import { csvCell, exportServiceTickets, getServiceStatusEvents, getServiceTicket, getServiceTickets, patchServiceTicketScope, SERVICE_ENDPOINT, uploadServicePhoto } from './services';

describe('service API helpers', () => {
  it('uses encoded canonical detail endpoint and unwraps ticket', async () => {
    const apiFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'ticket-1' } }), { status: 200 })
    );

    await expect(getServiceTicket(apiFetch, 'ticket/1')).resolves.toEqual({ id: 'ticket-1' });
    expect(apiFetch).toHaveBeenCalledWith(`${SERVICE_ENDPOINT}/ticket%2F1`);
  });

  it('preserves list contract and omits empty query parameters', async () => {
    const apiFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: 'ticket-1' }], total: 1, limit: 25, offset: 50 }), { status: 200 })
    );

    await expect(getServiceTickets(apiFetch, { q: 'laptop', status: '', limit: 25, offset: 50 })).resolves.toEqual({
      data: [{ id: 'ticket-1' }], total: 1, limit: 25, offset: 50,
    });
    expect(apiFetch).toHaveBeenCalledWith(`${SERVICE_ENDPOINT}?q=laptop&limit=25&offset=50`);
  });

  it('exports filtered tickets as a blob', async () => {
    const apiFetch = vi.fn().mockResolvedValue(new Response('csv', { status: 200 }));
    await expect(exportServiceTickets(apiFetch, { q: 'laptop', limit: 50 })).resolves.toBeInstanceOf(Blob);
    expect(apiFetch).toHaveBeenCalledWith(`${SERVICE_ENDPOINT}/export.csv?q=laptop&limit=50`);
  });

  it('uses detail and status-history error contracts', async () => {
    const missing = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Tidak boleh akses.' }), { status: 404 }));
    const failedHistory = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));

    await expect(getServiceTicket(missing, 'ticket-1')).rejects.toThrow('Tidak boleh akses.');
    await expect(getServiceStatusEvents(failedHistory, 'ticket-1')).rejects.toThrow('Gagal memuat riwayat tiket.');
  });

  it('patches scoped checklist endpoint and unwraps ticket', async () => {
    const apiFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: 'ticket-1' } }), { status: 200 }));
    await expect(patchServiceTicketScope(apiFetch, 'ticket-1', 'qc-draft', { notes: 'Passed' })).resolves.toEqual({ id: 'ticket-1' });
    expect(apiFetch).toHaveBeenCalledWith(`${SERVICE_ENDPOINT}/ticket-1/qc-draft`, expect.objectContaining({ method: 'PATCH' }));
  });

  it('requests upload URL then uploads photo bytes', async () => {
    const apiFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ uploadUrl: `${SERVICE_ENDPOINT}/ticket-1/photos/file.jpg` }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 'ticket-1', initialPhotos: ['/photo.jpg'] } }), { status: 200 }));
    const file = new Blob(['jpeg'], { type: 'image/jpeg' });

    await expect(uploadServicePhoto(apiFetch, 'ticket/1', file)).resolves.toMatchObject({ id: 'ticket-1', initialPhotos: ['/photo.jpg'] });
    expect(apiFetch).toHaveBeenNthCalledWith(1, `${SERVICE_ENDPOINT}/ticket%2F1/photos/upload-url`, expect.objectContaining({
      method: 'POST', body: JSON.stringify({ contentType: 'image/jpeg', sizeBytes: file.size }),
    }));
    expect(apiFetch).toHaveBeenNthCalledWith(2, expect.stringContaining('/photos/file.jpg'), expect.objectContaining({
      method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: file,
    }));
  });

  it.each([
    [new Blob(['gif'], { type: 'image/gif' })],
    [new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/jpeg' })],
  ])('rejects unsupported or oversized photos before requests', async (file) => {
    const apiFetch = vi.fn();

    await expect(uploadServicePhoto(apiFetch, 'ticket-1', file)).rejects.toThrow('Foto harus JPG atau PNG maksimal 5 MB.');
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('reports upload preparation and byte-upload failures', async () => {
    const prepareFailure = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Upload ditolak.' }), { status: 422 }));
    const putFailure = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ uploadUrl: '/upload' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Berkas rusak.' }), { status: 422 }));
    const file = new Blob(['jpeg'], { type: 'image/jpeg' });

    await expect(uploadServicePhoto(prepareFailure, 'ticket-1', file)).rejects.toThrow('Upload ditolak.');
    await expect(uploadServicePhoto(putFailure, 'ticket-1', file)).rejects.toThrow('Berkas rusak.');
  });

  it('escapes CSV fields and neutralizes spreadsheet formulas', () => {
    expect(csvCell('a"b')).toBe('"a""b"');
    expect(csvCell('=SUM(A1:A2)')).toBe('"\'=SUM(A1:A2)"');
  });
});
