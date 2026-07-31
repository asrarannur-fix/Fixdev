import { z } from 'zod';

export const partOrderSchema = z.object({
  partName: z.string().trim().min(2),
  quantity: z.number().positive(),
  reason: z.string().trim().min(3),
  supplierName: z.string().trim().optional(),
  estimatedCost: z.number().min(0).default(0),
  estimatedArrivalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value).optional(),
  costApproved: z.boolean().default(false),
  note: z.string().optional(),
  idempotencyKey: z.string().trim().min(8),
});
export const strictDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value);
export const partOrderUpdateSchema = z.object({
  status: z.enum(['APPROVED', 'ORDERED', 'SHIPPED', 'ARRIVED']).optional(),
  supplierName: z.string().trim().min(1).optional(),
  estimatedArrivalDate: strictDate.optional(),
  note: z.string().trim().min(1).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Pembaruan wajib berisi perubahan.');
export const partArrivalSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  serialNumber: z.string().optional(),
});

export const additionalCostSchema = z.object({
  description: z.string().trim().min(3),
  amount: z.number().positive(),
  approvalMethod: z.enum(['WHATSAPP', 'PHONE', 'IN_PERSON']).default('WHATSAPP'),
  approvedByName: z.string().trim().optional(),
  note: z.string().trim().optional(),
  proofName: z.string().trim().optional(),
  idempotencyKey: z.string().trim().min(8),
});

export const transitionSchema = z.object({ status: z.string().min(1), note: z.string().trim().min(3) });
export const diagnosisSchema = z.object({
  diagnosis: z.string().trim().min(3),
  estimatedCost: z.number().min(0),
  parts: z
    .array(
      z.object({
        productId: z.string().uuid(),
        warehouseId: z.string().uuid().optional().nullable(),
        name: z.string().trim().min(1),
        quantity: z.number().int().positive(),
        unitPrice: z.number().min(0).default(0),
        serialNumber: z.string().optional(),
      })
    )
    .default([]),
});
export const photo = z.string().trim().regex(/^tenant\/[0-9a-f-]+\/service\/[0-9a-f-]+\/[0-9a-f-]+\.(jpg|png)$/i).max(255);

export const approvalSchema = z.object({
  approved: z.boolean(),
  signatureName: z.string().trim().optional(),
  signature: z.string().optional(),
});
export const intakeChecklistSchema = z
  .object({
    checklist: z.array(z.object({ name: z.string().trim().min(1).max(200), checked: z.boolean() }).strict()).max(100),
  })
  .strict();
export const qcDraftSchema = z
  .object({
    notes: z.string().trim().max(5000).optional(),
    checklist: z.array(z.object({ criteria: z.string().trim().min(1).max(200), passed: z.boolean() }).strict()).max(100).optional(),
    photos: z.array(photo).max(20).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Draft QC wajib berisi perubahan.');
export const qcSchema = z
  .object({
    notes: z.string().trim().min(2),
    checklist: z
      .array(z.object({ criteria: z.string().trim().min(1), passed: z.boolean() }))
      .min(1),
    photos: z.array(photo).max(20).default([]),
  });
export const handoverSchema = z
  .object({
    paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'QRIS', 'EDC', 'E_WALLET', 'TEMPO']),
    referenceNo: z.string().trim().max(200).optional(),
    proofName: z.string().trim().max(255).regex(/^[A-Za-z0-9._-]+$/, 'Nama bukti pembayaran tidak valid.').optional(),
    tempoDays: z.number().int().min(1).max(365).optional(),
    checklist: z.object({
      accessoriesReturned: z.literal(true),
      customerChecked: z.literal(true),
      invoiceReady: z.literal(true),
      warrantyReady: z.literal(true),
    }),
    idempotencyKey: z.string().trim().min(8),
  })
  .superRefine((value, ctx) => {
    if (value.paymentMethod === 'TEMPO' && !value.tempoDays) {
      ctx.addIssue({ code: 'custom', path: ['tempoDays'], message: 'Termin tempo wajib diisi.' });
    }
    if (value.paymentMethod !== 'TEMPO' && value.tempoDays) {
      ctx.addIssue({
        code: 'custom',
        path: ['tempoDays'],
        message: 'Termin hanya berlaku untuk pembayaran tempo.',
      });
    }
    if (!['CASH', 'TEMPO'].includes(value.paymentMethod) && !value.referenceNo && !value.proofName) {
      ctx.addIssue({
        code: 'custom',
        path: ['referenceNo'],
        message: 'Nomor referensi pembayaran wajib diisi.',
      });
    }
  });
export const money = z.number().finite().min(0).max(1_000_000_000);
export const receivableSettlementSchema = z.object({
  amount: money.positive(),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'QRIS', 'EDC', 'E_WALLET']),
  referenceNo: z.string().trim().max(200).optional(),
  idempotencyKey: z.string().trim().min(8).max(200),
}).superRefine((value, ctx) => {
  if (value.method !== 'CASH' && !value.referenceNo) {
    ctx.addIssue({ code: 'custom', path: ['referenceNo'], message: 'Nomor referensi pembayaran wajib diisi.' });
  }
});
export const bulkDeleteSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(100) });
export const partSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  quantity: z.number().int().positive(),
  serialNumber: z.string().trim().optional(),
});
export const workMetadataSchema = z.object({
  assignedTechId: z.string().uuid().nullable().optional(),
  technicianNotes: z.string().optional(),
  internalDiscussion: z.object({ text: z.string().trim().min(1).max(5000) }).optional(),
  techPreChecklist: z
    .array(z.object({ name: z.string().trim().min(1).max(200), checked: z.boolean() }))
    .max(100)
    .optional(),
  techPostChecklist: z
    .array(z.object({ name: z.string().trim().min(1).max(200), checked: z.boolean() }))
    .max(100)
    .optional(),
  repairStartTime: z.string().datetime().nullable().optional(),
  repairEndTime: z.string().datetime().nullable().optional(),
  storageLocationId: z.string().uuid().nullable().optional(),
});
