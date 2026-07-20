import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useSaaS } from "../../context/SaaSContext";
import { readJsonResponse } from "../../utils/apiResponse";

const permissions = [
  "overview:view", "tenants:view", "tenants:manage", "billing:view", "billing:approve",
  "operations:view", "backup:manage", "audit:view", "impersonation:read_only", "permissions:manage",
];

export default function RolePermissionMatrix() {
  const { apiFetch } = useSaaS();
  const [roles, setRoles] = useState<Array<{ role: string; permissions: string[] }>>([]);
  const [error, setError] = useState("");
  const [savingRole, setSavingRole] = useState("");
  const [adminUsers, setAdminUsers] = useState<Array<{ id: string; name: string; email: string; superadminRole: string }>>([]);
  const [assigningUser, setAssigningUser] = useState("");

  const togglePermission = (role: string, permission: string) => {
    if (role === "ROOT_ADMIN") return;
    setRoles((current) => current.map((row) => row.role !== role ? row : { ...row, permissions: row.permissions.includes(permission) ? row.permissions.filter((item) => item !== permission) : [...row.permissions, permission] }));
  };

  const saveRole = async (row: { role: string; permissions: string[] }) => {
    setSavingRole(row.role);
    try {
      const response = await apiFetch(`/api/superadmin/roles/${row.role}`, { method: "PUT", body: JSON.stringify({ permissions: row.permissions }) });
      await readJsonResponse(response, "Simpan hak akses");
      setError("");
    } catch (err: any) { setError(err.message); }
    finally { setSavingRole(""); }
  };

  useEffect(() => {
    Promise.all([
      apiFetch("/api/superadmin/roles").then((response) => readJsonResponse<{ roles: Array<{ role: string; permissions: string[] }> }>(response, "Hak akses")),
      apiFetch("/api/superadmin/users").then((response) => readJsonResponse<{ users: Array<{ id: string; name: string; email: string; superadminRole: string }> }>(response, "User Super Admin")),
    ])
      .then(([roleResult, userResult]) => { setRoles(roleResult.roles); setAdminUsers(userResult.users); })
      .catch((err) => setError(err.message));
  }, [apiFetch]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900" id="sa-role-permission-matrix">
      <div className="flex items-start justify-between gap-4">
        <div><h3 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white"><ShieldCheck className="h-4 w-4 text-indigo-500" /> Hak Akses Super Admin</h3><p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Model aktual dari database. Perubahan role dilakukan melalui endpoint terproteksi dan diaudit.</p></div>
        <span className="rounded-full bg-accent-lighter px-2.5 py-1 text-xs font-bold text-accent dark:bg-indigo-950/30 dark:text-indigo-300">MODEL AKTUAL</span>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">{error}</p>}
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[800px] text-xs"><thead><tr className="border-b border-slate-200 text-slate-500 dark:border-zinc-800"><th className="p-3 text-left">Role</th>{permissions.map((permission) => <th key={permission} className="p-3 text-center font-medium">{permission}</th>)}<th className="p-3 text-center">Simpan</th></tr></thead><tbody>{roles.map((row) => <tr key={row.role} className="border-b border-slate-100 dark:border-zinc-800"><td className="p-3 font-black text-slate-800 dark:text-zinc-200">{row.role}</td>{permissions.map((permission) => { const allowed = row.permissions.includes("*") || row.permissions.includes(permission); return <td key={permission} className="p-3 text-center"><button type="button" disabled={row.role === "ROOT_ADMIN"} onClick={() => togglePermission(row.role, permission)} aria-label={`${allowed ? "Cabut" : "Beri"} ${permission} untuk ${row.role}`} className="rounded-lg p-1 disabled:cursor-not-allowed">{allowed ? <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-500" /> : <XCircle className="mx-auto h-4 w-4 text-slate-300 dark:text-zinc-700" />}</button></td>; })}<td className="p-3"><button type="button" disabled={row.role === "ROOT_ADMIN" || savingRole === row.role} onClick={() => saveRole(row)} className="rounded-lg bg-accent px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-40">{savingRole === row.role ? "Menyimpan…" : "Simpan"}</button></td></tr>)}</tbody></table></div>
      {!roles.length && !error && <p className="py-8 text-center text-sm text-slate-500">Memuat hak akses…</p>}
      <div className="mt-6 border-t border-slate-200 pt-5 dark:border-zinc-800">
        <h4 className="text-sm font-black">Penetapan Role Pengguna</h4>
        <p className="mt-1 text-xs text-slate-500">Perubahan berlaku pada request berikutnya dan dicatat di audit.</p>
        <div className="mt-3 space-y-2">{adminUsers.map((user) => <div key={user.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"><div><p className="text-xs font-bold">{user.name || user.email}</p><p className="text-[11px] text-slate-500">{user.email}</p></div><select aria-label={`Role untuk ${user.email}`} value={user.superadminRole || "SUPPORT_ADMIN"} disabled={assigningUser === user.id} onChange={async (event) => { const role = event.target.value; setAssigningUser(user.id); try { const result = await readJsonResponse<any>(await apiFetch(`/api/superadmin/users/${user.id}/role`, { method: "PUT", body: JSON.stringify({ role }) }), "Tetapkan role"); setAdminUsers((current) => current.map((item) => item.id === user.id ? { ...item, superadminRole: result.user.superadminRole } : item)); setError(""); } catch (err: any) { setError(err.message); } finally { setAssigningUser(""); } }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950">{roles.map((row) => <option key={row.role} value={row.role}>{row.role}</option>)}</select></div>)}</div>
      </div>
    </section>
  );
}
