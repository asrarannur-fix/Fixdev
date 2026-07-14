import { createHash, randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { Request, Response } from "express";
import { dbQuery, dbTransaction } from "../../lib/db.js";

function adminClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin configuration is unavailable.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function validateInvitation(req: Request, res: Response) {
  const token = String(req.query.token || "");
  if (token.length < 20) return res.status(422).json({ error: "Token undangan tidak valid." });
  const hash = createHash("sha256").update(token).digest("hex");
  const result = await dbQuery(`SELECT i.id,i.email,i.name,i.role,i.expires_at AS "expiresAt",t.name AS "tenantName" FROM tenant_invitations i JOIN tenants t ON t.id=i.tenant_id WHERE i.token_hash=$1 AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>now() LIMIT 1`, [hash]);
  if (!result.rows[0]) return res.status(404).json({ error: "Undangan tidak ditemukan, kedaluwarsa, atau sudah digunakan." });
  res.json({ invitation: result.rows[0] });
}

export async function acceptInvitation(req: Request, res: Response) {
  const { token, password } = req.body || {};
  if (typeof token !== "string" || token.length < 20 || typeof password !== "string" || password.length < 8) return res.status(422).json({ error: "Token dan password minimal 8 karakter wajib diisi." });
  const hash = createHash("sha256").update(token).digest("hex");
  let authUserId: string | null = null;
  try {
    const result = await dbTransaction(async (client) => {
      const locked = await client.query(`SELECT * FROM tenant_invitations WHERE token_hash=$1 FOR UPDATE`, [hash]);
      const invitation = locked.rows[0];
      if (!invitation || invitation.accepted_at || invitation.revoked_at || new Date(invitation.expires_at).getTime() <= Date.now()) return { code: 409, error: "Undangan tidak lagi aktif." };
      if (invitation.provisioning_status === "PROVISIONING" && invitation.provisioning_started_at && Date.now() - new Date(invitation.provisioning_started_at).getTime() < 10 * 60_000) return { code: 409, error: "Aktivasi undangan sedang diproses." };
      await client.query(`UPDATE tenant_invitations SET provisioning_status='PROVISIONING',provisioning_started_at=now(),provisioning_error=NULL WHERE id=$1`, [invitation.id]);
      const existing = await client.query(`SELECT id FROM users WHERE lower(email)=lower($1)`, [invitation.email]);
      if (existing.rows[0]) return { code: 409, error: "Email sudah terdaftar." };
      const created = await adminClient().auth.admin.createUser({ email: invitation.email, password, email_confirm: true });
      if (created.error || !created.data.user) throw created.error || new Error("Auth user creation failed");
      authUserId = created.data.user.id;
      const userId = randomUUID();
      const branch = await client.query(`SELECT id FROM branches WHERE tenant_id=$1 ORDER BY created_at LIMIT 1`, [invitation.tenant_id]);
      await client.query(`INSERT INTO users(id,tenant_id,email,name,role,permissions,mfa_enabled,auth_id,created_at) VALUES ($1,$2,$3,$4,$5,ARRAY['*']::text[],false,$6,now())`, [userId, invitation.tenant_id, invitation.email, invitation.name, invitation.role, authUserId]);
      if (branch.rows[0]) await client.query(`INSERT INTO user_branches(user_id,branch_id) VALUES ($1,$2)`, [userId, branch.rows[0].id]);
      await client.query(`UPDATE tenant_invitations SET accepted_at=now(),provisioning_status='COMPLETED',provisioning_error=NULL WHERE id=$1`, [invitation.id]);
      return { user: { id: userId, email: invitation.email, name: invitation.name, role: invitation.role, tenantId: invitation.tenant_id } };
    });
    if ((result as any).error) return res.status((result as any).code).json({ error: (result as any).error });
    res.status(201).json({ success: true, ...result });
  } catch (err: any) {
    if (authUserId) await adminClient().auth.admin.deleteUser(authUserId).catch(() => undefined);
    await dbQuery(
      `UPDATE tenant_invitations SET provisioning_status='FAILED',provisioning_error=$2 WHERE token_hash=$1 AND accepted_at IS NULL`,
      [hash, String(err?.message || "Provisioning failed").slice(0, 500)],
    ).catch(() => undefined);
    res.status(500).json({ error: "Undangan gagal diterima." });
  }
}
