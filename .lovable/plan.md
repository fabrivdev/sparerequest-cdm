

## Plan: Enriquecer listas de transferencias y agregar modal de detalle con tiempos

### Resumen
Se mejoraran las listas de transferencias en todas las vistas para mostrar mas informacion relevante (destino, cliente, facturacion), y se agregara la funcionalidad de abrir un modal con detalle completo al hacer clic en cualquier fila, incluyendo tiempos transcurridos entre cada etapa.

---

### 1. ClosedTransfersView - Agregar detalle y modal

**Problema actual**: No muestra destino, cliente ni facturacion. No se puede hacer clic para ver detalle.

**Cambios**:
- Agregar columnas/campos visibles: Destino (Cliente/Stock/Ambos), Facturado (Si/No), Nro. Factura
- Hacer las filas clickeables (como en MyTransfersView e InTransitView)
- Agregar el componente `TransferDetailModal` al hacer clic
- Recibir `userName` como prop adicional para pasarlo al modal

**En mobile (cards)**: Agregar linea con destino e info de facturacion
**En desktop (tabla)**: Agregar columnas "Destino" y "Facturado"

---

### 2. MyTransfersView (TransferList) - Enriquecer info

**Cambios**:
- En mobile cards: agregar linea con destino y cliente si aplica
- En desktop tabla: agregar columna "Destino" mostrando Cliente/Stock/Ambos

---

### 3. InTransitView - Enriquecer info

**Cambios**:
- En mobile cards: agregar linea con destino y cliente
- En desktop tabla: agregar columna "Destino"

---

### 4. TransferDetailModal - Agregar tiempos transcurridos

**Cambios en la seccion de historial**:
- Calcular y mostrar el tiempo transcurrido entre cada cambio de estado (ej: "2h 15min", "1d 4h")
- Mostrar el tiempo total desde la creacion hasta el estado actual/final
- Agregar un resumen visual de tiempos al inicio del historial:
  - Tiempo total de la operacion
  - Tiempo en cada etapa (Pendiente a Despachada, Despachada a Recibida, etc.)

---

### Seccion tecnica

**ClosedTransfersView.tsx**:
- Agregar props `userName` (necesario para TransferDetailModal)
- Agregar estado `selectedTransfer` y renderizar `TransferDetailModal`
- Agregar `onClick` a filas/cards
- Agregar campos `transfer_destination`, `is_invoiced`, `invoice_number` a la vista

**Transfers.tsx (pagina padre)**:
- Pasar `userName` al componente `ClosedTransfersView`

**MyTransfersView.tsx (TransferList)**:
- Agregar columna/campo de destino en tabla y cards

**InTransitView.tsx**:
- Agregar columna/campo de destino en tabla y cards

**TransferDetailModal.tsx**:
- Funcion `calculateElapsedTime(from: Date, to: Date)` que devuelve string legible (ej: "2h 30min", "1d 5h")
- En la seccion de historial, mostrar entre cada entrada el tiempo transcurrido
- Agregar seccion "Resumen de tiempos" con tiempo total y por etapa

No se requieren cambios en la base de datos ni en la edge function, ya que todos los campos necesarios ya estan en la tabla `transfers` y el `statusLog` ya tiene timestamps.
