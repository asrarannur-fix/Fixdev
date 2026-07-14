import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSaaS } from "../context/SaaSContext";
import { motion, AnimatePresence } from "motion/react";
import {
  Building, Shield, User, Mail, ArrowLeft, Wrench, Sparkles, CheckCircle, 
  Database, ShieldCheck, DollarSign, ShoppingBag, Palette, Layers, Briefcase, Clock, ArrowRight, Lock,
  Compass, FileText, LayoutDashboard, Package, Users, MessageSquare, Settings
} from "lucide-react";

interface LoginPageProps {
  onBack: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onBack }) => {
  const { loginUser, addTenant, addUser, users, isAuthenticated, sendPasswordReset } = useSaaS();

  // Tab Management
  const [activeTab, setActiveTab] = useState<"register" | "manual">("manual");

  // Manual Login State
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Lupa Password State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError("Masukkan alamat email Anda.");
      return;
    }
    setForgotLoading(true);
    setForgotError("");
    try {
      await sendPasswordReset(forgotEmail.trim());
      setForgotSuccess(true);
    } catch (err: any) {
      setForgotError(err.message || "Gagal mengirim email reset password.");
    } finally {
      setForgotLoading(false);
    }
  };

  // Register Tenant State
  const [shopName, setShopName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [businessSector, setBusinessSector] = useState("IT & Servis Komputer");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("#4f46e5");
  const [registrationSuccess, setRegistrationSuccess] = useState<any | null>(null);

  const themePresets = [
    { name: "Indigo Cyber", color: "#4f46e5", bg: "bg-indigo-600" },
    { name: "Emerald Tech", color: "#059669", bg: "bg-emerald-600" },
    { name: "Crimson Flame", color: "#dc2626", bg: "bg-red-600" },
    { name: "Sunset Gold", color: "#d97706", bg: "bg-amber-600" },
    { name: "Deep Ocean", color: "#0284c7", bg: "bg-sky-600" },
    { name: "Grape Purple", color: "#7c3aed", bg: "bg-purple-600" },
  ];

  const handleShopNameChange = (val: string) => {
    setShopName(val);
    const slug = val
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    setSubdomain(slug);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setErrorMsg("Harap masukkan alamat email Anda.");
      return;
    }
    if (!passwordInput.trim()) {
      setErrorMsg("Harap masukkan password Anda.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const success = await loginUser(emailInput, passwordInput);
      if (success) return;
      setErrorMsg("Email atau password tidak terdaftar atau salah. Silakan coba lagi.");
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal masuk ke sistem.");
    } finally {
      setLoading(false);
    }
  };

  const handleTenantRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanShopName = shopName.trim();
    const cleanOwnerName = ownerName.trim();
    const cleanOwnerEmail = ownerEmail.trim().toLowerCase();
    const submittedOwnerPassword = ownerPassword;
    
    if (!cleanShopName || !cleanOwnerName || !cleanOwnerEmail || !submittedOwnerPassword) {
      setErrorMsg("Harap isi seluruh formulir pendaftaran, termasuk password owner.");
      return;
    }
    if (!cleanOwnerEmail.includes("@")) {
      setErrorMsg("Format email owner tidak valid.");
      return;
    }
    if (submittedOwnerPassword.length < 6) {
      setErrorMsg("Password owner minimal 6 karakter.");
      return;
    }

    const cleanSubdomain = (subdomain || "toko-utama")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!cleanSubdomain) {
      setErrorMsg("Identitas subdomain tidak valid.");
      return;
    }

    const emailExist = users.some(
      (u) => u.email.toLowerCase() === cleanOwnerEmail,
    );
    if (emailExist) {
      setErrorMsg("Email owner sudah terdaftar dalam sistem. Gunakan email unik lainnya.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/onboarding/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName: cleanShopName,
          subdomain: cleanSubdomain,
          ownerName: cleanOwnerName,
          ownerEmail: cleanOwnerEmail,
          ownerPassword: submittedOwnerPassword,
          themeColor: selectedTheme,
          tier: "BASIC",
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal melakukan pendaftaran penyewa.");
      }

      setRegistrationSuccess({
        tenant: result.tenant,
        branch: result.branch,
        ownerEmail: cleanOwnerEmail,
        ownerName: cleanOwnerName,
      });
    } catch (err: any) {
      setErrorMsg("Gagal melakukan pendaftaran penyewa: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchSimulation = async () => {
    if (!registrationSuccess) return;
    setLoading(true);
    setErrorMsg("");
    try {
      await loginUser(registrationSuccess.ownerEmail, ownerPassword);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal masuk setelah pendaftaran.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-slate-200 flex" id="login-container-root">
      {/* Left Panel — Branding & Visuals (Desktop) */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/80 via-[#0a0a1a] to-purple-900/40" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: "3s" }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-500/20">
              <Wrench className="w-5 h-5" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">
              FixFlow <span className="text-indigo-400 font-medium">ERP</span>
            </span>
          </div>
        </div>

        <div className="relative z-10 space-y-8 max-w-lg">
          <h2 className="text-4xl font-black text-white leading-tight">
            Satu Platform untuk <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Mengelola Bengkel</span>
          </h2>
          <p className="text-slate-400 leading-relaxed">
            Dari penerimaan tiket servis hingga pelaporan keuangan. Semua terintegrasi dalam satu dashboard cloud yang aman dan terisolasi per tenant.
          </p>

          {/* Floating Feature Cards */}
          <div className="space-y-4 pt-4">
            {[
              { icon: Database, text: "Isolasi database multi-tenant per cabang" },
              { icon: Sparkles, text: "AI Diagnostic Assistant untuk QC servis" },
              { icon: ShieldCheck, text: "Fraud detection & audit log proaktif" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400"><f.icon className="w-4 h-4" /></div>
                <span className="text-sm text-slate-300">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-[11px] text-slate-600 font-mono">&copy; 2026 FixFlow ERP. Multi-Tenant SaaS Platform.</p>
        </div>
      </div>

      {/* Right Panel — Login/Register Forms */}
      <div className="w-full lg:w-[45%] flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden h-16 border-b border-white/5 bg-[#0a0a1a] px-6 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-white transition cursor-pointer"><ArrowLeft className="w-4 h-4" /></button>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white"><Wrench className="w-3.5 h-3.5" /></div>
          <span className="text-sm font-black text-white">FixFlow <span className="text-indigo-400 font-medium">ERP</span></span>
        </div>

        {/* Scrollable Form Area */}
        <main className="flex-1 flex items-center justify-center py-8 px-6 overflow-y-auto">
          <div className="w-full max-w-md space-y-8">
            {/* Desktop Back Button */}
            <div className="hidden lg:block">
              <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-white transition cursor-pointer mb-8">
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Beranda</span>
              </button>
            </div>

            {/* Section Title */}
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-white">
                Portal Akses &amp;{" "}
                <span className="text-indigo-400">Registrasi</span>
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Masuk dengan email terdaftar atau daftarkan toko baru untuk Free Trial 30 Hari.
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5">
              <button
                onClick={() => { setActiveTab("manual"); setErrorMsg(""); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === "manual"
                    ? "bg-white/10 text-white shadow-lg"
                    : "text-slate-500 hover:text-white"
                }`}
              >
                <Mail className="w-3.5 h-3.5" /> Masuk Sistem
              </button>
              <button
                onClick={() => { setActiveTab("register"); setErrorMsg(""); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === "register"
                    ? "bg-white/10 text-white shadow-lg"
                    : "text-slate-500 hover:text-white"
                }`}
              >
                <Building className="w-3.5 h-3.5" /> Daftar Toko Baru
              </button>
            </div>

            {/* Domain Info Banner */}
            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-xs leading-relaxed">
              <div className="flex gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl h-fit"><Sparkles className="w-4 h-4" /></div>
                <div className="space-y-1">
                  <p className="font-bold text-white text-[11px]">⚡ Mode Single Domain Aktif</p>
                  <p className="text-slate-400">
                    Semua penyewa mengakses <strong className="text-indigo-400">fixdev.my.id</strong>. Data terisolasi otomatis per tenant.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-4 text-xs font-medium flex items-start gap-3 animate-shake">
                <span className="text-base">⚠️</span>
                <div>
                  <p className="font-bold text-red-400">Gagal Mengakses</p>
                  <p className="mt-0.5">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Forms Container */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl">
              <AnimatePresence mode="wait">
                {/* Registration Success */}
                {registrationSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-6 text-center py-4"
                  >
                    <div className="mx-auto w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center justify-center shadow-lg">
                      <Sparkles className="w-8 h-8 animate-bounce" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-white">Toko Berhasil Terdaftar!</h3>
                      <p className="text-xs text-slate-400">Sistem telah menginisialisasi lingkungan kerja eksklusif untuk bisnis Anda.</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl border border-white/5 p-4 text-left space-y-3 font-mono text-[11px]">
                      {[
                        { label: "Penyewa:", value: registrationSuccess.tenant.name },
                        { label: "Domain:", value: "fixdev.my.id", color: "text-indigo-400" },
                        { label: "Cabang:", value: registrationSuccess.branch.name, color: "text-emerald-400" },
                        { label: "Kredensial:", value: registrationSuccess.ownerEmail, color: "text-amber-400" },
                      ].map((row, i) => (
                        <div key={i} className={`flex justify-between pb-2 border-b border-white/5 ${i === 3 ? "border-0 pb-0" : ""}`}>
                          <span className="text-slate-500">{row.label}</span>
                          <span className={`font-bold ${row.color || "text-white"}`}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button onClick={() => setRegistrationSuccess(null)} className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs py-3 rounded-2xl transition-all cursor-pointer">
                        Daftar Ulang
                      </button>
                      <button onClick={handleLaunchSimulation} disabled={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95">
                        {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span>Masuk ke Dashboard</span><ArrowRight className="w-4 h-4" /></>}
                      </button>
                    </div>
                  </motion.div>
                ) : activeTab === "register" ? (
                  /* Register Form */
                  <motion.div key="register" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                    <div className="border-b border-white/5 pb-4">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2"><Building className="w-5 h-5 text-indigo-400" /> Daftar Toko Baru</h3>
                      <p className="text-xs text-slate-500 mt-1">Mendaftarkan bengkel servis ke dalam database cloud FixFlow ERP.</p>
                    </div>

                    <form onSubmit={handleTenantRegistration} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5"><Building className="w-3.5 h-3.5 text-indigo-400" /> Nama Toko</label>
                          <input type="text" required placeholder="Contoh: FixLab Computer Bandung" value={shopName} onChange={(e) => handleShopNameChange(e.target.value)} className="w-full text-xs p-3.5 rounded-xl border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none placeholder:text-slate-600" />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-indigo-400" /> Sektor Layanan</label>
                          <select value={businessSector} onChange={(e) => setBusinessSector(e.target.value)} className="w-full text-xs p-3.5 rounded-xl border border-white/10 bg-white/5 text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none">
                            <option value="IT & Servis Komputer">IT &amp; Servis Komputer</option>
                            <option value="Servis Smartphone/Gadget">Servis Smartphone &amp; Gadget</option>
                            <option value="Servis Elektronik Umum">Servis Elektronik Umum</option>
                            <option value="Bengkel Otomotif">Bengkel Otomotif</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5"><Palette className="w-3.5 h-3.5 text-indigo-400" /> Tema Warna</label>
                          <div className="flex gap-2 pt-1.5">
                            {themePresets.map((theme, tIdx) => (
                              <button key={tIdx} type="button" onClick={() => setSelectedTheme(theme.color)} className={`w-8 h-8 rounded-xl ${theme.bg} relative transition-transform cursor-pointer hover:scale-110 active:scale-95 flex items-center justify-center`}>
                                {selectedTheme === theme.color && <span className="text-white text-xs">✓</span>}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-indigo-400" /> Nama Pemilik</label>
                          <input type="text" required placeholder="Nama lengkap" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="w-full text-xs p-3.5 rounded-xl border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none placeholder:text-slate-600" />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-indigo-400" /> Email Owner</label>
                          <input type="email" required placeholder="owner@fixlab.com" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className="w-full text-xs p-3.5 rounded-xl border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-mono placeholder:text-slate-600" />
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-indigo-400" /> Password Owner</label>
                          <input type="password" required minLength={6} placeholder="Minimal 6 karakter" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} className="w-full text-xs p-3.5 rounded-xl border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-mono placeholder:text-slate-600" />
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 space-y-1.5 text-xs">
                        <p className="font-bold text-indigo-400 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Otomatisasi Onboarding</p>
                        <p className="text-slate-500">Sistem membuatkan Cabang Utama, Gudang, dan Chart of Accounts PSAK otomatis.</p>
                      </div>

                      <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/10 text-white font-bold text-xs py-3.5 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95">
                        {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span>Daftar &amp; Aktifkan Toko Baru</span><ArrowRight className="w-4 h-4" /></>}
                      </button>
                    </form>
                  </motion.div>
                ) : (
                  /* Login Form */
                  <motion.div key="manual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 py-2">
                    <div className="text-center pb-2">
                      <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2">
                        <Lock className="w-5 h-5 text-indigo-400" /> Login Multi-Tenant ERP
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">Gunakan email dan password terdaftar untuk masuk.</p>
                    </div>

                    <form onSubmit={handleManualSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-indigo-400" /> Alamat Email</label>
                        <input type="email" required placeholder="Masukkan alamat email Anda" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="w-full text-xs p-3.5 rounded-xl border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-mono placeholder:text-slate-600" />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-indigo-400" /> Password</label>
                        <input type="password" required placeholder="••••••••" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full text-xs p-3.5 rounded-xl border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none placeholder:text-slate-600" />
                      </div>

                      <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/10 text-white font-bold text-xs py-3.5 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95">
                        {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span>Masuk Sistem</span><ArrowRight className="w-4 h-4" /></>}
                      </button>

                      <div className="text-center pt-1">
                        <button type="button" onClick={() => { setShowForgotPassword(true); setForgotSuccess(false); setForgotError(""); setForgotEmail(""); }} className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline font-medium cursor-pointer">
                          Lupa Password?
                        </button>
                      </div>
                    </form>

                    <div className="pt-4 border-t border-white/5 text-center text-[11px] text-slate-600">
                      <p>Terintegrasi dengan Supabase Cloud &middot; Otorisasi instan via token.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-4 border-t border-white/5 text-center text-[10px] text-slate-700 font-mono px-6">
          © 2026 FixFlow ERP Systems. Cloud Multi-Tenant SaaS.
        </footer>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#121214] rounded-3xl shadow-2xl border border-white/10 overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Lupa Password</h3>
                  <p className="text-[10px] text-slate-500">Kami kirimkan link reset ke email Anda</p>
                </div>
              </div>
              <button onClick={() => setShowForgotPassword(false)} className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all cursor-pointer">
                <span className="text-lg leading-none">×</span>
              </button>
            </div>

            <div className="p-6">
              {forgotSuccess ? (
                <div className="text-center space-y-4 py-2">
                  <div className="mx-auto w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Email Terkirim!</h4>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      Link reset password telah dikirim ke <strong className="text-white">{forgotEmail}</strong>. Cek inbox atau folder Spam.
                    </p>
                  </div>
                  <button onClick={() => setShowForgotPassword(false)} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95">
                    Kembali ke Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <p className="text-xs text-slate-400 leading-relaxed">Masukkan email terdaftar. Kami akan mengirimkan link untuk membuat password baru.</p>
                  <div>
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-400" /> Alamat Email
                    </label>
                    <input type="email" required placeholder="contoh@email.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} disabled={forgotLoading} className="w-full text-xs p-3.5 rounded-xl border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-mono placeholder:text-slate-600 disabled:opacity-60" />
                    {forgotError && <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1"><span>⚠️</span> {forgotError}</p>}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setShowForgotPassword(false)} disabled={forgotLoading} className="flex-1 py-2.5 text-xs font-medium text-slate-400 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-all cursor-pointer disabled:opacity-50">
                      Batal
                    </button>
                    <button type="submit" disabled={forgotLoading || !forgotEmail.trim()} className="flex-1 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/10 disabled:cursor-not-allowed rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95">
                      {forgotLoading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Kirim Link Reset</>}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
