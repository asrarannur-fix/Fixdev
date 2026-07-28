-- Migration: Add foreign key to service_status_events
--
-- Add foreign key to ensure service_status_events references service_tickets
ALTER TABLE service_status_events
ADD CONSTRAINT fk_service_ticket
FOREIGN KEY (serviceTicketId) REFERENCES service_tickets(id);