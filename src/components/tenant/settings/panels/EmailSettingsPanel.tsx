import * as React from "react";
import { useSaaS } from "../../../../context/SaaSContext";
import { Mail, Send, Loader2, TestTube } from "lucide-react";
import { Input } from "../../../../components/ui/Input";
import { SettingsSection, Field, Toggle, SettingRow, SettingsSaveBar } from "../SettingsUI";

interface EmailSettingsPanelProps {
  currentTenantId: string;
  tenantObj: any;
  updateTenant: (id: string, updates: Partial<any>) => Promise<void>;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export const EmailSettingsPanel: React.FC<EmailSettingsPanelProps> = ({
  currentTenantId,
  tenantObj,
  updateTenant,
  showToast,
}) => {
  const [smtp, setSmtp] = React.useState({
    host: tenantObj?.settings?.email?.smtp?.host || "",
    port: tenantObj?.settings?.email?.smtp?.port || 587,
    secure: tenantObj?.settings?.email?.smtp?.secure || false,
    username: tenantObj?.settings?.email?.smtp?.username || "",
    password: tenantObj?.settings?.email?.smtp?.password || "",
    fromName: tenantObj?.settings?.email?.fromName || tenantObj?.name || "FIXDEV",
    fromEmail: tenantObj?.settings?.email?.fromEmail || "",
    replyTo: tenantObj?.settings?.email?.replyTo || "",
  });

  const [testEmail, setTestEmail] = React.useState("");
  const [testing, setTesting] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ success: boolean; message: string } | null>(null);

  const set = (patch: Partial<typeof smtp>) => setSmtp((s) => ({ ...s, ...patch }));

  const handleSave = async () => {
    if (!testEmail && !smtp.host) {
      // allow save without test, just validate host presence
    }
    if (!smtp.host) {
      showToast("SMTP Host wajib diisi.", "error");
      return;
    }
    if (!smtp.fromEmail.includes("@")) {
      showToast("Format From Email tidak valid.", "error");
      return;
    }
    setSaving(true);
    try {
      await updateTenant(currentTenantId, {
        settings: {
          ...(tenantObj.settings || {}),
          email: {
            smtp: { host: smtp.host, port: smtp.port, secure: smtp.secure, username: smtp.username, password: smtp.password },
            fromName: smtp.fromName,
            fromEmail: smtp.fromEmail,
            replyTo: smtp.replyTo,
          },
        },
      });
      showToast("Pengaturan email berhasil disimpan!", "success");
    } catch (error: any) {
      showToast(error.message || "Gagal menyimpan pengaturan email.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTestSend = async () => {
    if (!testEmail.trim()) {
      showToast("Masukkan email tujuan untuk test.", "error");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: currentTenantId, to: testEmail, config: smtp }),
      });
      const data = await res.json().catch(() => ({}));
      const ok = res.ok;
      setTestResult({ success: ok, message: data.message || (ok ? "Email test terkirim!" : "Gagal mengirim email test") });
      showToast(data.message || (ok ? "Email test terkirim!" : "Gagal mengirim email test"), ok ? "success" : "error");
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || "Error jaringan" });
      showToast("Error: " + error.message, "error");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <SettingsSection icon={Mail} title="Konfigurasi SMTP Server" description="Server pengiriman email transaksional (invoice, notifikasi, reset password)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="SMTP Host">
            <Input value={smtp.host} onChange={(e) => set({ host: e.target.value })} placeholder="smtp.gmail.com / smtp.mailgun.org" />
          </Field>
          <Field label="Port">
            <Input type="number" value={smtp.port} onChange={(e) => set({ port: Number(e.target.value) })} />
          </Field>
          <Field label="Username (Email)">
            <Input type="email" value={smtp.username} onChange={(e) => set({ username: e.target.value })} placeholder="noreply@domain.com" />
          </Field>
          <Field label="Password / API Key">
            <Input type="password" value={smtp.password} onChange={(e) => set({ password: e.target.value })} placeholder="App password atau API key" />
          </Field>
          <SettingRow label="Gunakan SSL/TLS (port 465)">
            <Toggle checked={smtp.secure} onChange={(v) => set({ secure: v })} label="SSL/TLS" />
          </SettingRow>
        </div>
      </SettingsSection>

      <SettingsSection icon={Send} title="Identitas Pengirim" description="Nama dan email yang muncul di inbox pelanggan">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Nama Pengirim">
            <Input value={smtp.fromName} onChange={(e) => set({ fromName: e.target.value })} />
          </Field>
          <Field label="Email Pengirim">
            <Input type="email" value={smtp.fromEmail} onChange={(e) => set({ fromEmail: e.target.value })} />
          </Field>
          <Field label="Reply-To Email">
            <Input type="email" value={smtp.replyTo} onChange={(e) => set({ replyTo: e.target.value })} />
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection title="Kirim Test Email">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <Input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@email.com"
              icon={Mail}
            />
          </div>
          <button
            onClick={handleTestSend}
            disabled={testing || !smtp.host}
            className="bg-accent hover:bg-accent-hover text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube className="w-3.5 h-3.5" />}
            Kirim Test
          </button>
        </div>
        {testResult && (
          <div className={`p-3 rounded-lg flex items-center gap-2 ${testResult.success ? "bg-emerald-50 border border-emerald-100 text-emerald-800" : "bg-red-50 border border-red-100 text-red-800"}`}>
            <span className="text-xs">{testResult.message}</span>
          </div>
        )}
      </SettingsSection>

      <SettingsSaveBar onSave={handleSave} saving={saving} saveLabel="Simpan Konfigurasi SMTP" />
    </div>
  );
};
