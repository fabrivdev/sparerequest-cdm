
-- Add salesperson and service_order_number columns to desarmes
ALTER TABLE public.desarmes ADD COLUMN salesperson text;
ALTER TABLE public.desarmes ADD COLUMN service_order_number text;
