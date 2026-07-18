import { dbQuery } from "../../lib/db.js";

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
  if (!ticketNo) return res.status(400).json({ error: "Missing ticket number." });
  try {
    const result = await dbQuery(
      `SELECT s.ticket_no AS "ticketNo",s.device_name AS "deviceName",s.device_brand_model AS "deviceBrandModel",
        s.device_category AS "deviceCategory",s.status,s.customer_approval_status AS "customerApprovalStatus",
        s.estimated_cost AS "estimatedCost",s.down_payment AS "downPayment",
        s.estimated_completion_date AS "estimatedCompletionDate",s.timeline,s.updated_at AS "updatedAt",
        s.created_at AS "createdAt",c.name AS "customerName"
       FROM service_tickets s LEFT JOIN customers c ON c.id=s.customer_id AND c.tenant_id=s.tenant_id
       WHERE UPPER(s.ticket_no)=UPPER($1) LIMIT 1`,
      [ticketNo],
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Service ticket not found" });
    res.json(publicTicketRow(result.rows[0]));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
        s.created_at AS "createdAt",c.name AS "customerName"
       FROM service_tickets s LEFT JOIN customers c ON c.id=s.customer_id AND c.tenant_id=s.tenant_id
       WHERE s.public_tracking_token=$1 LIMIT 1`,
      [token],
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Service ticket not found" });
    res.json(publicTicketRow(result.rows[0]));
  } catch (error: any) {
    if (error.message?.includes("does not exist") || error.message?.includes("relation")) {
      return res.status(404).json({ error: "Service ticket not found" });
    }
    res.status(500).json({ error: error.message });
  }
};

export const verifyWarrantyQr = async (req: any, res: any) => {
  const ticketNo = String(req.body?.ticketNo || "").trim();
  if (!ticketNo) return res.status(400).json({ error: "Missing ticketNo parameter." });
  try {
    const result = await dbQuery(
      `SELECT s.ticket_no AS "ticketNo",s.device_name AS "deviceName",s.warranty_months AS "warrantyMonths",
        s.warranty_ends_at AS "warrantyEndsAt",c.name AS "customerName"
       FROM service_tickets s LEFT JOIN customers c ON c.id=s.customer_id AND c.tenant_id=s.tenant_id
       WHERE UPPER(s.ticket_no)=UPPER($1) LIMIT 1`,
      [ticketNo],
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
  } catch (error: any) { res.status(500).json({ error: error.message }); }
};
