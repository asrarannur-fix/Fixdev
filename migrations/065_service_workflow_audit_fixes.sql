ALTER TABLE service_receivable_payments
  DROP CONSTRAINT IF EXISTS service_receivable_payments_tenant_idempotency_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_service_receivable_payments_receivable_idempotency
  ON service_receivable_payments(tenant_id, receivable_id, idempotency_key);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_service_payment_tempo_lifecycle') THEN
    ALTER TABLE service_payments ADD CONSTRAINT chk_service_payment_tempo_lifecycle CHECK (
      (method = 'TEMPO' AND status IN ('RECEIVABLE','PARTIALLY_PAID','PAID') AND tempo_days > 0 AND due_at IS NOT NULL) OR
      (method <> 'TEMPO' AND status = 'PAID' AND tempo_days = 0 AND due_at IS NULL)
    ) NOT VALID;
  END IF;
END
$$;
