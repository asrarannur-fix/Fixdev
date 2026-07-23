/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Accounting Controller — Dedicated server-side accounting endpoints.
 * Handles COA management, journal entries with balance validation,
 * ledger queries, and financial reports (trial balance, P&L).
 */
import { z } from "zod";
import { dbQuery, dbTransaction } from "../../lib/db.js";
import { logger } from "../../lib/logger.js";

// ──────────────────────────────────────────
// ZOD SCHEMAS
// ──────────────────────────────────────────

export const createAccountSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(1).max(255),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
  isGroup: z.boolean().optional().default(false),
});

export const updateAccountSchema = createAccountSchema.partial();

export const createJournalEntrySchema = z.object({
  description: z.string().min(1, { message: "Deskripsi wajib diisi." }).max(500),
  refNo: z.string().max(100).optional().nullable(),
  sourceType: z.string().max(50).optional().nullable(),
  sourceId: z.string().uuid().optional().nullable(),
  lines: z.array(
    z.object({
      accountId: z.string().uuid({ message: "ID akun tidak valid." }),
      debit: z.number().nonnegative().optional().default(0),
      credit: z.number().nonnegative().optional().default(0),
      description: z.string().max(255).optional().nullable(),
    }),
  ).min(2, { message: "Jurnal minimal memiliki 2 baris (debit + kredit)." }),
});

export const createCashTxSchema = z.object({
  type: z.enum(["CASH_IN", "CASH_OUT"]),
  amount: z.number().positive({ message: "Jumlah harus lebih dari 0." }),
  description: z.string().min(1).max(500),
  refNo: z.string().max(100).optional().nullable(),
  toAccountId: z.string().uuid().optional().nullable(), // for CASH_IN
  fromAccountId: z.string().uuid().optional().nullable(), // for CASH_OUT
});

export const validateBody = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      const parsed = schema.parse(req.body);
      req.validatedBody = parsed;
      next();
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string[]> = {};
        err.issues.forEach((e) => {
          const path = e.path.join(".");
          if (!errors[path]) errors[path] = [];
          errors[path].push(e.message);
        });
        return res.status(422).json({ message: "The given data was invalid.", errors });
      }
      next(err);
    }
  };
};

// ──────────────────────────────────────────
// 1. LIST COA ACCOUNTS
// ──────────────────────────────────────────

export const getAccounts = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const { type } = req.query;

  try {
    let sql = `SELECT id, tenant_id as "tenantId", code, name, type, is_group as "isGroup",
                      balance, created_at as "createdAt"
               FROM coa_accounts WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    if (type) {
      sql += ` AND type = $2`;
      params.push((type as string).toUpperCase());
    }
    sql += ` ORDER BY code ASC`;

    const result = await dbQuery(sql, params);
    res.json({ data: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: "Operasi akuntansi gagal diproses." });
  }
};

// ──────────────────────────────────────────
// 2. CREATE COA ACCOUNT
// ──────────────────────────────────────────

export const createAccount = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const { code, name, type, isGroup } = req.validatedBody;

  try {
    // Check unique code per tenant
    const existing = await dbQuery(
      `SELECT id FROM coa_accounts WHERE tenant_id = $1 AND code = $2`,
      [tenantId, code],
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: `Kode akun ${code} sudah digunakan.` });
    }

    const result = await dbQuery(
      `INSERT INTO coa_accounts (tenant_id, code, name, type, is_group)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, tenant_id as "tenantId", code, name, type, is_group as "isGroup", balance`,
      [tenantId, code, name, type, isGroup],
    );

    // Audit log
    await dbQuery(
      `INSERT INTO audit_logs (id, tenant_id, action, details) VALUES (gen_random_uuid(), $1, 'COA_CREATE', $2)`,
      [tenantId, `Akun baru: ${code} - ${name} (${type})`],
    );

    res.status(201).json({ data: result.rows[0], message: "Akun berhasil dibuat." });
  } catch (err: any) {
    res.status(500).json({ error: "Operasi akuntansi gagal diproses." });
  }
};

// ──────────────────────────────────────────
// 3. UPDATE COA ACCOUNT
// ──────────────────────────────────────────

export const updateAccount = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const { id } = req.params;
  const updates = req.validatedBody;

  try {
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (updates.name !== undefined) { sets.push(`name = $${idx++}`); params.push(updates.name); }
    if (updates.type !== undefined) { sets.push(`type = $${idx++}`); params.push(updates.type); }
    if (updates.isGroup !== undefined) { sets.push(`is_group = $${idx++}`); params.push(updates.isGroup); }

    if (sets.length === 0) {
      return res.status(422).json({ message: "Tidak ada field yang diupdate." });
    }

    sets.push(`updated_at = NOW()`);
    params.push(id, tenantId);

    const result = await dbQuery(
      `UPDATE coa_accounts SET ${sets.join(", ")} WHERE id = $${idx++} AND tenant_id = $${idx++}
       RETURNING id, tenant_id as "tenantId", code, name, type, is_group as "isGroup", balance`,
      params,
    );

    if (result.rows.length === 0) return res.status(404).json({ message: "Akun tidak ditemukan." });
    res.json({ data: result.rows[0], message: "Akun berhasil diupdate." });
  } catch (err: any) {
    res.status(500).json({ error: "Operasi akuntansi gagal diproses." });
  }
};

// ──────────────────────────────────────────
// 4. CREATE JOURNAL ENTRY (with balance validation)
// ──────────────────────────────────────────

export const createJournalEntry = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const userId = req.authActor?.userId;
  const { description, refNo, sourceType, sourceId, lines } = req.validatedBody;

  if (!branchId) {
    return res.status(422).json({ error: "branchId wajib diisi untuk transaksi akuntansi." });
  }

  try {
    // Validate: no line has both debit and credit > 0
    for (const line of lines) {
      if ((Number(line.debit) || 0) > 0 && (Number(line.credit) || 0) > 0) {
        return res.status(422).json({
          message: `Baris akun tidak valid: satu baris tidak boleh memiliki debit DAN kredit sekaligus.`,
        });
      }
    }

    const result = await dbTransaction(async (client) => {
      // Validate balance inside transaction (race-safe)
      const totalDebit = lines.reduce((sum: number, l: any) => sum + (Number(l.debit) || 0), 0);
      const totalCredit = lines.reduce((sum: number, l: any) => sum + (Number(l.credit) || 0), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error("Jurnal tidak seimbang. Total debit harus sama dengan total kredit.");
      }

      // Idempotency: reference_no uniqueness per tenant
      if (refNo) {
        const refCheck = await client.query(
          `SELECT id FROM journal_entries WHERE tenant_id = $1 AND reference_no = $2 LIMIT 1`,
          [tenantId, refNo]
        );
        if (refCheck.rows[0]) throw new Error(`Duplikasi transaksi: Reference No ${refNo} sudah terdaftar.`);
      }

      // Insert journal entry header
      const entryRes = await client.query(
        `INSERT INTO journal_entries (id, tenant_id, branch_id, description, reference_no, source_type, source_id, created_by)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [tenantId, branchId, description, refNo || null, sourceType || null, sourceId || null, userId],
      );
      const entryId = entryRes.rows[0].id;

      // Insert journal lines
      for (const line of lines) {
        await client.query(
          `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description)
           VALUES ($1, $2, $3, $4, $5)`,
          [entryId, line.accountId, Number(line.debit) || 0, Number(line.credit) || 0, line.description || null],
        );
      }

      // Return full entry with lines
      const fullEntry = await client.query(
        `SELECT je.id, je.entry_date as "entryDate", je.description, je.reference_no as "refNo",
                je.source_type as "sourceType", je.is_posted as "isPosted", je.created_at as "createdAt"
         FROM journal_entries je WHERE je.id = $1`,
        [entryId],
      );
      const entryLines = await client.query(
        `SELECT jl.id, jl.account_id as "accountId", jl.debit, jl.credit, jl.description,
                ca.code as "accountCode", ca.name as "accountName"
         FROM journal_lines jl
         JOIN coa_accounts ca ON ca.id = jl.account_id
         WHERE jl.journal_entry_id = $1
         ORDER BY jl.id`,
        [entryId],
      );

      return { entry: { ...fullEntry.rows[0], lines: entryLines.rows }, totalDebit, totalCredit };
    });

    // Audit log (uses result from transaction)
    const auditDesc = `Jurnal: ${description} — Debit Rp${result.totalDebit.toLocaleString("id-ID")}`;
    await dbQuery(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, details)
       VALUES (gen_random_uuid(), $1, $2, 'JOURNAL_CREATE', $3)`,
      [tenantId, userId, auditDesc],
    );

    res.status(201).json({ success: true, data: result.entry });
  } catch (err: any) {
    res.status(500).json({ error: "Operasi akuntansi gagal diproses." });
  }
};

// ──────────────────────────────────────────
// 5. LIST JOURNAL ENTRIES (ledger)
// ──────────────────────────────────────────

export const getJournalEntries = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const { accountId, from, to, sourceType } = req.query;

  try {
    const conditions: string[] = ["je.tenant_id = $1"];
    const params: any[] = [tenantId];
    let joinClause = "";
    let idx = 2;

    if (accountId) {
      joinClause = "JOIN journal_lines jl ON jl.journal_entry_id = je.id AND jl.account_id = $2";
      params.push(accountId);
      idx = 3;
    }

    if (from) { conditions.push(`je.entry_date >= $${idx++}`); params.push(from); }
    if (to) { conditions.push(`je.entry_date <= $${idx++}`); params.push(to); }
    if (sourceType) { conditions.push(`je.source_type = $${idx++}`); params.push(sourceType); }

    const where = conditions.join(" AND ");

    const entries = await dbQuery(
      `SELECT DISTINCT je.id, je.entry_date as "entryDate", je.description, je.reference_no as "refNo",
              je.source_type as "sourceType", je.is_posted as "isPosted", je.created_at as "createdAt"
       FROM journal_entries je ${joinClause}
       WHERE ${where}
       ORDER BY je.entry_date DESC LIMIT 200`,
      params,
    );

    // Attach lines to each entry for chart rendering
    const entryIds = entries.rows.map((e: any) => e.id);
    const linesMap: Record<string, any[]> = {};
    if (entryIds.length > 0) {
      const lines = await dbQuery(
        `SELECT jl.journal_entry_id as "entryId", jl.id, jl.account_id as "accountId",
                jl.debit, jl.credit, jl.description,
                ca.code as "accountCode", ca.name as "accountName"
         FROM journal_lines jl
         JOIN coa_accounts ca ON ca.id = jl.account_id
         WHERE jl.journal_entry_id = ANY($1::uuid[])
         ORDER BY jl.id`,
        [entryIds],
      );
      for (const line of lines.rows) {
        if (!linesMap[line.entryId]) linesMap[line.entryId] = [];
        linesMap[line.entryId].push(line);
      }
    }
    for (const entry of entries.rows) {
      (entry as any).lines = linesMap[entry.id] || [];
    }

    res.json({ data: entries.rows });
  } catch (err: any) {
    res.status(500).json({ error: "Operasi akuntansi gagal diproses." });
  }
};

// ──────────────────────────────────────────
// 6. GET JOURNAL ENTRY BY ID (with lines)
// ──────────────────────────────────────────

export const getJournalEntryById = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const { id } = req.params;

  try {
    const entryRes = await dbQuery(
      `SELECT id, tenant_id as "tenantId", entry_date as "entryDate", description,
              reference_no as "refNo", source_type as "sourceType", is_posted as "isPosted"
       FROM journal_entries WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    if (entryRes.rows.length === 0) return res.status(404).json({ message: "Jurnal tidak ditemukan." });

    const lines = await dbQuery(
      `SELECT jl.id, jl.account_id as "accountId", jl.debit, jl.credit, jl.description,
              ca.code as "accountCode", ca.name as "accountName", ca.type as "accountType"
       FROM journal_lines jl JOIN coa_accounts ca ON ca.id = jl.account_id
       WHERE jl.journal_entry_id = $1 ORDER BY ca.code`,
      [id],
    );

    res.json({ data: { ...entryRes.rows[0], lines: lines.rows } });
  } catch (err: any) {
    res.status(500).json({ error: "Operasi akuntansi gagal diproses." });
  }
};

// ──────────────────────────────────────────
// 7. TRIAL BALANCE
// ──────────────────────────────────────────

export const getTrialBalance = async (req: any, res: any) => {
  const tenantId = req.tenantId;

  try {
    const result = await dbQuery(
      `SELECT ca.id, ca.code, ca.name, ca.type,
              CASE WHEN ca.type IN ('ASSET','EXPENSE')
                THEN COALESCE(SUM(CASE WHEN je.is_posted = TRUE THEN jl.debit ELSE 0 END)
                  - SUM(CASE WHEN je.is_posted = TRUE THEN jl.credit ELSE 0 END), 0)::numeric
                ELSE COALESCE(SUM(CASE WHEN je.is_posted = TRUE THEN jl.credit ELSE 0 END)
                  - SUM(CASE WHEN je.is_posted = TRUE THEN jl.debit ELSE 0 END), 0)::numeric
              END AS balance
       FROM coa_accounts ca
       LEFT JOIN journal_lines jl ON jl.account_id = ca.id
       LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.tenant_id = ca.tenant_id
       WHERE ca.tenant_id = $1 AND ca.is_group = FALSE
       GROUP BY ca.id, ca.code, ca.name, ca.type
       ORDER BY ca.code ASC`,
      [tenantId],
    );

    const accounts = result.rows;
    const totalDebit = accounts
      .filter((a: any) => a.type === "ASSET" || a.type === "EXPENSE")
      .reduce((sum: number, a: any) => sum + Math.max(0, Number(a.balance)), 0);
    const totalCredit = accounts
      .filter((a: any) => a.type === "LIABILITY" || a.type === "EQUITY" || a.type === "REVENUE")
      .reduce((sum: number, a: any) => sum + Math.max(0, Number(a.balance)), 0);

    res.json({
      data: {
        accounts,
        summary: {
          totalDebit,
          totalCredit,
          difference: Math.abs(totalDebit - totalCredit),
          isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: "Operasi akuntansi gagal diproses." });
  }
};

// ──────────────────────────────────────────
// 8. BALANCE SHEET (Neraca)
// ──────────────────────────────────────────

export const getBalanceSheet = async (req: any, res: any) => {
  const tenantId = req.tenantId;

  try {
    // Sum posted journal lines per account with correct sign
    const result = await dbQuery(
      `SELECT ca.id, ca.code, ca.name, ca.type,
              CASE WHEN ca.type IN ('ASSET','EXPENSE')
                THEN COALESCE(SUM(CASE WHEN je.is_posted = TRUE THEN jl.debit ELSE 0 END)
                  - SUM(CASE WHEN je.is_posted = TRUE THEN jl.credit ELSE 0 END), 0)::numeric
                ELSE COALESCE(SUM(CASE WHEN je.is_posted = TRUE THEN jl.credit ELSE 0 END)
                  - SUM(CASE WHEN je.is_posted = TRUE THEN jl.debit ELSE 0 END), 0)::numeric
              END AS balance
       FROM coa_accounts ca
       LEFT JOIN journal_lines jl ON jl.account_id = ca.id
       LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.tenant_id = ca.tenant_id
       WHERE ca.tenant_id = $1 AND ca.is_group = FALSE
       GROUP BY ca.id, ca.code, ca.name, ca.type
       ORDER BY ca.code ASC`,
      [tenantId],
    );

    const allAccounts = result.rows;
    const assets = allAccounts.filter((a: any) => a.type === "ASSET").map((a: any) => ({ ...a, balance: Math.max(0, Number(a.balance)) }));
    const liabilities = allAccounts.filter((a: any) => a.type === "LIABILITY").map((a: any) => ({ ...a, balance: Math.max(0, Number(a.balance)) }));
    const equity = allAccounts.filter((a: any) => a.type === "EQUITY").map((a: any) => ({ ...a, balance: Math.max(0, Number(a.balance)) }));
    // Include retained earnings from P&L
    const revenue = allAccounts.filter((a: any) => a.type === "REVENUE").reduce((s: number, a: any) => s + Math.max(0, Number(a.balance)), 0);
    const expense = allAccounts.filter((a: any) => a.type === "EXPENSE").reduce((s: number, a: any) => s + Math.max(0, Number(a.balance)), 0);
    const retainedEarnings = revenue - expense;

    const totalAssets = assets.reduce((s: number, a: any) => s + a.balance, 0);
    const totalLiabilities = liabilities.reduce((s: number, a: any) => s + a.balance, 0);
    const totalEquity = equity.reduce((s: number, a: any) => s + a.balance, 0) + retainedEarnings;

    res.json({
      data: {
        assets,
        liabilities,
        equity,
        retainedEarnings,
        totalAssets,
        totalLiabilities,
        totalEquity,
        isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: "Operasi akuntansi gagal diproses." });
  }
};

// ──────────────────────────────────────────
// 9. PROFIT & LOSS REPORT
// ──────────────────────────────────────────

export const getProfitAndLoss = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const { from, to } = req.query;

  try {
    const dateConditions: string[] = [];
    const params: any[] = [tenantId];
    if (from) { params.push(from); dateConditions.push(`je.entry_date >= $${params.length}`); }
    if (to) { params.push(to); dateConditions.push(`je.entry_date <= $${params.length}`); }
    const dateSql = dateConditions.length ? `AND ${dateConditions.join(" AND ")}` : "";

    // Revenue accounts
    const revenueRes = await dbQuery(
      `SELECT ca.code, ca.name,
              COALESCE(SUM(CASE WHEN je.is_posted = TRUE THEN jl.credit ELSE 0 END)
                - SUM(CASE WHEN je.is_posted = TRUE THEN jl.debit ELSE 0 END), 0)::numeric AS balance
       FROM coa_accounts ca
       LEFT JOIN journal_lines jl ON jl.account_id = ca.id
       LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.tenant_id = ca.tenant_id ${dateSql}
       WHERE ca.tenant_id = $1 AND ca.type = 'REVENUE' AND ca.is_group = FALSE
       GROUP BY ca.code, ca.name ORDER BY ca.code`,
      params,
    );

    // Expense accounts
    const expenseRes = await dbQuery(
      `SELECT ca.code, ca.name,
              COALESCE(SUM(CASE WHEN je.is_posted = TRUE THEN jl.debit ELSE 0 END)
                - SUM(CASE WHEN je.is_posted = TRUE THEN jl.credit ELSE 0 END), 0)::numeric AS balance
       FROM coa_accounts ca
       LEFT JOIN journal_lines jl ON jl.account_id = ca.id
       LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.tenant_id = ca.tenant_id ${dateSql}
       WHERE ca.tenant_id = $1 AND ca.type = 'EXPENSE' AND ca.is_group = FALSE
       GROUP BY ca.code, ca.name ORDER BY ca.code`,
      params,
    );

    const totalRevenue = revenueRes.rows.reduce((s: number, r: any) => s + Number(r.balance), 0);
    const totalExpense = expenseRes.rows.reduce((s: number, r: any) => s + Number(r.balance), 0);
    const netProfit = totalRevenue - totalExpense;

    res.json({
      data: {
        revenue: revenueRes.rows,
        expense: expenseRes.rows,
        summary: { totalRevenue, totalExpense, netProfit },
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: "Operasi akuntansi gagal diproses." });
  }
};

// ──────────────────────────────────────────
// 9. CREATE CASH TRANSACTION (operational cash in/out + journal)
// ──────────────────────────────────────────

export const createCashTransaction = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const userId = req.authActor?.userId;
  const parsed = req.validatedBody;

  if (!branchId) {
    return res.status(422).json({ error: "branchId wajib diisi untuk transaksi akuntansi." });
  }

  try {
    const result = await dbTransaction(async (client) => {
      // Find cash account: prefer code starting with 101, fallback to first ASSET
      const cashAcct = await client.query(
        `SELECT id FROM coa_accounts WHERE tenant_id = $1 AND (code LIKE '101%' OR name ILIKE '%kas%') AND type = 'ASSET' LIMIT 1`,
        [tenantId],
      );
      if (!cashAcct.rows[0]) {
        const fallback = await client.query(
          `SELECT id FROM coa_accounts WHERE tenant_id = $1 AND type = 'ASSET' LIMIT 1`,
          [tenantId],
        );
        if (!fallback.rows[0]) throw new Error("Tidak ada akun aset (kas) untuk transaksi. Buat akun kas terlebih dahulu.");
        cashAcct.rows = fallback.rows;
      }

      const targetAcctId = parsed.type === "CASH_IN" ? parsed.toAccountId : parsed.fromAccountId;
      if (!targetAcctId) throw new Error("Akun lawan transaksi wajib diisi.");

      // Validate target account exists AND tenant-owned
      const targetAcct = await client.query(
        `SELECT id, name FROM coa_accounts WHERE id = $1 AND tenant_id = $2`,
        [targetAcctId, tenantId],
      );
      if (!targetAcct.rows[0]) throw new Error("Akun lawan transaksi tidak ditemukan atau bukan milik tenant Anda.");

      // Idempotency: reference_no uniqueness per tenant
      if (parsed.refNo) {
        const refCheck = await client.query(
          `SELECT id FROM journal_entries WHERE tenant_id = $1 AND reference_no = $2 LIMIT 1`,
          [tenantId, parsed.refNo]
        );
        if (refCheck.rows[0]) throw new Error(`Duplikasi transaksi: Reference No ${parsed.refNo} sudah terdaftar.`);
      }

    // Create journal entry
    const entryRes = await client.query(
      `INSERT INTO journal_entries (id, tenant_id, branch_id, description, reference_no, source_type, created_by)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6) RETURNING id`,
      [tenantId, branchId, parsed.description, parsed.refNo || null, parsed.sourceType || "CASH_TX", userId],
    );
    const entryId = entryRes.rows[0].id;

    if (parsed.type === "CASH_IN") {
      // Debit Cash, Credit Target
      await client.query(
        `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
         VALUES ($1, $2, $3, 0), ($1, $4, 0, $3)`,
        [entryId, cashAcct.rows[0].id, parsed.amount, targetAcctId],
      );
    } else {
      // Debit Target, Credit Cash
      await client.query(
        `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
         VALUES ($1, $2, $3, 0), ($1, $4, 0, $3)`,
        [entryId, targetAcctId, parsed.amount, cashAcct.rows[0].id],
      );
    }

    return { journalEntryId: entryId, type: parsed.type, amount: parsed.amount };
  });

  // Audit log
  await dbQuery(
    `INSERT INTO audit_logs (id, tenant_id, user_id, action, details)
     VALUES (gen_random_uuid(), $1, $2, 'CASH_TX', $3)`,
    [tenantId, userId, `${parsed.type}: Rp${parsed.amount.toLocaleString("id-ID")} — ${parsed.description}`],
  );

  res.status(201).json({ data: result, message: "Transaksi kas berhasil dicatat." });
  } catch (err: any) {
    res.status(500).json({ error: "Operasi akuntansi gagal diproses." });
  }
};
