ALTER TABLE service_tickets
  ADD CONSTRAINT chk_service_tickets_status
  CHECK (status IN ('DITERIMA','ANTRIAN','DIAGNOSA','MENUGGU_APPROVAL','ESTIMATE_PENDING','APPROVAL_DITOLAK','MENUGGU_SPAREPART','SEDANG_DIKERJAKAN','DIKIRIM_KE_VENDOR','TIDAK_BISA_DIPERBAIKI','REWORK','QC','SELESAI','KLAIM_GARANSI','MENUGGU_PEMBAYARAN','SIAP_DIAMBIL','DIAMBIL','DIBATALKAN','CUSTOMER_TIDAK_MERESPON','BARANG_TIDAK_DIAMBIL','DRAFT','BOOKING','RUSAK')) NOT VALID;

ALTER TABLE service_payments
  ADD CONSTRAINT chk_service_payments_amounts
  CHECK (subtotal >= 0 AND tax_rate >= 0 AND tax_rate <= 100 AND tax_amount >= 0 AND down_payment_used >= 0 AND amount >= 0 AND tempo_days >= 0) NOT VALID;

ALTER TABLE service_payments
  ADD CONSTRAINT chk_service_payments_method
  CHECK (method IN ('CASH','BANK_TRANSFER','QRIS','EDC','E_WALLET','TEMPO')) NOT VALID;

ALTER TABLE service_payments
  ADD CONSTRAINT chk_service_payments_status
  CHECK (status IN ('PENDING','PAID','RECEIVABLE','PARTIALLY_PAID','VOID','REFUNDED')) NOT VALID;

ALTER TABLE journal_lines
  ADD CONSTRAINT chk_journal_lines_nonzero
  CHECK (debit > 0 OR credit > 0) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS uq_journal_entries_tenant_source
  ON journal_entries (tenant_id, source_type, source_id)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

CREATE OR REPLACE FUNCTION enforce_service_payment_scope()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM service_tickets st
    JOIN branches b ON b.id = NEW.branch_id AND b.tenant_id = NEW.tenant_id
    WHERE st.id = NEW.ticket_id AND st.tenant_id = NEW.tenant_id AND st.branch_id = NEW.branch_id
  ) THEN
    RAISE EXCEPTION 'service payment scope mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_service_payment_scope ON service_payments;
CREATE TRIGGER trg_service_payment_scope
BEFORE INSERT OR UPDATE OF tenant_id, branch_id, ticket_id ON service_payments
FOR EACH ROW EXECUTE FUNCTION enforce_service_payment_scope();
