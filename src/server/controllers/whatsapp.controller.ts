import { Request, Response } from "express";
import { getPool } from "../../lib/db.js";
import { z } from "zod";
import { logger } from "../../lib/logger.js";
import pg from "pg";
import { recordAuditEvent } from "./audit.controller.js";

const { Client } = pg;

// Define Zod schemas for validation
const whatsappLogSchema = z.object({
  recipientName: z.string().trim().min(1).max(255),
  recipientPhone: z.string().trim().min(1).max(50),
  type: z.string().trim().min(1).max(50),
  message: z.string().trim().min(1).max(4000),
  status: z.enum(["SENT", "FAILED", "PENDING"]).optional(),
  senderName: z.string().trim().max(255).optional(),
  channel: z.string().trim().max(50).optional(),
});

const whatsappQueueSchema = z.object({
  recipientName: z.string().trim().min(1).max(255),
  recipientPhone: z.string().trim().min(1).max(50),
  type: z.string().trim().min(1).max(50),
  message: z.string().trim().min(1).max(4000),
  scheduledTime: z.string().datetime().optional(),
  status: z.enum(["PENDING", "SENT", "FAILED"]).optional(),
});

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
    res.status(500).json({ error: "Operasi WhatsApp gagal diproses." });
  }
}

export async function whatsappPostLogsHandler(req: Request, res: Response) {
  const tenantId = req.tenantId || "";
  if (!tenantId) return res.status(400).json({ error: "tenantId is required" });

  const parsed = whatsappLogSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: "Data log WhatsApp tidak valid.", details: parsed.error.issues });
  }
  const { recipientName, recipientPhone, type, message, status, senderName, channel } = parsed.data;

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
    
    // Audit log
    await recordAuditEvent(tenantId, req.authActor?.userId || null, "WHATSAPP_LOG_CREATED", `WhatsApp message log created for ${recipientPhone}`, { type, status });
    
    res.status(201).json({ success: true, id: (result as any).rows[0]?.id });
  } catch (error: any) {
    logger.error({ err: error.message, tenantId }, "whatsappPostLogsHandler failed");
    res.status(500).json({ error: "Operasi WhatsApp gagal diproses." });
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
    logger.error({ err: error.message, tenantId }, "whatsappGetQueueHandler failed");
    res.status(500).json({ error: "Operasi WhatsApp gagal diproses." });
  }
}

export async function whatsappPostQueueHandler(req: Request, res: Response) {
  const tenantId = req.tenantId || "";
  if (!tenantId) return res.status(400).json({ error: "tenantId is required" });

  const parsed = whatsappQueueSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: "Data antrean WhatsApp tidak valid.", details: parsed.error.issues });
  }
  const { recipientName, recipientPhone, type, message, scheduledTime, status } = parsed.data;

  try {
    const result = await withDb((client) =>
      client.query(
        `insert into whatsapp_queue
          (tenant_id, recipient_name, recipient_phone, type, message, scheduled_time, status)
         values ($1,$2,$3,$4,$5,$6,$7)
         returning id`,
        [tenantId, recipientName, recipientPhone, type, message, scheduledTime || new Date().toISOString(), status || "PENDING"],
      ),
    );
    
    // Audit log
    await recordAuditEvent(tenantId, req.authActor?.userId || null, "WHATSAPP_QUEUE_CREATED", `WhatsApp message queued for ${recipientPhone}`, { type, scheduledTime });
    
    res.status(201).json({ success: true, id: (result as any).rows[0]?.id });
  } catch (error: any) {
    logger.error({ err: error.message, tenantId }, "whatsappPostQueueHandler failed");
    res.status(500).json({ error: "Operasi WhatsApp gagal diproses." });
  }
}
