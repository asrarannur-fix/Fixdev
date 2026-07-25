-- Migration: 042_service_ticket_soft_delete
-- Description: Add soft-delete support to service_tickets so bulk-delete
-- (updateServiceTicket with deletedAt) actually persists and excluded tickets
-- are hidden from the list endpoint.

ALTER TABLE service_tickets
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_service_tickets_deleted_at
  ON service_tickets (tenant_id, deleted_at);
