import type { Request, Response } from "express";
import { dbQuery } from "../../lib/db.js";
import { recordAuditEvent } from "./audit.controller.js";
import { logger } from "../../lib/logger.js";

export async function telegramTestHandler(req: Request, res: Response) {
  const tenantId = req.tenantId;
  if (!tenantId) return res.status(400).json({ error: "tenantId is required" });

  try {
    const result = await dbQuery(
      `SELECT settings->'notificationSettings' AS settings FROM tenants WHERE id=$1 LIMIT 1`,
      [tenantId],
    );
    const settings = result.rows[0]?.settings || {};
    const botToken = String(settings.telegramBotToken || "").trim();
    const chatId = String(settings.telegramChatId || "").trim();
    if (!botToken || !chatId) {
      await recordAuditEvent(tenantId, req.authActor?.userId || null, "TELEGRAM_TEST_FAILED", "Telegram test failed: Bot Token or Chat ID not configured.");
      return res.status(422).json({ error: "Bot Token dan Chat ID Telegram belum dikonfigurasi." });
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: String(req.body?.message || "Tes integrasi ERP berhasil dikirim."),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok !== true) {
      logger.error({ tenantId, error: payload.description || `Telegram HTTP ${response.status}` }, "Telegram test failed");
      await recordAuditEvent(tenantId, req.authActor?.userId || null, "TELEGRAM_TEST_FAILED", `Telegram test failed: ${payload.description || `HTTP ${response.status}`}`, { chatId, response: payload });
      return res.status(502).json({ error: payload.description || `Telegram HTTP ${response.status}` });
    }
    await recordAuditEvent(tenantId, req.authActor?.userId || null, "TELEGRAM_TEST_SUCCESS", `Telegram test message sent to ${chatId}`, { messageId: payload.result?.message_id });
    return res.json({ success: true, messageId: payload.result?.message_id ?? null });
  } catch (error: any) {
    logger.error({ err: error.message, tenantId }, "Telegram test handler exception");
    await recordAuditEvent(tenantId, req.authActor?.userId || null, "TELEGRAM_TEST_FAILED", `Telegram test failed: service unavailable.`, { error: error.message });
    return res.status(502).json({ error: "Layanan Telegram tidak dapat dihubungi." });
  }
}
