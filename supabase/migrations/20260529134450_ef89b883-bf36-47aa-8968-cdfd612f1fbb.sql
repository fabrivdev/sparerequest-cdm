
-- 1) Table
CREATE TABLE public.desarme_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  desarme_id UUID NOT NULL REFERENCES public.desarmes(id) ON DELETE CASCADE,
  product_code TEXT NOT NULL,
  product_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  linked_order_id UUID,
  received_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_desarme_items_desarme_id ON public.desarme_items(desarme_id);
CREATE INDEX idx_desarme_items_linked_order_id ON public.desarme_items(linked_order_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.desarme_items TO authenticated;
GRANT ALL ON public.desarme_items TO service_role;

ALTER TABLE public.desarme_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view desarme items"
  ON public.desarme_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role manage desarme items"
  ON public.desarme_items FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can insert desarme items"
  ON public.desarme_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update desarme items"
  ON public.desarme_items FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Creators can delete their desarme items"
  ON public.desarme_items FOR DELETE TO authenticated
  USING (desarme_id IN (SELECT id FROM public.desarmes WHERE created_by = auth.uid()));

CREATE TRIGGER update_desarme_items_updated_at
  BEFORE UPDATE ON public.desarme_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Orders link to item
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS desarme_item_id UUID;
CREATE INDEX IF NOT EXISTS idx_orders_desarme_item_id ON public.orders(desarme_item_id);

-- 3) Backfill: one item per existing desarme
INSERT INTO public.desarme_items (desarme_id, product_code, product_name, quantity, linked_order_id, received_at)
SELECT d.id, d.product_code, d.product_name, COALESCE(d.quantity, 1), d.linked_order_id,
       CASE WHEN d.status IN ('recibido','maquina_rearmada','cerrado') THEN COALESCE(d.updated_at, now()) ELSE NULL END
FROM public.desarmes d
WHERE NOT EXISTS (SELECT 1 FROM public.desarme_items i WHERE i.desarme_id = d.id);

-- Backfill orders.desarme_item_id from existing linked_order_id
UPDATE public.orders o
SET desarme_item_id = i.id
FROM public.desarme_items i
WHERE i.linked_order_id = o.id AND o.desarme_item_id IS NULL;

-- 4) Updated trigger function
CREATE OR REPLACE FUNCTION public.auto_update_desarme_on_order_delivered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_item RECORD;
  v_desarme RECORD;
  v_pending INTEGER;
BEGIN
  IF NEW.status = 'entregado' AND (OLD.status IS DISTINCT FROM 'entregado') THEN
    -- Find the item linked to this order (new path)
    SELECT * INTO v_item FROM public.desarme_items
      WHERE (id = NEW.desarme_item_id OR linked_order_id = NEW.id)
      LIMIT 1;

    IF v_item.id IS NOT NULL THEN
      -- Mark item received
      IF v_item.received_at IS NULL THEN
        UPDATE public.desarme_items SET received_at = now(), updated_at = now() WHERE id = v_item.id;
      END IF;

      SELECT * INTO v_desarme FROM public.desarmes WHERE id = v_item.desarme_id;

      IF v_desarme.id IS NOT NULL AND v_desarme.status = 'pedido_generado' THEN
        SELECT COUNT(*) INTO v_pending FROM public.desarme_items
          WHERE desarme_id = v_desarme.id AND received_at IS NULL AND id <> v_item.id;

        IF v_pending = 0 THEN
          UPDATE public.desarmes SET status = 'recibido', updated_at = now() WHERE id = v_desarme.id;
          INSERT INTO public.desarme_status_log (desarme_id, from_status, to_status, changed_by, changed_by_name, observation)
          VALUES (v_desarme.id, v_desarme.status, 'recibido', v_desarme.created_by, 'Sistema', 'Todos los repuestos fueron recibidos');
          INSERT INTO public.user_notifications (user_id, type, title, message, metadata)
          VALUES (
            v_desarme.created_by, 'desarme_recibido', 'Repuestos recibidos',
            'Todos los repuestos del desarme ' || v_desarme.desarme_number || ' fueron recibidos. Procede con el rearmado.',
            jsonb_build_object('desarme_id', v_desarme.id)
          );
        ELSE
          INSERT INTO public.desarme_status_log (desarme_id, from_status, to_status, changed_by, changed_by_name, observation)
          VALUES (v_desarme.id, v_desarme.status, v_desarme.status, v_desarme.created_by, 'Sistema',
            'Repuesto ' || v_item.product_code || ' recibido (' || v_pending || ' pendientes)');
        END IF;
      END IF;
    ELSE
      -- Legacy fallback: by linked_order_id on desarmes
      FOR v_desarme IN
        SELECT id, created_by, desarme_number, status FROM public.desarmes
        WHERE linked_order_id = NEW.id AND status = 'pedido_generado'
      LOOP
        UPDATE public.desarmes SET status = 'recibido', updated_at = now() WHERE id = v_desarme.id;
        INSERT INTO public.desarme_status_log (desarme_id, from_status, to_status, changed_by, changed_by_name, observation)
        VALUES (v_desarme.id, v_desarme.status, 'recibido', v_desarme.created_by, 'Sistema', 'Actualizado automáticamente al entregar el pedido vinculado');
        INSERT INTO public.user_notifications (user_id, type, title, message, metadata)
        VALUES (v_desarme.created_by, 'desarme_recibido', 'Repuesto recibido',
          'El repuesto del desarme ' || v_desarme.desarme_number || ' fue recibido. Procede con el rearmado.',
          jsonb_build_object('desarme_id', v_desarme.id));
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
