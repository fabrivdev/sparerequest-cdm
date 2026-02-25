

# Plan: Contador de pendientes en Entregados + Sistema de notificaciones para usuarios

## Resumen

Se agregan dos funcionalidades:
1. **Contador de pendientes de facturar** en la pestaña/vista de Entregados, con alerta visual para que el usuario actualice sus datos.
2. **Centro de notificaciones** para usuarios (similar al que ya tiene el admin), con notificaciones en tiempo real sobre cambios de estado de pedidos, pedidos entregados, transferencias recibidas y transferencias en tránsito.

---

## 1. Contador de pendientes en Entregados

### Cambios en `ViewToggle.tsx`
- Agregar una prop `pendingInvoiceCount` al componente.
- Mostrar un badge rojo junto al botón "Entregados" cuando haya pedidos sin facturar (similar al badge de transferencias en el Header).

### Cambios en `Dashboard.tsx`
- Calcular el conteo de pedidos entregados sin facturar (donde `status === 'entregado'`, `order_destination !== 'stock'` y `is_invoiced === false`).
- Pasar ese conteo al `ViewToggle`.

### Cambios en `DeliveredOrdersView.tsx`
- Agregar un banner/alerta al inicio de la vista cuando hay pedidos pendientes de facturar, con un mensaje tipo: "Tienes X pedidos pendientes de actualizar datos de facturación".

---

## 2. Sistema de notificaciones para usuarios

### Nueva tabla: `user_notifications`
Crear una tabla en la base de datos con:
- `id` (uuid, PK)
- `user_id` (uuid, destinatario)
- `type` (text: `order_status_change`, `order_delivered`, `transfer_request`, `transfer_dispatched`, `transfer_received`, etc.)
- `title` (text)
- `message` (text)
- `is_read` (boolean, default false)
- `created_at` (timestamptz)
- `metadata` (jsonb, opcional para datos extra como order_id, transfer_id)

Con RLS para que cada usuario solo vea sus propias notificaciones. Habilitar realtime en la tabla.

### Generacion de notificaciones (Edge Function)
Modificar la edge function `admin-orders` para que al cambiar el estado de un pedido, inserte una notificacion en `user_notifications` para el dueño del pedido. Lo mismo en `transfer-operations` para transferencias.

Tipos de notificaciones:
- **Cambio de estado**: "Tu pedido [codigo] cambio a [nuevo estado]"
- **Pedido entregado**: "Tu pedido [codigo] fue marcado como entregado. Actualiza los datos de facturacion."
- **Transferencia recibida**: "Nueva solicitud de transferencia de [sucursal] para [codigo]"
- **Transferencia despachada**: "El repuesto [codigo] fue despachado desde [sucursal]"

### Nuevo componente: `UserNotifications.tsx`
- Icono de campana en el Header (similar al `AdminNotifications.tsx`).
- Popover con lista de notificaciones, ordenadas por fecha.
- Badge con contador de no leidas.
- Boton para marcar como leida (click individual) y marcar todas como leidas.
- Sonido de notificacion al recibir una nueva (reutilizando `useNotificationSound`).
- Suscripcion realtime a la tabla `user_notifications` filtrada por `user_id`.

### Cambios en `Header.tsx`
- Importar y renderizar el componente `UserNotifications` junto a los demas botones de accion, pasandole el `userId` del usuario autenticado.

---

## Detalles tecnicos

### Migracion SQL
```text
CREATE TABLE user_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON user_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update (mark read) their own
CREATE POLICY "Users can update own notifications" ON user_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own
CREATE POLICY "Users can delete own notifications" ON user_notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Service role can insert (from edge functions)
CREATE POLICY "Service role can insert notifications" ON user_notifications
  FOR INSERT WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;
```

### Edge function changes
- En `admin-orders`: al cambiar status de un pedido (acciones `updateOrder`, `bulkUpdateStatus`), insertar registro en `user_notifications` con el service role client.
- En `transfer-operations`: al crear/despachar transferencias, insertar notificaciones para los usuarios involucrados.

### Archivos nuevos
- `src/components/UserNotifications.tsx`

### Archivos modificados
- `src/components/Header.tsx` (agregar campana de notificaciones)
- `src/components/ViewToggle.tsx` (agregar badge de pendientes)
- `src/components/DeliveredOrdersView.tsx` (agregar banner de alerta)
- `src/pages/Dashboard.tsx` (calcular pendientes, pasar props)
- `supabase/functions/admin-orders/index.ts` (insertar notificaciones al cambiar estado)
- `supabase/functions/transfer-operations/index.ts` (insertar notificaciones de transferencias)

