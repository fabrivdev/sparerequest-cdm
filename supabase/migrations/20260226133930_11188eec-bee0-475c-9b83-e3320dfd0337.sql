
-- Table for user permissions
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  permission text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- All authenticated can read (needed for UI permission checks)
CREATE POLICY "Authenticated users can view permissions"
ON public.user_permissions
FOR SELECT
TO authenticated
USING (true);

-- Only service role can modify (admin edge function uses service role)
CREATE POLICY "Service role can manage permissions"
ON public.user_permissions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Security definer function to check permissions (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_permissions
    WHERE user_id = _user_id
      AND permission = _permission
  )
$$;
