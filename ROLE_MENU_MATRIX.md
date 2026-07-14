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
- Jangan hardcode role selain `SUPER_ADMIN` untuk bypass akses; gunakan matrix tenant.
