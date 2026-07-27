import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { dbQuery, dbTransaction } from '../../lib/db.js';

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
  const created = await dbTransaction(async (client) => {
    if (value.reprint) {
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
        `${tenantId}:${value.documentType}:${value.documentId || ''}`,
      ]);
      const policyResult = await client.query(
        `SELECT COALESCE(settings #>> '{printConfig,reprintPolicy}', 'reason_required') AS policy, COALESCE((settings #>> '{printConfig,reprintCopyCap}')::int, 20) AS copy_cap FROM tenants WHERE id=$1`,
        [tenantId]
      );
      const policy = policyResult.rows[0]?.policy;
      const copyCap = Number(policyResult.rows[0]?.copy_cap) || 20;
      if (policy === 'deny')
        return { error: 'Cetak ulang ditolak oleh kebijakan tenant.', status: 403 };
      const countResult = await client.query(
        `SELECT COALESCE(SUM(copies), 0)::int AS total FROM print_jobs WHERE tenant_id=$1 AND document_type=$2 AND document_id IS NOT DISTINCT FROM $3 AND reprint=TRUE`,
        [tenantId, value.documentType, value.documentId || null]
      );
      if ((countResult.rows[0]?.total || 0) + value.copies > copyCap) {
        return { error: `Batas cetak ulang ${copyCap} salinan telah tercapai.`, status: 409 };
      }
    }
    const result = await client.query(
      `INSERT INTO print_jobs (id, tenant_id, branch_id, user_id, document_type, document_id, printer, transport, status, reprint, reprint_reason, reprint_sequence, idempotency_key, content_hash, copies)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'started',$9,$10,CASE WHEN $9 THEN COALESCE((SELECT MAX(reprint_sequence)+1 FROM print_jobs WHERE tenant_id=$2 AND document_type=$5 AND document_id IS NOT DISTINCT FROM $6),1) ELSE 0 END,$11,$12,$13)
       ON CONFLICT (tenant_id, idempotency_key) DO NOTHING RETURNING id,status,reprint_sequence`,
      [
        randomUUID(),
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
        value.copies,
      ]
    );
    if (result.rows[0]) return { job: result.rows[0], status: 201 };
    const existing = await client.query(
      `SELECT id,status,reprint_sequence FROM print_jobs WHERE tenant_id=$1 AND idempotency_key=$2`,
      [tenantId, value.idempotencyKey]
    );
    return { job: existing.rows[0], status: 200 };
  });
  if ('error' in created) return res.status(created.status).json({ error: created.error });
  return res.status(created.status).json(created.job);
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
  const pagination = z
    .object({
      limit: z.coerce.number().int().min(1).max(200).default(50),
      offset: z.coerce.number().int().min(0).max(10_000).default(0),
    })
    .safeParse(req.query);
  if (!pagination.success)
    return res.status(400).json({ error: 'Parameter riwayat print tidak valid.' });
  const { limit, offset } = pagination.data;
  const [result, countResult] = await Promise.all([
    dbQuery(
      `SELECT id,branch_id,user_id,document_type,document_id,printer,transport,status,error_code,error_message,reprint,reprint_reason,reprint_sequence,content_hash,started_at,completed_at,created_at FROM print_jobs WHERE tenant_id=$1 AND branch_id=$2 ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
      [req.tenantId, req.branchId, limit, offset]
    ),
    dbQuery(`SELECT COUNT(*)::int AS total FROM print_jobs WHERE tenant_id=$1 AND branch_id=$2`, [
      req.tenantId,
      req.branchId,
    ]),
  ]);
  res.json({ jobs: result.rows, total: countResult.rows[0]?.total || 0, offset, limit });
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
