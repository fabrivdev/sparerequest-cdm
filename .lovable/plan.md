
# Plan: Fecha de Entrega Estimada

## Resumen
Agregar un campo de "Fecha Estimada de Entrega" que el admin pueda ingresar cuando asigna un número de pedido. Esta fecha será visible para los usuarios en sus vistas de pedidos.

---

## Cambios a Implementar

### 1. Agregar Nueva Columna en la Base de Datos

**Migración SQL:**
```sql
ALTER TABLE orders ADD COLUMN estimated_delivery_date DATE NULL;
```

Esta columna almacenará la fecha estimada de entrega que el admin ingresa.

---

### 2. Actualizar BulkActionsBar para Incluir Fecha Estimada

**Archivo:** `src/components/BulkActionsBar.tsx`

Cuando el admin ingresa un número de pedido para cambiar el estado a "Solicitado", "Pte. de envío" o "Entregado", se agregará un campo adicional para la fecha estimada de entrega:

```text
Estado actual:
┌─────────────────────────────────────────────────────────┐
│ Solicitado: [Nro. Pedido (obligatorio)] [Confirmar]    │
└─────────────────────────────────────────────────────────┘

Nuevo diseño:
┌───────────────────────────────────────────────────────────────────────┐
│ Solicitado:                                                           │
│ Nro. Pedido: [__________]  F. Estimada: [📅 dd/mm/yyyy]  [Confirmar] │
└───────────────────────────────────────────────────────────────────────┘
```

Cambios:
- Agregar estado `estimatedDate` (Date | undefined)
- Agregar componente DatePicker (Popover + Calendar) para seleccionar la fecha
- La fecha estimada es opcional (no obligatoria)
- Pasar `estimatedDeliveryDate` al llamar `onStatusChange`

---

### 3. Actualizar OrdersTable para Edición Individual

**Archivo:** `src/components/OrdersTable.tsx`

Cuando el admin edita el número de pedido de forma individual en la tabla, agregar también un campo para fecha estimada:
- En el modo de edición de `order_number`, agregar un DatePicker al lado
- Actualizar la función de guardado para incluir la fecha

---

### 4. Actualizar Edge Function para Guardar Fecha Estimada

**Archivo:** `supabase/functions/admin-orders/index.ts`

Modificar las acciones que manejan el número de pedido:

**`updateOrderNumber`:**
```typescript
// Agregar parámetro estimatedDeliveryDate
const { estimatedDeliveryDate } = body;

const { error } = await supabase
  .from('orders')
  .update({ 
    order_number: orderNumber || null,
    estimated_delivery_date: estimatedDeliveryDate || null
  })
  .eq('id', orderId);
```

**`bulkUpdateStatus`:**
```typescript
// Cuando se asigna un orderNumber, también guardar estimated_delivery_date
if (orderNumber && orderNumber.trim() !== '') {
  updateData.order_number = orderNumber.trim();
  updateData.estimated_delivery_date = estimatedDeliveryDate || null;
}
```

---

### 5. Mostrar Fecha Estimada en Vista de Usuario

**Archivo:** `src/components/OrdersTable.tsx`

Agregar columna "F. Estimada" en la tabla de usuarios (no admin):

```text
| Estado | Nro. Pedido | F. Estimada | Actualización |
```

- Si hay `estimated_delivery_date`, mostrarla formateada como "dd/MM/yyyy"
- Si no hay fecha, mostrar "-"
- Resaltar visualmente si está próxima (ej: fondo verde claro si es esta semana)

---

### 6. Actualizar Interfaz Order

**Archivos:** `src/components/OrdersTable.tsx`

Agregar al interface Order:
```typescript
estimated_delivery_date?: string | null;
```

---

## Detalles Técnicos

### Estructura de Datos

```typescript
interface Order {
  // ... campos existentes
  estimated_delivery_date?: string | null; // formato 'YYYY-MM-DD'
}
```

### Flujo de Usuario (Admin)

1. Admin selecciona uno o varios pedidos
2. Cambia el estado a "Solicitado" o similar
3. Ingresa el número de pedido (obligatorio)
4. Opcionalmente selecciona una fecha estimada de entrega
5. Confirma y se guarda todo junto

### Flujo de Usuario (Usuario Regular)

1. Usuario ve sus pedidos en "Mis Pedidos" o "Pedidos Sucursal"
2. Ve la columna "F. Estimada" que muestra la fecha cuando el admin la haya asignado
3. Puede planificar en base a esa fecha estimada

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| **Migración SQL** | Agregar columna `estimated_delivery_date` |
| `src/components/BulkActionsBar.tsx` | Agregar DatePicker para fecha estimada al asignar número de pedido |
| `src/components/OrdersTable.tsx` | Agregar columna "F. Estimada" en vista usuario + edición en admin |
| `supabase/functions/admin-orders/index.ts` | Manejar `estimated_delivery_date` en updateOrderNumber y bulkUpdateStatus |

---

## Ejemplo Visual

**Vista de Usuario con Fecha Estimada:**

| Fecha | Marca | Código | Cant. | Sucursal | Estado | Nro. Pedido | F. Estimada | Actualización |
|-------|-------|--------|-------|----------|--------|-------------|-------------|---------------|
| 26/01/26 | CLAAS | ABC123 | 5 | Sucursal A | Solicitado | PED-001 | 15/02/26 | 26/01/26 10:30 |
| 25/01/26 | HORSCH | XYZ789 | 2 | Sucursal B | Pte. envío | PED-002 | - | 25/01/26 14:00 |
