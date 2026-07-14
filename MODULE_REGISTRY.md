# Module Registry

Daftar modul dan sub-tab FIXDEV. Sumber: `src/config/nav.config.ts`.

## Modul Operasional (Sidebar & Navbar)
| Modul | ID | Sub-tab |
|-------|----|---------|
| Dashboard | `overview` | overview |
| Servis | `services` | new-ticket, list, knowledge-base, cost-calculator, qc-scoring, warranty-claims, field-service, rental, qr-tracker |
| POS | `pos` | cashier, shifts, history, marketplace-hub |
| Inventory | `inventory` | stock, stock-transfer, storage-locations, trade-in, cannibal, small-parts, asset-manager, consignment, purchase-order |
| Keuangan | `accounting` | coa, ledger, statements |
| HR | `hr` | attendance, payroll, commission, kasbon |
| CRM | `crm` | pipeline, customers, marketing |
| Keamanan | `fraud` | audit-log, fraud-alert |

## Modul Settings (dropdown profil)
`branding`, `branches`, `whatsapp`, `telegram`, `notifications`, `workflows`, `rbac`, `modules-config`, `printer-terms`, `developer-api`, `subscription`, `import-export`, `loyalty`, `maintenance-contract`.

## Catatan
- `getModuleById(id)` mengembalikan modul operasional berdasarkan `id`.
- Setiap modul di-**lazy load** via `React.lazy()` di `TenantDashboard.tsx` (lihat `PERFORMANCE_SCALABILITY_RULES.md`).
- Fitur per modul dibatasi oleh `tier` tenant (`isSubTabAllowed` di `ServicesTab.tsx`).
