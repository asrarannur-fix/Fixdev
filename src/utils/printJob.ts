import type { PrintConfig } from './print';
import { escapeHtml, getPrintBaseCss, getPaperWidthStyle } from './print';
import { generateQrSvg } from './qrSvg';
import { applyWatermarkToHtml, getWatermarkConfig } from './watermark';
import {
  enqueuePrintJob,
  getPendingPrintJobs,
  markJobProcessing,
  markJobDone,
  markJobFailed,
} from './offlinePrintQueue';
import { emitPrintNotification } from '../components/PrintNotifications';

export type PrintJob = {
  title: string;
  html: string;
  printConfig?: PrintConfig;
  tenantId?: string;
  branchId?: string;
  userId?: string;
  documentType?: string;
  documentId?: string;
  reprint?: boolean;
  reprintReason?: string;
  qrPayload?: string;
};

const sanitizePrintHtml = (html: string, qrPayload?: string): string => {
  const document = new DOMParser().parseFromString(html, 'text/html');
  document
    .querySelectorAll('script,iframe,object,embed,link[rel="import"]')
    .forEach((node) => node.remove());
  document.querySelectorAll<HTMLElement>('*').forEach((node) => {
    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (
        name.startsWith('on') ||
        (['href', 'src', 'action', 'formaction'].includes(name) && /^javascript:/i.test(value))
      ) {
        node.removeAttribute(attribute.name);
      }
    }
  });
  document.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
    const source = image.getAttribute('src')?.trim() || '';
    const allowedDataImage = /^data:image\/(?:png|jpe?g|gif|webp|bmp);base64,[a-z0-9+/=\s]+$/i.test(
      source
    );
    if (/^(?:https?:)?\/\//i.test(source) || (source.startsWith('data:') && !allowedDataImage)) {
      image.replaceWith(
        Object.assign(document.createElement('div'), {
          className: 'image-placeholder',
          textContent: 'Gambar tidak aman dihapus dari dokumen print',
        })
      );
    }
  });
  const headStyles = Array.from(document.head.querySelectorAll('style'))
    .map((style) => style.outerHTML)
    .join('');
  let safe = headStyles + document.body.innerHTML;
  if (qrPayload) {
    const svg = generateQrSvg(qrPayload, 3, 2);
    safe = safe.replace(
      /<div class="qr-placeholder">[^<]*<\/div>/gi,
      `<div class="qr-rendered">${svg}</div>`
    );
  } else {
    safe = safe.replace(
      /<div class="qr-placeholder">[^<]*<\/div>/gi,
      '<div class="qr-rendered" style="text-align:center;padding:4px;font-size:9px;color:#666">[QR]</div>'
    );
  }
  return safe;
};

export type PrintResult = {
  ok: boolean;
  state: 'submitted' | 'failed';
  transport: 'qz' | 'browser';
  errorCode?: string;
  error?: string;
  jobId?: string;
};

declare global {
  interface Window {
    qz?: any;
  }
}

let qzSigningConfigured = false;
const printerQueues = new Map<string, Promise<unknown>>();

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timer = 0;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error('Batas waktu printer terlampaui')), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    window.clearTimeout(timer);
  }
};

const queuePrinter = <T>(printer: string, task: () => Promise<T>): Promise<T> => {
  const previous = printerQueues.get(printer) || Promise.resolve();
  const current = previous.catch(() => undefined).then(task);
  printerQueues.set(printer, current);
  void current.finally(() => {
    if (printerQueues.get(printer) === current) printerQueues.delete(printer);
  });
  return current;
};

const configureQzSigning = async (): Promise<void> => {
  if (qzSigningConfigured) return;
  const qz = window.qz;
  if (!qz?.security) throw new Error('QZ security API tidak tersedia');
  qz.security.setSignatureAlgorithm?.('SHA512');

  qz.security.setCertificatePromise(
    (resolve: (cert: string) => void, reject: (error: unknown) => void) => {
      fetch('/api/qz/certificate')
        .then((r) => {
          if (!r.ok) throw new Error('Sertifikat QZ gagal diambil');
          return r.text();
        })
        .then(resolve)
        .catch(reject);
    }
  );

  qz.security.setSignaturePromise(
    (toSign: string) => (resolve: (sig: string) => void, reject: (error: unknown) => void) => {
      void fetch('/api/qz/sign', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: toSign }),
      })
        .then(async (r) => {
          if (!r.ok) throw new Error('Signature QZ gagal dibuat');
          const body = await r.json();
          resolve(body.signature);
        })
        .catch((err) => {
          qzSigningConfigured = false;
          reject(err);
        });
    }
  );

  qzSigningConfigured = true;
};

export const createPrintDocument = (
  title: string,
  html: string,
  printConfig?: PrintConfig,
  qrPayload?: string
) =>
  `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title || 'Print Job')}</title><style>${getPrintBaseCss(printConfig)}.print-root{width:${getPaperWidthStyle(printConfig)};max-width:100%;margin:0 auto}.qr-rendered{text-align:center;margin:8px 0}.qr-rendered svg{display:inline-block}button{display:none!important}</style></head><body><main class="print-root">${sanitizePrintHtml(html, qrPayload)}</main></body></html>`;

const escPosRaw = (cmd: string): { type: string; format: string; data: string } => ({
  type: 'raw',
  format: 'plain',
  data: cmd,
});

const buildEscPosPrefix = (pc: PrintConfig): string => {
  const cmds: string[] = [];
  if (pc.density != null && pc.density >= 0 && pc.density <= 100) {
    const level = Math.min(7, Math.max(0, Math.round(pc.density / 14.3)));
    cmds.push(`\x1B\x37\x00${String.fromCharCode(level)}\x00`);
  }
  return cmds.join('');
};

const buildEscPosSuffix = (pc: PrintConfig): string => {
  const cmds: string[] = [];
  if (pc.feed && pc.feed > 0) cmds.push(`\x1B\x64${String.fromCharCode(pc.feed)}`);
  if (pc.cut) cmds.push('\x1D\x56\x00');
  return cmds.join('');
};

const qzPrint = async (
  title: string,
  html: string,
  printConfig: PrintConfig,
  qrPayload?: string
): Promise<PrintResult> => {
  const qz = window.qz;
  const printerName = printConfig.printerName?.trim();
  if (!printerName)
    return {
      ok: false,
      state: 'failed',
      transport: 'qz',
      errorCode: 'PRINTER_UNCONFIGURED',
      error: 'Nama printer QZ belum dikonfigurasi.',
    };
  if (!qz?.websocket || !qz?.printers || !qz?.configs) {
    return {
      ok: false,
      state: 'failed',
      transport: 'qz',
      errorCode: 'QZ_UNAVAILABLE',
      error: 'QZ Tray belum terpasang atau belum berjalan.',
    };
  }
  try {
    if (qz.signingConfigured !== false) await configureQzSigning();
    if (!qz.websocket.isActive?.()) {
      try {
        await qz.websocket.connect();
      } catch {
        if (!qz.websocket.isActive?.()) await qz.websocket.connect();
      }
    }
    const printer = await qz.printers.find(printerName);
    if (!printer) throw new Error(`Printer tidak ditemukan: ${printConfig.printerName}`);
    const htmlDoc = createPrintDocument(title, html, printConfig, qrPayload);
    const prefix = buildEscPosPrefix(printConfig);
    const suffix = buildEscPosSuffix(printConfig);
    const dataQueue: Array<
      | { type: string; format: string; data: string }
      | { type: string; format: string; flavor: string; data: string }
    > = [];
    if (prefix) dataQueue.push(escPosRaw(prefix));
    dataQueue.push({ type: 'pixel', format: 'html', flavor: 'plain', data: htmlDoc });
    if (suffix) dataQueue.push(escPosRaw(suffix));
    await queuePrinter(printerName, () =>
      withTimeout(
        qz.print(
          qz.configs.create(printer, {
            jobName: title,
            copies: printConfig.copies || 1,
            density: printConfig.density,
            feed: printConfig.feed,
            cut: printConfig.cut,
            orientation: printConfig.orientation,
            size: { width: printConfig.printableWidthMm, height: null },
            margins: printConfig.printMargin,
          }),
          dataQueue
        ),
        30_000
      )
    );
    return { ok: true, state: 'submitted', transport: 'qz' };
  } catch (error) {
    return {
      ok: false,
      state: 'failed',
      transport: 'qz',
      errorCode: 'QZ_SUBMIT_FAILED',
      error: error instanceof Error ? error.message : 'QZ Tray gagal mencetak.',
    };
  }
};

export const listQzPrinters = async (): Promise<string[]> => {
  const qz = window.qz;
  if (!qz?.websocket || !qz?.printers)
    throw new Error('QZ Tray belum terpasang atau belum berjalan');
  try {
    if (qz.signingConfigured !== false) await configureQzSigning();
  } catch {}
  if (!qz.websocket.isActive?.()) await qz.websocket.connect();
  return qz.printers.find();
};

export const checkQzTray = async (): Promise<{
  connected: boolean;
  printers: string[];
  error?: string;
}> => {
  try {
    return { connected: true, printers: await listQzPrinters() };
  } catch (error) {
    return {
      connected: false,
      printers: [],
      error: error instanceof Error ? error.message : 'QZ Tray tidak tersedia',
    };
  }
};

export interface PrinterCapabilities {
  name: string;
  supportedMedia: string[];
  defaultWidthMm: number;
  defaultPaperSize: 'thermal_58' | 'thermal_80' | 'a4' | 'hvs_a4' | 'hvs_letter';
  maxCopies: number;
  supportsCut: boolean;
  supportsDensity: boolean;
}

export const detectPrinterCapabilities = async (
  printerName: string
): Promise<PrinterCapabilities | null> => {
  const qz = window.qz;
  if (!qz?.websocket || !qz?.printers) return null;
  try {
    if (qz.signingConfigured !== false) await configureQzSigning();
    if (!qz.websocket.isActive?.()) await qz.websocket.connect();
    const printer = await qz.printers.find(printerName);
    if (!printer) return null;
    const media: string[] = [];
    let defaultWidthMm = 80;
    let defaultPaperSize: PrinterCapabilities['defaultPaperSize'] = 'thermal_80';
    let maxCopies = 99;
    let supportsCut = true;
    const supportsDensity = true;
    try {
      const capabilities = await qz.printers.capabilities(printerName);
      if (capabilities?.media) {
        for (const m of capabilities.media) {
          if (m?.name) media.push(m.name);
          if (m?.width && typeof m.width === 'number') {
            const wMm = m.width * (m.units === 'in' ? 25.4 : m.units === 'cm' ? 10 : 1);
            if (wMm > 0 && wMm < 500) {
              if (wMm <= 60) {
                defaultWidthMm = 54;
                defaultPaperSize = 'thermal_58';
              } else if (wMm <= 85) {
                defaultWidthMm = 76;
                defaultPaperSize = 'thermal_80';
              } else if (wMm <= 220) {
                defaultPaperSize = 'hvs_letter';
                defaultWidthMm = 0;
              } else {
                defaultPaperSize = 'hvs_a4';
                defaultWidthMm = 0;
              }
            }
          }
        }
        if (capabilities?.maxCopies && typeof capabilities.maxCopies === 'number') {
          maxCopies = capabilities.maxCopies;
        }
        if (capabilities?.cutAtEnd !== undefined) supportsCut = Boolean(capabilities.cutAtEnd);
      }
    } catch {}
    return {
      name: printerName,
      supportedMedia: media,
      defaultWidthMm,
      defaultPaperSize,
      maxCopies,
      supportsCut,
      supportsDensity,
    };
  } catch {
    return null;
  }
};

export const autoDetectPrinterSettings = async (
  printerName: string
): Promise<Partial<PrintConfig> | null> => {
  const caps = await detectPrinterCapabilities(printerName);
  if (!caps) return null;
  return {
    printerName: caps.name,
    paperSize: caps.defaultPaperSize,
    printableWidthMm: caps.defaultWidthMm || undefined,
    copies: 1,
    cut: caps.supportsCut,
  };
};

export const printFrame = async (
  frame: HTMLIFrameElement | Window,
  printConfig?: PrintConfig,
  title = 'Print Job',
  qrPayload?: string
): Promise<PrintResult> => {
  const target: Window | null =
    typeof HTMLIFrameElement !== 'undefined' && frame instanceof HTMLIFrameElement
      ? frame.contentWindow
      : (frame as Window);
  const source = target?.document;
  const root = source?.querySelector<HTMLElement>('.print-root');
  if (!root?.innerHTML) {
    return {
      ok: false,
      state: 'failed',
      transport: 'browser',
      error: 'Root dokumen print tidak ditemukan',
    };
  }
  const styles = Array.from(source?.head?.querySelectorAll('style') || [])
    .map((node) => node.outerHTML)
    .join('');
  return printJobAsync({ title, html: styles + root.innerHTML, printConfig, qrPayload });
};

const MAX_QZ_RETRIES = 2;
const QZ_RETRY_DELAY_MS = 800;

const browserPrint = async (
  title: string,
  html: string,
  printConfig?: PrintConfig,
  qrPayload?: string
): Promise<PrintResult> => {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none';
  frame.setAttribute('aria-hidden', 'true');
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    return {
      ok: false,
      state: 'failed',
      transport: 'browser',
      errorCode: 'DOCUMENT_UNAVAILABLE',
      error: 'Dokumen print tidak dapat dibuat',
    };
  }
  try {
    doc.open();
    doc.write(createPrintDocument(title, html, printConfig, qrPayload));
    doc.close();
    await new Promise<void>((resolve) => {
      const imgs = Array.from(doc.querySelectorAll('img'));
      if (!imgs.length) return resolve();
      let pending = imgs.length;
      const done = () => {
        if (--pending <= 0) resolve();
      };
      imgs.forEach((img) => {
        if (img.complete) done();
        else {
          img.addEventListener('load', done);
          img.addEventListener('error', done);
        }
      });
      window.setTimeout(resolve, 2500);
    });
    await new Promise<void>((resolve, reject) =>
      window.setTimeout(() => {
        const target = frame.contentWindow;
        if (!target || typeof target.print !== 'function') {
          reject(new Error('Browser print tidak tersedia'));
          return;
        }
        try {
          target.focus();
          target.print();
          window.setTimeout(resolve, 1000);
        } catch (err) {
          reject(err);
        }
      }, 100)
    );
    return { ok: true, state: 'submitted', transport: 'browser' };
  } catch (error) {
    return {
      ok: false,
      state: 'failed',
      transport: 'browser',
      errorCode: 'BROWSER_SUBMIT_FAILED',
      error: error instanceof Error ? error.message : 'Gagal mencetak lewat browser',
    };
  } finally {
    frame.remove();
  }
};

/** QZ Tray when configured; browser dialog remains safe fallback. Retries once on QZ failure. */
export const printJobAsync = async (job: PrintJob): Promise<PrintResult> => {
  const { title, printConfig, qrPayload } = job;
  if (!navigator.onLine) {
    if (job.reprint)
      return {
        ok: false,
        state: 'failed',
        transport: printConfig?.printMode === 'qz' ? 'qz' : 'browser',
        errorCode: 'REPRINT_REQUIRES_ONLINE',
        error: 'Cetak ulang memerlukan koneksi untuk validasi kebijakan.',
      };
    await enqueuePrintJob({
      title: job.title,
      html: job.html,
      printConfig: job.printConfig,
      qrPayload: job.qrPayload,
      documentType: job.documentType,
      documentId: job.documentId,
      branchId: job.branchId,
      tenantId: job.tenantId,
      userId: job.userId,
    });
    emitPrintNotification({
      type: 'warning',
      title: 'Cetak Diantrikan',
      message: `${title} akan dicetak saat koneksi kembali.`,
      documentType: job.documentType,
      documentId: job.documentId,
      transport: printConfig?.printMode === 'qz' ? 'qz' : 'browser',
      printer: printConfig?.printerName,
    });
    return {
      ok: true,
      state: 'submitted',
      transport: printConfig?.printMode === 'qz' ? 'qz' : 'browser',
    };
  }
  if (job.reprint && !job.reprintReason?.trim())
    return {
      ok: false,
      state: 'failed',
      transport: printConfig?.printMode === 'qz' ? 'qz' : 'browser',
      errorCode: 'REPRINT_REASON_REQUIRED',
      error: 'Alasan cetak ulang wajib diisi.',
    };
  if (job.reprint && printConfig?.reprintPolicy === 'deny')
    return {
      ok: false,
      state: 'failed',
      transport: printConfig?.printMode === 'qz' ? 'qz' : 'browser',
      errorCode: 'REPRINT_DENIED',
      error: 'Cetak ulang ditolak oleh kebijakan tenant.',
    };
  const reprintWatermark = job.reprint
    ? '<div style="position:fixed;inset:40% 0 auto;text-align:center;font-size:42px;font-weight:bold;opacity:.16;transform:rotate(-25deg);z-index:9999">SALINAN / REPRINT</div>'
    : '';
  const template = job.documentType ? printConfig?.printTemplates?.[job.documentType] : undefined;
  const templateHtml = template
    ? template
        .replaceAll('{{content}}', job.html)
        .replaceAll('{{title}}', escapeHtml(title))
        .replaceAll('{{documentId}}', escapeHtml(job.documentId || ''))
    : job.html;
  const wmConfig = getWatermarkConfig(printConfig);
  const customWm = wmConfig.enabled && wmConfig.text && !job.reprint ? wmConfig : undefined;
  let html = reprintWatermark + templateHtml;
  if (customWm) html = applyWatermarkToHtml(html, customWm);
  const idempotencyKey = crypto.randomUUID();
  const transport = printConfig?.printMode === 'qz' ? 'qz' : 'browser';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(html));
  const contentHash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
  let serverJobId: string | undefined;
  try {
    const response = await fetch('/api/print-jobs', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(job.branchId ? { 'X-Branch-ID': job.branchId } : {}),
      },
      body: JSON.stringify({
        idempotencyKey,
        documentType: job.documentType || 'general',
        documentId: job.documentId,
        printer: printConfig?.printerName,
        transport,
        contentHash,
        copies: printConfig?.copies || 1,
        reprint: job.reprint || false,
        reprintReason: job.reprintReason,
      }),
    });
    if (response.ok) {
      serverJobId = (await response.json()).id;
    } else if (job.reprint) {
      const body = await response.json().catch(() => ({}));
      return {
        ok: false,
        state: 'failed',
        transport,
        errorCode: 'REPRINT_REJECTED',
        error: body.error || 'Cetak ulang ditolak server.',
      };
    }
  } catch (error) {
    if (job.reprint)
      return {
        ok: false,
        state: 'failed',
        transport,
        errorCode: 'REPRINT_VALIDATION_UNAVAILABLE',
        error: error instanceof Error ? error.message : 'Validasi cetak ulang tidak tersedia.',
      };
  }
  const finish = async (result: PrintResult) => {
    if (serverJobId)
      void fetch(`/api/print-jobs/${encodeURIComponent(serverJobId)}/result`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(job.branchId ? { 'X-Branch-ID': job.branchId } : {}),
        },
        body: JSON.stringify({
          status: result.state,
          errorCode: result.errorCode,
          errorMessage: result.error,
        }),
      }).catch(() => undefined);
    const finalResult = { ...result, jobId: serverJobId };
    if (result.ok) {
      window.dispatchEvent(
        new CustomEvent('fixdev:print-completed', {
          detail: {
            documentType: job.documentType || 'general',
            pages: printConfig?.copies || 1,
            paperSize: printConfig?.paperSize || 'thermal_80',
            transport: result.transport,
          },
        })
      );
      emitPrintNotification({
        type: 'success',
        title: 'Cetak Berhasil',
        message: `${title} dicetak via ${result.transport === 'qz' ? 'QZ Tray' : 'Browser'}`,
        documentType: job.documentType,
        documentId: job.documentId,
        transport: result.transport,
        printer: printConfig?.printerName,
      });
    } else {
      emitPrintNotification({
        type: 'error',
        title: 'Cetak Gagal',
        message: result.error || 'Terjadi kesalahan saat mencetak',
        documentType: job.documentType,
        documentId: job.documentId,
        transport: result.transport,
        printer: printConfig?.printerName,
      });
    }
    return finalResult;
  };

  if (printConfig?.printMode === 'qz') {
    let lastQzError: PrintResult | undefined;
    for (let attempt = 0; attempt <= MAX_QZ_RETRIES; attempt++) {
      if (attempt > 0) await new Promise<void>((r) => window.setTimeout(r, QZ_RETRY_DELAY_MS));
      const qzResult = await qzPrint(title, html, printConfig, qrPayload);
      if (qzResult.ok) return finish(qzResult);
      lastQzError = qzResult;
    }
    const fallbackResult = await browserPrint(title, html, printConfig, qrPayload);
    if (fallbackResult.ok) {
      return finish({ ...fallbackResult, transport: 'browser' });
    }
    return finish({
      ...fallbackResult,
      error: `QZ gagal (${MAX_QZ_RETRIES + 1}x): ${lastQzError?.error || 'tidak diketahui'}. Fallback browser gagal: ${fallbackResult.error || 'tidak diketahui'}`,
    });
  }

  return browserPrint(title, html, printConfig, qrPayload).then(finish);
};

export const printJob = (job: PrintJob): Promise<PrintResult> => printJobAsync(job);

const processOfflineQueue = async () => {
  if (!navigator.onLine) return;
  const pending = await getPendingPrintJobs();
  for (const job of pending) {
    await markJobProcessing(job.id);
    try {
      const result = await printJobAsync({
        title: job.title,
        html: job.html,
        printConfig: job.printConfig as PrintConfig | undefined,
        qrPayload: job.qrPayload,
        documentType: job.documentType,
        documentId: job.documentId,
        branchId: job.branchId,
      });
      if (result.ok) await markJobDone(job.id);
      else await markJobFailed(job.id);
    } catch {
      await markJobFailed(job.id);
    }
  }
};

let offlineQueueTimer = 0;
export const startOfflineQueueListener = () => {
  if (offlineQueueTimer) return;
  if (navigator.onLine) void processOfflineQueue();
  window.addEventListener('online', () => {
    window.setTimeout(processOfflineQueue, 1000);
  });
  offlineQueueTimer = window.setInterval(() => {
    if (navigator.onLine) void processOfflineQueue();
  }, 30_000);
};

export const queueOfflinePrint = async (
  job: Omit<Parameters<typeof enqueuePrintJob>[0], 'tenantId' | 'branchId' | 'userId'>
): Promise<boolean> => {
  if (navigator.onLine) return false;
  await enqueuePrintJob(job);
  return true;
};
