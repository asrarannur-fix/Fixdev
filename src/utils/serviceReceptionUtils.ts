export interface ServiceReceptionValidationInput {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  deviceName?: string;
  complaint?: string;
  isOutsourced?: boolean;
  outsourcedVendor?: string;
  outsourcingCost?: string;
}

export interface ServiceReceptionPreview {
  title: string;
  subtitle: string;
  lines: string[];
}

export function normalizeIndonesianPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

// Keep a stable alias for WhatsApp-specific usages (de-duplicate inline replacers).
export const sanitizeWhatsAppPhone = normalizeIndonesianPhone;

export function isValidIndonesianPhone(value: string): boolean {
  return /^628\d{7,12}$/.test(normalizeIndonesianPhone(value));
}

export function validateServiceReceptionForm(input: ServiceReceptionValidationInput): string[] {
  const errors: string[] = [];

  if (!input.customerId) {
    if (!input.customerName?.trim()) {
      errors.push("Nama pelanggan baru wajib diisi.");
    }
    if (!input.customerPhone?.trim()) {
      errors.push("Nomor WhatsApp pelanggan baru wajib diisi.");
    } else if (!isValidIndonesianPhone(input.customerPhone)) {
      errors.push("Nomor WhatsApp tidak valid. Gunakan nomor Indonesia aktif, misalnya 081234567890.");
    }
  }

  if (!input.deviceName?.trim()) {
    errors.push("Nama perangkat wajib diisi.");
  }

  if (!input.complaint?.trim()) {
    errors.push("Keluhan kerusakan wajib diisi.");
  }

  if (input.isOutsourced) {
    if (!input.outsourcedVendor?.trim()) {
      errors.push("Isi nama vendor rekanan jika unit dikirim ke pihak luar.");
    }
    if (!input.outsourcingCost || Number(input.outsourcingCost) <= 0) {
      errors.push("Isi estimasi biaya vendor jika unit dikirim ke pihak luar.");
    }
  }

  return errors;
}

export function buildServiceReceptionPreview(ticket: any, customerName: string, customerPhone: string): ServiceReceptionPreview {
  const dateLabel = ticket.estimatedCompletionDate
    ? new Date(ticket.estimatedCompletionDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : "3 Hari";

  const lines = [
    `Pelanggan: ${customerName || "-"}`,
    `Telepon: ${customerPhone || "-"}`,
    `No. Tiket: ${ticket.ticketNo || "-"}`,
    `Unit: ${ticket.deviceName || "-"}${ticket.deviceBrandModel ? ` (${ticket.deviceBrandModel})` : ""}`,
    `Keluhan: ${ticket.customerComplaints || "-"}`,
    `Metode: ${ticket.isCheckOnly ? "Hanya Cek & Diagnosis" : "Pendaftaran Servis"}`,
    `DP: Rp ${(ticket.downPayment || 0).toLocaleString("id-ID")}`,
    `Estimasi Selesai: ${dateLabel}`,
  ];

  return {
    title: "Nota Penerimaan Unit",
    subtitle: `Tiket ${ticket.ticketNo || "-"}`,
    lines,
  };
}

export function buildServiceReceptionPrintTemplate(ticket: any, customerName: string, customerPhone: string): string {
  const dateLabel = ticket.estimatedCompletionDate
    ? new Date(ticket.estimatedCompletionDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : "3 Hari";
  const unitName = `${ticket.deviceName || "-"}${ticket.deviceBrandModel ? ` (${ticket.deviceBrandModel})` : ""}`;

  return `
TANDA TERIMA UNIT
=================
No. Tiket: ${ticket.ticketNo || "-"}
Tanggal: ${new Date().toLocaleDateString("id-ID")}

Data Pelanggan
- Nama: ${customerName || "-"}
- Telepon: ${customerPhone || "-"}

Data Unit
- Unit: ${unitName}
- Keluhan: ${ticket.customerComplaints || "-"}
- Metode: ${ticket.isCheckOnly ? "Hanya Cek & Diagnosis" : "Pendaftaran Servis"}
- Uang Muka: Rp ${(ticket.downPayment || 0).toLocaleString("id-ID")}
- Estimasi Selesai: ${dateLabel}

Catatan:
Unit diterima dan dicatat oleh operator pada hari ini.
Pelanggan menerima salinan tanda terima ini sebagai bukti penerimaan unit.

TTD Operator
____________________
${""}
`;
}
