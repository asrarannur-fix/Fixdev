import React, { useEffect, useState } from "react";
import { CheckCircle2, Loader2, LockKeyhole, ShieldAlert, Wrench } from "lucide-react";

interface InvitationInfo {
  email: string;
  name: string;
  role: string;
  tenantName: string;
  expiresAt: string;
}

export function InvitationAcceptance({ token, onComplete }: { token: string; onComplete: () => void }) {
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/invitations/validate?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Undangan tidak dapat divalidasi.");
        if (active) setInvitation(body.invitation);
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [token]);

  const accept = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) return setError("Password minimal 8 karakter.");
    if (password !== confirmation) return setError("Konfirmasi password tidak sama.");
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Undangan gagal diterima.");
      setCompleted(true);
      window.history.replaceState({}, "", window.location.pathname);
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  return <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100 grid place-items-center">
    <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-7 shadow-2xl" aria-live="polite">
      <div className="mb-7 flex items-center gap-3"><span className="rounded-xl bg-indigo-600 p-2"><Wrench className="h-5 w-5" /></span><div><h1 className="font-black">Undangan FixDev</h1><p className="text-xs text-slate-400">Aktivasi akses cabang secara aman</p></div></div>
      {loading ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /> Memvalidasi undangan…</div>
      : completed ? <div className="space-y-5 text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" /><div><h2 className="text-xl font-black">Akun berhasil diaktifkan</h2><p className="mt-2 text-sm text-slate-400">Gunakan email dan password baru Anda untuk masuk.</p></div><button onClick={onComplete} className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold">Buka halaman masuk</button></div>
      : error && !invitation ? <div className="space-y-5 text-center"><ShieldAlert className="mx-auto h-14 w-14 text-rose-400" /><div><h2 className="text-lg font-black">Undangan tidak tersedia</h2><p className="mt-2 text-sm text-slate-400">{error}</p></div><button onClick={onComplete} className="w-full rounded-xl bg-white/10 py-3 text-sm font-bold">Kembali</button></div>
      : invitation && <form onSubmit={accept} className="space-y-5"><div className="rounded-2xl bg-white/5 p-4 text-sm"><p className="font-bold">{invitation.name}</p><p className="text-slate-400">{invitation.email}</p><p className="mt-2 text-xs text-indigo-300">{invitation.tenantName} · {invitation.role}</p><p className="mt-1 text-[11px] text-slate-500">Berlaku hingga {new Date(invitation.expiresAt).toLocaleString("id-ID")}</p></div>{error && <p role="alert" className="rounded-xl bg-rose-500/10 p-3 text-xs text-rose-300">{error}</p>}<label className="block text-xs font-bold">Password baru<div className="relative mt-2"><LockKeyhole className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" /><input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-3 outline-none focus:border-indigo-500" /></div></label><label className="block text-xs font-bold">Ulangi password<input type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 p-3 outline-none focus:border-indigo-500" /></label><button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold disabled:opacity-50">{submitting && <Loader2 className="h-4 w-4 animate-spin" />} Aktifkan akun</button></form>}
    </section>
  </main>;
}
