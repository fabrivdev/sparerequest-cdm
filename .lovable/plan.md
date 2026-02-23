

## Plan: Notificaciones en tiempo real para transferencias

### Objetivo
Cuando alguien crea una transferencia solicitando stock de otra sucursal, todos los usuarios de esa sucursal origen deben recibir una notificacion visual y sonora en tiempo real, sin necesidad de recargar la pagina.

### Arquitectura

Se usara Supabase Realtime sobre la tabla `transfers` para detectar nuevas inserciones y cambios de estado. Cada vista de transferencias escuchara estos eventos y actualizara automaticamente.

Ademas, se agregara un indicador de "nuevas transferencias" en la pestana "Mis Trans." con un badge de conteo y un toast con sonido cuando llega una nueva solicitud dirigida a la sucursal del usuario.

---

### Cambios tecnicos

#### 1. Habilitar Realtime en la tabla `transfers`

Migracion SQL:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.transfers;
```

#### 2. Crear componente `TransferNotificationListener`

Un nuevo componente (`src/components/transfers/TransferNotificationListener.tsx`) que:
- Se suscribe a `postgres_changes` en la tabla `transfers` (evento INSERT y UPDATE)
- Filtra eventos donde `source_branch` coincide con la sucursal del usuario (nuevas solicitudes dirigidas a su sucursal)
- Al detectar una nueva transferencia:
  - Muestra un toast con el detalle (marca, codigo, sucursal solicitante)
  - Reproduce el sonido de notificacion usando el hook `useNotificationSound` existente
  - Incrementa un contador de "no vistas"

#### 3. Integrar en `Transfers.tsx`

- Montar `TransferNotificationListener` pasandole `userBranch` y un callback para actualizar el badge
- Agregar un badge con contador de nuevas transferencias en la pestana "Mis Trans."
- Al hacer click en la pestana, resetear el contador

#### 4. Auto-refresh en `MyTransfersView`

- Agregar suscripcion Realtime dentro de `MyTransfersView` para refrescar automaticamente las listas cuando hay cambios en `transfers` que involucren la sucursal del usuario (como origen o como solicitante)
- Esto elimina la necesidad de pulsar el boton de refrescar manualmente

#### 5. Auto-refresh en `InTransitView`

- Suscripcion similar para actualizar la vista de transito cuando una transferencia cambia a estado "Aceptada" o "Despachada"

### Archivos a crear
- `src/components/transfers/TransferNotificationListener.tsx`

### Archivos a modificar
- `src/pages/Transfers.tsx` - montar listener y badge en tabs
- `src/components/transfers/MyTransfersView.tsx` - agregar realtime auto-refresh
- `src/components/transfers/InTransitView.tsx` - agregar realtime auto-refresh

### Migracion de base de datos
- Habilitar realtime en tabla `transfers`

