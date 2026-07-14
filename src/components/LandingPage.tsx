/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { UserRole } from "../types";
import { LoginPage } from "./LoginPage";
import { useSaaS } from "../context/SaaSContext";
import {
  Wrench, Cpu, ShieldCheck, Users, LineChart, Database, Building, Sparkles,
  ArrowRight, Menu, X, ChevronRight, Laptop
} from "lucide-react";

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useSaaS();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };


  const colorMap: Record<string, { bg: string; text: string }> = {
    indigo: { bg: "bg-indigo-500/10", text: "text-indigo-400" },
    violet: { bg: "bg-violet-500/10", text: "text-violet-400" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400" },
    rose: { bg: "bg-rose-500/10", text: "text-rose-400" },
    orange: { bg: "bg-orange-500/10", text: "text-orange-400" },
    sky: { bg: "bg-sky-500/10", text: "text-sky-400" },
  };

  const features = [
    { title: "Servis & Tiket Komprehensif", icon: Wrench, desc: "Alur servis terpadu dari QR-label, diagnosis AI, approval estimasi, QC ketat, hingga serah terima unit.", color: "indigo" },
    { title: "POS Ritel Terintegrasi", icon: Cpu, desc: "Mesin kasir untuk penjualan sparepart & pelunasan servis. Barcode, shift kerja, diskon promo.", color: "violet" },
    { title: "Kontrol Stok & Kanibalisasi", icon: Database, desc: "Pelacakan real-time stok per cabang, mutasi antar gudang, dan pencatatan kanibalisasi transparan.", color: "emerald" },
    { title: "Double-Entry Accounting", icon: LineChart, desc: "Setiap transaksi otomatis menjurnal ke Buku Besar, Arus Kas, Neraca, dan Laba Rugi sesuai PSAK.", color: "rose" },
    { title: "SDM & Penggajian", icon: Users, desc: "Absensi, persetujuan kasbon, komisi teknisi servis, dan slip gaji bulanan terintegrasi otomatis.", color: "orange" },
    { title: "Fraud Detection AI", icon: ShieldCheck, desc: "Menganalisis anomali stok, diskon mencurigakan, invoice bermasalah, dan audit log tak terhapus.", color: "sky" },
  ];

  const roles = [
    { name: "Owner", role: "OWNER", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20", desc: "Dashboard utama, arus kas, laporan pajak, marketplace sync, white-label." },
    { name: "Admin", role: "ADMIN", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", desc: "Tiket servis, POS, mutasi stok, dan database pelanggan (CRM)." },
    { name: "Manager", role: "MANAGER", badge: "bg-rose-500/10 text-rose-400 border-rose-500/20", desc: "Kehadiran, payroll, komisi teknisi, dan persetujuan kasbon." },
    { name: "Kasir", role: "KASIR", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20", desc: "Mesin kasir, pembayaran servis, kontrol shift, diskon & invoice." },
    { name: "Teknisi", role: "TEKNISI", badge: "bg-sky-500/10 text-sky-400 border-sky-500/20", desc: "Diagnosis perbaikan, AI assistant, kanibalisasi, QC & histori." },
  ];

  if (showLogin) {
    return <LoginPage onBack={() => setShowLogin(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-slate-200 selection:bg-indigo-500 selection:text-white animate-fadeIn">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[30%] -left-[10%] w-[60%] h-[60%] bg-indigo-900/20 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute top-[30%] -right-[10%] w-[50%] h-[50%] bg-cyan-900/15 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute -bottom-[20%] left-[30%] w-[40%] h-[40%] bg-purple-900/15 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: "4s" }} />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-2xl border-b border-white/5 bg-[#0a0a1a]/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                <Wrench className="w-5 h-5" />
              </div>
              <span className="text-xl font-black tracking-tight text-white">
                FixFlow <span className="text-indigo-400 font-medium">ERP</span>
              </span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection("features")} className="text-sm font-semibold text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer">
                Fitur
              </button>
              <button onClick={() => scrollToSection("stats")} className="text-sm font-semibold text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer">
                Metrik
              </button>
              <button onClick={() => scrollToSection("roles")} className="text-sm font-semibold text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer">
                Peran
              </button>
              <button onClick={() => setShowLogin(true)} className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-bold text-sm text-white cursor-pointer hover:shadow-lg hover:shadow-indigo-500/10">
                Akses Portal ERP &rarr;
              </button>
            </div>

            <button className="md:hidden p-2 text-slate-400 hover:text-white transition-colors cursor-pointer" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/5 bg-[#0a0a1a]/95 backdrop-blur-2xl px-4 py-4 space-y-2" id="mobile-nav-menu">
            <button onClick={() => scrollToSection("features")} className="block w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/5 transition">Fitur</button>
            <button onClick={() => scrollToSection("stats")} className="block w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/5 transition">Metrik</button>
            <button onClick={() => scrollToSection("roles")} className="block w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/5 transition">Peran</button>
            <button onClick={() => { setShowLogin(true); setMobileMenuOpen(false); }} className="block w-full text-center bg-indigo-600 text-white font-bold text-sm py-3 rounded-xl mt-2 transition">Akses Portal ERP</button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative py-24 lg:py-36 overflow-hidden" id="landing-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-12 gap-16 items-center">
            <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-mono font-bold uppercase tracking-wider mx-auto lg:mx-0">
                <Sparkles className="w-3.5 h-3.5" />
                FixFlow ERP &middot; Multi-Tenant SaaS Platform
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.05]">
                Sistem ERP Bengkel <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">
                  Terintegrasi Kelas Enterprise
                </span>
              </h1>

              <p className="text-lg text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Satu dashboard komprehensif untuk mengelola rantai bisnis perbaikan elektronik &amp; ritel komputer. Dilengkapi POS multi-cabang, QC cerdas berbasis AI, accounting otomatis, serta WhatsApp gateway.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <button onClick={() => setShowLogin(true)} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold text-sm shadow-xl shadow-indigo-500/25 transition-all duration-300 inline-flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-1">
                  <span>Daftarkan Toko Baru</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={() => scrollToSection("roles")} className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-2xl font-bold text-sm transition-all duration-300 cursor-pointer">
                  Pelajari Peran & Hak Akses &darr;
                </button>
              </div>

              <div className="pt-8 grid grid-cols-3 gap-6 max-w-md mx-auto lg:mx-0 border-t border-white/10" id="trust-markers">
                <div>
                  <p className="text-3xl font-black text-white">99.9%</p>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Uptime SLA</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-white">100%</p>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Isolasi Tenant</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-white">6<span className="text-lg">Role</span></p>
                  <p className="text-xs font-semibold text-slate-500 mt-1">RBAC Presisi</p>
                </div>
              </div>
            </div>

            {/* Hero Mockup Card */}
            <div className="lg:col-span-5" id="hero-graphics">
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-[2rem] blur-2xl opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
                <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 space-y-6">
                  <div className="flex items-center gap-2 pb-4 border-b border-white/10">
                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    <span className="ml-auto text-[10px] font-mono text-indigo-400 font-bold">FixFlow_SaaS v3.4</span>
                  </div>

                  <div className="space-y-4">
                    {[
                      { icon: Database, title: "Isolasi Database", sub: "Multi-Tenant PostgreSQL", status: "Aktif", statusColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
                      { icon: Users, title: "RBAC Terdesentralisasi", sub: "Owner, Admin, Kasir, Teknisi", status: "Aman", statusColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
                      { icon: Sparkles, title: "AI Diagnostic Assistant", sub: "QC Cerdas Otomatis", status: "Beta", statusColor: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
                    ].map((item, idx) => (
                      <div key={idx} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <item.icon className="w-5 h-5 text-indigo-400" />
                          <div>
                            <p className="text-sm font-bold text-white">{item.title}</p>
                            <p className="text-[11px] text-slate-500 font-mono">{item.sub}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold py-1 px-2.5 rounded-lg border ${item.statusColor}`}>{item.status}</span>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => setShowLogin(true)} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm py-4 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/20">
                    <span>Luncurkan Onboarding</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="py-24 relative" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono">Modul &amp; Solusi Utama</h2>
            <p className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">Menjawab Segala Kebutuhan Operasional Bengkel</p>
            <p className="text-sm text-slate-400">Seluruh fungsionalitas dirancang dalam satu arsitektur terpadu, menghilangkan duplikasi input data.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="group p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.08] transition-all duration-300 space-y-5">
                <div className={`${colorMap[f.color].bg} ${colorMap[f.color].text} w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="py-20 relative" id="stats">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-indigo-900/80 to-[#0a0a1a] rounded-[2rem] border border-indigo-500/20 p-10 sm:p-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="grid lg:grid-cols-12 gap-12 items-center relative z-10">
              <div className="lg:col-span-5 space-y-4">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Platform SaaS yang Selalu Siap di Skalakan</h2>
                <p className="text-sm text-indigo-200/70 leading-relaxed">Database terisolasi memastikan bisnis Anda berjalan kencang tanpa kendala latensi.</p>
              </div>
              <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
                {[
                  { val: "1.2ms", label: "DB Response" },
                  { val: "< 3s", label: "Onboarding" },
                  { val: "256-bit", label: "SSL Encrypted" },
                  { val: "Zero", label: "Data Cross-Access" },
                ].map((s, i) => (
                  <div key={i} className="p-5 bg-white/5 rounded-2xl border border-white/5">
                    <span className="text-3xl font-black block text-indigo-400 font-mono">{s.val}</span>
                    <span className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider block mt-2">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-24" id="roles">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono">Hak Akses Pengguna Granular (RBAC)</h2>
            <p className="text-3xl font-extrabold text-white tracking-tight">Kolaborasi Tim &amp; Pembagian Tugas</p>
            <p className="text-sm text-slate-400">Setiap peran dibatasi secara aman dan terisolasi demi mencegah fraud operasional.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((r, i) => (
              <div key={i} className="bg-white/5 border border-white/5 p-6 rounded-3xl hover:border-indigo-500/30 hover:bg-white/[0.08] transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <span className="text-sm font-black text-white">{r.name}</span>
                    <span className={`text-[9px] font-mono font-bold tracking-wider px-2.5 py-1 rounded-lg border ${r.badge}`}>{r.role}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-4 leading-relaxed">{r.desc}</p>
                </div>
                <button onClick={() => setShowLogin(true)} className="w-full mt-6 bg-white/5 hover:bg-indigo-600 border border-white/10 hover:border-indigo-500 text-slate-300 hover:text-white text-xs font-bold py-3 px-4 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1 group">
                  <span>Aktifkan Hak Akses {r.role}</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-16 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-3xl p-8 text-center max-w-2xl mx-auto space-y-5">
            <h4 className="text-lg font-extrabold text-white">Ingin Mencoba Dengan Toko Buatan Anda Sendiri?</h4>
            <p className="text-sm text-slate-400">Daftarkan toko baru Anda untuk menginisialisasi database bersih, memilih branding kustom, dan login penuh sebagai Owner.</p>
            <button onClick={() => setShowLogin(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-8 py-3.5 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all inline-flex items-center gap-2 cursor-pointer transform hover:-translate-y-1">
              <Building className="w-4 h-4" />
              <span>Daftarkan Toko Baru &rarr;</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 text-center" id="landing-footer-container">
        <div className="max-w-7xl mx-auto px-4 space-y-3">
          <p className="text-sm font-semibold text-slate-400">&copy; 2026 FixFlow ERP. Semua Hak Dilindungi.</p>
          <p className="text-[11px] font-mono text-slate-600">Crafted with React, Tailwind CSS, &amp; Supabase</p>
        </div>
      </footer>
    </div>
  );
};
