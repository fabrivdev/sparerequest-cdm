-- Eliminar políticas restrictivas actuales
DROP POLICY IF EXISTS "Users can manage their own delegates" ON public.invoice_delegates;
DROP POLICY IF EXISTS "Delegates can view their assignments" ON public.invoice_delegates;

-- Recrear política para owners (ALL operations) - PERMISSIVE
CREATE POLICY "Users can manage their own delegates"
  ON public.invoice_delegates 
  AS PERMISSIVE
  FOR ALL
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- Recrear política para delegates (SELECT only) - PERMISSIVE  
CREATE POLICY "Delegates can view their assignments"
  ON public.invoice_delegates 
  AS PERMISSIVE
  FOR SELECT
  USING (auth.uid() = delegate_user_id);