/**
 * Timeline is derived from service_status_events (single source of truth).
 * This fragment aggregates a ticket's events into the legacy `timeline`
 * array shape consumed by the API and frontend.
 */
export function timelineAggregate(alias: string): string {
  const ticketRef = alias ? `${alias}.id` : 'service_tickets.id';
  return `(SELECT COALESCE(jsonb_agg(jsonb_build_object('id', e.id, 'status', e.to_status, 'note', e.note, 'timestamp', e.created_at, 'operator', u.email) ORDER BY e.created_at ASC), '[]'::jsonb)
    FROM service_status_events e LEFT JOIN users u ON u.id = e.actor_user_id
    WHERE e.ticket_id = ${ticketRef}) AS timeline`;
}
