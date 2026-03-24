

## Cancelar desarme por el creador

### Problema
El creador de un desarme no puede cancelar la operación una vez aprobada si aún no se generó el pedido. Necesita poder cancelar con una observación obligatoria, y el desarme debe quedar en un estado distinguible.

### Solución

Agregar un nuevo estado `cancelado` y permitir que el creador cancele desde el modal de detalle cuando el estado sea `pendiente_cotizacion`, `pendiente_autorizacion` o `aprobado` (antes de generar pedido).

### Cambios

**1. `src/constants/desarmeStatuses.ts`** — Agregar estado `cancelado`
- Label: "Cancelado"
- Color: gris/slate (`bg-slate-100 text-slate-800`)

**2. `supabase/functions/desarme-operations/index.ts`** — Nueva acción `cancelDesarme`
- Validar que el usuario sea el creador (`created_by === userId`)
- Validar que el estado sea `pendiente_cotizacion`, `pendiente_autorizacion` o `aprobado`
- Requiere observación obligatoria
- Actualiza estado a `cancelado`, registra en `desarme_status_log`
- Notifica al cotizador (si existe) que el desarme fue cancelado
- Envía CSV a Slack y webhook n8n

**3. `src/components/desarmes/DesarmeDetailModal.tsx`** — Botón "Cancelar operación"
- Visible solo para el creador (`isCreator`)
- Solo en estados: `pendiente_cotizacion`, `pendiente_autorizacion`, `aprobado`
- Al hacer clic, muestra un campo de observación obligatorio y un diálogo de confirmación
- Llama a `cancelDesarme` en la edge function

**4. Tracking/filtros** — El estado `cancelado` ya se comportará correctamente:
- El `getDesarmeTracking` ya excluye `rechazado` y `cerrado`; agregar `cancelado` a esa exclusión
- Los filtros del TrackingPanel ya leen de `DESARME_ALL_STATUSES` así que se incluirá automáticamente

