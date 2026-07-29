DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='uq_saas_invoices_id_tenant') THEN ALTER TABLE saas_invoices ADD CONSTRAINT uq_saas_invoices_id_tenant UNIQUE (id, tenant_id); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='saas_invoices_amount_positive') THEN ALTER TABLE saas_invoices ADD CONSTRAINT saas_invoices_amount_positive CHECK (amount > 0); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='saas_invoices_status_check') THEN ALTER TABLE saas_invoices ADD CONSTRAINT saas_invoices_status_check CHECK (status IN ('UNPAID','PENDING_VERIFICATION','PAID','OVERDUE')); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='saas_invoices_cycle_check') THEN ALTER TABLE saas_invoices ADD CONSTRAINT saas_invoices_cycle_check CHECK (billing_cycle IN ('monthly','yearly')); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='saas_invoices_tier_check') THEN ALTER TABLE saas_invoices ADD CONSTRAINT saas_invoices_tier_check CHECK (tier IN ('BASIC','PRO','ENTERPRISE')); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='saas_invoices_dates_check') THEN ALTER TABLE saas_invoices ADD CONSTRAINT saas_invoices_dates_check CHECK (due_date >= date); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_manual_payment_invoice_tenant') THEN ALTER TABLE manual_payment_requests ADD CONSTRAINT fk_manual_payment_invoice_tenant FOREIGN KEY (invoice_id, tenant_id) REFERENCES saas_invoices(id, tenant_id); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_billing_transaction_invoice_tenant') THEN ALTER TABLE billing_transactions ADD CONSTRAINT fk_billing_transaction_invoice_tenant FOREIGN KEY (invoice_id, tenant_id) REFERENCES saas_invoices(id, tenant_id); END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_saas_invoice_gateway_order
  ON saas_invoices(gateway_provider, gateway_order_id)
  WHERE gateway_order_id IS NOT NULL;
