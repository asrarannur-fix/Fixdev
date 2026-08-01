import { dbQuery, dbTransaction } from '../../lib/db.js';
import { logger } from '../../lib/logger.js';
import { z } from 'zod';
import { serviceApprovalTransition } from '../../domain/serviceWorkflow.js';

const publicTicketLookupSchema = z.object({
  ticketNo: z.string().trim().min(3).max(40),
  phoneLast4: z.string().regex(/^\d{4}$/),
});

const portalApprovalSchema = z
  .object({
    ticketId: z.string().uuid(),
    token: z.string().uuid(),
    approved: z.boolean(),
    signer: z.string().trim().min(2).max(120),
    signature: z.string().trim().max(500).optional(),
    reason: z.string().trim().min(3).max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.approved && !data.reason)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: 'Alasan penolakan wajib diisi.',
      });
  });

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function obscureName(name?: string): string {
  if (!name) return 'Pelanggan';
  return name
    .trim()
    .split(' ')
    .map((part) =>
      part.length <= 2 ? part : `${part[0]}${'*'.repeat(part.length - 2)}${part.at(-1)}`
    )
    .join(' ');
}

function publicTicketRow(row: any) {
  return {
    ticketId: row.id,
    ticketNo: row.ticketNo,
    deviceName: row.deviceName,
    deviceBrandModel: row.deviceBrandModel,
    deviceCategory: row.deviceCategory || 'Gadget / Elektronik',
    status: row.status,
    customerApprovalStatus: row.customerApprovalStatus,
    customerNameObscured: obscureName(row.customerName),
    estimatedCompletionDate: row.estimatedCompletionDate,
    timeline: (row.timeline || []).map((event: any) => ({
      status: event.status,
      timestamp: event.timestamp,
    })),
    lastUpdated: row.updatedAt || row.createdAt,
  };
}

function portalTicketRow(row: any) {
  return {
    ...publicTicketRow(row),
    ticketId: row.id,
    estimatedCost: Number(row.estimatedCost || 0),
    downPayment: Number(row.downPayment || 0),
  };
}

export const getPublicTicketByToken = async (req: any, res: any) => {
  const token = req.params.token;
  const tenantId = req.hostTenant?.id;
  if (!tenantId || !UUID_PATTERN.test(tenantId))
    return res.status(404).json({ error: 'Service ticket not found' });
  // public_tracking_token is a UUID; reject obviously-invalid formats early
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!token || !uuidPattern.test(token)) {
    return res.status(404).json({ error: 'Service ticket not found' });
  }
  try {
    const result = await dbQuery(
      `SELECT s.id,s.ticket_no AS "ticketNo",s.device_name AS "deviceName",s.device_brand_model AS "deviceBrandModel",
        s.device_category AS "deviceCategory",s.status,s.customer_approval_status AS "customerApprovalStatus",
        s.estimated_cost AS "estimatedCost",s.down_payment AS "downPayment",
        s.estimated_completion_date AS "estimatedCompletionDate",(SELECT COALESCE(jsonb_agg(jsonb_build_object('id', e.id, 'status', e.to_status, 'note', e.note, 'timestamp', e.created_at, 'operator', u.email) ORDER BY e.created_at ASC), '[]'::jsonb)
        FROM service_status_events e LEFT JOIN users u ON u.id = e.actor_user_id WHERE e.ticket_id = s.id) AS timeline,s.updated_at AS "updatedAt",
        s.created_at AS "createdAt",s.tenant_id AS "tenantId",c.name AS "customerName"
       FROM service_tickets s LEFT JOIN customers c ON c.id=s.customer_id AND c.tenant_id=s.tenant_id
       WHERE s.public_tracking_token=$1 AND s.tenant_id=$2 AND s.deleted_at IS NULL LIMIT 1`,
      [token, tenantId]
    );
    if (!result.rows[0] || (req.hostTenant && result.rows[0].tenantId !== req.hostTenant.id))
      return res.status(404).json({ error: 'Service ticket not found' });
    res.set('Cache-Control', 'no-store').json(publicTicketRow(result.rows[0]));
  } catch (error: any) {
    logger.error({ err: error.message }, 'Public ticket token lookup failed');
    res.status(500).json({ error: 'Layanan pelacakan tiket sedang tidak tersedia.' });
  }
};

export const getPublicTicketByNumber = async (req: any, res: any) => {
  const parsed = publicTicketLookupSchema.safeParse(req.body);
  const tenantId = req.hostTenant?.id;
  if (!parsed.success) return res.status(422).json({ error: 'Nomor tiket dan 4 digit terakhir nomor HP wajib diisi.' });
  if (!tenantId || !UUID_PATTERN.test(tenantId)) return res.status(404).json({ error: 'Service ticket not found' });
  try {
    const result = await dbQuery(
      `SELECT s.ticket_no AS "ticketNo",s.device_name AS "deviceName",s.device_brand_model AS "deviceBrandModel",
        s.device_category AS "deviceCategory",s.status,s.customer_approval_status AS "customerApprovalStatus",
        s.estimated_completion_date AS "estimatedCompletionDate",(SELECT COALESCE(jsonb_agg(jsonb_build_object('id', e.id, 'status', e.to_status, 'note', e.note, 'timestamp', e.created_at, 'operator', u.email) ORDER BY e.created_at ASC), '[]'::jsonb)
        FROM service_status_events e LEFT JOIN users u ON u.id = e.actor_user_id WHERE e.ticket_id = s.id) AS timeline,s.updated_at AS "updatedAt",
        s.created_at AS "createdAt",c.name AS "customerName"
       FROM service_tickets s JOIN customers c ON c.id=s.customer_id AND c.tenant_id=s.tenant_id
       WHERE UPPER(s.ticket_no)=UPPER($1) AND RIGHT(regexp_replace(c.phone,'[^0-9]','','g'),4)=$2
         AND s.tenant_id=$3 AND s.deleted_at IS NULL LIMIT 1`,
      [parsed.data.ticketNo, parsed.data.phoneLast4, tenantId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Service ticket not found' });
    return res.json(publicTicketRow(result.rows[0]));
  } catch (error: any) {
    logger.error({ err: error.message }, 'Public ticket number lookup failed');
    return res.status(500).json({ error: 'Layanan pelacakan tiket sedang tidak tersedia.' });
  }
};

export const verifyWarrantyQr = async (req: any, res: any) => {
  const ticketNo = String(req.body?.ticketNo || '').trim();
  const tenantId = req.hostTenant?.id;
  if (!ticketNo) return res.status(400).json({ error: 'Missing ticketNo parameter.' });
  if (!tenantId || !UUID_PATTERN.test(tenantId))
    return res.status(404).json({ error: 'Ticket not found.' });
  try {
    const result = await dbQuery(
      `SELECT s.ticket_no AS "ticketNo",s.device_name AS "deviceName",s.warranty_months AS "warrantyMonths",
        s.warranty_ends_at AS "warrantyEndsAt",c.name AS "customerName"
       FROM service_tickets s LEFT JOIN customers c ON c.id=s.customer_id AND c.tenant_id=s.tenant_id
       WHERE UPPER(s.ticket_no)=UPPER($1) AND s.tenant_id=$2 AND s.deleted_at IS NULL LIMIT 1`,
      [ticketNo, tenantId]
    );
    const ticket = result.rows[0];
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    const isWarrantyActive = ticket.warrantyEndsAt
      ? new Date(ticket.warrantyEndsAt) > new Date()
      : false;
    res.json({
      ticketNo: ticket.ticketNo,
      deviceName: ticket.deviceName,
      customerNameObscured: obscureName(ticket.customerName),
      warrantyMonths: ticket.warrantyMonths,
      warrantyEndsAt: ticket.warrantyEndsAt,
      isWarrantyActive,
      status: isWarrantyActive ? 'WARRANTY_ACTIVE' : 'WARRANTY_EXPIRED',
      verifiedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error({ err: error.message }, 'Public warranty verification failed');
    res.status(500).json({ error: 'Layanan verifikasi garansi sedang tidak tersedia.' });
  }
};

export const getPortalTicketDetail = async (req: any, res: any) => {
  const ticketId = String(req.body?.ticketId || '');
  const token = String(req.body?.token || '');
  if (!UUID_PATTERN.test(ticketId) || !UUID_PATTERN.test(token))
    return res.status(422).json({ error: 'Parameter portal tidak valid.' });
  const tenantId = req.hostTenant?.id;
  if (!tenantId) return res.status(404).json({ error: 'Tenant not found.' });
  try {
    const result = await dbQuery(
      `SELECT s.id,s.ticket_no AS "ticketNo",s.device_name AS "deviceName",s.device_brand_model AS "deviceBrandModel",
        s.device_category AS "deviceCategory",s.status,s.customer_approval_status AS "customerApprovalStatus",
        s.estimated_cost AS "estimatedCost",s.down_payment AS "downPayment",
        s.estimated_completion_date AS "estimatedCompletionDate",(SELECT COALESCE(jsonb_agg(jsonb_build_object('id', e.id, 'status', e.to_status, 'note', e.note, 'timestamp', e.created_at, 'operator', u.email) ORDER BY e.created_at ASC), '[]'::jsonb)
        FROM service_status_events e LEFT JOIN users u ON u.id = e.actor_user_id WHERE e.ticket_id = s.id) AS timeline,s.updated_at AS "updatedAt",
        s.created_at AS "createdAt",c.name AS "customerName"
       FROM service_tickets s LEFT JOIN customers c ON c.id=s.customer_id AND c.tenant_id=s.tenant_id
       WHERE s.id=$1 AND s.public_tracking_token=$2 AND s.tenant_id=$3 AND s.deleted_at IS NULL LIMIT 1`,
       [ticketId, token, tenantId]
    );
    if (!result.rows[0])
      return res.status(404).json({ error: 'Tiket tidak ditemukan atau token tidak valid.' });
    res.json(portalTicketRow(result.rows[0]));
  } catch (err: any) {
    logger.error({ err: err.message }, 'Portal detail fetch failed');
    res.status(500).json({ error: 'Gagal memuat detail tiket.' });
  }
};

export const approvePortalTicket = async (req: any, res: any) => {
  const parsed = portalApprovalSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: 'Data persetujuan tidak valid.' });
  const { ticketId, token, approved, signer, signature, reason } = parsed.data;
  const tenantId = req.hostTenant?.id;
  if (!tenantId) return res.status(404).json({ error: 'Tenant not found.' });
  try {
    const result = await dbTransaction(async (client) => {
      const lock = await client.query(
        `SELECT id,status,ticket_no,customer_id,device_name FROM service_tickets
         WHERE id=$1 AND public_tracking_token=$2 AND tenant_id=$3 AND deleted_at IS NULL FOR UPDATE`,
        [ticketId, token, tenantId]
      );
      const ticket = lock.rows[0];
      if (!ticket) throw { status: 404, message: 'Tiket tidak ditemukan atau token tidak valid.' };
      if (!['MENUGGU_APPROVAL', 'ESTIMATE_PENDING'].includes(ticket.status)) {
        throw { status: 409, message: 'Tiket tidak sedang menunggu persetujuan.' };
      }
       const approval = serviceApprovalTransition(approved);
       const nextStatus = approval.status;

      const note = approved
        ? `Estimasi disetujui pelanggan: ${signer}`
        : `Estimasi ditolak pelanggan: ${reason}`;
      await client.query(
`UPDATE service_tickets SET status=$1,customer_approval_status=$2,provisional_signature_name=$3,
           provisional_signature=$4,provisional_approved_at=$5,updated_at=NOW() WHERE id=$6 AND tenant_id=$7`,
        [
          nextStatus,
          approval.approvalStatus,
           signer,
           signature || null,
           approved ? new Date() : null,
           ticketId,
           tenantId,
        ]
      );
      const event = await client.query(
        `INSERT INTO service_status_events (tenant_id,ticket_id,from_status,to_status,note,actor_user_id,metadata)
          VALUES ($1,$2,$3,$4,$5,NULL,$6::jsonb) RETURNING id`,

        [
          tenantId,
          ticketId,
          ticket.status,
          nextStatus,
          note,
          JSON.stringify({ portal: true, signer, reason: reason || null }),
        ]
      );
      await client.query(
        `INSERT INTO audit_logs(id,tenant_id,user_id,action,details,metadata)
         VALUES(gen_random_uuid(),$1,NULL,'SERVICE_PORTAL_APPROVAL',$2,$3::jsonb)`,
        [
          tenantId,
          `${ticket.ticket_no}: ${approval.approvalStatus} oleh ${signer}`,
          JSON.stringify({ ticketId, fromStatus: ticket.status, toStatus: nextStatus }),
        ]
      );
      await client.query('SAVEPOINT portal_notification');
      try {
        const customer = await client.query(
          'SELECT name,phone FROM customers WHERE id=$1 AND tenant_id=$2',
          [ticket.customer_id, tenantId]
        );
        const settings = await client.query('SELECT settings FROM tenants WHERE id=$1', [tenantId]);
        if (customer.rows[0]?.phone && settings.rows[0]?.settings?.waConfig?.sendingMethod !== 'MANUAL') {
          await client.query(
            `INSERT INTO whatsapp_queue(tenant_id,recipient_name,recipient_phone,type,message,status,ticket_id,event_id,scheduled_time)
             VALUES($1,$2,$3,'SERVICE_UPDATE',$4,'PENDING',$5,$6,NOW())`,
            [tenantId, customer.rows[0].name, customer.rows[0].phone, note, ticket.id, event.rows[0].id]
          );
        }
        } catch (error: any) {
          await client.query('ROLLBACK TO SAVEPOINT portal_notification');
          logger.error({ err: error.message, tenantId, ticketId }, 'Portal approval notification failed');
        }
      await client.query('RELEASE SAVEPOINT portal_notification');
      return { message: approved ? 'Estimasi berhasil disetujui.' : 'Estimasi ditolak.' };
    });
    res.json(result);
  } catch (err: any) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    logger.error({ err: err.message }, 'Portal approval failed');
    res.status(500).json({ error: 'Gagal memproses persetujuan.' });
  }
};
