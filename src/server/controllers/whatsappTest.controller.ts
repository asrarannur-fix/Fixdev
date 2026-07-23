import type { Request, Response } from "express";
import { dbQuery } from "../../lib/db.js";

export async function whatsappTestHandler(req: Request, res: Response) {
  const tenantId = req.tenantId;
  if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
  try {
    const result = await dbQuery(`SELECT settings->'waConfig' AS config FROM tenants WHERE id=$1 LIMIT 1`, [tenantId]);
    const config = result.rows[0]?.config || {};
    if ((config.sendingMethod || "MANUAL") !== "API") {
      return res.json({ success: true, mode: "MANUAL", message: "Mode Manual Link aktif; tidak ada gateway API untuk diuji." });
    }
    const token = String(config.whatsappKey || config.apiToken || "").trim();
    const phoneId = String(config.phoneId || "").trim();
    if (!token || !phoneId || token === "waba_mock_api_key_placeholder") {
      return res.status(422).json({ error: "WhatsApp API token dan Phone ID belum dikonfigurasi." });
    }
    const response = await fetch(`https://graph.facebook.com/v20.0/${encodeURIComponent(phoneId)}`, {
      headers: { Authorization: "Bearer " + token },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.error) return res.status(502).json({ error: payload.error?.message || `Meta HTTP ${response.status}` });
    return res.json({ success: true, mode: "API", phoneId: payload.id || phoneId, verifiedName: payload.verified_name || null });
  } catch (error: any) {
    return res.status(502).json({ error: "Layanan WhatsApp tidak dapat dihubungi." });
  }
}
