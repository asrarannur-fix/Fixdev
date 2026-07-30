import { ServiceTicket } from '../../types';

export const SERVICE_ENDPOINT = '/api/services';

export const csvCell = (value: unknown) => {
  const text = String(value ?? '');
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};

export interface ServiceTicketList {
  data: ServiceTicket[];
  total: number;
  limit: number;
  offset: number;
  kpi?: { total: number; active: number; overdue: number; estimated: number };
}

export async function getServiceTickets(
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  params: Record<string, string | number | undefined> = {}
): Promise<ServiceTicketList> {
  const query = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => [key, String(value)])
  );
  const response = await apiFetch(`${SERVICE_ENDPOINT}${query.size ? `?${query}` : ''}`);
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'Gagal memuat daftar tiket.');
  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
    total: Number(payload?.total) || 0,
    limit: Number(payload?.limit) || 50,
    offset: Number(payload?.offset) || 0,
    kpi: payload?.kpi,
  };
}

export async function exportServiceTickets(
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  params: Record<string, string | number | undefined> = {}
): Promise<Blob> {
  const query = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => [key, String(value)])
  );
  const response = await apiFetch(`${SERVICE_ENDPOINT}/export.csv${query.size ? `?${query}` : ''}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || 'Gagal mengekspor daftar tiket.');
  }
  return response.blob();
}

export async function bulkDeleteServiceTickets(
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  ids: string[]
): Promise<string[]> {
  const response = await apiFetch(`${SERVICE_ENDPOINT}/bulk`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'Gagal menghapus tiket.');
  return Array.isArray(payload?.data?.deletedIds) ? payload.data.deletedIds : [];
}

export async function getServiceTicket(
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  id: string
): Promise<ServiceTicket> {
  const response = await apiFetch(`${SERVICE_ENDPOINT}/${encodeURIComponent(id)}`);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      payload?.error ||
        (response.status === 404
          ? 'Tiket tidak ditemukan atau tidak dapat diakses.'
          : 'Gagal memuat tiket.')
    );
  }
  return (payload?.data || payload) as ServiceTicket;
}

export async function uploadServicePhoto(
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  id: string,
  file: Blob,
  conditionId?: string
): Promise<ServiceTicket> {
  if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    throw new Error('Foto harus JPG atau PNG maksimal 5 MB.');
  }
  const create = await apiFetch(`${SERVICE_ENDPOINT}/${encodeURIComponent(id)}/photos/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType: file.type, sizeBytes: file.size, conditionId }),
  });
  const upload = await create.json().catch(() => null);
  if (!create.ok || !upload?.uploadUrl) throw new Error(upload?.error || 'Gagal menyiapkan unggahan foto.');
  const put = await apiFetch(upload.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  const payload = await put.json().catch(() => null);
  if (!put.ok) throw new Error(payload?.error || 'Gagal mengunggah foto.');
  if (!payload?.data) throw new Error('Respons unggahan foto tidak valid.');
  return payload.data as ServiceTicket;
}

export async function patchServiceTicketScope<T extends Record<string, unknown>>(
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  id: string,
  scope: 'intake-checklist' | 'qc-draft',
  body: T
): Promise<ServiceTicket> {
  const response = await apiFetch(`${SERVICE_ENDPOINT}/${encodeURIComponent(id)}/${scope}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'Gagal menyimpan tiket.');
  return (payload?.data || payload) as ServiceTicket;
}

export async function getServiceStatusEvents(
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  id: string
) {
  const response = await apiFetch(`${SERVICE_ENDPOINT}/${encodeURIComponent(id)}/status-events`);
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'Gagal memuat riwayat tiket.');
  return Array.isArray(payload?.data) ? payload.data : [];
}
