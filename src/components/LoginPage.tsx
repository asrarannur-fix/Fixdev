import React, { useState, useEffect } from "react";
import { useSaaS } from "../context/SaaSContext";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft, ArrowRight, Banknote, Building, Lock, Mail, Store,
  User, Wrench, ShieldCheck, CheckCircle, Palette, Briefcase,
} from "lucide-react";

interface LoginPageProps {
  onBack: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onBack }) => {
  const { loginUser, addUser, isAuthenticated, activeTenant } = useSaaS();

  const [activeTab, setActiveTab] = useState<"register" | "manual">("manual");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [shopName, setShopName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [businessSector, setBusinessSector] = useState("IT & Servis Komputer");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("var(--accent)");
  const [registrationSuccess, setRegistrationSuccess] = useState<any | null>(null);

  const themePresets = [
    { name: "Indigo Cyber", color: "#4f46e5" },
    { name: "Emerald Tech", color: "#059669" },
    { name: "Crimson Flame", color: "#dc2626" },
    { name: "Sunset Gold", color: "#d97706" },
    { name: "Deep Ocean", color: "#0284c7" },
    { name: "Grape Purple", color: "#7c3aed" },
  ];

  const handleShopNameChange = (val: string) => {
    setShopName(val);
    setSubdomain(
      val.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-"),
    );
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) { setErrorMsg("Harap masukkan alamat email Anda."); return; }
    if (!passwordInput.trim()) { setErrorMsg("Harap masukkan password Anda."); return; }
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
    if (!cleanOwnerEmail.includes("@")) { setErrorMsg("Format email owner tidak valid."); return; }
    if (submittedOwnerPassword.length < 6) { setErrorMsg("Password owner minimal 6 karakter."); return; }
    const cleanSubdomain = (subdomain || "toko-utama").trim().toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (!cleanSubdomain) { setErrorMsg("Identitas subdomain tidak valid."); return; }
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
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Gagal membuat toko baru.");
      setRegistrationSuccess({ tenant: result.tenant, branch: result.branch, ownerEmail: cleanOwnerEmail, ownerName: cleanOwnerName });
    } catch (err: any) {
      setErrorMsg("Gagal membuat toko baru: " + err.message);
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
    <main className="relative flex min-h-screen flex-col bg-slate-50 text-slate-900" id="login-page">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-[420px] bg-[radial-gradient(circle_at_15%_0%,rgba(99,102,241,.16),transparent_34%),radial-gradient(circle_at_85%_10%,rgba(34,211,238,.12),transparent_30%)]" />

        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <button onClick={onBack} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-accent"><ArrowLeft className="h-4 w-4" /> Kembali</button>
          <div className="flex items-center gap-2 font-black">
            <span className="grid h-8 w-8 place-items-center rounded-xl text-white font-bold text-sm shadow-md transition-all duration-200" style={{ 
              backgroundColor: activeTenant?.branding?.primaryColor || "#4f46e5" 
            }}>
              <Wrench className="h-4 w-4" />
            </span>
            <span style={{ color: activeTenant?.branding?.primaryColor || "#1e293b" }}>
              {activeTenant?.branding?.whiteLabelEnabled && activeTenant?.branding?.customDomain
                ? activeTenant.branding.customDomain
                : activeTenant?.name || "KM"
              }
            </span>
          </div>
        </header>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_1fr] lg:py-10">
        <aside className="hidden lg:block">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-accent/10">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent"><Building className="h-4 w-4" /> Multi-cabang</div>
            <h2 className="mt-3 text-2xl font-black leading-tight tracking-tight">Satu akun, seluruh toko terkelola.</h2>
            <p className="mt-2 text-xs leading-5 text-slate-600">Masuk untuk melihat servis, kasir, stok, dan laporan toko Anda. Data tiap cabang terpisah dan aman.</p>
            <ul className="mt-5 grid gap-2 text-xs font-bold text-slate-700">
              {[["Cabang terisolasi", "Data toko tidak tercampur."], ["Akses per peran", "Owner, Admin, Kasir, Teknisi."], ["Pantauan cepat", "Ringkasan operasional real-time."]].map(([t, d]) => (
                <li key={t} className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3"><ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" /><span><span className="block">{t}</span><span className="block text-[10px] font-semibold text-slate-500">{d}</span></span></li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="mx-auto w-full max-w-md">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-accent/10 sm:p-7">
            <div className="flex p-1 rounded-xl bg-slate-100">
              <button onClick={() => { setActiveTab("manual"); setErrorMsg(""); }} className={`flex-1 rounded-lg py-2.5 text-xs font-black transition ${activeTab === "manual" ? "bg-white text-accent shadow-sm" : "text-slate-500"}`}><Mail className="mr-1 inline h-3.5 w-3.5" />Masuk</button>
              <button onClick={() => { setActiveTab("register"); setErrorMsg(""); }} className={`flex-1 rounded-lg py-2.5 text-xs font-black transition ${activeTab === "register" ? "bg-white text-accent shadow-sm" : "text-slate-500"}`}><Store className="mr-1 inline h-3.5 w-3.5" />Daftar toko</button>
            </div>

            {errorMsg && <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-medium text-rose-700"><span className="mr-1">⚠️</span>{errorMsg}</div>}

            <AnimatePresence mode="wait">
              {registrationSuccess ? (
                <motion.div key="success" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 py-4 text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle className="h-7 w-7" /></div>
                  <div className="space-y-1"><h3 className="text-lg font-black">Toko berhasil dibuat</h3><p className="text-[11px] text-slate-500">Lingkungan kerja eksklusif sudah siap.</p></div>
                  <div className="space-y-1 rounded-xl border border-slate-100 bg-slate-50 p-3 text-left text-[11px]">
                    <p className="flex justify-between"><span className="text-slate-500">Toko</span><span className="font-bold text-slate-800">{registrationSuccess.tenant.name}</span></p>
                    <p className="flex justify-between"><span className="text-slate-500">Cabang</span><span className="font-bold text-slate-800">{registrationSuccess.branch.name}</span></p>
                    <p className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-bold text-slate-800">{registrationSuccess.ownerEmail}</span></p>
                  </div>
                  <button onClick={handleLaunchSimulation} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-xs font-black text-white hover:bg-accent-hover disabled:opacity-50">{loading ? "Masuk..." : <>Masuk ke dashboard <ArrowRight className="h-4 w-4" /></>}</button>
                </motion.div>
              ) : activeTab === "register" ? (
                <motion.form key="register" onSubmit={handleTenantRegistration} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-3">
                  <h3 className="text-sm font-black">Daftarkan toko baru</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Nama toko</span><input required value={shopName} onChange={(e) => handleShopNameChange(e.target.value)} placeholder="Nama Toko Anda" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" /></label>
                    <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Sektor</span><select value={businessSector} onChange={(e) => setBusinessSector(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"><option>IT & Servis Komputer</option><option>Servis Smartphone & Gadget</option><option>Servis Elektronik Umum</option><option>Bengkel Otomotif</option></select></label>
                    <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Nama pemilik</span><input required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Nama lengkap" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" /></label>
                    <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Email owner</span><input required type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="owner@toko.com" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" /></label>
                    <label className="block sm:col-span-2"><span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Password owner</span><input required type="password" minLength={6} value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} placeholder="Minimal 6 karakter" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" /></label>
                  </div>
                  <div><span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Tema warna</span><div className="flex gap-2">{themePresets.map((theme) => <button type="button" key={theme.color} onClick={() => setSelectedTheme(theme.color)} style={{ background: theme.color }} className={`h-8 w-8 rounded-xl transition ${selectedTheme === theme.color ? "ring-2 ring-slate-900 ring-offset-2" : ""}`} aria-label={theme.name} />)}</div></div>
                  <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-xs font-black text-white hover:bg-accent-hover disabled:opacity-50">{loading ? "Membuat..." : <>Buat toko <ArrowRight className="h-4 w-4" /></>}</button>
                  <p className="text-center text-[10px] font-semibold text-slate-500">Sistem menyiapkan cabang, gudang, dan akun otomatis. Data cabang tetap terpisah.</p>
                </motion.form>
              ) : (
                <motion.form key="manual" onSubmit={handleManualSubmit} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-3">
                  <h3 className="text-sm font-black">Masuk ke akun</h3>
                  <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Alamat email</span><input required type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="nama@toko.com" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" /></label>
                  <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Password</span><input required type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="••••••••" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" /></label>
                  <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-xs font-black text-white hover:bg-accent-hover disabled:opacity-50">{loading ? "Memeriksa..." : <>Masuk <ArrowRight className="h-4 w-4" /></>}</button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </main>
  );
};
