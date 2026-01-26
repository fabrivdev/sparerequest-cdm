
# Plan: Mejoras en Facturación y Lógica de Estados

## Resumen de Cambios

1. **Modal de facturación con opciones Sí/No**
   - Cambiar checkbox por botones de selección (Sí / No)
   - Si es "Sí": mostrar campos de número de factura, cantidad, observación
   - Si es "No": mostrar campo de "Motivo de no facturación"

2. **Corregir lógica de cambio de estados del admin**
   - Cuando retrocede a "pending": limpiar order_number, requested_at, delivered_at (ya funciona)
   - Verificar que la fecha de solicitud se asigne correctamente en todos los casos

3. **Nuevo campo en base de datos**: `not_invoiced_reason` para almacenar el motivo

---

## Cambios en Base de Datos

### Migración SQL
```sql
-- Agregar columna para motivo de no facturación
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS not_invoiced_reason text;
```

---

## Cambios en el Modal de Facturación de Usuario

### Archivo: `src/components/DeliveredOrdersView.tsx`

**Cambios en InvoiceModalData:**
```typescript
interface InvoiceModalData {
  order: Order;
  invoiceChoice: 'yes' | 'no' | null;  // Nuevo: Sí o No
  invoiceNumber: string;
  invoicedQuantity: string;
  invoiceObservation: string;
  notInvoicedReason: string;  // Nuevo: motivo de no facturación
}
```

**Cambios en el UI del modal:**

1. Reemplazar checkbox por dos botones estilo toggle:
```
┌─────────────────────────────────────────────┐
│  ¿Facturado al cliente?                     │
│                                             │
│  ┌──────────────┐  ┌──────────────┐        │
│  │     Sí ✓     │  │     No ✗     │        │
│  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────┘
```

2. Si selecciona "Sí":
   - Mostrar: Número de factura (obligatorio), Cantidad facturada, Observación

3. Si selecciona "No":
   - Mostrar: Campo de texto "Motivo de no facturación" (obligatorio)

**Lógica de guardado:**
```typescript
// Si invoiceChoice === 'yes'
{
  is_invoiced: true,
  invoice_number: modalData.invoiceNumber,
  invoiced_quantity: parseInt(modalData.invoicedQuantity),
  invoice_observation: modalData.invoiceObservation,
  not_invoiced_reason: null
}

// Si invoiceChoice === 'no'
{
  is_invoiced: false,
  invoice_number: null,
  invoiced_quantity: null,
  invoice_observation: null,
  not_invoiced_reason: modalData.notInvoicedReason
}
```

---

## Verificación de Lógica de Estados (Edge Function)

### Archivo: `supabase/functions/admin-orders/index.ts`

La lógica actual en el action `updateStatus`:

| Estado Destino | Acción |
|----------------|--------|
| `pending` | Limpia: `requested_at`, `delivered_at`, `order_number` |
| `solicitado` | Asigna: `requested_at = now`, Limpia: `delivered_at` |
| `pte_envio` | Si no hay `requested_at`: asigna `now`, Limpia: `delivered_at` |
| `entregado` | Asigna: `delivered_at = now`, Si no hay `requested_at`: asigna `now` |
| `cancelado` | Sin cambios en fechas |

Esta lógica ya está correctamente implementada. Si hay un error al cambiar estados, puede ser un problema de despliegue del edge function o un error en el frontend.

---

## Actualizar Tipo Order

### Archivo: `src/components/OrdersTable.tsx`

Agregar a la interfaz Order:
```typescript
not_invoiced_reason?: string | null;
```

---

## Actualizar Vista Admin de Entregados

### Archivo: `src/components/AdminDeliveredView.tsx`

Agregar columna "Motivo no fact." que muestre el campo `not_invoiced_reason` cuando `is_invoiced = false` y no sea destino "stock".

---

## Resumen de Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| BD (migración) | Agregar columna `not_invoiced_reason` |
| `src/components/DeliveredOrdersView.tsx` | Nuevo UI modal con Sí/No y campo motivo |
| `src/components/OrdersTable.tsx` | Agregar `not_invoiced_reason` a interfaz Order |
| `src/components/AdminDeliveredView.tsx` | Mostrar columna "Motivo no fact." |

---

## Flujo Actualizado del Modal de Facturación

```
Usuario abre modal de facturación
  │
  ├─► ¿Facturado al cliente?
  │     │
  │     ├─► [Sí]
  │     │     │
  │     │     └─► Mostrar:
  │     │           - Nro. Factura (obligatorio)
  │     │           - Cantidad Facturada
  │     │           - Observación (opcional)
  │     │
  │     └─► [No]
  │           │
  │           └─► Mostrar:
  │                 - Motivo de no facturación (obligatorio)
  │
  └─► [Guardar]
        │
        ├─► Si "Sí": Validar factura, guardar datos
        └─► Si "No": Guardar motivo, limpiar datos de factura
```

---

## Nota sobre Lógica de Estados

La lógica de cambio de estados en el edge function ya está correctamente implementada:

- **Pending → Entregado directo**: Se asigna `requested_at = now` automáticamente
- **Retroceso a Pending**: Se limpia `order_number`, `requested_at`, `delivered_at`

Si hay errores al cambiar estados, es necesario verificar:
1. Que el edge function esté desplegado correctamente
2. Revisar los logs del edge function para errores específicos
