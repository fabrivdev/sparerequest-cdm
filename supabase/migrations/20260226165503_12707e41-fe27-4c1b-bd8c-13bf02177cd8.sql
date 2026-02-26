
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active announcements"
ON public.announcements FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Service role can manage announcements"
ON public.announcements FOR ALL
USING (true)
WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
