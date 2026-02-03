
# Plan: Corregir Bug de Fecha y Mejorar Bulk Actions

## Resumen
Se deben corregir dos problemas:
1. **Bug de timezone**: Al seleccionar una fecha (ej: 03/02), se guarda un día antes (02/02)
2. **Bulk actions incompleto**: Si pedidos están en "solicitado" sin fecha estimada, al seleccionarlos debe aparecer la opción de agregar fecha

---

## Problema 1: Bug de Timezone en Fechas

### Causa del problema
Cuando JavaScript parsea una fecha en formato `yyyy-MM-dd` con `new Date("2025-02-03")`, la interpreta en UTC (medianoche UTC). Para usuarios en zonas horarias negativas (ej: Argentina GMT-3), esto resulta en que la fecha se muestre como el día anterior.

### Solución
Crear funciones helper para manejar fechas locales correctamente:

```text
// Formatear Date a string yyyy-MM-dd en timezone local
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Parsear string yyyy-MM-dd a Date en timezone local
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}
```

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/lib/utils.ts` | Agregar funciones `formatLocalDate` y `parseLocalDate` |
| `src/components/OrdersTable.tsx` | Usar `parseLocalDate` en línea 685 para cargar fecha existente, y `formatLocalDate` en línea 664 para guardar |
| `src/components/BulkActionsBar.tsx` | Usar `formatLocalDate` en línea 128 al confirmar |

---

## Problema 2: Mostrar Formulario de Fecha en Bulk Actions

### Causa del problema
Actualmente el `BulkActionsBar` solo verifica `selectedOrdersNeedOrderNumber` para decidir si mostrar el formulario de ingreso. Si todos los pedidos ya tienen order_number pero les falta estimated_delivery_date, el formulario no aparece y no se puede pasar a "entregado".

### Solución
Agregar una nueva prop `selectedOrdersNeedEstimatedDate` y modificar la lógica para mostrar el formulario cuando falte cualquiera de los dos campos (order_number O estimated_delivery_date).

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/BulkActionsBar.tsx` | Agregar prop `selectedOrdersNeedEstimatedDate`, modificar `handleStatusSelect` para considerar ambos campos |
| `src/pages/Admin.tsx` | Pasar nueva prop calculando si algún pedido seleccionado no tiene fecha estimada |

---

## Detalles Técnicos

### src/lib/utils.ts
Agregar al final del archivo:

```typescript
// Format Date to yyyy-MM-dd string in local timezone
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Parse yyyy-MM-dd string to Date in local timezone
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}
```

### src/components/OrdersTable.tsx

1. Importar las funciones:
```typescript
import { cn, formatLocalDate, parseLocalDate } from '@/lib/utils';
```

2. Línea 664 - cambiar formato al guardar:
```typescript
// Antes:
onEstimatedDateChange?.(order.id, format(estimatedDateValue, 'yyyy-MM-dd'));

// Después:
onEstimatedDateChange?.(order.id, formatLocalDate(estimatedDateValue));
```

3. Línea 685 - cambiar parseo al cargar:
```typescript
// Antes:
setEstimatedDateValue(order.estimated_delivery_date ? new Date(order.estimated_delivery_date) : undefined);

// Después:
setEstimatedDateValue(order.estimated_delivery_date ? parseLocalDate(order.estimated_delivery_date) : undefined);
```

### src/components/BulkActionsBar.tsx

1. Importar función:
```typescript
import { cn, formatLocalDate } from '@/lib/utils';
```

2. Agregar nueva prop a la interface:
```typescript
selectedOrdersNeedEstimatedDate?: boolean;
```

3. Modificar lógica de handleStatusSelect:
```typescript
// Antes (línea 101-109):
} else if (status === 'solicitado' || status === 'pte_envio' || status === 'entregado') {
  if (selectedOrdersNeedOrderNumber) {
    setPendingStatus(status);
  } else {
    handleStatusChange(status);
  }
}

// Después:
} else if (status === 'solicitado' || status === 'pte_envio' || status === 'entregado') {
  // Mostrar formulario si falta order_number O estimated_delivery_date
  if (selectedOrdersNeedOrderNumber || selectedOrdersNeedEstimatedDate) {
    setPendingStatus(status);
  } else {
    handleStatusChange(status);
  }
}
```

4. Cambiar formato de fecha al confirmar:
```typescript
// Línea 128:
const estDateStr = formatLocalDate(estimatedDate);
```

### src/pages/Admin.tsx

1. Agregar nueva prop al BulkActionsBar:
```typescript
selectedOrdersNeedEstimatedDate={orders.some(
  o => selectedOrders.includes(o.id) && !o.estimated_delivery_date
)}
```

---

## Resumen de Cambios

| Archivo | Tipo de Cambio |
|---------|----------------|
| `src/lib/utils.ts` | Agregar 2 funciones helper |
| `src/components/OrdersTable.tsx` | Actualizar imports + 2 líneas |
| `src/components/BulkActionsBar.tsx` | Actualizar imports + interface + lógica |
| `src/pages/Admin.tsx` | Agregar 1 prop al componente |

---

## Resultado Esperado

1. Al seleccionar fecha 03/02, se guardará correctamente como 03/02
2. Si selecciono pedidos en "solicitado" sin fecha estimada y elijo cambiar a "entregado", aparecerá el formulario para ingresar Nro. Pedido y Fecha Estimada
3. No se podrá pasar a "entregado" sin tener ambos campos completos
