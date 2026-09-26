-- ==============================================================================
-- Assumption College Thonburi (ACT) — Smart City Database Schema for Supabase
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Settings Table (โหมดการทำงาน demo / live)
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Mode
INSERT INTO public.settings (key, value)
VALUES ('mode', 'demo')
ON CONFLICT (key) DO NOTHING;

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

-- 8. Row Level Security (RLS) Policies
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfid_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- Allow Anonymous Read & Write via Anon Key (สำหรับบอร์ด IoT & Dashboard)
CREATE POLICY "Allow public read access to settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow authenticated/anon update settings" ON public.settings FOR ALL USING (true);

CREATE POLICY "Allow public read events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Allow public insert events" ON public.events FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read command_audit" ON public.command_audit FOR SELECT USING (true);
CREATE POLICY "Allow public insert command_audit" ON public.command_audit FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public all rfid_cards" ON public.rfid_cards FOR ALL USING (true);
CREATE POLICY "Allow public all gate_logs" ON public.gate_logs FOR ALL USING (true);
CREATE POLICY "Allow public all todos" ON public.todos FOR ALL USING (true);

-- Enable Realtime for Events, RFID Cards, and Gate Logs (สำหรับ Dashboard Real-time Subscription)
ALTER PUBLICATION supabase_realtime ADD TABLE public.events, public.gate_logs, public.rfid_cards;
