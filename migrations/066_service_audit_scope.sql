ALTER TABLE service_tickets ALTER COLUMN storage_location_id TYPE TEXT USING storage_location_id::text;

ALTER TABLE service_tickets DROP CONSTRAINT IF EXISTS chk_service_tickets_status;
ALTER TABLE service_tickets ADD CONSTRAINT chk_service_tickets_status CHECK (status IN ('DITERIMA','ANTRIAN','DIAGNOSA','MENUGGU_APPROVAL','ESTIMATE_PENDING','APPROVAL_DITOLAK','MENUGGU_SPAREPART','MENUGGU_PART_ORDER','SEDANG_DIKERJAKAN','DIKIRIM_KE_VENDOR','TIDAK_BISA_DIPERBAIKI','REWORK','QC','SELESAI','KLAIM_GARANSI','MENUGGU_PEMBAYARAN','SIAP_DIAMBIL','DIAMBIL','DIBATALKAN','CUSTOMER_TIDAK_MERESPON','BARANG_TIDAK_DIAMBIL','DRAFT','BOOKING','RUSAK')) NOT VALID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_service_ticket_photo_scope') THEN
    ALTER TABLE service_tickets ADD CONSTRAINT chk_service_ticket_photo_scope CHECK (
      jsonb_typeof(initial_photos) = 'array' AND jsonb_typeof(qc_photos) = 'array'
    ) NOT VALID;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION prevent_terminal_service_ticket_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('DIAMBIL','DIBATALKAN','TIDAK_BISA_DIPERBAIKI','CUSTOMER_TIDAK_MERESPON','BARANG_TIDAK_DIAMBIL','RUSAK') AND (
    NEW.status IS DISTINCT FROM OLD.status OR
    NEW.handover_at IS DISTINCT FROM OLD.handover_at OR
    NEW.initial_checklist IS DISTINCT FROM OLD.initial_checklist OR
    NEW.initial_photos IS DISTINCT FROM OLD.initial_photos OR
    NEW.qc_checklist IS DISTINCT FROM OLD.qc_checklist OR
    NEW.qc_photos IS DISTINCT FROM OLD.qc_photos OR
    NEW.tech_pre_checklist IS DISTINCT FROM OLD.tech_pre_checklist OR
    NEW.tech_post_checklist IS DISTINCT FROM OLD.tech_post_checklist OR
    NEW.repair_start_time IS DISTINCT FROM OLD.repair_start_time OR
    NEW.repair_end_time IS DISTINCT FROM OLD.repair_end_time OR
    NEW.storage_location_id IS DISTINCT FROM OLD.storage_location_id
  ) THEN
    RAISE EXCEPTION 'terminal service ticket metadata is immutable';
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_terminal_service_ticket_mutation ON service_tickets;
CREATE TRIGGER trg_terminal_service_ticket_mutation
BEFORE UPDATE ON service_tickets
FOR EACH ROW EXECUTE FUNCTION prevent_terminal_service_ticket_mutation();
