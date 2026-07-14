# Aturan AI & Pengembangan Proyek (AI Agent Rules)

Setiap AI Developer Agent (seperti **Cline, Roo Code, Aider, Cursor, Windsurf, Kilo, Copilot**, dll.) yang bekerja pada repository ini **WAJIB** membaca panduan arsitektur dan mengikuti aturan pengkodean berikut.

---

## 1. Aturan Pengkodean Mutlak (Vertical Slice)

Setiap modifikasi data atau pembuatan fitur baru harus diselesaikan sebagai satu vertical slice penuh. Jangan pernah mengimplementasikan modul setengah-setengah (backend saja atau UI saja).

### Lapisan Wajib:
- **Database / Migrations**: Idempotent SQL, indeks pencarian, constraints, foreign keys, penanganan rollback aman.
- **Backend API**: Controller terautentikasi (Supabase JWT), schema validation (Zod), isolasi tenant (`tenant_id`) & cabang (`branch_id`), row locking (`FOR UPDATE`) untuk operasi stok/kas kritis, serta audit log actor.
- **State & Context**: State frontend (`SaaSContext`, hooks) disinkronkan langsung dari response server. Hindari pembaruan stok atau uang yang bersifat optimistic di browser.
- **UX & UI**: Responsive desktop dan mobile, sticky submit bar, loading state, error boundaries, retry buttons, empty state ilustratif, disabled buttons saat proses API berjalan, dan dialog penunjang yang jelas.
- **Integrasi Pengaturan & Template Kustom**:
  Setiap modul wajib terintegrasi dengan menu Pengaturan. Tambahkan opsi konfigurasi operasional di modul Pengaturan (seperti `AppSettingsPanel` atau `OperationalSettingsPanel`), sinkronisasikan state ke database (`tenants.settings`), dan pastikan modul terkait membaca konfigurasi tersebut untuk mengatur perilakunya secara dinamis (contoh: biaya diagnosa default, SLA jam, kustomisasi template balasan pesan WhatsApp).
- **Notifikasi & Cetak**: Antrean WhatsApp (`whatsapp_queue`), link manual (`wa.me`) sebagai fallback jika API mati, dan layout cetak nota/struk kasir.
- **Keamanan & Privacy**: Jangan bocorkan PIN perangkat, token API, detail log audit internal, bukti pembayaran, atau HPP internal komponen mikro ke endpoint publik atau struk pelanggan.

---

## 2. Peta Jalan Modul & Urutan Kerja

Detail rincian berkas, file kritis, dan dependency 20 modul kerja tersimpan di:
- **`AGENTS.md`** (Acuan utama untuk Kilo/VS Code)
- **`FIXDEV_AGENT_SKILL.md`** (Daftar rincian kebutuhan modular)
- **`DATABASE_SCHEMA_GUARDRAIL.md`** (Aturan query database multi-tenant)
- **`ROLE_MENU_MATRIX.md`** (Matriks otorisasi UI & RBAC)

Selesaikan modul dengan urutan prioritas:
1. Platform, Auth & RBAC
2. Mesin Stok & Purchasing (Inventory terpadu, PO, Goods Receipt)
3. Servis & POS (Upstream & Downstream stok)
4. Keuangan & Accounting (Double-entry ledger, jurnal otomatis)
5. Karyawan & Pelanggan (HRM absensi/payroll, CRM segmen, customer portal)

---

## 3. Perintah Pengujian Keamanan & Kepatuhan
- **Type Check**: `npm run lint` (tsc --noEmit)
- **Production Build**: `npm run build`
- **Audit Hardening**: `npm run check:hardening` (Mengecek kebocoran secret, error boundaries, middleware, dll.)
- **Service Rollback Test**: `npx tsx scripts/verify-service-transaction.ts`

***

# fixdev-new

## Getting started

To make it easy for you to get started with GitLab, here's a list of recommended next steps.

Already a pro? Just edit this README.md and make it your own. Want to make it easy? [Use the template at the bottom](#editing-this-readme)!

## Add your files

* [Create](https://docs.gitlab.com/user/project/repository/web_editor/#create-a-file) or [upload](https://docs.gitlab.com/user/project/repository/web_editor/#upload-a-file) files
* [Add files using the command line](https://docs.gitlab.com/topics/git/add_files/#add-files-to-a-git-repository) or push an existing Git repository with the following command:

```
cd existing_repo
git remote add origin https://gitlab.com/asrarannur1/fixdev-new.git
git branch -M main
git push -uf origin main
```

## Integrate with your tools

* [Set up project integrations](https://gitlab.com/asrarannur1/fixdev-new/-/settings/integrations)

## Collaborate with your team

* [Invite team members and collaborators](https://docs.gitlab.com/user/project/members/)
* [Create a new merge request](https://docs.gitlab.com/user/project/merge_requests/creating_merge_requests/)
* [Automatically close issues from merge requests](https://docs.gitlab.com/user/project/issues/managing_issues/#closing-issues-automatically)
* [Enable merge request approvals](https://docs.gitlab.com/user/project/merge_requests/approvals/)
* [Set auto-merge](https://docs.gitlab.com/user/project/merge_requests/auto_merge/)

## Test and Deploy

Use the built-in continuous integration in GitLab.

* [Get started with GitLab CI/CD](https://docs.gitlab.com/ci/quick_start/)
* [Analyze your code for known vulnerabilities with Static Application Security Testing (SAST)](https://docs.gitlab.com/user/application_security/sast/)
* [Deploy to Kubernetes, Amazon EC2, or Amazon ECS using Auto Deploy](https://docs.gitlab.com/topics/autodevops/requirements/)
* [Use pull-based deployments for improved Kubernetes management](https://docs.gitlab.com/user/clusters/agent/)
* [Set up protected environments](https://docs.gitlab.com/ci/environments/protected_environments/)

***

# Editing this README

When you're ready to make this README your own, just edit this file and use the handy template below (or feel free to structure it however you want - this is just a starting point!). Thanks to [makeareadme.com](https://www.makeareadme.com/) for this template.
