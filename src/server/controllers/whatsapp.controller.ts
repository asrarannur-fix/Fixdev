import { Request, Response } from "express";
import { getPool } from "../../lib/db.js";

async function withDb<T>(fn: (client: any) => Promise<T>): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try { return await fn(client); }
  finally { client.release(); }
}

export async function whatsappGetLogsHandler(req: Request, res: Response) {
  const tenantId = req.tenantId || "";
  if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
  try {
    const result = await withDb((client) =>
      client.query(
        `select id, timestamp, recipient_name as "recipientName", recipient_phone as "recipientPhone",
          type, message, status, sender_name as "senderName", channel
         from whatsapp_logs
         where tenant_id = $1
         order by timestamp desc
         limit 200`,
        [tenantId],
      ),
    );
    res.json((result as any).rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function whatsappPostLogsHandler(req: Request, res: Response) {
  const tenantId = req.tenantId || "";
  const { recipientName, recipientPhone, type, message, status, senderName, channel } = req.body;
  if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
  try {
    const result = await withDb((client) =>
      client.query(
        `insert into whatsapp_logs
          (tenant_id, recipient_name, recipient_phone, type, message, status, sender_name, channel)
         values ($1,$2,$3,$4,$5,$6,$7,$8)
         returning id`,
        [tenantId, recipientName, recipientPhone, type, message, status || "SENT", senderName, channel],
      ),
    );
    res.json({ success: true, id: (result as any).rows[0]?.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function whatsappGetQueueHandler(req: Request, res: Response) {
  const tenantId = req.tenantId || "";
  if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
  try {
    const result = await withDb((client) =>
      client.query(
        `select id, recipient_name as "recipientName", recipient_phone as "recipientPhone",
          type, message, scheduled_time as "scheduledTime", status
         from whatsapp_queue
         where tenant_id = $1
         order by scheduled_time asc
         limit 200`,
        [tenantId],
      ),
    );
    res.json((result as any).rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function whatsappPostQueueHandler(req: Request, res: Response) {
  const tenantId = req.tenantId || "";
  const { recipientName, recipientPhone, type, message, scheduledTime, status } = req.body;
  if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
  try {
    const result = await withDb((client) =>
      client.query(
        `insert into whatsapp_queue
          (tenant_id, recipient_name, recipient_phone, type, message, scheduled_time, status)
         values ($1,$2,$3,$4,$5,$6,$7)
         returning id`,
        [tenantId, recipientName, recipientPhone, type, message, scheduledTime, status || "PENDING"],
      ),
    );
    res.json({ success: true, id: (result as any).rows[0]?.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
