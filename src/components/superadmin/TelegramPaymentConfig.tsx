import React, { useEffect, useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { useToast } from '../ui/Toast';
import { readJsonResponse } from '../../utils/apiResponse';

export const TelegramPaymentConfig: React.FC = () => {
  const { apiFetch } = useSaaS();
  const { showToast } = useToast();
  const [form, setForm] = useState({ botToken: '', webhookSecret: '', adminMap: '{}' });
  const [status, setStatus] = useState({
    botTokenConfigured: false,
    webhookSecretConfigured: false,
  });
  const [admins, setAdmins] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    apiFetch('/api/billing/telegram-manual-payment-config')
      .then((res) => readJsonResponse<any>(res, 'Konfigurasi Telegram'))
      .then((data) => {
        setStatus(data);
        setAdmins(data.admins || []);
        setForm((value) => ({ ...value, adminMap: JSON.stringify(data.adminMap || {}, null, 2) }));
      })
      .catch(() => setError('Gagal memuat konfigurasi Telegram'));
  }, []);
  const save = async () => {
    setError('');
    let adminMap: Record<string, string>;
    try {
      adminMap = JSON.parse(form.adminMap);
    } catch {
      setError('Daftar admin harus JSON valid.');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/api/billing/telegram-manual-payment-config', {
        method: 'POST',
        body: JSON.stringify({ ...form, adminMap }),
      });
      const data = await readJsonResponse<any>(res, 'Konfigurasi Telegram');
      setStatus(data);
      setForm((value) => ({ ...value, botToken: '', webhookSecret: '' }));
      showToast('Konfigurasi Telegram tersimpan', 'success');
    } catch {
      setError('Gagal menyimpan konfigurasi Telegram');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
          Approval Pembayaran Telegram
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Bot kirim tombol Setujui saat bukti manual masuk.
        </p>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
        Token: {status.botTokenConfigured ? 'tersimpan' : 'belum diisi'} | Webhook secret:{' '}
        {status.webhookSecretConfigured ? 'tersimpan' : 'belum diisi'}
      </div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Bot Token
        <input
          type="password"
          value={form.botToken}
          onChange={(e) => setForm({ ...form, botToken: e.target.value })}
          placeholder="Isi untuk mengubah"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-700"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Webhook Secret
        <input
          type="password"
          value={form.webhookSecret}
          onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })}
          placeholder="Minimal 16 karakter, isi untuk mengubah"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-700"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Admin Telegram JSON
        <textarea
          value={form.adminMap}
          onChange={(e) => setForm({ ...form, adminMap: e.target.value })}
          rows={5}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-700"
        />
        <span className="mt-1 block text-xs font-normal text-slate-500">
          Format: {`{"Telegram User ID":"UUID user SUPER_ADMIN"}`}
        </span>
      </label>
      {admins.length > 0 && (
        <div className="rounded-lg border border-slate-200 p-3 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <p className="mb-2 font-semibold">UUID superadmin tersedia</p>
          {admins.map((admin) => (
            <p key={admin.id} className="font-mono">
              {admin.name} ({admin.email}): {admin.id}
            </p>
          ))}
        </div>
      )}
      <button
        onClick={save}
        disabled={saving}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {saving ? 'Menyimpan...' : 'Simpan Konfigurasi Telegram'}
      </button>
      <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
        <p className="font-semibold">Perintah bot superadmin</p>
        <p className="mt-1 font-mono">/help /status /pending /tenants /plans /invoice &lt;ID&gt;</p>
        <p className="mt-1">
          Bot kirim alert setiap tenant daftar dari web dan saat bukti pembayaran manual masuk.
        </p>
      </div>
      <p className="text-xs text-slate-500">
        Webhook URL: <code>/api/platform/telegram/manual-payment-webhook</code>. Set secret token
        sama di Telegram.
      </p>
    </div>
  );
};
