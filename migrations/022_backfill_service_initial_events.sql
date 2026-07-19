-- Restore initial DITERIMA timeline events for tickets created before reception event logging.
BEGIN;

INSERT INTO service_status_events (id, tenant_id, ticket_id, from_status, to_status, note, actor_user_id, metadata, created_at)
SELECT gen_random_uuid(), st.tenant_id, st.id, NULL, 'DITERIMA',
       'Unit diterima pada audit backfill.', NULL, '{}'::jsonb, COALESCE(st.created_at, NOW())
FROM service_tickets st
WHERE NOT EXISTS (
  SELECT 1 FROM service_status_events ev
  WHERE ev.ticket_id=st.id AND ev.to_status='DITERIMA'
);

COMMIT;
