## Desarmes con múltiples repuestos

Hoy un desarme tiene un único `product_code` y una única `quantity`. Vamos a permitir cargar N repuestos dentro del mismo desarme, conservando un único número (DES-XXXX), una sola cotización, una sola autorización y un único seguimiento. Al aprobarse, se generan N pedidos vinculados (uno por repuesto), y el desarme avanza a "Recibido" cuando se entregan todos.

### Cambios en la base de datos

Nueva tabla `desarme_items`:
- `desarme_id` (referencia al desarme)
- `product_code`, `product_name`, `quantity`
- `linked_order_id` (pedido generado para este ítem, nullable)
- `received_at` (nullable, marcado cuando el pedido vinculado se entrega)

Migración de datos: por cada desarme existente, se crea un `desarme_items` con su `product_code`/`quantity`/`linked_order_id` actuales. Los campos `product_code`, `product_name`, `quantity` y `linked_order_id` de `desarmes` se mantienen por compatibilidad pero dejan de ser la fuente de verdad (se podrán retirar más adelante).

Tabla `orders`: nueva columna `desarme_item_id` (nullable) para asociar cada pedido a su ítem.

Trigger `auto_update_desarme_on_order_delivered` actualizado:
- Al entregarse un pedido con `desarme_item_id`, marca ese ítem como recibido (`received_at = now()`).
- Si el desarme está en `pedido_generado` y todos sus ítems quedan recibidos, avanza a `recibido` y notifica al creador. Si quedan ítems pendientes, no cambia de estado pero igual registra la recepción parcial en `desarme_status_log`.

GRANTs y RLS de `desarme_items` siguiendo el patrón de `desarme_status_log` (SELECT a authenticated, ALL a service_role, DELETE permitido al creador del desarme padre).

### Backend (edge function `desarme-operations`)

- `createDesarme`: acepta un array `items: [{ product_code, product_name, quantity }]` (mínimo 1). Inserta el desarme y luego los items en `desarme_items`. Mantiene compatibilidad con el body viejo (`product_code`/`quantity` se traducen a un único item).
- `getDesarmeDetail`: devuelve también `items` (array desde `desarme_items` con su pedido vinculado y estado).
- `generateOrder`: genera **un pedido por cada ítem** del desarme, cada uno con su `desarme_item_id` seteado. Guarda los `order.id` en `desarme_items.linked_order_id`. El desarme pasa a `pedido_generado`. Mantiene un `linked_order_id` "principal" (el primero) por compatibilidad con vistas viejas.
- CSV de Slack: pasa de una fila a una fila por ítem (o columna "Repuestos" con `code1×qty1; code2×qty2`). Optamos por columna concatenada para no romper el formato actual.
- `getDesarmes` / `getDesarmeTracking`: incluyen un resumen `items_summary` (string con "CODE1×2, CODE2×1, …") y `items_count`.

### Frontend

**`NewDesarmeModal.tsx`** — sección "Repuestos" con lista dinámica de filas (código + cantidad + nombre auto-resuelto + botón eliminar) y botón "+ Agregar repuesto". Validación: al menos un ítem, todos con código y cantidad ≥ 1, sin duplicados. Submit envía `items: [...]`.

**`DesarmeDetailModal.tsx`** — reemplaza el renglón único "Repuesto" por una mini-tabla de ítems: código, nombre, cantidad, estado de recepción (pendiente / recibido / pedido # corto). El botón "Generar Pedido" sigue siendo único pero ahora avisa que generará N pedidos.

**`DesarmesList.tsx`** — la columna "Código" muestra el primer ítem con un sufijo "+N" cuando hay varios (tooltip con la lista completa). Search también matchea por cualquier código del desarme (se filtra contra `items_summary`).

**`TrackingPanel.tsx`** — igual tratamiento para la columna de código; el indicador de progreso considera "todos los ítems recibidos" para el estado verde.

**`QuoteDesarmeModal.tsx` y `AuthorizeDesarmeModal.tsx`** — sin cambios funcionales: muestran el resumen multi-ítem en el bloque de info. Una sola cotización cubre el desarme completo (como pediste, para no multiplicar pasos).

### Compatibilidad

- Desarmes ya creados quedan con un único `desarme_items` (backfill), por lo que la UI nueva los muestra igual de bien.
- El campo `linked_order_id` del header sigue existiendo, así no rompemos integraciones externas (n8n / Slack).

### Archivos a editar
- Migración SQL: nueva tabla `desarme_items`, columna `desarme_item_id` en `orders`, trigger actualizado, backfill.
- `supabase/functions/desarme-operations/index.ts`
- `src/components/desarmes/NewDesarmeModal.tsx`
- `src/components/desarmes/DesarmeDetailModal.tsx`
- `src/components/desarmes/DesarmesList.tsx`
- `src/components/desarmes/TrackingPanel.tsx`
- `src/components/desarmes/QuoteDesarmeModal.tsx` (solo mostrar resumen multi-ítem)
