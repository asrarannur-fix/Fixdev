// Consistent status → Badge variant mapping for the whole app.
// Modules should route any status text through this so colors stay uniform.

export type StatusVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "success"
  | "warning"
  | "info";

export const statusVariant = (status: string): StatusVariant => {
  const s = status.toLowerCase();
  if (/(sukses|selesai|lunas|paid|aktif|active|open|proses|dikerjakan|done|completed)/.test(s))
    return "success";
  if (/(batal|cancel|void|fail|gagal|overdue|jatuh|expired|rejected)/.test(s))
    return "danger";
  if (/(pending|menunggu|review|tunggu|draft|sebagian|partial)/.test(s))
    return "warning";
  if (/(info|new|baru|diterima|received)/.test(s)) return "info";
  return "secondary";
};

export const statusLabel = (status: string): string => {
  const map: Record<string, string> = {
    success: "Sukses",
    danger: "Gagal",
    warning: "Menunggu",
    info: "Info",
    secondary: "Netral",
  };
  return map[statusVariant(status)] ?? status;
};
