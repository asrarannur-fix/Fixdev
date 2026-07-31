-- Unify service timeline: service_status_events is the single source of truth.
-- Runs only when the legacy timeline column still exists (defensive for
-- environments where it was already dropped). All statements are transactional
-- via the migrate runner.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'service_tickets'
      AND column_name = 'timeline'
  ) THEN
    -- 1) Remove synthetic initial events from 022_backfill_service_initial_events
    --    where the ticket carries a real historical timeline to re-derive them from.
    DELETE FROM service_status_events ev
    USING service_tickets st
    WHERE ev.ticket_id = st.id
      AND ev.note = 'Unit diterima pada audit backfill.'
      AND ev.to_status = 'DITERIMA'
      AND jsonb_array_length(COALESCE(st.timeline, '[]'::jsonb)) > 0;

    -- 2) Backfill missing events from the legacy timeline column, preserving
    --    order, notes and timestamps. Dedup against existing events by
    --    (ticket_id, to_status, note) so app-written events are not duplicated.
    WITH ordered AS (
      SELECT
        st.tenant_id,
        st.id AS ticket_id,
        elem.ord,
        elem.value
      FROM service_tickets st
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(st.timeline, '[]'::jsonb))
        WITH ORDINALITY AS elem(value, ord)
    ),
    with_from AS (
      SELECT
        tenant_id,
        ticket_id,
        ord,
        value,
        CASE WHEN ord = 1 THEN NULL::text ELSE prev_value->>'status' END AS from_status
      FROM (
        SELECT o.*, LAG(value) OVER (PARTITION BY ticket_id ORDER BY ord) AS prev_value
        FROM ordered o
      ) x
    ),
    event_rows AS (
      SELECT
        gen_random_uuid() AS id,
        tenant_id,
        ticket_id,
        from_status,
        COALESCE(NULLIF(value->>'status', ''), from_status) AS to_status,
        COALESCE(value->>'note', '') AS note,
        NULL::uuid AS actor_user_id,
        jsonb_build_object('source', 'timeline_backfill') AS metadata,
        COALESCE((value->>'timestamp')::timestamptz, NOW()) AS created_at
      FROM with_from
    )
    INSERT INTO service_status_events
      (id, tenant_id, ticket_id, from_status, to_status, note, actor_user_id, metadata, created_at)
    SELECT
      r.id, r.tenant_id, r.ticket_id, r.from_status, r.to_status, r.note,
      r.actor_user_id, r.metadata, r.created_at
    FROM event_rows r
    WHERE NOT EXISTS (
      SELECT 1 FROM service_status_events ev
      WHERE ev.ticket_id = r.ticket_id
        AND ev.to_status = r.to_status
        AND ev.note = r.note
    );
  END IF;

  -- 3) Drop the legacy column; timeline is now served from service_status_events.
  ALTER TABLE service_tickets DROP COLUMN IF EXISTS timeline;
END $$;
