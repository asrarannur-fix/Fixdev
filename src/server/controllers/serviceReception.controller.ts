import type { Request, Response } from "express";
import { z } from "zod";
import { dbTransaction } from "../../lib/db.js";

const optionalText = z.string().trim().optional().default("");

export const serviceReceptionSchema = z.object({
  branchId: z.string().uuid(),
  customer: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("existing"), id: z.string().uuid() }),
    z.object({
      mode: z.literal("new"),
      name: z.string().trim().min(2),
      phone: z.string().trim().min(8),
      email: optionalText,
      address: optionalText,
    }),
  ]),
  device: z.object({
    name: z.string().trim().min(1),
    brandModel: optionalText,
    serial: optionalText,
    category: optionalText,
    dynamicFields: z.record(z.string(), z.string()).optional().default({}),
    screenLockPin: optionalText,
  }),
  reception: z.object({
    complaint: z.string().trim().min(3),
    physicalCondition: optionalText,
    checklist: z.array(z.object({ name: z.string(), checked: z.boolean() })).default([]),
    accessories: z.array(z.string()).default([]),
    customAccessories: optionalText,
    capturedConditions: z.array(z.any()).default([]),
    storageLocationId: optionalText,
  }),
  service: z.object({
    assignedTechId: z.string().uuid().optional().nullable(),
    estimatedCompletionDate: optionalText,
    warrantyMonths: z.number().int().min(0).max(120).default(0),
    downPayment: z.number().min(0).default(0),
    isCheckOnly: z.boolean().default(false),
  }),
  outsourcing: z.object({
    enabled: z.boolean().default(false),
    vendorId: optionalText,
    cost: z.number().min(0).default(0),
  }).default({ enabled: false, vendorId: "", cost: 0 }),
});

export function normalizeReceptionPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

export async function createServiceReception(req: Request, res: Response) {
  const parsed = serviceReceptionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      error: "Data penerimaan tidak valid.",
      details: parsed.error.flatten(),
    });
  }

  const tenantId = req.tenantId!;
  const actor = req.authActor!;
  const input = parsed.data;

  if (input.outsourcing.enabled && (!input.outsourcing.vendorId || input.outsourcing.cost <= 0)) {
    return res.status(422).json({ error: "Vendor dan biaya outsourcing wajib diisi." });
  }

  try {
    const result = await dbTransaction(async (client) => {
      const branch = await client.query(
        "SELECT id FROM branches WHERE id = $1 AND tenant_id = $2 LIMIT 1",
        [input.branchId, tenantId],
      );
      if (!branch.rows[0]) {
        const error: any = new Error("Cabang tidak ditemukan pada tenant aktif.");
        error.status = 403;
        throw error;
      }

      let customer: any;
      if (input.customer.mode === "existing") {
        const found = await client.query(
          `SELECT id, tenant_id AS "tenantId", name, phone, email, address
           FROM customers WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
          [input.customer.id, tenantId],
        );
        customer = found.rows[0];
        if (!customer) {
          const error: any = new Error("Pelanggan tidak ditemukan pada tenant aktif.");
          error.status = 404;
          throw error;
        }
      } else {
        const normalizedPhone = normalizeReceptionPhone(input.customer.phone);
        if (!/^628\d{7,12}$/.test(normalizedPhone)) {
          const error: any = new Error("Nomor WhatsApp pelanggan tidak valid.");
          error.status = 422;
          throw error;
        }
        const existing = await client.query(
          `SELECT id, tenant_id AS "tenantId", name, phone, email, address
           FROM customers WHERE tenant_id = $1 AND normalized_phone = $2 LIMIT 1`,
          [tenantId, normalizedPhone],
        );
        customer = existing.rows[0];
        if (!customer) {
          const inserted = await client.query(
            `INSERT INTO customers (id, tenant_id, name, phone, normalized_phone, email, address)
             VALUES (gen_random_uuid(), $1, $2, $3, $3, $4, $5)
             ON CONFLICT (tenant_id, normalized_phone)
             WHERE normalized_phone IS NOT NULL AND normalized_phone <> ''
             DO UPDATE SET name = COALESCE(NULLIF(customers.name, ''), EXCLUDED.name)
             RETURNING id, tenant_id AS "tenantId", name, phone, email, address`,
            [tenantId, input.customer.name, normalizedPhone, input.customer.email || null, input.customer.address || null],
          );
          customer = inserted.rows[0];
        }
      }

      const sequence = await client.query("SELECT nextval('service_ticket_number_seq') AS value");
      const sequenceValue = Number(sequence.rows[0].value);
      const now = new Date();
      const prefix = `TKT/${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
      const ticketNo = `${prefix}/${String(sequenceValue).padStart(6, "0")}`;
      const timeline = [{
        status: "DITERIMA",
        note: input.service.isCheckOnly
          ? "Unit diterima untuk pengecekan dan diagnosis."
          : `Unit diterima${input.service.downPayment > 0 ? ` dengan DP Rp ${input.service.downPayment.toLocaleString("id-ID")}` : ""}.`,
        timestamp: now.toISOString(),
        operator: actor.email || actor.userId,
      }];

      const insertedTicket = await client.query(
        `INSERT INTO service_tickets (
          id, tenant_id, branch_id, ticket_no, customer_id, device_name, device_serial,
          device_brand_model, customer_complaints, status, initial_checklist, initial_photos,
          customer_approval_status, assigned_tech_id, warranty_months, is_outsourced,
          outsourced_vendor_id, outsourcing_cost, down_payment, is_check_only, device_category,
          accessories_left, custom_accessories, physical_condition, screen_lock_pin,
          estimated_completion_date, captured_conditions, dynamic_fields, storage_location_id, timeline
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 'DITERIMA', $9::jsonb, $10::jsonb,
          'PENDING', $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, $20, $21, $22,
          $23, $24::jsonb, $25::jsonb, $26, $27::jsonb
        )
        RETURNING *, tenant_id AS "tenantId", branch_id AS "branchId", ticket_no AS "ticketNo",
          customer_id AS "customerId", device_name AS "deviceName", device_serial AS "deviceSerial",
          device_brand_model AS "deviceBrandModel", customer_complaints AS "customerComplaints",
          created_at AS "createdAt"`,
        [tenantId, input.branchId, ticketNo, customer.id, input.device.name, input.device.serial || null,
          input.device.brandModel || input.device.name, input.reception.complaint,
          JSON.stringify(input.reception.checklist), JSON.stringify(input.reception.capturedConditions),
          input.service.assignedTechId || null, input.service.warrantyMonths, input.outsourcing.enabled,
          input.outsourcing.vendorId || null, input.outsourcing.cost, input.service.downPayment,
          input.service.isCheckOnly, input.device.category || null, JSON.stringify(input.reception.accessories),
          input.reception.customAccessories || null, input.reception.physicalCondition || null,
          input.device.screenLockPin || null, input.service.estimatedCompletionDate || null,
          JSON.stringify(input.reception.capturedConditions), JSON.stringify(input.device.dynamicFields),
          input.reception.storageLocationId || null, JSON.stringify(timeline)],
      );

      await client.query(
        `INSERT INTO audit_logs (id, tenant_id, user_id, action, details)
         VALUES (gen_random_uuid(), $1, $2, 'CREATE_SERVICE_RECEPTION', $3)`,
        [tenantId, actor.userId, `Membuat penerimaan ${ticketNo} untuk ${input.device.name}`],
      );

      return { customer, ticket: insertedTicket.rows[0] };
    });

    return res.status(201).json({ data: result, message: "Penerimaan unit berhasil disimpan." });
  } catch (error: any) {
    return res.status(error.status || 500).json({ error: error.message || "Gagal menyimpan penerimaan unit." });
  }
}
