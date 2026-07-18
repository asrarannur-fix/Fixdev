/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POS Controller — Dedicated server-side POS endpoints.
 * Handles shift management, checkout with journal + stock movements,
 * void/refund, and shift summary (X/Z-report).
 */
import { z } from "zod";
import { dbQuery, dbTransaction, getPool } from "../../lib/db.js";
import { logger } from "../../lib/logger.js";

// ──────────────────────────────────────────
// ZOD SCHEMAS
// ──────────────────────────────────────────

export const openShiftSchema = z.object({
  startingCash: z.number().nonnegative({ message: "Saldo awal tidak boleh negatif." }),
});

export const closeShiftSchema = z.object({
  actualEndingCash: z.number().nonnegative({ message: "Saldo akhir aktual tidak boleh negatif." }),
  notes: z.string().max(500).optional().nullable(),
});

export const posSaleSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  items: z.array(
    z.object({
      productId: z.string().uuid().optional().nullable(),
      name: z.string().optional(),
      quantity: z.number().int().positive({ message: "Quantity minimal 1." }),
      unitPrice: z.number().nonnegative().optional(),
      discount: z.number().nonnegative().optional().default(0),
    }),
  ).min(1, { message: "Minimal 1 item." }),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "QRIS", "EDC", "E_WALLET", "DEPOSIT", "TEMPO"]),
  amountPaid: z.number().nonnegative().optional(),
  discountAmount: z.number().nonnegative().optional().default(0),
  depositUsed: z.number().nonnegative().optional().default(0),
  paymentDetails: z.string().max(500).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  // Split payment support
  splitPayments: z.array(
    z.object({
      method: z.enum(["CASH", "BANK_TRANSFER", "QRIS", "EDC", "E_WALLET", "DEPOSIT"]),
      amount: z.number().positive(),
    }),
  ).optional().nullable(),
});

export const voidSaleSchema = z.object({
  reason: z.string().min(3, { message: "Alasan pembatalan wajib diisi (min 3 karakter)." }).max(500),
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
// HELPERS
// ──────────────────────────────────────────

/** Generate INV/POS/YYYY/NNNNN invoice number (sequential per year). */
async function generateInvoiceNo(): Promise<string> {
  const year = new Date().getFullYear();
  const pool = getPool();
  const client = await pool.connect();
  try {
    const r = await client.query(
      `SELECT COUNT(*)::int AS cnt FROM pos_transactions WHERE EXTRACT(YEAR FROM created_at) = $1`,
      [year],
    );
    const seq = (r.rows[0]?.cnt ?? 0) + 1;
    return `INV/POS/${year}/${seq.toString().padStart(5, "0")}`;
  } finally {
    client.release();
  }
}

// ──────────────────────────────────────────
// 1. OPEN SHIFT
// ──────────────────────────────────────────

export const openShift = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const userId = req.authActor?.userId;
  const { startingCash } = req.validatedBody;

  try {
    // Check for existing open shift
    const existing = await dbQuery(
      `SELECT id FROM pos_shifts WHERE tenant_id=$1 AND branch_id=$2 AND status='OPEN' LIMIT 1`,
      [tenantId, branchId],
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        message: "Shift kasir sudah dibuka. Tutup shift terlebih dahulu sebelum membuka yang baru.",
        existingShiftId: existing.rows[0].id,
      });
    }

    const result = await dbQuery(
      `INSERT INTO pos_shifts (tenant_id, branch_id, cashier_id, starting_cash, status)
       VALUES ($1, $2, $3, $4, 'OPEN')
       RETURNING id, tenant_id as "tenantId", branch_id as "branchId", cashier_id as "cashierId",
                 opened_at as "openedAt", starting_cash as "startingCash", status`,
      [tenantId, branchId, userId, startingCash],
    );

    // Audit log
    await dbQuery(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, details)
       VALUES (gen_random_uuid(), $1, $2, 'POS_SHIFT_OPEN', $3)`,
      [tenantId, userId, `Membuka shift kasir dengan saldo awal Rp${startingCash.toLocaleString("id-ID")}`],
    );

    res.status(201).json({ data: result.rows[0], message: "Shift kasir berhasil dibuka." });
  } catch (err: any) {
    logger.error({ err: err.message, tenantId, branchId }, "POS openShift error");
    res.status(500).json({ error: err.message });
  }
};

// ──────────────────────────────────────────
// 2. CLOSE SHIFT (with X/Z-report summary)
// ──────────────────────────────────────────

export const closeShift = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const userId = req.authActor?.userId;
  const { actualEndingCash, notes } = req.validatedBody;

  try {
    // Find open shift
    const shiftRes = await dbQuery(
      `SELECT id, starting_cash as "startingCash", opened_at as "openedAt"
       FROM pos_shifts WHERE tenant_id=$1 AND branch_id=$2 AND cashier_id=$3 AND status='OPEN'
       ORDER BY opened_at DESC LIMIT 1`,
      [tenantId, branchId, userId],
    );
    if (shiftRes.rows.length === 0) {
      return res.status(404).json({ message: "Tidak ada shift kasir aktif yang ditemukan." });
    }

    const shift = shiftRes.rows[0];
    const shiftId = shift.id;

    // Aggregate shift sales
    const salesAgg = await dbQuery(
      `SELECT
         COUNT(*)::int AS "totalTransactions",
         COALESCE(SUM(grand_total), 0)::numeric AS "totalSales",
         COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN grand_total ELSE 0 END), 0)::numeric AS "totalCashSales",
         COALESCE(SUM(CASE WHEN payment_method != 'CASH' THEN grand_total ELSE 0 END), 0)::numeric AS "totalNonCashSales",
         COALESCE(SUM(CASE WHEN is_refunded AND payment_method = 'CASH' THEN grand_total ELSE 0 END), 0)::numeric AS "totalRefunds"
       FROM pos_transactions WHERE shift_id = $1 AND tenant_id = $2`,
      [shiftId, tenantId],
    );

    const agg = salesAgg.rows[0];
    const expectedEndingCash = Number(shift.startingCash) + Number(agg.totalCashSales) - Number(agg.totalRefunds);
    const difference = actualEndingCash - expectedEndingCash;

    const result = await dbQuery(
      `UPDATE pos_shifts SET
         status = 'CLOSED',
         closed_at = NOW(),
         expected_ending_cash = $1,
         actual_ending_cash = $2,
         difference = $3,
         notes = $4
       WHERE id = $5 AND tenant_id = $6
       RETURNING id, closed_at as "closedAt", expected_ending_cash as "expectedEndingCash",
                 actual_ending_cash as "actualEndingCash", difference, status`,
      [expectedEndingCash, actualEndingCash, difference, notes || null, shiftId, tenantId],
    );

    // Audit log (HIGH severity if discrepancy)
    await dbQuery(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, details)
       VALUES (gen_random_uuid(), $1, $2, 'POS_SHIFT_CLOSE', $3)`,
      [
        tenantId, userId,
        `Menutup shift. Kas aktual: Rp${actualEndingCash.toLocaleString("id-ID")}, ` +
        `Ekspektasi: Rp${expectedEndingCash.toLocaleString("id-ID")}, Selisih: Rp${difference.toLocaleString("id-ID")}` +
        (difference !== 0 ? " ⚠️ SELISIH" : ""),
      ],
    );

    res.json({
      data: {
        ...result.rows[0],
        summary: {
          startingCash: Number(shift.startingCash),
          totalSales: Number(agg.totalSales),
          totalCashSales: Number(agg.totalCashSales),
          totalNonCashSales: Number(agg.totalNonCashSales),
          totalRefunds: Number(agg.totalRefunds),
          totalTransactions: agg.totalTransactions,
          expectedEndingCash,
          actualEndingCash,
          difference,
        },
      },
      message: "Shift kasir berhasil ditutup.",
    });
  } catch (err: any) {
    logger.error({ err: err.message, tenantId, branchId }, "POS closeShift error");
    res.status(500).json({ error: err.message });
  }
};

// ──────────────────────────────────────────
// 3. SHIFT SUMMARY (X-report, read-only)
// ──────────────────────────────────────────

export const getShiftSummary = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const { id } = req.params;

  try {
    const shiftRes = await dbQuery(
      `SELECT id, tenant_id as "tenantId", branch_id as "branchId", cashier_id as "cashierId",
              opened_at as "openedAt", closed_at as "closedAt", starting_cash as "startingCash",
              expected_ending_cash as "expectedEndingCash", actual_ending_cash as "actualEndingCash",
              difference, status, notes
       FROM pos_shifts WHERE id=$1 AND tenant_id=$2 AND branch_id=$3`,
      [id, tenantId, branchId],
    );
    if (shiftRes.rows.length === 0) {
      return res.status(404).json({ message: "Shift tidak ditemukan." });
    }

    const shift = shiftRes.rows[0];

    // Payment method breakdown
    const paymentBreakdown = await dbQuery(
      `SELECT payment_method AS "paymentMethod", COUNT(*)::int AS count,
              COALESCE(SUM(grand_total), 0)::numeric AS total
       FROM pos_transactions WHERE shift_id=$1 AND tenant_id=$2 AND is_refunded = FALSE
       GROUP BY payment_method ORDER BY total DESC`,
      [id, tenantId],
    );

    // Hourly breakdown
    const hourlySales = await dbQuery(
      `SELECT EXTRACT(HOUR FROM timestamp)::int AS hour, COUNT(*)::int AS count,
              COALESCE(SUM(grand_total), 0)::numeric AS total
       FROM pos_transactions WHERE shift_id=$1 AND tenant_id=$2 AND is_refunded = FALSE
       GROUP BY EXTRACT(HOUR FROM timestamp) ORDER BY hour`,
      [id, tenantId],
    );

    // Refund count
    const refundCount = await dbQuery(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(grand_total), 0)::numeric AS total
       FROM pos_transactions WHERE shift_id=$1 AND tenant_id=$2 AND is_refunded = TRUE`,
      [id, tenantId],
    );

    res.json({
      data: {
        shift,
        paymentMethods: paymentBreakdown.rows,
        hourlySales: hourlySales.rows,
        refunds: refundCount.rows[0],
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message, tenantId }, "POS getShiftSummary error");
    res.status(500).json({ error: err.message });
  }
};

// ──────────────────────────────────────────
// 4. LIST SHIFTS
// ──────────────────────────────────────────

export const getShifts = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const { status } = req.query;

  try {
    const conditions = ["tenant_id = $1", "branch_id = $2"];
    const params: any[] = [tenantId, branchId];
    let idx = 3;
    if (status) {
      conditions.push(`status = $${idx++}`);
      params.push((status as string).toUpperCase());
    }
    const where = conditions.join(" AND ");
    const result = await dbQuery(
      `SELECT id, tenant_id as "tenantId", branch_id as "branchId", cashier_id as "cashierId",
              opened_at as "openedAt", closed_at as "closedAt", starting_cash as "startingCash",
              expected_ending_cash as "expectedEndingCash", actual_ending_cash as "actualEndingCash",
              difference, status, notes
       FROM pos_shifts WHERE ${where} ORDER BY opened_at DESC LIMIT 100`,
      params,
    );
    res.json({ data: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ──────────────────────────────────────────
// 5. CREATE SALE (checkout — atomic: transaction + stock + journal + audit)
// ──────────────────────────────────────────

export const createSale = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const userId = req.authActor?.userId;
  const parsed = req.validatedBody;

  let result: any = null;
  try {
  const resultTx = await dbTransaction(async (client) => {
    // ── 5a. Find active shift ──
    const shiftRes = await client.query(
      `SELECT id FROM pos_shifts WHERE tenant_id=$1 AND branch_id=$2 AND cashier_id=$3 AND status='OPEN' ORDER BY opened_at DESC LIMIT 1`,
      [tenantId, branchId, userId],
    );
    if (shiftRes.rows.length === 0) {
      throw new Error("Tidak ada shift kasir aktif. Buka shift terlebih dahulu.");
    }
    const shiftId = shiftRes.rows[0].id;

    // ── 5b. Resolve active warehouse and prices from DB ──
    const warehouseRes = await client.query(
      `SELECT id FROM warehouses WHERE branch_id=$1 AND tenant_id=$2 LIMIT 1`,
      [branchId, tenantId],
    );
    const warehouseId = warehouseRes.rows[0]?.id;
    let subtotal = 0;
    const items: any[] = [];
    for (const i of parsed.items) {
      let price = 0;
      let productName = i.name || "Item";
      if (i.productId) {
        const prodRes = await client.query(
          `SELECT name, sell_price FROM products WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
          [i.productId, tenantId],
        );
        if (prodRes.rows.length > 0) {
          price = Number(prodRes.rows[0].sell_price) || 0;
          productName = prodRes.rows[0].name;
        }
      } else {
        price = Number(i.unitPrice) || 0;
      }
      const qty = Number(i.quantity) || 1;
      const disc = Number(i.discount) || 0;
      const lineSub = price * qty;
      subtotal += lineSub - disc;
      items.push({
        productId: i.productId || null,
        name: productName,
        quantity: qty,
        unitPrice: price,
        discount: disc,
        tax: 0, // calculated below
        total: lineSub - disc,
        warehouseId,
      });
    }

    // ── 5c. Calculate totals (read tax rate from tenant settings) ──
    const tenantRes = await client.query(`SELECT settings FROM tenants WHERE id=$1 LIMIT 1`, [tenantId]);
    const taxRate = tenantRes.rows[0]?.settings?.taxSettings?.taxRate ?? 11;
    const disc = Number(parsed.discountAmount) || 0;
    const base = Math.max(0, subtotal - disc);
    const taxAmount = Math.round(base * taxRate / 100);
    const grandTotal = base + taxAmount;

    // ── 5d. Handle payments ──
    const depositUsed = Math.min(grandTotal, Math.max(0, Number(parsed.depositUsed) || 0));
    const cashDue = Math.max(0, grandTotal - depositUsed);
    const amountPaid = Math.max(0, Number(parsed.amountPaid) || (depositUsed ? 0 : grandTotal));
    const changeAmount = Math.max(0, amountPaid - cashDue);

    // ── 5e. Generate invoice number ──
    const year = new Date().getFullYear();
    const seqRes = await client.query(
      `SELECT COUNT(*)::int AS cnt FROM pos_transactions WHERE EXTRACT(YEAR FROM created_at)=$1`,
      [year],
    );
    const invoiceNo = `INV/POS/${year}/${((seqRes.rows[0]?.cnt ?? 0) + 1).toString().padStart(5, "0")}`;

    // ── 5f. Insert transaction ──
    const txRes = await client.query(
      `INSERT INTO pos_transactions
         (tenant_id, branch_id, shift_id, invoice_no, customer_id, items, subtotal,
          discount_amount, tax_amount, grand_total, payment_method, amount_paid,
          change_amount, deposit_used, payment_details, notes, is_refunded, posted_to_ledger, status)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,FALSE,TRUE,'COMPLETED')
       RETURNING id, invoice_no as "invoiceNo", grand_total as "grandTotal", created_at as "timestamp"`,
      [
        tenantId, branchId, shiftId, invoiceNo, parsed.customerId || null,
        JSON.stringify(items), subtotal, disc, taxAmount, grandTotal,
        parsed.paymentMethod, amountPaid, changeAmount, depositUsed,
        parsed.paymentDetails || null, parsed.notes || null,
      ],
    );
    const txId = txRes.rows[0].id;

    // ── 5g. Deduct stock + log stock movements ──
    for (const item of items) {
      if (item.productId && warehouseId) {
        const stockUpdate = await client.query(
          `UPDATE product_stock SET quantity = quantity - $1
           WHERE product_id=$2 AND warehouse_id=$3 AND quantity >= $1`,
          [item.quantity, item.productId, warehouseId, tenantId],
        );
        if (stockUpdate.rowCount !== 1) {
          throw new Error(`Stok ${item.name} tidak cukup di gudang aktif.`);
        }
        await client.query(
          `INSERT INTO stock_movements (id, tenant_id, warehouse_id, product_id, type, quantity_change, reference_id, notes)
           VALUES (gen_random_uuid(), $1, $2, $3, 'POS_SALE', -$4, $5, $6)`,
          [tenantId, warehouseId, item.productId, item.quantity, txId, `Penjualan ${item.name} x${item.quantity}`],
        );
      }
    }

    // ── 5h. Accounting journal (double-entry) ──
    const netSales = subtotal - disc;
    const cashAcct = await client.query(
      `SELECT id FROM coa_accounts WHERE tenant_id=$1 AND code='10100' LIMIT 1`, [tenantId],
    );
    const salesAcct = await client.query(
      `SELECT id FROM coa_accounts WHERE tenant_id=$1 AND code='40100' LIMIT 1`, [tenantId],
    );
    const taxAcct = await client.query(
      `SELECT id FROM coa_accounts WHERE tenant_id=$1 AND code='20100' LIMIT 1`, [tenantId],
    );
    const hppAcct = await client.query(
      `SELECT id FROM coa_accounts WHERE tenant_id=$1 AND code='50100' LIMIT 1`, [tenantId],
    );
    const inventoryAcct = await client.query(
      `SELECT id FROM coa_accounts WHERE tenant_id=$1 AND code='10200' LIMIT 1`, [tenantId],
    );

    if (cashAcct.rows[0] && salesAcct.rows[0]) {
      const journalRes = await client.query(
        `INSERT INTO journal_entries (id, tenant_id, branch_id, description, reference_no)
         VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING id`,
        [tenantId, branchId, `POS Penjualan ${invoiceNo}`, invoiceNo],
      );
      const journalId = journalRes.rows[0].id;

      // Debit: Cash/Bank
      await client.query(
        `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit)
         VALUES (gen_random_uuid(), $1, $2, $3, 0)`,
        [journalId, cashAcct.rows[0].id, grandTotal],
      );
      // Credit: Revenue
      await client.query(
        `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit)
         VALUES (gen_random_uuid(), $1, $2, 0, $3)`,
        [journalId, salesAcct.rows[0].id, netSales],
      );
      // Credit: Tax payable
      if (taxAcct.rows[0] && taxAmount > 0) {
        await client.query(
          `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit)
           VALUES (gen_random_uuid(), $1, $2, 0, $3)`,
          [journalId, taxAcct.rows[0].id, taxAmount],
        );
      }
      // Debit: HPP, Credit: Inventory (if items have COGS)
      if (hppAcct.rows[0] && inventoryAcct.rows[0]) {
        let totalCogs = 0;
        for (const item of items) {
          if (item.productId) {
            const costRes = await client.query(
              `SELECT purchase_cost FROM products WHERE id=$1 AND tenant_id=$2 LIMIT 1`, [item.productId, tenantId],
            );
            totalCogs += (Number(costRes.rows[0]?.purchase_cost) || 0) * item.quantity;
          }
        }
        if (totalCogs > 0) {
          await client.query(
            `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit)
             VALUES (gen_random_uuid(), $1, $2, $3, 0), (gen_random_uuid(), $1, $4, 0, $3)`,
            [journalId, hppAcct.rows[0].id, totalCogs, inventoryAcct.rows[0].id],
          );
        }
      }
    }

    // ── 5i. Audit log ──
    await client.query(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, details)
       VALUES (gen_random_uuid(), $1, $2, 'POS_SALE', $3)`,
      [
        tenantId, userId,
        `Transaksi ${invoiceNo} — Rp${grandTotal.toLocaleString("id-ID")} (${parsed.paymentMethod}) — ${items.length} item`,
      ],
    );

    return { id: txId, invoiceNo, grandTotal: Number(grandTotal), timestamp: txRes.rows[0].timestamp, items };
  });
    result = resultTx;
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }

  res.status(201).json({ data: result, message: "Transaksi POS berhasil." });
};

// ──────────────────────────────────────────
// 6. VOID SALE (with stock restoration + reversal journal + audit)
// ──────────────────────────────────────────
export const voidSale = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const userId = req.authActor?.userId;
  const { id } = req.params;
  const { reason } = req.validatedBody;

  if (!branchId) {
    return res.status(422).json({ error: "branchId wajib diisi untuk membatalkan transaksi POS." });
  }

  try {
    const result = await dbTransaction(async (client) => {
      // Find the transaction
      const txRes = await client.query(
        `SELECT id, invoice_no as "invoiceNo", items, grand_total as "grandTotal",
                subtotal, discount_amount as "discountAmount", tax_amount as "taxAmount",
                payment_method as "paymentMethod", is_refunded, shift_id as "shiftId"
         FROM pos_transactions WHERE id=$1 AND tenant_id=$2 AND branch_id=$3 FOR UPDATE`,
        [id, tenantId, branchId],
      );
      if (txRes.rows.length === 0) {
        const error: any = new Error("Transaksi tidak ditemukan.");
        error.status = 404;
        throw error;
      }
      const tx = txRes.rows[0];
      if (tx.is_refunded) {
        const error: any = new Error("Transaksi sudah dibatalkan sebelumnya.");
        error.status = 409;
        throw error;
      }

      // Mark as refunded
      await client.query(
        `UPDATE pos_transactions SET is_refunded=TRUE, status='VOIDED', voided_at=NOW(),
         void_reason=$1 WHERE id=$2`,
        [reason, id],
      );

      // Restore stock + log stock movements
      const warehouseRes = await client.query(
        `SELECT id FROM warehouses WHERE branch_id=$1 AND tenant_id=$2 LIMIT 1`,
        [branchId, tenantId],
      );
      const defaultWarehouseId = warehouseRes.rows[0]?.id;
      for (const item of tx.items) {
        if (item.productId) {
          const restoreWarehouseId = item.warehouseId || defaultWarehouseId;
          if (!restoreWarehouseId) continue;
          await client.query(
            `UPDATE product_stock SET quantity = quantity + $1
             WHERE product_id=$2 AND warehouse_id=$3`,
            [item.quantity, item.productId, restoreWarehouseId],
          );
          await client.query(
            `INSERT INTO stock_movements (id, tenant_id, warehouse_id, product_id, type, quantity_change, reference_id, notes)
             VALUES (gen_random_uuid(), $1, $2, $3, 'POS_REFUND', $4, $5, $6)`,
            [tenantId, restoreWarehouseId, item.productId, item.quantity, id, `Refund ${item.name} x${item.quantity}: ${reason}`],
          );
        }
      }

      // Reversal journal
      const journalRes = await client.query(
        `INSERT INTO journal_entries (id, tenant_id, branch_id, description, reference_no)
         VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING id`,
        [tenantId, branchId, `VOID Transaksi ${tx.invoiceNo}: ${reason}`, `REV-${tx.invoiceNo}`],
      );
      const journalId = journalRes.rows[0].id;

      const cashAcct = await client.query(`SELECT id FROM coa_accounts WHERE tenant_id=$1 AND code='10100' LIMIT 1`, [tenantId]);
      const salesAcct = await client.query(`SELECT id FROM coa_accounts WHERE tenant_id=$1 AND code='40100' LIMIT 1`, [tenantId]);
      const taxAcct = await client.query(`SELECT id FROM coa_accounts WHERE tenant_id=$1 AND code='20100' LIMIT 1`, [tenantId]);

      // Validate accounts before inserting journal lines
      if (!cashAcct.rows[0] || !salesAcct.rows[0]) {
        const error: any = new Error("Akun kas (10100) atau penjualan (40100) belum dikonfigurasi.");
        error.status = 422;
        throw error;
      }

      // Credit: Cash (reversal)
      await client.query(
        `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit)
         VALUES (gen_random_uuid(), $1, $2, 0, $3)`,
        [journalId, cashAcct.rows[0].id, tx.grandTotal],
      );
      // Debit: Revenue reversal
      await client.query(
        `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit)
         VALUES (gen_random_uuid(), $1, $2, $3, 0)`,
        [journalId, salesAcct.rows[0].id, tx.subtotal - tx.discountAmount],
      );
      // Debit: Tax reversal
      if (taxAcct.rows[0] && tx.taxAmount > 0) {
        await client.query(
          `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit)
           VALUES (gen_random_uuid(), $1, $2, $3, 0)`,
          [journalId, taxAcct.rows[0].id, tx.taxAmount],
        );
      }

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (id, tenant_id, user_id, action, details)
         VALUES (gen_random_uuid(), $1, $2, 'POS_VOID', $3)`,
        [tenantId, userId, `VOID ${tx.invoiceNo}: ${reason} — Rp${tx.grandTotal.toLocaleString("id-ID")}`],
      );

      return { id: tx.id, invoiceNo: tx.invoiceNo, status: "VOIDED" };
    });

    res.json({ data: result, message: "Transaksi berhasil dibatalkan. Stok telah dikembalikan." });
  } catch (err: any) {
    logger.error({ err: err.message, id, tenantId }, "[pos.voidSale] Failed to void transaction");
    res.status(err.status || 500).json({ error: err.message || "Failed to void transaction." });
  }
};

// ──────────────────────────────────────────
// 7. LIST SALES
// ──────────────────────────────────────────

export const getSales = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const { paymentMethod, customerId, shiftId } = req.query;

  const conditions: string[] = ["tenant_id = $1", "branch_id = $2"];
  const params: any[] = [tenantId, branchId];
  let idx = 3;

  if (paymentMethod) { conditions.push(`payment_method = $${idx++}`); params.push((paymentMethod as string).toUpperCase()); }
  if (customerId) { conditions.push(`customer_id = $${idx++}`); params.push(customerId); }
  if (shiftId) { conditions.push(`shift_id = $${idx++}`); params.push(shiftId); }

  const where = conditions.join(" AND ");
  try {
    const result = await dbQuery(
      `SELECT id, tenant_id as "tenantId", branch_id as "branchId", shift_id as "shiftId",
              invoice_no as "invoiceNo", customer_id as "customerId", items,
              subtotal, discount_amount as "discountAmount", tax_amount as "taxAmount",
              grand_total as "grandTotal", payment_method as "paymentMethod",
              amount_paid as "amountPaid", change_amount as "changeAmount",
              is_refunded as "isRefunded", status, void_reason as "voidReason",
              created_at as "timestamp"
       FROM pos_transactions WHERE ${where}
       ORDER BY created_at DESC LIMIT 500`,
      params,
    );
    res.json({ data: result.rows, meta: { total: result.rows.length, tenantId, branchId } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ──────────────────────────────────────────
// 8. GET SALE BY ID
// ──────────────────────────────────────────

export const getSaleById = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const { id } = req.params;
  try {
    const result = await dbQuery(
      `SELECT id, tenant_id as "tenantId", branch_id as "branchId", shift_id as "shiftId",
              invoice_no as "invoiceNo", customer_id as "customerId", items,
              subtotal, discount_amount as "discountAmount", tax_amount as "taxAmount",
              grand_total as "grandTotal", payment_method as "paymentMethod",
              amount_paid as "amountPaid", change_amount as "changeAmount",
              is_refunded as "isRefunded", status, void_reason as "voidReason",
              voided_at as "voidedAt", deposit_used as "depositUsed",
              payment_details as "paymentDetails", notes,
              created_at as "timestamp"
       FROM pos_transactions WHERE id=$1 AND tenant_id=$2 AND branch_id=$3 LIMIT 1`,
      [id, tenantId, branchId],
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Transaksi tidak ditemukan." });
    res.json({ data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
