import type { PrintConfig } from "./print";
import { escapeHtml, getPrintBaseCss, getPaperWidthStyle } from "./print";
import { getAuthClient } from "./authClient";

type PrintJob = {
  title: string;
  html: string;
  printConfig?: PrintConfig;
};

export type PrintResult = {
  ok: boolean;
  transport: "qz" | "browser" | "failed";
  error?: string;
};

declare global {
  interface Window { qz?: any; }
}

let qzSigningConfigured = false;

const getAuthToken = async (): Promise<string | null> => {
  try {
    const client = getAuthClient();
    if (!client) return null;
    const sessionData = await Promise.race([
      client.auth.getSession(),
      new Promise<never>((_, reject) =>
        window.setTimeout(() => reject(new Error("AUTH_SESSION_TIMEOUT")), 4000),
      ),
    ]);
    return sessionData.data.session?.access_token || null;
  } catch {
    return null;
  }
};

const configureQzSigning = async (): Promise<void> => {
  if (qzSigningConfigured) return;
  const qz = window.qz;
  if (!qz?.security) throw new Error("QZ security API tidak tersedia");
  qz.security.setSignatureAlgorithm?.("SHA512");

  qz.security.setCertificatePromise((resolve: (cert: string) => void, reject: (error: unknown) => void) => {
    fetch("/api/qz/certificate")
      .then((r) => {
        if (!r.ok) throw new Error("Sertifikat QZ gagal diambil");
        return r.text();
      })
      .then(resolve)
      .catch(reject);
  });

  qz.security.setSignaturePromise((toSign: string) => (resolve: (sig: string) => void, reject: (error: unknown) => void) => {
    void getAuthToken().then((token) => fetch("/api/qz/sign", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
      body: JSON.stringify({ data: toSign }),
    })).then(async (r) => {
      if (!r.ok) throw new Error("Signature QZ gagal dibuat");
      const body = await r.json();
      resolve(body.signature);
    }).catch(reject);
  });

  qzSigningConfigured = true;
};

const qzPrint = async (title: string, html: string, printConfig: PrintConfig): Promise<boolean> => {
  const qz = window.qz;
  const printerName = printConfig.printerName?.trim();
  if (!qz?.websocket || !qz?.printers || !qz?.configs || !printerName) return false;
  try {
    if (qz.signingConfigured !== false) await configureQzSigning();
    if (!qz.websocket.isActive?.()) await qz.websocket.connect();
    const printer = await qz.printers.find(printerName);
    if (!printer) throw new Error(`Printer tidak ditemukan: ${printConfig.printerName}`);
    await qz.print(qz.configs.create(printer, { jobName: title }), [{ type: "pixel", format: "html", flavor: "plain", data: html }]);
    return true;
  } catch (error) {
    console.warn("QZ Tray print gagal; fallback browser aktif", error);
    return false;
  }
};

export const listQzPrinters = async (): Promise<string[]> => {
  const qz = window.qz;
  if (!qz?.websocket || !qz?.printers) throw new Error("QZ Tray belum terpasang atau belum berjalan");
  try { if (qz.signingConfigured !== false) await configureQzSigning(); } catch {}
  if (!qz.websocket.isActive?.()) await qz.websocket.connect();
  return qz.printers.find();
};

export const checkQzTray = async (): Promise<{ connected: boolean; printers: string[]; error?: string }> => {
  try { return { connected: true, printers: await listQzPrinters() }; }
  catch (error) { return { connected: false, printers: [], error: error instanceof Error ? error.message : "QZ Tray tidak tersedia" }; }
};

export const printFrame = (frame: HTMLIFrameElement | Window, printConfig?: PrintConfig, title = "Print Job"): boolean => {
  const target: Window | null = typeof HTMLIFrameElement !== "undefined" && frame instanceof HTMLIFrameElement
    ? frame.contentWindow
    : frame as Window;
  const source = target?.document;
  if (!source?.body?.innerHTML) return false;
  const headAssets = Array.from(source.head?.querySelectorAll("style,link[rel='stylesheet']") || [])
    .map((node) => node.outerHTML)
    .join("");
  void printJobAsync({ title, html: headAssets + source.body.innerHTML, printConfig });
  return true;
};

/** QZ Tray when configured; browser dialog remains safe fallback. */
export const printJobAsync = async ({ title, html, printConfig }: PrintJob): Promise<PrintResult> => {
  const safeTitle = escapeHtml(title || "Print Job");
  if (printConfig?.printMode === "qz" && printConfig.printerName?.trim()) {
    if (await qzPrint(title, html, printConfig)) return { ok: true, transport: "qz" };
  }
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none";
  frame.setAttribute("aria-hidden", "true");
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) { frame.remove(); return { ok: false, transport: "failed", error: "Dokumen print tidak dapat dibuat" }; }
  try {
    doc.open();
    doc.write(`<!doctype html><html><head><title>${safeTitle}</title><style>${getPrintBaseCss(printConfig)}.print-root{width:${getPaperWidthStyle(printConfig)};max-width:100%;margin:0 auto}button{display:none!important}</style></head><body><main class="print-root">${html}</main></body></html>`);
    doc.close();
    await new Promise<void>((resolve) => {
      const imgs = Array.from(doc.querySelectorAll("img"));
      if (!imgs.length) return resolve();
      let pending = imgs.length;
      const done = () => { if (--pending <= 0) resolve(); };
      imgs.forEach((img) => {
        if (img.complete) done();
        else { img.addEventListener("load", done); img.addEventListener("error", done); }
      });
      window.setTimeout(resolve, 2500);
    });
    await new Promise<void>((resolve, reject) => window.setTimeout(() => {
      const target = frame.contentWindow;
      if (!target || typeof target.print !== "function") {
        reject(new Error("Browser print tidak tersedia"));
        return;
      }
      try {
        target.focus();
        target.print();
        window.setTimeout(resolve, 1000);
      } catch (error) {
        reject(error);
      }
    }, 100));
    return { ok: true, transport: "browser" };
  } catch (error) {
    return { ok: false, transport: "failed", error: error instanceof Error ? error.message : "Gagal mencetak lewat browser" };
  } finally {
    frame.remove();
  }
};

export const printJob = (job: PrintJob): Promise<PrintResult> => printJobAsync(job);
