import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { dbQuery } from '../../lib/db.js';

const startSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    documentType: z.string().trim().min(1).max(100),
    documentId: z.string().trim().max(200).optional(),
    printer: z.string().trim().max(250).optional(),
    transport: z.enum(['browser', 'qz']),
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
    reprint: z.boolean().default(false),
    reprintReason: z.string().trim().min(3).max(500).optional(),
    copies: z.number().int().min(1).max(20).default(1),
  })
  .superRefine((value, ctx) => {
    if (value.reprint && !value.reprintReason)
      ctx.addIssue({
        code: 'custom',
        message: 'Alasan cetak ulang wajib diisi.',
        path: ['reprintReason'],
      });
    if (!value.reprint && value.reprintReason)
      ctx.addIssue({
        code: 'custom',
        message: 'Alasan hanya untuk cetak ulang.',
        path: ['reprintReason'],
      });
  });

const resultSchema = z
  .object({
    status: z.enum(['submitted', 'failed']),
    errorCode: z.string().trim().max(100).optional(),
    errorMessage: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status !== 'failed' && (value.errorCode || value.errorMessage))
      ctx.addIssue({
        code: 'custom',
        message: 'Error hanya untuk status gagal.',
        path: ['status'],
      });
  });

export const createPrintJob = async (req: Request, res: Response) => {
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: 'Data job cetak tidak valid.', details: parsed.error.flatten() });
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  if (!tenantId || !branchId)
    return res.status(403).json({ error: 'Scope tenant/cabang tidak tersedia.' });
  const value = parsed.data;
  const id = randomUUID();
  const result = await dbQuery(
    `INSERT INTO print_jobs (id, tenant_id, branch_id, user_id, document_type, document_id, printer, transport, status, reprint, reprint_reason, reprint_sequence, idempotency_key, content_hash)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'started',$9,$10,CASE WHEN $9 THEN COALESCE((SELECT MAX(reprint_sequence)+1 FROM print_jobs WHERE tenant_id=$2 AND document_type=$5 AND document_id IS NOT DISTINCT FROM $6),1) ELSE 0 END,$11,$12)
    ON CONFLICT (tenant_id, idempotency_key) DO NOTHING RETURNING id,status,reprint_sequence`,
    [
      id,
      tenantId,
      branchId,
      req.authActor?.userId || null,
      value.documentType,
      value.documentId || null,
      value.printer || null,
      value.transport,
      value.reprint,
      value.reprintReason || null,
      value.idempotencyKey,
      value.contentHash,
    ]
  );
  if (result.rows[0]) return res.status(201).json(result.rows[0]);
  const existing = await dbQuery(
    `SELECT id,status,reprint_sequence FROM print_jobs WHERE tenant_id=$1 AND idempotency_key=$2`,
    [tenantId, value.idempotencyKey]
  );
  res.status(200).json(existing.rows[0]);
};

export const recordPrintResult = async (req: Request, res: Response) => {
  const parsed = resultSchema.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: 'Hasil job cetak tidak valid.', details: parsed.error.flatten() });
  const result = await dbQuery(
    `UPDATE print_jobs SET status=$1,error_code=$2,error_message=$3,completed_at=NOW() WHERE id=$4 AND tenant_id=$5 AND branch_id=$6 AND status='started' RETURNING id,status`,
    [
      parsed.data.status,
      parsed.data.errorCode || null,
      parsed.data.errorMessage || null,
      req.params.id,
      req.tenantId,
      req.branchId,
    ]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Job cetak aktif tidak ditemukan.' });
  res.json(result.rows[0]);
};

export const listPrintJobs = async (req: Request, res: Response) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const result = await dbQuery(
    `SELECT id,branch_id,user_id,document_type,document_id,printer,transport,status,error_code,error_message,reprint,reprint_reason,reprint_sequence,content_hash,started_at,completed_at,created_at FROM print_jobs WHERE tenant_id=$1 AND branch_id=$2 ORDER BY created_at DESC LIMIT $3`,
    [req.tenantId, req.branchId, limit]
  );
  res.json({ jobs: result.rows });
};

export const reprintPrintJob = async (req: Request, res: Response) => {
  const reason = z.string().trim().min(3).max(500).safeParse(req.body?.reason);
  if (!reason.success) return res.status(400).json({ error: 'Alasan cetak ulang wajib diisi.' });
  const source = await dbQuery(
    `SELECT document_type,document_id,printer,transport,content_hash FROM print_jobs WHERE id=$1 AND tenant_id=$2 AND branch_id=$3`,
    [req.params.id, req.tenantId, req.branchId]
  );
  if (!source.rows[0]) return res.status(404).json({ error: 'Job cetak tidak ditemukan.' });
  res.json({
    sourceJobId: req.params.id,
    ...source.rows[0],
    reprint: true,
    reprintReason: reason.data,
  });
};
