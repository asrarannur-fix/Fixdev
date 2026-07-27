import type { PrintConfig } from './print';
import { escapeHtml, getPrintBaseCss, getPaperWidthStyle } from './print';

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
};

const sanitizePrintHtml = (html: string): string =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(
      /<img\b[^>]*src=["'](?:https?:)?\/\/[^"']*["'][^>]*>/gi,
      '<div class="image-placeholder">Gambar eksternal dihapus dari dokumen print</div>'
    )
    .replace(
      /<img\b[^>]*src=["'][^"']*(?:qr|qrcode)[^"']*["'][^>]*>/gi,
      '<div class="qr-placeholder">Lacak status melalui URL atau nomor tiket</div>'
    );

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
        .catch(reject);
    }
  );

  qzSigningConfigured = true;
};

export const createPrintDocument = (title: string, html: string, printConfig?: PrintConfig) =>
  `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title || 'Print Job')}</title><style>${getPrintBaseCss(printConfig)}.print-root{width:${getPaperWidthStyle(printConfig)};max-width:100%;margin:0 auto}button{display:none!important}</style></head><body><main class="print-root">${sanitizePrintHtml(html)}</main></body></html>`;

const qzPrint = async (
  title: string,
  html: string,
  printConfig: PrintConfig
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
          [
            {
              type: 'pixel',
              format: 'html',
              flavor: 'plain',
              data: createPrintDocument(title, html, printConfig),
            },
          ]
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

export const printFrame = async (
  frame: HTMLIFrameElement | Window,
  printConfig?: PrintConfig,
  title = 'Print Job'
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
  return printJobAsync({ title, html: styles + root.innerHTML, printConfig });
};

/** QZ Tray when configured; browser dialog remains safe fallback. */
export const printJobAsync = async (job: PrintJob): Promise<PrintResult> => {
  const { title, printConfig } = job;
  if (job.reprint && !job.reprintReason?.trim())
    return {
      ok: false,
      state: 'failed',
      transport: printConfig?.printMode === 'qz' ? 'qz' : 'browser',
      errorCode: 'REPRINT_REASON_REQUIRED',
      error: 'Alasan cetak ulang wajib diisi.',
    };
  const watermark = job.reprint
    ? '<div style="position:fixed;inset:40% 0 auto;text-align:center;font-size:42px;font-weight:bold;opacity:.16;transform:rotate(-25deg);z-index:9999">SALINAN / REPRINT</div>'
    : '';
  const html = watermark + job.html;
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
    if (response.ok) serverJobId = (await response.json()).id;
  } catch {}
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
    return { ...result, jobId: serverJobId };
  };
  if (printConfig?.printMode === 'qz') return qzPrint(title, html, printConfig).then(finish);
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none';
  frame.setAttribute('aria-hidden', 'true');
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    return finish({
      ok: false,
      state: 'failed',
      transport: 'browser',
      errorCode: 'DOCUMENT_UNAVAILABLE',
      error: 'Dokumen print tidak dapat dibuat',
    });
  }
  try {
    doc.open();
    doc.write(createPrintDocument(title, html, printConfig));
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
        } catch (error) {
          reject(error);
        }
      }, 100)
    );
    return finish({ ok: true, state: 'submitted', transport: 'browser' });
  } catch (error) {
    return finish({
      ok: false,
      state: 'failed',
      transport: 'browser',
      errorCode: 'BROWSER_SUBMIT_FAILED',
      error: error instanceof Error ? error.message : 'Gagal mencetak lewat browser',
    });
  } finally {
    frame.remove();
  }
};

export const printJob = (job: PrintJob): Promise<PrintResult> => printJobAsync(job);
