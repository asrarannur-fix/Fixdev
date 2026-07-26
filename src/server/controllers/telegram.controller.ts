import type { Request, Response } from 'express';
import { dbQuery } from '../../lib/db.js';
import { recordAuditEvent } from './audit.controller.js';
import { logger } from '../../lib/logger.js';
import { timingSafeEqual } from 'crypto';
import { reviewManualPaymentByActor } from './manualPayment.controller.js';

const PLATFORM_TELEGRAM_CONFIG_KEY = 'platform_telegram_manual_payment';

async function platformTelegramConfig() {
  const result = await dbQuery(`SELECT value FROM app_settings WHERE key=$1`, [
    PLATFORM_TELEGRAM_CONFIG_KEY,
  ]);
  return result.rows[0]?.value || {};
}

async function platformTelegramAdmins(config: any): Promise<Record<string, string>> {
  return config.adminMap || JSON.parse(process.env.PLATFORM_TELEGRAM_ADMIN_MAP || '{}');
}

export async function sendPlatformTelegram(text: string, reply_markup?: unknown) {
  const config = await platformTelegramConfig();
  const botToken = String(config.botToken || process.env.PLATFORM_TELEGRAM_BOT_TOKEN || '').trim();
  const admins = await platformTelegramAdmins(config);
  if (!botToken || !Object.keys(admins).length) return;
  await Promise.allSettled(
    Object.keys(admins).map(async (chat_id) => {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id, text, reply_markup }),
      });
      if (!response.ok) throw new Error(`Telegram HTTP ${response.status}`);
    })
  );
}

export async function notifyPlatformTenantRegistration(
  tenant: { name: string; id: string; subdomain: string },
  owner: { name: string; email: string }
) {
  await sendPlatformTelegram(
    [
      'Tenant baru terdaftar',
      `Toko: ${tenant.name}`,
      `Owner: ${owner.name} (${owner.email})`,
      `Subdomain: ${tenant.subdomain}`,
      'Status: TRIAL, 14 hari',
    ].join('\n'),
    {
      inline_keyboard: [
        [
          { text: 'Status Platform', callback_data: 'tg:status' },
          { text: 'Daftar Tenant', callback_data: 'tg:tenants' },
        ],
      ],
    }
  );
}

export async function getPlatformTelegramConfig(_req: Request, res: Response) {
  const [result, admins] = await Promise.all([
    dbQuery(`SELECT value FROM app_settings WHERE key=$1`, [PLATFORM_TELEGRAM_CONFIG_KEY]),
    dbQuery(`SELECT id,name,email FROM users WHERE role='SUPER_ADMIN' ORDER BY name`),
  ]);
  const config = result.rows[0]?.value || {};
  res.json({
    botTokenConfigured: Boolean(config.botToken || process.env.PLATFORM_TELEGRAM_BOT_TOKEN),
    webhookSecretConfigured: Boolean(
      config.webhookSecret || process.env.PLATFORM_TELEGRAM_WEBHOOK_SECRET
    ),
    adminMap: config.adminMap || {},
    admins: admins.rows,
  });
}

export async function updatePlatformTelegramConfig(req: Request, res: Response) {
  const body = req.body || {};
  const botToken = String(body.botToken || '').trim();
  const webhookSecret = String(body.webhookSecret || '').trim();
  const adminMap = body.adminMap;
  if (
    adminMap === null ||
    typeof adminMap !== 'object' ||
    Array.isArray(adminMap) ||
    Object.entries(adminMap).some(
      ([telegramId, userId]) =>
        !/^\d{4,20}$/.test(telegramId) ||
        typeof userId !== 'string' ||
        !/^[0-9a-f-]{36}$/i.test(userId)
    )
  )
    return res.status(422).json({ error: 'Daftar admin Telegram tidak valid.' });
  if (webhookSecret && webhookSecret.length < 16)
    return res.status(422).json({ error: 'Webhook secret minimal 16 karakter.' });
  const existing = await dbQuery(`SELECT value FROM app_settings WHERE key=$1`, [
    PLATFORM_TELEGRAM_CONFIG_KEY,
  ]);
  const previous = existing.rows[0]?.value || {};
  const config = {
    botToken: botToken || previous.botToken || '',
    webhookSecret: webhookSecret || previous.webhookSecret || '',
    adminMap,
  };
  await dbQuery(
    `INSERT INTO app_settings(key,value,updated_at) VALUES ($1,$2::jsonb,now()) ON CONFLICT(key) DO UPDATE SET value=$2::jsonb,updated_at=now()`,
    [PLATFORM_TELEGRAM_CONFIG_KEY, JSON.stringify(config)]
  );
  res.json({
    success: true,
    botTokenConfigured: Boolean(config.botToken),
    webhookSecretConfigured: Boolean(config.webhookSecret),
    adminMap: config.adminMap,
  });
}

function safeEqual(expected: string, received: string) {
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function telegramManualPaymentWebhook(req: Request, res: Response) {
  const config = await platformTelegramConfig();
  const secret = String(
    config.webhookSecret || process.env.PLATFORM_TELEGRAM_WEBHOOK_SECRET || ''
  ).trim();
  if (!secret || !safeEqual(secret, String(req.headers['x-telegram-bot-api-secret-token'] || '')))
    return res.sendStatus(401);
  let adminMap: Record<string, string>;
  try {
    adminMap = await platformTelegramAdmins(config);
  } catch {
    logger.error('PLATFORM_TELEGRAM_ADMIN_MAP is not valid JSON');
    return res.sendStatus(500);
  }
  const callback = req.body?.callback_query;
  const message = req.body?.message;
  const telegramId = String(callback?.from?.id || message?.from?.id || '');
  const userId = adminMap[telegramId];
  if (
    !userId ||
    (callback && String(callback.message?.chat?.id || '') !== telegramId) ||
    (message && String(message.chat?.id || '') !== telegramId)
  )
    return res.sendStatus(403);
  const user = await dbQuery(`SELECT id FROM users WHERE id=$1 AND role='SUPER_ADMIN'`, [userId]);
  if (!user.rows[0]) return res.sendStatus(403);

  if (message?.text) {
    await telegramPlatformCommand(String(message.text), telegramId);
    return res.sendStatus(200);
  }
  const data = String(callback?.data || '');
  if (/^tg:(status|pending|tenants|plans)$/.test(data)) {
    await telegramPlatformCommand(`/${data.slice(3)}`, telegramId);
    return res.sendStatus(200);
  }
  const match = /^mp:([ar]):([0-9a-f-]{36}):(\d+)$/.exec(data);
  if (!match) return res.sendStatus(200);

  const decision = match[1] === 'a' ? 'APPROVED' : 'REJECTED';
  const result = await reviewManualPaymentByActor(match[2], Number(match[3]), decision, {
    userId,
    role: 'SUPER_ADMIN',
  });
  const botToken = String(config.botToken || process.env.PLATFORM_TELEGRAM_BOT_TOKEN || '').trim();
  const text = result.error
    ? `Gagal: ${result.error}`
    : decision === 'APPROVED'
      ? 'Pembayaran disetujui dan invoice dilunasi.'
      : 'Pembayaran ditolak.';
  if (botToken && callback.id) {
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callback.id,
        text,
        show_alert: Boolean(result.error),
      }),
    }).catch(() => undefined);
  }
  return res.sendStatus(200);
}

async function telegramPlatformCommand(input: string, chatId: string) {
  const [command, argument] = input.trim().split(/\s+/, 2);
  if (command === '/start' || command === '/help')
    return sendTelegramChat(
      chatId,
      [
        'Bot Superadmin FIXDEV',
        '',
        '/status - ringkasan platform',
        '/pending - pembayaran manual pending',
        '/tenants - tenant terbaru',
        '/plans - paket billing',
        '/invoice <ID> - status invoice',
      ].join('\n'),
      menuKeyboard()
    );
  if (command === '/status') {
    const result = await dbQuery(
      `SELECT COUNT(*)::int AS tenants, COUNT(*) FILTER (WHERE status='TRIAL')::int AS trials, COUNT(*) FILTER (WHERE status='ACTIVE')::int AS active, COUNT(*) FILTER (WHERE status='EXPIRED')::int AS expired FROM tenants`
    );
    const payment = await dbQuery(
      `SELECT COUNT(*)::int AS pending FROM manual_payment_requests WHERE status='SUBMITTED'`
    );
    const row = result.rows[0];
    return sendTelegramChat(
      chatId,
      `Status platform\nTenant: ${row.tenants}\nAktif: ${row.active}\nTrial: ${row.trials}\nExpired: ${row.expired}\nPembayaran pending: ${payment.rows[0]?.pending || 0}`,
      menuKeyboard()
    );
  }
  if (command === '/pending') {
    const result = await dbQuery(
      `SELECT m.id,m.version,m.invoice_id,m.amount,m.method,m.payer_name,t.name AS tenant_name FROM manual_payment_requests m JOIN tenants t ON t.id=m.tenant_id WHERE m.status='SUBMITTED' ORDER BY m.submitted_at DESC LIMIT 10`
    );
    if (!result.rows.length)
      return sendTelegramChat(chatId, 'Tidak ada pembayaran manual pending.', menuKeyboard());
    for (const payment of result.rows)
      await sendTelegramChat(
        chatId,
        `${payment.tenant_name}\nInvoice: ${payment.invoice_id}\nRp${Number(payment.amount).toLocaleString('id-ID')} | ${payment.method}\nPengirim: ${payment.payer_name}`,
        {
          inline_keyboard: [
            [{ text: 'Setujui', callback_data: `mp:a:${payment.id}:${payment.version}` }],
          ],
        }
      );
    return;
  }
  if (command === '/tenants') {
    const result = await dbQuery(
      `SELECT name,subdomain,status,tier,created_at FROM tenants ORDER BY created_at DESC LIMIT 10`
    );
    return sendTelegramChat(
      chatId,
      `Tenant terbaru\n\n${result.rows.map((row: any) => `${row.name} | ${row.status} | ${row.tier}\n${row.subdomain}`).join('\n\n') || 'Belum ada tenant.'}`,
      menuKeyboard()
    );
  }
  if (command === '/plans') {
    const result = await dbQuery(`SELECT value FROM app_settings WHERE key='billing_plans'`);
    const plans = result.rows[0]?.value || [];
    return sendTelegramChat(
      chatId,
      `Paket billing\n\n${plans.map((plan: any) => `${plan.tier}: Rp${Number(plan.priceMonthly || 0).toLocaleString('id-ID')}/bulan`).join('\n') || 'Belum dikonfigurasi.'}`,
      menuKeyboard()
    );
  }
  if (command === '/invoice' && argument) {
    const result = await dbQuery(
      `SELECT i.id,i.amount,i.status,i.due_date,t.name AS tenant_name FROM saas_invoices i JOIN tenants t ON t.id=i.tenant_id WHERE i.id=$1`,
      [argument]
    );
    const invoice = result.rows[0];
    return sendTelegramChat(
      chatId,
      invoice
        ? `Invoice ${invoice.id}\nTenant: ${invoice.tenant_name}\nNominal: Rp${Number(invoice.amount).toLocaleString('id-ID')}\nStatus: ${invoice.status}\nJatuh tempo: ${invoice.due_date}`
        : 'Invoice tidak ditemukan.',
      menuKeyboard()
    );
  }
  return sendTelegramChat(chatId, 'Perintah tidak dikenal. Ketik /help.', menuKeyboard());
}

function menuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: 'Status', callback_data: 'tg:status' },
        { text: 'Pending', callback_data: 'tg:pending' },
      ],
      [
        { text: 'Tenant', callback_data: 'tg:tenants' },
        { text: 'Paket', callback_data: 'tg:plans' },
      ],
    ],
  };
}
async function sendTelegramChat(chat_id: string, text: string, reply_markup?: unknown) {
  const config = await platformTelegramConfig();
  const botToken = String(config.botToken || process.env.PLATFORM_TELEGRAM_BOT_TOKEN || '').trim();
  if (!botToken) return;
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text, reply_markup }),
  });
}

export async function telegramTestHandler(req: Request, res: Response) {
  const tenantId = req.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

  try {
    const result = await dbQuery(
      `SELECT settings->'notificationSettings' AS settings FROM tenants WHERE id=$1 LIMIT 1`,
      [tenantId]
    );
    const settings = result.rows[0]?.settings || {};
    const botToken = String(settings.telegramBotToken || '').trim();
    const chatId = String(settings.telegramChatId || '').trim();
    if (!botToken || !chatId) {
      await recordAuditEvent(
        tenantId,
        req.authActor?.userId || null,
        'TELEGRAM_TEST_FAILED',
        'Telegram test failed: Bot Token or Chat ID not configured.'
      );
      return res.status(422).json({ error: 'Bot Token dan Chat ID Telegram belum dikonfigurasi.' });
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: String(req.body?.message || 'Tes integrasi ERP berhasil dikirim.'),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok !== true) {
      logger.error(
        { tenantId, error: payload.description || `Telegram HTTP ${response.status}` },
        'Telegram test failed'
      );
      await recordAuditEvent(
        tenantId,
        req.authActor?.userId || null,
        'TELEGRAM_TEST_FAILED',
        `Telegram test failed: ${payload.description || `HTTP ${response.status}`}`,
        { chatId, response: payload }
      );
      return res
        .status(502)
        .json({ error: payload.description || `Telegram HTTP ${response.status}` });
    }
    await recordAuditEvent(
      tenantId,
      req.authActor?.userId || null,
      'TELEGRAM_TEST_SUCCESS',
      `Telegram test message sent to ${chatId}`,
      { messageId: payload.result?.message_id }
    );
    return res.json({ success: true, messageId: payload.result?.message_id ?? null });
  } catch (error: any) {
    logger.error({ err: error.message, tenantId }, 'Telegram test handler exception');
    await recordAuditEvent(
      tenantId,
      req.authActor?.userId || null,
      'TELEGRAM_TEST_FAILED',
      `Telegram test failed: service unavailable.`,
      { error: error.message }
    );
    return res.status(502).json({ error: 'Layanan Telegram tidak dapat dihubungi.' });
  }
}
