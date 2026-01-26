
# Plan: Ordenamiento en Todas las Tablas

## Resumen
Implementar la funcionalidad de ordenamiento al tocar cualquier encabezado de columna en todas las tablas del sistema. Al tocar una columna, debe ordenar de mayor a menor; al tocar de nuevo, de menor a mayor. Se mostrará una flecha indicando la dirección actual del ordenamiento.

---

## Tablas a Modificar

| Componente | Ubicación | Uso |
|------------|-----------|-----|
| `OrdersTable` | Usuario + Admin | Vista principal de pedidos |
| `DeliveredOrdersView` | Usuario | Pedidos entregados del usuario |
| `AdminDeliveredView` | Admin | Control de facturación de entregados |

---

## Cambios a Implementar

### 1. Crear Hook/Utilidad Reutilizable para Ordenamiento

**Archivo nuevo:** `src/hooks/useSortableTable.ts`

```typescript
interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

function useSortableTable<T>(
  data: T[],
  defaultSort?: SortConfig
): {
  sortedData: T[];
  sortConfig: SortConfig | null;
  requestSort: (key: string) => void;
}
```

Este hook manejara:
- Estado del ordenamiento actual (columna + direccion)
- Funcion para cambiar el ordenamiento al tocar un header
- Logica para ordenar los datos

---

### 2. Crear Componente de Header Ordenable

**Archivo nuevo:** `src/components/ui/sortable-table-head.tsx`

Un componente reutilizable para headers de tabla que:
- Muestra el texto del header
- Muestra una flecha (ArrowUp/ArrowDown) cuando esta ordenado por esa columna
- Cambia el cursor a pointer
- Llama a `onSort` al hacer click

```text
┌─────────────────┐
│ Fecha    ▼     │  <- Columna activa, ordenando descendente
├─────────────────┤
│ Marca          │  <- Columna inactiva, sin flecha
└─────────────────┘
```

---

### 3. Actualizar OrdersTable

**Archivo:** `src/components/OrdersTable.tsx`

Cambios:
1. Importar el hook `useSortableTable` y el componente `SortableTableHead`
2. Envolver `paginatedOrders` con el hook de ordenamiento
3. Reemplazar los `TableHead` estaticos por `SortableTableHead`
4. Definir las columnas ordenables:
   - Fecha (created_at)
   - Solicitante (user_name) - solo cuando showUserColumn
   - Marca (brand)
   - Codigo (product_code)
   - Cantidad (quantity)
   - Sucursal (branch_destination)
   - Estado (status)
   - Nro. Pedido (order_number)
   - F. Estimada (estimated_delivery_date)
   - Actualizacion (updated_at)
   - F. Solicitud (requested_at) - solo admin
   - F. Entrega (delivered_at) - solo admin

---

### 4. Actualizar DeliveredOrdersView

**Archivo:** `src/components/DeliveredOrdersView.tsx`

Cambios:
1. Importar el hook y componente de ordenamiento
2. Aplicar ordenamiento a `filteredOrders`
3. Columnas ordenables:
   - Fecha Entrega (delivered_at)
   - Nro. Pedido (order_number)
   - Marca (brand)
   - Codigo (product_code)
   - Cantidad (quantity)
   - Destino (order_destination)
   - Observacion (observation)
   - Facturado (is_invoiced)
   - Nro. Factura (invoice_number)

---

### 5. Actualizar AdminDeliveredView

**Archivo:** `src/components/AdminDeliveredView.tsx`

Cambios:
1. Importar el hook y componente de ordenamiento
2. Aplicar ordenamiento a `deliveredOrders`
3. Columnas ordenables:
   - Entrega (delivered_at)
   - Nro. Pedido (order_number)
   - Usuario (user_name)
   - Marca (brand)
   - Codigo (product_code)
   - Cantidad (quantity)
   - Sucursal (branch_destination)
   - Observacion (observation)
   - Destino (order_destination)
   - Facturado (is_invoiced)
   - Nro. Factura (invoice_number)
   - Cant. Fact. (invoiced_quantity)

---

## Detalles Tecnicos

### Hook useSortableTable

```typescript
import { useState, useMemo } from 'react';

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export function useSortableTable<T extends Record<string, any>>(
  data: T[],
  defaultSort?: SortConfig
) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(defaultSort || null);

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      // Handle nulls
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bVal == null) return sortConfig.direction === 'asc' ? -1 : 1;
      
      // Handle dates
      if (typeof aVal === 'string' && !isNaN(Date.parse(aVal))) {
        const dateA = new Date(aVal).getTime();
        const dateB = new Date(bVal).getTime();
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // Handle strings
      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const requestSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' }; // Default: mayor a menor primero
    });
  };

  return { sortedData, sortConfig, requestSort };
}
```

### Componente SortableTableHead

```typescript
import { TableHead } from '@/components/ui/table';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface SortableTableHeadProps {
  children: React.ReactNode;
  sortKey: string;
  currentSort: SortConfig | null;
  onSort: (key: string) => void;
  className?: string;
}

export const SortableTableHead = ({
  children,
  sortKey,
  currentSort,
  onSort,
  className,
}: SortableTableHeadProps) => {
  const isActive = currentSort?.key === sortKey;
  const isAsc = isActive && currentSort?.direction === 'asc';

  return (
    <TableHead 
      className={`cursor-pointer select-none hover:bg-muted/80 ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {children}
        {isActive && (
          isAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        )}
      </div>
    </TableHead>
  );
};
```

---

## Flujo de Usuario

1. Usuario ve la tabla con headers normales
2. Al tocar un header (ej: "Nro. Pedido"), se ordena descendente (mayor a menor)
3. Aparece una flecha hacia abajo en el header
4. Al tocar de nuevo el mismo header, cambia a ascendente (menor a mayor)
5. La flecha cambia a hacia arriba
6. Al tocar otro header, ese se vuelve el nuevo criterio de ordenamiento

---

## Archivos a Crear/Modificar

| Archivo | Accion |
|---------|--------|
| `src/hooks/useSortableTable.ts` | **NUEVO** - Hook reutilizable |
| `src/components/ui/sortable-table-head.tsx` | **NUEVO** - Componente de header |
| `src/components/OrdersTable.tsx` | Agregar ordenamiento |
| `src/components/DeliveredOrdersView.tsx` | Agregar ordenamiento |
| `src/components/AdminDeliveredView.tsx` | Agregar ordenamiento |

---

## Consideraciones

- El ordenamiento se aplica DESPUES del filtrado pero ANTES de la paginacion
- Los valores null/undefined se ordenan al final
- Las fechas se comparan como timestamps
- Los numeros se comparan numericamente
- Los strings se comparan alfabeticamente (case-insensitive)
- El ordenamiento por defecto inicial sera por fecha de creacion descendente (mas recientes primero)
