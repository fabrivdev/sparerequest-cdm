-- Add price_terrestre column to products table
ALTER TABLE public.products 
ADD COLUMN price_terrestre numeric NOT NULL DEFAULT 0;