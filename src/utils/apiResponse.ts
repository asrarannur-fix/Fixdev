export class ApiResponseError extends Error {
  status: number;
  code: "AUTH" | "FORBIDDEN" | "NOT_FOUND" | "SERVER" | "NON_JSON" | "NETWORK";

  constructor(message: string, status = 0, code: ApiResponseError["code"] = "SERVER") {
    super(message);
    this.name = "ApiResponseError";
    this.status = status;
    this.code = code;
  }
}

export async function readJsonResponse<T>(response: Response, label = "API"): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new ApiResponseError(
      `${label} mengembalikan respons non-JSON. Pastikan backend terbaru sedang berjalan.`,
      response.status,
      "NON_JSON",
    );
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.error || body?.message || `${label} gagal (HTTP ${response.status}).`;
    const code = response.status === 401
      ? "AUTH"
      : response.status === 403
        ? "FORBIDDEN"
        : response.status === 404
          ? "NOT_FOUND"
          : "SERVER";
    throw new ApiResponseError(message, response.status, code);
  }
  return body as T;
}
