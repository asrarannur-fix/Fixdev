/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POS Controller — Dedicated server-side POS endpoints.
 * Handles shift management, checkout with journal + stock movements,
 * void/refund, and shift summary (X/Z-report).
 */
import { z } from 'zod';
import { dbQuery, dbTransaction, getPool } from '../../lib/db.js';
import { logger } from '../../lib/logger.js';
import { paymentDebitAccountCode, ensureAccount } from '../lib/coa.js';
import {
  processPOSTransaction,
  processPartialRefund,
  saveHoldCart,
  recallHoldCart,
  deleteHoldCart,
  validateVoucher,
  getReceiptData,
  getPOSAnalytics,
} from '../../services/posService.js';

// ──────────────────────────────────────────
// ZOD SCHEMAS
// ──────────────────────────────────────────

export const openShiftSchema = z.object({
  startingCash: z.number().nonnegative({ message: 'Saldo awal tidak boleh negatif.' }),
});

export const closeShiftSchema = z.object({
  actualEndingCash: z.number().nonnegative({ message: 'Saldo akhir aktual tidak boleh negatif.' }),
  notes: z.string().max(500).optional().nullable(),
});

export const posSaleSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid().optional().nullable(),
        name: z.string().optional(),
        quantity: z.number().int().positive({ message: 'Quantity minimal 1.' }),
        unitPrice: z.number().nonnegative().optional(),
        discount: z.number().nonnegative().optional().default(0),
      })
    )
    .min(1, { message: 'Minimal 1 item.' }),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'QRIS', 'EDC', 'E_WALLET', 'DEPOSIT', 'TEMPO']),
  amountPaid: z.number().nonnegative().optional(),
  discountAmount: z.number().nonnegative().optional().default(0),
  depositUsed: z.number().nonnegative().optional().default(0),
  paymentDetails: z.string().max(500).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  // Split payment support
  splitPayments: z
    .array(
      z.object({
        method: z.enum(['CASH', 'BANK_TRANSFER', 'QRIS', 'EDC', 'E_WALLET', 'DEPOSIT']),
        amount: z.number().positive(),
      })
    )
    .optional()
    .nullable(),
});

export const voidSaleSchema = z.object({
  reason: z
    .string()
    .min(3, { message: 'Alasan pembatalan wajib diisi (min 3 karakter).' })
    .max(500),
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
          const path = e.path.join('.');
          if (!errors[path]) errors[path] = [];
          errors[path].push(e.message);
        });
        return res.status(422).json({ message: 'The given data was invalid.', errors });
      }
      next(err);
    }
  };
};

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
      [tenantId, branchId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        message: 'Shift kasir sudah dibuka. Tutup shift terlebih dahulu sebelum membuka yang baru.',
        existingShiftId: existing.rows[0].id,
      });
    }

    const result = await dbQuery(
      `INSERT INTO pos_shifts (tenant_id, branch_id, cashier_id, starting_cash, status)
       VALUES ($1, $2, $3, $4, 'OPEN')
       RETURNING id, tenant_id as "tenantId", branch_id as "branchId", cashier_id as "cashierId",
                 opened_at as "openedAt", starting_cash as "startingCash", status`,
      [tenantId, branchId, userId, startingCash]
    );

    // Audit log
    await dbQuery(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, details)
       VALUES (gen_random_uuid(), $1, $2, 'POS_SHIFT_OPEN', $3)`,
      [
        tenantId,
        userId,
        `Membuka shift kasir dengan saldo awal Rp${startingCash.toLocaleString('id-ID')}`,
      ]
    );

    res.status(201).json({ data: result.rows[0], message: 'Shift kasir berhasil dibuka.' });
  } catch (err: any) {
    logger.error({ err: err.message, tenantId, branchId }, 'POS openShift error');
    res.status(500).json({ error: 'Operasi POS gagal diproses.' });
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
      [tenantId, branchId, userId]
    );
    if (shiftRes.rows.length === 0) {
      return res.status(404).json({ message: 'Tidak ada shift kasir aktif yang ditemukan.' });
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
      [shiftId, tenantId]
    );

    const agg = salesAgg.rows[0];
    const expectedEndingCash =
      Number(shift.startingCash) + Number(agg.totalCashSales) - Number(agg.totalRefunds);
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
      [expectedEndingCash, actualEndingCash, difference, notes || null, shiftId, tenantId]
    );

    // Audit log (HIGH severity if discrepancy)
    await dbQuery(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, details)
       VALUES (gen_random_uuid(), $1, $2, 'POS_SHIFT_CLOSE', $3)`,
      [
        tenantId,
        userId,
        `Menutup shift. Kas aktual: Rp${actualEndingCash.toLocaleString('id-ID')}, ` +
          `Ekspektasi: Rp${expectedEndingCash.toLocaleString('id-ID')}, Selisih: Rp${difference.toLocaleString('id-ID')}` +
          (difference !== 0 ? ' ⚠️ SELISIH' : ''),
      ]
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
      message: 'Shift kasir berhasil ditutup.',
    });
  } catch (err: any) {
    logger.error({ err: err.message, tenantId, branchId }, 'POS closeShift error');
    res.status(500).json({ error: 'Operasi POS gagal diproses.' });
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
      [id, tenantId, branchId]
    );
    if (shiftRes.rows.length === 0) {
      return res.status(404).json({ message: 'Shift tidak ditemukan.' });
    }

    const shift = shiftRes.rows[0];

    // Payment method breakdown
    const paymentBreakdown = await dbQuery(
      `SELECT payment_method AS "paymentMethod", COUNT(*)::int AS count,
              COALESCE(SUM(grand_total), 0)::numeric AS total
       FROM pos_transactions WHERE shift_id=$1 AND tenant_id=$2 AND is_refunded = FALSE
       GROUP BY payment_method ORDER BY total DESC`,
      [id, tenantId]
    );

    // Hourly breakdown
    const hourlySales = await dbQuery(
      `SELECT EXTRACT(HOUR FROM timestamp)::int AS hour, COUNT(*)::int AS count,
              COALESCE(SUM(grand_total), 0)::numeric AS total
       FROM pos_transactions WHERE shift_id=$1 AND tenant_id=$2 AND is_refunded = FALSE
       GROUP BY EXTRACT(HOUR FROM timestamp) ORDER BY hour`,
      [id, tenantId]
    );

    // Refund count
    const refundCount = await dbQuery(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(grand_total), 0)::numeric AS total
       FROM pos_transactions WHERE shift_id=$1 AND tenant_id=$2 AND is_refunded = TRUE`,
      [id, tenantId]
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
    logger.error({ err: err.message, tenantId }, 'POS getShiftSummary error');
    res.status(500).json({ error: 'Operasi POS gagal diproses.' });
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
    const conditions = ['tenant_id = $1', 'branch_id = $2'];
    const params: any[] = [tenantId, branchId];
    let idx = 3;
    if (status) {
      conditions.push(`status = $${idx++}`);
      params.push((status as string).toUpperCase());
    }
    const where = conditions.join(' AND ');
    const result = await dbQuery(
      `SELECT id, tenant_id as "tenantId", branch_id as "branchId", cashier_id as "cashierId",
              opened_at as "openedAt", closed_at as "closedAt", starting_cash as "startingCash",
              expected_ending_cash as "expectedEndingCash", actual_ending_cash as "actualEndingCash",
              difference, status, notes
       FROM pos_shifts WHERE ${where} ORDER BY opened_at DESC LIMIT 100`,
      params
    );
    res.json({ data: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Operasi POS gagal diproses.' });
  }
};

// ──────────────────────────────────────────
// 5. CREATE SALE (checkout — atomic: transaction + stock + journal + audit)
// ──────────────────────────────────────────

// ──────────────────────────────────────────
// 5. POS SERVICE DELEGATION (createSale uses processPOSTransaction from posService)
// ──────────────────────────────────────────

export const partialRefundSchema = z.object({
  items: z
    .array(
      z.object({
        itemIndex: z.number().int().min(0),
        quantity: z.number().int().positive({ message: 'Quantity refund minimal 1.' }),
        reason: z.string().min(3, { message: 'Alasan minimal 3 karakter.' }).max(500),
      })
    )
    .min(1, { message: 'Minimal 1 item untuk di-refund.' }),
});

export const holdCartSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid().optional().nullable(),
        name: z.string().optional(),
        quantity: z.number().int().positive({ message: 'Quantity minimal 1.' }),
        unitPrice: z.number().nonnegative().optional(),
        discount: z.number().nonnegative().optional().default(0),
      })
    )
    .min(1, { message: 'Minimal 1 item.' }),
  discountAmount: z.number().nonnegative().optional().default(0),
  depositUsed: z.number().nonnegative().optional().default(0),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'QRIS', 'EDC', 'E_WALLET', 'DEPOSIT', 'TEMPO']),
  paymentDetails: z.string().max(500).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const applyVoucherSchema = z.object({
  code: z.string().min(1, { message: 'Kode voucher wajib diisi.' }).max(50),
});

export const receiptPrintSchema = z.object({
  format: z.enum(['THERMAL', 'A4']).optional().default('THERMAL'),
});

// ──────────────────────────────────────────
// 5. CREATE SALE (delegated to posService.processPOSTransaction)
// ──────────────────────────────────────────

export const createSale = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const userId = req.authActor?.userId;
  const parsed = req.validatedBody;

  if (!branchId)
    return res.status(422).json({ error: 'branchId wajib diisi untuk transaksi POS.' });
  try {
    const result = await dbTransaction(async (client) => {
      return processPOSTransaction(client, { tenantId, branchId, userId, parsed });
    });
    res.status(201).json({ data: result, message: 'Transaksi POS berhasil.' });
  } catch (err: any) {
    logger.error(
      { err: err.message, stack: err.stack, tenantId, branchId },
      '[pos.createSale] Error'
    );
    res
      .status(err.status || 500)
      .json({ error: err.status ? err.message : 'Operasi POS gagal diproses.' });
  }
};
export const voidSale = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const userId = req.authActor?.userId;
  const { id } = req.params;
  const { reason } = req.validatedBody;

  if (!branchId) {
    return res.status(422).json({ error: 'branchId wajib diisi untuk membatalkan transaksi POS.' });
  }

  try {
    const result = await dbTransaction(async (client) => {
      // Find the transaction
      const txRes = await client.query(
        `SELECT id, invoice_no as "invoiceNo", items, grand_total as "grandTotal",
                subtotal, discount_amount as "discountAmount", tax_amount as "taxAmount",
                payment_method as "paymentMethod", is_refunded, shift_id as "shiftId"
         FROM pos_transactions WHERE id=$1 AND tenant_id=$2 AND branch_id=$3 FOR UPDATE`,
        [id, tenantId, branchId]
      );
      if (txRes.rows.length === 0) {
        const error: any = new Error('Transaksi tidak ditemukan.');
        error.status = 404;
        throw error;
      }
      const tx = txRes.rows[0];
      if (tx.is_refunded) {
        const error: any = new Error('Transaksi sudah dibatalkan sebelumnya.');
        error.status = 409;
        throw error;
      }

      // Mark as refunded
      await client.query(
        `UPDATE pos_transactions SET is_refunded=TRUE, status='VOIDED', voided_at=NOW(),
         void_reason=$1 WHERE id=$2`,
        [reason, id]
      );

      const warehouseRes = await client.query(
        `SELECT id FROM warehouses WHERE branch_id=$1 AND tenant_id=$2 LIMIT 1`,
        [branchId, tenantId]
      );
      const defaultWarehouseId = warehouseRes.rows[0]?.id;
      if (!defaultWarehouseId) {
        throw new Error('Gudang cabang tidak dikonfigurasi — tidak bisa mengembalikan stok.');
      }
      for (const item of tx.items) {
        if (item.productId) {
          const restoreWarehouseId = item.warehouseId || defaultWarehouseId;
          const stockRestore = await client.query(
            `UPDATE product_stock SET quantity = quantity + $1
             WHERE product_id=$2 AND warehouse_id=$3`,
            [item.quantity, item.productId, restoreWarehouseId]
          );
          if (stockRestore.rowCount !== 1) {
            throw new Error(`Gagal mengembalikan stok ${item.name}. Data stok tidak ditemukan.`);
          }
          await client.query(
            `INSERT INTO stock_movements (id, tenant_id, warehouse_id, product_id, type, quantity, reference_no, note)
             VALUES (gen_random_uuid(), $1, $2, $3, 'POS_REFUND', $4, $5, $6)`,
            [
              tenantId,
              restoreWarehouseId,
              item.productId,
              item.quantity,
              id,
              `Refund ${item.name} x${item.quantity}: ${reason}`,
            ]
          );
        }
      }

      const journalRes = await client.query(
        `INSERT INTO journal_entries (id, tenant_id, branch_id, description, reference_no, source_type, created_by)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'POS_VOID', $5) RETURNING id`,
        [
          tenantId,
          branchId,
          `VOID Transaksi ${tx.invoiceNo}: ${reason}`,
          `REV-${tx.invoiceNo}`,
          userId,
        ]
      );
      const journalId = journalRes.rows[0].id;

      const voidDebitCode = paymentDebitAccountCode(tx.paymentMethod);
      const voidDebitAcctId = await ensureAccount(client, tenantId, voidDebitCode);
      const salesAcct = await client.query(
        `SELECT id FROM coa_accounts WHERE tenant_id=$1 AND code='40100' LIMIT 1`,
        [tenantId]
      );
      const taxAcct = await client.query(
        `SELECT id FROM coa_accounts WHERE tenant_id=$1 AND code='20100' LIMIT 1`,
        [tenantId]
      );

      // Validate accounts before inserting journal lines
      if (!salesAcct.rows[0]) {
        const error: any = new Error('Akun penjualan (40100) belum dikonfigurasi.');
        error.status = 422;
        throw error;
      }

      // Credit: Cash/Bank/Piutang (reversal — use same account as original sale)
      await client.query(
        `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit)
         VALUES (gen_random_uuid(), $1, $2, 0, $3)`,
        [journalId, voidDebitAcctId, tx.grandTotal]
      );
      // Debit: Revenue reversal
      await client.query(
        `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit)
         VALUES (gen_random_uuid(), $1, $2, $3, 0)`,
        [journalId, salesAcct.rows[0].id, tx.subtotal - tx.discountAmount]
      );
      // Debit: Tax reversal
      if (taxAcct.rows[0] && tx.taxAmount > 0) {
        await client.query(
          `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit)
           VALUES (gen_random_uuid(), $1, $2, $3, 0)`,
          [journalId, taxAcct.rows[0].id, tx.taxAmount]
        );
      }

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (id, tenant_id, user_id, action, details)
         VALUES (gen_random_uuid(), $1, $2, 'POS_VOID', $3)`,
        [
          tenantId,
          userId,
          `VOID ${tx.invoiceNo}: ${reason} — Rp${tx.grandTotal.toLocaleString('id-ID')}`,
        ]
      );

      return { id: tx.id, invoiceNo: tx.invoiceNo, status: 'VOIDED' };
    });

    res.json({
      data: result,
      message: 'Transaksi berhasil dibatalkan. Stok telah dikembalikan.',
    });
  } catch (err: any) {
    logger.error({ err: err.message, id, tenantId }, '[pos.voidSale] Failed to void transaction');
    res
      .status(err.status || 500)
      .json({ error: err.status ? err.message : 'Transaksi gagal dibatalkan.' });
  }
};

// ──────────────────────────────────────────
// 7. LIST SALES
// ──────────────────────────────────────────

export const getSales = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const { paymentMethod, customerId, shiftId, page, limit } = req.query;

  const conditions: string[] = ['tenant_id = $1', 'branch_id = $2'];
  const params: any[] = [tenantId, branchId];
  let idx = 3;

  if (paymentMethod) {
    conditions.push(`payment_method = $${idx++}`);
    params.push((paymentMethod as string).toUpperCase());
  }
  if (customerId) {
    conditions.push(`customer_id = $${idx++}`);
    params.push(customerId);
  }
  if (shiftId) {
    conditions.push(`shift_id = $${idx++}`);
    params.push(shiftId);
  }

  const where = conditions.join(' AND ');
  const pageSize = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const currentPage = Math.max(Number(page) || 1, 1);
  const offset = (currentPage - 1) * pageSize;

  try {
    const countRes = await dbQuery(
      `SELECT COUNT(*)::int AS total FROM pos_transactions WHERE ${where}`,
      params
    );
    const total = countRes.rows[0]?.total ?? 0;

    const result = await dbQuery(
      `SELECT id, tenant_id as "tenantId", branch_id as "branchId", shift_id as "shiftId",
              invoice_no as "invoiceNo", customer_id as "customerId", items,
              subtotal, discount_amount as "discountAmount", tax_amount as "taxAmount",
              grand_total as "grandTotal", payment_method as "paymentMethod",
              amount_paid as "amountPaid", change_amount as "changeAmount",
              is_refunded as "isRefunded", status, void_reason as "voidReason",
              created_at as "timestamp"
       FROM pos_transactions WHERE ${where}
       ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset]
    );
    res.json({
      data: result.rows,
      meta: {
        total,
        page: currentPage,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
        tenantId,
        branchId,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Operasi POS gagal diproses.' });
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
      [id, tenantId, branchId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });
    res.json({ data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Operasi POS gagal diproses.' });
  }
};

// ──────────────────────────────────────────
// 9. PARTIAL REFUND
// ──────────────────────────────────────────

export const partialRefund = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const userId = req.authActor?.userId;
  const { id } = req.params;
  const parsed = req.validatedBody;

  try {
    const result = await dbTransaction(async (client) => {
      return processPartialRefund(client, tenantId, branchId, userId, id, parsed);
    });
    res.json({
      data: result,
      message: `Partial refund Rp${result.refundAmount.toLocaleString('id-ID')} berhasil diproses.`,
    });
  } catch (err: any) {
    logger.error({ err: err.message, id, tenantId }, '[pos.partialRefund] Error');
    res
      .status(err.status || 500)
      .json({ error: err.status ? err.message : 'Refund parsial gagal diproses.' });
  }
};

// ──────────────────────────────────────────
// 10. HOLD CART
// ──────────────────────────────────────────

export const holdCart = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const userId = req.authActor?.userId;
  const { id } = req.params;
  const parsed = req.validatedBody;

  try {
    const holdId = await dbTransaction(async (client) => {
      return saveHoldCart(client, tenantId, branchId, id || null, userId, parsed);
    });
    res.status(201).json({ data: { holdId }, message: 'Keranjang ditahan (hold) successfully.' });
  } catch (err: any) {
    logger.error({ err: err.message, tenantId, branchId }, '[pos.holdCart] Error');
    res.status(500).json({ error: 'Gagal menahan keranjang.' });
  }
};

// ──────────────────────────────────────────
// 11. RECALL HOLD CART
// ──────────────────────────────────────────

export const recallHold = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const { id } = req.params;

  try {
    const result = await dbTransaction(async (client) => {
      return recallHoldCart(client, tenantId, branchId, id);
    });
    if (!result) {
      return res.status(404).json({ message: 'Hold tidak ditemukan atau sudah di-recall.' });
    }
    res.json({ data: result });
  } catch (err: any) {
    res.status(500).json({ error: 'Operasi POS gagal diproses.' });
  }
};

// ──────────────────────────────────────────
// 12. DELETE HOLD CART
// ──────────────────────────────────────────

export const deleteHold = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const { id } = req.params;

  try {
    await dbTransaction(async (client) => {
      return deleteHoldCart(client, tenantId, branchId, id);
    });
    res.json({ message: 'Hold berhasil dihapus.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Operasi POS gagal diproses.' });
  }
};

// ──────────────────────────────────────────
// 13. APPLY VOUCHER
// ──────────────────────────────────────────

export const applyVoucher = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const { code } = req.validatedBody;

  try {
    const result = await dbTransaction(async (client) => {
      return validateVoucher(client, tenantId, code);
    });
    res.json({ data: result });
  } catch (err: any) {
    res.status(500).json({ error: 'Validasi voucher gagal.' });
  }
};

// ──────────────────────────────────────────
// 14. PRINT RECEIPT (reprint)
// ──────────────────────────────────────────

export const reprintReceipt = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const { id } = req.params;

  try {
    const result = await dbTransaction(async (client) => {
      return getReceiptData(client, tenantId, branchId, id);
    });
    if (!result) {
      return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });
    }
    res.json({ data: result });
  } catch (err: any) {
    res.status(500).json({ error: 'Operasi POS gagal diproses.' });
  }
};

// ──────────────────────────────────────────
// 15. POS ANALYTICS
// ──────────────────────────────────────────

export const posAnalytics = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const { days } = req.query;

  try {
    const result = await dbTransaction(async (client) => {
      return getPOSAnalytics(client, tenantId, branchId, Number(days) || 30);
    });
    res.json({ data: result });
  } catch (err: any) {
    res.status(500).json({ error: 'Operasi POS gagal diproses.' });
  }
};
