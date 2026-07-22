export function getTenantPublicUrl(publicBaseUrl: string, path = "/", params?: Record<string, string>): string {
  const url = new URL(path, publicBaseUrl);
  Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}
