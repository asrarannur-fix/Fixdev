-- Complaint Templates Database Migration
-- SPDX-License-Identifier: Apache-2.0

-- 1. Main complaint_templates table
CREATE TABLE IF NOT EXISTS complaint_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    category TEXT DEFAULT 'hardware',
    device_type TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Index for faster queries
CREATE INDEX IF NOT EXISTS idx_complaint_templates_tenant ON complaint_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_complaint_templates_category ON complaint_templates(category);
CREATE INDEX IF NOT EXISTS idx_complaint_templates_active ON complaint_templates(is_active) WHERE is_active = TRUE;

-- 3. Insert default templates (only if table is empty)
INSERT INTO complaint_templates (tenant_id, label, value, category, device_type, is_active, is_default)
SELECT 
    t.id,
    template.label,
    template.value,
    template.category,
    template.device_type,
    template.is_active,
    template.is_default
FROM tenants t
CROSS JOIN LATERAL (
    VALUES
    -- Smartphone
    ('Layar / Touchscreen', 'Layar retak/touchscreen tidak responsif. Sentuhan tidak berfungsi atau area layar tidak bisa disentuh.', 'hardware', ARRAY['smartphone', 'tablet'], true, true),
    ('Baterai / Charging', 'Baterai lemah/cepat habis. Tidak bisa di-charge atau charging lambat.', 'hardware', ARRAY['smartphone', 'tablet'], true, true),
    ('Kamera / Lens', 'Kamera kabur/tidak bisa focus. Hasil foto buram atau tidak bisa mengambil foto.', 'hardware', ARRAY['smartphone', 'tablet'], true, true),
    ('Software / Sistem', 'iPhone stuck di logo/Hang/Crash aplikasi. Sistem operasi macet atau bootloop.', 'software', ARRAY['smartphone', 'tablet'], true, true),
    ('Port / Konektor', 'Port charging kotor/lemah/tidak bisa charge. Jack audio tidak terdeteksi.', 'hardware', ARRAY['smartphone', 'tablet'], true, true),
    ('Bodi / Casing', 'Bodi penyok/lecet. Casing terdistorsi, tombol macet.', 'hardware', ARRAY['smartphone', 'tablet'], true, true),
    -- Laptop
    ('Layar / Display', 'Layar laptop mati/retak/vertical line. Backlight tidak menyala atau gambar buffering.', 'hardware', ARRAY['laptop'], true, true),
    ('Keyboard / Input', 'Keyboard tidak bisa diketik/tombol macet. Touchpad tidak responsif atau klik tidak berfungsi.', 'hardware', ARRAY['laptop'], true, true),
    ('Baterai / Power', 'Baterai laptop tidak bisa di-charge/cepat habis. Adapter tidak terdeteksi atau laptop mati total.', 'hardware', ARRAY['laptop'], true, true),
    ('Software / OS', 'Windows/Laptop hang/blue screen/slow boot. Virus/malware atau sistem operasi corrupt.', 'software', ARRAY['laptop'], true, true),
    ('Upgrade / Sparepart', 'Upgrade RAM/SSD/HDD. Pergantian komponen internal untuk meningkatkan performa.', 'repair', ARRAY['laptop'], true, true),
    ('Fan / Overheat', 'Kipas berputar keras/laptop panas berlebih. Thermal throttling atau shutdown karena suhu tinggi.', 'hardware', ARRAY['laptop'], true, true),
    -- Printer
    ('Kertas / Paper Jam', 'Paper jam/kertas macet. Tidak bisa masuk kertas atau output tidak keluar.', 'hardware', ARRAY['printer'], true, true),
    ('Tinta / Toner', 'Tinta habis/printfuzzy. Head clogged atau warna tidak keluar sempurna.', 'hardware', ARRAY['printer'], true, true),
    ('Driver / Software', 'Printer tidak terdeteksi di komputer. Driver error atau koneksi USB/WiFi gagal.', 'software', ARRAY['printer'], true, true),
    ('Roller / Pickup', 'Roller pickup rusak/macet. Kertas tidak masuk atau lebih dari 1 sheet.', 'hardware', ARRAY['printer'], true, true),
    -- Audio
    ('Speaker / Sound', 'Speaker tidak ada suara/suara pecah. Bluetooth tidak connect atau bass tidak keluar.', 'hardware', ARRAY['audio'], true, true),
    ('Baterai / Charging', 'Baterai headphone/earphone cepat habis. Case charging tidak bisa nyalakan.', 'hardware', ARRAY['audio'], true, true),
    ('Tombol / Controls', 'Tombol play/pause/volume macet. Touch controls tidak responsif.', 'hardware', ARRAY['audio'], true, true),
    -- General
    ('Kerusakan Umum', 'Device tidak bisa menyalai/tidak berfungsi sama sekali. Diperiksa teknisi untuk diagnosa lebih lanjut.', 'hardware', ARRAY['smartphone', 'tablet', 'laptop', 'desktop', 'printer', 'audio', 'smartwatch', 'lainnya'], true, true),
    ('Cek & Diagnose', 'Pemeriksaan umum untuk mengetahui kerusakan. Tanpa perbaikan, hanya diagnostik.', 'repair', ARRAY['smartphone', 'tablet', 'laptop', 'desktop', 'printer', 'audio', 'smartwatch', 'lainnya'], true, true)
) AS template(label, value, category, device_type, is_active, is_default)
WHERE NOT EXISTS (
    SELECT 1 FROM complaint_templates ct 
    WHERE ct.tenant_id = t.id AND ct.is_default = true
);

-- 4. Add updated_at trigger
CREATE OR REPLACE FUNCTION update_complaint_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS complaint_templates_updated_at ON complaint_templates;
CREATE TRIGGER complaint_templates_updated_at
    BEFORE UPDATE ON complaint_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_complaint_templates_updated_at();

-- 5. RLS (Row Level Security) - if using Supabase
ALTER TABLE complaint_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their own templates" ON complaint_templates
    FOR SELECT USING (tenant_id = auth.uid() OR tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can insert their own templates" ON complaint_templates
    FOR INSERT WITH CHECK (tenant_id = auth.uid() OR tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can update their own templates" ON complaint_templates
    FOR UPDATE USING (tenant_id = auth.uid() OR tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can delete their own templates" ON complaint_templates
    FOR DELETE USING (tenant_id = auth.uid() OR tenant_id = current_setting('app.current_tenant_id', true)::uuid);