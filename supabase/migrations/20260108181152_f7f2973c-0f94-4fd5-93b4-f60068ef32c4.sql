-- Add RLS policy for admin to manage products (insert/update/delete)
-- Since we don't have admin role system, we'll allow authenticated users to manage products
-- In production, you'd want to restrict this to admins only

CREATE POLICY "Authenticated users can insert products" 
ON public.products 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update products" 
ON public.products 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete products" 
ON public.products 
FOR DELETE 
TO authenticated
USING (true);