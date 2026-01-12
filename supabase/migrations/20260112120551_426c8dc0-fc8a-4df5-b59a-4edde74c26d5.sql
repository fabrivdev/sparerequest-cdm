-- Create admin_notifications table
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  brand TEXT,
  product_code TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert notifications (from edge function via service role)
CREATE POLICY "Service role can manage notifications"
ON public.admin_notifications
FOR ALL
USING (true)
WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;