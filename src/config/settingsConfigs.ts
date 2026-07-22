import {
  Smartphone,
  Globe,
  Lock,
  Sliders,
  Printer,
  GitBranch,
  ClipboardCheck,
  CreditCard,
  Gift,
  FileText,
  MessageSquare,
  Send,
  Settings,
  Code,
  Wrench,
  Save,
} from "lucide-react";

const SETTINGS_DOMAIN: Record<string, string> = {
  rbac: "security",
  security: "security",
  backup: "security",
  whatsapp: "whatsapp",
  telegram: "notification",
  notifications: "notification",
  "developer-api": "api",
};

export const getSettingsTabs = (
  role?: string,
  permissions: string[] = [],
): Array<{ id: string; label: string; desc?: string; icon: any; group: string }> => {
  const canAccessAll = role === "OWNER" || role === "ADMIN" || permissions.includes("*") || permissions.includes("settings");
  return [
  {
    id: "branding",
    label: "Branding & White-Label",
    desc: "Kustomisasi logo, warna corporate, tipografi global, dan setup custom domain DNS mapping untuk identitas bisnis mandiri.",
    icon: Smartphone,
    group: "perusahaan",
  },
  {
    id: "branches",
    label: "Multi-Cabang & Lokasi",
    desc: "Kelola jaringan ekspansi fisik bisnis, alamat lokasi, laci kasir (laci kasir terintegrasi), dan pergantian cabang operasional aktif.",
    icon: Globe,
    group: "perusahaan",
  },
  {
    id: "rbac",
    label: "Hak Akses & Staff",
    desc: "Kelola konfigurasi staff/pegawai, peran (Role), dan matriks izin akses granular (RBAC) pada masing-masing modul sistem.",
    icon: Lock,
    group: "perusahaan",
  },
  {
    id: "modules-config",
    label: "Parameter & Modul",
    desc: "Kustomisasi parameter fungsional, tenggat waktu garansi default, pembatasan diskon manual, sanksi keterlambatan, dan ambang batas stok kritis per modul.",
    icon: Sliders,
    group: "operasional",
  },
  {
    id: "printer-terms",
    label: "Printer & Ketentuan Nota",
    desc: "Konfigurasi lengkap ukuran kertas thermal vs HVS, custom font size, margin, detail header/footer toko, serta syarat & ketentuan garansi hukum pada cetakan nota.",
    icon: Printer,
    group: "operasional",
  },
  {
    id: "workflows",
    label: "Workflow Automation",
    desc: "Rancang aturan pemicu otomatisasi alur kerja (jika laci kasir terbuka, kirim pesan WA) untuk efisiensi operasional.",
    icon: GitBranch,
    group: "operasional",
  },
  {
    id: "maintenance-contract",
    label: "Kontrak Maintenance Berkala",
    desc: "Buat dan kelola kontrak pemeliharaan rutin device pelanggan, termasuk jenis kontrak GOLD/SILVER/BRONZE, interval servis, dan status kontrak.",
    icon: ClipboardCheck,
    group: "operasional",
  },
  {
    id: "subscription",
    label: "SaaS Subscription Billing",
    desc: "Kelola status langganan SaaS, riwayat tagihan, invoice pembayaran QRIS otomatis, serta upgrade/downgrade paket kuota.",
    icon: CreditCard,
    group: "keuangan",
  },
  {
    id: "loyalty",
    label: "Voucher & Poin Loyalitas",
    desc: "Buat dan kelola kode diskon, cashback, store credit serta program loyalitas pelanggan berbasis poin dan referral.",
    icon: Gift,
    group: "keuangan",
  },
  {
    id: "import-export",
    label: "Impor / Ekspor Data Massal",
    desc: "Import data pelanggan, produk, supplier, dan saldo awal secara massal dari file CSV atau format spreadsheet lainnya.",
    icon: FileText,
    group: "keuangan",
  },
  {
    id: "whatsapp",
    label: "WhatsApp Connector",
    desc: "Integrasikan gerbang perpesanan resmi Meta Cloud API untuk sinkronisasi pengiriman invoice, kuitansi, status servis, dan broadcast template.",
    icon: MessageSquare,
    group: "integrasi",
  },
  {
    id: "telegram",
    label: "Bot Telegram Alert",
    desc: "Konfigurasi Bot Telegram untuk notifikasi otomatis tiket servis, status shift, dan eskalasi alert ke grup/owner/teknisi.",
    icon: Send,
    group: "integrasi",
  },
  {
    id: "notifications",
    label: "Integrasi & Notifikasi",
    desc: "Konfigurasi gerbang perpesanan otomatis WhatsApp Gateway, Bot Telegram Alerts, Cron schedulers, dan API webhooks.",
    icon: Settings,
    group: "integrasi",
  },
  {
    id: "developer-api",
    label: "Developer REST API & Tokens",
    desc: "Kelola token akses API eksternal yang tersimpan di database, jelajahi dokumentasi OpenAPI, dan lakukan uji coba API secara live.",
    icon: Code,
    group: "integrasi",
  },
  {
    id: "operational-config",
    label: "Operasional (Servis, POS, Stok, Akuntansi, HRM)",
    desc: "Atur parameter servis, POS & kasir, stok/pembelian, akuntansi, dan HRM dalam satu panel.",
    icon: Wrench,
    group: "operasional",
  },
  {
    id: "app-config",
    label: "Aplikasi & Tampilan (Umum, Portal, Email, Tema)",
    desc: "Konfigurasi umum aplikasi, customer portal, email/push, upload file, dan tema tampilan.",
    icon: Globe,
    group: "keuangan",
  },
  {
    id: "security",
    label: "Keamanan & Login",
    desc: "Atur kebijakan keamanan, session timeout, password policy, dan batasan login perangkat.",
    icon: Lock, // Fallback to Lock
    group: "keamanan",
  },
  {
    id: "backup",
    label: "Backup & Audit",
    desc: "Jadwal backup database & file, riwayat audit perubahan, dan kebijakan retensi data.",
    icon: Save,
    group: "keamanan",
  },
  ].filter(({ id }) => {
    const domain = SETTINGS_DOMAIN[id] || id;
    return canAccessAll || permissions.includes(`settings:${domain}`);
  });
};

export const GROUP_ORDER = [
  { key: "perusahaan", label: "Perusahaan & Akses" },
  { key: "operasional", label: "Operasional" },
  { key: "keuangan", label: "Keuangan & Bisnis" },
  { key: "integrasi", label: "Integrasi & Notifikasi" },
  { key: "keamanan", label: "Keamanan & Backup" },
];
