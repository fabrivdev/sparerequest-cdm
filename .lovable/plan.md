

## Simplificar flujo de estados del Desarme

### Problema actual
Despues de generar el pedido, el flujo tiene pasos manuales innecesarios:
`pedido_generado` -> `confirmado` -> `en_transito` -> `recibido` -> `maquina_rearmada` -> `cerrado`

Los pasos "confirmado" y "en_transito" duplican lo que ya maneja el modulo de pedidos (Compras). El estado del repuesto ya se sigue desde ahi.

### Nuevo flujo propuesto
```text
pendiente_cotizacion -> pendiente_autorizacion -> aprobado -> pedido_generado
                                                                   |
                                            (automatico cuando el pedido = entregado)
                                                                   v
                                                              recibido -> maquina_rearmada -> cerrado
```

- Se eliminan `confirmado` y `en_transito` como estados del desarme.
- Cuando el pedido vinculado se marca como "entregado", el trigger existente ya cambia el desarme a "recibido" automaticamente.
- Se agrega notificacion al creador del desarme cuando pasa a "recibido" para que sepa que llego el repuesto.
- Los pasos manuales restantes son: `maquina_rearmada` y `cerrado`.

### Cambios tecnicos

**1. Constantes de estados** (`src/constants/desarmeStatuses.ts`)
- Eliminar `confirmado` y `en_transito` del listado de labels y colores.

**2. Modal de detalle** (`src/components/desarmes/DesarmeDetailModal.tsx`)
- Actualizar `nextStatusMap`: quitar `pedido_generado`, `confirmado` y `en_transito` como claves. Solo dejar `recibido -> maquina_rearmada` y `maquina_rearmada -> cerrado`.
- Agregar mensaje informativo cuando el estado es `pedido_generado`: "Esperando recepcion del repuesto (se actualizara automaticamente al entregar el pedido)".

**3. Edge function** (`supabase/functions/desarme-operations/index.ts`)
- En `updateDesarmeStatus`: quitar `confirmado` y `en_transito` de `validStatuses`.
- Agregar logica de notificacion: cuando el estado cambia a `recibido`, notificar al `created_by` del desarme.

**4. Trigger de base de datos** (`auto_update_desarme_on_order_delivered`)
- Actualizar para solo buscar desarmes en estado `pedido_generado` (ya no existen confirmado/en_transito).
- Agregar insercion de notificacion al creador del desarme y log de estado automatico cuando se activa el trigger.

**5. Panel de seguimiento** (`src/components/desarmes/TrackingPanel.tsx`)
- Sin cambios estructurales, ya que los estados eliminados simplemente dejaran de aparecer.

