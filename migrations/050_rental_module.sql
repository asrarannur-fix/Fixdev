-- Rental Module Schema for FixDev ERP
-- Creates tables for device rental contracts, catalog, devices, and inventory integration

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Rental device catalog (master list of rentable device types)
CREATE TABLE IF NOT EXISTS rental_device_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'Laptop', 'Tablet', 'Projector', 'Accessories', etc.
    brand TEXT,
    model TEXT,
    serial_number_prefix TEXT, -- e.g., 'MBP', 'TPD', 'IPAD'
    rate_per_day INTEGER NOT NULL DEFAULT 0, -- in IDR (sen/rupiah)
    deposit_amount INTEGER NOT NULL DEFAULT 0, -- in IDR
    specifications JSONB DEFAULT '{}', -- CPU, RAM, Storage, etc.
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rental_catalog_tenant ON rental_device_catalog(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rental_catalog_active ON rental_device_catalog(tenant_id, is_active);

-- Individual rental device units (physical inventory)
CREATE TABLE IF NOT EXISTS rental_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    catalog_id UUID NOT NULL REFERENCES rental_device_catalog(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    serial_number TEXT NOT NULL,
    imei_or_mac TEXT, -- for tracking
    condition TEXT NOT NULL DEFAULT 'NEW', -- 'NEW', 'GOOD', 'FAIR', 'NEEDS_REPAIR'
    status TEXT NOT NULL DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'RENTED', 'MAINTENANCE', 'RETIRED', 'LOST'
    purchase_date DATE,
    purchase_cost INTEGER DEFAULT 0,
    current_location TEXT, -- 'WAREHOUSE', 'BRANCH', 'CUSTOMER', 'VENDOR'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, serial_number)
);

CREATE INDEX IF NOT EXISTS idx_rental_devices_tenant ON rental_devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rental_devices_catalog ON rental_devices(catalog_id);
CREATE INDEX IF NOT EXISTS idx_rental_devices_status ON rental_devices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_rental_devices_branch ON rental_devices(branch_id);

-- Rental contracts (the main rental transaction)
CREATE TABLE IF NOT EXISTS rental_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    contract_number TEXT NOT NULL, -- e.g., 'RNT-2026-000001'
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    device_id UUID NOT NULL REFERENCES rental_devices(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    actual_return_date DATE,
    duration_days INTEGER NOT NULL,
    rate_per_day INTEGER NOT NULL, -- snapshot from catalog at creation
    total_rent_amount INTEGER NOT NULL DEFAULT 0,
    deposit_amount INTEGER NOT NULL DEFAULT 0,
    deposit_paid INTEGER DEFAULT 0,
    deposit_refunded_amount INTEGER DEFAULT 0,
    damage_deduction_amount INTEGER DEFAULT 0,
    damage_notes TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'RETURNED', 'OVERDUE', 'CANCELLED', 'DISPUTED'
    payment_status TEXT NOT NULL DEFAULT 'PAID', -- 'PENDING', 'PAID', 'PARTIAL', 'REFUNDED'
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rental_contracts_tenant ON rental_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_customer ON rental_contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_device ON rental_contracts(device_id);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_status ON rental_contracts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_dates ON rental_contracts(start_date, end_date);
CREATE UNIQUE INDEX IF NOT EXISTS uq_rental_contracts_number ON rental_contracts(tenant_id, contract_number);

-- Rental payment records (for installment or partial payments)
CREATE TABLE IF NOT EXISTS rental_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES rental_contracts(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    payment_type TEXT NOT NULL, -- 'RENT', 'DEPOSIT', 'DAMAGE_FEE', 'LATE_FEE', 'REFUND'
    payment_method TEXT NOT NULL, -- 'CASH', 'TRANSFER', 'QRIS', 'CARD', 'EWALLET'
    reference_number TEXT,
    notes TEXT,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rental_payments_contract ON rental_payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_rental_payments_type ON rental_payments(payment_type);

-- Rental damage/inspection records
CREATE TABLE IF NOT EXISTS rental_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES rental_contracts(id) ON DELETE CASCADE,
    inspection_type TEXT NOT NULL, -- 'PRE_RENTAL', 'POST_RETURN', 'PERIODIC', 'DAMAGE_CLAIM'
    inspector_id UUID REFERENCES users(id) ON DELETE SET NULL,
    condition_before TEXT, -- 'NEW', 'GOOD', 'FAIR', 'DAMAGED'
    condition_after TEXT,
    damage_description TEXT,
    damage_photos JSONB DEFAULT '[]', -- array of photo URLs
    estimated_repair_cost INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rental_inspections_contract ON rental_inspections(contract_id);
CREATE INDEX IF NOT EXISTS idx_rental_inspections_type ON rental_inspections(inspection_type);

-- Rental contract events/history for audit trail
CREATE TABLE IF NOT EXISTS rental_contract_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES rental_contracts(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'CREATED', 'APPROVED', 'DEVICE_PICKED_UP', 'EXTENDED', 'RETURNED', 'OVERDUE', 'DAMAGE_REPORTED', 'CANCELLED'
    description TEXT,
    metadata JSONB DEFAULT '{}',
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rental_events_contract ON rental_contract_events(contract_id);
CREATE INDEX IF NOT EXISTS idx_rental_events_type ON rental_contract_events(event_type);

-- Updated triggers
DROP TRIGGER IF EXISTS update_rental_catalog_updated_at ON rental_device_catalog;
DROP TRIGGER IF EXISTS update_rental_devices_updated_at ON rental_devices;
DROP TRIGGER IF EXISTS update_rental_contracts_updated_at ON rental_contracts;
DROP TRIGGER IF EXISTS update_rental_inspections_updated_at ON rental_inspections;
CREATE TRIGGER update_rental_catalog_updated_at BEFORE UPDATE ON rental_device_catalog
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rental_devices_updated_at BEFORE UPDATE ON rental_devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rental_contracts_updated_at BEFORE UPDATE ON rental_contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rental_inspections_updated_at BEFORE UPDATE ON rental_inspections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE rental_device_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_contract_events ENABLE ROW LEVEL SECURITY;

-- Policies will be added by the superadmin migration (027_superadmin_audit_scope.sql pattern)
-- Tenant isolation: WHERE tenant_id = current_setting('app.current_tenant_id')::uuid