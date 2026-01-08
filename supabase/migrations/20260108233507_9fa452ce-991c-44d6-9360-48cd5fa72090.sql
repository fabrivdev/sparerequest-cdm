-- Add new columns for order tracking
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_number TEXT,
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Create index for order_number lookup
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);