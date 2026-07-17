import React, { useState } from "react";
import {
  ArrowRight,
  Banknote,
  BarChart3,
  Boxes,
  Check,
  ChevronDown,
  CircleCheck,
  Menu,
  MessageSquare,
  MonitorSmartphone,
  PackageSearch,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { LoginPage } from "./LoginPage";
import { useSaaS } from "../context/SaaSContext";

const modules = [
  { icon: Wrench, title: "Servis terpadu", desc: "Penerimaan, diagnosa, persetujuan, QC, sampai serah-terima.", tone: "bg-indigo-50 text-indigo-600" },
  { icon: Banknote, title: "Kasir & pembayaran", desc: "Transaksi cepat, invoice, diskon, shift, dan rekonsiliasi.", tone: "bg-emerald-50 text-emerald-600" },
  { icon: Boxes, title: "Stok selalu terkendali", desc: "Gudang, mutasi cabang, serial, dan komponen kecil.", tone: "bg-amber-50 text-amber-600" },
  { icon: BarChart3, title: "Laporan yang siap baca", desc: "Laba rugi, arus kas, performa cabang, dan operasional.", tone: "bg-sky-50 text-sky-600" },
  { icon: Users, title: "Tim lebih rapi", desc: "Peran, absensi, komisi, dan aktivitas tim dalam satu ruang.", tone: "bg-violet-50 text-violet-600" },
  { icon: ShieldCheck, title: "Akses aman per peran", desc: "Data cabang terpisah dan hak akses dibatasi dengan jelas.", tone: "bg-rose-50 text-rose-600" },
];

const capabilities = [
  "Tiket servis dan SPK", "POS & invoice", "Inventaris multi-gudang", "Laporan keuangan", "Manajemen pelanggan", "Notifikasi WhatsApp",
];

const plans = [
  {
    name: "Basic", price: "Rp99.000", period: "/ bulan", highlight: false,
    points: ["Servis & tiket dasar", "POS kasir utama", "1 cabang / gudang", "Maks 3 pengguna", "Penyimpanan 500 MB"],
  },
  {
    name: "Pro", price: "Rp250.000", period: "/ bulan", highlight: true,
    points: ["Semua fitur Basic", "Accounting & buku besar", "WhatsApp & AI diagnosa", "Maks 5 cabang", "Maks 15 pengguna"],
  },
  {
    name: "Enterprise", price: "Rp1,5 jt", period: "/ bulan", highlight: false,
    points: ["Semua fitur Pro", "Marketplace & workflow", "Keamanan & fraud detector", "Maks 20 cabang", "Custom domain"],
  },
];

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useSaaS();
  const [showLogin, setShowLogin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  if (showLogin) return <LoginPage onBack={() => setShowLogin(false)} />;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900" id="landing-page">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-[620px] bg-[radial-gradient(circle_at_18%_5%,rgba(99,102,241,.19),transparent_32%),radial-gradient(circle_at_82%_10%,rgba(34,211,238,.15),transparent_28%)]" />
      <nav className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <button onClick={() => scrollTo("landing-page")} className="flex items-center gap-2.5 font-black tracking-tight" aria-label="FixDev beranda">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200"><Wrench className="h-4 w-4" /></span>
            <span>FixDev</span>
          </button>
          <div className="hidden items-center gap-6 md:flex">
            <button onClick={() => scrollTo("fitur")} className="text-xs font-bold text-slate-600 hover:text-indigo-600">Fitur</button>
            <button onClick={() => scrollTo("cara-kerja")} className="text-xs font-bold text-slate-600 hover:text-indigo-600">Cara kerja</button>
            <button onClick={() => scrollTo("paket")} className="text-xs font-bold text-slate-600 hover:text-indigo-600">Paket</button>
            <button onClick={() => setShowLogin(true)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50">{isAuthenticated ? "Buka dashboard" : "Masuk"}</button>
            <button onClick={() => setShowLogin(true)} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700">Mulai gratis <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button>
          </div>
          <button onClick={() => setMenuOpen((open) => !open)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white md:hidden" aria-label="Buka menu">
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
        {menuOpen && <div className="border-t border-slate-100 bg-white p-3 md:hidden"><div className="mx-auto grid max-w-6xl gap-1"><button onClick={() => scrollTo("fitur")} className="rounded-xl px-3 py-2 text-left text-xs font-bold">Fitur</button><button onClick={() => scrollTo("cara-kerja")} className="rounded-xl px-3 py-2 text-left text-xs font-bold">Cara kerja</button><button onClick={() => scrollTo("paket")} className="rounded-xl px-3 py-2 text-left text-xs font-bold">Paket</button><button onClick={() => setShowLogin(true)} className="rounded-xl bg-indigo-600 px-3 py-2 text-left text-xs font-bold text-white">Masuk atau daftar</button></div></div>}
      </nav>

      <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-8 px-4 pb-12 pt-12 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:pb-20 lg:pt-20">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-700 shadow-sm"><Sparkles className="h-3.5 w-3.5" /> Platform untuk bengkel modern</div>
          <h1 className="max-w-2xl text-4xl font-black leading-[1.03] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">Operasional bengkel. <span className="text-indigo-600">Satu alur yang jelas.</span></h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">Kelola servis, kasir, stok, pelanggan, dan laporan tanpa pindah-pindah aplikasi. Dibuat untuk kerja cepat di meja depan dan tetap rapi di belakang layar.</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row"><button onClick={() => setShowLogin(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-700">Daftarkan toko <ArrowRight className="h-4 w-4" /></button><button onClick={() => scrollTo("fitur")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50">Lihat semua fitur <ChevronDown className="h-4 w-4" /></button></div>
          <div className="mt-7 grid max-w-xl grid-cols-3 gap-2 border-t border-slate-200 pt-5"><div><p className="text-lg font-black">6+</p><p className="text-[10px] font-bold text-slate-500">Modul inti</p></div><div><p className="text-lg font-black">Multi</p><p className="text-[10px] font-bold text-slate-500">Cabang & gudang</p></div><div><p className="text-lg font-black">RBAC</p><p className="text-[10px] font-bold text-slate-500">Akses per peran</p></div></div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-to-br from-indigo-300/50 to-cyan-200/40 blur-2xl" />
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl shadow-indigo-200/50">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3"><div className="flex gap-1.5"><i className="h-2 w-2 rounded-full bg-rose-400" /><i className="h-2 w-2 rounded-full bg-amber-400" /><i className="h-2 w-2 rounded-full bg-emerald-400" /></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700"><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />Sistem aktif</span></div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[.9fr_1.1fr]">
              <aside className="rounded-2xl bg-slate-950 p-3 text-slate-300"><div className="flex items-center gap-2 text-xs font-black text-white"><span className="grid h-6 w-6 place-items-center rounded-lg bg-indigo-500"><Wrench className="h-3 w-3" /></span>Toko Anda</div><div className="mt-5 space-y-1 text-[10px] font-bold"><p className="rounded-lg bg-white/10 px-2 py-1.5 text-white">Ringkasan</p><p className="px-2 py-1.5">Servis</p><p className="px-2 py-1.5">Kasir</p><p className="px-2 py-1.5">Stok</p><p className="px-2 py-1.5">Laporan</p></div></aside>
              <div className="space-y-3"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold text-slate-500">Selamat pagi, Admin</p><p className="text-sm font-black">Ringkasan hari ini</p></div><span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Zap className="h-4 w-4" /></span></div><div className="grid grid-cols-2 gap-2"><div className="rounded-xl border border-slate-100 p-2.5"><p className="text-[9px] font-bold text-slate-500">Servis aktif</p><p className="mt-1 text-lg font-black">24</p><p className="text-[9px] font-bold text-emerald-600">+5 hari ini</p></div><div className="rounded-xl border border-slate-100 p-2.5"><p className="text-[9px] font-bold text-slate-500">Penjualan</p><p className="mt-1 text-lg font-black">Rp8,4jt</p><p className="text-[9px] font-bold text-emerald-600">+12,4%</p></div></div><div className="rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between"><p className="text-[10px] font-black">Tiket terbaru</p><span className="text-[9px] font-bold text-indigo-600">Lihat semua</span></div><div className="mt-2 flex items-center gap-2 rounded-lg bg-white p-2"><span className="grid h-6 w-6 place-items-center rounded-lg bg-amber-50 text-amber-600"><MonitorSmartphone className="h-3 w-3" /></span><div className="min-w-0 flex-1"><p className="truncate text-[9px] font-black">MacBook Pro M1</p><p className="text-[8px] font-bold text-slate-500">Menunggu diagnosa</p></div><span className="h-1.5 w-12 rounded-full bg-amber-300" /></div></div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-4"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400"><span>Dirancang untuk</span><span>Servis komputer</span><span>Servis gadget</span><span>Toko sparepart</span><span>Elektronik</span></div></section>

      <section id="fitur" className="mx-auto max-w-6xl px-4 py-14 sm:px-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Semua yang dibutuhkan</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Kerja lebih cepat. Data tetap nyambung.</h2></div><p className="max-w-sm text-xs leading-5 text-slate-600">Fitur inti berhubungan langsung, bukan kumpulan aplikasi yang terpisah.</p></div><div className="mt-7 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{modules.map((module) => <article key={module.title} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"><span className={`grid h-10 w-10 place-items-center rounded-xl ${module.tone}`}><module.icon className="h-5 w-5" /></span><h3 className="mt-4 text-sm font-black">{module.title}</h3><p className="mt-1.5 text-xs leading-5 text-slate-600">{module.desc}</p><span className="mt-4 inline-flex items-center gap-1 text-[10px] font-black text-indigo-600 opacity-0 transition group-hover:opacity-100">Pelajari modul <ArrowRight className="h-3 w-3" /></span></article>)}</div></section>

      <section id="cara-kerja" className="bg-slate-950 py-14 text-white"><div className="mx-auto grid max-w-6xl gap-7 px-4 sm:px-6 lg:grid-cols-[.9fr_1.1fr]"><div><p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Alur sederhana</p><h2 className="mt-2 text-3xl font-black tracking-tight">Dari unit masuk sampai transaksi selesai.</h2><p className="mt-3 text-xs leading-5 text-slate-300">Setiap orang melihat tugas yang relevan. Pemilik tetap dapat angka yang dibutuhkan tanpa mengejar laporan manual.</p><button onClick={() => setShowLogin(true)} className="mt-5 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-slate-950">Coba FixDev sekarang</button></div><div className="grid gap-2 sm:grid-cols-3">{[["01", "Terima unit", "Data pelanggan, keluhan, foto, dan SPK."], ["02", "Kerjakan terukur", "Diagnosa, biaya, stok, QC, dan notifikasi."], ["03", "Tutup dengan rapi", "Invoice, pembayaran, laporan, dan riwayat."]].map(([number, title, desc]) => <div key={number} className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-lg font-black text-cyan-300">{number}</p><h3 className="mt-7 text-sm font-black">{title}</h3><p className="mt-2 text-[11px] leading-5 text-slate-300">{desc}</p></div>)}</div></div></section>

      <section id="paket" className="mx-auto max-w-6xl px-4 py-14 sm:px-6"><div className="mx-auto mb-8 max-w-2xl text-center"><p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Paket langganan</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Pilih paket yang sesuai toko Anda.</h2><p className="mt-3 text-xs leading-5 text-slate-600">Semua paket sudah termasuk isolasi data per cabang, hak akses per peran, dan dukungan migrasi.</p></div><div className="grid gap-4 lg:grid-cols-3">{plans.map((plan) => <article key={plan.name} className={`relative rounded-3xl border bg-white p-5 shadow-sm transition ${plan.highlight ? "border-indigo-300 shadow-lg shadow-indigo-100 ring-1 ring-indigo-200" : "border-slate-200"}`}><div className="flex items-center justify-between"><h3 className="text-sm font-black">{plan.name}</h3>{plan.highlight && <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-black text-white">Terpopuler</span>}</div><p className="mt-3"><span className="text-2xl font-black">{plan.price}</span><span className="text-[10px] font-bold text-slate-500">{plan.period}</span></p><button onClick={() => setShowLogin(true)} className={`mt-4 w-full rounded-xl py-2.5 text-xs font-black ${plan.highlight ? "bg-indigo-600 text-white hover:bg-indigo-700" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{plan.highlight ? "Mulai sekarang" : "Pilih paket"}</button><ul className="mt-4 space-y-2 text-[11px] font-bold text-slate-700">{plan.points.map((point) => <li key={point} className="flex items-center gap-2"><CircleCheck className="h-3.5 w-3.5 text-emerald-600" />{point}</li>)}</ul></article>)}</div></section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6"><div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-5 sm:p-7"><div className="grid items-center gap-6 lg:grid-cols-[1fr_.9fr]"><div><p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Siap mulai?</p><h2 className="mt-2 text-3xl font-black tracking-tight">Satu tempat untuk mengelola bengkel Anda.</h2><p className="mt-3 max-w-xl text-xs leading-5 text-slate-600">Buat toko, atur cabang, undang tim, lalu mulai terima pekerjaan. Data cabang terisolasi dari awal.</p><div className="mt-5 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-700">{capabilities.map((item) => <p key={item} className="flex items-center gap-1.5"><CircleCheck className="h-3.5 w-3.5 text-emerald-600" />{item}</p>)}</div></div><div className="rounded-2xl bg-white p-4 shadow-lg shadow-indigo-100"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Paket awal</p><p className="mt-2 text-2xl font-black">Mulai sesuai kebutuhan</p><p className="mt-2 text-xs leading-5 text-slate-600">Daftar toko baru dan konfigurasi dasar langsung tersedia.</p><button onClick={() => setShowLogin(true)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-black text-white hover:bg-indigo-700">Daftarkan toko <ArrowRight className="h-4 w-4" /></button><p className="mt-3 text-center text-[10px] font-bold text-slate-500"><Check className="mr-1 inline h-3 w-3 text-emerald-600" />Tanpa input kartu di awal</p></div></div></div></section>

      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-[10px] font-bold text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6"><span>© 2026 FixDev</span><span className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5 text-indigo-600" />Operasional lebih rapi, satu alur.</span></div></footer>
    </main>
  );
};
