
CREATE OR REPLACE FUNCTION public.auto_update_desarme_on_order_delivered()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_desarme RECORD;
BEGIN
  IF NEW.status = 'entregado' AND (OLD.status IS DISTINCT FROM 'entregado') THEN
    -- Only transition from pedido_generado (confirmado/en_transito no longer exist)
    FOR v_desarme IN
      SELECT id, created_by, desarme_number, status
      FROM public.desarmes
      WHERE linked_order_id = NEW.id
        AND status = 'pedido_generado'
    LOOP
      -- Update desarme status
      UPDATE public.desarmes
      SET status = 'recibido', updated_at = now()
      WHERE id = v_desarme.id;

      -- Insert status log
      INSERT INTO public.desarme_status_log (desarme_id, from_status, to_status, changed_by, changed_by_name, observation)
      VALUES (v_desarme.id, v_desarme.status, 'recibido', v_desarme.created_by, 'Sistema', 'Actualizado automáticamente al entregar el pedido vinculado');

      -- Notify the creator
      INSERT INTO public.user_notifications (user_id, type, title, message, metadata)
      VALUES (
        v_desarme.created_by,
        'desarme_recibido',
        'Repuesto recibido',
        'El repuesto del desarme ' || v_desarme.desarme_number || ' fue recibido. Procede con el rearmado.',
        jsonb_build_object('desarme_id', v_desarme.id)
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;
