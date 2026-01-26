-- Create invoice_delegates table for billing delegation
CREATE TABLE public.invoice_delegates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL,
  delegate_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(owner_user_id, delegate_user_id)
);

-- Enable RLS
ALTER TABLE public.invoice_delegates ENABLE ROW LEVEL SECURITY;

-- Owner can manage their own delegates
CREATE POLICY "Users can manage their own delegates"
  ON public.invoice_delegates FOR ALL
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- Delegates can view their assignments
CREATE POLICY "Delegates can view their assignments"
  ON public.invoice_delegates FOR SELECT
  USING (auth.uid() = delegate_user_id);

-- Update orders RLS to allow viewing all orders
-- First drop the existing branch-based policy
DROP POLICY IF EXISTS "Users can view orders from their branch" ON public.orders;

-- Create new policy allowing all authenticated users to view all orders
CREATE POLICY "Authenticated users can view all orders"
  ON public.orders FOR SELECT
  USING (true);

-- Add policy for delegates to update orders they're delegated for
CREATE POLICY "Delegates can update delegated orders invoicing"
  ON public.orders FOR UPDATE
  USING (
    user_id IN (
      SELECT owner_user_id FROM public.invoice_delegates 
      WHERE delegate_user_id = auth.uid() AND is_active = true
    )
  );