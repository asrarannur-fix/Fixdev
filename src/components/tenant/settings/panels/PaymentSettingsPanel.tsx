import * as React from "react";
import { QrCode, Landmark, Plus, Trash2, Upload, X } from "lucide-react";
import { Input } from "../../../../components/ui/Input";
import { SettingsSection, Field, SettingsSaveBar } from "../SettingsUI";

interface PaymentSettingsPanelProps {
  currentTenantId: string;
  tenantObj: any;
  updateTenant: (id: string, updates: Partial<any>) => Promise<void>;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

type BankAccount = {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  logo?: string;
};

const readImage = (
  file: File,
  showToast: PaymentSettingsPanelProps["showToast"],
): Promise<string | null> =>
  new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      showToast("File harus gambar.", "error");
      resolve(null);
      return;
    }
    if (file.size > 1024 * 1024) {
      showToast("Ukuran gambar maksimal 1MB.", "error");
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || null);
    reader.onerror = () => {
      showToast("Gagal membaca file.", "error");
      resolve(null);
    };
    reader.readAsDataURL(file);
  });

export const PaymentSettingsPanel: React.FC<PaymentSettingsPanelProps> = ({
  currentTenantId,
  tenantObj,
  updateTenant,
  showToast,
}) => {
  const existing = tenantObj?.settings?.paymentSettings || {};
  const [qrisImage, setQrisImage] = React.useState<string>(existing.qrisImage || "");
  const [qrisLabel, setQrisLabel] = React.useState<string>(existing.qrisLabel || "");
  const [paymentNote, setPaymentNote] = React.useState<string>(existing.paymentNote || "");
  const [banks, setBanks] = React.useState<BankAccount[]>(existing.bankAccounts || []);
  const [saving, setSaving] = React.useState(false);

  const addBank = () =>
    setBanks((b) => [
      ...b,
      { id: crypto.randomUUID(), bankName: "", accountNumber: "", accountHolder: "" },
    ]);
  const updateBank = (id: string, patch: Partial<BankAccount>) =>
    setBanks((b) => b.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeBank = (id: string) => setBanks((b) => b.filter((x) => x.id !== id));

  const handleSave = async () => {
    const cleaned = banks
      .map((b) => ({
        ...b,
        bankName: b.bankName.trim(),
        accountNumber: b.accountNumber.trim(),
        accountHolder: b.accountHolder.trim(),
      }))
      .filter((b) => b.bankName || b.accountNumber || b.accountHolder);
    const invalid = cleaned.find((b) => !b.bankName || !b.accountNumber || !b.accountHolder);
    if (invalid) {
      showToast("Lengkapi nama bank, nomor rekening, dan atas nama.", "error");
      return;
    }
    setSaving(true);
    try {
      await updateTenant(currentTenantId, {
        settings: {
          ...(tenantObj.settings || {}),
          paymentSettings: {
            qrisImage,
            qrisLabel: qrisLabel.trim(),
            bankAccounts: cleaned,
            paymentNote: paymentNote.trim(),
          },
        },
      });
      showToast("Pengaturan pembayaran berhasil disimpan!", "success");
    } catch (error: any) {
      showToast(error.message || "Gagal menyimpan pengaturan pembayaran.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <SettingsSection
        icon={QrCode}
        title="QRIS Pembayaran"
        description="Unggah gambar QRIS statis toko untuk ditampilkan pada nota & portal pelanggan."
      >
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="w-40 h-40 shrink-0 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden relative">
            {qrisImage ? (
              <>
                <img src={qrisImage} alt="QRIS" className="w-full h-full object-contain" />
                <button
                  type="button"
                  onClick={() => setQrisImage("")}
                  className="absolute top-1 right-1 bg-white/90 rounded-full p-1 text-slate-500 hover:text-red-600 shadow"
                  aria-label="Hapus QRIS"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <QrCode className="w-10 h-10 text-slate-300" />
            )}
          </div>
          <div className="flex-1 space-y-3 w-full">
            <label className="inline-flex items-center gap-2 text-xs font-bold bg-accent-lighter text-accent px-4 py-2 rounded-xl cursor-pointer hover:bg-accent hover:text-white transition">
              <Upload className="w-3.5 h-3.5" />
              Unggah Gambar QRIS
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const img = await readImage(file, showToast);
                    if (img) setQrisImage(img);
                  }
                  e.target.value = "";
                }}
              />
            </label>
            <Field label="Label QRIS">
              <Input
                value={qrisLabel}
                onChange={(e) => setQrisLabel(e.target.value)}
                placeholder="cth: QRIS Nama Toko"
              />
            </Field>
            <p className="text-[10px] text-slate-400">Format PNG/JPG, maksimal 1MB.</p>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={Landmark}
        title="Rekening Bank"
        description="Daftar nomor rekening tujuan transfer manual pelanggan."
      >
        <div className="space-y-3">
          {banks.length === 0 && (
            <p className="text-xs text-slate-400">Belum ada rekening. Tambahkan di bawah.</p>
          )}
          {banks.map((bank) => (
            <div
              key={bank.id}
              className="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr_1fr_auto] gap-3 items-end p-3 bg-slate-50 rounded-xl border border-slate-100"
            >
              <div className="flex flex-col items-center gap-1">
                <label className="w-12 h-12 rounded-lg border border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden cursor-pointer shrink-0">
                  {bank.logo ? (
                    <img src={bank.logo} alt="Logo bank" className="w-full h-full object-contain" />
                  ) : (
                    <Upload className="w-4 h-4 text-slate-300" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const img = await readImage(file, showToast);
                        if (img) updateBank(bank.id, { logo: img });
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
                <span className="text-[9px] text-slate-400">Logo</span>
              </div>
              <Field label="Nama Bank">
                <Input
                  value={bank.bankName}
                  onChange={(e) => updateBank(bank.id, { bankName: e.target.value })}
                  placeholder="BCA / Mandiri / BRI"
                />
              </Field>
              <Field label="Nomor Rekening">
                <Input
                  value={bank.accountNumber}
                  onChange={(e) => updateBank(bank.id, { accountNumber: e.target.value })}
                  placeholder="1234567890"
                />
              </Field>
              <Field label="Atas Nama">
                <Input
                  value={bank.accountHolder}
                  onChange={(e) => updateBank(bank.id, { accountHolder: e.target.value })}
                  placeholder="PT Nama Usaha"
                />
              </Field>
              <button
                type="button"
                onClick={() => removeBank(bank.id)}
                className="p-2 text-slate-400 hover:text-red-600 transition"
                aria-label="Hapus rekening"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addBank}
            className="inline-flex items-center gap-2 text-xs font-bold text-accent hover:text-accent-hover transition"
          >
            <Plus className="w-4 h-4" />
            Tambah Rekening
          </button>
        </div>
      </SettingsSection>

      <SettingsSection title="Catatan Pembayaran">
        <Field label="Instruksi tambahan (opsional)">
          <textarea
            value={paymentNote}
            onChange={(e) => setPaymentNote(e.target.value)}
            rows={3}
            placeholder="cth: Konfirmasi pembayaran via WhatsApp setelah transfer."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-accent resize-y"
          />
        </Field>
      </SettingsSection>

      <SettingsSaveBar onSave={handleSave} saving={saving} saveLabel="Simpan Pengaturan Pembayaran" />
    </div>
  );
};
