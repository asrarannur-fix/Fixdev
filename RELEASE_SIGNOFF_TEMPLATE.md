# Release Sign-off Template

Template persetujuan rilis. Isi setiap kolom sebelum deploy prod.

## Info Rilis
| Field | Value |
|-------|-------|
| Version / Tag |  |
| Tanggal |  |
| Release Manager |  |
| Tujuan Rilis |  |

## Checklist Persetujuan
- [ ] `npm run validate` (lint + build) hijau di CI.
- [ ] Smoke test lokal (`test:workflow`, `test:frontend`, `test:browser`) hijau.
- [ ] `check:hardening` & `check:auth` hijau.
- [ ] Migration DB di-review & di-test di staging.
- [ ] Rollback plan siap (`INCIDENT_ROLLBACK_PLAN.md`).
- [ ] CHANGELOG / catatan rilis ditulis.

## Approvals
| Peran | Nama | Status | Tgl |
|-------|------|--------|-----|
| Owner |  | Approve / Reject |  |
| Tech Lead |  | Approve / Reject |  |
| QA |  | Approve / Reject |  |

## Catatan / Risiko
- 

## Sign-off
Dengan menandatangani, saya menyetujui rilis ini ke production sesuai checklist di atas.
