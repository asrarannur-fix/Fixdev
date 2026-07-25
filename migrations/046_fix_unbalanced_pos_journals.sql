-- Migration: 046_fix_unbalanced_pos_journals
-- Description: Perbaiki 18 jurnal POS historis yang tidak seimbang karena baris
-- pajak (akun 20100) tidak dibukukan saat akun tersebut belum ada untuk tenant.
-- Root cause: posService men-SELECT akun 20100 tanpa ensureAccount, sehingga
-- baris pajak diskip -> jurnal POS_SALE/VOID selisih tepat = pajak (11%).
-- Fix (idempoten): pastikan akun 20100 ada per tenant, lalu untuk tiap jurnal
-- POS yang tidak seimbang, sisipkan 1 baris penyeimbang ke akun 20100.
-- Dijalankan dalam DO block agar aman diulang (idempoten: cek sebelum insert).

DO $$
DECLARE
  r RECORD;
  v_tenant UUID;
  v_tax_acct UUID;
  v_diff NUMERIC;
  v_lines INT;
BEGIN
  -- Untuk setiap tenant yang punya jurnal POS tidak seimbang
  FOR v_tenant IN
    SELECT DISTINCT je.tenant_id
    FROM journal_entries je
    JOIN journal_lines jl ON jl.journal_entry_id = je.id
    WHERE je.source_type IN ('POS_SALE','POS_VOID')
    GROUP BY je.tenant_id, je.id
    HAVING ABS(SUM(jl.debit) - SUM(jl.credit)) > 0.01
  LOOP
    -- Pastikan akun pajak 20100 ada
    SELECT id INTO v_tax_acct
    FROM coa_accounts WHERE tenant_id = v_tenant AND code = '20100' LIMIT 1;
    IF v_tax_acct IS NULL THEN
      INSERT INTO coa_accounts (id, tenant_id, code, name, type, balance, is_group)
      VALUES (gen_random_uuid(), v_tenant, '20100', 'Pajak Pertambahan Nilai (PPN)', 'LIABILITY', 0, FALSE)
      RETURNING id INTO v_tax_acct;
    END IF;

    -- Untuk tiap jurnal POS tidak seimbang di tenant ini, sisipkan baris penyeimbang
    FOR r IN
      SELECT je.id AS je_id,
             SUM(jl.debit) AS d,
             SUM(jl.credit) AS c,
             COUNT(jl.id) AS lc
      FROM journal_entries je
      JOIN journal_lines jl ON jl.journal_entry_id = je.id
      WHERE je.tenant_id = v_tenant
        AND je.source_type IN ('POS_SALE','POS_VOID')
      GROUP BY je.id
      HAVING ABS(SUM(jl.debit) - SUM(jl.credit)) > 0.01
    LOOP
      v_diff := r.d - r.c; -- positif => kurang kredit (tambah kredit pajak); negatif => kurang debit
      -- Cegah insert ganda: skip jika sudah ada baris penyeimbang pajak yg persis
      SELECT COUNT(*) INTO v_lines
      FROM journal_lines
      WHERE journal_entry_id = r.je_id AND account_id = v_tax_acct
        AND (ABS(debit - GREATEST(0, -v_diff)) < 0.01 OR ABS(credit - GREATEST(0, v_diff)) < 0.01);
      IF v_lines = 0 THEN
        INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit, description)
        VALUES (
          gen_random_uuid(),
          r.je_id,
          v_tax_acct,
          GREATEST(0, -v_diff),  -- POS_VOID kelebihan kredit -> butuh debit pajak
          GREATEST(0, v_diff),   -- POS_SALE kelebihan debit -> butuh kredit pajak
          'Koreksi pajak (migrasi 046)'
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;
