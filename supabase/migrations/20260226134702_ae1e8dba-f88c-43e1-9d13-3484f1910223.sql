
-- Sequence for desarme numbers
CREATE SEQUENCE public.desarme_number_seq START 1;

-- Main desarmes table
CREATE TABLE public.desarmes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  desarme_number text NOT NULL DEFAULT 'DES-' || lpad(nextval('public.desarme_number_seq')::text, 4, '0'),
  created_by uuid NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  serial_number text NOT NULL,
  client_name text NOT NULL,
  branch text NOT NULL,
  product_code text NOT NULL,
  product_name text,
  quantity integer NOT NULL DEFAULT 1,
  reason text NOT NULL,
  is_urgent boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pendiente_cotizacion',
  quoted_value numeric,
  quoted_deadline text,
  quoted_shipping_method text,
  quote_observations text,
  quoted_by uuid,
  quoted_at timestamptz,
  authorized_by uuid,
  authorized_at timestamptz,
  rejection_reason text,
  linked_order_id uuid,
  reassembled_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.desarmes ENABLE ROW LEVEL SECURITY;

-- RLS Policies using has_permission function
CREATE POLICY "Users with ver_desarmes can view"
ON public.desarmes FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'ver_desarmes'));

CREATE POLICY "Users with crear_desarme can insert"
ON public.desarmes FOR INSERT TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'crear_desarme'));

CREATE POLICY "Authenticated users can update desarmes"
ON public.desarmes FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Service role full access desarmes"
ON public.desarmes FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Update trigger
CREATE TRIGGER update_desarmes_updated_at
BEFORE UPDATE ON public.desarmes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.desarmes;

-- Status log table
CREATE TABLE public.desarme_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  desarme_id uuid NOT NULL REFERENCES public.desarmes(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid NOT NULL,
  changed_by_name text NOT NULL,
  observation text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.desarme_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view desarme logs"
ON public.desarme_status_log FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Service role manage desarme logs"
ON public.desarme_status_log FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Trigger: auto-update desarme to 'recibido' when linked order is delivered
CREATE OR REPLACE FUNCTION public.auto_update_desarme_on_order_delivered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'entregado' AND (OLD.status IS DISTINCT FROM 'entregado') THEN
    UPDATE public.desarmes
    SET status = 'recibido', updated_at = now()
    WHERE linked_order_id = NEW.id
      AND status IN ('pedido_generado', 'confirmado', 'en_transito');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_desarme_on_order_delivered
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.auto_update_desarme_on_order_delivered();
