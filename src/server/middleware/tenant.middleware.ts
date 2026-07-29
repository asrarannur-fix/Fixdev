import type { Request, Response, NextFunction } from 'express';
import { dbQuery } from '../../lib/db.js';

/**
 * Middleware untuk memastikan tenantId valid dan aktif
 */
export async function requireValidTenant(req: Request, res: Response, next: NextFunction) {
  const tenantId = req.tenantId;
  if (!tenantId) {
    return res.status(403).json({ error: 'Tenant ID tidak valid.' });
  }

  try {
    const result = await dbQuery(
      'SELECT id, status FROM tenants WHERE id = $1 LIMIT 1',
      [tenantId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Tenant tidak ditemukan.' });
    }
    if (result.rows[0].status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Tenant tidak aktif.' });
    }
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Gagal memvalidasi tenant.' });
  }
}

/**
 * Middleware untuk memastikan tiket servis milik tenant yang aktif
 */
export async function requireServiceTicketTenant(req: Request, res: Response, next: NextFunction) {
  const tenantId = req.tenantId;
  const ticketId = req.params.id;

  if (!tenantId || !ticketId) {
    return res.status(403).json({ error: 'Tenant ID atau Ticket ID tidak valid.' });
  }

  try {
    const result = await dbQuery(
      `SELECT id FROM service_tickets
       WHERE id=$1 AND tenant_id=$2 AND branch_id=$3 AND deleted_at IS NULL LIMIT 1`,
      [ticketId, tenantId, req.branchId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Tiket servis tidak ditemukan.' });
    }
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Gagal memvalidasi tiket servis.' });
  }
}
