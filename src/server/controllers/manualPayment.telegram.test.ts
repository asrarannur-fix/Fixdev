import { afterEach, describe, expect, it, vi } from 'vitest';
import { notifyTelegramManualPayment } from './manualPayment.controller.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe('notifyTelegramManualPayment', () => {
  it('sends approval button to configured platform admin', async () => {
    process.env.PLATFORM_TELEGRAM_BOT_TOKEN = 'token';
    process.env.PLATFORM_TELEGRAM_ADMIN_MAP = '{"123":"user-id"}';
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));

    await notifyTelegramManualPayment({
      id: '11111111-1111-1111-1111-111111111111',
      version: 1,
      invoice_id: 'INV-1',
      amount: 99000,
      method: 'MANUAL_QRIS',
      payer_name: 'Pembayar',
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.telegram.org/bottoken/sendMessage');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      chat_id: '123',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Setujui', callback_data: 'mp:a:11111111-1111-1111-1111-111111111111:1' }],
        ],
      },
    });
  });
});
