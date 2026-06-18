## Cierre manual del circuito de desarmes

Permitir avanzar un desarme sin depender de un pedido del sistema, para los casos en que el repuesto se compra por fuera o ya estaba en camino.

### Comportamiento

En el modal de detalle del desarme (`DesarmeDetailModal`), se agregan tres acciones manuales disponibles para quien tenga permiso de seguimiento (`seguimiento_desarme`) o sea el creador:

1. **Marcar repuesto como recibido manualmente** — en cada fila de la tabla de ítems, junto al badge de estado, un botón "Marcar recibido" cuando el ítem no tiene `received_at`. Pide confirmación y una observación corta (ej: "compra externa", "ya estaba en stock"). Setea `received_at = now()` en `desarme_items` y registra el evento en `desarme_status_log`. Si todos los ítems quedan recibidos y el desarme está en `aprobado` o `pedido_generado`, avanza automáticamente a `recibido`.

2. **Saltar a "Recibido" sin generar pedido** — cuando el desarme está en `aprobado` (o `pedido_generado` con ítems pendientes), un botón secundario "Marcar todo como recibido (compra externa)" abre un diálogo con observación obligatoria, marca todos los ítems pendientes como recibidos y mueve el desarme a `recibido`. Queda asentado en el historial quién lo hizo y por qué.

3. **Cerrar manualmente desde cualquier estado intermedio** — para los estados `aprobado` y `pedido_generado`, además del flujo normal, se habilita "Forzar cierre" (solo para `seguimiento_desarme`). Pide Nro. de O.S. + observación y lleva directamente a `cerrado`, registrando todo en el log. Es una acción excepcional, separada del botón normal de cerrar.

Ninguno de estos cambios afecta el flujo automático actual (cuando sí hay pedido vinculado, sigue funcionando igual vía el trigger `auto_update_desarme_on_order_delivered`).

### Detalles técnicos

**Backend — `supabase/functions/desarme-operations/index.ts`**

Tres nuevas acciones:

- `markItemReceived` (`{ desarmeId, itemId, observation }`): valida permiso (creador o `seguimiento_desarme`), setea `received_at` en el ítem, inserta log. Si quedan 0 pendientes y el desarme está en `aprobado` o `pedido_generado`, pasa a `recibido` y notifica al creador (misma notificación que el trigger).
- `markAllReceivedManual` (`{ desarmeId, observation }`): marca todos los ítems sin `received_at`, mueve el desarme a `recibido`, log + notificación.
- `forceCloseDesarme` (`{ desarmeId, service_order_number, observation }`): salta a `cerrado` desde `aprobado`, `pedido_generado` o `recibido`/`maquina_rearmada`. Marca todos los ítems como recibidos si no lo estaban. Requiere O.S. y observación.

Todas las acciones usan `service_role`, validan permiso server-side con `has_permission` o `created_by = auth.uid()`.

**Base de datos** — sin migración nueva. Se reutilizan `desarme_items.received_at` y `desarme_status_log`.

**Frontend — `src/components/desarmes/DesarmeDetailModal.tsx`**

- Botón "Marcar recibido" por fila de ítem (cuando `!received_at`).
- Sección "Acciones manuales" colapsable con los botones de marcar todo y forzar cierre, visibles según estado + permisos.
- Cada acción usa `AlertDialog` con campo de observación obligatorio.
- Al confirmar, `refetchDetail()` + `onRefresh()`.

### Archivos a editar

- `supabase/functions/desarme-operations/index.ts`
- `src/components/desarmes/DesarmeDetailModal.tsx`
