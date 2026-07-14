const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

export function toApiResponse<T = unknown>(value: T): any {
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return value.toString("base64");
  if (Array.isArray(value)) return value.map((item) => toApiResponse(item));
  if (!isPlainObject(value)) return value;

  return Object.entries(value).reduce<Record<string, unknown>>((result, [key, nested]) => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    result[camelKey] = toApiResponse(nested);
    return result;
  }, {});
}
