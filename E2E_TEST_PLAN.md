# E2E Test Plan

Rencana pengujian end-to-end. Sumber: `playwright.config.ts`, `tests/`.

## Konfigurasi
- Runner: Playwright (`@playwright/test`), project `chromium` (Desktop Chrome).
- `baseURL: http://localhost:3000`, headless, viewport 1280×720.
- `workers: 1`, `fullyParallel: false`, retries 2 bila `CI`.
- Server harus jalan di port 3000 sebelum `npm test:browser`.

## Skenario (file di `tests/`)
| File | Cakupan |
|------|---------|
| `e2e-service-flow.spec.ts` | Alur servis end-to-end (terima → diagnosa → selesai). |
| `e2e-workflow.spec.ts` | Workflow/automasi & navigasi lintas modul. |
| `full-audit.spec.ts` | Audit menyeluruh (role, data, log). |
| `human-pos-simulation.spec.ts` | Simulasi transaksi POS gaya kasir. |
| `reception-verification.spec.ts` | Verifikasi penerimaan unit & slip. |
| `service-reception-print-template.test.ts` | Template cetak penerimaan. |
| `service-reception-validation.test.ts` | Validasi form penerimaan. |
| `service-ticket-reception.test.ts` | Pembuatan tiket servis. |
| `warranty-verification.spec.ts` | Verifikasi garansi. |

## Cara Jalankan
- `npm test:browser` (Playwright penuh).
- Per file: `npx playwright test tests/<file>.spec.ts`.
- Smoke cepat: `npm test:workflow` / `npm test:frontend`.

## Kriteria Lolos
- Semua spec hijau di Chromium.
- Tiap alur mencakup assert status akhir (ticket `SELESAI`, transaksi `POSTED`, dll).
- Trace (`on-first-retry`) tersimpan bila gagal.
