-- ==============================================================================
-- Assumption College Thonburi (ACT) — Smart City Database Schema for Supabase
-- ระบบฐานข้อมูลรวม Smart City สำหรับทั้ง 5 บอร์ด และ Next.js Dashboard
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Settings Table (โหมดการทำงาน demo / live และการตั้งค่า Wi-Fi กลาง)
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Settings
INSERT INTO public.settings (key, value) VALUES 
('mode', 'live'),
('wifi_ssid', 'ACT-SmartCity-2.4G'),
('wifi_pass', 'ACT12345678')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- 3. Telemetry Events Table (เก็บประวัติข้อมูลเซนเซอร์จากบอร์ดทั้ง 5 ระบบ)
CREATE TABLE IF NOT EXISTS public.events (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'live',
    system TEXT NOT NULL CHECK (system IN ('parking', 'traffic', 'streetlight', 'gate', 'environment')),
    device_id TEXT NOT NULL,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    health TEXT NOT NULL DEFAULT 'normal' CHECK (health IN ('normal', 'warning', 'offline')),
    note TEXT,
    data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    position_json JSONB
);

-- Indices for ultra-fast query performance
CREATE INDEX IF NOT EXISTS idx_events_lookup ON public.events (source, system, device_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_events_history ON public.events (system, source, id DESC);
CREATE INDEX IF NOT EXISTS idx_events_latest ON public.events (source, device_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_events_recorded_at ON public.events (recorded_at DESC);

-- 4. Command Audit Log Table (บันทึกประวัติการส่งคำสั่งควบคุมอุปกรณ์)
CREATE TABLE IF NOT EXISTS public.command_audit (
    id BIGSERIAL PRIMARY KEY,
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor TEXT NOT NULL,
    system TEXT NOT NULL,
    device_id TEXT NOT NULL,
    command TEXT NOT NULL,
    reason TEXT NOT NULL,
    result TEXT NOT NULL,
    detail TEXT
);

CREATE INDEX IF NOT EXISTS idx_command_audit_time ON public.command_audit (time DESC);

-- 5. RFID Cards Table (ย้ายจาก Google Sheets Database มาไว้บน Supabase Cloud)
CREATE TABLE IF NOT EXISTS public.rfid_cards (
    card_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Student',
    status TEXT NOT NULL DEFAULT 'allow' CHECK (status IN ('allow', 'banned')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- เพิ่มข้อมูลบัตรเริ่มต้นสำหรับทดสอบ (สามารถเพิ่มหรือแก้ไข UID บัตรจริงได้)
INSERT INTO public.rfid_cards (card_id, name, role, status) VALUES 
('4A6F12C3', 'นายสมชาย ใจดี', 'Student', 'allow'),
('B3459812', 'นางสาวกนกวรรณ เพียรธรรม', 'Teacher', 'allow'),
('E19033FA', 'นายอนันต์ มั่นคง', 'Staff', 'allow'),
('99AA88BB', 'บัตรระงับการใช้งาน', 'Guest', 'banned')
ON CONFLICT (card_id) DO UPDATE SET 
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    status = EXCLUDED.status;

-- 6. Gate Access Logs Table (ย้ายจาก Google Sheets Logs มาไว้บน Supabase Cloud)
CREATE TABLE IF NOT EXISTS public.gate_logs (
    id BIGSERIAL PRIMARY KEY,
    card_id TEXT NOT NULL,
    name TEXT,
    role TEXT,
    status TEXT NOT NULL, -- 'allow', 'banned', 'not_found'
    action TEXT NOT NULL DEFAULT 'IN', -- 'IN', 'OUT', 'DENIED'
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gate_logs_scanned_at ON public.gate_logs (scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_gate_logs_card_id ON public.gate_logs (card_id);

-- 7. Todos Table (สำหรับทดสอบเชื่อมต่อ SSR)
CREATE TABLE IF NOT EXISTS public.todos (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.todos (name) VALUES 
('Setup Smart City Telemetry Sync'),
('Deploy Board 1-5 to Campus Ground'),
('Verify Supabase Real-time Stream')
ON CONFLICT DO NOTHING;

-- 8. Seed Initial Live Events for All 5 Systems
INSERT INTO public.events (source, system, device_id, name, location, recorded_at, health, note, data_json, position_json) VALUES
('live', 'traffic', 'TR-1', 'สี่แยกกลางอัสสัมชัญ (Central 4-Way Junction)', 'สี่แยกสายหลัก อาคารเรียน A', NOW(), 'normal', 'ระบบไฟจราจร 4 ทิศทางพร้อมทำงาน', '{"signal": "green", "nSignal": "green", "eSignal": "red", "sSignal": "red", "wSignal": "red", "activeDirection": "North (เหนือ)", "waitSeconds": 4, "mode": "adaptive"}'::jsonb, '{"lat": 13.7558, "lng": 100.5024}'::jsonb),
('live', 'parking', 'PK-01', 'ช่องจอด 01', 'อาคาร A', NOW(), 'normal', 'ระบบพร้อมทำงาน', '{"occupied": true, "bay": "A-01"}'::jsonb, '{"lat": 13.7569, "lng": 100.5015}'::jsonb),
('live', 'streetlight', 'SL-01', 'ไฟถนนอัจฉริยะ 01', 'ถนนสายหลัก', NOW(), 'normal', 'ระบบไฟถนนพร้อมทำงาน', '{"on": false, "brightness": 0, "mode": "auto", "fault": null}'::jsonb, '{"lat": 13.7562, "lng": 100.5035}'::jsonb),
('live', 'gate', 'GT-01', 'ประตูทิศเหนือ RFID', 'ทางเข้าหลัก อาคาร A', NOW(), 'normal', 'ระบบพร้อมสแกนบัตร', '{"open": false, "direction": null, "access": null, "cardRef": null}'::jsonb, '{"lat": 13.7574, "lng": 100.5029}'::jsonb),
('live', 'environment', 'EN-01', 'สถานีสิ่งแวดล้อมกลาง', 'ใจกลางวิทยาเขต', NOW(), 'normal', 'สถานะอากาศปกติ', '{"pm25": 24, "temperature": 29.8, "humidity": 65}'::jsonb, '{"lat": 13.7551, "lng": 100.5014}'::jsonb)
ON CONFLICT DO NOTHING;

-- 9. Row Level Security (RLS) Policies
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfid_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- Allow Anonymous Read & Write via Anon Key (สำหรับบอร์ด IoT & Dashboard)
DROP POLICY IF EXISTS "Allow public read access to settings" ON public.settings;
DROP POLICY IF EXISTS "Allow authenticated/anon update settings" ON public.settings;
CREATE POLICY "Allow public read access to settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow authenticated/anon update settings" ON public.settings FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read events" ON public.events;
DROP POLICY IF EXISTS "Allow public insert events" ON public.events;
CREATE POLICY "Allow public read events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Allow public insert events" ON public.events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read command_audit" ON public.command_audit;
DROP POLICY IF EXISTS "Allow public insert command_audit" ON public.command_audit;
CREATE POLICY "Allow public read command_audit" ON public.command_audit FOR SELECT USING (true);
CREATE POLICY "Allow public insert command_audit" ON public.command_audit FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all rfid_cards" ON public.rfid_cards;
DROP POLICY IF EXISTS "Allow public all gate_logs" ON public.gate_logs;
DROP POLICY IF EXISTS "Allow public all todos" ON public.todos;
CREATE POLICY "Allow public all rfid_cards" ON public.rfid_cards FOR ALL USING (true);
CREATE POLICY "Allow public all gate_logs" ON public.gate_logs FOR ALL USING (true);
CREATE POLICY "Allow public all todos" ON public.todos FOR ALL USING (true);

-- 10. Enable Realtime for Events, RFID Cards, Gate Logs, and Settings (แบบ Safe Re-run)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_rel pr
        JOIN pg_publication p ON p.oid = pr.prpubid
        JOIN pg_class c ON c.oid = pr.prrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE p.pubname = 'supabase_realtime' AND n.nspname = 'public' AND c.relname = 'events'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_rel pr
        JOIN pg_publication p ON p.oid = pr.prpubid
        JOIN pg_class c ON c.oid = pr.prrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE p.pubname = 'supabase_realtime' AND n.nspname = 'public' AND c.relname = 'gate_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.gate_logs;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_rel pr
        JOIN pg_publication p ON p.oid = pr.prpubid
        JOIN pg_class c ON c.oid = pr.prrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE p.pubname = 'supabase_realtime' AND n.nspname = 'public' AND c.relname = 'rfid_cards'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.rfid_cards;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_rel pr
        JOIN pg_publication p ON p.oid = pr.prpubid
        JOIN pg_class c ON c.oid = pr.prrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE p.pubname = 'supabase_realtime' AND n.nspname = 'public' AND c.relname = 'settings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
    END IF;
END $$;
