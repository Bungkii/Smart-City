-- Apply to an existing Supabase project after configuring the server-only
-- SUPABASE_SERVICE_ROLE_KEY and RFID_ADMIN_TOKEN. Preserves all card and log rows.
BEGIN;

ALTER TABLE public.rfid_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all rfid_cards" ON public.rfid_cards;
DROP POLICY IF EXISTS "Allow public all gate_logs" ON public.gate_logs;
DROP POLICY IF EXISTS "Device read rfid_cards" ON public.rfid_cards;
DROP POLICY IF EXISTS "Device insert gate_logs" ON public.gate_logs;

REVOKE ALL ON TABLE public.rfid_cards FROM anon, authenticated;
REVOKE ALL ON TABLE public.gate_logs FROM anon, authenticated;
GRANT SELECT ON TABLE public.rfid_cards TO anon, authenticated;
GRANT INSERT ON TABLE public.gate_logs TO anon, authenticated;
GRANT USAGE ON SEQUENCE public.gate_logs_id_seq TO anon, authenticated;

-- Board 1 still verifies cards directly through the Supabase publishable key.
CREATE POLICY "Device read rfid_cards" ON public.rfid_cards
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Device insert gate_logs" ON public.gate_logs
  FOR INSERT TO anon, authenticated WITH CHECK (true);

COMMIT;
