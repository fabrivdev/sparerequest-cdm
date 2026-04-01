CREATE OR REPLACE FUNCTION public.get_distinct_brands()
RETURNS TABLE(brand text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.brand FROM public.products p ORDER BY p.brand;
$$;