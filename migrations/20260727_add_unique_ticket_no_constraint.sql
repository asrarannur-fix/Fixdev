-- Migration: Add unique constraint for ticketNo per tenant
--
-- Add unique constraint to ensure ticketNo is unique per tenant
ALTER TABLE service_tickets
ADD CONSTRAINT unique_ticket_no_per_tenant
UNIQUE (tenantId, ticketNo);

-- Add index for better performance on the unique constraint
CREATE INDEX idx_service_tickets_tenant_ticket_no ON service_tickets (tenantId, ticketNo);