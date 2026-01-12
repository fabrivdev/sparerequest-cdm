-- Add shipping_method column to orders table
ALTER TABLE public.orders 
ADD COLUMN shipping_method text NOT NULL DEFAULT 'aereo';

-- Update all existing orders to 'aereo'
UPDATE public.orders SET shipping_method = 'aereo' WHERE shipping_method IS NULL OR shipping_method = '';

-- Add a check constraint to ensure only valid values
ALTER TABLE public.orders 
ADD CONSTRAINT orders_shipping_method_check CHECK (shipping_method IN ('aereo', 'maritimo'));