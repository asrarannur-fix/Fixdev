ALTER TABLE saas_invoices
  ADD CONSTRAINT uq_saas_invoices_id_tenant UNIQUE (id, tenant_id),
  ADD CONSTRAINT saas_invoices_amount_positive CHECK (amount > 0),
  ADD CONSTRAINT saas_invoices_status_check CHECK (status IN ('UNPAID','PENDING_VERIFICATION','PAID','OVERDUE')),
  ADD CONSTRAINT saas_invoices_cycle_check CHECK (billing_cycle IN ('monthly','yearly')),
  ADD CONSTRAINT saas_invoices_tier_check CHECK (tier IN ('BASIC','PRO','ENTERPRISE')),
  ADD CONSTRAINT saas_invoices_dates_check CHECK (due_date >= date);

CREATE UNIQUE INDEX IF NOT EXISTS uq_saas_invoice_gateway_order
  ON saas_invoices(gateway_provider, gateway_order_id)
  WHERE gateway_order_id IS NOT NULL;

ALTER TABLE manual_payment_requests
  ADD CONSTRAINT fk_manual_payment_invoice_tenant
  FOREIGN KEY (invoice_id, tenant_id) REFERENCES saas_invoices(id, tenant_id);

ALTER TABLE billing_transactions
  ADD CONSTRAINT fk_billing_transaction_invoice_tenant
  FOREIGN KEY (invoice_id, tenant_id) REFERENCES saas_invoices(id, tenant_id);
