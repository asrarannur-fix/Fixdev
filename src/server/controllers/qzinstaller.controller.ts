import type { Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { logger } from "../../lib/logger.js";

const CERT_PATH = process.env.QZ_CERT_PATH || `${process.cwd()}/certs/qz-cert.pem`;
const SITE_URL = process.env.SITE_URL || "https://fixdev.web.id";

// Source asset stays outside bundled server.cjs; cwd is project root in dev and PM2.
const BAT_PATH = path.resolve(process.cwd(), "src/server/assets/fixdev-qz-installer.bat");

/** Download the certificate as a .crt file */
export const qzCertDownloadHandler = (_req: Request, res: Response) => {
  try {
    if (!fs.existsSync(CERT_PATH)) {
      res.status(503).json({ error: "Certificate not found" });
      return;
    }
    const cert = fs.readFileSync(CERT_PATH, "utf8");
    res.setHeader("Content-Type", "application/x-x509-ca-cert; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="FIXDEV-QZ-override.crt"');
    res.send(cert);
  } catch (err: any) {
    logger.error({ err: err.message }, "Certificate download failed");
    res.status(500).json({ error: "Gagal mengunduh sertifikat" });
  }
};

/** Serve the batch installer with SITE_URL and embedded certificate injected */
export const qzInstallerBatHandler = (_req: Request, res: Response) => {
  try {
    if (!fs.existsSync(BAT_PATH)) {
      res.status(503).json({ error: "Installer not found" });
      return;
    }
    let bat = fs.readFileSync(BAT_PATH, "utf8");

    // Embed certificate as base64 — avoids network download issues with certutil
    const cert = fs.existsSync(CERT_PATH) ? fs.readFileSync(CERT_PATH) : null;
    const certB64 = cert ? cert.toString("base64") : "";

    bat = bat.replace(/__SITE_URL__/g, SITE_URL);
    bat = bat.replace(/__CERT_B64__/g, certB64);

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="FIXDEV-QZ-Trust-Installer.bat"');
    res.send(bat);
  } catch (err: any) {
    logger.error({ err: err.message }, "Installer generation failed");
    res.status(500).json({ error: "Gagal membuat installer" });
  }
};
