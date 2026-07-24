import type { Request, Response } from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { logger } from "../../lib/logger.js";
import { recordAuditEvent } from "./audit.controller.js";

const CERT_PATH = process.env.QZ_CERT_PATH || path.join(process.cwd(), "certs", "qz-cert.pem");
const KEY_PATH = process.env.QZ_KEY_PATH || path.join(process.cwd(), "certs", "qz-key.pem");

const readFileSafe = (filePath: string): string | null => {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, "utf8").trim();
  } catch {
    return null;
  }
};

let cachedCert: string | null = null;
let cachedKey: string | null = null;
let cachedEnabled = false;

const refreshSigningConfig = () => {
  cachedCert = readFileSafe(CERT_PATH);
  cachedKey = readFileSafe(KEY_PATH);
  cachedEnabled = Boolean(cachedCert?.startsWith("-----BEGIN") && cachedKey?.startsWith("-----BEGIN"));
};

// Load once at startup
refreshSigningConfig();

/** Public endpoint — no auth required. Certificate is public by design. */
export const qzPublicCertHandler = (_req: Request, res: Response) => {
  if (!cachedEnabled) {
    res.status(503).json({ error: "QZ signing belum dikonfigurasi" });
    return;
  }
  res.type("text/plain").send(cachedCert);
};

export const qzSignHandler = async (req: Request, res: Response): Promise<void> => {
  if (!cachedEnabled) {
    await recordAuditEvent(req.tenantId || "unknown", req.authActor?.userId || null, "QZ_SIGN_FAILED", "QZ signing failed: not configured.", { dataPreview: req.body?.data?.slice(0, 100) });
    res.status(503).json({ error: "QZ signing belum dikonfigurasi" });
    return;
  }

  const { data } = req.body;
  if (!data || typeof data !== "string" || data.length > 100_000) {
    await recordAuditEvent(req.tenantId || "unknown", req.authActor?.userId || null, "QZ_SIGN_FAILED", "QZ signing failed: invalid payload.", { dataPreview: String(data || "").slice(0, 100) });
    res.status(400).json({ error: "Invalid signing payload" });
    return;
  }

  try {
    const signature = crypto.createSign("SHA512").update(data, "utf8").sign(cachedKey!, "base64");
    await recordAuditEvent(req.tenantId || "unknown", req.authActor?.userId || null, "QZ_SIGN_SUCCESS", "QZ data signed successfully.", { dataPreview: data.slice(0, 100) });
    res.json({ signature });
  } catch (err: any) {
    logger.error({ err: err.message }, "QZ signing failed");
    await recordAuditEvent(req.tenantId || "unknown", req.authActor?.userId || null, "QZ_SIGN_FAILED", `QZ signing failed: ${err.message}`, { dataPreview: data.slice(0, 100), error: err.message });
    res.status(500).json({ error: "Terjadi kesalahan pada server. Mohon coba lagi." });
  }
};
