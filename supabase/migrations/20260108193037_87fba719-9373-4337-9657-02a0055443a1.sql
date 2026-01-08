-- Add unique constraint on code for upsert support
ALTER TABLE public.products ADD CONSTRAINT products_code_unique UNIQUE (code);

-- Add index for faster case-insensitive searches
CREATE INDEX idx_products_code_lower ON public.products (LOWER(code));

-- Add index on brand for future filtering
CREATE INDEX idx_products_brand ON public.products (brand);