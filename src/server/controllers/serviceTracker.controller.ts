import { dbQuery, dbTransaction } from "../../lib/db.js";
import { logger } from "../../lib/logger.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function obscureName(name?: string): string {
  if (!name) return "Pelanggan";
  return name.trim().split(" ").map(part => part.length <= 2 ? part : `${part[0]}${"*".repeat(part.length - 2)}${part.at(-1)}`).join(" ");
}

function publicTicketRow(row: any) {
  return {
    ticketNo: row.ticketNo,
    deviceName: row.deviceName,
    deviceBrandModel: row.deviceBrandModel,
    deviceCategory: row.deviceCategory || "Gadget / Elektronik",
    status: row.status,
    customerApprovalStatus: row.customerApprovalStatus,
    customerNameObscured: obscureName(row.customerName),
    estimatedCost: Number(row.estimatedCost || 0),
    downPayment: Number(row.downPayment || 0),
    estimatedCompletionDate: row.estimatedCompletionDate,
    timeline: row.timeline || [],
    lastUpdated: row.updatedAt || row.createdAt,
  };
}

export const getPublicTicketStatus = async (req: any, res: any) => {
  // Ticket numbers contain slashes (e.g. TKT/2607/000029) which Express
  // can't capture fully via :ticketNo param in a sub-router.
  // Use originalUrl to extract the full ticket number.
  const url = req.originalUrl || "";
  const statusIdx = url.indexOf("/status/");
  let ticketNo = "";
  if (statusIdx !== -1) {
    ticketNo = url.substring(statusIdx + 8); // length of "/status/"
  }
  ticketNo = ticketNo.split("?")[0]; // remove query params
  if (!ticketNo) ticketNo = String(req.params.ticketNo || "").trim();
  const tenantId = req.hostTenant?.id;
  if (!ticketNo) return res.status(400).json({ error: "Missing ticket number." });
  if (!tenantId || !UUID_PATTERN.test(tenantId)) return res.status(404).json({ error: "Service ticket not found" });
  try {
    const result = await dbQuery(
      `SELECT s.ticket_no AS "ticketNo",s.device_name AS "deviceName",s.device_brand_model AS "deviceBrandModel",
        s.device_category AS "deviceCategory",s.status,s.customer_approval_status AS "customerApprovalStatus",
        s.estimated_cost AS "estimatedCost",s.down_payment AS "downPayment",
        s.estimated_completion_date AS "estimatedCompletionDate",s.timeline,s.updated_at AS "updatedAt",
        s.created_at AS "createdAt",c.name AS "customerName"
       FROM service_tickets s LEFT JOIN customers c ON c.id=s.customer_id AND c.tenant_id=s.tenant_id
       WHERE UPPER(s.ticket_no)=UPPER($1) AND s.tenant_id=$2 LIMIT 1`,
      [ticketNo, tenantId],
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Service ticket not found" });
    res.json(publicTicketRow(result.rows[0]));
  } catch (error: any) {
    logger.error({ err: error.message }, "Public ticket status lookup failed");
    res.status(500).json({ error: "Layanan pelacakan tiket sedang tidak tersedia." });
  }
};

export const getPublicTicketByToken = async (req: any, res: any) => {
  const token = req.params.token;
  // public_tracking_token is a UUID; reject obviously-invalid formats early
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!token || !uuidPattern.test(token)) {
    return res.status(404).json({ error: "Service ticket not found" });
  }
  try {
    const result = await dbQuery(
      `SELECT s.ticket_no AS "ticketNo",s.device_name AS "deviceName",s.device_brand_model AS "deviceBrandModel",
        s.device_category AS "deviceCategory",s.status,s.customer_approval_status AS "customerApprovalStatus",
        s.estimated_cost AS "estimatedCost",s.down_payment AS "downPayment",
        s.estimated_completion_date AS "estimatedCompletionDate",s.timeline,s.updated_at AS "updatedAt",
        s.created_at AS "createdAt",s.tenant_id AS "tenantId",c.name AS "customerName"
       FROM service_tickets s LEFT JOIN customers c ON c.id=s.customer_id AND c.tenant_id=s.tenant_id
       WHERE s.public_tracking_token=$1 LIMIT 1`,
      [token],
    );
    if (!result.rows[0] || (req.hostTenant && result.rows[0].tenantId !== req.hostTenant.id)) return res.status(404).json({ error: "Service ticket not found" });
    res.json(publicTicketRow(result.rows[0]));
  } catch (error: any) {
    logger.error({ err: error.message }, "Public ticket token lookup failed");
    res.status(500).json({ error: "Layanan pelacakan tiket sedang tidak tersedia." });
  }
};

export const verifyWarrantyQr = async (req: any, res: any) => {
  const ticketNo = String(req.body?.ticketNo || "").trim();
  const tenantId = req.hostTenant?.id;
  if (!ticketNo) return res.status(400).json({ error: "Missing ticketNo parameter." });
  if (!tenantId || !UUID_PATTERN.test(tenantId)) return res.status(404).json({ error: "Ticket not found." });
  try {
    const result = await dbQuery(
      `SELECT s.ticket_no AS "ticketNo",s.device_name AS "deviceName",s.warranty_months AS "warrantyMonths",
        s.warranty_ends_at AS "warrantyEndsAt",c.name AS "customerName"
       FROM service_tickets s LEFT JOIN customers c ON c.id=s.customer_id AND c.tenant_id=s.tenant_id
       WHERE UPPER(s.ticket_no)=UPPER($1) AND s.tenant_id=$2 LIMIT 1`,
      [ticketNo, tenantId],
    );
    const ticket = result.rows[0];
    if (!ticket) return res.status(404).json({ error: "Ticket not found." });
    const isWarrantyActive = ticket.warrantyEndsAt ? new Date(ticket.warrantyEndsAt) > new Date() : false;
    res.json({
      ticketNo: ticket.ticketNo, deviceName: ticket.deviceName,
      customerNameObscured: obscureName(ticket.customerName), warrantyMonths: ticket.warrantyMonths,
      warrantyEndsAt: ticket.warrantyEndsAt, isWarrantyActive,
      status: isWarrantyActive ? "WARRANTY_ACTIVE" : "WARRANTY_EXPIRED",
      verifiedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error({ err: error.message }, "Public warranty verification failed");
    res.status(500).json({ error: "Layanan verifikasi garansi sedang tidak tersedia." });
  }
};

export const getPortalTicketDetail = async (req: any, res: any) => {
  const { ticketId, token } = req.body;
  if (!ticketId || !token) return res.status(400).json({ error: "Missing parameters." });
  const tenantId = req.hostTenant?.id;
  if (!tenantId) return res.status(404).json({ error: "Tenant not found." });
  try {
    const result = await dbQuery(
      `SELECT s.ticket_no AS "ticketNo",s.device_name AS "deviceName",s.device_brand_model AS "deviceBrandModel",
        s.device_category AS "deviceCategory",s.status,s.customer_approval_status AS "customerApprovalStatus",
        s.estimated_cost AS "estimatedCost",s.down_payment AS "downPayment",
        s.estimated_completion_date AS "estimatedCompletionDate",s.timeline,s.updated_at AS "updatedAt",
        s.created_at AS "createdAt",c.name AS "customerName"
       FROM service_tickets s LEFT JOIN customers c ON c.id=s.customer_id AND c.tenant_id=s.tenant_id
       WHERE s.id=$1 AND s.public_tracking_token=$2 AND s.tenant_id=$3 LIMIT 1`,
      [ticketId, token, tenantId],
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Ticket not found or token invalid." });
    res.json(publicTicketRow(result.rows[0]));
  } catch (err: any) {
    logger.error({ err: err.message }, "Portal detail fetch failed");
    res.status(500).json({ error: "Gagal memuat detail tiket." });
  }
};

export const approvePortalTicket = async (req: any, res: any) => {
  const { ticketId, token, approved, signer, reason } = req.body;
  if (!ticketId || !token) return res.status(400).json({ error: "Missing parameters." });
  const tenantId = req.hostTenant?.id;
  if (!tenantId) return res.status(404).json({ error: "Tenant not found." });
  try {
    const result = await dbTransaction(async (client) => {
      const lock = await client.query(
        `SELECT id,status,customer_approval_status AS "approvalStatus",timeline,ticket_no AS "ticketNo"
         FROM service_tickets WHERE id=$1 AND public_tracking_token=$2 AND tenant_id=$3 FOR UPDATE`,
        [ticketId, token, tenantId],
      );
      const ticket = lock.rows[0];
      if (!ticket) throw { status: 404, message: "Ticket not found or token invalid." };
      if (ticket.status !== "MENUGGU_APPROVAL" && ticket.status !== "DIAGNOSA") {
        throw { status: 400, message: `Status tiket (${ticket.status}) tidak mengizinkan persetujuan.` };
      }
      const nextStatus = approved ? "SEDANG_DIKERJAKAN" : "APPROVAL_DITOLAK";
      const approvalStatus = approved ? "APPROVED" : "REJECTED";
      const note = approved ? `Disetujui oleh pelanggan${signer ? `: ${signer}` : ""}` : `Ditolak oleh pelanggan${reason ? `: ${reason}` : ""}`;
      const event = { status: nextStatus, note, timestamp: new Date().toISOString(), operator: signer || "Pelanggan (Portal)" };
      const timeline = [...(ticket.timeline || []), event];
      await client.query(
        `UPDATE service_tickets SET status=$1, customer_approval_status=$2, timeline=$3::jsonb, updated_at=NOW()
         WHERE id=$4`,
        [nextStatus, approvalStatus, JSON.stringify(timeline), ticketId],
      );
      await client.query(
        `INSERT INTO service_status_events (tenant_id,ticket_id,from_status,to_status,note,actor_user_id,metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
        [tenantId, ticketId, ticket.status, nextStatus, note, null, JSON.stringify({ portal: true, signer, reason })],
      );
      return { message: approved ? "Estimasi berhasil disetujui." : "Estimasi ditolak." };
    });
    res.json(result);
  } catch (err: any) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    logger.error({ err: err.message }, "Portal approval failed");
    res.status(500).json({ error: "Gagal memproses persetujuan." });
  }
};
