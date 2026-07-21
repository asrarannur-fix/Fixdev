type Queryable = {
  query: (text: string, params?: any[]) => Promise<{ rows: any[] }>;
};

const DEFAULT_NAMES: Record<string, { name: string; type: string }> = {
  "10100": { name: "Kas Utama", type: "ASSET" },
  "10200": { name: "Bank Utama", type: "ASSET" },
  "10300": { name: "Piutang Pelanggan", type: "ASSET" },
  "10500": { name: "Persediaan Barang", type: "ASSET" },
  "20100": { name: "Utang Pajak (PPN)", type: "LIABILITY" },
  "20200": { name: "Utang Dagang (Supplier)", type: "LIABILITY" },
  "21000": { name: "Titipan / Deposit Pelanggan", type: "LIABILITY" },
  "40100": { name: "Pendapatan Jasa Servis", type: "REVENUE" },
  "40200": { name: "Pendapatan Penjualan Sparepart", type: "REVENUE" },
  "50100": { name: "HPP Sparepart", type: "EXPENSE" },
  "50200": { name: "Beban Garansi", type: "EXPENSE" },
  "60100": { name: "Beban Gaji Staf", type: "EXPENSE" },
};

export async function ensureAccount(
  client: Queryable,
  tenantId: string,
  code: string,
  name?: string,
  type?: string,
): Promise<string> {
  const existing = await client.query(
    `SELECT id FROM coa_accounts WHERE tenant_id=$1 AND code=$2 LIMIT 1`,
    [tenantId, code],
  );
  if (existing.rows[0]) return existing.rows[0].id;
  const meta = DEFAULT_NAMES[code];
  const finalName = name || meta?.name || `Akun ${code}`;
  const finalType = type || meta?.type || "ASSET";
  const ins = await client.query(
    `INSERT INTO coa_accounts (id, tenant_id, code, name, type, balance)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 0) RETURNING id`,
    [tenantId, code, finalName, finalType],
  );
  return ins.rows[0].id;
}

export function paymentDebitAccountCode(method: string): string {
  if (method === "TEMPO") return "10300";
  if (["BANK_TRANSFER", "QRIS", "EDC", "E_WALLET"].includes(method)) return "10200";
  return "10100";
}
