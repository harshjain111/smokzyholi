
-- App config: PINs, UPI settings, payment modes
CREATE TABLE public.app_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Items (hookah pot types)
CREATE TABLE public.items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price_1_session NUMERIC NOT NULL DEFAULT 0,
  price_2_sessions NUMERIC NOT NULL DEFAULT 0,
  default_duration_mins INTEGER NOT NULL DEFAULT 45,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Timer config per event
CREATE TABLE public.timer_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  default_duration_mins INTEGER NOT NULL DEFAULT 45,
  reminder1_mins INTEGER NOT NULL DEFAULT 45,
  reminder2_mins INTEGER NOT NULL DEFAULT 55,
  escalation_mins INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_number TEXT NOT NULL,
  table_number TEXT,
  pot_number TEXT,
  item_id UUID NOT NULL REFERENCES public.items(id),
  session_count INTEGER NOT NULL CHECK (session_count IN (1, 2)),
  current_session INTEGER NOT NULL DEFAULT 0 CHECK (current_session IN (0, 1, 2)),
  price NUMERIC NOT NULL,
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('cash', 'upi')),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'session1_active', 'session1_ended', 'awaiting_session2', 'session2_active', 'session2_ended', 'closed')),
  session1_start TIMESTAMPTZ,
  session1_end TIMESTAMPTZ,
  session1_collected TIMESTAMPTZ,
  session1_delay_mins NUMERIC,
  session2_start TIMESTAMPTZ,
  session2_end TIMESTAMPTZ,
  session2_collected TIMESTAMPTZ,
  session2_delay_mins NUMERIC,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deletion log
CREATE TABLE public.deletion_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID,
  event_name TEXT,
  deleted_by TEXT NOT NULL,
  order_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timer_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deletion_log ENABLE ROW LEVEL SECURITY;

-- Since we use PIN-based auth (not Supabase auth), we use service-role via edge functions.
-- For the anon key, we allow read access to config, events, items, timer_config.
-- Writes go through edge functions with service role key.

-- App config: anon can read (for PIN validation we use edge function)
CREATE POLICY "Anyone can read app_config" ON public.app_config FOR SELECT USING (true);

-- Events: anon can read
CREATE POLICY "Anyone can read events" ON public.events FOR SELECT USING (true);

-- Items: anon can read
CREATE POLICY "Anyone can read items" ON public.items FOR SELECT USING (true);

-- Timer config: anon can read
CREATE POLICY "Anyone can read timer_config" ON public.timer_config FOR SELECT USING (true);

-- Orders: anon can read and insert (PIN validation at app level, writes via edge functions for critical ops)
CREATE POLICY "Anyone can read orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Anyone can insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update orders" ON public.orders FOR UPDATE USING (true);

-- Deletion log: anon can read
CREATE POLICY "Anyone can read deletion_log" ON public.deletion_log FOR SELECT USING (true);

-- Realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Seed default app config
INSERT INTO public.app_config (key, value) VALUES
  ('admin_pin', '"1234"'),
  ('staff_pins', '[{"pin": "0000", "name": "Staff 1"}, {"pin": "1111", "name": "Staff 2"}, {"pin": "2222", "name": "Staff 3"}]'),
  ('payment_modes', '{"cash": true, "upi": true, "upi_id": ""}');

-- Seed default items
INSERT INTO public.items (name, price_1_session, price_2_sessions, default_duration_mins) VALUES
  ('Basic Pot', 300, 500, 45),
  ('Medium Pot', 500, 800, 45),
  ('Premium Pot', 800, 1200, 45);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers
CREATE TRIGGER update_app_config_updated_at BEFORE UPDATE ON public.app_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_timer_config_updated_at BEFORE UPDATE ON public.timer_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
