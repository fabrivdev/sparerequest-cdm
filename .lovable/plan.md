

## Plan: Mejoras en el formulario de transferencias y flujo de recepcion/facturacion

### Resumen

Se implementaran 4 cambios principales:
1. Ajustar el modal de solicitud de transferencia para que no toque los bordes
2. Agregar campo "Destino" (Cliente/Stock/Ambos) al formulario de transferencia, con nombre de cliente obligatorio si es Cliente o Ambos
3. Cambiar el placeholder de observacion para que indique "Numero de remision"
4. Al marcar como "Recibida", si el destino es Cliente o Ambos, exigir numero de factura o motivo de no facturacion

---

### Cambios en base de datos

**Migracion**: Agregar columnas a la tabla `transfers`:
- `transfer_destination` (text, default 'stock') - destino: cliente/stock/ambos
- `client_name` (text, nullable) - nombre del cliente cuando aplica
- `remission_number` (text, nullable) - numero de remision
- `invoice_number` (text, nullable) - numero de factura al recibir
- `is_invoiced` (boolean, nullable) - si fue facturado al cerrar
- `not_invoiced_reason` (text, nullable) - motivo si no se facturo

---

### Cambios en el frontend

**1. TransferRequestModal.tsx**
- Agregar `max-h-[85vh] overflow-y-auto` y margenes al DialogContent para evitar que toque bordes
- Agregar selector de Destino (Cliente/Stock/Ambos) usando los iconos existentes de `destinations.ts`
- Si destino es "cliente" o "ambos", mostrar campo obligatorio "Nombre del Cliente"
- Cambiar placeholder de Observacion a "Numero de remision (obligatorio)" y hacerlo requerido
- Enviar los nuevos campos (`transfer_destination`, `client_name`, `remission_number`) al backend

**2. TransferDetailModal.tsx**
- Mostrar los nuevos campos (destino, cliente, numero de remision) en la seccion de info
- Cuando la accion sea "Recibida" y el destino sea "cliente" o "ambos":
  - Mostrar selector Si/No para "Facturado?"
  - Si es Si: campo obligatorio "Numero de factura"
  - Si es No: campo obligatorio "Motivo de no facturacion"
- Validar que estos campos esten completos antes de permitir enviar la accion
- Enviar los datos de facturacion al backend

---

### Cambios en el backend

**Edge function `transfer-operations`**:
- **createTransfer**: Aceptar y guardar los nuevos campos (`transfer_destination`, `client_name`, `remission_number`)
- **updateTransferStatus** (accion Recibida): Aceptar y guardar `invoice_number`, `is_invoiced`, `not_invoiced_reason`

---

### Seccion tecnica - Detalles de implementacion

- Se reutiliza `ORDER_DESTINATIONS` de `src/constants/destinations.ts` para los iconos y labels del selector de destino
- La observacion pasa a ser el campo de remision (`remission_number` en la DB), y se mantiene `observation` separado si ya hay datos existentes
- La validacion de facturacion solo aplica cuando `transfer_destination` es 'cliente' o 'ambos'
- Los datos existentes en la tabla `transfers` no se veran afectados ya que las nuevas columnas son nullable o tienen default

