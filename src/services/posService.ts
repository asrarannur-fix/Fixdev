import type { PoolClient } from 'pg';
import { paymentDebitAccountCode, ensureAccount } from '../server/lib/coa.js';

export interface CreatePOSInput {
  customerId?: string | null;
  items: Array<{
    productId?: string | null;
    name?: string;
    quantity: number;
    unitPrice?: number;
    discount?: number;
  }>;
  paymentMethod: string;
  amountPaid?: number;
  discountAmount?: number;
  depositUsed?: number;
  paymentDetails?: string | null;
  notes?: string | null;
  splitPayments?: Array<{ method: string; amount: number }> | null;
}

export interface POSTransactionResult {
  id: string;
  invoiceNo: string;
  grandTotal: number;
  timestamp: string;
  items: any[];
}

export interface POSReceiptData {
  id: string;
  invoiceNo: string;
  tenantId: string;
  branchId: string;
  shiftId: string;
  customerId: string | null;
  items: any[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  paymentMethod: string;
  amountPaid: number;
  changeAmount: number;
  depositUsed: number;
  isRefunded: boolean;
  status: string;
  voidReason: string | null;
  voidedAt: string | null;
  postedToLedger: boolean;
  createdAt: string;
}

export interface HoldCartData {
  id: string;
  tenantId: string;
  branchId: string;
  shiftId: string | null;
  customerId: string | null;
  items: any[];
  discountAmount: number;
  depositUsed: number;
  paymentMethod: string;
  paymentDetails: string | null;
  notes: string | null;
  recalledAt: string | null;
  createdAt: string;
}

export interface ReceivableEntry {
  id: string;
  tenantId: string;
  branchId: string;
  transactionId: string;
  invoiceNo: string;
  customerId: string | null;
  amount: number;
  dueAt: string | null;
  status: 'RECEIVABLE' | 'PAID' | 'OVERDUE';
  paidAt: string | null;
  createdAt: string;
}

export interface DiscountVoucherInput {
  tenantId: string;
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  maxDiscount: number | null;
  minPurchase: number;
  maxUses: number;
  validFrom: string;
  validUntil?: string | null;
}

export interface VoucherValidationResult {
  valid: boolean;
  voucherId?: string;
  discountAmount: number;
  message: string;
}

export interface AnalyticsSummary {
  period: string;
  totalSales: number;
  totalTransactions: number;
  totalRefunds: number;
  totalRevenue: number;
  totalTax: number;
  totalDiscount: number;
  byPaymentMethod: Record<string, { count: number; total: number }>;
  topProducts: Array<{ productId: string; name: string; quantity: number; revenue: number }>;
  hourlyBreakdown: Array<{ hour: number; count: number; total: number }>;
}

// ── Core POS Transaction Processor ──────────────────────────────────────────

export async function processPOSTransaction(
  client: PoolClient,
  {
    tenantId,
    branchId,
    userId,
    parsed,
  }: {
    tenantId: string;
    branchId: string;
    userId: string;
    parsed: CreatePOSInput;
  }
): Promise<POSTransactionResult> {
  // Find active shift
  const shiftRes = await client.query(
    `SELECT id FROM pos_shifts WHERE tenant_id=$1 AND branch_id=$2 AND cashier_id=$3 AND status='OPEN' ORDER BY opened_at DESC LIMIT 1`,
    [tenantId, branchId, userId]
  );
  if (shiftRes.rows.length === 0) {
    throw Object.assign(new Error('Tidak ada shift kasir aktif. Buka shift terlebih dahulu.'), {
      status: 422,
    });
  }
  const shiftId = shiftRes.rows[0].id;

  // Resolve warehouse + prices
  const warehouseRes = await client.query(
    `SELECT id FROM warehouses WHERE branch_id=$1 AND tenant_id=$2 LIMIT 1`,
    [branchId, tenantId]
  );
  const warehouseId = warehouseRes.rows[0]?.id;
  if (!warehouseId) {
    throw Object.assign(
      new Error(
        'Gudang tidak ditemukan untuk cabang ini. Hubungi admin agar gudang cabang dikonfigurasi terlebih dahulu.'
      ),
      { status: 422 }
    );
  }

  // Pre-sale stock availability check
  const outOfStock: string[] = [];
  for (const i of parsed.items) {
    if (i.productId) {
      const stockCheck = await client.query(
        `SELECT p.name, ps.quantity
         FROM products p
         JOIN product_stock ps ON ps.product_id = p.id
         WHERE p.id = $1 AND p.tenant_id = $2 AND ps.warehouse_id = $3`,
        [i.productId, tenantId, warehouseId]
      );
      if (stockCheck.rows.length === 0) {
        outOfStock.push(i.name || i.productId);
      } else {
        const available = Number(stockCheck.rows[0].quantity) || 0;
        if (available < (Number(i.quantity) || 1)) {
          const name = stockCheck.rows[0].name || i.name || i.productId;
          outOfStock.push(`${name} (tersedia ${available}, diminta ${i.quantity})`);
        }
      }
    }
  }
  if (outOfStock.length > 0) {
    throw Object.assign(new Error('Stok tidak mencukupi: ' + outOfStock.join('; ')), {
      status: 422,
    });
  }

  let subtotal = 0;
  const items: any[] = [];
  for (const i of parsed.items) {
    let price = 0;
    let productName = i.name || 'Item';
    if (i.productId) {
      const prodRes = await client.query(
        `SELECT name, sell_price FROM products WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
        [i.productId, tenantId]
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
      tax: 0,
      total: lineSub - disc,
      warehouseId,
    });
  }

  // Apply voucher discount
  let voucherDiscount = 0;
  if (parsed.paymentDetails && parsed.paymentDetails.startsWith('VOUCHER:')) {
    const voucherCode = parsed.paymentDetails.replace('VOUCHER:', '');
    const voucherRes = await client.query(
      `SELECT discount_type, discount_value, max_discount, min_purchase FROM discount_vouchers
       WHERE tenant_id=$1 AND code=$2 AND is_active=TRUE
       AND valid_from <= NOW() AND (valid_until IS NULL OR valid_until > NOW())
       AND used_count < max_uses FOR UPDATE`,
      [tenantId, voucherCode]
    );
    if (voucherRes.rows.length === 0) {
      throw Object.assign(new Error(`Voucher "${voucherCode}" tidak valid atau sudah habis.`), {
        status: 422,
      });
    }
    const v = voucherRes.rows[0];
    if (subtotal < v.min_purchase) {
      throw Object.assign(
        new Error(
          `Minimal pembelian Rp${v.min_purchase.toLocaleString('id-ID')} untuk voucher ini.`
        ),
        { status: 422 }
      );
    }
    let calcDisc =
      v.discount_type === 'PERCENT'
        ? Math.round(subtotal * (Number(v.discount_value) / 100))
        : Number(v.discount_value);
    if (v.max_discount !== null && calcDisc > Number(v.max_discount)) {
      calcDisc = Number(v.max_discount);
    }
    voucherDiscount = calcDisc;
    await client.query(`UPDATE discount_vouchers SET used_count = used_count + 1 WHERE id = $1`, [
      voucherRes.rows[0].id,
    ]);
  }

  // Apply global discount from POS UI
  const globalDisc = Number(parsed.discountAmount) || 0;
  const totalDisc = globalDisc + voucherDiscount;
  const base = Math.max(0, subtotal - totalDisc);

  // Read tax rate
  const tenantRes = await client.query(`SELECT settings FROM tenants WHERE id=$1 LIMIT 1`, [
    tenantId,
  ]);
  const taxRate = tenantRes.rows[0]?.settings?.taxSettings?.taxRate ?? 11;
  const taxAmount = Math.round((base * taxRate) / 100);
  const grandTotal = base + taxAmount;

  // Handle payments
  const depositUsed = Math.min(grandTotal, Math.max(0, Number(parsed.depositUsed) || 0));
  const cashDue = Math.max(0, grandTotal - depositUsed);
  const amountPaid = Math.max(0, Number(parsed.amountPaid) || (depositUsed ? 0 : grandTotal));
  const changeAmount = Math.max(0, amountPaid - cashDue);

  // Validate split payments
  const splitPayments = Array.isArray(parsed.splitPayments) ? parsed.splitPayments : null;
  if (splitPayments && splitPayments.length > 0) {
    const splitTotal = splitPayments.reduce((s, p) => s + Number(p.amount), 0);
    if (Math.abs(splitTotal - grandTotal) > 1) {
      throw Object.assign(
        new Error(
          `Total split payment (Rp${splitTotal.toLocaleString('id-ID')}) tidak sesuai grand total (Rp${grandTotal.toLocaleString('id-ID')}).`
        ),
        { status: 422 }
      );
    }
  }

  // Generate invoice with advisory lock
  const year = new Date().getFullYear();
  await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [tenantId]);
  const seqRes = await client.query(
    `SELECT COUNT(*)::int AS cnt FROM pos_transactions WHERE EXTRACT(YEAR FROM created_at)=$1`,
    [year]
  );
  const invoiceNo = `INV/POS/${year}/${((seqRes.rows[0]?.cnt ?? 0) + 1).toString().padStart(5, '0')}`;

  // Insert transaction
  const txRes = await client.query(
    `INSERT INTO pos_transactions
     (tenant_id, branch_id, shift_id, invoice_no, customer_id, items, subtotal,
      discount_amount, tax_amount, grand_total, payment_method, amount_paid,
      change_amount, deposit_used, payment_details, notes, is_refunded, posted_to_ledger, status)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,FALSE,FALSE,'COMPLETED')
     RETURNING id, invoice_no as "invoiceNo", grand_total as "grandTotal", created_at as "timestamp"`,
    [
      tenantId,
      branchId,
      shiftId,
      invoiceNo,
      parsed.customerId || null,
      JSON.stringify(items),
      subtotal,
      totalDisc,
      taxAmount,
      grandTotal,
      parsed.paymentMethod,
      amountPaid,
      changeAmount,
      depositUsed,
      parsed.paymentDetails || null,
      parsed.notes || null,
    ]
  );
  const txId = txRes.rows[0].id;

  // Deduct stock + log stock movements (FOR UPDATE on stock read omitted for performance; UPDATE WHERE is atomic)
  for (const item of items) {
    if (item.productId && warehouseId) {
      const stockUpdate = await client.query(
        `UPDATE product_stock SET quantity = quantity - $1
         WHERE product_id=$2 AND warehouse_id=$3 AND quantity >= $1`,
        [item.quantity, item.productId, warehouseId]
      );
      if (stockUpdate.rowCount !== 1) {
        throw new Error('Stok tidak mencukupi atau produk tidak ditemukan di gudang.');
      }
      await client.query(
        `INSERT INTO stock_movements (id, tenant_id, warehouse_id, product_id, type, quantity, reference_no, note)
         VALUES (gen_random_uuid(), $1, $2, $3, 'POS_SALE', -$4, $5, $6)`,
        [
          tenantId,
          warehouseId,
          item.productId,
          item.quantity,
          txId,
          `Penjualan ${item.name} x${item.quantity}`,
        ]
      );
    }
  }

  // Accounting journal
  const netSales = subtotal - totalDisc;
  const debitCode = paymentDebitAccountCode(parsed.paymentMethod);
  const debitAcctId = await ensureAccount(client, tenantId, debitCode);
  const salesAcct = await client.query(
    `SELECT id FROM coa_accounts WHERE tenant_id=$1 AND code='40100' LIMIT 1`,
    [tenantId]
  );
  const taxAcct = await client.query(
    `SELECT id FROM coa_accounts WHERE tenant_id=$1 AND code='20100' LIMIT 1`,
    [tenantId]
  );
  const hppAcct = await client.query(
    `SELECT id FROM coa_accounts WHERE tenant_id=$1 AND code='50100' LIMIT 1`,
    [tenantId]
  );
  const inventoryAcct = await client.query(
    `SELECT id FROM coa_accounts WHERE tenant_id=$1 AND code='10200' LIMIT 1`,
    [tenantId]
  );

  if (!salesAcct.rows[0]) {
    throw new Error('Akun penjualan (40100) wajib tersedia sebelum transaksi POS.');
  }

  let journalCreated = false;
  if (salesAcct.rows[0]) {
    const journalRes = await client.query(
      `INSERT INTO journal_entries (id, tenant_id, branch_id, description, reference_no, source_type, created_by)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'POS_SALE', $5) RETURNING id`,
      [tenantId, branchId, `POS Penjualan ${invoiceNo}`, invoiceNo, userId]
    );
    const journalId = journalRes.rows[0].id;
    journalCreated = true;

    await client.query(
      `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit)
       VALUES (gen_random_uuid(), $1, $2, $3, 0)`,
      [journalId, debitAcctId, grandTotal]
    );
    await client.query(
      `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit)
       VALUES (gen_random_uuid(), $1, $2, 0, $3)`,
      [journalId, salesAcct.rows[0].id, netSales]
    );
    if (taxAcct.rows[0] && taxAmount > 0) {
      await client.query(
        `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit)
         VALUES (gen_random_uuid(), $1, $2, 0, $3)`,
        [journalId, taxAcct.rows[0].id, taxAmount]
      );
    }
    if (hppAcct.rows[0] && inventoryAcct.rows[0]) {
      let totalCogs = 0;
      for (const item of items) {
        if (item.productId) {
          const costRes = await client.query(
            `SELECT purchase_cost FROM products WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
            [item.productId, tenantId]
          );
          totalCogs += (Number(costRes.rows[0]?.purchase_cost) || 0) * item.quantity;
        }
      }
      if (totalCogs > 0) {
        await client.query(
          `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit)
           VALUES (gen_random_uuid(), $1, $2, $3, 0), (gen_random_uuid(), $1, $4, 0, $3)`,
          [journalId, hppAcct.rows[0].id, totalCogs, inventoryAcct.rows[0].id]
        );
      }
    }
  }

  // Mark posted_to_ledger
  if (journalCreated) {
    await client.query(`UPDATE pos_transactions SET posted_to_ledger = TRUE WHERE id = $1`, [txId]);
  }

  // Handle TEMPO receivable tracking
  if (parsed.paymentMethod === 'TEMPO') {
    const dueAt = new Date(
      Date.now() + (Number(parsed.paymentDetails) || 30) * 86400000
    ).toISOString();
    await client.query(
      `INSERT INTO pos_receivables (id, tenant_id, branch_id, transaction_id, invoice_no, customer_id, amount, due_at, status)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'RECEIVABLE')`,
      [tenantId, branchId, txId, invoiceNo, parsed.customerId || null, grandTotal, dueAt]
    );
  }

  // Deposit usage tracking
  if (depositUsed > 0 && parsed.customerId) {
    await client.query(
      `UPDATE customers SET store_credit = store_credit - $1, loyalty_points = loyalty_points + floor($2 / 10000)
       WHERE id = $3 AND tenant_id = $4`,
      [depositUsed, grandTotal, parsed.customerId, tenantId]
    );
  }

  // Audit log
  await client.query(
    `INSERT INTO audit_logs (id, tenant_id, user_id, action, details)
     VALUES (gen_random_uuid(), $1, $2, 'POS_SALE', $3)`,
    [
      tenantId,
      userId,
      `Transaksi ${invoiceNo} — Rp${grandTotal.toLocaleString('id-ID')} (${parsed.paymentMethod}) — ${items.length} item`,
    ]
  );

  return {
    id: txId,
    invoiceNo,
    grandTotal: Number(grandTotal),
    timestamp: txRes.rows[0].timestamp,
    items,
  };
}

// ── Hold Cart ────────────────────────────────────────────────────────────────

export async function saveHoldCart(
  client: PoolClient,
  tenantId: string,
  branchId: string,
  shiftId: string | null,
  userId: string,
  cart: CreatePOSInput
): Promise<string> {
  const result = await client.query(
    `INSERT INTO pos_holds (tenant_id, branch_id, shift_id, customer_id, items, discount_amount, deposit_used, payment_method, payment_details, notes, created_by)
     VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      tenantId,
      branchId,
      shiftId || null,
      cart.customerId || null,
      JSON.stringify(cart.items),
      Number(cart.discountAmount) || 0,
      Number(cart.depositUsed) || 0,
      cart.paymentMethod,
      cart.paymentDetails || null,
      cart.notes || null,
      userId,
    ]
  );
  return result.rows[0].id;
}

export async function recallHoldCart(
  client: PoolClient,
  tenantId: string,
  branchId: string,
  holdId: string
): Promise<HoldCartData | null> {
  const result = await client.query(
    `SELECT id, tenant_id as "tenantId", branch_id as "branchId", shift_id as "shiftId",
            customer_id as "customerId", items, discount_amount as "discountAmount",
            deposit_used as "depositUsed", payment_method as "paymentMethod",
            payment_details as "paymentDetails", notes, recalled_at as "recalledAt",
            created_at as "createdAt"
     FROM pos_holds WHERE id=$1 AND tenant_id=$2 AND branch_id=$3 AND recalled_at IS NULL
     FOR UPDATE`,
    [holdId, tenantId, branchId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0] as HoldCartData;
}

export async function deleteHoldCart(
  client: PoolClient,
  tenantId: string,
  branchId: string,
  holdId: string
): Promise<void> {
  await client.query(`DELETE FROM pos_holds WHERE id=$1 AND tenant_id=$2 AND branch_id=$3`, [
    holdId,
    tenantId,
    branchId,
  ]);
}

// ── Partial Refund ───────────────────────────────────────────────────────────

export interface PartialRefundInput {
  items: Array<{
    itemIndex: number;
    quantity: number;
    reason: string;
  }>;
}

export async function processPartialRefund(
  client: PoolClient,
  tenantId: string,
  branchId: string,
  userId: string,
  txId: string,
  input: PartialRefundInput
): Promise<{ id: string; invoiceNo: string; refundAmount: number; status: string }> {
  const txRes = await client.query(
    `SELECT id, invoice_no as "invoiceNo", items, grand_total as "grandTotal",
            subtotal, discount_amount as "discountAmount", tax_amount as "taxAmount",
            payment_method as "paymentMethod", is_refunded, status, shift_id as "shiftId"
     FROM pos_transactions WHERE id=$1 AND tenant_id=$2 AND branch_id=$3 FOR UPDATE`,
    [txId, tenantId, branchId]
  );
  if (txRes.rows.length === 0) {
    throw Object.assign(new Error('Transaksi tidak ditemukan.'), { status: 404 });
  }
  const tx = txRes.rows[0];
  if (tx.is_refunded && tx.status === 'VOIDED') {
    throw Object.assign(new Error('Transaksi sudah dibatalkan sepenuhnya.'), { status: 409 });
  }

  const allItems = Array.isArray(tx.items) ? tx.items : [];
  let refundAmount = 0;
  const refundItems: any[] = [];

  for (const partial of input.items) {
    const idx = partial.itemIndex;
    if (idx < 0 || idx >= allItems.length) {
      throw Object.assign(new Error(`Item index ${idx} tidak valid.`), { status: 422 });
    }
    const origItem = allItems[idx];
    const maxQty = Number(origItem.quantity) || 0;
    if (partial.quantity <= 0 || partial.quantity > maxQty) {
      throw Object.assign(
        new Error(`Quantity refund untuk item ke-${idx} tidak valid. Maks ${maxQty}.`),
        { status: 422 }
      );
    }
    if (!partial.reason || partial.reason.length < 3) {
      throw Object.assign(
        new Error(`Alasan pembatalan item ke-${idx} wajib diisi (min 3 karakter).`),
        { status: 422 }
      );
    }
    const unitPrice = Number(origItem.unitPrice) || 0;
    const itemRefund = unitPrice * partial.quantity;
    refundAmount += itemRefund;
    refundItems.push({ ...origItem, refundQuantity: partial.quantity, reason: partial.reason });
  }

  if (refundAmount <= 0) {
    throw Object.assign(new Error('Tidak ada item yang di-refund.'), { status: 422 });
  }

  const hasTax = Number(tx.taxAmount) > 0;
  const refundTax = hasTax
    ? Math.round((refundAmount / (Number(tx.subtotal) || 1)) * Number(tx.taxAmount))
    : 0;
  const netRefund = refundAmount + refundTax;

  // Update original transaction
  const newStatus = tx.status === 'PARTIAL_REFUND' ? 'PARTIAL_REFUND' : 'FULL_REFUND';
  await client.query(
    `UPDATE pos_transactions SET
       is_refunded = TRUE, status = $1, voided_at = NOW(),
       void_reason = 'Partial refund: ' || $2,
       grand_total = grand_total - $3,
       tax_amount = tax_amount - $4
     WHERE id = $5`,
    [newStatus, input.items.map((p) => p.reason).join(', '), netRefund, refundTax, txId]
  );

  // Stock restoration
  const warehouseRes = await client.query(
    `SELECT id FROM warehouses WHERE branch_id=$1 AND tenant_id=$2 LIMIT 1`,
    [branchId, tenantId]
  );
  const defaultWarehouseId = warehouseRes.rows[0]?.id;

  for (const ri of refundItems) {
    const origItem = allItems[ri.itemIndex];
    if (origItem.productId) {
      const restoreWarehouseId = origItem.warehouseId || defaultWarehouseId;
      if (!restoreWarehouseId) {
        throw new Error(
          `Gudang tidak dikonfigurasi untuk produk ${origItem.name || origItem.productId}.`
        );
      }
      const stockRestore = await client.query(
        `UPDATE product_stock SET quantity = quantity + $1
         WHERE product_id=$2 AND warehouse_id=$3`,
        [ri.refundQuantity, origItem.productId, restoreWarehouseId]
      );
      if (stockRestore.rowCount !== 1) {
        throw new Error(
          `Gagal mengembalikan stok ${origItem.name || origItem.productId}. Data stok tidak ditemukan.`
        );
      }
      await client.query(
        `INSERT INTO stock_movements (id, tenant_id, warehouse_id, product_id, type, quantity, reference_no, note)
         VALUES (gen_random_uuid(), $1, $2, $3, 'POS_REFUND', $4, $5, $6)`,
        [
          tenantId,
          restoreWarehouseId,
          origItem.productId,
          ri.refundQuantity,
          txId,
          `Refund ${origItem.name || origItem.productId} x${ri.refundQuantity}: ${ri.reason}`,
        ]
      );
    }
  }

  // Reversal journal for refund amount
  const journalRes = await client.query(
    `INSERT INTO journal_entries (id, tenant_id, branch_id, description, reference_no, source_type, created_by)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 'POS_VOID', $5) RETURNING id`,
    [tenantId, branchId, `Partial Refund ${tx.invoiceNo}`, `REV-${tx.invoiceNo}`, userId]
  );
  const journalId = journalRes.rows[0].id;

  const cashAcct = await client.query(
    `SELECT id FROM coa_accounts WHERE tenant_id=$1 AND code='10100' LIMIT 1`,
    [tenantId]
  );
  const salesAcct = await client.query(
    `SELECT id FROM coa_accounts WHERE tenant_id=$1 AND code='40100' LIMIT 1`,
    [tenantId]
  );
  const taxAcct = await client.query(
    `SELECT id FROM coa_accounts WHERE tenant_id=$1 AND code='20100' LIMIT 1`,
    [tenantId]
  );

  if (cashAcct.rows[0]) {
    await client.query(
      `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit)
       VALUES (gen_random_uuid(), $1, $2, 0, $3)`,
      [journalId, cashAcct.rows[0].id, netRefund]
    );
  }
  if (salesAcct.rows[0]) {
    await client.query(
      `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit)
       VALUES (gen_random_uuid(), $1, $2, $3, 0)`,
      [journalId, salesAcct.rows[0].id, refundAmount]
    );
  }
  if (taxAcct.rows[0] && refundTax > 0) {
    await client.query(
      `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit)
       VALUES (gen_random_uuid(), $1, $2, $3, 0)`,
      [journalId, taxAcct.rows[0].id, refundTax]
    );
  }

  // Audit log
  await client.query(
    `INSERT INTO audit_logs (id, tenant_id, user_id, action, details)
     VALUES (gen_random_uuid(), $1, $2, 'POS_PARTIAL_REFUND', $3)`,
    [tenantId, userId, `Partial Refund ${tx.invoiceNo} — Rp${refundAmount.toLocaleString('id-ID')}`]
  );

  return { id: txId, invoiceNo: tx.invoiceNo, refundAmount: netRefund, status: newStatus };
}

// ── Voucher ──────────────────────────────────────────────────────────────────

export async function validateVoucher(
  client: PoolClient,
  tenantId: string,
  code: string
): Promise<VoucherValidationResult> {
  const result = await client.query(
    `SELECT id, discount_type, discount_value, max_discount, min_purchase, max_uses, used_count,
            valid_from, valid_until, code
     FROM discount_vouchers
     WHERE tenant_id=$1 AND code=$2 AND is_active=TRUE
       AND valid_from <= NOW() AND (valid_until IS NULL OR valid_until > NOW())
     FOR UPDATE`,
    [tenantId, code]
  );
  if (result.rows.length === 0) {
    return {
      valid: false,
      discountAmount: 0,
      message: `Voucher "${code}" tidak ditemukan atau tidak aktif.`,
    };
  }
  const v = result.rows[0];
  if (v.used_count >= v.max_uses) {
    return { valid: false, discountAmount: 0, message: `Voucher "${code}" sudah habis digunakan.` };
  }
  // Potongan aktual dihitung saat checkout berdasarkan subtotal & min_purchase.
  return { valid: true, voucherId: v.id, discountAmount: 0, message: `Voucher "${code}" valid.` };
}

// ── Receipt ──────────────────────────────────────────────────────────────────

export async function getReceiptData(
  client: PoolClient,
  tenantId: string,
  branchId: string,
  txId: string
): Promise<POSReceiptData | null> {
  const result = await client.query(
    `SELECT id, tenant_id as "tenantId", branch_id as "branchId", shift_id as "shiftId",
            invoice_no as "invoiceNo", customer_id as "customerId", items,
            subtotal, discount_amount as "discountAmount", tax_amount as "taxAmount",
            grand_total as "grandTotal", payment_method as "paymentMethod",
            amount_paid as "amountPaid", change_amount as "changeAmount",
            deposit_used as "depositUsed", is_refunded as "isRefunded", status,
            void_reason as "voidReason", voided_at as "voidedAt",
            posted_to_ledger as "postedToLedger", created_at as "createdAt"
     FROM pos_transactions WHERE id=$1 AND tenant_id=$2 AND branch_id=$3 LIMIT 1`,
    [txId, tenantId, branchId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0] as POSReceiptData;
}

// ── Analytics ────────────────────────────────────────────────────────────────

export async function getPOSAnalytics(
  client: PoolClient,
  tenantId: string,
  branchId: string,
  days: number = 30
): Promise<AnalyticsSummary> {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const salesAgg = await client.query(
    `SELECT
       COUNT(*)::int AS totalTransactions,
       COALESCE(SUM(grand_total), 0)::numeric AS totalRevenue,
       COALESCE(SUM(CASE WHEN is_refunded THEN grand_total ELSE 0 END), 0)::numeric AS totalRefunds,
       COALESCE(SUM(tax_amount), 0)::numeric AS totalTax,
       COALESCE(SUM(discount_amount), 0)::numeric AS totalDiscount
     FROM pos_transactions WHERE tenant_id=$1 AND branch_id=$2 AND created_at >= $3`,
    [tenantId, branchId, since]
  );
  const agg = salesAgg.rows[0];

  const paymentBreakdown = await client.query(
    `SELECT payment_method AS "paymentMethod", COUNT(*)::int AS count,
            COALESCE(SUM(grand_total), 0)::numeric AS total
     FROM pos_transactions WHERE tenant_id=$1 AND branch_id=$2 AND created_at >= $3
     GROUP BY payment_method ORDER BY total DESC`,
    [tenantId, branchId, since]
  );

  const hourlyAgg = await client.query(
    `SELECT EXTRACT(HOUR FROM created_at)::int AS hour, COUNT(*)::int AS count,
            COALESCE(SUM(grand_total), 0)::numeric AS total
     FROM pos_transactions WHERE tenant_id=$1 AND branch_id=$2 AND created_at >= $3
     GROUP BY hour ORDER BY hour`,
    [tenantId, branchId, since]
  );

  const topProducts = await client.query(
    `SELECT t.items->>'productId' AS "productId", t.items->>'name' AS "name",
            SUM((t.items->>'quantity')::int) AS "quantity",
            SUM((t.items->>'total')::numeric) AS "revenue"
     FROM pos_transactions t
     WHERE t.tenant_id=$1 AND t.branch_id=$2 AND t.created_at >= $3 AND t.items IS NOT NULL
     GROUP BY t.items->>'productId', t.items->>'name'
     HAVING t.items->>'productId' IS NOT NULL
     ORDER BY revenue DESC LIMIT 10`,
    [tenantId, branchId, since]
  );

  const totalSales = agg.totalTransactions;
  const totalRevenue = Number(agg.totalRevenue);
  const totalRefunds = Number(agg.totalRefunds);
  const totalTax = Number(agg.totalTax);
  const totalDiscount = Number(agg.totalDiscount);

  return {
    period: `${days} hari terakhir`,
    totalSales,
    totalTransactions: totalSales,
    totalRefunds,
    totalRevenue,
    totalTax,
    totalDiscount,
    byPaymentMethod: Object.fromEntries(
      paymentBreakdown.rows.map((r: any) => [
        r.paymentMethod,
        { count: r.count, total: Number(r.total) },
      ])
    ),
    topProducts: topProducts.rows.map((r: any) => ({
      productId: r.productId,
      name: r.name,
      quantity: r.quantity,
      revenue: Number(r.revenue),
    })),
    hourlyBreakdown: hourlyAgg.rows.map((r: any) => ({
      hour: r.hour,
      count: r.count,
      total: Number(r.total),
    })),
  };
}
