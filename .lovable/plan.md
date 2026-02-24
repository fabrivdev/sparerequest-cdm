

## Plan: Notificaciones visuales para transferencias en tránsito + Simplificar flujo (Aceptar = En Tránsito)

### Problema 1: No hay indicador visual de transferencias en tránsito pendientes de recibir

Actualmente el badge del header solo cuenta transferencias con estado "Pendiente" dirigidas a tu sucursal. Pero cuando una transferencia esta "Aceptada" o "Despachada" (en transito hacia tu sucursal), no hay ningun indicador que te avise que tenes algo por recibir.

**Solucion**: Agregar un segundo contador en el header y en la pestana "En Transito" que muestre cuantas transferencias en transito van dirigidas a tu sucursal (donde tu sucursal es `requester_branch`).

### Problema 2: El flujo tiene un paso innecesario (Aceptar -> Despachar)

Actualmente: Pendiente -> Aceptada -> Despachada -> Recibida
El usuario quiere: Pendiente -> Despachada (aceptar = despachar directamente)

**Solucion**: Al aceptar, el backend escribira directamente el estado "Despachada" en vez de "Aceptada", combinando ambos pasos en uno.

---

### Cambios tecnicos

#### 1. Backend `transfer-operations/index.ts` - Simplificar flujo

En la seccion `updateTransferStatus`, cuando `newStatus === 'Aceptada'`:
- Cambiar el estado final a `'Despachada'` directamente
- Guardar la cantidad en `approved_quantity` Y `dispatched_quantity`
- El log registrara la transicion como Pendiente -> Despachada

#### 2. Frontend `transferStatuses.ts` - Actualizar transiciones validas

Cambiar las transiciones:
```text
Antes:
  Pendiente -> [Aceptada, Rechazada, Cancelada]
  Aceptada -> [Despachada]

Despues:
  Pendiente -> [Aceptada, Rechazada, Cancelada]  (el boton sigue diciendo "Aceptada" pero el backend lo convierte a Despachada)
  // Se elimina la transicion Aceptada -> Despachada ya que no existira mas ese estado intermedio
```

Se eliminara `Aceptada` del objeto `VALID_TRANSITIONS` ya que las transferencias pasaran directamente a `Despachada`.

#### 3. Frontend `TransferDetailModal.tsx` - Renombrar boton

El boton que dice "Aceptada" se renombrara a "Aceptar y Despachar" para que quede claro que es un solo paso.

#### 4. Header `Header.tsx` - Agregar badge de "en transito hacia mi"

Ademas del conteo de transferencias Pendientes dirigidas a mi sucursal (como `source_branch`), agregar un conteo de transferencias con estado "Despachada" donde mi sucursal es `requester_branch` (es decir, cosas que me mandaron y tengo que marcar como recibidas).

Mostrar ambos badges:
- Badge rojo en "Transferencias": pendientes por atender (como origen) + despachadas por recibir (como destino)

#### 5. Pestana "En Transito" en `Transfers.tsx` - Badge de pendientes por recibir

Agregar un badge en la pestana "En Transito" mostrando cuantas transferencias despachadas van hacia mi sucursal.

#### 6. `TransferNotificationListener.tsx` - Notificar cambios a Despachada

Agregar notificacion cuando una transferencia cambia a estado "Despachada" y la sucursal destino (`requester_branch`) es la del usuario. Esto avisara "Te enviaron un repuesto, esta en camino".

#### 7. Backend `in_transit` query update

Actualizar el filtro de `in_transit` para que ya no incluya `'Aceptada'` (solo `'Despachada'`), ya que ese estado intermedio deja de existir.

### Archivos a modificar

- `supabase/functions/transfer-operations/index.ts` - Logica de aceptar = despachar + filtro in_transit
- `src/constants/transferStatuses.ts` - Transiciones validas
- `src/components/transfers/TransferDetailModal.tsx` - Renombrar boton
- `src/components/Header.tsx` - Badge combinado (pendientes + en transito hacia mi)
- `src/pages/Transfers.tsx` - Badge en pestana En Transito
- `src/components/transfers/TransferNotificationListener.tsx` - Notificar despachos hacia mi sucursal
- `src/components/transfers/InTransitView.tsx` - Actualizar filtro realtime

