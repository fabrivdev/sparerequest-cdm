
-- Table to track user sessions for usage analytics
CREATE TABLE public.user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT 'Usuario',
  branch text NOT NULL DEFAULT '',
  connected_at timestamptz NOT NULL DEFAULT now(),
  disconnected_at timestamptz,
  duration_minutes integer
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Admin (service role) can do everything, regular users can insert their own
CREATE POLICY "Anyone authenticated can insert sessions" ON public.user_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone authenticated can update own sessions" ON public.user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anyone authenticated can view sessions" ON public.user_sessions
  FOR SELECT USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;
