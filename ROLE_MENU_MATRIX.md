# Role–Menu Matrix

Peta hak akses lintas role. Sumber: `src/types/index.ts` (`UserRole`), `src/components/superadmin/RolePermissionMatrix.tsx`, `src/mocks/seedData.ts`.

## Peran Platform (bukan tenant-scoped)
Peran ini **tidak** termasuk hierarki RBAC tenant — mereka berada di level SaaS/platform.
- `SUPER_ADMIN` — akses penuh lintas semua tenant; **mem-bypass** seluruh pengecekan `rbacMatrix`/`isSubTabAllowed` (`ServicesTab.tsx:432`, `Sidebar.tsx:313`, `HorizontalNavbar.tsx:295`).
- `CUSTOMER` — hanya akses portal publik via `customer_portal` (lihat `CUSTOMER_PORTAL_RULES.md`).
- `ANONYMOUS` — belum login; hanya route publik & onboarding.

> Catatan: `SUPER_ADMIN` tetap ditampilkan di tabel matriks di bawah murni untuk kelengkapan (semua kolom ✓), tapi secara konseptual dipisah dari peran tenant.

## Peran Tenant (scoped ke `tenant_id`)
`OWNER`, `ADMIN`, `MANAGER`, `KASIR`, `TEKNISI`, `SALES`, `HR`.
Hak akses dihitung dari `tenant.rbacMatrix[currentUser.role]` (`Sidebar.tsx:231`, `HorizontalNavbar.tsx:231`).

## Matriks Modul Tenant (Read Model)
Modul: **POS · Service · Inventory · Finance · Tenant · Recovery**

| Role (Tenant) | POS | Service | Inventory | Finance | Tenant | Recovery |
|------|-----|---------|-----------|---------|--------|----------|
| OWNER | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| MANAGER | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| KASIR | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| TEKNISI | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |

*(Baris `SUPER_ADMIN` = ✓ di semua kolom, tetapi termasuk peran platform — lihat atas.)*

## Permission Keys (granular)
Diambil dari seed data: `dashboard`, `accounting`, `settings`, `crm`, `pos`, `service`, `pos_entry`, `shift_control`, `customer_view`, `service_view`, `service_diagnose`, `service_repair`, `ai_assistant`, `customer_portal`.

Contoh pemetaan (seed):
- **OWNER** → `dashboard, accounting, settings, crm, pos, service`
- **TEKNISI** → `service_view, service_diagnose, service_repair` (+ `ai_assistant` untuk akun dg akses AI)
- **KASIR** → `pos_entry, shift_control, customer_view`
- **CUSTOMER** → `customer_portal`

## Aturan
- Batasan UI dihitung dari `tenant.rbacMatrix[currentUser.role]` (`Sidebar.tsx:231`, `HorizontalNavbar.tsx:231`).
- **Matriks dapat diedit** di `RBACManager` (Settings → rbac) via `EditableRbacMatrix.tsx`; perubahan disimpan ke `tenant.rbacMatrix` & langsung berlaku pada Sidebar/Navbar.
- Permission disimpan di kolom `users.permissions` (tipe `TEXT[]`) — lihat `DATABASE_SCHEMA_GUARDRAIL.md`.
- Perubahan role dan permission dari `RBACManager` menunggu respons API sebelum memperbarui state lokal serta menampilkan error otorisasi/konflik.
- Panel pengaturan aktif mengirim pembaruan per domain melalui endpoint tenant settings; setiap domain divalidasi dengan schema ketat dan tidak boleh mengubah limit milik billing.
- Nilai rahasia email, Telegram, dan WhatsApp yang kosong, disamarkan, atau tidak dikirim mempertahankan secret tersimpan melalui merge di server.
- Bootstrap tenant tidak mengirim `smtpPass`, `telegramBotToken`, `apiToken`, `webhookSecret`, atau `whatsappKey`; respons hanya menyertakan status konfigurasi.
- Route uji Telegram/WhatsApp hanya boleh dipakai `OWNER`, `ADMIN`, atau pengguna dengan izin granular `settings:notification`/`settings:whatsapp`.
- File terkait: `src/context/SaaSContext.tsx`, `src/components/RBACManager.tsx`, `src/components/TelegramBotManager.tsx`, `src/components/WhatsAppConnector.tsx`, `src/components/tenant/AppSettingsPanel.tsx`, `src/components/tenant/OperationalSettingsPanel.tsx`, `src/components/tenant/SecuritySettingsPanel.tsx`, `src/types/index.ts`.
- Pembersihan panel pengaturan menghapus 14 komponen dan wrapper duplikat yang tidak memiliki referensi: `BrandingSettingsPanel`, `BackupPanel`, `ComingSoonPanel`, `ComplaintTemplateSettings`, `DeveloperAPIPanel`, `EmailSettingsPanel`, `GeneralSettingsPanel`, `ModulesParameterPanel`, `NotificationsSettingsPanel`, `PaymentSettingsPanel`, `RBACPanel`, `StoragePanel`, `SubscriptionPanel`, dan `WorkflowsBuilderPanel`. `BranchesManagerPanel` tetap dipakai oleh `SettingsTab`.
- File terkait pembersihan: `src/components/tenant/settings/BrandingSettingsPanel.tsx`, `src/components/tenant/settings/panels/*.tsx`, `src/components/tenant/SettingsTab.tsx`.
- Dropdown dan konten Settings memakai registri kanonis `src/config/settingsConfigs.ts`; tab sensitif difilter memakai role/permission dari server, sedangkan otorisasi mutasi tetap ditegakkan middleware server.
- Pengaturan storage platform tidak tersedia pada UI tenant. `SUPER_ADMIN` tidak diarahkan ke route Settings tenant tanpa konteks tenant.
- Pencarian Settings hanya menyaring pilihan tanpa mengganti konten aktif secara implisit; kontrol navigasi mendukung fokus keyboard, target minimum 44 px, dan overflow responsif.
- Jangan hardcode role selain `SUPER_ADMIN` untuk bypass akses; gunakan matrix tenant.
