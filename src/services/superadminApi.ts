import type {
  ImpersonationSession,
  SuperAdminOverview,
  SuperAdminTenantSummary,
} from "../types";
import { readJsonResponse } from "../utils/apiResponse";

export type SuperAdminFetch = (endpoint: string, options?: RequestInit) => Promise<Response>;

export async function fetchSuperAdminOverview(apiFetch: SuperAdminFetch, readOnly: boolean) {
  const response = await apiFetch("/api/superadmin/overview", {
    headers: { "X-SuperAdmin-Mode": readOnly ? "read-only" : "edit" },
  });
  return readJsonResponse<SuperAdminOverview>(response, "Ringkasan Super Admin");
}

export async function fetchSuperAdminTenants(
  apiFetch: SuperAdminFetch,
  params: URLSearchParams,
  readOnly: boolean,
) {
  const response = await apiFetch(`/api/superadmin/tenants?${params.toString()}`, {
    headers: { "X-SuperAdmin-Mode": readOnly ? "read-only" : "edit" },
  });
  return readJsonResponse<{ items: SuperAdminTenantSummary[]; total: number; page: number; pageSize: number }>(response, "Daftar tenant");
}

export async function updateSuperAdminTenantStatus(
  apiFetch: SuperAdminFetch,
  tenantId: string,
  payload: Record<string, unknown>,
  readOnly: boolean,
) {
  const response = await apiFetch(`/api/superadmin/tenants/${tenantId}/status`, {
    method: "POST",
    headers: { "X-SuperAdmin-Mode": readOnly ? "read-only" : "edit" },
    body: JSON.stringify(payload),
  });
  return readJsonResponse<{ success: true; tenant: SuperAdminTenantSummary }>(response, "Perubahan status tenant");
}

export async function startSuperAdminImpersonation(
  apiFetch: SuperAdminFetch,
  tenantId: string,
  payload: Record<string, unknown>,
  readOnly: boolean,
) {
  const response = await apiFetch(`/api/superadmin/tenants/${tenantId}/impersonation`, {
    method: "POST",
    headers: { "X-SuperAdmin-Mode": readOnly ? "read-only" : "edit" },
    body: JSON.stringify(payload),
  });
  return readJsonResponse<{ success: true; session: ImpersonationSession }>(response, "Sesi impersonasi");
}
