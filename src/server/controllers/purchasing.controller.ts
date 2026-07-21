/**
 * Purchasing Controller — suppliers, purchase orders, goods receipts.
 * Goods receipt atomically: increments stock, logs stock_movements,
 * updates weighted-average purchase_cost, and posts the AP/inventory journal.
 */
import type { Request, Response } from "express";
import { z } from "zod";
import { dbQuery, dbTransaction } from "../../lib/db.js";
import { ensureAccount, paymentDebitAccountCode } from "../lib/coa.js";

const sendError = (res: Response, error: any) =>
  res.status(error?.status || 500).json({ error: error?.message || "Terjadi kesalahan." });

// ── Suppliers ──
const supplierSchema = z.object({
  name: z.string().trim().min(2),
  contactName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  address: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

export async function listSuppliers(req: Request, res: Response) {
  try {
    const rows = await dbQuery(
      `SELECT id, name, contact_name as "contactName", phone, email, address,
              is_active as "isActive", created_at as "createdAt"
       FROM suppliers WHERE tenant_id=$1 ORDER BY name ASC`,
      [req.tenantId],
    );
    res.json({ data: rows.rows });
  } catch (e) { sendError(res, e); }
}

export async function createSupplier(req: Request, res: Response) {
  const parsed = supplierSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "Data supplier tidak valid.", details: parsed.error.flatten() });
  try {
    const r = await dbQuery(
      `INSERT INTO suppliers (id, tenant_id, name, contact_name, phone, email, address, is_active)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, COALESCE($7, TRUE))
       RETURNING id, name, contact_name as "contactName", phone, email, address, is_active as "isActive"`,
      [req.tenantId, parsed.data.name, parsed.data.contactName || null, parsed.data.phone || null,
        parsed.data.email || null, parsed.data.address || null, parsed.data.isActive ?? null],
    );
    res.status(201).json({ data: r.rows[0], message: "Supplier ditambahkan." });
  } catch (e) { sendError(res, e); }
}

export async function updateSupplier(req: Request, res: Response) {
  const parsed = supplierSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "Data supplier tidak valid." });
  try {
    const r = await dbQuery(
      `UPDATE suppliers SET
         name=COALESCE($3,name), contact_name=COALESCE($4,contact_name), phone=COALESCE($5,phone),
         email=COALESCE($6,email), address=COALESCE($7,address), is_active=COALESCE($8,is_active), updated_at=NOW()
       WHERE id=$1 AND tenant_id=$2
       RETURNING id, name, contact_name as "contactName", phone, email, address, is_active as "isActive"`,
      [req.params.id, req.tenantId, parsed.data.name ?? null, parsed.data.contactName ?? null,
        parsed.data.phone ?? null, parsed.data.email ?? null, parsed.data.address ?? null, parsed.data.isActive ?? null],
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Supplier tidak ditemukan." });
    res.json({ data: r.rows[0], message: "Supplier diperbarui." });
  } catch (e) { sendError(res, e); }
}

// ── Purchase Orders ──
const poItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1),
  quantity: z.number().positive(),
  unitCost: z.number().min(0),
});
const poSchema = z.object({
  supplierId: z.string().uuid().optional().nullable(),
  supplierName: z.string().trim().optional(),
  warehouseId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().optional(),
  items: z.array(poItemSchema).min(1),
});

async function nextDocNo(client: any, tenantId: string, table: string, prefix: string) {
  await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [tenantId + table]);
  const year = new Date().getFullYear();
  const seq = await client.query(
    `SELECT COUNT(*)::int AS cnt FROM ${table} WHERE tenant_id=$1 AND EXTRACT(YEAR FROM created_at)=$2`,
    [tenantId, year],
  );
  return `${prefix}/${year}/${((seq.rows[0]?.cnt ?? 0) + 1).toString().padStart(5, "0")}`;
}

export async function listPurchaseOrders(req: Request, res: Response) {
  try {
    const pos = await dbQuery(
      `SELECT id, po_no as "poNo", supplier_id as "supplierId", supplier_name as "supplierName",
              warehouse_id as "warehouseId", status, total_amount as "totalAmount",
              notes, created_at as "createdAt"
       FROM purchase_orders WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 200`,
      [req.tenantId],
    );
    const ids = pos.rows.map((p: any) => p.id);
    let itemsByPo: Record<string, any[]> = {};
    if (ids.length) {
      const items = await dbQuery(
        `SELECT id, purchase_order_id as "purchaseOrderId", product_id as "productId", name,
                quantity, received_quantity as "receivedQuantity", unit_cost as "unitCost"
         FROM purchase_order_items WHERE purchase_order_id = ANY($1::uuid[])`,
        [ids],
      );
      itemsByPo = items.rows.reduce((acc: Record<string, any[]>, it: any) => {
        (acc[it.purchaseOrderId] ||= []).push(it);
        return acc;
      }, {});
    }
    res.json({ data: pos.rows.map((p: any) => ({ ...p, items: itemsByPo[p.id] || [] })) });
  } catch (e) { sendError(res, e); }
}

export async function createPurchaseOrder(req: Request, res: Response) {
  const parsed = poSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "Data PO tidak valid.", details: parsed.error.flatten() });
  try {
    const result = await dbTransaction(async (client) => {
      const total = parsed.data.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
      const poNo = await nextDocNo(client, req.tenantId!, "purchase_orders", "PO");
      const po = await client.query(
        `INSERT INTO purchase_orders (id, tenant_id, branch_id, po_no, supplier_id, supplier_name, warehouse_id, status, total_amount, notes, created_by)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'ORDERED', $7, $8, $9)
         RETURNING id, po_no as "poNo", status, total_amount as "totalAmount"`,
        [req.tenantId, req.branchId || null, poNo, parsed.data.supplierId || null, parsed.data.supplierName || null,
          parsed.data.warehouseId || null, total, parsed.data.notes || null, req.authActor?.userId || null],
      );
      for (const it of parsed.data.items) {
        await client.query(
          `INSERT INTO purchase_order_items (id, purchase_order_id, product_id, name, quantity, received_quantity, unit_cost)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, 0, $5)`,
          [po.rows[0].id, it.productId || null, it.name, it.quantity, it.unitCost],
        );
      }
      return po.rows[0];
    });
    res.status(201).json({ data: result, message: "Purchase order dibuat." });
  } catch (e) { sendError(res, e); }
}

export async function cancelPurchaseOrder(req: Request, res: Response) {
  try {
    const r = await dbQuery(
      `UPDATE purchase_orders SET status='CANCELLED', updated_at=NOW()
       WHERE id=$1 AND tenant_id=$2 AND status NOT IN ('RECEIVED','CANCELLED') RETURNING id, status`,
      [req.params.id, req.tenantId],
    );
    if (!r.rows[0]) return res.status(409).json({ error: "PO tidak dapat dibatalkan." });
    res.json({ data: r.rows[0], message: "PO dibatalkan." });
  } catch (e) { sendError(res, e); }
}

// ── Goods Receipt (the accounting-critical path) ──
const receiptItemSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().trim().min(1),
  quantity: z.number().positive(),
  unitCost: z.number().min(0),
});
const receiptSchema = z.object({
  purchaseOrderId: z.string().uuid().optional().nullable(),
  supplierId: z.string().uuid().optional().nullable(),
  warehouseId: z.string().uuid(),
  paymentMethod: z.enum(["CREDIT", "CASH", "BANK_TRANSFER"]).default("CREDIT"),
  notes: z.string().trim().optional(),
  items: z.array(receiptItemSchema).min(1),
});

export async function receiveGoods(req: Request, res: Response) {
  const parsed = receiptSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "Data penerimaan barang tidak valid.", details: parsed.error.flatten() });
  const tenantId = req.tenantId!;
  const { warehouseId, items, paymentMethod } = parsed.data;
  try {
    const result = await dbTransaction(async (client) => {
      // Validate warehouse belongs to tenant
      const wh = await client.query(`SELECT id FROM warehouses WHERE id=$1 AND tenant_id=$2 LIMIT 1`, [warehouseId, tenantId]);
      if (!wh.rows[0]) { const e: any = new Error("Gudang tidak valid untuk tenant ini."); e.status = 422; throw e; }

      // Inherit supplier from PO when not explicitly provided
      let supplierId = parsed.data.supplierId || null;
      if (!supplierId && parsed.data.purchaseOrderId) {
        const poSup = await client.query(
          `SELECT supplier_id FROM purchase_orders WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
          [parsed.data.purchaseOrderId, tenantId],
        );
        supplierId = poSup.rows[0]?.supplier_id || null;
      }

      const total = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
      const receiptNo = await nextDocNo(client, tenantId, "goods_receipts", "GR");

      const gr = await client.query(
        `INSERT INTO goods_receipts (id, tenant_id, branch_id, purchase_order_id, warehouse_id, receipt_no, supplier_id, total_amount, payment_method, received_by, notes)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, receipt_no as "receiptNo", total_amount as "totalAmount"`,
        [tenantId, req.branchId || null, parsed.data.purchaseOrderId || null, warehouseId, receiptNo,
          supplierId, total, paymentMethod, req.authActor?.userId || null, parsed.data.notes || null],
      );
      const receiptId = gr.rows[0].id;

      for (const it of items) {
        // Verify product ownership
        const prod = await client.query(
          `SELECT purchase_cost FROM products WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
          [it.productId, tenantId],
        );
        if (!prod.rows[0]) { const e: any = new Error(`Produk ${it.name} tidak ditemukan.`); e.status = 422; throw e; }

        // Weighted-average cost over total stock before this receipt
        const stockRes = await client.query(
          `SELECT COALESCE(SUM(quantity),0) AS qty FROM product_stock ps
           JOIN products p ON p.id=ps.product_id WHERE ps.product_id=$1 AND p.tenant_id=$2`,
          [it.productId, tenantId],
        );
        const oldQty = Number(stockRes.rows[0]?.qty) || 0;
        const oldCost = Number(prod.rows[0].purchase_cost) || 0;
        const newTotalQty = oldQty + it.quantity;
        const newCost = newTotalQty > 0
          ? Math.round((oldQty * oldCost + it.quantity * it.unitCost) / newTotalQty)
          : it.unitCost;

        await client.query(
          `UPDATE products SET purchase_cost=$3 WHERE id=$1 AND tenant_id=$2`,
          [it.productId, tenantId, newCost],
        );
        await client.query(
          `INSERT INTO product_stock (product_id, warehouse_id, quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT (product_id, warehouse_id) DO UPDATE SET quantity = product_stock.quantity + EXCLUDED.quantity`,
          [it.productId, warehouseId, it.quantity],
        );
        await client.query(
          `INSERT INTO stock_movements (id, tenant_id, warehouse_id, product_id, type, quantity, reference_no, note)
           VALUES (gen_random_uuid(), $1, $2, $3, 'PURCHASE_RECEIPT', $4, $5, $6)`,
          [tenantId, warehouseId, it.productId, it.quantity, receiptId, `Terima ${it.name} x${it.quantity}`],
        );
        await client.query(
          `INSERT INTO goods_receipt_items (id, goods_receipt_id, product_id, name, quantity, unit_cost)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
          [receiptId, it.productId, it.name, it.quantity, it.unitCost],
        );

        // Update linked PO item received quantity
        if (parsed.data.purchaseOrderId) {
          await client.query(
            `UPDATE purchase_order_items SET received_quantity = received_quantity + $3
             WHERE purchase_order_id=$1 AND product_id=$2`,
            [parsed.data.purchaseOrderId, it.productId, it.quantity],
          );
        }
      }

      // Accounting: Debit Inventory (10500) / Credit AP (20200) or Cash/Bank
      let journalId: string | null = null;
      if (total > 0) {
        const je = await client.query(
          `INSERT INTO journal_entries (id, tenant_id, branch_id, description, reference_no, source_type, source_id, created_by)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, 'PURCHASE', $5, $6) RETURNING id`,
          [tenantId, req.branchId || null, `Penerimaan barang ${receiptNo}`, receiptNo, receiptId, req.authActor?.userId || null],
        );
        journalId = je.rows[0].id;
        const invAcctId = await ensureAccount(client, tenantId, "10500");
        const creditCode = paymentMethod === "CREDIT" ? "20200" : paymentDebitAccountCode(paymentMethod);
        const creditAcctId = await ensureAccount(client, tenantId, creditCode);
        await client.query(
          `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit) VALUES
           (gen_random_uuid(), $1, $2, $4, 0), (gen_random_uuid(), $1, $3, 0, $4)`,
          [journalId, invAcctId, creditAcctId, total],
        );
        await client.query(`UPDATE goods_receipts SET journal_entry_id=$2 WHERE id=$1`, [receiptId, journalId]);
      }

      // Update PO status
      if (parsed.data.purchaseOrderId) {
        const remaining = await client.query(
          `SELECT COALESCE(SUM(GREATEST(quantity - received_quantity, 0)),0) AS rem
           FROM purchase_order_items WHERE purchase_order_id=$1`,
          [parsed.data.purchaseOrderId],
        );
        const status = Number(remaining.rows[0]?.rem) > 0 ? "PARTIAL" : "RECEIVED";
        await client.query(
          `UPDATE purchase_orders SET status=$2, updated_at=NOW() WHERE id=$1 AND tenant_id=$3`,
          [parsed.data.purchaseOrderId, status, tenantId],
        );
      }

      return { id: receiptId, receiptNo: gr.rows[0].receiptNo, totalAmount: total, journalId };
    });
    res.status(201).json({ data: result, message: "Barang diterima & stok/jurnal diperbarui." });
  } catch (e) { sendError(res, e); }
}

export async function listGoodsReceipts(req: Request, res: Response) {
  try {
    const rows = await dbQuery(
      `SELECT id, receipt_no as "receiptNo", purchase_order_id as "purchaseOrderId",
              warehouse_id as "warehouseId", supplier_id as "supplierId", total_amount as "totalAmount",
              amount_paid as "amountPaid", payment_method as "paymentMethod", created_at as "createdAt"
       FROM goods_receipts WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 200`,
      [req.tenantId],
    );
    res.json({ data: rows.rows });
  } catch (e) { sendError(res, e); }
}

// ── Accounts Payable: aging report + settlement ──
export async function listPayables(req: Request, res: Response) {
  try {
    const rows = await dbQuery(
      `SELECT gr.id, gr.receipt_no as "receiptNo", gr.created_at as "createdAt",
              gr.total_amount as "totalAmount", gr.amount_paid as "amountPaid",
              (gr.total_amount - gr.amount_paid) as "outstanding",
              gr.supplier_id as "supplierId", COALESCE(s.name, '(Tanpa supplier)') as "supplierName",
              GREATEST(0, DATE_PART('day', NOW() - gr.created_at))::int as "ageDays"
       FROM goods_receipts gr
       LEFT JOIN suppliers s ON s.id = gr.supplier_id
       WHERE gr.tenant_id=$1 AND gr.payment_method='CREDIT' AND (gr.total_amount - gr.amount_paid) > 0.5
       ORDER BY gr.created_at ASC`,
      [req.tenantId],
    );
    const buckets = { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 };
    let total = 0;
    for (const r of rows.rows) {
      const out = Number(r.outstanding) || 0;
      total += out;
      const age = Number(r.ageDays) || 0;
      if (age <= 30) buckets.current += out;
      else if (age <= 60) buckets.d30 += out;
      else if (age <= 90) buckets.d60 += out;
      else if (age <= 120) buckets.d90 += out;
      else buckets.over90 += out;
    }
    res.json({ data: { items: rows.rows, buckets, totalOutstanding: total } });
  } catch (e) { sendError(res, e); }
}

const paymentSchema = z.object({
  goodsReceiptId: z.string().uuid(),
  amount: z.number().positive(),
  method: z.enum(["CASH", "BANK_TRANSFER"]).default("CASH"),
  notes: z.string().trim().optional(),
});

export async function paySupplier(req: Request, res: Response) {
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "Data pembayaran tidak valid.", details: parsed.error.flatten() });
  const tenantId = req.tenantId!;
  try {
    const result = await dbTransaction(async (client) => {
      const gr = await client.query(
        `SELECT id, supplier_id as "supplierId", total_amount as "totalAmount", amount_paid as "amountPaid", payment_method as "paymentMethod"
         FROM goods_receipts WHERE id=$1 AND tenant_id=$2 FOR UPDATE`,
        [parsed.data.goodsReceiptId, tenantId],
      );
      if (!gr.rows[0]) { const e: any = new Error("Penerimaan barang tidak ditemukan."); e.status = 404; throw e; }
      if (gr.rows[0].paymentMethod !== "CREDIT") { const e: any = new Error("Penerimaan ini bukan pembelian kredit."); e.status = 409; throw e; }
      const outstanding = (Number(gr.rows[0].totalAmount) || 0) - (Number(gr.rows[0].amountPaid) || 0);
      if (parsed.data.amount > outstanding + 0.5) {
        const e: any = new Error(`Pembayaran melebihi sisa utang (Rp${Math.round(outstanding).toLocaleString("id-ID")}).`); e.status = 422; throw e;
      }

      const paymentNo = await nextDocNo(client, tenantId, "supplier_payments", "PAY");
      const apAcctId = await ensureAccount(client, tenantId, "20200");
      const cashAcctId = await ensureAccount(client, tenantId, paymentDebitAccountCode(parsed.data.method));
      const je = await client.query(
        `INSERT INTO journal_entries (id, tenant_id, branch_id, description, reference_no, source_type, created_by)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'SUPPLIER_PAYMENT', $5) RETURNING id`,
        [tenantId, req.branchId || null, `Bayar utang ${paymentNo}`, paymentNo, req.authActor?.userId || null],
      );
      const journalId = je.rows[0].id;
      await client.query(
        `INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit) VALUES
         (gen_random_uuid(), $1, $2, $4, 0), (gen_random_uuid(), $1, $3, 0, $4)`,
        [journalId, apAcctId, cashAcctId, parsed.data.amount],
      );
      const pay = await client.query(
        `INSERT INTO supplier_payments (id, tenant_id, branch_id, goods_receipt_id, supplier_id, payment_no, amount, method, journal_entry_id, notes, created_by)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, payment_no as "paymentNo", amount`,
        [tenantId, req.branchId || null, parsed.data.goodsReceiptId, gr.rows[0].supplierId, paymentNo,
          parsed.data.amount, parsed.data.method, journalId, parsed.data.notes || null, req.authActor?.userId || null],
      );
      await client.query(
        `UPDATE goods_receipts SET amount_paid = amount_paid + $2 WHERE id=$1`,
        [parsed.data.goodsReceiptId, parsed.data.amount],
      );
      return pay.rows[0];
    });
    res.status(201).json({ data: result, message: "Pembayaran utang dicatat & jurnal diperbarui." });
  } catch (e) { sendError(res, e); }
}
